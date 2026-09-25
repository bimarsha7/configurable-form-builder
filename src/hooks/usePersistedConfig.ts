import { useCallback, useState } from 'react';
import { parseFormConfig, serializeFormConfig } from '../lib/schema';
import type { FormConfig } from '../types/form';

/**
 * Loads a config from localStorage once and returns a saver for later changes.
 * Stored data goes through the same validation as a manual import, so a corrupt
 * or outdated entry falls back to `fallback` instead of crashing the app.
 */
export function usePersistedConfig(key: string, fallback: FormConfig) {
  const [initialConfig] = useState<FormConfig>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const result = parseFormConfig(stored);
        if (result.ok) return result.config;
      }
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); use the fallback.
    }
    return fallback;
  });

  const save = useCallback(
    (config: FormConfig) => {
      try {
        window.localStorage.setItem(key, serializeFormConfig(config));
      } catch {
        // Persisting is a convenience only; ignore quota or access errors.
      }
    },
    [key],
  );

  return [initialConfig, save] as const;
}
