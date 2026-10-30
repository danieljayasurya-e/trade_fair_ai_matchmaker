import { memo, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AMENITIES, BOOTH_SPOTS, MAIN_ENTRANCE, SPOT_BY_ID, VENUE_H, VENUE_W } from '../data/venue';
import type { BoothSpot, Point } from '../data/venue';
import type { Match } from '../types';
import { bandFor } from '../utils/score';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
  /** Screen pixels at the bottom covered by something else (the phone's directions sheet); framing keeps the route above it. */
  insetBottom?: number;
  /** The direction step being pointed at in the panel; its stretch of the route is highlighted. */
  activeStep?: number | null;
  /** Changes each time a step is chosen, to bring that stretch into view. */
  stepFocus?: number;
}

const WHOLE: View = { x: -3, y: -3, w: VENUE_W + 6, h: VENUE_H + 8 };
const MIN_W = 16;
const GROUT = 0.15;
/** Booth numbers are printed once a metre is at least this many screen pixels, i.e. readable. */
const LABEL_PX_PER_M = 9;
/** Largest booth number on screen, in pixels, however far in you zoom. */
const TILE_LABEL_MAX_PX = 15;

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

/** Distance between the first two fingers, or 0 with fewer than two. */
const spreadOf = (points: { x: number; y: number }[]) => {
  const [a, b] = points;
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
};

const toPoints = (points: Point[]) => points.map((p) => `${p.x},${p.y}`).join(' ');

/**
 * The venue as a tiled floor: every booth is a tile, other stalls stay matte and your matches are
 * glazed in their score colour. Drag to pan; wheel, pinch or buttons to zoom. Pure SVG, so it works offline.
 */
