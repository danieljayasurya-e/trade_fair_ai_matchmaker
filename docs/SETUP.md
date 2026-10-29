# Setup

> **Status (29 Oct 2026):** The repository has no source code, so there is nothing to install or run yet. This is a checklist to complete as the stack is chosen. Do not guess versions or commands.

## 1. Prerequisites

| Item | Details |
|---|---|
| Git | Repository initialised at `D:\daniel\projects\trade_fair_ai_matchmaker` (Windows). No commits yet. |
| Language runtimes | `TODO:` depends on chosen stack |
| Package manager | `TODO:` |
| Database / storage | `TODO:` |
| AI model access | `TODO:` API key or local model. A local model or cached responses is **required as a demo fallback**. |

## 2. Get the code

```
git clone <TODO: remote URL>
cd trade_fair_ai_matchmaker
```
`TODO:` Remote repository URL (not recorded in the project).

## 3. Install

`TODO:` Install commands for backend and frontend.

## 4. Configuration

`TODO:` List environment variables (e.g. model API key, DB connection). Rules:
- Never commit secrets or API keys.
- Provide a `.env.example` with placeholder values once config exists.

## 5. Load data

`TODO:` How to load guest and exhibitor profiles (source, format, seed command). Use synthetic or consented data only; no real personal data in the repo.

## 6. Run

`TODO:` Commands to start backend, frontend, and matching engine.

## 7. Test

`TODO:` Test commands. Minimum checks to add: top 30 returned, scores normalized, latency < 2 s, filters work.

## 8. Demo-day preparation (from the briefing)

| Item | Requirement |
|---|---|
| Fallbacks | Prepare local model instances or cached mock API responses for network outages |
| Staging | Pre-populate test inputs beforehand |
| Visibility | Browser zoom at least 125% for projection |
| UX delays | Clear visual indicators for latency and inference processing |
| Final touches | 31 Oct, 9–10 AM: test environments and set up for live demo |

## 9. Troubleshooting

`TODO:` Add issues and fixes as they are discovered.
