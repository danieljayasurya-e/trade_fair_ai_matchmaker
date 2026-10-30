import { memo, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AMENITIES, BOOTH_SPOTS, MAIN_ENTRANCE, SPOT_BY_ID, VENUE_H, VENUE_W } from '../data/venue';
import type { BoothSpot, Point } from '../data/venue';
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

const WHOLE: View = { x: -3, y: -3, w: VENUE_W + 6, h: VENUE_H + 8 };
const MIN_W = 16;
const GROUT = 0.15;
/** Booth numbers are printed once a metre is at least this many screen pixels, i.e. readable. */
const LABEL_PX_PER_M = 9;

function startPoint(start: StartPlace): Point {
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

  // Frame the whole walk when a route appears; otherwise show the whole hall.
  const routeFrame = (): View => {
    if (route && route.points.length > 1) return fit(route.points);
    return WHOLE;
  };
  /** Match a frame to the map's own shape, so the whole frame stays visible. */
  const fillBox = (v: View): View => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return v;
    const aspect = rect.width / rect.height;
    if (v.w / v.h > aspect) {
      const h = v.w / aspect;
      return { ...v, y: v.y - (h - v.h) / 2, h };
    }
    const w = v.h * aspect;
    return { ...v, x: v.x - (w - v.w) / 2, w };
  };
  useEffect(() => {
    setView(fillBox(routeFrame()));
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
        aria-label="Hall 1 floor plan. Use the stall finder beside the map to pick any stall."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <rect className="venue-map__floor" x={0} y={0} width={VENUE_W} height={VENUE_H} />
        <path
          className="venue-map__wall"
          d={`M${MAIN_ENTRANCE.x - 4} ${VENUE_H} H0 V0 H${VENUE_W} V${VENUE_H} H${MAIN_ENTRANCE.x + 4}`}
        />
        <text className="venue-map__hall" x={VENUE_W / 2} y={18} textAnchor="middle">
          Hall 1
        </text>
        {AMENITIES.map((a) => (
          <g key={`${a.label}-${a.x}`} className="venue-map__amenity">
            <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={0.3} />
            <text x={a.x + a.w / 2} y={a.y + a.h / 2 + 0.4} style={{ fontSize: Math.min(1.5, (a.w / a.label.length) * 1.6) }}>
              {a.label}
            </text>
          </g>
        ))}

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
          <g className="venue-map__callout" transform={`translate(${target.rect.x + target.rect.w / 2} ${target.rect.y - 0.4})`}>
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
          aria-label={route ? 'Fit the route' : 'Show the whole hall'}
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

/** One booth. Matches are coloured and keyboard reachable; the rest are matte and reached via the stall finder. */
const Tile = memo(function Tile({ spot, match, isSaved, isTarget, showLabel, onSelect }: TileProps) {
  const { exhibitor, rect } = spot;
  const band = match ? bandFor(match.score) : null;
  const w = rect.w - 2 * GROUT;
  const h = rect.h - 2 * GROUT;
  const fontSize = Math.min(1.1, (w / exhibitor.booth.length) * 1.6, h * 0.6);

  const handleKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(exhibitor.id);
    }
  };

  return (
    <g
      className={`tile${band ? ` tile--glazed tone-${band.tone}` : ''}${isTarget ? ' is-target' : ''}`}
      transform={`translate(${rect.x + GROUT} ${rect.y + GROUT})`}
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
      <rect className="tile__body" width={w} height={h} rx={0.25} />
      {showLabel && (
        <text className="tile__label" x={w / 2} y={h / 2 + fontSize * 0.35} style={{ fontSize }}>
          {exhibitor.booth}
        </text>
      )}
      {isSaved && <circle className="tile__saved" cx={w - 0.5} cy={0.5} r={0.35} />}
    </g>
  );
});
