import { useEffect, useState } from 'react';

/**
 * useState that survives reloads. Storage can be blocked or full (private windows,
 * kiosk browsers), so every access is guarded and the app works without it.
 */
export function useLocalStorageState<T>(key: string, initial: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
