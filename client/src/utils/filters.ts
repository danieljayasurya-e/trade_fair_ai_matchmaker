import type { Match } from '../types';
import type { Hall, Interest } from '../data/taxonomy';

export type SortKey = 'best' | 'hall' | 'name';
export type MinScore = 0 | 60 | 80;

export interface Filters {
  minScore: MinScore;
  halls: Hall[];
  /** Segments; an exhibitor passes if it is listed under any of them. */
  categories: Interest[];
  savedOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  minScore: 0,
  halls: [],
  categories: [],
  savedOnly: false,
  sort: 'best',
};

export const SORT_LABEL: Record<SortKey, string> = {
  best: 'Best match',
  hall: 'Hall & booth',
  name: 'Name A–Z',
};

/** Filters that narrow the list (sort excluded). */
export function countActiveFilters(f: Filters): number {
  return (
    (f.minScore > 0 ? 1 : 0) + f.halls.length + f.categories.length + (f.savedOnly ? 1 : 0)
  );
}

const byBooth = (a: Match, b: Match) =>
  a.exhibitor.hall.localeCompare(b.exhibitor.hall) ||
  a.exhibitor.booth.localeCompare(b.exhibitor.booth, undefined, { numeric: true });

export function applyFilters(matches: readonly Match[], f: Filters, saved: ReadonlySet<string>): Match[] {
  const visible = matches.filter(({ exhibitor, score }) => {
    if (score < f.minScore) return false;
    if (f.halls.length > 0 && !f.halls.includes(exhibitor.hall)) return false;
    if (f.categories.length > 0 && !f.categories.some((category) => exhibitor.tags.includes(category))) return false;
    if (f.savedOnly && !saved.has(exhibitor.id)) return false;
    return true;
  });

  // `matches` arrives ranked by score, so 'best' needs no re-sort.
  if (f.sort === 'name') return [...visible].sort((a, b) => a.exhibitor.name.localeCompare(b.exhibitor.name));
  if (f.sort === 'hall') return [...visible].sort(byBooth);
  return visible;
}
