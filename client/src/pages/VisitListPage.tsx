import { useMemo, useState } from 'react';
import { segmentLabel } from '../data/taxonomy';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, MatchSkeleton } from '../components/StatePanels';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { HALLS } from '../data/taxonomy';
import { useBookmarkToggle } from '../hooks/useBookmarkToggle';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMatches } from '../hooks/useMatches';
import { downloadTextFile, visitListToCsv } from '../services/exportService';
import type { Match } from '../types';

export function VisitListPage() {
  useDocumentTitle('Visit list');
  const { guest } = useSession();
  const { state, retry } = useMatches(guest);

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
          Your visit list belongs to a profile. Tell us who you are to start saving stalls.
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

  if (state.status !== 'success') {
    return (
      <div className="container">
        <p className="visually-hidden" role="status">
          Loading your visit list
        </p>
        <MatchSkeleton rows={3} />
      </div>
    );
  }

  return <VisitListView guestName={guest.name} matches={state.data.results} />;
}

interface VisitListViewProps {
  guestName: string;
  matches: readonly Match[];
}

function VisitListView({ guestName, matches }: VisitListViewProps) {
  const { bookmarkIds, clearBookmarks } = useSession();
  const { notify } = useToast();
  const handleRemove = useBookmarkToggle();
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Sorted by booth so the list reads as a walking route through the hall.
  const saved = useMemo(
    () =>
      matches
        .filter((m) => bookmarkIds.includes(m.exhibitor.id))
        .sort(
          (a, b) =>
            a.exhibitor.hall.localeCompare(b.exhibitor.hall) ||
            a.exhibitor.booth.localeCompare(b.exhibitor.booth, undefined, { numeric: true }),
        ),
    [matches, bookmarkIds],
  );

  const handleExport = () => {
    const slug = guestName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'visitor';
    downloadTextFile(`visit-list-${slug}.csv`, visitListToCsv(saved));
    notify(`Exported ${saved.length} stalls as CSV`);
  };

  const handleClear = () => {
    clearBookmarks();
    setIsConfirmingClear(false);
    notify('Visit list cleared');
  };

  if (saved.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="Your visit list is empty"
          action={
            <Link to="/matches" className="btn btn--primary">
              Browse your matches
            </Link>
          }
        >
          Save stalls from your matches and they appear here, grouped by row in walking order.
        </EmptyState>
      </div>
    );
  }

  const hallsInUse = HALLS.filter((hall) => saved.some((m) => m.exhibitor.hall === hall));

  return (
    <div className="container visit-page">
      <header className="visit-page__head">
        <div>
          <h1>Your visit list</h1>
          <p className="muted">
            {saved.length} {saved.length === 1 ? 'stall' : 'stalls'} across {hallsInUse.length}{' '}
            {hallsInUse.length === 1 ? 'row' : 'rows'}, saved on this device.
          </p>
        </div>
        <div className="visit-page__actions no-print">
          <button type="button" className="btn btn--primary" onClick={handleExport}>
            <Icon name="download" size={18} />
            Export CSV
          </button>
          <button type="button" className="btn btn--outline" onClick={() => window.print()}>
            <Icon name="print" size={18} />
            Print
          </button>
        </div>
      </header>

      {hallsInUse.map((hall) => (
        <section key={hall} className="hall-group" aria-labelledby={`hall-${hall}`}>
          <h2 id={`hall-${hall}`}>Row {hall}</h2>
          <ul className="visit-list">
            {saved
              .filter((m) => m.exhibitor.hall === hall)
              .map((m) => (
                <li key={m.exhibitor.id} className="visit-row">
                  <p className="visit-row__booth">{m.exhibitor.booth}</p>
                  <div className="visit-row__body">
                    <h3>{m.exhibitor.name}</h3>
                    <p>{segmentLabel(m.insights[0]?.label ?? m.exhibitor.city)}</p>
                  </div>
                  <p className="visit-row__score">
                    {m.score}%<span className="visually-hidden"> match</span>
                  </p>
                  <button
                    type="button"
                    className="icon-btn no-print"
                    onClick={() => handleRemove(m.exhibitor.id)}
                    aria-label={`Remove ${m.exhibitor.name} from visit list`}
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <div className="clear-bar no-print">
        {isConfirmingClear ? (
          <>
            <p>Remove all {saved.length} stalls from this list?</p>
            <button type="button" className="btn btn--danger" onClick={handleClear}>
              Yes, clear the list
            </button>
            <button type="button" className="btn btn--outline" onClick={() => setIsConfirmingClear(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--outline" onClick={() => setIsConfirmingClear(true)}>
            Clear visit list
          </button>
        )}
      </div>
    </div>
  );
}
