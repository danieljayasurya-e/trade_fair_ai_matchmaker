# Matchmaker client

Guest web app for the Trade Fair AI Matchmaker (Team 4, "Connect Better"). Vite + React + TypeScript, running entirely on mock data. There is no backend.

The UI follows the **MMI Matchmaker UI** design canvas: the core demo flow (matching in progress, top 30 with detail) and its mobile layout. The landing page and details form follow the mobile app (`trade_fair_ai_matchmaker_mobile_app`), with the same fields, vocabularies, sample profiles and scoring. The floor plan, visit-list design and score-options boards are out of scope. A working visit list exists because the brief requires saving and exporting, but it is not styled to a design.

## Run it

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck (strict) then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Types only |

Fonts are bundled (`@fontsource-variable/inter`), so the app works offline after `npm install`. The router is a `HashRouter`, so `dist/` runs from any static host.

## Demo flow

1. **Landing** (`/`): the hook, three points and "Find my stalls". With a saved profile it offers "Continue as <name>" and "Not you? Start over".
1. **Details** (`/details`): "Try a sample profile" ("Match with this sample" goes straight to matching; "Edit details first" fills the form), "Upload profile" (JSON/CSV that fills the form), then name, job role, industry, seniority, company size, region, procurement interests and a free-text "what are you looking for?". Same fields and validation messages as the mobile form. With a saved profile it opens as "Edit your details" and keeps the saved stalls.
1. **Matching in progress** (`/matching`): the venue floor with every stall as a tile, compared as the engine runs, then your matches glaze in their score colour, best first (halls in a 2 × 2 grid on phones). Live timer, progress bar and three steps. "View your top 30" is focused when matching finishes. "Replay" reruns it.
1. **Top 30** (`/matches`): filters (score, hall, category, industry, saved only), sort, "Show 10 more", detail drawer with the four score bars, both directions and reasons, save with Undo. "Re-run" runs matching again; "Edit profile" opens the details form.
1. **Visit list** (`/visit-list`): saved stalls grouped by hall, CSV export, print.
1. **How it works** (`/how-it-works`): how the two-way score is built and the fairness rules.
1. **Find your way** (`/map`, phase 2): all 200 stalls on a sample plan of Halls 1–4. Your matches are glazed tiles in their score colour, the rest are matte. Pick a tile, a match in the list, or any stall in "Take me to", and the map draws the walk from "I'm at" (main entrance by default, a hall door, or a booth) with numbered steps and a distance. "Take me there" in a match's detail opens it. The stall and start live in the URL (`#/map?stall=ex-056&from=ex-034`).

Responsive behaviour:

| Width | Layout |
|---|---|
| Phone (< 48rem) | Bottom tab bar, compact cards, filters in a bottom sheet, detail in a bottom sheet |
| Tablet (48–75rem) | Filter sidebar and list, detail as a right-hand drawer (modal) |
| Laptop (>= 75rem) | Filters, list and an inline sticky detail panel (first match open by default) |

Try the error state once with `http://localhost:5173/#/matching?fail`. "Try again" then succeeds.

## Folder structure

```
client/src/
  main.tsx, App.tsx          entry, providers and routes
  pages/                     one file per screen (LandingPage, DetailsPage, LoadingPage, MatchesPage, ...)
  components/                reusable UI (cards, filters, dialogs, state panels)
  context/                   SessionContext (profile + bookmarks), ToastContext
  hooks/                     useMatches, useBookmarkToggle, useMediaQuery, ...
  services/                  matching API behind an interface (see below)
  data/                      mock exhibitors, guests, vocabularies
  utils/                     filters, score bands, details-form validation, profile upload parsing
  types/                     shared types
  styles/                    tokens.css (design tokens), base.css, components.css, pages.css
```

## Mock data and the service layer

