// Walking directions on the sample venue layout (data/venue.ts). Pure functions: a start and a
// target stall go in; a path to draw, a distance and plain-language steps come out.
import { CONCOURSE, MAIN_ENTRANCE, SPOT_BY_ID, hallCentreX, hallDoor } from '../data/venue';
import type { BoothSpot, Point } from '../data/venue';
import { HALLS } from '../data/taxonomy';
import type { Hall } from '../data/taxonomy';

/** Where the visitor says they are. */
export type StartPlace = { kind: 'entrance' } | { kind: 'door'; hall: Hall } | { kind: 'stall'; id: string };

export const ENTRANCE: StartPlace = { kind: 'entrance' };

/** URL-safe encoding, so a start can live in the query string: "entrance", "door-2" or an exhibitor id. */
export function encodeStart(start: StartPlace): string {
  if (start.kind === 'entrance') return 'entrance';
  if (start.kind === 'door') return `door-${start.hall}`;
  return start.id;
}

export function decodeStart(value: string | null): StartPlace {
  if (!value || value === 'entrance') return ENTRANCE;
  const door = /^door-(\d)$/.exec(value);
  const hall = HALLS.find((h) => h === door?.[1]);
  if (hall) return { kind: 'door', hall };
  return SPOT_BY_ID.has(value) ? { kind: 'stall', id: value } : ENTRANCE;
}

export function describeStart(start: StartPlace): string {
  if (start.kind === 'entrance') return 'Main entrance';
  if (start.kind === 'door') return `Hall ${start.hall} door`;
  const spot = SPOT_BY_ID.get(start.id);
  return spot ? `Booth ${spot.exhibitor.booth}` : 'Main entrance';
}

export interface Route {
  points: Point[];
  /** Walking distance in metres along the drawn path. */
  metres: number;
  minutes: number;
  steps: string[];
}

/** Average walking pace through a busy hall, metres per minute. */
const WALK_PACE = 70;

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

/** From a booth front, out to its aisle and along to the centre aisle. */
const toCentreAisle = (spot: BoothSpot): Point[] => [
  spot.front,
  { x: spot.front.x, y: spot.aisleY },
  { x: hallCentreX(spot.exhibitor.hall), y: spot.aisleY },
];

/** From anywhere a visitor can start, to the concourse walking line. */
function toConcourse(start: StartPlace): Point[] {
  if (start.kind === 'entrance') return [MAIN_ENTRANCE, { x: MAIN_ENTRANCE.x, y: CONCOURSE.walkY }];
  if (start.kind === 'door') {
    const door = hallDoor(start.hall);
    return [door, { x: door.x, y: CONCOURSE.walkY }];
  }
  const spot = SPOT_BY_ID.get(start.id);
  if (!spot) return toConcourse(ENTRANCE);
  const door = hallDoor(spot.exhibitor.hall);
  return [...toCentreAisle(spot), door, { x: door.x, y: CONCOURSE.walkY }];
}

const startHall = (start: StartPlace): Hall | null =>
  start.kind === 'door' ? start.hall : start.kind === 'stall' ? (SPOT_BY_ID.get(start.id)?.exhibitor.hall ?? null) : null;

function pathTo(start: StartPlace, target: BoothSpot): Point[] {
  const hall = target.exhibitor.hall;
  const centreX = hallCentreX(hall);
  const arrive: Point[] = [{ x: centreX, y: target.aisleY }, { x: target.front.x, y: target.aisleY }, target.front];

  if (startHall(start) === hall) {
    if (start.kind === 'door') return [hallDoor(hall), ...arrive];
    const from = SPOT_BY_ID.get(start.kind === 'stall' ? start.id : '');
    if (from && from.row === target.row) {
      return [from.front, { x: from.front.x, y: from.aisleY }, { x: target.front.x, y: target.aisleY }, target.front];
    }
    if (from) return [...toCentreAisle(from), ...arrive];
  }
  const door = hallDoor(hall);
  return [...toConcourse(start), { x: door.x, y: CONCOURSE.walkY }, door, ...arrive];
}

function lengthOf(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += Math.abs(b.x - a.x) + Math.abs(b.y - a.y); // every leg is straight along an aisle
  }
  return total;
}

