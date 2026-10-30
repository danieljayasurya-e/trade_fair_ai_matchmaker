// Hall 1, BIEC Bengaluru: traced by hand from the "Layout Hall - 1" page of the LASER World of
// PHOTONICS INDIA 2026 visitor guide. Positions are good enough for finding a stall, not a survey.
// Units are roughly metres (the guide gives no scale), so walking distances are approximate.
import { EXHIBITORS } from './exhibitors';
import type { Exhibitor } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

/** Corners as measured on the traced plan: [left, top, right, bottom]. */
type Traced = readonly [x1: number, y1: number, x2: number, y2: number];

const ORIGIN = { x: 383, y: 458 };
const SCALE = 10;
const toRect = ([x1, y1, x2, y2]: Traced): Rect => ({
  x: (x1 - ORIGIN.x) / SCALE,
  y: (y1 - ORIGIN.y) / SCALE,
  w: (x2 - x1) / SCALE,
  h: (y2 - y1) / SCALE,
});

export const VENUE_W = 56.9;
export const VENUE_H = 120.2;
export const MAIN_ENTRANCE: Point = { x: 28.1, y: VENUE_H };

const BOOTH_PLAN: Readonly<Record<string, Traced>> = {
  'LA 31': [395, 725, 423, 763], 'LA 29': [395, 801, 423, 830], 'LA 28': [395, 830, 423, 859],
  'LA 27': [395, 859, 423, 888], 'LA 26': [395, 888, 423, 917], 'LA 25': [395, 917, 423, 955],
  'LA 24': [395, 955, 423, 993], 'LA 23': [395, 993, 423, 1040], 'LA 21': [395, 1040, 423, 1116],
  'LA 20': [395, 1145, 423, 1212], 'LA 18': [395, 1212, 423, 1250], 'LA 15': [395, 1250, 423, 1345],
  'LA 11': [395, 1345, 423, 1460], 'LA 01': [395, 1488, 423, 1603],

  'LB 81': [452, 725, 490, 753], 'LB 82': [490, 725, 529, 753], 'LB 83': [529, 725, 567, 753],
  'LB 85': [567, 725, 605, 753], 'LB 88': [605, 725, 653, 753], 'LB 65': [452, 782, 481, 806],
  'LB 66': [481, 782, 510, 806], 'LB 63': [452, 806, 481, 830], 'LB 64': [481, 806, 510, 830],
  'LB 61': [452, 830, 481, 859], 'LB 62': [481, 830, 510, 859], 'LB 53': [452, 887, 481, 916],
  'LB 54': [481, 887, 510, 916], 'LB 51': [452, 916, 481, 945], 'LB 52': [481, 916, 510, 945],
  'LB 45': [452, 973, 481, 1002], 'LB 46': [481, 973, 510, 1002], 'LB 43': [452, 1002, 481, 1031],
  'LB 42': [481, 1002, 510, 1059], 'LB 41': [452, 1031, 481, 1059], 'LB 31': [452, 1088, 481, 1173],
  'LB 40': [481, 1088, 510, 1125], 'LB 34': [481, 1125, 510, 1173], 'LB 21': [452, 1202, 510, 1288],
  'LB 15': [452, 1317, 481, 1374], 'LB 18': [481, 1317, 510, 1374], 'LB 11': [452, 1374, 510, 1431],
  'LB 10': [452, 1460, 510, 1517], 'LB 01': [452, 1517, 510, 1603],

  'LC 77': [538, 782, 567, 811], 'LC 75': [567, 782, 596, 811], 'LC 74': [596, 782, 653, 811],
  'LC 71': [538, 830, 586, 859], 'LC 72': [586, 830, 653, 859], 'LC 59': [538, 887, 586, 916],
  'LC 57': [586, 887, 615, 916], 'LC 56': [615, 887, 653, 916], 'LC 55': [538, 916, 586, 945],
  'LC 53': [586, 916, 615, 945], 'LC 52': [615, 916, 653, 945], 'LC 49': [567, 973, 586, 988],
  'LC 47': [586, 973, 605, 988], 'LC 45': [605, 973, 625, 988], 'LC 48': [625, 973, 653, 1002],
  'LC 46': [625, 1002, 653, 1031], 'LC 41': [538, 1021, 567, 1059], 'LC 42': [567, 1031, 596, 1059],
  'LC 43': [596, 1031, 625, 1059], 'LC 44': [625, 1031, 653, 1059], 'LC 39': [538, 1088, 596, 1117],
  'LC 38': [596, 1088, 653, 1117], 'LC 31': [538, 1135, 596, 1173], 'LC 36': [596, 1135, 653, 1173],
  'LC 30': [596, 1202, 653, 1231], 'LC 24': [596, 1231, 653, 1288], 'LC 21': [538, 1250, 567, 1288],
  'LC 23': [567, 1250, 596, 1288], 'LC 14': [538, 1317, 586, 1364], 'LC 20': [586, 1317, 653, 1364],
  'LC 11': [538, 1364, 586, 1431], 'LC 16': [586, 1364, 653, 1431], 'LC 09': [538, 1460, 596, 1507],
  'LC 01': [538, 1507, 596, 1603], 'LC 10': [596, 1460, 653, 1603],

  'LD 81': [681, 725, 738, 753], 'LD 85': [738, 725, 767, 753], 'LD 86': [767, 725, 796, 753],
  'LD 67': [681, 782, 710, 830], 'LD 65': [710, 782, 739, 830], 'LD 70': [739, 782, 767, 830],
  'LD 61': [681, 830, 710, 859], 'LD 62': [710, 830, 739, 859], 'LD 64': [739, 830, 767, 859],
  'LD 53': [681, 887, 720, 916], 'LD 59': [720, 887, 757, 916], 'LD 54': [757, 887, 796, 916],
  'LD 51': [681, 916, 720, 945], 'LD 55': [720, 916, 757, 945], 'LD 52': [757, 916, 796, 945],
  'LD 33': [681, 1088, 738, 1135], 'LD 31': [681, 1135, 738, 1173], 'LD 23': [681, 1202, 757, 1231],
  'LD 30': [757, 1202, 796, 1231], 'LD 21': [681, 1231, 738, 1288], 'LD 24': [738, 1231, 796, 1288],
  'LD 15': [681, 1317, 748, 1345], 'LD 20': [748, 1317, 796, 1431], 'LD 11': [681, 1345, 748, 1431],
  'LD 05': [681, 1460, 738, 1488], 'LD 10': [738, 1460, 796, 1507], 'LD 01': [681, 1488, 738, 1603],
  'LD 06': [738, 1507, 796, 1603],

  'LE 55': [825, 887, 882, 906], 'LE 51': [825, 906, 853, 945], 'LE 52': [853, 906, 882, 945],
  'LE 43': [825, 973, 882, 1002], 'LE 41': [825, 1002, 853, 1059], 'LE 46': [853, 1002, 882, 1059],
  'LE 31': [825, 1088, 853, 1173], 'LE 40': [853, 1088, 882, 1125], 'LE 34': [853, 1125, 882, 1173],
  'LE 23': [825, 1202, 853, 1240], 'LE 30': [853, 1202, 882, 1240], 'LE 21': [825, 1240, 853, 1288],
  'LE 26': [853, 1240, 882, 1288], 'LE 20': [825, 1317, 882, 1364], 'LE 11': [825, 1364, 853, 1431],
  'LE 12': [853, 1383, 882, 1431], 'LE 10': [825, 1460, 882, 1507], 'LE 01': [825, 1507, 882, 1603],

  'LF 25': [911, 887, 939, 963], 'LF 24': [911, 963, 939, 1021], 'LF 23': [911, 1021, 939, 1059],
  'LF 21': [911, 1059, 939, 1116], 'LF 20': [911, 1145, 939, 1202], 'LF 18': [911, 1202, 939, 1250],
  'LF 16': [911, 1250, 939, 1288], 'LF 15': [911, 1288, 939, 1326], 'LF 14': [911, 1326, 939, 1364],
  'LF 12': [911, 1364, 939, 1402], 'LF 11': [911, 1402, 939, 1460], 'LF 01': [911, 1488, 939, 1603],
};