- `data/exhibitors.ts`: the 200 companies from "Indian Ceramics Asia - 200 Indian Company Mapping Records". Company name, segments, city and state are imported. Contact-person names are not. Hall and booth numbers are generated test values per that file's own data-use note, so the UI labels them as sample values. `data/guests.ts`: three fictional sample profiles for ceramics visitors. `data/taxonomy.ts`: the shared vocabulary (the 15 segments from the list, visitor sectors, seniorities, company sizes, regions, halls 1–4).
- `services/matchingService.ts` defines `MatchingService`. `mockMatchingService` waits 0.6–1.0 s to simulate inference, then scores with `services/scoring.ts`. Results are cached per profile, so reopening the list is instant and the demo survives a network drop.
- To connect a real backend, implement `MatchingService` with `fetch` and change one line in `services/index.ts`. Nothing in `pages/` or `components/` calls the mock directly.
- `services/scoring.ts` is the only place scores are computed, as a two-way mutual fit: *you → stall* (40% semantic similarity of the wording, 40% shared segments, 20% intent) and *stall → you* (does your sector buy the stall's segments, is the stall in your region, with a 25% floor). The match % is the geometric mean of the two. Every point maps to a named factor in the detail panel. There are no per-exhibitor adjustments; ties break by name. This follows the fairness rules in `CLAUDE.md`.

## Phase 2: map and directions

- `data/venue.ts` builds a **sample layout**: four 52 × 48 m halls side by side on one concourse, main entrance in the middle, 50 booths per hall in 5 rows of 10 either side of a centre aisle (booth 101 sits nearest the door, numbers run left to right). Units are metres, so route lengths are walking distances. It is generated from the test booth numbers, not an official plan. TODO: swap in the organiser's floor plan.
- `services/wayfinding.ts` is pure: a start (entrance, hall door or booth) and a stall in; the path, metres, minutes (at 70 m/min) and plain steps out ("Turn right into aisle 1. B-106 is the first stall on your left.").
- `components/VenueMap.tsx` is plain SVG (works offline): drag to pan, buttons to zoom, auto-frames the route; on a narrow screen with nothing picked it opens on the hall holding most of your matches. Glazed tiles are keyboard focusable; every stall can be reached through the "Take me to" list.

## Key decisions

- **Design tokens** live in `styles/tokens.css` and mirror the canvas (slate neutrals, `#1D4ED8` action blue, teal chips, green/amber/slate score bands).
- **Native `<dialog>`** for the detail sheet, filter sheet and profile dialogs, which gives a focus trap, Esc to close and focus restore without a library.
- **`useMediaQuery`** decides inline drawer versus modal and sidebar versus sheet, so only one layout is mounted at a time.
- **Memoised cards** with a stable bookmark handler (`useBookmarkToggle`), so saving one stall does not re-render the other cards.
- **Accessibility:** skip link, focus moved to the page on navigation, visible focus rings, 44 px touch targets, scores shown as numbers plus a band label (never colour alone), `aria-live` for result counts, toasts and errors, reduced-motion respected.
- **Persistence:** the profile and bookmarks are kept in `localStorage`, guarded for browsers that block it.

## Assumptions

- Halls are 1–4 and booths look like `A-101`, as in the company list. They are generated test values, not the official floor plan.
- The list has 200 exhibitors, matching the mobile hero ("200 stalls"). All counts in the UI come from the data.
- The canvas has no industry filter. One was added in the same style because the brief asks for filtering by industry segment.
- The "Product category" filter lists the 15 segments from the company list; a stall passes if it is listed under any selected one. The canvas's separate industry filter is not used, because the segments are the industry categories.
- Upload fills the form instead of skipping it: fields it recognises are filled, the rest stay blank for the visitor to complete. Field names match the mobile `GuestInput`.
- Stalls whose visitor → stall score is almost zero are left out, as in the mobile engine, so a sparse profile can return fewer than 30 matches.
- Segment names are shortened for display (`SEGMENT_SHORT` in `data/taxonomy.ts`, e.g. "Glazing & decoration"); the full names from the company list stay in the detail panel's segment chips and the CSV export.
- The detail panel shows four bars (semantic, interests, intent, buyer fit) as in `docs/final-flow.md`; the canvas drew three.
- **TODO (organiser):** the company list has no descriptions, product lists or target-buyer criteria, so none were invented. "Buyer fit" uses one rule per segment (`INDUSTRIES_BUYING` in `data/taxonomy.ts`) and the stall's state. The visitor sector list is also an assumption. Seniority and company size are collected but not scored until buyer criteria exist.
- **Mobile app:** it still uses the earlier fictional trade-fair data. Its vocabularies, exhibitors and sample profiles need the same change to stay in step with this app.
- "Live" in the header and "Local model" in the results pill follow the canvas. In this build both refer to the in-browser mock.
- Profiles saved by an older build lack the new fields and are ignored, so the visitor starts from the landing page.

## Judging criteria

| Criterion (points) | Where it shows up |
|---|---|
| Challenge alignment (15) | Details form or sample, upload, top 30 with percentages, booth details, reasons, filter/sort, bookmark, export |
| AI architecture and depth (15) | Weighted semantic/relevance/intent scoring with per-factor explanations; service interface ready for a real model |
| Software engineering and integration (15) | Strict TypeScript, typed service boundary, hooks and context, memoised lists, no UI-to-mock coupling |
| Live demo and reliability (15) | Instant cached reruns, offline fonts, Replay, `?fail` error demo, pre-filled sample profiles |
| Innovation (10) | Matching progress with live timer, score bands, "why this is a N% match" panel |
| UX and AI interaction (10) | Loading, empty and error states, undoable saves, responsive across phone, tablet and laptop, readable at 125% zoom |
| Scalability, security, responsible AI (10) | No paid placement or hidden boosts, stated on screen; ties broken neutrally; profile stays in the browser; no secrets |
| Presentation and Q&A (10) | The `/how-it-works` page and the per-match breakdown answer "why this score" live |
