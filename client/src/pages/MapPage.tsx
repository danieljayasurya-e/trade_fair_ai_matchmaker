import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Select } from '../components/Select';
import { VenueMap } from '../components/VenueMap';
import { useSession } from '../context/SessionContext';
import { HALLS } from '../data/taxonomy';
import { BOOTH_SPOTS, SPOT_BY_ID } from '../data/venue';
import type { BoothSpot } from '../data/venue';
import { useBookmarkToggle } from '../hooks/useBookmarkToggle';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMatches } from '../hooks/useMatches';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { decodeStart, describeStart, encodeStart, routeTo } from '../services/wayfinding';
import type { Route, StartPlace } from '../services/wayfinding';
import type { Match } from '../types';
import { bandFor } from '../utils/score';

/** "Main entrance" → "the main entrance", "Booth LC 24" → "booth LC 24". */
const fromPhrase = (place: string) =>
  place === 'Main entrance' ? 'the main entrance' : place.startsWith('Booth') ? `b${place.slice(1)}` : `the ${place}`;

/** The phone's directions sheet: just its handle, a summary, or everything. */
type SheetState = 'min' | 'peek' | 'open';
const SHEET_ORDER: readonly SheetState[] = ['min', 'peek', 'open'];
/** How much of the map each sheet state covers, in pixels, so routes are framed above it. */
const SHEET_COVER_PX: Record<SheetState, number> = { min: 44, peek: 168, open: 168 };
/** How far a drag on the handle must go to count as a swipe. */
const SWIPE_PX = 24;
const SEARCH_LIMIT = 40;

/** "Starting from" choices: the entrance, then every booth grouped by row. */
const START_OPTIONS = [
  { value: 'entrance', label: 'Main entrance' },
  ...HALLS.map((hall) => ({
    label: `Booths in row ${hall}`,
    options: BOOTH_SPOTS.filter((s) => s.exhibitor.hall === hall).map((s) => ({
      value: s.exhibitor.id,
      label: `${s.exhibitor.booth} · ${s.exhibitor.name}`,
    })),
  })),
];

type SortOrder = 'nearest' | 'best';

/** "lc16", "LC 16" and "monoline" all find MONOLINE LASER at LC 16. */
const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, '');

/** Walking distance from a start to any stall, worked out once per stall and start. Infinity if there's no way through. */
function useWalkingDistance(start: StartPlace) {
  const startKey = encodeStart(start);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cache = useMemo(() => new Map<string, number>(), [startKey]);
  return useCallback(
    (id: string) => {
      let metres = cache.get(id);
      if (metres === undefined) {
        metres = routeTo(start, id)?.metres ?? Number.POSITIVE_INFINITY;
        cache.set(id, metres);
      }
      return metres;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache],
  );
}

