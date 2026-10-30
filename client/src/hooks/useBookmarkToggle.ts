import { useCallback, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

/**
 * Returns a toggle handler whose identity never changes, so memoised cards don't
 * re-render every time a bookmark is added. It reads the latest bookmarks through a ref.
 * Every toggle shows a toast with Undo.
 */
export function useBookmarkToggle() {
  const { bookmarkIds, toggleBookmark } = useSession();
  const { notify } = useToast();
  const savedRef = useRef(bookmarkIds);

  useEffect(() => {
    savedRef.current = bookmarkIds;
  });

  return useCallback(
    (exhibitorId: string) => {
      const wasSaved = savedRef.current.includes(exhibitorId);
      toggleBookmark(exhibitorId);
      notify(wasSaved ? 'Removed from visit list' : 'Added to visit list', {
        label: 'Undo',
        onAction: () => toggleBookmark(exhibitorId),
      });
    },
    [notify, toggleBookmark],
  );
}