/** "Turn left into aisle 3. B-123 is the second stall on your right." Facing tells us which way left is. */
function arriveStep(target: BoothSpot, facing: 'in' | 'out'): string {
  const aisle = target.row + 1;
  const turn = (target.side === 'left') === (facing === 'in') ? 'left' : 'right';
  // Booths sit on the far side of their aisle, so heading west they are on the right, east on the left.
  const side = target.side === 'left' ? 'right' : 'left';
  return `Turn ${turn} into aisle ${aisle}. ${target.exhibitor.booth} is the ${ordinal(target.fromCentre)} stall on your ${side}.`;
}

function concourseStep(fromX: number, hall: Hall, facingNorth: boolean, opening: string): string {
  const door = hallDoor(hall);
  const goingEast = door.x > fromX;
  // Facing north (coming in from the entrance) east is on the right; facing south (leaving a hall) it is on the left.
  const turn = goingEast === facingNorth ? 'right' : 'left';
  const passed = HALLS.filter((h) => {
    const x = hallDoor(h).x;
    return goingEast ? x > fromX && x <= door.x : x < fromX && x >= door.x;
  }).length;
  return `${opening} turn ${turn} along the concourse. Hall ${hall} is the ${ordinal(passed)} hall door.`;
}

function walkUpStep(hall: Hall, target: BoothSpot, throughDoor: boolean): string {
  const aisle = target.row + 1;
  const lead = throughDoor ? `Go through the Hall ${hall} door` : `From the Hall ${hall} door`;
  return aisle === 1
    ? `${lead}; aisle 1 is straight ahead.`
    : `${lead} and walk up the centre aisle to aisle ${aisle}.`;
}

function stepsTo(start: StartPlace, target: BoothSpot): string[] {
  const hall = target.exhibitor.hall;
  const steps: string[] = [];

  if (startHall(start) === hall && start.kind === 'stall') {
    const from = SPOT_BY_ID.get(start.id);
    if (from && from.row === target.row) {
      const between = Math.abs(from.col - target.col);
      const across = from.side !== target.side ? ', across the centre aisle' : '';
      steps.push(
        `Step back into aisle ${from.row + 1}. ${target.exhibitor.booth} is on the same side, ${between} ${between === 1 ? 'stall' : 'stalls'} along${across}.`,
      );
      return steps;
    }
    if (from) {
      const goingIn = target.row > from.row;
      steps.push(
        `From ${from.exhibitor.booth}, step into aisle ${from.row + 1} and walk to the centre aisle.`,
        `Walk ${goingIn ? 'away from' : 'towards'} the hall door to aisle ${target.row + 1}.`,
        arriveStep(target, goingIn ? 'in' : 'out'),
      );
      return steps;
    }
  }

  if (start.kind === 'door' && start.hall === hall) {
    steps.push(walkUpStep(hall, target, false));
  } else {
    if (start.kind === 'entrance') {
      steps.push(concourseStep(MAIN_ENTRANCE.x, hall, true, 'Go in through the main entrance and'));
    } else {
      const fromHall = startHall(start);
      if (fromHall) {
        const opening =
          start.kind === 'stall'
            ? `From ${SPOT_BY_ID.get(start.id)?.exhibitor.booth ?? 'your booth'}, walk back down the centre aisle and out of Hall ${fromHall}, then`
            : `Leave Hall ${fromHall} by its door and`;
        steps.push(concourseStep(hallDoor(fromHall).x, hall, false, opening));
      }
    }
    steps.push(walkUpStep(hall, target, true));
  }
  steps.push(arriveStep(target, 'in'));
  return steps;
}

export function routeTo(start: StartPlace, targetId: string): Route | null {
  const target = SPOT_BY_ID.get(targetId);
  if (!target) return null;
  if (start.kind === 'stall' && start.id === targetId) {
    return { points: [target.front], metres: 0, minutes: 0, steps: [`You're already at ${target.exhibitor.booth}.`] };
  }
  const points = pathTo(start, target).filter(
    (p, i, all) => i === 0 || p.x !== all[i - 1]?.x || p.y !== all[i - 1]?.y,
  );
  const metres = Math.round(lengthOf(points));
  return { points, metres, minutes: Math.max(1, Math.round(metres / WALK_PACE)), steps: stepsTo(start, target) };
}

