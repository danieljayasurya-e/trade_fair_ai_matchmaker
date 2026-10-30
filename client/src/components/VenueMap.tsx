import { memo, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  AISLE_YS,
  AMENITIES,
  BOOTH,
  BOOTH_SPOTS,
  CONCOURSE,
  HALL_H,
  HALL_W,
  MAIN_ENTRANCE,
  SPOT_BY_ID,
  TILE,
  VENUE_H,
  VENUE_W,
  hallDoor,
  hallWallPath,
  hallX,
} from '../data/venue';
import type { BoothSpot, Point } from '../data/venue';
import { HALLS } from '../data/taxonomy';
import type { Hall } from '../data/taxonomy';
import type { Match } from '../types';
import { bandFor } from '../utils/score';
import { describeStart, encodeStart } from '../services/wayfinding';
import type { Route, StartPlace } from '../services/wayfinding';
import { Icon } from './Icon';

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface VenueMapProps {
  matches: ReadonlyMap<string, Match>;
  savedIds: ReadonlySet<string>;
  targetId: string | null;
  start: StartPlace;
  route: Route | null;
  onSelect: (exhibitorId: string) => void;
}

const WHOLE: View = { x: -3, y: -3, w: VENUE_W + 6, h: VENUE_H + 6 };
const MIN_W = 36;
/** Booth numbers are printed once a metre is at least this many screen pixels, i.e. readable. */
const LABEL_PX_PER_M = 5.5;

function startPoint(start: StartPlace): Point {
  if (start.kind === 'door') return hallDoor(start.hall);
  if (start.kind === 'stall') return SPOT_BY_ID.get(start.id)?.front ?? MAIN_ENTRANCE;
  return MAIN_ENTRANCE;
}

/** Frame a set of points with some breathing room, never tighter than MIN_W. */
function fit(points: Point[]): View {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 5;
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x0;
  const h = Math.max(...ys) + pad - y0;
  return { x: x0, y: y0, w, h };
}

const toPoints = (points: Point[]) => points.map((p) => `${p.x},${p.y}`).join(' ');

/**
 * The venue as a tiled floor: every booth is a tile, other stalls stay matte and your matches are
 * glazed in their score colour. Drag to pan, buttons to zoom. Pure SVG, so it works offline.
 */
