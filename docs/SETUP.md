# Setup

Full details are in [client/README.md](../client/README.md) and [backend/README.md](../backend/README.md).

## 1. Prerequisites

Git, Node.js with npm, and Python 3.12 or newer. Nothing needs an API key to run. `GROQ_API_KEY` is only for re-tagging exhibitors.

## 2. Get the code

```bash
git clone https://github.com/danieljayasurya-e/trade_fair_ai_matchmaker.git
cd trade_fair_ai_matchmaker
```

## 3. Run the backend

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build_index.py
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 4000
```

## 4. Run the web app

```bash
cd client && npm install && npm run dev
```

## 5. Test

```bash
backend/.venv/bin/python backend/smoke_test.py http://localhost:4000
```

## 6. Deploy

```bash
deploy/deploy.sh 92.4.77.213 ~/.ssh/brogrammers_vm
```

## 7. Demo-day preparation (from the briefing)

| Item | Requirement |
|---|---|
| Fallbacks | Prepare local model instances or cached mock API responses for network outages |
| Staging | Pre-populate test inputs beforehand |
| Visibility | Browser zoom at least 125% for projection |
| UX delays | Clear visual indicators for latency and inference processing |
| Final touches | 31 Oct, 9–10 AM: test environments and set up for live demo |

## 8. Troubleshooting

| Problem | Likely cause |
|---|---|
| Results line says "Offline demo" | The web app can't reach the API; check `/api/health` |
| The live site won't open | Type `http://` in full; the site has no HTTPS. Some networks may also block it |
| The VM responds over SSH but not on port 80 | Check Oracle's security list rule and `systemctl status nginx` |
