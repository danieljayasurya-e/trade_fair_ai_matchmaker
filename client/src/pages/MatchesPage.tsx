import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppliedFilters, FilterPanel } from '../components/FilterPanel';
import { FilterSheet } from '../components/FilterSheet';
import { Icon } from '../components/Icon';
import { MatchCard } from '../components/MatchCard';
import { MatchDrawer } from '../components/MatchDrawer';
import { Select } from '../components/Select';
import { EmptyState, ErrorState, MatchSkeleton } from '../components/StatePanels';
import { useSession } from '../context/SessionContext';
import { useBookmarkToggle } from '../hooks/useBookmarkToggle';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMatches } from '../hooks/useMatches';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { Guest, MatchResponse } from '../types';
import { DEFAULT_FILTERS, SORT_LABEL, applyFilters, countActiveFilters } from '../utils/filters';
import type { Filters, SortKey } from '../utils/filters';
import { formatSeconds } from '../utils/score';

const PAGE_SIZE = 10;

const SORT_OPTIONS = (Object.keys(SORT_LABEL) as SortKey[]).map((key) => ({ value: key, label: SORT_LABEL[key] }));
// Below these widths the sidebar and the inline drawer give way to sheets.
const SIDEBAR_QUERY = '(min-width: 48rem)';
const INLINE_DRAWER_QUERY = '(min-width: 75rem)';

export function MatchesPage() {
  useDocumentTitle('Your top 30 matches');
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
          Matches are built from your details, so tell us who you are to see your ranked list.
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
          Loading your matches
        </p>
        <MatchSkeleton rows={6} />
      </div>
    );
  }

  if (state.data.results.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="No close matches yet"
          action={
            <Link to="/details" className="btn btn--primary">
              Edit your details
            </Link>
          }
        >
          Nothing at this fair overlaps with your profile yet. Add more interests or describe what you are looking
          for, then try again.
        </EmptyState>
      </div>
    );
  }

  return <MatchesView guest={guest} response={state.data} />;
}

interface MatchesViewProps {
  guest: Guest;
  response: MatchResponse;
}

function MatchesView({ guest, response }: MatchesViewProps) {
  const { results: matches } = response;
  const { bookmarkIds } = useSession();
  const hasSidebar = useMediaQuery(SIDEBAR_QUERY);
  const hasInlineDrawer = useMediaQuery(INLINE_DRAWER_QUERY);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  // On a laptop the first match is already open beside the list, as in the design.
  const [selectedId, setSelectedId] = useState<string | null>(
    hasInlineDrawer ? (matches[0]?.exhibitor.id ?? null) : null,
  );

  const savedSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);
  const filtered = useMemo(() => applyFilters(matches, filters, savedSet), [matches, filters, savedSet]);
  const visible = filtered.slice(0, shown);
  const selected = useMemo(() => matches.find((m) => m.exhibitor.id === selectedId) ?? null, [matches, selectedId]);
  const activeCount = countActiveFilters(filters);

  const handleChange = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setShown(PAGE_SIZE);
  }, []);
  const handleClear = useCallback(() => handleChange({ ...DEFAULT_FILTERS, sort: filters.sort }), [handleChange, filters.sort]);
  const handleToggleSave = useBookmarkToggle();
  const handleOpen = useCallback((id: string) => setSelectedId(id), []);
  const handleCloseDetail = useCallback(() => setSelectedId(null), []);

  // Previous/next walk the filtered list and wrap around.
  const step = (direction: 1 | -1) => {
    if (filtered.length === 0) return;
    const index = filtered.findIndex((m) => m.exhibitor.id === selectedId);
    const next = index < 0 ? 0 : (index + direction + filtered.length) % filtered.length;
    const target = filtered[next];
    if (target) {
      setSelectedId(target.exhibitor.id);
      if (next >= shown) setShown(next + 1);
    }
  };

  const filterPanel = <FilterPanel matches={matches} filters={filters} onChange={handleChange} onClear={handleClear} />;
  const profileLine = [guest.jobRole, guest.industry].join(' · ');

  return (
    <>
      <div className="page-band">
        <div className="container page-band__inner">
          <div className="page-band__title">
            <h1>Your top {matches.length} matches</h1>
            <p>
              For <strong>{guest.name}</strong> · {profileLine} · <Link to="/details">Edit profile</Link>
            </p>
          </div>
          <span className="meta-pill">
            <Icon name="gauge" size={18} />
            <span className="meta-pill__count">{matches.length} matches · </span>
            {formatSeconds(response.latencyMs)} · {response.source === 'offline' ? 'Offline demo' : 'Embedding model'}
          </span>
          <Link to="/matching" className="btn btn--outline btn--sm">
            <Icon name="refresh" size={16} strokeWidth={2} />
            Re-run
          </Link>
        </div>
      </div>

      <div className="container matches-layout" data-drawer={hasInlineDrawer && selected ? 'inline' : 'none'}>
        {hasSidebar && (
          <aside className="sidebar" aria-label="Filters">
            {filterPanel}
          </aside>
        )}

        <section className="results" aria-label="Matches">
          <div className="results__bar">
            <p className="results__count" aria-live="polite">
              Showing <strong>{Math.min(shown, filtered.length)}</strong> of {filtered.length} matches
            </p>
            {!hasSidebar && (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setIsFilterSheetOpen(true)}>
                <Icon name="filter" size={16} />
                Filters{activeCount > 0 && ` (${activeCount})`}
              </button>
            )}
            <div className="sort">
              <span id="sort-label">Sort by</span>
              <Select
                aria-labelledby="sort-label"
                size="sm"
                value={filters.sort}
                options={SORT_OPTIONS}
                onChange={(sort) => handleChange({ sort })}
              />
            </div>
          </div>

          <AppliedFilters filters={filters} onChange={handleChange} />

          {filtered.length === 0 ? (
            <section className="state-panel">
              <h2>No matches with these filters</h2>
              <p>Showing 0 of {matches.length}. Try a lower score or another row.</p>
              <button type="button" className="btn btn--primary" onClick={handleClear}>
                Clear filters
              </button>
            </section>
          ) : (
            <ol className="mcards">
              {visible.map((match) => (
                <MatchCard
                  key={match.exhibitor.id}
                  match={match}
                  isSelected={match.exhibitor.id === selectedId}
                  isSaved={savedSet.has(match.exhibitor.id)}
                  onOpen={handleOpen}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </ol>
          )}

          {filtered.length > shown && (
            <button
              type="button"
              className="btn btn--outline btn--center"
              onClick={() => setShown((count) => count + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
            </button>
          )}
          {filtered.length > 0 && filtered.length <= shown && (
            <p className="results__end">
              That's every match for these filters. Ranked by profile fit only; no paid placement.
            </p>
          )}
        </section>

        <MatchDrawer
          mode={hasInlineDrawer ? 'inline' : 'modal'}
          match={selected}
          totalExhibitors={response.total}
          isSaved={selected ? savedSet.has(selected.exhibitor.id) : false}
          onToggleSave={handleToggleSave}
          onClose={handleCloseDetail}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
        />
      </div>

      {!hasSidebar && (
        <FilterSheet isOpen={isFilterSheetOpen} resultCount={filtered.length} onClose={() => setIsFilterSheetOpen(false)}>
          {filterPanel}
        </FilterSheet>
      )}
    </>
  );
}
