# Glossary

## Domain terms

| Term | Meaning |
|---|---|
| **Trade fair** | An event where many companies display products and services to business visitors. |
| **Exhibitor** | A company with a stall (booth) at the fair. |
| **Guest / visitor** | A person attending the fair. The brief uses "guest"; the MMI app calls them visitors. |
| **Stall / booth** | An exhibitor's physical space, identified by hall and booth location. |
| **Hall** | A physical building or area of the fair that contains booths. |
| **Matchmaking** | Automatically pairing guests with exhibitors that suit them. |
| **Procurement interests** | What a guest wants to buy or source. |
| **Target buyer criteria** | The type of buyer an exhibitor wants to reach. |
| **Industry vertical / segment** | The business sector, e.g. Industrial Automation. |
| **Lead** | A guest likely to be valuable to an exhibitor. |
| **Footfall / stall traffic** | Number of people expected to visit a stall. |
| **Visit list** | A guest's saved, personalised list of stalls to visit. |
| **Bookmark** | A guest's marker on a stall they want to visit. |
| **MMI** | The organisation/app whose visitor mobile app is the stretch-goal integration target. `TODO:` expand the acronym. |
| **Opt-in business contact** | Contact details a guest has explicitly agreed to share with exhibitors. |

## Technical terms

| Term | Meaning |
|---|---|
| **Compatibility score** | A normalized number (shown as a match percentage) of how well a guest and an exhibitor fit. |
| **Normalized score** | Scaled to a fixed range so scores are comparable. `TODO:` confirm range (0–100%). |
| **Semantic alignment** | Similarity of meaning between texts, even without identical words. |
| **Relevance** | How closely an exhibitor's offering relates to a guest's needs. |
| **Intent** | What the guest is actually trying to achieve (e.g. buy, source, explore). |
| **Profile ingestion** | Loading and normalizing guest and exhibitor data. |
| **Structured / unstructured data** | Fixed fields (e.g. company size) versus free text (e.g. a description). |
| **Top 30** | The 30 highest-scoring exhibitors for a guest. |
| **Explainable match / rationale** | A human-readable reason for a score, e.g. "Matched on: Industrial Automation, Component Sourcing". |
| **Latency** | Time taken to return results; target < 2 s for top 30. |
| **Inference** | Running an AI model to produce a result. |
| **PoC** | Proof of Concept: a working but limited demonstration. |
| **API / SDK** | Interfaces and toolkits that let other apps (e.g. MMI) use the engine. |
| **Real-time synchronisation** | Changes in one place (app) appear immediately in others (backend, portal). |
| **Fairness guardrail** | Rule that scores must not be hardcoded or biased. |
| **Data privacy guardrail** | Rule that exhibitors see aggregated data only unless the guest consents. |

## Hackathon terms

| Term | Meaning |
|---|---|
| **Connect Better** | Team 4's core challenge: the matchmaking engine and guest app. |
| **Engage Better** | The stretch goal: exhibitor portal and MMI mobile integration. |
| **Pre-flight checklist** | Demo preparation requirements: fallbacks, staging, visibility, UX delay indicators. |
| **Tie-breaker judge** | A dedicated judge who ranks all teams to resolve point ties. |
