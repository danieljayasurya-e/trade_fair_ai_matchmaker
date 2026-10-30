# Matchmaker web app (frontend)

The guest web app for the Trade Fair AI Matchmaker, built with Vite, React 19 and strict TypeScript. It shows LASER World of PHOTONICS INDIA 2026 exhibitors, ranks them for a visitor through the backend, and explains each match.

The API it talks to is specified in [`docs/api-contract.md`](../docs/api-contract.md). Backend details are in [`backend/README.md`](../backend/README.md).

## Run it

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>. By default the app calls the API on the same hostname, port 4000. If the backend isn't running, it falls back to scoring in the browser.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type check only |

### API address

| `VITE_API_URL` | The app calls |
|---|---|
| Not set | `http://<current hostname>:4000` |
| Empty (`VITE_API_URL=`) | `/api` on the address that served the page; used on the VM |
| A URL | That URL |

It's read at build time, so rebuild after changing it.

## Screens

Routes use `HashRouter`, so URLs look like `/#/matches` and `dist/` works from any static host.

| Route | Page | What it does |
|---|---|---|
| `/` | `LandingPage` | Introduction; offers "Continue as <name>" when a profile is saved |
| `/details` | `DetailsPage` | The 10 sample profiles, profile upload (JSON or CSV) and the profile form |
| `/matching` | `LoadingPage` | Every stall on the floor plan, with progress and the real matching time |
| `/matches` | `MatchesPage` | Top 30 with filters, sorting, detail panel and bookmarks |
| `/map` | `MapPage` | Hall 1 floor plan and walking directions to any stall |
| `/visit-list` | `VisitListPage` | Saved stalls by booth row, CSV export and print |
| `/how-it-works` | `HowItWorksPage` | How the score is built, and the fairness rules |

The layout changes with width:

| Width | Layout |
|---|---|
| Under 48rem | Bottom tab bar; filters and details in bottom sheets |
| 48–75rem | Filter sidebar; details in a right-hand drawer |
| 75rem and up | Filters, list and an inline detail panel |

## Folder structure

```
client/
  scripts/export-meta.ts   prints the GET /api/meta body from the frontend's lists
  src/
    App.tsx                providers and routes
    features.ts            feature switches (SHOW_MAP)
    pages/                 one file per screen
    components/            reusable UI, including VenueMap and MatchingFloor
    context/               SessionContext (profile, bookmarks), ToastContext
    hooks/                 useMatches, useBookmarkToggle, useMediaQuery, ...
    services/              API client, matching service, offline scorer, directions, CSV export
    data/                  exhibitors, demo guests, vocabularies, floor plan
    utils/                 filters, score bands, form validation, upload parsing
    types/                 shared types, matching the API contract
    styles/                tokens.css, base.css, components.css, pages.css
```

## How matching reaches the screen

1. A page calls `useMatches(guest)`, which calls `matchingService` from `services/index.ts`.
2. `apiMatchingService` checks `GET /api/health`, allowing 3 seconds.
3. **If the API is up:** `services/apiClient.ts` creates or updates the guest on the server, then fetches recommendations. It re-sends the profile if the server no longer knows the guest.
4. **If the API is down:** `mockMatchingService` runs `services/scoring.ts` in the browser, and the results line says "Offline demo".

The matching screen stays up for at least 0.9 seconds so it can be read, because the engine takes only milliseconds. The time displayed is still the real `latencyMs`.

### Offline scoring

`services/scoring.ts` follows the backend's rules with one difference: `semantic` counts shared words instead of comparing embeddings. Offline rankings can therefore differ from live ones. If you change a scoring rule, change `backend/engine.py` too.

## State and bookmarks

- The profile and bookmarks are kept in `localStorage`, per browser.
- Each browser's guest ID is mapped to the server's guest ID in `localStorage`.
- Saving a stall updates the local list straight away, then tries to tell the server. If that fails, the local list stays correct, but there's no retry. The server only gets that change the next time the stall is toggled.
- Bookmarks are sent to the server but not read back, so a saved list doesn't follow a visitor to another browser.

## Data files

| File | Contents | Edit by |
|---|---|---|
| `data/exhibitors.ts` | The 149 stalls | **Generated.** Run `data/build_frontend_data.py` |
| `data/guests.ts` | The 10 fictional demo guests | Hand; then export `meta.json` |
| `data/taxonomy.ts` | Interests, industries, seniorities, sizes, regions, booth rows | Hand; then export `meta.json` |
| `data/venue.ts` | Hall 1 floor plan and aisles | Hand |

These lists are also what the backend serves from `/api/meta`. After changing `guests.ts` or `taxonomy.ts`, regenerate its copy:

```bash
npx esbuild scripts/export-meta.ts --bundle --platform=node --log-level=error | node > ../backend/data/meta.json
```

### Floor plan

`data/venue.ts` was traced by hand from the visitor guide's "Layout Hall - 1" page. It holds each booth's rectangle and the walkable aisles. Booths shared by several exhibitors are split evenly. `services/wayfinding.ts` finds the shortest path along the aisles and writes the steps. The guide gives no scale, so distances are approximate.

The app stops with an error at startup if an exhibitor's booth isn't on the plan, so add any new booth to `BOOTH_PLAN`.

## Terms used in the UI

All stalls are in Hall 1. LA to LF are **booth rows** inside it, not halls. The code and API call this field `hall` to match the contract, while the UI says "Row".

## Known limitations

- The "Live" badge in the header always shows, even in offline mode. Only the results line shows the true state.
- The profile form has no consent checkbox. Sample profiles set `optIn`, but form profiles leave it out.
- The site runs on plain HTTP and has no login.
- There are no automated frontend tests. Checks so far are the type check, the build and manual browser runs.
- Some exhibitor details and all tags are enriched or inferred, not supplied by the organiser, so some will be wrong.