// Every stall on the Hall 1 plan from the visitor guide, and walking directions to any one of them.
// Laptops: directions panel beside a full-height map. Phones: full-screen map with a directions sheet.
export function MapPage() {
  useDocumentTitle('Find your way');
  const { guest, bookmarkIds } = useSession();
  const { state } = useMatches(guest);
  const [params, setParams] = useSearchParams();
  const handleToggleSave = useBookmarkToggle();
  const isPhone = useMediaQuery('(max-width: 47.99rem)');
  const [sheet, setSheet] = useState<SheetState>('peek');
  const swipeFrom = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const stepSheet = (direction: 1 | -1) =>
    setSheet((current) => {
      const index = SHEET_ORDER.indexOf(current) + direction;
      return SHEET_ORDER[Math.min(Math.max(index, 0), SHEET_ORDER.length - 1)] ?? current;
    });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('best');

  const requested = params.get('stall');
  const targetId = requested && SPOT_BY_ID.has(requested) ? requested : null;
  const startKey = encodeStart(decodeStart(params.get('from')));
  const start = useMemo(() => decodeStart(startKey), [startKey]);
  const route = useMemo(() => (targetId ? routeTo(start, targetId) : null), [start, targetId]);
  const distanceTo = useWalkingDistance(start);
  // The step being pointed at, tied to its route so a new route starts with none.
  const [pointed, setPointed] = useState<{ route: Route; step: number } | null>(null);
  const activeStep = pointed && pointed.route === route ? pointed.step : null;
  const [stepFocus, setStepFocus] = useState(0);
  const pointAt = (step: number | null) => setPointed(step === null || !route ? null : { route, step });

  const matchList = state.status === 'success' ? state.data.results : null;
  const matches = useMemo(
    () => new Map((matchList ?? []).map((m): [string, Match] => [m.exhibitor.id, m])),
    [matchList],
  );
  const saved = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const setParam = useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const selectStall = useCallback(
    (id: string) => {
      setParam({ stall: id });
      // On a phone, fold the sheet so the route on the map is what you see.
      setSheet('peek');
    },
    [setParam],
  );
  const arriveHere = (id: string) => {
    setParam({ from: id, stall: null });
    setSort('nearest');
    setQuery('');
    setSheet('open');
  };

  const target = targetId ? SPOT_BY_ID.get(targetId) : undefined;
  const targetMatch = targetId ? matches.get(targetId) : undefined;
  const band = targetMatch ? bandFor(targetMatch.score) : null;
  const isSaved = target ? saved.has(target.exhibitor.id) : false;

  return (
    <div className="map-page" data-sheet={sheet}>
      <section className="map-page__map" aria-label="Hall 1 map">
        <VenueMap
          matches={matches}
          savedIds={saved}
          targetId={targetId}
          start={start}
          route={route}
          onSelect={selectStall}
          insetBottom={isPhone ? SHEET_COVER_PX[sheet] : 0}
          activeStep={activeStep}
          stepFocus={stepFocus}
        />
        <MapLegend className="map-legend--overlay" />
      </section>

      <aside className="map-panel" aria-label="Directions">
        {/* Tap to open or fold; swipe up or down to step between handle only, summary and everything. */}
        <button
          type="button"
          className="map-panel__handle"
          aria-expanded={sheet === 'open'}
          onPointerDown={(e) => {
            swipeFrom.current = e.clientY;
          }}
          onPointerUp={(e) => {
            const from = swipeFrom.current;
            swipeFrom.current = null;
            if (from === null) return;
            const dy = e.clientY - from;
            didSwipe.current = Math.abs(dy) >= SWIPE_PX;
            if (didSwipe.current) stepSheet(dy < 0 ? 1 : -1);
          }}
          onClick={() => {
            // A swipe already moved the sheet; a tap opens it, or folds it back to the summary.
            if (didSwipe.current) {
              didSwipe.current = false;
              return;
            }
            setSheet((current) => (current === 'open' ? 'peek' : current === 'min' ? 'peek' : 'open'));
          }}
        >
          <span className="map-panel__grip" aria-hidden="true" />
          <span className="visually-hidden">{sheet === 'open' ? 'Fold the directions' : 'Open the directions'}</span>
        </button>
        {sheet !== 'min' && (
          <button type="button" className="map-panel__hide" onClick={() => setSheet('min')}>
            <Icon name="chevronDown" size={18} strokeWidth={2} />
            <span className="visually-hidden">Hide the directions to see more map</span>
          </button>
        )}

        <h1 className="map-panel__heading">Find your way</h1>

        {target && route ? (
          <section className="route-card" aria-labelledby="route-title">
            <button type="button" className="route-card__back" onClick={() => setParam({ stall: null })}>
              <Icon name="chevronLeft" size={18} strokeWidth={2} />
              All stalls
            </button>

            <div className="route-card__summary">
              <span className={`route-card__booth${band ? ` tone-${band.tone}` : ''}`}>{target.exhibitor.booth}</span>
              <div className="route-card__title">
                <h2 id="route-title">{target.exhibitor.name}</h2>
                {targetMatch && band ? (
                  <p className={`route-card__score tone-${band.tone}`}>
                    <strong>{targetMatch.score}%</strong> {band.label}, #{targetMatch.rank} for you
                  </p>
                ) : (
                  <p className="route-card__score route-card__score--none">
                    {guest ? 'Not in your top 30' : 'Add your details to see how well this stall fits you'}
                  </p>
                )}
              </div>
            </div>

            <p className="route-card__walk">
              {route.metres === 0 ? (
                <strong>You're at this stall</strong>
              ) : (
                <>
                  <strong>
                    {route.metres} m · {route.minutes} min
                  </strong>{' '}
                  <span>from {fromPhrase(describeStart(start))}</span>
                </>
              )}
            </p>

            <div className="route-card__actions">
              <button type="button" className="btn btn--primary" onClick={() => arriveHere(target.exhibitor.id)}>
                I'm here, what's next?
              </button>
              {guest && (
                <button
                  type="button"
                  className={`btn btn--outline btn--square${isSaved ? ' is-saved' : ''}`}
                  aria-pressed={isSaved}
                  aria-label={isSaved ? 'Saved to visit list' : 'Save to visit list'}
                  onClick={() => handleToggleSave(target.exhibitor.id)}
                >
                  <Icon name="bookmark" size={18} filled={isSaved} />
                </button>
              )}
            </div>

            {route.steps.length > 0 && (
              // Point at a step to see its stretch on the map; pick it to bring that stretch into view.
              <ol className="map-steps" onMouseLeave={() => pointAt(null)}>
                {route.steps.map((step, index) => {
                  return (
                    <li key={step}>
                      <button
                        type="button"
                        className={`map-steps__step${index === activeStep ? ' is-active' : ''}`}
                        aria-pressed={index === activeStep}
                        onMouseEnter={() => pointAt(index)}
                        onFocus={() => pointAt(index)}
                        onBlur={() => pointAt(null)}
                        onClick={() => {
                          pointAt(index);
                          setStepFocus((n) => n + 1);
                          setSheet('peek');
                        }}
                      >
                        <span className="map-steps__num" aria-hidden="true">
                          {index + 1}
                        </span>
                        {step}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="map-panel__note">Traced from the visitor guide's plan. Distances are approximate.</p>
          </section>
        ) : (
          <StallFinder
            query={query}
            onQuery={setQuery}
            onFocusSearch={() => setSheet('open')}
            sort={sort}
            onSort={setSort}
            matches={matchList}
            matchById={matches}
            hasGuest={guest !== null}
            isLoading={guest !== null && state.status !== 'success' && state.status !== 'error'}
            distanceTo={distanceTo}
            onSelect={selectStall}
            startLabel={describeStart(start)}
          />
        )}

        <div className="field map-panel__from">
          <span id="map-start-label">Starting from</span>
          <Select
            aria-labelledby="map-start-label"
            searchable
            value={startKey}
            options={START_OPTIONS}
            onChange={(key) => setParam({ from: key === 'entrance' ? null : key })}
          />
        </div>

        <MapLegend className="map-legend--sheet" />
      </aside>
    </div>
  );
}

interface StallFinderProps {
  query: string;
  onQuery: (query: string) => void;
  onFocusSearch: () => void;
  sort: SortOrder;
  onSort: (sort: SortOrder) => void;
  matches: readonly Match[] | null;
  matchById: ReadonlyMap<string, Match>;
  hasGuest: boolean;
  isLoading: boolean;
  distanceTo: (id: string) => number;
  onSelect: (id: string) => void;
  startLabel: string;
}

/** With no stall picked: search every stall, or browse your matches nearest first or best first. */
function StallFinder({
  query,
  onQuery,
  onFocusSearch,
  sort,
  onSort,
  matches,
  matchById,
  hasGuest,
  isLoading,
  distanceTo,
  onSelect,
  startLabel,
}: StallFinderProps) {
  const needle = normalise(query.trim());

  const found: BoothSpot[] = needle
    ? BOOTH_SPOTS.filter((s) => normalise(s.exhibitor.name).includes(needle) || normalise(s.exhibitor.booth).includes(needle))
        .slice(0, SEARCH_LIMIT)
    : [];
  const listed = needle
    ? found.map((spot) => ({ spot, match: matchById.get(spot.exhibitor.id) }))
    : (matches ?? [])
        .map((match) => ({ spot: SPOT_BY_ID.get(match.exhibitor.id), match }))
        .filter((row): row is { spot: BoothSpot; match: Match } => row.spot !== undefined);
  if (!needle && sort === 'nearest') {
    listed.sort((a, b) => distanceTo(a.spot.exhibitor.id) - distanceTo(b.spot.exhibitor.id));
  }

  return (
    <section className="finder" aria-label="Find a stall">
      <label className="finder__search">
        <Icon name="search" size={18} />
        <span className="visually-hidden">Search stalls</span>
        <input
          type="search"
          value={query}
          placeholder="Search by company or booth"
          autoComplete="off"
          onChange={(e) => onQuery(e.target.value)}
          onFocus={onFocusSearch}
        />
      </label>

      {!needle && hasGuest && matches && (
        <div className="finder__bar">
          <h2 className="finder__title">Your top {matches.length}</h2>
          <div className="segmented" role="group" aria-label="Order">
            <button type="button" aria-pressed={sort === 'nearest'} onClick={() => onSort('nearest')}>
              Nearest
            </button>
            <button type="button" aria-pressed={sort === 'best'} onClick={() => onSort('best')}>
              Best match
            </button>
          </div>
        </div>
      )}
      {!needle && hasGuest && matches && sort === 'nearest' && (
        <p className="finder__hint">Walking distance from {fromPhrase(startLabel)}.</p>
      )}

      {!needle && !hasGuest && (
        <div className="finder__empty">
          <p>Search any stall above, or add your details and your best matches light up on the map.</p>
          <Link to="/details" className="btn btn--primary">
            Find my stalls
          </Link>
        </div>
      )}
      {!needle && isLoading && (
        <p className="muted" role="status">
          Loading your matches…
        </p>
      )}
      {needle && found.length === 0 && (
        <p className="finder__none" role="status">
          No stall matches “{query.trim()}”. Try a booth like LC 16 or part of a company name.
        </p>
      )}

      {listed.length > 0 && (
        <ul className="finder__list">
          {listed.map(({ spot, match }) => {
            const band = match ? bandFor(match.score) : null;
            return (
              <li key={spot.exhibitor.id}>
                <button type="button" className="finder__row" onClick={() => onSelect(spot.exhibitor.id)}>
                  <span className={`finder__booth${band ? ` tone-${band.tone}` : ''}`}>{spot.exhibitor.booth}</span>
                  <span className="finder__name">{spot.exhibitor.name}</span>
                  <span className="finder__meta">
                    {match && band && <strong className={`tone-${band.tone}`}>{match.score}%</strong>}
                    {Number.isFinite(distanceTo(spot.exhibitor.id)) && <span>{distanceTo(spot.exhibitor.id)} m</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Swatches drawn with the same shapes as the map, so the key reads exactly like the floor. */
function MapLegend({ className }: { className: string }) {
  const tile = (tileClass: string) => (
    <svg width="14" height="14" viewBox="0 0 3.4 3.4" aria-hidden="true">
      <g className={tileClass}>
        <rect className="tile__body" width="3.4" height="3.4" rx="0.5" />
      </g>
    </svg>
  );
  return (
    <ul className={`map-legend ${className}`} aria-label="Map key">
      <li>{tile('tile tile--glazed tone-strong')}80%+</li>
      <li>{tile('tile tile--glazed tone-good')}60–79%</li>
      <li>{tile('tile tile--glazed tone-partial')}Under 60%</li>
      <li>{tile('tile')}Other stall</li>
      <li>
        <svg width="14" height="14" viewBox="0 0 4 4" aria-hidden="true">
          <circle className="tile__saved" cx="2" cy="2" r="1.3" />
        </svg>
        Saved
      </li>
    </ul>
  );
}
