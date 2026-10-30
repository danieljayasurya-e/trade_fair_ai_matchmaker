import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MatchingFloor } from '../components/MatchingFloor';
import { EmptyState, ErrorState } from '../components/StatePanels';
import { useSession } from '../context/SessionContext';
import { EXHIBITORS } from '../data/exhibitors';
import { HALLS } from '../data/taxonomy';
import { SHOW_MAP } from '../features';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMatches } from '../hooks/useMatches';
import { TOP_N } from '../services';
import type { Match } from '../types';
import { formatSeconds } from '../utils/score';

// Rough time boundaries for the first two steps. The service gives no progress events,
// so these only pace the checklist; completion always comes from the real response.
const STEP_ONE_MS = 200;
const STEP_TWO_MS = 650;
const EXPECTED_MS = 1000;

/** "26 in row LC and 4 in row LD", leaving out rows with no matches. */
function hallSummary(matches: readonly Match[]): string {
  const parts = HALLS.map((hall) => [hall, matches.filter((m) => m.exhibitor.hall === hall).length] as const)
    .filter(([, count]) => count > 0)
    .map(([hall, count]) => `${count} in row ${hall}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? 'none yet');
}

export function LoadingPage() {
  useDocumentTitle('Matching in progress');
  const { guest } = useSession();
  const { state, retry } = useMatches(guest, { fresh: true });
  const [elapsed, setElapsed] = useState(0);
  const isLoading = state.status === 'loading' || state.status === 'idle';
  const isDone = state.status === 'success';
  const viewLinkRef = useRef<HTMLAnchorElement>(null);
  const matchMap = useMemo(
    () =>
      state.status === 'success'
        ? new Map(state.data.results.map((m): [string, Match] => [m.exhibitor.id, m]))
        : null,
    [state],
  );

  // When matching finishes, put focus on the next step so Enter continues the demo.
  useEffect(() => {
    if (isDone) viewLinkRef.current?.focus();
  }, [isDone]);

  useEffect(() => {
    if (state.status !== 'loading') return;
    const started = performance.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.round(performance.now() - started)), 40);
    return () => clearInterval(timer);
  }, [state.status]);

  if (!guest) {
    return (
      <div className="container">
        <EmptyState
          title="Add your details first"
          action={
            <Link to="/details" className="btn btn--primary">
              Find my stalls
            </Link>
          }
        >
          Matching starts from your details.
        </EmptyState>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="container">
        <ErrorState message={state.message} onRetry={retry} />
      </div>
    );
  }

  const stepIndex = isDone ? 3 : elapsed < STEP_ONE_MS ? 0 : elapsed < STEP_TWO_MS ? 1 : 2;
  const percent = isDone ? 100 : Math.min(95, Math.round((elapsed / EXPECTED_MS) * 100));
  const shownMs = isDone ? state.data.latencyMs : elapsed;
  const steps = ['Reading profile', `Comparing with ${EXHIBITORS.length} exhibitors`, `Ranking your top ${TOP_N}`];

  return (
    <div className="container loading-page" aria-busy={isLoading}>
      <figure className="loading-page__floor">
        <MatchingFloor scanned={Math.round((percent / 100) * EXHIBITORS.length)} matches={matchMap} />
        <figcaption>
          {isDone ? (
            <>
              Your matches are coloured: {hallSummary(state.data.results)}.
              {SHOW_MAP && (
                <>
                  {' '}
                  <Link to="/map">See them on the map</Link>
                </>
              )}
            </>
          ) : (
            `Compared ${Math.round((percent / 100) * EXHIBITORS.length)} of ${EXHIBITORS.length} stalls`
          )}
        </figcaption>
      </figure>

      <section className="progress-card" role="status" aria-live="polite" aria-labelledby="progress-title">
        <div className="progress-card__head">
          <h1 id="progress-title">Matching {guest.name.split(' ')[0]}'s profile</h1>
          <span className="progress-card__timer">{formatSeconds(shownMs)}</span>
        </div>

        <div className="bar bar--thick" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>

        <ol className="steps">
          {steps.map((label, index) => {
            const status = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'pending';
            return (
              <li key={label} className={`steps__item steps__item--${status}`}>
                <span className="steps__marker" aria-hidden="true">
                  {status === 'done' && <Icon name="check" size={16} strokeWidth={3} />}
                </span>
                <span>
                  {label}
                  {status === 'current' && '…'}
                  {status === 'done' && <span className="visually-hidden"> (done)</span>}
                </span>
              </li>
            );
          })}
        </ol>

        {isDone ? (
          <div className="progress-card__done">
            <p>
              {state.data.results.length} matches found in <strong>{formatSeconds(shownMs)}</strong> using the embedding
              model.
            </p>
            <div className="progress-card__actions">
              <Link to="/matches" ref={viewLinkRef} className="btn btn--primary btn--grow">
                View your top {TOP_N}
              </Link>
              <button type="button" className="btn btn--outline" onClick={retry}>
                Replay
              </button>
            </div>
          </div>
        ) : (
          <Link to="/details" className="progress-card__cancel">
            Cancel
          </Link>
        )}
      </section>
    </div>
  );
}
