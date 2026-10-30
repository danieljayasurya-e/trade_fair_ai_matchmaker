import { useMemo } from 'react';
import { HALLS, INTERESTS } from '../data/taxonomy';
import type { Match } from '../types';
import { DEFAULT_FILTERS } from '../utils/filters';
import type { Filters, MinScore } from '../utils/filters';
import { Icon } from './Icon';

interface FilterPanelProps {
  matches: readonly Match[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

const SCORE_OPTIONS: { value: MinScore; label: string }[] = [
  { value: 0, label: 'All' },
  { value: 60, label: '60%+' },
  { value: 80, label: '80%+' },
];

const toggleIn = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function FilterPanel({ matches, filters, onChange, onClear }: FilterPanelProps) {
  // Counts describe the whole top 30, so they don't shift as filters are applied.
  const counts = useMemo(
    () => ({
      halls: HALLS.map((hall) => ({ value: hall, label: `Hall ${hall}`, count: matches.filter((m) => m.exhibitor.hall === hall).length })),
      categories: INTERESTS.map((category) => ({
        value: category,
        label: category,
        count: matches.filter((m) => m.exhibitor.tags.includes(category)).length,
      })).filter((option) => option.count > 0),
    }),
    [matches],
  );

  return (
    <div className="filters">
      <div className="filters__head">
        <h2>
          <Icon name="filter" size={18} />
          Filters
        </h2>
        <button type="button" className="link-btn" onClick={onClear}>
          Clear all
        </button>
      </div>

      <fieldset className="filters__group">
        <legend>Match score</legend>
        <div className="pill-row">
          {SCORE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="pill"
              aria-pressed={filters.minScore === value}
              onClick={() => onChange({ minScore: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filters__group">
        <legend>Hall</legend>
        <CheckList
          options={counts.halls}
          selected={filters.halls}
          onToggle={(hall) => onChange({ halls: toggleIn(filters.halls, hall) })}
        />
      </fieldset>

      <fieldset className="filters__group">
        <legend>Product category</legend>
        <CheckList
          options={counts.categories}
          selected={filters.categories}
          onToggle={(category) => onChange({ categories: toggleIn(filters.categories, category) })}
        />
      </fieldset>

      <label className="switch-row">
        Saved stalls only
        <input
          type="checkbox"
          role="switch"
          checked={filters.savedOnly}
          onChange={(e) => onChange({ savedOnly: e.target.checked })}
        />
      </label>
    </div>
  );
}

interface CheckListProps<T extends string> {
  options: { value: T; label: string; count: number }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}

function CheckList<T extends string>({ options, selected, onToggle }: CheckListProps<T>) {
  return (
    <div className="check-list">
      {options.map(({ value, label, count }) => (
        <label key={value} className="check-row">
          <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
          <span className="check-row__label">{label}</span>
          <span className="check-row__count">{count}</span>
        </label>
      ))}
    </div>
  );
}

interface AppliedFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}

/** Removable chips summarising what is currently filtered. */
export function AppliedFilters({ filters, onChange }: AppliedFiltersProps) {
  const chips: { label: string; remove: () => void }[] = [
    ...(filters.minScore ? [{ label: `${filters.minScore}%+ score`, remove: () => onChange({ minScore: DEFAULT_FILTERS.minScore }) }] : []),
    ...filters.halls.map((hall) => ({ label: `Hall ${hall}`, remove: () => onChange({ halls: toggleIn(filters.halls, hall) }) })),
    ...filters.categories.map((category) => ({
      label: category,
      remove: () => onChange({ categories: toggleIn(filters.categories, category) }),
    })),
    ...(filters.savedOnly ? [{ label: 'Saved only', remove: () => onChange({ savedOnly: false }) }] : []),
  ];

  if (chips.length === 0) return null;
  return (
    <ul className="applied">
      {chips.map(({ label, remove }) => (
        <li key={label}>
          <button type="button" className="applied__chip" aria-label={`Remove filter: ${label}`} onClick={remove}>
            {label}
            <Icon name="close" size={14} strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}