export function VenueMap({ matches, savedIds, targetId, start, route, onSelect }: VenueMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(WHOLE);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const startKey = encodeStart(start);

  // Frame the whole walk plus the target's hall when a route appears (the route's first point is where
  // the visitor stands). With nothing to guide to, show every hall; on a narrow screen, where four halls
  // side by side would be too small to read, open on the hall holding most of the visitor's matches.
  // The page memoises `route` and `matches`.
  const hallFrame = (hall: Hall): View => {
    const x = hallX(hall);
    return fit([{ x, y: 0 }, { x: x + HALL_W, y: CONCOURSE.y + CONCOURSE.h }]);
  };
  const routeFrame = (): View => {
    const spot = targetId ? SPOT_BY_ID.get(targetId) : undefined;
    if (route && spot) {
      const atEntrance = route.points[0] === MAIN_ENTRANCE;
      // Leave room for the "Main entrance" label when the walk starts there.
      const label = atEntrance ? [{ x: MAIN_ENTRANCE.x - 8, y: MAIN_ENTRANCE.y + 5 }, { x: MAIN_ENTRANCE.x + 8, y: MAIN_ENTRANCE.y + 5 }] : [];
      return fit([...route.points, ...label, { x: hallX(spot.exhibitor.hall), y: 0 }, { x: hallX(spot.exhibitor.hall) + HALL_W, y: HALL_H }]);
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width / rect.height > 1.3) return WHOLE;
    const busiest = [...HALLS].sort(
      (a, b) =>
        BOOTH_SPOTS.filter((s) => s.exhibitor.hall === b && matches.has(s.exhibitor.id)).length -
        BOOTH_SPOTS.filter((s) => s.exhibitor.hall === a && matches.has(s.exhibitor.id)).length,
    )[0];
    return busiest ? hallFrame(busiest) : WHOLE;
  };
  /**
   * Match a frame to the map's own shape. When the box is taller than the frame (phones), fill the height
   * and trim the sides, but never cut into the route; there is no floor above the halls to show instead.
   */
  const fillBox = (v: View): View => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return v;
    const aspect = rect.width / rect.height;
    if (v.w / v.h > aspect) {
      const xs = route && targetId ? route.points.map((p) => p.x) : [];
      const keepW = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) + 28 : 0; // room for labels and the zoom buttons
      const w = Math.max(v.h * aspect, keepW);
      const centre = xs.length > 0 ? (Math.max(...xs) + Math.min(...xs)) / 2 : v.x + v.w / 2;
      const h = w / aspect;
      return { x: centre - w / 2, y: v.y - (h - v.h) / 2, w, h };
    }
    const w = v.h * aspect;
    return { ...v, x: v.x - (w - v.w) / 2, w };
  };
  useEffect(() => {
    setView(fillBox(routeFrame()));
    // routeFrame reads only `route`, `targetId` and `matches`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, targetId, matches]);

  const zoom = (factor: number) =>
    setView((v) => {
      const w = Math.min(Math.max(v.w * factor, MIN_W), WHOLE.w * 1.4);
      const h = (v.h * w) / v.w;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });

  const unitsPerPixel = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? Math.max(view.w / rect.width, view.h / rect.height) : 1;
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, view, moved: false };
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const k = unitsPerPixel();
    setView({ ...d.view, x: d.view.x - dx * k, y: d.view.y - dy * k });
  };
  const endDrag = () => {
    suppressClick.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  const select = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect(id);
  };

  const showLabels = 1 / unitsPerPixel() >= LABEL_PX_PER_M;
  const target = targetId ? SPOT_BY_ID.get(targetId) : undefined;
  const here = startPoint(start);

  return (
    <div className="venue-map">
      <svg
        ref={svgRef}
        className="venue-map__svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Venue map, sample layout. Use the stall finder beside the map to pick any stall."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <rect className="venue-map__concourse" x={0} y={CONCOURSE.y} width={VENUE_W} height={CONCOURSE.h} />
        {AMENITIES.map((a) => (
          <g key={`${a.label}-${a.x}`} className="venue-map__amenity">
            <rect x={a.x} y={CONCOURSE.y + 6.4} width={a.w} height={3.2} rx={0.8} />
            <text x={a.x + a.w / 2} y={CONCOURSE.y + 8.7}>
              {a.label}
            </text>
          </g>
        ))}

        {HALLS.map((hall) => {
          const x = hallX(hall);
          const matchCount = BOOTH_SPOTS.filter((s) => s.exhibitor.hall === hall && matches.has(s.exhibitor.id)).length;
          return (
            <g key={hall}>
              <rect className="venue-map__floor" x={x} y={0} width={HALL_W} height={HALL_H} />
              <path className="venue-map__wall" d={hallWallPath(hall)} />
              <text className="venue-map__hall" x={x + 3} y={4.6}>
                Hall {hall}
              </text>
              {matchCount > 0 && (
                <text className="venue-map__count" x={x + HALL_W - 3} y={4.4}>
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </text>
              )}
              {showLabels &&
                AISLE_YS.map((y, i) => (
                  <text key={y} className="venue-map__aisle" x={x + 2} y={y + 0.5}>
                    {i + 1}
                  </text>
                ))}
            </g>
          );
        })}

        {BOOTH_SPOTS.map((spot) => (
          <Tile
            key={spot.exhibitor.id}
            spot={spot}
            match={matches.get(spot.exhibitor.id)}
            isSaved={savedIds.has(spot.exhibitor.id)}
            isTarget={spot.exhibitor.id === targetId}
            showLabel={showLabels}
            onSelect={select}
          />
        ))}

        {route && route.points.length > 1 && (
          <g key={`${targetId}-${startKey}`} className="venue-map__route">
            <polyline className="venue-map__route-casing" points={toPoints(route.points)} />
            <polyline className="venue-map__route-line" points={toPoints(route.points)} pathLength={1} />
          </g>
        )}

        <g className="venue-map__entrance">
          <path d={`M${MAIN_ENTRANCE.x - 5} ${MAIN_ENTRANCE.y} H${MAIN_ENTRANCE.x + 5}`} />
          <text x={MAIN_ENTRANCE.x} y={MAIN_ENTRANCE.y + 4.4}>
            Main entrance
          </text>
        </g>

        {target && (
          <g className="venue-map__callout" transform={`translate(${target.x + BOOTH / 2} ${target.y - 0.6})`}>
            <rect x={-6.5} y={-4.6} width={13} height={3.8} rx={1.9} />
            <text y={-2.05}>{target.exhibitor.booth}</text>
          </g>
        )}

        <g className="venue-map__here" transform={`translate(${here.x} ${here.y})`}>
          <circle r={1.9} className="venue-map__here-halo" />
          <circle r={1.1} className="venue-map__here-dot" />
          <text y={start.kind === 'entrance' ? -2.8 : 3.8}>You are here</text>
        </g>
      </svg>

      <div className="venue-map__controls">
        <button type="button" className="icon-btn icon-btn--map" aria-label="Zoom in" onClick={() => zoom(0.7)}>
          <Icon name="plus" size={18} strokeWidth={2} />
        </button>
        <button type="button" className="icon-btn icon-btn--map" aria-label="Zoom out" onClick={() => zoom(1 / 0.7)}>
          <Icon name="minus" size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--map"
          aria-label={route ? 'Fit the route' : 'Show the whole venue'}
          onClick={() => setView(fillBox(routeFrame()))}
        >
          <Icon name="fit" size={18} strokeWidth={2} />
        </button>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {target ? `Showing the way from ${describeStart(start)} to booth ${target.exhibitor.booth}.` : ''}
      </p>
    </div>
  );
}

