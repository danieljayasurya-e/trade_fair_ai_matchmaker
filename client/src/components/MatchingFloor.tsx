import { memo, useId } from 'react';
import type { CSSProperties } from 'react';
import { BOOTH_SPOTS, VENUE_H, VENUE_W } from '../data/venue';
import type { Match } from '../types';
import { bandFor } from '../utils/score';

interface MatchingFloorProps {
  /** How far matching has got, 0–1. The scan line sweeps the hall from the back wall to the entrance. */
  progress: number;
  /** Set once matching is done: these stalls light up in their score colour, best first. */
  matches: ReadonlyMap<string, Match> | null;
}

const GROUT = 0.15;
// The toilets take up the back of the hall; the picture starts at the stalls.
const TOP = 25;
const HALL_H = VENUE_H - TOP;
/** Ranks that get a ring and their number once revealed. */
const PODIUM = 3;
/** Matches start lighting up once the scan line has reached the entrance and faded. */
const REVEAL_START_MS = 320;
const REVEAL_STEP_MS = 45;

/**
 * The matching screen's picture: every stall in Hall 1. While the engine runs, a scan line sweeps
 * the hall and stalls it has passed are marked as compared. When it finishes, the hall dims and
 * your top matches light up in rank order. Decorative; the progress card next to it carries the
 * same information as text.
 */
export const MatchingFloor = memo(function MatchingFloor({ progress, matches }: MatchingFloorProps) {
  const glowId = `${useId()}-glow`;
  const isDone = matches !== null;
  const beamY = TOP + Math.min(1, Math.max(0, isDone ? 1 : progress)) * HALL_H;

  return (
    <svg
      className={`matching-floor${isDone ? ' matching-floor--done' : ''}`}
      viewBox={`-1 ${TOP - 1} ${VENUE_W + 2} ${HALL_H + 2}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={glowId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <rect className="matching-floor__hall" x={0} y={TOP} width={VENUE_W} height={HALL_H} />

      {BOOTH_SPOTS.map((spot) => {
        const match = matches?.get(spot.exhibitor.id);
        const { x, y, w, h } = spot.rect;
        const state = isDone ? (match ? 'lit' : 'rest') : y + h / 2 < beamY ? 'read' : 'waiting';
        const tileW = w - 2 * GROUT;
        const tileH = h - 2 * GROUT;
        const isPodium = match !== undefined && match.rank <= PODIUM;
        return (
          <g
            key={spot.exhibitor.id}
            className={`floor-tile floor-tile--${state}${match ? ` tone-${bandFor(match.score).tone}` : ''}`}
            transform={`translate(${x + GROUT} ${y + GROUT})`}
            // Best match lights first, so the eye lands on #1.
            style={
              match
                ? ({ '--reveal-delay': `${REVEAL_START_MS + (match.rank - 1) * REVEAL_STEP_MS}ms` } as CSSProperties)
                : undefined
            }
          >
            <rect className="floor-tile__body" width={tileW} height={tileH} rx={0.3} />
            {isPodium && (
              <>
                <rect className="floor-tile__ring" width={tileW} height={tileH} rx={0.3} />
                <text
                  className="floor-tile__rank"
                  x={tileW / 2}
                  y={tileH / 2}
                  fontSize={Math.min(tileW, tileH) * 0.62}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {match.rank}
                </text>
              </>
            )}
          </g>
        );
      })}

      <path className="matching-floor__wall" d={`M0 ${TOP} H${VENUE_W} V${VENUE_H} H0 Z`} />

      <g className="scan-beam" style={{ transform: `translateY(${beamY}px)` }}>
        <rect className="scan-beam__trail" x={0} y={-9} width={VENUE_W} height={9} fill={`url(#${glowId})`} />
        <rect className="scan-beam__line" x={-0.6} y={-0.2} width={VENUE_W + 1.2} height={0.4} rx={0.2} />
      </g>
    </svg>
  );
});
