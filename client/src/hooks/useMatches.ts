import { useCallback, useEffect, useState } from 'react';
import { matchingService } from '../services';
import type { Guest, MatchResponse, RequestState } from '../types';

/** Loads the top matches for a guest and exposes loading / error / retry. */
export function useMatches(guest: Guest | null, { fresh = false }: { fresh?: boolean } = {}) {
  const [state, setState] = useState<RequestState<MatchResponse>>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!guest) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });

    matchingService
      .getTopMatches(guest, { signal: controller.signal, fresh })
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Something went wrong while matching.',
        });
      });

    return () => controller.abort();
  }, [guest, fresh, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
