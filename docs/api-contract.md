# API contract v1: Trade Fair AI Matchmaker

**For:** the backend developer. Also used by the guest web app and the MMI mobile app.
**Status:** v1.1, 30 Oct 2026. Moved to the LASER World of PHOTONICS INDIA 2026 data. The web app and backend follow this version; the mobile app was built against v1.0 and needs the §10 changes.
**Machine-readable spec:** `openapi.yaml` describes v1.0 and has not been updated to v1.1. This file wins where they differ.

Build the API exactly as written here. If something has to change, change this file first, then the web app and backend together.

---

## 1. The ten rules that break clients

The mobile app validates every response strictly. A response that breaks one of these rules is rejected and the guest sees an error screen.

1. **JSON only, camelCase keys,** UTF-8. Field names exactly as below (`jobRole`, not `job_role`).
2. **Never send `null`.** Leave an optional field out instead. Required strings may be `""` only where noted (`description`, `freeText`).
3. **`score` is an integer 0–100.** `87`, never `87.5`, `"87"` or `0.87`.
4. **Every `factors` value is a number from 0 to 1.**
5. **`rank` starts at 1, has no gaps and matches the array order.** At most **30** results.
6. **Dates are ISO 8601 UTC strings,** e.g. `2026-10-30T09:15:22.481Z`. `updatedAt` changes on every write.
7. **IDs are strings** (`"ex-exail"`, `"g_7f3k2"`), even if they're numbers in your DB. Exhibitor IDs never change.
8. **Bookmark calls are idempotent:** saving twice or removing something that isn't saved returns `200` with the full list.
9. **Every error uses one envelope:** `{ "error": { "code", "message", "details"? } }`, with the codes in §6.
10. **Only add fields, never rename or remove them.** Clients ignore unknown fields, so adding is safe. Renaming or removing breaks the apps.

---

## 2. Basics

| Item | Value |
| --- | --- |
| Base URL | `http://<host>:4000`. All paths start with `/api`. |
| Network | Listen on `0.0.0.0`, not `127.0.0.1`, so phones on the same Wi-Fi can reach it. Plain HTTP is fine on the LAN. |
| Headers | Requests with a body send `Content-Type: application/json`. Respond with `Content-Type: application/json; charset=utf-8`. |
| Auth | None for the hackathon. The guest ID is the only key. |
| CORS | Needed by the **web app**. Allow its origin (e.g. `http://localhost:5173`), methods `GET, POST, PUT, DELETE, OPTIONS`, header `Content-Type`. The mobile app doesn't need CORS. |
| Client timeouts | 10 s per request; 3 s for `/api/health`. |
| Speed target | `GET …/recommendations` under **2 s** end to end (challenge goal). Aim for under 300 ms on the server. |
| Retries | Clients retry a failed GET **once** on network errors and 5xx. They never retry 4xx, so 4xx must mean "the request is wrong". |
| Offline | The mobile app queues bookmark changes while offline and replays them in order when it reconnects. That's why bookmark calls must be idempotent. |

---

## 3. Data types

These match `src/api/schemas.ts` in the mobile app (zod) and `components.schemas` in `openapi.yaml`.

### GuestInput (what clients send)

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | Trimmed, 1–80 characters. Whitespace only is invalid. |
| `industry` | string | yes | One of `meta.industries`. |
| `jobRole` | string | yes | Free text, trimmed, 1–80 characters. |
| `seniority` | string | yes | One of `meta.seniorities`. |
| `companySize` | string | yes | One of `meta.companySizes`. |
| `region` | string | yes | One of `meta.regions`. |
| `interests` | string[] | yes | At least 1, no duplicates, each from `meta.taxonomy`. |
| `freeText` | string | yes | 0–1000 characters. Always present; may be `""`. Store as-is: emoji, Hindi and `<b>`-like text are valid. **Don't HTML-escape on the server**; clients escape when they display or print. |
| `optIn` | boolean | no | Consent to share business contact details with exhibitors. Leave it out if unknown; never `null`. |

### Guest (what the server returns)

`GuestInput` plus:

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Created by the server, never changes. |
| `updatedAt` | string | ISO 8601 UTC. New value on every create or update. Clients use it for last-write-wins. |