interface TileProps {
  spot: BoothSpot;
  match: Match | undefined;
  isSaved: boolean;
  isTarget: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}

/** One booth. Matches are glazed and keyboard reachable; the rest are matte and reached via the stall finder. */
const Tile = memo(function Tile({ spot, match, isSaved, isTarget, showLabel, onSelect }: TileProps) {
  const inset = (BOOTH - TILE) / 2;
  const { exhibitor } = spot;
  const band = match ? bandFor(match.score) : null;
  const number = exhibitor.booth.split('-')[1];

  const handleKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(exhibitor.id);
    }
  };

  return (
    <g
      className={`tile${band ? ` tile--glazed tone-${band.tone}` : ''}${isTarget ? ' is-target' : ''}`}
      transform={`translate(${spot.x + inset} ${spot.y + inset})`}
      onClick={() => onSelect(exhibitor.id)}
      {...(match
        ? {
            tabIndex: 0,
            role: 'button',
            'aria-label': `${exhibitor.name}, booth ${exhibitor.booth}, ${match.score} percent match. Show the way`,
            onKeyDown: handleKey,
          }
        : { 'aria-hidden': true })}
    >
      <title>
        {exhibitor.name} · {exhibitor.booth}
        {match ? ` · ${match.score}%` : ''}
      </title>
      <rect className="tile__body" width={TILE} height={TILE} rx={0.45} />
      {band && <path className="tile__gloss" d={`M0.35 0.35 H${TILE * 0.62} L0.35 ${TILE * 0.62} Z`} />}
      {showLabel && (
        <text className="tile__label" x={TILE / 2} y={TILE / 2 + 0.42}>
          {number}
        </text>
      )}
      {isSaved && <circle className="tile__saved" cx={TILE - 0.6} cy={0.6} r={0.42} />}
    </g>
  );
});
