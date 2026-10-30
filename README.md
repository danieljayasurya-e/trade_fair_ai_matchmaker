# Trade Fair AI Matchmaker

An AI matchmaking engine and guest web app that tells each trade fair visitor which exhibitors to visit first, and why.

**Challenge:** Team 4 — "Connect Better" (Appzoy AI Software Hackathon, 29–31 Oct 2026). **Stretch:** "Engage Better" (exhibitor portal + MMI mobile app PoC).

## The problem

A fair with hundreds of stalls is overwhelming for guests, and exhibitors struggle to reach the right audience. Manually comparing guest profiles to exhibitor offerings is slow. This project scores guest–exhibitor compatibility automatically and delivers a personalised **top 30** list per guest in under 2 seconds.

## What it does

| Capability | Status |
|---|---|
| Ingest guest and exhibitor profiles (structured + unstructured) | Done |
| Compatibility scoring (normalized, explainable) | Done |
| Top 30 recommendations with booth details and match rationale | Done |
| Guest web app: select profile, view scores, bookmark, save/export | Done |
| Filter/sort by score, booth row, product category | Done |
| Hall 1 map and walking directions | Done (extra) |
| Stretch: exhibitor portal, anonymized lead insights | Not built |
| Stretch: MMI mobile app PoC, real-time sync | Not connected; needs contract v1.1 changes |

**Live:** <http://92.4.77.213>

## Quick start

See [Running it](#running-it) below, then [client/README.md](client/README.md) and [backend/README.md](backend/README.md).

## Live demo flow

Select or upload a guest profile → run the matching engine → show top 30 with match % → filter and inspect rationale → save/export the visit list. (Stretch: open exhibitor portal → set lead threshold → view leads → show MMI app sync.)

## Documentation

| Doc | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Context for AI coding assistants |
| [docs/PROJECT_GOALS.md](docs/PROJECT_GOALS.md) | Goals, users, success criteria, judging |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, data flow, integrations |
| [client/README.md](client/README.md) | Frontend: screens, structure, data, limitations |
| [backend/README.md](backend/README.md) | Backend: endpoints, scoring, data, deployment |
| [docs/api-contract.md](docs/api-contract.md) | API specification (v1.1) |
| [docs/AI.md](docs/AI.md) | AI: models, data preparation, evaluation, responsible AI, limitations |
| [docs/SETUP.md](docs/SETUP.md) | Setup and demo-day checklist |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Team, workflow, conventions, timeline |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Domain and technical terms |

## Team

Team 4 (Brogrammers), UI/UX mentor: Sneha. Team leader: `TODO:`. Roster in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Running it

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build_index.py
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 4000
```

```bash
cd client && npm install && npm run dev
```

`backend/smoke_test.py` checks a running server against `docs/api-contract.md`. Exhibitor data comes from `data/`: run `build_frontend_data.py` after changing it, then `build_index.py`.
