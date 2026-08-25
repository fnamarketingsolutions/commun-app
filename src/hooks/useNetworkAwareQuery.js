// hooks/useNetworkAwareQuery.js
import { useCallback, useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Wraps any RTK Query hook with network‑aware refetch and pull‑to‑refresh.
 * @param {Function} queryHook - The RTK Query hook (e.g., useFetchActiveCategoriesQuery)
 * @param {*} [args] - Arguments to pass to the query hook
 * @param {Object} [options] - Options for the query hook (skip, polling, etc.)
 * @param {number} [staleTime=30000] - Minimum time (ms) between automatic refetches
 * @returns {Object} - Enhanced query result plus onRefresh, isOnline, etc.
 */
export function useNetworkAwareQuery(queryHook, args, options, staleTime = 30000) {
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // Call the original RTK Query hook
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = queryHook(args, {
    ...options,
    skip: options?.skip || false,
  });

  const lastFetchTime = useRef(Date.now());

  // Auto‑refetch when coming back online
  useEffect(() => {
    if (!isOnline) return;

    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > staleTime) {
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500); // debounce

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, refetch, staleTime, resetOfflineFlag]);

  // Update last fetch time after a successful fetch (ignore initial mount)
  useEffect(() => {
    if (!isFetching && data !== undefined && !isLoading) {
      lastFetchTime.current = Date.now();
    }
  }, [isFetching, data, isLoading]);

  // Pull‑to‑refresh handler
  const onRefresh = useCallback(() => {
    if (!isOnline) {
      // Optionally show a toast: "You are offline"
      return;
    }
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    onRefresh,
    isOnline,
    showOfflineBanner: !isOnline && data !== undefined,
  };
}