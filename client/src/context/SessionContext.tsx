import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { COMPANY_SIZES, INDUSTRIES, INTERESTS, REGIONS, SENIORITIES } from '../data/taxonomy';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { syncBookmark } from '../services/apiClient';
import type { Guest } from '../types';

type BookmarksByGuest = Record<string, string[]>;

interface SessionContextValue {
  guest: Guest | null;
  selectGuest: (guest: Guest) => void;
  /** Forget the current visitor ("Not you? Start over"). Their saved stalls stay stored under their id. */
  clearGuest: () => void;
  /** Bookmarked exhibitor ids for the current guest, in the order they were added. */
  bookmarkIds: readonly string[];
  isBookmarked: (exhibitorId: string) => boolean;
  toggleBookmark: (exhibitorId: string) => void;
  clearBookmarks: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const isOneOf = (list: readonly string[], value: unknown) => typeof value === 'string' && list.includes(value);

// A profile saved by an older build can lack fields or use choices that no longer exist (the sector
// lists change with the exhibitor data, and the server rejects unknown ones). Treat it as no
// profile rather than showing "We couldn't load your matches".
const isGuest = (value: unknown): value is Guest | null => {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const guest = value as Partial<Guest>;
  return (
    typeof guest.id === 'string' &&
    typeof guest.jobRole === 'string' &&
    isOneOf(INDUSTRIES, guest.industry) &&
    isOneOf(SENIORITIES, guest.seniority) &&
    isOneOf(COMPANY_SIZES, guest.companySize) &&
    isOneOf(REGIONS, guest.region) &&
    Array.isArray(guest.interests) &&
    guest.interests.length > 0 &&
    guest.interests.every((interest) => isOneOf(INTERESTS, interest))
  );
};

const isBookmarkMap = (value: unknown): value is BookmarksByGuest =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const NO_BOOKMARKS: readonly string[] = [];

export function SessionProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useLocalStorageState<Guest | null>('matchmaker.guest', null, isGuest);
  const [bookmarksByGuest, setBookmarksByGuest] = useLocalStorageState<BookmarksByGuest>(
    'matchmaker.bookmarks',
    {},
    isBookmarkMap,
  );

  const guestId = guest?.id;
  const bookmarkIds = (guestId && bookmarksByGuest[guestId]) || NO_BOOKMARKS;
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const isBookmarked = useCallback((id: string) => bookmarkSet.has(id), [bookmarkSet]);

  const toggleBookmark = useCallback(
    (exhibitorId: string) => {
      if (!guestId) return;
      if (guest) void syncBookmark(guest, exhibitorId, !bookmarkSet.has(exhibitorId));
      setBookmarksByGuest((all) => {
        const current = all[guestId] ?? [];
        const next = current.includes(exhibitorId)
          ? current.filter((id) => id !== exhibitorId)
          : [...current, exhibitorId];
        return { ...all, [guestId]: next };
      });
    },
    [guest, guestId, bookmarkSet, setBookmarksByGuest],
  );

  const clearBookmarks = useCallback(() => {
    if (!guestId) return;
    setBookmarksByGuest((all) => ({ ...all, [guestId]: [] }));
  }, [guestId, setBookmarksByGuest]);

  const clearGuest = useCallback(() => setGuest(null), [setGuest]);

  const value = useMemo<SessionContextValue>(
    () => ({ guest, selectGuest: setGuest, clearGuest, bookmarkIds, isBookmarked, toggleBookmark, clearBookmarks }),
    [guest, setGuest, clearGuest, bookmarkIds, isBookmarked, toggleBookmark, clearBookmarks],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}
