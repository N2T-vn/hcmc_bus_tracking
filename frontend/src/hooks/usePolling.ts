/**
 * Custom polling hook for requesting API data on a fixed interval.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true,
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher); // Avoids rebuilding the interval when fetcher changes.
  const inFlightRef = useRef(false); // Prevents concurrent polling requests.

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async (): Promise<void> => {
    // Skip overlapping ticks when the previous request has not completed.
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetcherRef.current();
      setData(response);
      setError(null);
      setLastUpdated(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, refresh]);

  return {
    data,
    error,
    isLoading,
    lastUpdated,
    refresh,
  };
}
