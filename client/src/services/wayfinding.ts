// Walking directions on the Hall 1 plan (data/venue.ts). Pure functions: a start and a target stall
// go in; a path to draw, a distance and plain-language steps come out.
import { CROSS_AISLES, LONG_AISLES, MAIN_ENTRANCE, SPOT_BY_ID } from '../data/venue';
import type { BoothSpot, Point } from '../data/venue';

/** Where the visitor says they are. */
export type StartPlace = { kind: 'entrance' } | { kind: 'stall'; id: string };

export const ENTRANCE: StartPlace = { kind: 'entrance' };

/** URL-safe encoding, so a start can live in the query string: "entrance" or an exhibitor id. */
export function encodeStart(start: StartPlace): string {
  return start.kind === 'entrance' ? 'entrance' : start.id;
}

export function decodeStart(value: string | null): StartPlace {
  return value && SPOT_BY_ID.has(value) ? { kind: 'stall', id: value } : ENTRANCE;
}

export function describeStart(start: StartPlace): string {
  if (start.kind === 'entrance') return 'Main entrance';
  const spot = SPOT_BY_ID.get(start.id);
  return spot ? `Booth ${spot.exhibitor.booth}` : 'Main entrance';
}

export interface Route {
  points: Point[];
  /** Approximate walking distance in metres along the drawn path. */
  metres: number;
  minutes: number;
  steps: string[];
}

/** Average walking pace through a busy hall, metres per minute. */
const WALK_PACE = 70;

const FRONT_AISLE = CROSS_AISLES[CROSS_AISLES.length - 1];

const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
const key = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Shortest path along the aisle grid, by Dijkstra over junctions plus the two end points. */
function aislePath(from: Point, to: Point): Point[] {
  const lines = [
    ...LONG_AISLES.map((a) => ({ vertical: true, at: a.at, from: a.from, to: a.to })),
    ...CROSS_AISLES.map((a) => ({ vertical: false, at: a.at, from: a.from, to: a.to })),
  ];
  const onLine = (p: Point, l: (typeof lines)[number]) =>
    l.vertical
      ? Math.abs(p.x - l.at) < 0.01 && p.y >= l.from - 0.01 && p.y <= l.to + 0.01
      : Math.abs(p.y - l.at) < 0.01 && p.x >= l.from - 0.01 && p.x <= l.to + 0.01;

  const nodes = new Map<string, Point>();
  const add = (p: Point) => nodes.set(key(p), p);
  add(from);
  add(to);
  for (const v of lines.filter((l) => l.vertical)) {
    for (const h of lines.filter((l) => !l.vertical)) {
      const p = { x: v.at, y: h.at };
      if (onLine(p, v) && onLine(p, h)) add(p);
    }
  }

  const all = [...nodes.values()];
  const neighbours = (p: Point) =>
    lines
      .filter((l) => onLine(p, l))
      .flatMap((l) => {
        const here = l.vertical ? p.y : p.x;
        const along = all.filter((q) => !same(p, q) && onLine(q, l));
        const value = (q: Point) => (l.vertical ? q.y : q.x);
        const before = along.filter((q) => value(q) < here).sort((a, b) => value(b) - value(a))[0];
        const after = along.filter((q) => value(q) > here).sort((a, b) => value(a) - value(b))[0];
        return [before, after].filter((q): q is Point => q !== undefined);
      });

  const dist = new Map<string, number>([[key(from), 0]]);
  const prev = new Map<string, Point>();
  const open = new Set<string>([key(from)]);
  while (open.size > 0) {
    const currentKey = [...open].sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity))[0];
    if (currentKey === undefined || currentKey === key(to)) break;
    open.delete(currentKey);
    const current = nodes.get(currentKey);
    if (!current) break;
    for (const next of neighbours(current)) {
      const total = (dist.get(currentKey) ?? Infinity) + distance(current, next);
      if (total < (dist.get(key(next)) ?? Infinity)) {
        dist.set(key(next), total);
        prev.set(key(next), current);
        open.add(key(next));
      }
    }
  }

  const path: Point[] = [to];
  let cursor = to;
  while (!same(cursor, from)) {
    const before = prev.get(key(cursor));
    if (!before) return [from, to];
    path.unshift(before);
    cursor = before;
  }
  return path;
}

