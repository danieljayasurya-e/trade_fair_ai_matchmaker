// The UI only talks to the `MatchingService` interface: the backend when it answers, otherwise the
// same scoring rules run in the browser so the demo survives a network failure.
import type { Guest, MatchResponse, SampleProfile } from '../types';
import { SAMPLE_PROFILES } from '../data/guests';
import { EXHIBITORS } from '../data/exhibitors';
import { fetchRecommendations, isApiUp } from './apiClient';
import { rankExhibitors } from './scoring';

export const TOP_N = 30;
const MIN_SCREEN_MS = 900;

export interface MatchingOptions {
  signal?: AbortSignal;
  /** Skip the cache and run the match again (used by "Re-run"). */
  fresh?: boolean;
}

export interface MatchingService {
  listSampleProfiles(): Promise<readonly SampleProfile[]>;
  getTopMatches(guest: Guest, options?: MatchingOptions): Promise<MatchResponse>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

// Same profile gives the same cache entry, so the list reopens instantly and the demo
// still works if the network drops. Every field the scorer reads is part of the key.
const cacheKey = (guest: Guest) =>
  JSON.stringify([
    guest.industry,
    guest.jobRole,
    guest.seniority,
    guest.companySize,
    [...guest.interests].sort(),
    guest.freeText,
  ]);

// Open `#/matching?fail` to see the error state once; "Try again" then succeeds.
let hasSimulatedFailure = false;
const shouldSimulateFailure = () => {
  if (hasSimulatedFailure || !window.location.hash.includes('fail')) return false;
  hasSimulatedFailure = true;
  return true;
};

const cache = new Map<string, MatchResponse>();

export const mockMatchingService: MatchingService = {
  async listSampleProfiles() {
    return SAMPLE_PROFILES;
  },

  async getTopMatches(guest, { signal, fresh = false } = {}) {
    const key = cacheKey(guest);
    const cached = fresh ? undefined : cache.get(key);
    if (cached) return cached;

    const started = performance.now();
    // Simulated inference time; a real call replaces this.
    await wait(600 + Math.random() * 400, signal);
    if (shouldSimulateFailure()) throw new Error('The matching service did not respond.');

    const response: MatchResponse = {
      results: rankExhibitors(guest, EXHIBITORS, TOP_N),
      latencyMs: Math.round(performance.now() - started),
      total: EXHIBITORS.length,
      source: 'offline',
    };
    cache.set(key, response);
    return response;
  },
};

export const apiMatchingService: MatchingService = {
  listSampleProfiles: mockMatchingService.listSampleProfiles,

  async getTopMatches(guest, options = {}) {
    if (!(await isApiUp())) return mockMatchingService.getTopMatches(guest, options);
    // The engine takes milliseconds; hold the matching screen long enough to read. `latencyMs` stays the real time.
    const [response] = await Promise.all([
      fetchRecommendations(guest, options.signal),
      options.fresh ? wait(MIN_SCREEN_MS, options.signal) : undefined,
    ]);
    return { ...response, source: 'live' };
  },
};