Always return **every** field, including `freeText` (send `""` if it's empty).

### Exhibitor

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Stable. |
| `name` | string | Not empty. Long names are fine; clients truncate. |
| `description` | string | May be `""`. |
| `products` | string[] | May be empty. Specific products, shown on the stall's detail. |
| `tags` | string[] | Product areas from `meta.taxonomy`, assigned once by an AI model; may be empty. Used as the "product category" filter. |
| `industries` | string[] | Sectors likely to buy from the exhibitor, inferred by an AI model, from `meta.industries`; may be empty. |
| `hall` | string | The booth row, one of `meta.halls`, e.g. `"LC"`. The whole show is in Hall 1. |
| `booth` | string | The visitor guide's code, `<row> <number>`, e.g. `"LC 24"`. |
| `otherBooths` | string[] | Any further booths this exhibitor occupies; usually empty. |
| `city` | string | May be `""`. |
| `country` | string | May be `""`. |

### Recommendation

| Field | Type | Rules |
| --- | --- | --- |
| `rank` | integer | 1, 2, 3… in array order. |
| `exhibitor` | Exhibitor | |
| `score` | integer | 0–100. **Must equal `round(100 × sqrt(factors.g2e × factors.e2g))`**, within 1. |
| `matchedOn` | string[] | Taxonomy tags behind the match, most relevant first, each from `meta.taxonomy`. May be empty; the app then shows "General match". Up to 5 recommended. |
| `factors` | Factors | See below. |
| `reason` | string | One plain-text sentence, about 200 characters at most, e.g. *"Offers fiber lasers; matches your interest in Laser Sources."* |
| `insights` | `{ label, why }[]` | Every named reason behind the match, for the detail view. Never empty. |

### Factors (each a number from 0 to 1)

| Field | Meaning | Shown in the app as |
| --- | --- | --- |
| `semantic` | Embedding similarity between guest and exhibitor | "Semantic similarity" |
| `interest` | Share of the guest's interests the exhibitor is tagged with | "Interest overlap" |
| `intent` | What the guest wrote vs the exhibitor's product areas and specific products, plus 0.25 if it sells to their sector | "Intent match" |
| `buyerFit` | Whether the exhibitor sells to the guest's sector (the data has no seniority or size criteria) | "Buyer fit" |
| `g2e` | Guest → exhibitor score, combined from `semantic`, `interest` and `intent` (you choose the weights) | "You → Stall" |
| `e2g` | Exhibitor → guest score, `0.7 + 0.3 × buyerFit` | "Stall → You" |

### RecommendationsResponse

| Field | Type | Rules |
| --- | --- | --- |
| `results` | Recommendation[] | At most 30, ordered by `rank`. |
| `latencyMs` | number | Engine time on the server for **this** request, in milliseconds (decimals allowed). Shown as "Top 30 in 184 ms". |
| `total` | integer | Number of candidates that scored. `results.length = min(30, total)`. |

### Bookmarks

`{ "exhibitorIds": string[] }`: no duplicates, oldest first. It may include stalls outside the guest's current top 30.

### Route

`{ "halls": [ { "hall": string, "stalls": Recommendation[] } ] }`

- Include only halls that have bookmarks, in natural order (`LA`, `LB`, `LC`…).
- Order stalls by booth in **natural order**: `LA 2` before `LA 10`. Compare digit runs as numbers, not as text.
- A stall's `rank` is its position in the guest's full ranking, which may be greater than 30.

---

## 4. Endpoints

| # | Method and path | Body | Success | Used by |
| --- | --- | --- | --- | --- |
| 1 | `GET /api/health` | – | `200` Health | mobile, web |
| 2 | `GET /api/meta` | – | `200` Meta | mobile, web |
| 3 | `POST /api/guests` | GuestInput | `201` Guest | mobile, web |
| 4 | `GET /api/guests/{guestId}` | – | `200` Guest | web; mobile (resync) |
| 5 | `PUT /api/guests/{guestId}` | GuestInput | `200` Guest | mobile, web |
| 6 | `GET /api/guests/{guestId}/recommendations` | – | `200` RecommendationsResponse | mobile, web |
| 7 | `GET /api/guests/{guestId}/bookmarks` | – | `200` Bookmarks | mobile, web |
| 8 | `PUT /api/guests/{guestId}/bookmarks/{exhibitorId}` | **none** | `200` Bookmarks | mobile, web |
| 9 | `DELETE /api/guests/{guestId}/bookmarks/{exhibitorId}` | **none** | `200` Bookmarks | mobile, web |
| 10 | `GET /api/guests/{guestId}/route` | – | `200` Route | mobile, web |

Clients URL-encode path IDs, so decode them.

### 1. `GET /api/health`

Clients call it at startup with a 3 s timeout. If it fails, the mobile app switches to its offline demo data. Keep it fast, with no auth and no heavy work.

```json
{ "ok": true, "db": true, "model": "BAAI/bge-small-en-v1.5" }
```

`db` and `model` can each be a boolean or a short status string.

### 2. `GET /api/meta`

Option lists for the profile form, plus the "Try a sample profile" buttons. Clients build the form from this list, so values sent back in `GuestInput` will always come from it. Use the exact strings in §8 so web, mobile and the mobile app's offline mode all match.

```json
{
  "industries": ["Metal Fabrication & Manufacturing", "Automotive & EV", "…"],
  "seniorities": ["Individual Contributor", "Manager", "Senior Manager", "Director", "C-level / Owner"],
  "companySizes": ["1-10", "11-50", "51-200", "201-1000", "1000+"],
  "regions": ["North India", "South India", "…"],
  "halls": ["LA", "LB", "LC", "LD", "LE", "LF"],
  "taxonomy": ["Laser Sources", "Laser Cutting & Welding", "…"],
  "sampleProfiles": [
    { "id": "sample-fabrication-owner", "label": "Sheet-metal shop owner, fibre laser cutting", "profile": { "…GuestInput…": "" } }
  ]
}
```

### 3. `POST /api/guests`

Validate the body against the rules in §3. If anything is wrong, return `400 VALIDATION_ERROR` with **all** the field problems (§6). If it's valid, store the guest, add it to the guest pool (so exhibitor-portal leads update) and return the full Guest with `201`.

```bash
curl -s -X POST http://localhost:4000/api/guests -H "Content-Type: application/json" -d '{
  "name": "Rajesh Kumar", "industry": "Metal Fabrication & Manufacturing", "jobRole": "Owner & Managing Director",
  "seniority": "C-level / Owner", "companySize": "51-200", "region": "West India",
  "interests": ["Laser Cutting & Welding", "Laser Sources", "Controllers & Software"],
  "freeText": "Replacing our old CO2 cutter with a fiber laser cutting machine.", "optIn": true }'
```

```json
{
  "id": "g_7f3k2", "updatedAt": "2026-10-30T09:15:22.481Z",
  "name": "Rajesh Kumar", "industry": "Metal Fabrication & Manufacturing", "jobRole": "Owner & Managing Director",
  "seniority": "C-level / Owner", "companySize": "51-200", "region": "West India",
  "interests": ["Laser Cutting & Welding", "Laser Sources", "Controllers & Software"],
  "freeText": "Replacing our old CO2 cutter with a fiber laser cutting machine.", "optIn": true
}
```

### 4. `GET /api/guests/{guestId}`

Returns the Guest, or `404 GUEST_NOT_FOUND`. The web app uses it for "continue as …". The mobile app calls it after reconnecting to pick up edits made on another device.

### 5. `PUT /api/guests/{guestId}`

**Replaces the whole profile** with the body (same validation as POST). It's a full replace, not a partial update. Then:

1. Set a new `updatedAt`.
2. Recompute this guest's recommendations, so the next `GET …/recommendations` reflects the new profile. Read-your-writes is required: the app fetches right after the PUT returns.
3. Recompute exhibitor-portal leads.
4. *(When sockets exist)* emit `guest:updated`, then `recommendations:updated` (§7).

Returns the updated Guest. On an unknown ID, return `404 GUEST_NOT_FOUND`.

### 6. `GET /api/guests/{guestId}/recommendations`

Returns the top 30 for the guest's **current** profile.

```json
{
  "latencyMs": 184.6,
  "total": 47,
  "results": [
    {
      "rank": 1,
      "score": 84,
      "exhibitor": {
        "id": "ex-winarc-cutting-system", "name": "WINARC CUTTING SYSTEM",
        "description": "Winarc Cutting System manufactures CNC metal-cutting machines.",
        "products": ["CNC fiber laser cutting machines"],
        "tags": ["Laser Cutting & Welding", "Laser Sources"],
        "industries": ["Metal Fabrication & Manufacturing"],
        "hall": "LC", "booth": "LC 01", "otherBooths": [], "city": "", "country": "India"
      },
      "matchedOn": ["Laser Cutting & Welding", "Laser Sources"],
      "factors": { "semantic": 0.69, "interest": 0.667, "intent": 0.85, "buyerFit": 1, "g2e": 0.712, "e2g": 1 },
      "reason": "Offers CNC fiber laser cutting machines; matches your interest in Laser Cutting & Welding, Laser Sources.",
      "insights": [{ "label": "Laser Sources", "why": "Matches your interest “Laser Sources”." }]
    }
  ]
}
```

Ranking rules:

- Sort by `score` descending. Break ties the same way every time (e.g. by `g2e`, then exhibitor name), so the same profile always gives the same order. The app animates rank changes, and random tie order would look like jumping.
- **No paid boosts and no hard-coded preferences.** Scores come only from profile fit (challenge fairness guardrail).
- Fewer than 30 results is fine. The app shows "Showing 12 of 12".
- If the model or DB isn't ready, return `503 ENGINE_UNAVAILABLE`. Clients retry once, then show "Retry".

### 7. `GET /api/guests/{guestId}/bookmarks`

```json
{ "exhibitorIds": ["ex-winarc-cutting-system", "ex-exail"] }
```

### 8. `PUT /api/guests/{guestId}/bookmarks/{exhibitorId}`: save a stall

No request body. Adds the stall if it isn't saved yet and returns the **full** list. Saving an already-saved stall returns `200` and the same list.

- Unknown guest: `404 GUEST_NOT_FOUND`.
- Unknown exhibitor: `404 EXHIBITOR_NOT_FOUND`.

```bash
curl -s -X PUT http://localhost:4000/api/guests/g_7f3k2/bookmarks/ex-winarc-cutting-system
```

### 9. `DELETE /api/guests/{guestId}/bookmarks/{exhibitorId}`: remove a stall

No request body. Returns the full list. Removing a stall that isn't saved (or doesn't exist) returns `200` and the unchanged list.

