import type { CompanySize, Hall, Industry, Interest, Region, Seniority } from '../data/taxonomy';

/** What a visitor tells us. Same fields as the mobile app's GuestInput. */
export interface GuestInput {
  name: string;
  industry: Industry;
  jobRole: string;
  seniority: Seniority;
  companySize: CompanySize;
  region: Region;
  /** What this visitor wants to buy or learn about. */
  interests: Interest[];
  /** Free-text "what are you looking for?". */
  freeText: string;
}

export interface Guest extends GuestInput {
  id: string;
}

export interface SampleProfile {
  id: string;
  label: string;
  profile: GuestInput;
}

export interface Exhibitor {
  id: string;
  name: string;
  /** Built from the record's own segments and location; the source list has no description. */
  description: string;
  hall: Hall;
  /** Display code such as "A-101". Generated test value, not the official floor plan. */
  booth: string;
  city: string;
  state: string;
  /** Segments this exhibitor is listed under; compared with visitor interests. */
  tags: Interest[];
}

/** 0–100 values behind a score. */
export interface ScoreBreakdown {
  /** How closely the visitor's wording reads like the exhibitor's offer. */
  semantic: number;
  /** Shared taxonomy tags. */
  interest: number;
  /** What the visitor wrote against the exhibitor's segments, plus whether their sector buys them. */
  intent: number;
  /** Does the visitor's sector buy this stall's segments, and is the stall in the visitor's region. */
  buyerFit: number;
  /** Visitor → exhibitor: does the stall sell what the visitor wants. */
  g2e: number;
  /** Stall → visitor: is the visitor a likely buyer for the stall. */
  e2g: number;
}

/** One named reason behind a match, e.g. "Robotics: matches your interest". */
export interface MatchFactor {
  label: string;
  why: string;
}

export interface Match {
  exhibitor: Exhibitor;
  rank: number;
  /** Normalised 0–100: the geometric mean of both directions. */
  score: number;
  breakdown: ScoreBreakdown;
  factors: MatchFactor[];
}

export interface MatchResponse {
  matches: Match[];
  meta: {
    /** Time the matching run took, in ms. */
    latencyMs: number;
    /** How many exhibitors were scored. */
    scanned: number;
  };
}

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
