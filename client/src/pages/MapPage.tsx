import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { VenueMap } from '../components/VenueMap';
import { useSession } from '../context/SessionContext';
import { HALLS } from '../data/taxonomy';
import { BOOTH_SPOTS, SPOT_BY_ID } from '../data/venue';
import { useBookmarkToggle } from '../hooks/useBookmarkToggle';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMatches } from '../hooks/useMatches';
import { decodeStart, describeStart, encodeStart, routeTo } from '../services/wayfinding';
import type { Match } from '../types';
import { bandFor } from '../utils/score';

/** "Main entrance" → "the main entrance", "Hall 2 door" → "the Hall 2 door", "Booth B-121" → "booth B-121". */
const fromPhrase = (place: string) =>
  place === 'Main entrance'
    ? 'the main entrance'
    : place.startsWith('Booth')
      ? `b${place.slice(1).replace('-', '‑')}` // non-breaking hyphen keeps "A-134" on one line
      : `the ${place}`;

const byBooth =(a: { exhibitor: { booth: string } }, b: { exhibitor: { booth: string } }) =>
  a.exhibitor.booth.localeCompare(b.exhibitor.booth, undefined, { numeric: true });

// Phase 2: every stall on a sample venue plan, and walking directions to any one of them.
export function MapPage() {
  useDocumentTitle('Find your way');
  const { guest, bookmarkIds } = useSession();
  const { state } = useMatches(guest);
  const [params, setParams] = useSearchParams();
  const handleToggleSave = useBookmarkToggle();

  const requested = params.get('stall');
  const targetId = requested && SPOT_BY_ID.has(requested) ? requested : null;
  const startKey = encodeStart(decodeStart(params.get('from')));
  const start = useMemo(() => decodeStart(startKey), [startKey]);
  const route = useMemo(() => (targetId ? routeTo(start, targetId) : null), [start, targetId]);

  const matchList = state.status === 'success' ? state.data.matches : null;
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
  const selectStall = useCallback((id: string) => setParam({ stall: id }), [setParam]);

  const target = targetId ? SPOT_BY_ID.get(targetId) : undefined;
  const targetMatch = targetId ? matches.get(targetId) : undefined;
  const band = targetMatch ? bandFor(targetMatch.score) : null;

  return (
    <div className="container map-page">
      <header className="map-page__head">
        <h1>Find your way</h1>
        <p className="muted">
          Every stall at the show, hall by hall. Your matches are the glazed tiles; pick one to get walking
          directions.
        </p>
      </header>

      <div className="map-page__body">
        <section className="map-page__map" aria-label="Venue map">
          <VenueMap
            matches={matches}
            savedIds={saved}
            targetId={targetId}
            start={start}
            route={route}
            onSelect={selectStall}
          />
          <MapLegend />
        </section>

        <aside className="map-panel" aria-label="Directions">
          <div className="map-panel__pickers">
            <label className="field">
              <span>Take me to</span>
              <select value={targetId ?? ''} onChange={(e) => setParam({ stall: e.target.value || null })}>
                <option value="">Choose a stall</option>
                {HALLS.map((hall) => (
                  <optgroup key={hall} label={`Hall ${hall}`}>
                    {BOOTH_SPOTS.filter((s) => s.exhibitor.hall === hall).map((s) => (
                      <option key={s.exhibitor.id} value={s.exhibitor.id}>
                        {s.exhibitor.booth} · {s.exhibitor.name}
                        {matches.has(s.exhibitor.id) ? ` · ${matches.get(s.exhibitor.id)?.score}%` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="field">
              <span>I'm at</span>
              <select value={startKey} onChange={(e) => setParam({ from: e.target.value === 'entrance' ? null : e.target.value })}>
                <optgroup label="Entrances">
                  <option value="entrance">Main entrance</option>
                  {HALLS.map((hall) => (
                    <option key={hall} value={`door-${hall}`}>
                      Hall {hall} door
                    </option>
                  ))}
                </optgroup>
                {HALLS.map((hall) => (
                  <optgroup key={hall} label={`Booths in Hall ${hall}`}>
                    {BOOTH_SPOTS.filter((s) => s.exhibitor.hall === hall).map((s) => (
                      <option key={s.exhibitor.id} value={s.exhibitor.id}>
                        {s.exhibitor.booth} · {s.exhibitor.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {target && route ? (
            <section className="map-panel__route" aria-labelledby="route-title">
              <div className="map-panel__stall">
                <h2 id="route-title">{target.exhibitor.name}</h2>
                <p className="muted">
                  Hall {target.exhibitor.hall} · Booth {target.exhibitor.booth} · {target.exhibitor.city}
                </p>
                {targetMatch && band ? (
                  <p className={`map-panel__score tone-${band.tone}`}>
                    <strong>{targetMatch.score}%</strong> {band.label} · rank #{targetMatch.rank} for you
                  </p>
                ) : (
                  <p className="map-panel__score map-panel__score--none">
                    {guest ? 'Not in your top 30' : 'Add your details to see how well this stall fits you'}
                  </p>
                )}
              </div>

              <p className="map-panel__distance">
                <Icon name="pin" size={18} />
                {route.metres === 0
                  ? 'You are here'
                  : `About ${route.metres} m, ${route.minutes} min walk from ${fromPhrase(describeStart(start))}`}
              </p>
              <ol className="map-steps">
                {route.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <div className="map-panel__actions">
                {guest && (
                  <button
                    type="button"
                    className={`btn btn--outline${saved.has(target.exhibitor.id) ? ' is-saved' : ''}`}
                    aria-pressed={saved.has(target.exhibitor.id)}
                    onClick={() => handleToggleSave(target.exhibitor.id)}
                  >
                    <Icon name="bookmark" size={18} filled={saved.has(target.exhibitor.id)} />
                    {saved.has(target.exhibitor.id) ? 'Saved' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setParam({ from: target.exhibitor.id, stall: null })}
                >
                  I'm here, pick the next stall
                </button>
              </div>
              <p className="map-panel__note">Sample layout. Hall and booth positions are not the official floor plan.</p>
            </section>
          ) : (
            <MatchesByHall matches={matchList} hasGuest={guest !== null} onSelect={selectStall} />
          )}
        </aside>
      </div>
    </div>
  );
}

interface MatchesByHallProps {
  matches: readonly Match[] | null;
  hasGuest: boolean;
  onSelect: (id: string) => void;
}

/** With no stall picked: where the visitor's matches are, hall by hall, each one a tap away from directions. */
function MatchesByHall({ matches, hasGuest, onSelect }: MatchesByHallProps) {
  if (!hasGuest) {
    return (
      <section className="map-panel__empty">
        <h2>See your matches on the map</h2>
        <p className="muted">Tap any tile for directions now, or add your details and your best stalls light up.</p>
        <Link to="/details" className="btn btn--primary">
          Find my stalls
        </Link>
      </section>
    );
  }
  if (!matches) {
    return (
      <p className="muted" role="status">
        Loading your matches…
      </p>
    );
  }
  return (
    <section aria-labelledby="by-hall">
      <h2 id="by-hall" className="map-panel__title">
        Your matches by hall
      </h2>
      {HALLS.map((hall) => {
        const inHall = matches.filter((m) => m.exhibitor.hall === hall).sort(byBooth);
        if (inHall.length === 0) return null;
        return (
          <div key={hall} className="hall-list">
            <h3>
              Hall {hall} <span className="muted">{inHall.length}</span>
            </h3>
            <ul>
              {inHall.map((m) => {
                const band = bandFor(m.score);
                return (
                  <li key={m.exhibitor.id}>
                    <button type="button" className="hall-list__item" onClick={() => onSelect(m.exhibitor.id)}>
                      <span className="hall-list__booth">{m.exhibitor.booth}</span>
                      <span className="hall-list__name">{m.exhibitor.name}</span>
                      <span className={`hall-list__score tone-${band.tone}`}>{m.score}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/** Swatches drawn with the same shapes as the map, so the key reads exactly like the floor. */
function MapLegend() {
  const tile = (className: string, gloss: boolean) => (
    <svg width="18" height="18" viewBox="0 0 3.4 3.4" aria-hidden="true">
      <g className={className}>
        <rect className="tile__body" width="3.4" height="3.4" rx="0.45" />
        {gloss && <path className="tile__gloss" d="M0.35 0.35 H2.1 L0.35 2.1 Z" />}
      </g>
    </svg>
  );
  return (
    <ul className="map-legend">
      <li>{tile('tile', false)}Other stall</li>
      <li>{tile('tile tile--glazed tone-strong', true)}80%+ match</li>
      <li>{tile('tile tile--glazed tone-good', true)}60–79%</li>
      <li>{tile('tile tile--glazed tone-partial', true)}Below 60%</li>
      <li>
        <svg width="18" height="18" viewBox="0 0 4 4" aria-hidden="true">
          <circle className="tile__saved" cx="2" cy="2" r="1.1" />
        </svg>
        Saved
      </li>
      <li>
        <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
          <path d="M2 9h22" className="map-legend__route" />
        </svg>
        Your route
      </li>
    </ul>
  );
}