export function VenueMap({
  matches,
  savedIds,
  targetId,
  start,
  route,
  onSelect,
  insetBottom = 0,
  activeStep = null,
  stepFocus = 0,
}: VenueMapProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(WHOLE);
  /** Pointers currently down on the map: one pans, two pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; x: number; y: number; spread: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const startKey = encodeStart(start);
  const target = targetId ? SPOT_BY_ID.get(targetId) : undefined;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Frame the whole walk, including the booth label above the stall, when a route appears;
  // otherwise show the whole hall.
  const routeFrame = (): View => {
    if (route && route.points.length > 1) {
      const extra = target
        ? [
            { x: target.rect.x, y: target.rect.y - 3 },
            { x: target.rect.x + target.rect.w, y: target.rect.y + target.rect.h },
          ]
        : [];
      return fit([...route.points, ...extra]);
    }
    return WHOLE;
  };
  /** Fit a frame into the visible part of the map, then extend it to the map's full shape. */
  const fillBox = (v: View): View => {
    if (size.w === 0 || size.h === 0) return v;
    const visibleH = Math.max(size.h - insetBottom, size.h * 0.4);
    const k = Math.max(v.w / size.w, v.h / visibleH);
    const w = size.w * k;
    const h = size.h * k;
    return { x: v.x - (w - v.w) / 2, y: v.y - (visibleH * k - v.h) / 2, w, h };
  };
  useEffect(() => {
    setView(fillBox(routeFrame()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, targetId, matches, size, insetBottom]);

  // A step picked in the panel: bring its stretch of the walk into view.
  useEffect(() => {
    if (!stepFocus || activeStep === null || !route) return;
    // A walking step frames its stretch; the arrival step ("it's on your left") frames the stall.
    const leg = route.stepLegs[activeStep];
    const spot = leg ? null : target;
    const box = leg
      ? fit([...leg])
      : spot
        ? fit([
            { x: spot.rect.x, y: spot.rect.y - 3 },
            { x: spot.rect.x + spot.rect.w, y: spot.rect.y + spot.rect.h },
          ])
        : null;
    if (!box) return;
    const grow = Math.max(0, (MIN_W * 1.6 - box.w) / 2);
    setView(fillBox({ x: box.x - grow, y: box.y, w: box.w + 2 * grow, h: box.h }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepFocus]);

  /** Zoom by a factor about a point on the map. Out stops a little past the whole hall; in, at MIN_W. */
  const zoomAt = (factor: number, cx: number, cy: number) =>
    setView((v) => {
      const widest = fillBox(WHOLE).w * 1.15;
      const w = Math.min(Math.max(v.w * factor, MIN_W), Math.max(widest, v.w));
      const scale = w / v.w;
      return { x: cx - (cx - v.x) * scale, y: cy - (cy - v.y) * scale, w, h: v.h * scale };
    });
  const zoom = (factor: number) => zoomAt(factor, view.x + view.w / 2, view.y + view.h / 2);

  /** Map units per screen pixel; text and lines are sized with it so they read the same at every zoom. */
  const k = size.w > 0 ? Math.max(view.w / size.w, view.h / size.h) : WHOLE.w / 400;
  const px = (pixels: number) => pixels * k;

  /** A screen position inside the map, as map units. */
  const toMap = (clientX: number, clientY: number, v: View) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    const scale = Math.max(v.w / rect.width, v.h / rect.height);
    return {
      x: v.x + v.w / 2 + (clientX - rect.left - rect.width / 2) * scale,
      y: v.y + v.h / 2 + (clientY - rect.top - rect.height / 2) * scale,
    };
  };

  // Mouse wheel and trackpad zoom about the pointer. Added by hand: React's wheel handler is passive.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const at = toMap(event.clientX, event.clientY, viewRef.current);
      zoomAt(Math.exp(event.deltaY * 0.0015), at.x, at.y);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, insetBottom]);

  const beginGesture = () => {
    const points = [...pointers.current.values()];
    if (points.length === 0) {
      gesture.current = null;
      return;
    }
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const spread = spreadOf(points);
    gesture.current = { view, x, y, spread, moved: gesture.current?.moved ?? false };
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    beginGesture();
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;
    const points = [...pointers.current.values()];
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    if (!g.moved && Math.hypot(x - g.x, y - g.y) < 4 && points.length < 2) return;
    if (!g.moved) {
      g.moved = true;
      // Capture only once it's a drag, so a plain tap still reaches the tile under the finger.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const rect = svgRef.current?.getBoundingClientRect();
    const scaleNow = rect ? Math.max(g.view.w / rect.width, g.view.h / rect.height) : 1;
    let next: View = { ...g.view, x: g.view.x - (x - g.x) * scaleNow, y: g.view.y - (y - g.y) * scaleNow };
    if (points.length > 1 && g.spread > 0) {
      const spread = spreadOf(points);
      const widest = fillBox(WHOLE).w * 1.15;
      const w = Math.min(Math.max((g.view.w * g.spread) / spread, MIN_W), Math.max(widest, g.view.w));
      const scale = w / next.w;
      const at = toMap(x, y, next);
      next = { x: at.x - (at.x - next.x) * scale, y: at.y - (at.y - next.y) * scale, w, h: next.h * scale };
    }
    setView(next);
  };
  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size === 0) {
      suppressClick.current = gesture.current?.moved ?? false;
      gesture.current = null;
    } else {
      // A finger lifted mid-pinch: carry on panning with the one left.
      beginGesture();
    }
  };

  const select = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect(id);
  };

  const showLabels = 1 / k >= LABEL_PX_PER_M;
  const here = startPoint(start);

  return (
    <div className="venue-map">
      <svg
        ref={svgRef}
        className="venue-map__svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Hall 1 floor plan. Drag to move, scroll or pinch to zoom. Use the stall finder to pick any stall."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <pattern id="venue-hatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.2" className="venue-map__hatch" />
          </pattern>
        </defs>

        <rect className="venue-map__floor" x={0} y={0} width={VENUE_W} height={VENUE_H} />
        <text className="venue-map__hall" x={VENUE_W / 2} y={18} textAnchor="middle" style={{ fontSize: Math.min(3.4, px(16)) }}>
          Hall 1
        </text>

        {/* Toilets, lounges and the like: part of the floor, not places you get directions to. */}
        {AMENITIES.map((a) => {
          const fontSize = Math.min(px(11), (a.w / a.label.length) * 1.7, a.h * 0.45);
          return (
            <g key={`${a.label}-${a.x}`} className="venue-map__space" aria-hidden="true">
              <rect x={a.x + GROUT} y={a.y + GROUT} width={a.w - 2 * GROUT} height={a.h - 2 * GROUT} rx={0.3} />
              {fontSize >= px(8) && (
                <text x={a.x + a.w / 2} y={a.y + a.h / 2} style={{ fontSize }}>
                  {a.label}
                </text>
              )}
            </g>
          );
        })}

        <path
          className="venue-map__wall"
          d={`M${MAIN_ENTRANCE.x - 4} ${VENUE_H} H0 V0 H${VENUE_W} V${VENUE_H} H${MAIN_ENTRANCE.x + 4}`}
        />

        {BOOTH_SPOTS.map((spot) => (
          <Tile
            key={spot.exhibitor.id}
            spot={spot}
            match={matches.get(spot.exhibitor.id)}
            isSaved={savedIds.has(spot.exhibitor.id)}
            isTarget={spot.exhibitor.id === targetId}
            showLabel={showLabels}
            labelMax={px(TILE_LABEL_MAX_PX)}
            onSelect={select}
          />
        ))}

        {route && route.points.length > 1 && (
          <RouteLayer
            key={`${targetId}-${startKey}`}
            route={route}
            unitsPerPixel={k}
            activeStep={activeStep}
            animate={!reduceMotion}
          />
        )}

        <g className="venue-map__entrance">
          <path d={`M${MAIN_ENTRANCE.x - 4} ${MAIN_ENTRANCE.y} H${MAIN_ENTRANCE.x + 4}`} />
          <text x={MAIN_ENTRANCE.x} y={MAIN_ENTRANCE.y + px(16)} style={{ fontSize: px(12) }}>
            Main entrance
          </text>
        </g>

        {target && (
          // Drawn in screen pixels, so the label is the same size however far in you are.
          <g
            className="venue-map__callout"
            transform={`translate(${target.rect.x + target.rect.w / 2} ${target.rect.y - px(3)}) scale(${k})`}
          >
            <rect x={-28} y={-28} width={56} height={22} rx={11} />
            <path d="M-5 -6.5 L0 -1 L5 -6.5 Z" />
            <text y={-17}>{target.exhibitor.booth}</text>
          </g>
        )}

        <g className="venue-map__here" transform={`translate(${here.x} ${here.y}) scale(${k})`}>
          <circle r={13} className="venue-map__here-halo" />
          <circle r={6.5} className="venue-map__here-dot" />
          <text y={start.kind === 'entrance' ? -22 : 26}>You are here</text>
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

/** Gap between direction arrows along the route, in screen pixels. */
const ARROW_GAP_PX = 46;

interface RouteLayerProps {
  route: Route;
  unitsPerPixel: number;
  activeStep: number | null;
  animate: boolean;
}


/**
 * The walk: a blue line with arrows pointing the way and a dot that travels from you to the stall.
 * The step pointed at in the panel has its stretch highlighted. Arrows are drawn in screen pixels.
 */
function RouteLayer({ route, unitsPerPixel: k, activeStep, animate }: RouteLayerProps) {
  const points = route.points;

  // Arrows at a steady on-screen spacing along the whole path.
  const gap = ARROW_GAP_PX * k;
  const arrows: { x: number; y: number; angle: number }[] = [];
  let travelled = 0;
  let nextAt = gap / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const isLast = i === points.length - 1;
    for (; nextAt < travelled + length; nextAt += gap) {
      const t = (nextAt - travelled) / length;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const nearEnd = isLast && Math.hypot(b.x - x, b.y - y) < 10 * k;
      if (!nearEnd) arrows.push({ x, y, angle });
    }
    travelled += length;
  }

  const d = `M${points.map((p) => `${p.x} ${p.y}`).join(' L')}`;
  const seconds = Math.min(4.5, Math.max(1.8, route.metres / 16));
  const active = activeStep !== null ? route.stepLegs[activeStep] : null;

  return (
    <g className={`venue-map__route${active ? ' has-active' : ''}`}>
      <polyline className="venue-map__route-casing" points={toPoints(points)} />
      <polyline className="venue-map__route-line" points={toPoints(points)} />
      {active && <polyline className="venue-map__route-active" points={toPoints([...active])} />}

      {arrows.map((arrow, i) => (
        <path
          key={i}
          className="venue-map__route-arrow"
          d="M-3 -4.5 L2.5 0 L-3 4.5"
          transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle}) scale(${k})`}
        />
      ))}

      {animate && (
        // A dot walking the route from you to the stall, over and over: the direction at a glance.
        <circle className="venue-map__route-walker" r={5.5 * k}>
          <animateMotion dur={`${seconds}s`} repeatCount="indefinite" path={d} calcMode="linear" />
          <animate
            attributeName="opacity"
            dur={`${seconds}s`}
            repeatCount="indefinite"
            values="0;1;1;0"
            keyTimes="0;0.08;0.88;1"
          />
        </circle>
      )}

    </g>
  );
}

interface TileProps {
  spot: BoothSpot;
  match: Match | undefined;
  isSaved: boolean;
  isTarget: boolean;
  showLabel: boolean;
  /** Largest label size in map units at the current zoom. */
  labelMax: number;
  onSelect: (id: string) => void;
}

/** One booth. Matches are coloured and keyboard reachable; the rest are matte and reached via the stall finder. */
const Tile = memo(function Tile({ spot, match, isSaved, isTarget, showLabel, labelMax, onSelect }: TileProps) {
  const { exhibitor, rect } = spot;
  const band = match ? bandFor(match.score) : null;
  const w = rect.w - 2 * GROUT;
  const h = rect.h - 2 * GROUT;
  const fontSize = Math.min(labelMax, (w / exhibitor.booth.length) * 1.6, h * 0.6);

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