export interface Amenity extends Rect {
  label: string;
}

/** Non-stall spaces named on the plan. */
export const AMENITIES: readonly Amenity[] = (
  [
    ['Toilets', [385, 460, 581, 601]],
    ['Toilets', [756, 460, 949, 601]],
    ['Conference', [796, 725, 882, 858]],
    ['Lunch', [882, 725, 939, 858]],
    ['Buyer-Seller Lounge', [681, 973, 796, 1059]],
    ['VIP Lounge', [738, 1088, 796, 1135]],
    ['Podcast', [738, 1135, 796, 1173]],
    ['Cafeteria', [538, 1202, 596, 1250]],
    ['Editing Room', [538, 1117, 653, 1135]],
  ] as const
).map(([label, traced]) => ({ label, ...toRect(traced) }));

// Walkable aisles, as a grid the wayfinder moves along. Each runs between two traced coordinates.
interface Aisle {
  at: number;
  from: number;
  to: number;
}

const toX = (px: number) => (px - ORIGIN.x) / SCALE;
const toY = (py: number) => (py - ORIGIN.y) / SCALE;
const FRONT_Y = 1630;

/** North-south aisles, west to east, each named by the booth row on its east side (LF: its west). */
export const LONG_AISLES: readonly (Aisle & { beside: string })[] = [
  { beside: 'LB', at: 437, from: 744, to: FRONT_Y },
  { beside: 'LC', at: 524, from: 768, to: FRONT_Y },
  { beside: 'LD', at: 667, from: 739, to: FRONT_Y },
  { beside: 'LE', at: 810, from: 873, to: FRONT_Y },
  { beside: 'LF', at: 896, from: 873, to: FRONT_Y },
].map((a) => ({ ...a, at: toX(a.at), from: toY(a.from), to: toY(a.to) }));

