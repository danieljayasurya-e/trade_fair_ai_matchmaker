"""Runs the API contract's rules against a running server. Usage: python smoke_test.py [base-url]"""
import json
import math
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4000"
failures = 0


def call(method, path, body=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(name, ok, info=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + name + (f"  {info}" if info else ""))


def no_nulls(value):
    if isinstance(value, dict):
        return all(no_nulls(v) for v in value.values())
    if isinstance(value, list):
        return all(no_nulls(v) for v in value)
    return value is not None


status, health = call("GET", "/api/health")
check("health", status == 200 and health["ok"] is True, str(health))
status, meta = call("GET", "/api/meta")
check("meta", status == 200 and len(meta["sampleProfiles"]) == 10 and len(meta["taxonomy"]) > 0)

valid = {"name": "Test", "industry": meta["industries"][0], "jobRole": "Buyer", "seniority": meta["seniorities"][1],
         "companySize": meta["companySizes"][2], "region": meta["regions"][3], "interests": [meta["taxonomy"][0]], "freeText": ""}
status, guest = call("POST", "/api/guests", valid)
check("create guest 201", status == 201 and guest["id"] and guest["updatedAt"].endswith("Z"))
G = guest["id"]

status, recs = call("GET", f"/api/guests/{G}/recommendations")
results = recs["results"]
check("at most 30, ranks in order", len(results) == min(30, recs["total"]) and [r["rank"] for r in results] == list(range(1, len(results) + 1)))
check("score is an integer 0-100", all(isinstance(r["score"], int) and 0 <= r["score"] <= 100 for r in results))
check("factors are 0-1", all(0 <= v <= 1 for r in results for v in r["factors"].values()))
check("score follows the formula", all(abs(r["score"] - round(100 * math.sqrt(r["factors"]["g2e"] * r["factors"]["e2g"]))) <= 1 for r in results))
check("matchedOn comes from the taxonomy", all(t in meta["taxonomy"] for r in results for t in r["matchedOn"]))
check("no nulls", no_nulls(recs))
check("reason is short", all(0 < len(r["reason"]) <= 200 for r in results))
check("same profile, same order", [r["exhibitor"]["id"] for r in call("GET", f"/api/guests/{G}/recommendations")[1]["results"]] == [r["exhibitor"]["id"] for r in results])

E = results[0]["exhibitor"]["id"]
check("save bookmark", call("PUT", f"/api/guests/{G}/bookmarks/{E}") == (200, {"exhibitorIds": [E]}))
check("save twice is the same", call("PUT", f"/api/guests/{G}/bookmarks/{E}") == (200, {"exhibitorIds": [E]}))
status, route = call("GET", f"/api/guests/{G}/route")
check("route groups the stall", status == 200 and route["halls"][0]["stalls"][0]["exhibitor"]["id"] == E)
check("remove bookmark", call("DELETE", f"/api/guests/{G}/bookmarks/{E}") == (200, {"exhibitorIds": []}))
check("remove twice is the same", call("DELETE", f"/api/guests/{G}/bookmarks/{E}") == (200, {"exhibitorIds": []}))
check("empty route", call("GET", f"/api/guests/{G}/route") == (200, {"halls": []}))

status, err = call("POST", "/api/guests", {})
check("400 lists every bad field", status == 400 and err["error"]["code"] == "VALIDATION_ERROR" and len(err["error"]["details"]["fields"]) >= 7)
status, err = call("POST", "/api/guests", raw=b"{nope")
check("400 bad JSON", status == 400 and err["error"]["code"] == "BAD_REQUEST")
check("404 guest", call("GET", "/api/guests/nope/recommendations")[1]["error"]["code"] == "GUEST_NOT_FOUND")
check("404 exhibitor", call("PUT", f"/api/guests/{G}/bookmarks/nope")[1]["error"]["code"] == "EXHIBITOR_NOT_FOUND")
check("404 route", call("GET", "/api/nope")[1]["error"]["code"] == "NOT_FOUND")

# An update must re-embed the guest and change what comes back straight away.
edited = {**valid, "interests": ["Quantum Technologies"], "freeText": "Quantum optics lab equipment", "industry": "Research & Academia"}
before = guest["updatedAt"]
status, updated = call("PUT", f"/api/guests/{G}", edited)
after = call("GET", f"/api/guests/{G}/recommendations")[1]["results"]
check("update changes results at once", status == 200 and updated["updatedAt"] != before and after[0]["exhibitor"]["id"] != E)

print("\nTop 3 and timing for each demo guest:")
worst = 0.0
for sample in meta["sampleProfiles"]:
    _, g = call("POST", "/api/guests", sample["profile"])
    started = time.perf_counter()
    _, r = call("GET", f"/api/guests/{g['id']}/recommendations")
    worst = max(worst, (time.perf_counter() - started) * 1000)
    top = "; ".join(f"{m['score']} {m['exhibitor']['name'][:30]} ({m['exhibitor']['booth']})" for m in r["results"][:3])
    print(f"  {sample['id']}: scores {r['results'][0]['score']}..{r['results'][-1]['score']}: {top}")
check("top 30 under 2 s", worst < 2000, f"slowest {worst:.0f} ms end to end")

print("\nAll passed" if not failures else f"\n{failures} FAILED")
sys.exit(1 if failures else 0)
