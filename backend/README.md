# Matchmaker API (backend)

A FastAPI service that scores a guest against every exhibitor and returns the top 30, with explanations, bookmarks and a route. It uses a local embedding model, so matching needs no API keys or outside AI service.

[`docs/api-contract.md`](../docs/api-contract.md) is the specification. Change it first, then the backend and web app together.

## Run it

Tested on Python 3.12 (VM) and 3.14 (Mac).

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build_index.py
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 4000
```

`build_index.py` downloads the model (about 64 MB) into `models/` the first time. Check it's up:

```bash
curl http://localhost:4000/api/health
```

## Files

```
backend/
  app.py                  routes, validation, errors, guest storage
  engine.py               embeddings and scoring
  build_index.py          pre-computes the exhibitor embeddings
  smoke_test.py           checks a running server against the contract
  requirements.txt        Python dependencies
  Dockerfile              container build (written, not yet built or tested)
  data/
    exhibitors.json             the 149 stalls (generated)
    exhibitor_embeddings.npy    their embeddings (generated)
    meta.json                   GET /api/meta body (generated from the frontend)
    guests.json                 guests and bookmarks (runtime, not in git)
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `STORE_PATH` | `data/guests.json` | Where guests and bookmarks are saved |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated web app addresses allowed to call the API |

Addresses on private networks (`192.168.x.x`, `10.x.x.x`) are also allowed, so devices on the same Wi-Fi work. CORS isn't needed on the VM, because the web app and API share an address.

## Endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Status check |
| `GET /api/meta` | Form options and sample profiles |
| `POST /api/guests` | Create a guest and embed the profile |
| `GET /api/guests/{id}` | Read a guest |
| `PUT /api/guests/{id}` | Replace the profile and re-embed it |
| `GET /api/guests/{id}/recommendations` | Top 30 |
| `GET /api/guests/{id}/bookmarks` | Saved stalls |
| `PUT /api/guests/{id}/bookmarks/{exhibitorId}` | Save a stall; safe to repeat |
| `DELETE /api/guests/{id}/bookmarks/{exhibitorId}` | Remove a stall; safe to repeat |
| `GET /api/guests/{id}/route` | Saved stalls by booth row, in booth order |

Request and response shapes, validation rules and error codes are in the contract. There is no login.

## How scoring works

Everything is in `engine.py`. Each exhibitor gets two directional scores, combined into one:

```
g2e (you → stall)  = 0.4 × semantic + 0.4 × interest + 0.2 × intent
e2g (stall → you)  = 0.7 + 0.3 × buyerFit
score              = round(100 × sqrt(g2e × e2g))
```

| Factor | How it's calculated |
|---|---|
| `semantic` | Cosine similarity of the guest and exhibitor embeddings, with 0.45–0.85 stretched onto 0–1 |
| `interest` | Share of the guest's interests that the exhibitor is tagged with |
| `intent` | Half how many of the exhibitor's tags the guest ticked or described, half how many of its products they named (three or more counts as full), plus 0.25 if it sells to their sector |
| `buyerFit` | 1 if the guest's industry is among the exhibitor's sectors, otherwise 0 |

- **Generic words:** "laser", "optic", "system", "machine" and a few others don't count as naming a product or tag, because nearly every exhibitor would match.
- **Not scored:** region, seniority and company size. Favouring nearby stalls would push down overseas exhibitors for reasons unrelated to their products.
- **Ties:** broken by `g2e`, then name, so the same profile always gives the same order.
- **Fairness:** the rules apply to every exhibitor alike, with no per-exhibitor adjustments.
- **Speed:** exhibitor embeddings are pre-computed, so the top 30 takes a few milliseconds. A guest is embedded only when a profile is created or updated.

The web app's offline scorer, `client/src/services/scoring.ts`, has the same rules, so change both together.

## Data

Source files are in [`data/`](../data):

| File | Purpose |
|---|---|
| `exhibitors.json` | Names and booths from the 2026 visitor guide, plus web-enriched company details |
| `exhibitor_tags.json` | AI-assigned product areas and buyer sectors |
| `retag_exhibitors.py` | Creates the tags with a Groq model; needs `GROQ_API_KEY` |
| `build_frontend_data.py` | Generates `backend/data/exhibitors.json` and `client/src/data/exhibitors.ts` |

The guide lists 153 exhibitors. Four are associations with no booth, so there are 149 stalls.

**After changing exhibitor data:**

```bash
python3 data/build_frontend_data.py
cd backend && .venv/bin/python build_index.py
```

Then restart the server. To re-tag, delete the affected entries from `exhibitor_tags.json` and run `GROQ_API_KEY=... python3 data/retag_exhibitors.py` first. It resumes where it stopped and skips exhibitors that already have tags.

## Storage

Guests are held in memory and written to one JSON file after every change, with the profile, embedding and bookmarks. The file is created with the 10 demo guests on first start. This suits a demo but wouldn't suit many simultaneous writers, as there is one process and no database.

To reset, stop the server, delete the file and start it again. A browser that had a guest on the old server re-creates it when it next asks for recommendations.

## Testing

```bash
.venv/bin/python smoke_test.py http://localhost:4000
```

It checks the contract's rules, including score format and formula, bookmarks, error codes, an update changing results immediately, and the 2-second goal. It also prints each demo guest's top 3.

It creates test guests each time it runs, so reset the store afterwards if you want a clean demo.

## Deployment

The app runs on an Oracle Cloud VM at `http://92.4.77.213` (Ubuntu 24.04). nginx serves the web app on port 80 and passes `/api` to the backend on `127.0.0.1:4000`.

| On the VM | Location |
|---|---|
| Backend | `/opt/brogrammers/backend` |
| Web app | `/var/www/brogrammers` |
| Guests and bookmarks | `/var/lib/brogrammers/guests.json` |
| Service | `brogrammers` (systemd) |

**To redeploy,** run this from the repo root on your Mac:

```bash
deploy/deploy.sh 92.4.77.213 ~/.ssh/brogrammers_vm
```

It builds and uploads your **local files**, so check your branch first. Guests and bookmarks are kept.

**Useful commands on the VM:**

```bash
ssh -i ~/.ssh/brogrammers_vm ubuntu@92.4.77.213
```

```bash
sudo systemctl status brogrammers
```

```bash
sudo journalctl -u brogrammers -n 50
```

```bash
sudo systemctl restart brogrammers
```

**On a new VM,** port 80 must be open in both places: an ingress rule in Oracle's security list, and Ubuntu's own firewall, which the script handles.

## Known limitations

- No login: anyone with the address can use the API, and anyone with a guest ID can read or change that guest. Use made-up data only.
- Plain HTTP only; HTTPS would need a domain.
- `GET /api/guests/{id}` returns the guest's name and profile to anyone with the ID, and `/api/meta` is public.
- Sector and tag data is inferred and imperfect. For example, some sensor makers rank low for 3D printing guests.
- There's no real-time sync (contract §7) and no exhibitor portal.
- The VM's Oracle trial credit expires on 28 Nov 2026.
