"""Assign each exhibitor's product areas and buyer sectors with an AI model, once, ahead of the demo.

Run this only when exhibitors.json changes: the answers are saved to exhibitor_tags.json, which
build_frontend_data.py reads. It resumes where it stopped. The same instructions apply to every
exhibitor, and a company with no details on file gets no tags rather than a guess.
"""
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "exhibitor_tags.json"
URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"
BATCH = 6
PAUSE_SECONDS = 12  # Stays under the free tier's tokens-per-minute cap.
RETRIES = 6

META = json.loads((HERE.parent / "backend/data/meta.json").read_text())
INSTRUCTIONS = f"""You classify exhibitors at a photonics trade fair so visitors can find what they want to buy.
For each company, using only the details given:
- "tags": up to 5 product areas it actually sells, most central first, chosen from: {json.dumps(META["taxonomy"])}.
  Tag what it sells, not what its customers do or what its products are used near. Using lasers to make parts is not selling
  laser sources. Infrared lenses are Optical Components. Trade fair organisers, magazines and associations are Media & Associations.
- "industries": the sectors that would plausibly buy from it, chosen from: {json.dumps(META["industries"])}.
  Include a sector when its products are commonly used there, even if the details do not name it. Include
  Trading & Distribution only when it distributes other makers' products or suits resale. Include every sector that fits.
If a company has no details, return empty lists. Never use the company's name or fame as evidence.
Return JSON: {{"results": [{{"id": "...", "tags": [...], "industries": [...]}}]}} with one entry per company."""


def api_key():
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise SystemExit("Set GROQ_API_KEY to run this")
    return key


def ask(key, companies):
    body = json.dumps(
        {
            "model": MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": INSTRUCTIONS},
                {"role": "user", "content": json.dumps(companies, ensure_ascii=False)},
            ],
        }
    ).encode()
    request = urllib.request.Request(
        URL,
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "brogrammers-retag/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        reply = json.loads(response.read())
    return json.loads(reply["choices"][0]["message"]["content"])["results"], reply.get("usage", {})


def main():
    source = json.loads((HERE / "exhibitors.json").read_text())
    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    # Records with no details take no call and get no tags.
    for slug, record in source.items():
        if not (record["description"] or record["products"] or record["technologies"]):
            done[slug] = {"tags": [], "industries": []}
    todo = [slug for slug in source if slug not in done]
    key = api_key()
    tokens = 0

    while todo:
        batch = todo[:BATCH]
        companies = [
            {
                "id": slug,
                "name": source[slug]["name"],
                "description": source[slug]["description"] or "",
                "products": source[slug]["products"],
                "technologies": source[slug]["technologies"],
                "markets": source[slug]["industries"],
            }
            for slug in batch
        ]
        for attempt in range(RETRIES):
            try:
                results, usage = ask(key, companies)
                break
            except urllib.error.HTTPError as error:
                wait = int(error.headers.get("retry-after") or 30)
                print(f"HTTP {error.code}; waiting {wait}s", flush=True)
                if error.code not in (400, 429, 500, 502, 503):
                    raise SystemExit(f"Stopped on HTTP {error.code}; saved progress is kept")
                time.sleep(min(wait, 120))
            except (json.JSONDecodeError, KeyError, TimeoutError, urllib.error.URLError) as error:
                print(f"Retrying after {type(error).__name__}", flush=True)
                time.sleep(15)
        else:
            raise SystemExit("Gave up after repeated failures; saved progress is kept")

        for item in results:
            if item.get("id") in batch:
                done[item["id"]] = {
                    "tags": list(dict.fromkeys(t for t in item.get("tags", []) if t in META["taxonomy"]))[:5],
                    "industries": [s for s in META["industries"] if s in item.get("industries", [])],
                }
        OUT.write_text(json.dumps(done, ensure_ascii=False, indent=1))
        tokens += usage.get("total_tokens", 0)
        todo = [slug for slug in source if slug not in done]
        print(f"{len(done)}/{len(source)} done, {tokens} tokens", flush=True)
        if todo:
            time.sleep(PAUSE_SECONDS)


main()