/** Merges consecutive legs that run in the same direction, so each remaining point is a real turn. */
function simplify(points: Point[]): Point[] {
  return points.filter((p, i) => {
    const a = points[i - 1];
    const b = points[i + 1];
    if (!a || !b) return true;
    return !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y));
  });
}

type Heading = 'north' | 'south' | 'east' | 'west';

const headingOf = (a: Point, b: Point): Heading => {
  if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) return b.x > a.x ? 'east' : 'west';
  return b.y > a.y ? 'south' : 'north';
};

const CLOCKWISE: readonly Heading[] = ['north', 'east', 'south', 'west'];
function turnWord(from: Heading, to: Heading): 'left' | 'right' | 'ahead' | 'back' {
  const delta = (CLOCKWISE.indexOf(to) - CLOCKWISE.indexOf(from) + 4) % 4;
  return delta === 0 ? 'ahead' : delta === 1 ? 'right' : delta === 3 ? 'left' : 'back';
}

const legPhrase = (heading: Heading) =>
  heading === 'north' ? 'away from the entrance' : heading === 'south' ? 'towards the entrance' : `along the cross aisle`;

const nearAisle = (p: Point) => LONG_AISLES.find((a) => Math.abs(a.at - p.x) < 0.01)?.beside;

function stepsFor(points: Point[], target: BoothSpot, opening: string): string[] {
  const steps: string[] = [];
  let heading: Heading | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const next = headingOf(a, b);
    const metres = Math.round(distance(a, b));
    if (metres === 0) continue;
    const beside = next === 'east' || next === 'west' ? nearAisle(b) : undefined;
    const destination = beside ? ` to the aisle beside row ${beside}` : '';
    const rest = `about ${metres} m ${legPhrase(next)}${destination}`;
    if (heading === null) {
      steps.push(`${opening}, walk ${rest}.`);
    } else {
      const turn = turnWord(heading, next);
      steps.push(turn === 'ahead' ? `Keep going ${rest}.` : `Turn ${turn} and walk ${rest}.`);
    }
    heading = next;
  }
  const finalTurn = heading ? turnWord(heading, target.facing) : 'ahead';
  const where = finalTurn === 'left' || finalTurn === 'right' ? `on your ${finalTurn}` : 'straight ahead';
  steps.push(`${target.exhibitor.booth} is ${where}.`);
  return steps;
}

function lengthOf(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += distance(a, b);
  }
  return total;
}

export function routeTo(start: StartPlace, targetId: string): Route | null {
  const target = SPOT_BY_ID.get(targetId);
  if (!target) return null;
  if (start.kind === 'stall' && start.id === targetId) {
    return { points: [target.front], metres: 0, minutes: 0, steps: [`You're already at ${target.exhibitor.booth}.`] };
  }

  const origin = start.kind === 'stall' ? SPOT_BY_ID.get(start.id) : undefined;
  // Booths sharing one space have the same front; there is nothing to walk.
  if (origin && same(origin.front, target.front)) {
    return { points: [target.front], metres: 0, minutes: 0, steps: [`${target.exhibitor.booth} shares this space. You're there.`] };
  }

  const frontAisleY = FRONT_AISLE?.at ?? MAIN_ENTRANCE.y;
  const begin: Point = origin ? origin.access : { x: LONG_AISLES[2]?.at ?? MAIN_ENTRANCE.x, y: frontAisleY };
  const lead: Point[] = origin ? [origin.front] : [MAIN_ENTRANCE, { x: begin.x, y: MAIN_ENTRANCE.y }];
  const points = simplify(
    [...lead, ...aislePath(begin, target.access), target.front].filter(
      (p, i, all) => i === 0 || !same(p, all[i - 1] as Point),
    ),
  );
  const metres = Math.round(lengthOf(points));
  const opening = origin ? `From ${origin.exhibitor.booth}` : 'From the main entrance';
  return {
    points,
    metres,
    minutes: Math.max(1, Math.round(metres / WALK_PACE)),
    steps: stepsFor(points, target, opening),
  };
}
