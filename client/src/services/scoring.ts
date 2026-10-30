// The one place compatibility is computed. Every point of a score traces back to a
// named profile field; there are no per-exhibitor adjustments (see CLAUDE.md §6).
//
// Two-way "mutual fit":
//   visitor → stall : does the stall sell what the visitor wants? (semantic, interests, intent)
//   stall → visitor : is the visitor a likely buyer for the stall? (sector, region)
//   final score     : geometric mean of the two, 0–100.
// A stall only ranks high when the fit works both ways.
//
// The company list has no per-company target-buyer data, so "buyer fit" uses one rule per segment
// (INDUSTRIES_BUYING) and the stall's state. Seniority and company size are collected but not scored.
// TODO: score them once the organiser provides buyer criteria.
import { INDUSTRIES_BUYING, REGION_OF_STATE } from '../data/taxonomy';
import type { Exhibitor, Guest, GuestInput, Match, MatchFactor, ScoreBreakdown } from '../types';

/** Weights inside the visitor → stall direction. They sum to 1. */
export const G2E_WEIGHTS = { semantic: 0.4, interest: 0.4, intent: 0.2 } as const;
/** Even a poor buyer-fit keeps this share, so a strong segment match stays visible. */
export const BUYER_FIT_FLOOR = 0.25;
/** Below this visitor → stall score a stall is not a candidate at all. */
const MIN_G2E = 0.05;
/** Bonus inside "intent" when the visitor's sector buys what the stall sells. */
const SECTOR_INTENT_BONUS = 0.25;

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'our', 'your', 'you', 'are', 'any', 'anything', 'that', 'this', 'from',
  'need', 'looking', 'interested', 'want', 'plus', 'into', 'also', 'all', 'can', 'use', 'new',
]);

/** Lower-cased word stems of at least three letters, minus filler words. */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    // Crude stem so "glaze"/"glazes" and "kiln"/"kilns" meet.
    out.add(raw.length > 6 ? raw.slice(0, 6) : raw.replace(/s$/, ''));
  }
  return out;
}

const countShared = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const toPercent = (value: number) => Math.round(clamp01(value) * 100);

interface Scored extends Omit<Match, 'rank'> {
  /** Unrounded visitor → stall score, used to drop non-candidates and break ties. */
  g2e: number;
}

export function scorePair(guest: GuestInput, exhibitor: Exhibitor): Scored {
  const guestWords = tokenize([guest.freeText, guest.jobRole, guest.industry, ...guest.interests].join(' '));
  const writtenWords = tokenize(guest.freeText);
  const exhibitorWords = tokenize([exhibitor.name, ...exhibitor.tags].join(' '));

  const sharedWords = countShared(guestWords, exhibitorWords);
  const semantic = clamp01(
    (2 * sharedWords) / Math.sqrt(Math.max(1, guestWords.size) * Math.max(1, exhibitorWords.size)),
  );

  const matchedTags = exhibitor.tags.filter((tag) => guest.interests.includes(tag));
  const interest =
    guest.interests.length === 0 ? 0 : clamp01(matchedTags.length / Math.min(guest.interests.length, exhibitor.tags.length));

  // Segments the visitor described in their own words, beyond the ones they ticked.
  const writtenTags = exhibitor.tags.filter(
    (tag) => !matchedTags.includes(tag) && countShared(tokenize(tag), writtenWords) > 0,
  );
  const sectorBuys = exhibitor.tags.some((tag) => INDUSTRIES_BUYING[tag].includes(guest.industry));
  const intent = clamp01(
    (matchedTags.length + writtenTags.length) / exhibitor.tags.length + (sectorBuys ? SECTOR_INTENT_BONUS : 0),
  );

  const inRegion = REGION_OF_STATE[exhibitor.state] === guest.region;
  const buyerFit = ((sectorBuys ? 1 : 0) + (inRegion ? 1 : 0)) / 2;

  const g2e = clamp01(
    G2E_WEIGHTS.semantic * semantic + G2E_WEIGHTS.interest * interest + G2E_WEIGHTS.intent * intent,
  );
  const e2g = clamp01(BUYER_FIT_FLOOR + (1 - BUYER_FIT_FLOOR) * buyerFit);
  const score = Math.round(100 * Math.sqrt(g2e * e2g));

  const breakdown: ScoreBreakdown = {
    semantic: toPercent(semantic),
    interest: toPercent(interest),
    intent: toPercent(intent),
    buyerFit: toPercent(buyerFit),
    g2e: toPercent(g2e),
    e2g: toPercent(e2g),
  };

  const factors: MatchFactor[] = [
    ...matchedTags.map((tag) => ({ label: tag, why: `Matches your interest “${tag}”.` })),
    ...writtenTags.map((tag) => ({ label: tag, why: `Your description mentions what they offer under “${tag}”.` })),
  ];
  if (sectorBuys) {
    factors.push({
      label: `${guest.industry} buyers`,
      why: `Their segments are bought by ${guest.industry.toLowerCase()} businesses, like yours.`,
    });
  }
  if (inRegion) {
    factors.push({ label: 'In your region', why: `They are based in ${exhibitor.city}, ${exhibitor.state}, in ${guest.region}.` });
  }
  if (factors.length === 0) {
    factors.push({ label: 'General overlap', why: 'Some of the wording in your profile overlaps with their name or segments.' });
  }

  return { exhibitor, score, breakdown, factors, g2e };
}

/**
 * The best `limit` candidates, highest score first. Ties fall back to visitor → stall
 * fit and then name, so the order is stable and neutral.
 */
export function rankExhibitors(guest: Guest, exhibitors: readonly Exhibitor[], limit: number): Match[] {
  return exhibitors
    .map((exhibitor) => scorePair(guest, exhibitor))
    .filter((scored) => scored.g2e > MIN_G2E)
    .sort((a, b) => b.score - a.score || b.g2e - a.g2e || a.exhibitor.name.localeCompare(b.exhibitor.name))
    .slice(0, limit)
    .map(({ g2e: _g2e, ...match }, index) => ({ ...match, rank: index + 1 }));
}
