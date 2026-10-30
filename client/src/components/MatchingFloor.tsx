import { memo } from 'react';
import type { CSSProperties } from 'react';
import { BOOTH, BOOTH_SPOTS, HALL_H, HALL_W, TILE, VENUE_W, hallWallPath, hallX } from '../data/venue';
import { HALLS } from '../data/taxonomy';
import type { Match } from '../types';
import { bandFor } from '../utils/score';

interface MatchingFloorProps {
  /** How many stalls have been compared so far (0–200); tiles light up in floor order. */
  scanned: number;
  /** Set once matching is done: these tiles glaze in their score colour, best first. */
  matches: ReadonlyMap<string, Match> | null;
  /** Phones: halls in a 2 × 2 grid instead of one row, so the tiles stay big enough to see. */
  compact?: boolean;
}

const INSET = (BOOTH - TILE) / 2;
const GAP = 6;

/**
 * The matching screen's picture: every stall on the floor plan. While the engine runs, tiles are
 * marked as compared; when it finishes, your top matches glaze in rank order. Decorative; the
 * progress card next to it carries the same information as text.
 */
export const MatchingFloor = memo(function MatchingFloor({ scanned, matches, compact = false }: MatchingFloorProps) {
  const width = compact ? 2 * HALL_W + GAP : VENUE_W;
  const height = compact ? 2 * HALL_H + GAP : HALL_H;
  return (
    <svg className="matching-floor" viewBox={`-2 -2 ${width + 4} ${height + 4}`} aria-hidden="true" focusable="false">
      {HALLS.map((hall, i) => {
        // Shift each hall from its place in the row to its cell in the grid.
        const dx = compact ? (i % 2) * (HALL_W + GAP) - hallX(hall) : 0;
        const dy = compact ? Math.floor(i / 2) * (HALL_H + GAP) : 0;
        return (
          <g key={hall} transform={`translate(${dx} ${dy})`}>
            <rect className="matching-floor__hall" x={hallX(hall)} y={0} width={HALL_W} height={HALL_H} />
            <path className="matching-floor__wall" d={hallWallPath(hall)} />
            <text className="matching-floor__label" x={hallX(hall) + 3} y={4.6}>
              Hall {hall}
            </text>
            {BOOTH_SPOTS.map((spot, index) => {
              if (spot.exhibitor.hall !== hall) return null;
              const match = matches?.get(spot.exhibitor.id);
              const state = matches ? (match ? 'glazed' : 'done') : index < scanned ? 'scanned' : 'waiting';
              const band = match ? bandFor(match.score) : null;
              return (
                <g
                  key={spot.exhibitor.id}
                  className={`floor-tile floor-tile--${state}${band ? ` tone-${band.tone}` : ''}`}
                  transform={`translate(${spot.x + INSET} ${spot.y + INSET})`}
                  // Best match glazes first, so the eye lands on #1.
                  style={match ? ({ '--glaze-delay': `${match.rank * 35}ms` } as CSSProperties) : undefined}
                >
                  <rect width={TILE} height={TILE} rx={0.45} />
                  {match && <path className="floor-tile__gloss" d={`M0.35 0.35 H${TILE * 0.62} L0.35 ${TILE * 0.62} Z`} />}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
});
