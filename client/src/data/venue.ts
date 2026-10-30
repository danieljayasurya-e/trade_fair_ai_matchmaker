// SAMPLE venue layout for the map. There is no official Indian Ceramics Asia floor plan in the data
// (the company list says hall and booth numbers are test values), so this layout is generated from
// those numbers: four halls side by side on one concourse, each with 50 booths in 5 rows of 10.
// Units are metres, so route lengths read as walking distance.
// TODO: replace with the organiser's floor plan when it is available.
import { EXHIBITORS } from './exhibitors';
import { HALLS } from './taxonomy';
import type { Hall } from './taxonomy';
import type { Exhibitor } from '../types';

export interface Point {
  x: number;
  y: number;
}

/** Booth pitch. Each booth is a 4 m square; the drawn tile is a little smaller, the rest is grout. */
export const BOOTH = 4;
export const TILE = 3.4;
const BOOTHS_PER_SIDE = 5;
const ROWS = 5;
const SIDE_MARGIN = 4;
const TOP_MARGIN = 6;
const CENTRE_AISLE = 4;
const ROW_PITCH = BOOTH * 2; // a row of booths plus the aisle in front of it
const HALL_GAP = 6;

export const HALL_W = SIDE_MARGIN * 2 + BOOTHS_PER_SIDE * 2 * BOOTH + CENTRE_AISLE; // 52
export const HALL_H = TOP_MARGIN + ROWS * ROW_PITCH + 2; // 48
export const DOOR_W = 6;

/** The concourse runs under all four halls; people walk along its centre line. */
export const CONCOURSE = { y: HALL_H, h: 10, walkY: HALL_H + 4 };
export const VENUE_W = HALLS.length * HALL_W + (HALLS.length - 1) * HALL_GAP; // 226
export const VENUE_H = CONCOURSE.y + CONCOURSE.h + 6;
export const MAIN_ENTRANCE: Point = { x: VENUE_W / 2, y: CONCOURSE.y + CONCOURSE.h };

export const hallIndex = (hall: Hall) => HALLS.indexOf(hall);
export const hallX = (hall: Hall) => hallIndex(hall) * (HALL_W + HALL_GAP);
/** x of the hall's centre aisle and door. */
export const hallCentreX = (hall: Hall) => hallX(hall) + HALL_W / 2;
export const hallDoor = (hall: Hall): Point => ({ x: hallCentreX(hall), y: HALL_H });

/** Hall walls as an SVG path, with a gap for the door in the middle of the concourse side. */
export function hallWallPath(hall: Hall): string {
  const x = hallX(hall);
  const doorL = x + HALL_W / 2 - DOOR_W / 2;
  const doorR = x + HALL_W / 2 + DOOR_W / 2;
  return `M${doorL} ${HALL_H} H${x} V0 H${x + HALL_W} V${HALL_H} H${doorR}`;
}

export interface BoothSpot {
  exhibitor: Exhibitor;
  /** Top-left of the booth's 4 m cell. */
  x: number;
  y: number;
  /** Row from the door, 0 = nearest. Aisle numbers are row + 1. */
  row: number;
  /** 0–9 left to right as seen walking in from the door. */
  col: number;
  /** Booths count outward from the centre aisle: 1 = the one beside it. */
  fromCentre: number;
  side: 'left' | 'right';
  /** Centre of the booth's front edge, where you stand to visit it. */
  front: Point;
  /** y of the aisle in front of the booth. */
  aisleY: number;
}

const rowTop = (row: number) => HALL_H - 2 - 2 * BOOTH - row * ROW_PITCH;

function spotFor(exhibitor: Exhibitor): BoothSpot {
  const n = Number(exhibitor.booth.split('-')[1]) - 101; // booths run 101–150 in every hall
  const row = Math.floor(n / 10);
  const col = n % 10;
  const side = col < BOOTHS_PER_SIDE ? 'left' : 'right';
  const x =
    hallX(exhibitor.hall) +
    SIDE_MARGIN +
    col * BOOTH +
    (side === 'right' ? CENTRE_AISLE : 0);
  const y = rowTop(row);
  return {
    exhibitor,
    x,
    y,
    row,
    col,
    side,
    fromCentre: side === 'left' ? BOOTHS_PER_SIDE - col : col - BOOTHS_PER_SIDE + 1,
    front: { x: x + BOOTH / 2, y: y + BOOTH },
    aisleY: y + BOOTH + BOOTH / 2,
  };
}

export const BOOTH_SPOTS: readonly BoothSpot[] = EXHIBITORS.map(spotFor);
export const SPOT_BY_ID: ReadonlyMap<string, BoothSpot> = new Map(BOOTH_SPOTS.map((s) => [s.exhibitor.id, s]));

/** y of each aisle's centre line in a hall, aisle 1 nearest the door. */
export const AISLE_YS: readonly number[] = Array.from({ length: ROWS }, (_, row) => rowTop(row) + BOOTH * 1.5);

export interface Amenity {
  label: string;
  x: number;
  w: number;
}

/** Sample services along the concourse's back edge, kept clear of the walking line. */
export const AMENITIES: readonly Amenity[] = [
  { label: 'Toilets', x: 3, w: 16 },
  { label: 'Registration', x: VENUE_W / 2 - 24, w: 18 },
  { label: 'Café', x: VENUE_W / 2 + 34, w: 14 },
  { label: 'Toilets', x: VENUE_W - 19, w: 16 },
];
