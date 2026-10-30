import { memo } from 'react';
import type { CSSProperties } from 'react';
import { BOOTH_SPOTS, VENUE_H, VENUE_W } from '../data/venue';
import type { Match } from '../types';
import { bandFor } from '../utils/score';

interface MatchingFloorProps {
  /** How many stalls have been compared so far; tiles light up in floor order. */
  scanned: number;
  /** Set once matching is done: these tiles glaze in their score colour, best first. */
  matches: ReadonlyMap<string, Match> | null;
}

const GROUT = 0.15;
// The toilets take up the back of the hall; the picture starts at the stalls.
const TOP = 25;

/**
 * The matching screen's picture: every stall on Hall 1. While the engine runs, tiles are marked as
 * compared; when it finishes, your top matches glaze in rank order. Decorative; the progress card
 * next to it carries the same information as text.
 */
export const MatchingFloor = memo(function MatchingFloor({ scanned, matches }: MatchingFloorProps) {
  return (
    <svg
      className="matching-floor"
      viewBox={`-1 ${TOP - 1} ${VENUE_W + 2} ${VENUE_H - TOP + 2}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect className="matching-floor__hall" x={0} y={TOP} width={VENUE_W} height={VENUE_H - TOP} />
      <path className="matching-floor__wall" d={`M0 ${TOP} H${VENUE_W} V${VENUE_H} H0 Z`} />
      {BOOTH_SPOTS.map((spot, index) => {
        const match = matches?.get(spot.exhibitor.id);
        const state = matches ? (match ? 'glazed' : 'done') : index < scanned ? 'scanned' : 'waiting';
        const band = match ? bandFor(match.score) : null;
        return (
          <g
            key={spot.exhibitor.id}
            className={`floor-tile floor-tile--${state}${band ? ` tone-${band.tone}` : ''}`}
            transform={`translate(${spot.rect.x + GROUT} ${spot.rect.y + GROUT})`}
            // Best match glazes first, so the eye lands on #1.
            style={match ? ({ '--glaze-delay': `${match.rank * 35}ms` } as CSSProperties) : undefined}
          >
            <rect width={spot.rect.w - 2 * GROUT} height={spot.rect.h - 2 * GROUT} rx={0.3} />
          </g>
        );
      })}
    </svg>
  );
});
