# CLAUDE.md — Trade Fair AI Matchmaker

Context for AI coding assistants working in this repository.

> **Repository status (30 Oct 2026):** Core app built and deployed. See [client/README.md](client/README.md), [backend/README.md](backend/README.md) and [docs/api-contract.md](docs/api-contract.md). Keep the contract, web app and backend in step. Any scoring change goes in both `backend/engine.py` and `client/src/services/scoring.ts`. `TODO:` items below predate the build; those files take precedence.

## 1. Project overview

**What it is:** An AI matchmaking engine plus web app for trade fairs. For any guest (visitor) profile it scores compatibility against every exhibitor and returns the **top 30** exhibitors, with match percentages, booth details and an explanation of why each matched.

**Context:** Built by **Team 4** for the Appzoy AI Software Hackathon, challenge "Connect Better" (Trade Fair AI Matchmaker). Build window 29 Oct → 31 Oct 9:00 AM; live demo on Sat 31 Oct, post-lunch.

**Core goals**
1. Ingest structured and unstructured guest and exhibitor profiles.
2. Compute a normalized compatibility score (semantic alignment, relevance, intent).
3. Return the top 30 exhibitors per guest in **under 2 seconds**.
4. Explain every match (e.g. "Matched on: Industrial Automation, Component Sourcing").
5. Guest web app: log in or select a profile, view top 30, inspect scores, bookmark stalls, filter and sort, save or export the visit list.

**Stretch goal ("Engage Better"):** Exhibitor portal (configurable top-N guest leads, anonymized insights, traffic estimates), MMI visitor mobile app proof of concept, and real-time sync between the app and the matching backend.

## 2. Tech stack

`TODO:` Not yet chosen. Record decisions here. Constraints from the brief:

| Area | Constraint |
|---|---|
| Matching/scoring | Algorithmic and/or AI; must reflect semantic alignment; scores normalized |
| Latency | Top 30 in < 2 s |
| Demo resilience | Local model instances or cached mock API responses must be available (network may fail) |
| Frontend | Responsive web app; readable at ≥125% browser zoom; visible loading/inference indicators |
| Stretch | Clean API/SDK endpoints for plug-and-play mobile integration; real-time recalculation |

## 3. Directory structure

Currently empty apart from `.git/`. Target layout for documentation:

```
trade_fair_ai_matchmaker/
├── CLAUDE.md            # this file
├── README.md            # summary + quick start
└── docs/
    ├── PROJECT_GOALS.md
    ├── ARCHITECTURE.md
    ├── SETUP.md
    ├── CONTRIBUTING.md
    └── GLOSSARY.md
```
`TODO:` Add source directories (backend, frontend, data, tests) as they are created, with one-line descriptions.

## 4. Coding conventions

None observed yet (no code exists). `TODO:` Agree and record: language(s), formatter/linter, naming, test framework, commit style. Until then:
- Keep code small, readable and demo-ready; prefer simple and reliable over clever.
- Keep scoring logic in one clearly named module so it can be explained and tested.

## 5. Common commands

`TODO:` install / run / test / build commands. Fill in once the stack is chosen.

## 6. Constraints and things to avoid

**Fairness (from brief):**
- Do **not** hardcode exhibitor preferences or artificially boost/suppress any exhibitor. Scores must come only from genuine profile synergy.
- Every score must be explainable from profile data; do not add opaque adjustments.

**Privacy (stretch goal):**
- The exhibitor dashboard shows **aggregated** data or **opt-in** business contact details only. Never expose guest personal contact info without explicit guest consent.
- Do not put real personal data in sample data, logs or commits. `TODO:` define the data source.

**Demo rules (affect how we build):**
- Live demo must be real-time and functional; static slides or pre-rendered videos are penalized.
- Pre-populate test inputs and keep a fallback (cached responses / local model) so the demo survives a network outage.
- Show clear latency indicators for scoring and inference.
- Demo flow to protect: select/upload guest → run matching → top 30 with percentages → filter and inspect rationale → save/export visit list.

**General:**
- Do not guess missing requirements; mark `TODO:` and ask.
- Do not commit secrets or API keys.

## 7. Known issues / open questions

See the gaps list in `docs/PROJECT_GOALS.md` §7 and `docs/ARCHITECTURE.md` §8 (data source, tech stack, MMI app details, rubric-to-points mapping).

## 8. Where to read more

[README](README.md) · [Goals](docs/PROJECT_GOALS.md) · [Architecture](docs/ARCHITECTURE.md) · [Setup](docs/SETUP.md) · [Contributing](docs/CONTRIBUTING.md) · [Glossary](docs/GLOSSARY.md)
