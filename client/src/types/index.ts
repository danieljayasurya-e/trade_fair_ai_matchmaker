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
  /** Consent to share business contact details with exhibitors. */
  optIn?: boolean;
}

export interface Guest extends GuestInput {
  id: string;
  updatedAt: string;
}

export interface SampleProfile {
  id: string;
  label: string;
  profile: GuestInput;
}

export interface Exhibitor {
  id: string;
  name: string;
  description: string;
  /** Booth row, such as "LC". Everything is in Hall 1. */
  hall: Hall;
  /** Booth code from the visitor guide, such as "LC 24". */
  booth: string;
  /** Any further booths the exhibitor also occupies. */
  otherBooths: string[];
  city: string;
  country: string;
  products: string[];
  /** Product areas this exhibitor is tagged with; compared with visitor interests. */
  tags: Interest[];
  /** Sectors this exhibitor sells to; its stand-in for target-buyer criteria. */
  industries: Industry[];
}

/** 0 to 1 values behind a score. */
export interface Factors {
  /** How closely the visitor's wording reads like the exhibitor's offer. */
  semantic: number;
  /** Shared product areas. */
  interest: number;
  /** What the visitor wrote against the exhibitor's products, plus whether it sells to their sector. */
  intent: number;
  /** Does this stall sell to the visitor's sector. */
  buyerFit: number;
  /** Visitor → exhibitor: does the stall sell what the visitor wants. */
  g2e: number;
  /** Stall → visitor: is the visitor a likely buyer for the stall. */
  e2g: number;
}

/** One named reason behind a match, e.g. "Robotics: matches your interest". */
export interface Insight {
  label: string;
  why: string;
}

/** The contract's Recommendation. */
export interface Match {
  rank: number;
  exhibitor: Exhibitor;
  /** Integer 0 to 100: the geometric mean of both directions. */
  score: number;
  /** Product areas behind the match, most relevant first. */
  matchedOn: Interest[];
  factors: Factors;
  /** One plain sentence explaining the match. */
  reason: string;
  insights: Insight[];
}

/** The contract's RecommendationsResponse. */
export interface MatchResponse {
  results: Match[];
  /** Time the matching run took, in ms. */
  latencyMs: number;
  /** How many exhibitors were scored. */
  total: number;
  /** Set by the client: from the backend, or the in-browser fallback. */
  source?: 'live' | 'offline';
}

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