> **Why path parameters and not a JSON body?** Some servers and proxies drop DELETE bodies, and PUT/DELETE on one resource URL is idempotent by definition. That's what the offline replay in the mobile app relies on.

### 10. `GET /api/guests/{guestId}/route`

Bookmarked stalls grouped by hall and ordered by booth (natural order), each as a full Recommendation. With no bookmarks, return `{ "halls": [] }`.

---

## 5. Validation details for `400 VALIDATION_ERROR`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some profile fields are missing or invalid.",
    "details": {
      "fields": [
        { "field": "name", "message": "Please enter your name" },
        { "field": "interests", "message": "Pick at least one interest" }
      ]
    }
  }
}
```

List every invalid field, not only the first. `field` is the `GuestInput` key.

---

## 6. Errors

Always use this envelope, with the right HTTP status:

```json
{ "error": { "code": "GUEST_NOT_FOUND", "message": "No guest with id g_7f3k2" } }
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body fails the §3 rules. Include `details.fields`. |
| 400 | `BAD_REQUEST` | Body isn't valid JSON. |
| 404 | `GUEST_NOT_FOUND` | Unknown `guestId`. |
| 404 | `EXHIBITOR_NOT_FOUND` | Unknown `exhibitorId` on save-bookmark. |
| 404 | `NOT_FOUND` | Unknown route. |
| 503 | `ENGINE_UNAVAILABLE` | Model or DB not ready yet. |
| 500 | `INTERNAL_ERROR` | Anything else. Log the stack trace on the server and keep it out of `message`. |

