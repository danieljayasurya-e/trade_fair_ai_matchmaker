// The one place compatibility is computed. Every point of a score traces back to a
// named profile field; there are no per-exhibitor adjustments (see CLAUDE.md §6).
//
// Two-way "mutual fit":
//   visitor → stall : does the stall sell what the visitor wants? (semantic, interests, intent)
//   stall → visitor : is the visitor a likely buyer for the stall? (sector)
//   final score     : geometric mean of the two, 0–100.
// A stall only ranks high when the fit works both ways.
//
// The exhibitor data has no target-buyer criteria, so "buyer fit" uses the sectors each company sells to.
// Region, seniority and company size are collected but not scored: favouring nearby stalls would push
// down overseas exhibitors for reasons unrelated to their products.
import type { Exhibitor, Guest, GuestInput, Insight, Match } from '../types';

/** Weights inside the visitor → stall direction. They sum to 1. */
export const G2E_WEIGHTS = { semantic: 0.4, interest: 0.4, intent: 0.2 } as const;
/** A missing sector is weak evidence (the lists are inferred), so it lowers a score without burying the stall. */
export const BUYER_FIT_FLOOR = 0.7;
/** Bonus inside "intent" when the visitor's sector buys what the stall sells. */
const SECTOR_INTENT_BONUS = 0.25;

// Words nearly every exhibitor's products contain: they say nothing about a specific product.
const GENERIC_PRODUCT_WORDS = new Set(['laser', 'optic', 'optica', 'system', 'machin', 'equipm', 'photon', 'compon', 'produc', 'module']);

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'our', 'your', 'you', 'are', 'any', 'anything', 'that', 'this', 'from',
  'need', 'looking', 'interested', 'want', 'plus', 'into', 'also', 'all', 'can', 'use', 'new',
]);

/** Lower-cased word stems of at least three letters, minus filler words. */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    // Crude stem so "laser"/"lasers" and "mount"/"mounts" meet.
    out.add(raw.length > 6 ? raw.slice(0, 6) : raw.replace(/s$/, ''));
  }
  return out;
}

const countShared = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared;
};

/** Does the visitor's text name this tag or product by something more specific than "laser"? */
const mentions = (text: string, written: ReadonlySet<string>) =>
  [...tokenize(text)].some((word) => !GENERIC_PRODUCT_WORDS.has(word) && written.has(word));

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round3 = (value: number) => Math.round(clamp01(value) * 1000) / 1000;

interface Scored extends Omit<Match, 'rank'> {
  /** Unrounded visitor → stall score, used to drop non-candidates and break ties. */
  g2e: number;
}

export function scorePair(guest: GuestInput, exhibitor: Exhibitor): Scored {
  const guestWords = tokenize([guest.freeText, guest.jobRole, guest.industry, ...guest.interests].join(' '));
  const writtenWords = tokenize(guest.freeText);
  const exhibitorWords = tokenize([exhibitor.name, exhibitor.description, ...exhibitor.products, ...exhibitor.tags].join(' '));

  const sharedWords = countShared(guestWords, exhibitorWords);
  const semantic = clamp01(
    (2 * sharedWords) / Math.sqrt(Math.max(1, guestWords.size) * Math.max(1, exhibitorWords.size)),
  );

  const matchedTags = exhibitor.tags.filter((tag) => guest.interests.includes(tag));
  const interest =
    guest.interests.length === 0 ? 0 : clamp01(matchedTags.length / guest.interests.length);

  // Product areas the visitor described in their own words, beyond the ones they ticked.
  const writtenTags = exhibitor.tags.filter(
    (tag) => !matchedTags.includes(tag) && mentions(tag, writtenWords),
  );
  // Specific products the visitor asked for by name.
  const writtenProducts = exhibitor.products.filter((product) => mentions(product, writtenWords));
  const sectorBuys = exhibitor.industries.includes(guest.industry);
  const tagIntent = exhibitor.tags.length === 0 ? 0 : (matchedTags.length + writtenTags.length) / exhibitor.tags.length;
  const productIntent = Math.min(1, writtenProducts.length / 3);
  const intent = clamp01(0.5 * tagIntent + 0.5 * productIntent + (sectorBuys ? SECTOR_INTENT_BONUS : 0));

  const buyerFit = sectorBuys ? 1 : 0;

  const g2e = clamp01(
    G2E_WEIGHTS.semantic * semantic + G2E_WEIGHTS.interest * interest + G2E_WEIGHTS.intent * intent,
  );
  const e2g = clamp01(BUYER_FIT_FLOOR + (1 - BUYER_FIT_FLOOR) * buyerFit);
  const score = Math.round(100 * Math.sqrt(g2e * e2g));

  const factors = {
    semantic: round3(semantic),
    interest: round3(interest),
    intent: round3(intent),
    buyerFit: round3(buyerFit),
    g2e: round3(g2e),
    e2g: round3(e2g),
  };

  const insights: Insight[] = [
    ...matchedTags.map((tag) => ({ label: tag, why: `Matches your interest “${tag}”.` })),
    ...writtenTags.map((tag) => ({ label: tag, why: `Your description mentions what they offer under “${tag}”.` })),
    ...writtenProducts.slice(0, 2).map((product) => ({ label: product, why: `They offer ${product}, which you asked about.` })),
  ];
  if (sectorBuys) {
    insights.push({
      label: `${guest.industry} buyers`,
      why: `They sell to ${guest.industry} businesses, like yours.`,
    });
  }
  if (insights.length === 0) {
    insights.push({ label: 'General overlap', why: 'Some of the wording in your profile overlaps with their name or products.' });
  }

  const matchedOn = [...matchedTags, ...writtenTags].slice(0, 5);
  const offer = writtenProducts[0] ?? exhibitor.products[0];
  const reason = matchedOn.length > 0
    ? `${offer ? `Offers ${offer}; matches` : 'Matches'} your interest in ${matchedOn.slice(0, 3).join(', ')}.`
    : (insights[0]?.why ?? '');

  return { exhibitor, score, matchedOn, factors, reason, insights, g2e };
}

/**
 * The best `limit` candidates, highest score first. Ties fall back to visitor → stall
 * fit and then name, so the order is stable and neutral.
 */
export function rankExhibitors(guest: Guest, exhibitors: readonly Exhibitor[], limit: number): Match[] {
  return exhibitors
    .map((exhibitor) => scorePair(guest, exhibitor))
    .sort((a, b) => b.score - a.score || b.g2e - a.g2e || a.exhibitor.name.localeCompare(b.exhibitor.name))
    .slice(0, limit)
    .map(({ g2e: _g2e, ...match }, index) => ({ ...match, rank: index + 1 }));
}
