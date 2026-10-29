# Project Goals

## 1. Purpose

Help trade fair guests find the right exhibitors quickly, and help exhibitors reach the right guests, using an explainable AI compatibility score.

## 2. Target users

| User | Need | Served by |
|---|---|---|
| **Visitors (guests)** | Cut through hundreds of stalls; know where to go first and why | Guest web app, top 30 list, bookmarks, export |
| **Exhibitors** | Visibility into likely footfall and high-value leads; staffing and engagement planning | Exhibitor portal (stretch) |
| **Trade fair organizers** | Better visitor experience and exhibitor value; a fair, privacy-respecting platform | Whole system; MMI visitor app integration (stretch). `TODO:` confirm organizer-facing features, if any |
| **Hackathon judges** | Evaluate a working, explainable, reliable system | Live demo |

## 3. Business goals

- Improve guest experience at large fairs.
- Improve exhibitor lead quality and booth planning.
- Show a plug-and-play path into the MMI visitor mobile app.

## 4. Technical goals

**Core (Connect Better)**
1. Profile ingestion for guests (industry, job role, procurement interests, company size) and exhibitors (products, industry verticals, target buyer criteria, booth location); structured and unstructured.
2. Compatibility scoring engine: semantic alignment, relevance and intent; normalized score.
3. Top 30 ranked exhibitors per guest, with booth details and matching rationale.
4. Responsive guest web app: login or profile select, view top 30, inspect scores, bookmark stalls.
5. Interactive filtering and sorting: score, industry segment, hall/booth location, product category.
6. Explainable insights, e.g. "Matched on: Industrial Automation, Component Sourcing".
7. Latency: top 30 in **< 2 s**.

**Stretch (Engage Better)**
1. Exhibitor portal: prospective guest demand, demographics, estimated stall traffic.
2. Configurable lead discovery: view top 20 / 50 / 100 (custom N) high-affinity guests.
3. Anonymized lead insights: seniority, purchasing intent, geographic distribution.
4. MMI mobile app integration: recommendation engine embedded as a working PoC.
5. Real-time sync of bookmarks, stall visits and profile updates between app and backend.
6. Clean API/SDK endpoints; real-time recalculation of exhibitor lead pipelines when guest preferences change.

## 5. Guardrails

| Guardrail | Rule |
|---|---|
| Fairness and relevance | Scores are objective and based on legitimate profile synergy. No hardcoded preferences. No artificial suppression of exhibitors. |
| Data privacy (stretch) | Exhibitor dashboard shows aggregated metrics or opt-in business contact details only. No personal contact info without explicit guest consent. |

## 6. Success criteria

**Functional:** all core expectations demonstrable live; top 30 returned with scores, rationale and booth details; filters work; visit list can be saved/exported.
**Performance:** top 30 in under 2 seconds; clear indicators for any inference delay.
**Quality bar (judging):** Level 3 = complete functional system meeting baseline; Level 5 = production-grade, novel architecture, flawless live demo.

### Judging rubric (100 points)

| Points | Category |
|---|---|
| 15 | Challenge Alignment & Requirements |
| 15 | AI Architecture & Technical Depth |
| 15 | Software Engineering & Integration |
| 15 | Live Demo Execution & Reliability |
| 10 | Innovation & Approach Novelty |
| 10 | User Experience & AI Interaction |
| 10 | Scalability, Security & Responsible AI |
| 10 | Presentation Quality & Q&A Defense |

Each criterion is scored with a 5-level rubric: 1 Unsatisfactory, 2 Developing, 3 Proficient, 4 Advanced, 5 Exemplary. `TODO:` how 1–5 levels convert to the 15/10-point weights (not stated in the briefing).

**Final ranking:** voting judges award 1st = 3, 2nd = 2, 3rd = 1 point; a dedicated tie-breaker judge ranks all teams to resolve ties.

### Presentation format (10 min, strictly timed)

| Time | Segment |
|---|---|
| 0:00–1:30 | Problem & value proposition |
| 1:30–3:30 | Architecture & technical approach |
| 3:30–6:30 | **Live system demonstration** (critical; static slides or pre-rendered video are penalized) |
| 6:30–8:00 | Engineering trade-offs & future roadmap |
| 8:00–10:00 | Live Q&A and technical defense |

## 7. Open questions

- `TODO:` Official judging sheet (to be shared by Prakash).
- `TODO:` Is the stretch goal in scope for judging, or optional?
- `TODO:` Organizer-facing requirements, if any.
- `TODO:` Quantitative targets beyond < 2 s (e.g. dataset size, match quality metric).