/** East-west aisles, from the back of the hall to the entrance side. */
export const CROSS_AISLES: readonly Aisle[] = [
  { at: 768, from: 437, to: 790 },
  { at: 873, from: 437, to: 896 },
  { at: 959, from: 437, to: 896 },
  { at: 1073, from: 437, to: 896 },
  { at: 1187, from: 437, to: 896 },
  { at: 1302, from: 437, to: 896 },
  { at: 1445, from: 437, to: 896 },
  { at: FRONT_Y, from: 437, to: 896 },
].map((a) => ({ at: toY(a.at), from: toX(a.from), to: toX(a.to) }));

export interface BoothSpot {
  exhibitor: Exhibitor;
  /** This exhibitor's share of the booth; booths with several exhibitors are split evenly. */
  rect: Rect;
  /** Where you stand to visit it: the nearest point on the booth's edge. */
  front: Point;
  /** The point on an aisle directly in front of `front`. */
  access: Point;
  /** Which way the booth lies from the aisle. */
  facing: 'north' | 'south' | 'east' | 'west';
}

function nearestAisle(rect: Rect): Pick<BoothSpot, 'front' | 'access' | 'facing'> {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let best: (Pick<BoothSpot, 'front' | 'access' | 'facing'> & { gap: number }) | null = null;

  for (const a of LONG_AISLES) {
    const y = clamp(cy, a.from, a.to);
    const edge = a.at < rect.x ? rect.x : rect.x + rect.w;
    const gap = Math.abs(edge - a.at) + Math.abs(y - cy) / 4;
    if (!best || gap < best.gap) {
      best = { gap, front: { x: edge, y }, access: { x: a.at, y }, facing: a.at < rect.x ? 'east' : 'west' };
    }
  }
  for (const a of CROSS_AISLES) {
    if (a.from > rect.x + rect.w || a.to < rect.x) continue;
    const x = clamp(cx, a.from, a.to);
    const edge = a.at < rect.y ? rect.y : rect.y + rect.h;
    const gap = Math.abs(edge - a.at) + Math.abs(x - cx) / 4;
    if (!best || gap < best.gap) {
      best = { gap, front: { x, y: edge }, access: { x, y: a.at }, facing: a.at < rect.y ? 'south' : 'north' };
    }
  }
  if (!best) throw new Error('A booth has no aisle near it');
  const { gap: _gap, ...spot } = best;
  return spot;
}

function shareOf(rect: Rect, index: number, count: number): Rect {
  if (rect.w >= rect.h) return { ...rect, x: rect.x + (index * rect.w) / count, w: rect.w / count };
  return { ...rect, y: rect.y + (index * rect.h) / count, h: rect.h / count };
}

const byBooth = new Map<string, Exhibitor[]>();
for (const exhibitor of EXHIBITORS) {
  byBooth.set(exhibitor.booth, [...(byBooth.get(exhibitor.booth) ?? []), exhibitor]);
}

export const BOOTH_SPOTS: readonly BoothSpot[] = [...byBooth].flatMap(([booth, sharers]) => {
  const traced = BOOTH_PLAN[booth];
  if (!traced) throw new Error(`Booth ${booth} is not on the traced floor plan`);
  const whole = toRect(traced);
  return sharers.map((exhibitor, index) => ({
    exhibitor,
    rect: shareOf(whole, index, sharers.length),
    ...nearestAisle(whole),
  }));
});

export const SPOT_BY_ID: ReadonlyMap<string, BoothSpot> = new Map(BOOTH_SPOTS.map((s) => [s.exhibitor.id, s]));