`message` may be shown to guests as-is, so make it short, human and free of stack traces or SQL.

---

## 7. Real-time sync (Socket.io), phase 2

The mobile app doesn't use sockets yet. REST already keeps it in sync on reconnect and when the app returns to the foreground. When you add sockets, use exactly this so both apps can plug in:

**Connection:** the same host and port as the REST API, default path `/socket.io`. Clients connect with `transports: ['websocket']`, so the server must allow the WebSocket transport.

**Client → server**

| Event | Payload | Ack | Server action |
| --- | --- | --- | --- |
| `guest:join` | `{ guestId }` | `{ ok: true }` or `{ ok: false, error: { code, message } }` | Join room `guest:<guestId>`. Clients send it on every `connect`, including reconnects. |
| `guest:leave` | `{ guestId }` | `{ ok: true }` | Leave the room (web app switching guests). |

**Server → room `guest:<guestId>`**

| Event | Payload | Emit when |
| --- | --- | --- |
| `guest:updated` | `{ guest: Guest }` | After `PUT /api/guests/{id}` |
| `recommendations:updated` | `{ guestId, results, latencyMs, total }` (a RecommendationsResponse plus `guestId`) | After recompute following a profile change |
| `bookmark:changed` | `{ guestId, exhibitorIds }` | After any bookmark save or remove, from any client |

