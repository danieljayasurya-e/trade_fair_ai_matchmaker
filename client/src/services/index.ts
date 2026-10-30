import { mockMatchingService } from './matchingService';

// Swap this export for a real API-backed implementation later.
export const matchingService = mockMatchingService;
export { TOP_N } from './matchingService';
export type { MatchingService, MatchingOptions } from './matchingService';
