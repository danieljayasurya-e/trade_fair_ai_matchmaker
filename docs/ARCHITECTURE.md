# Architecture

> **Status (30 Oct 2026):** The core is built, using FastAPI, a local `bge-small` embedding model, and React with Vite. Details are in [client/README.md](../client/README.md) and [backend/README.md](../backend/README.md). The exhibitor portal is not built, and the mobile app is not connected. `TODO:` items below are from the original brief and may be out of date; those READMEs take precedence.

## 1. System overview

```
 Guest / Exhibitor data ──► Profile Ingestion ──► Profile Store
 (structured + unstructured)                            │
                                                        ▼
 Guest Web App ◄──► Recommendation API ◄──► Compatibility Scoring Engine
 (select profile,        (top 30, filters,        (semantic alignment,
  bookmarks, export)      rationale)               relevance, intent → 0–100%)
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
   Exhibitor Portal (stretch)            MMI Mobile App PoC (stretch)
   top-N leads, anonymized insights      native recommendations, real-time sync
```

## 2. Components

| # | Component | Responsibility | Priority |
|---|---|---|---|
| 1 | **Profile ingestion** | Load and normalize guest profiles (industry, job role, procurement interests, company size) and exhibitor profiles (products, industry verticals, target buyer criteria, booth location). Handle structured and unstructured fields. | Core |
| 2 | **Compatibility scoring engine** | Compute a normalized score per guest–exhibitor pair from semantic alignment, relevance and intent. Produce matching rationale. | Core |
| 3 | **Ranking / top-30 service** | Rank exhibitors for a guest, return top 30 with score, booth details, rationale. Target < 2 s. | Core |
| 4 | **Guest web app** | Responsive UI: login or select/upload profile, view top 30, inspect scores and rationale, bookmark stalls, filter/sort, save/export visit list. | Core |
| 5 | **Exhibitor portal** | Configurable top-N guest leads (e.g. 20/50/100), demographics, estimated stall traffic, anonymized insights. | Stretch |
| 6 | **API / SDK layer** | Clean endpoints for plug-and-play integration into the MMI mobile app. | Stretch |
| 7 | **Real-time sync** | Sync bookmarks, stall visits, profile updates between app and backend; recalculate exhibitor lead pipelines on preference change. | Stretch |
| 8 | **MMI visitor mobile app PoC** | Embed the recommendation engine in the existing MMI app. | Stretch |

## 3. Data flow (core)

1. Guest and exhibitor profiles are ingested and normalized into the profile store.
2. Guest selects or uploads a profile in the web app.
3. App calls the recommendation API with the guest profile.
4. Scoring engine compares the guest against all exhibitors and assigns a normalized score plus matched factors.
5. Top 30 are ranked and returned with booth details and rationale (e.g. "Matched on: Industrial Automation, Component Sourcing").
6. Guest filters/sorts (score, industry segment, hall/booth, product category), bookmarks stalls, and saves/exports the visit list.

## 4. Data model (inputs named in the brief)

| Entity | Fields from brief | Notes |
|---|---|---|
| Guest | industry, job role, procurement interests, company size | Structured + unstructured. `TODO:` full schema, consent flags |
| Exhibitor | products, industry verticals, target buyer criteria, booth location | `TODO:` hall/booth format, product category taxonomy |
| Match result | normalized score, matched factors, rank | Derived. `TODO:` stored or computed on demand |
| Bookmark / visit | guest ↔ exhibitor | Needed for visit list; real-time sync is stretch |

## 5. Scoring approach

The brief requires an algorithmic and/or AI model covering **semantic alignment**, **relevance** and **intent**, with a **normalized** score. `TODO:` choose the method (e.g. embeddings, rules, hybrid) and document it here.

Design constraints:
- **Explainable:** every score maps to named matched factors.
- **Fair:** no hardcoded preferences, no artificial suppression or boosting; scores reflect legitimate profile synergy only.
- **Fast:** top 30 in under 2 seconds. `TODO:` expected number of exhibitors and guests to size this.
- **Resilient:** local model instance or cached responses available as demo fallback.

## 6. Integrations

| Integration | Purpose | Status |
|---|---|---|
| MMI visitor mobile app | Native in-app recommendations, real-time sync | Stretch. `TODO:` platform, auth, access to app/codebase |
| Data source for profiles | Guest and exhibitor data | `TODO:` real data, provided dataset, or synthetic data |
| AI/LLM or embedding provider | Semantic matching | `TODO:` choose; must have an offline/local fallback |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Top 30 < 2 s; visible indicators for latency and inference delays |
| Privacy | Exhibitor dashboard: aggregated metrics or opt-in business contacts only; no personal contact info without explicit guest consent |
| Reliability | Demo must run live; pre-populated inputs; fallback for network outage |
| Usability | Responsive; readable at ≥125% browser zoom when projected |
| Scalability / security | Judged under "Scalability, Security & Responsible AI". `TODO:` define targets |

## 8. Open decisions

- `TODO:` Tech stack (frontend, backend, scoring/AI, storage).
- `TODO:` Data source and size of exhibitor/guest sets.
- `TODO:` Authentication: real login or profile selection only.
- `TODO:` Deployment target for the demo (local machine vs hosted).
- `TODO:` MMI app details for the stretch PoC.