Rules:

- Emit to the whole room, including the client that made the change. Clients handle duplicates.
- Payloads use exactly the REST shapes, so clients validate them the same way.
- Clients ignore a `guest:updated` whose `updatedAt` is older than what they have (last write wins).
- Exhibitor-portal events (lead pipeline updates) are outside this contract; agree them with the portal team.

---

## 8. Reference values (use these exact strings)

`client/src/data/taxonomy.ts` and `client/src/data/guests.ts` are the source. `client/scripts/export-meta.ts` generates `backend/data/meta.json` from them, so web and backend cannot drift.

**industries:** Metal Fabrication & Manufacturing, Automotive & EV, Aerospace & Defence, Electronics & Semiconductors, Medical & Life Sciences, Research & Academia, Telecom & Data Communications, Energy & Solar, Trading & Distribution

**seniorities:** Individual Contributor, Manager, Senior Manager, Director, C-level / Owner

**companySizes:** `1-10`, `11-50`, `51-200`, `201-1000`, `1000+` (ASCII hyphen, not an en dash)

**regions:** North India, South India, East India, West India, Middle East, Europe, Southeast Asia

**halls (booth rows in Hall 1):** LA, LB, LC, LD, LE, LF

**taxonomy (23 tags):** Laser Sources, Laser Cutting & Welding, Laser Marking & Engraving, Laser Cleaning, Additive Manufacturing, Scanners & Beam Delivery, Controllers & Software, Optical Components, Optical Coatings & Thin Film, Optical Materials & Crystals, Fibre Optics, Metrology & Test, Beam Profiling & Power Meters, Spectroscopy & Analytical, Imaging & Machine Vision, Sensors & Detectors, Motion & Positioning, Opto-Mechanics, Vacuum & Semiconductor Equipment, Quantum Technologies, Laser Safety, Cooling & Chillers, Media & Associations

**sampleProfiles:** the 10 demo guests in `client/src/data/guests.ts`. The backend also loads them into its guest pool on first start.

**Embeddings:** exhibitor embeddings are computed ahead of time (`backend/build_index.py`). A guest is embedded when the profile is created or updated (`POST` / `PUT /api/guests`).

---

## 9. Smoke test before saying it's done

```bash
python backend/smoke_test.py http://localhost:4000
```

Final check: in the mobile app, set `API_URL` to your machine's LAN IP and `USE_MOCK=false` in `.env`, rebuild, and run the demo. The "Demo data" chip must **not** appear. If it does, `/api/health` didn't answer within 3 s.

---

## 10. Changes from the first draft (`mobile-api-contract.md`)

- **Bookmarks:** `POST/DELETE /bookmarks` with `{ exhibitorId }` in the body became `PUT/DELETE /bookmarks/{exhibitorId}` with no body.
- **Added** `GET /api/guests/{guestId}`.
- **Added** standard error codes (§6) and the `VALIDATION_ERROR` details shape (§5).
- **Socket.io:** joining the room is now the `guest:join` event with an ack, and `recommendations:updated` now includes `total`.
- **Made explicit:** never send `null`, `POST /api/guests` returns `201`, `PUT` is a full replace with read-your-writes, the score formula, deterministic tie-breaking, `latencyMs` and `total` definitions, the exact reference strings, and CORS for the web app.

## 11. Changes in v1.1

- **Data:** the event is now LASER World of PHOTONICS INDIA 2026, so `meta` values and sample profiles changed (§8).
- **Exhibitor:** `hall` is now the booth row, `booth` uses the guide's format (`LC 24`), and `tags`, `otherBooths`, `city` and `country` are added.
- **Recommendation:** `insights` is added.
- **Scoring:** `buyerFit` uses the exhibitor's sectors only, and `e2g` is fixed at `0.7 + 0.3 × buyerFit`.
- **Mobile app:** needs its schemas, offline fixtures and booth display updated. Those files are not in this repo.
