import { useState, useCallback } from "react";

export interface UseAiResult<T> {
  execute: (...args: any[]) => Promise<T | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAi<T>(fn: (...args: any[]) => Promise<T>): UseAiResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (err: any) {
        const msg = err?.message ?? "AI assistant is temporarily unavailable.";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, loading, error, clearError };
}
