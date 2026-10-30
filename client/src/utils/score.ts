export type ScoreTone = 'strong' | 'good' | 'partial';

/** Band names shown next to every score; thresholds come from the design. */
export function bandFor(score: number): { label: string; tone: ScoreTone } {
  if (score >= 80) return { label: 'Excellent fit', tone: 'strong' };
  if (score >= 60) return { label: 'Good fit', tone: 'good' };
  return { label: 'Partial fit', tone: 'partial' };
}

export const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
