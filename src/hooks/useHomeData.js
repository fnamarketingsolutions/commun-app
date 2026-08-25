// hooks/useHomeData.js
import { useMemo, useRef, useCallback, useEffect } from 'react';
import {
  useFetchAllProvidersQuery,
  useFetchTopProvidersQuery,
} from '../redux/service/providerApi';
import { useFetchActiveCategoriesQuery } from '../redux/service/adminApi';
import { useNetworkStatus } from './useNetworkStatus';

// Kept in sync with LEADERBOARD_LIMIT in screens/app/LeaderboardScreen.jsx —
// same limit means the same RTK Query cache key, so HomeScreen's preview and
// the full Leaderboard screen share one cache entry and always agree.
const TOP_PROVIDERS_LIMIT = 10;

export function useHomeData() {
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Individual queries ──
  const {
    data: providers = [],
    isLoading: isLoadingProviders,
    isFetching: isFetchingProviders,
    refetch: refetchProviders,
  } = useFetchAllProvidersQuery();

  const {
    data: topProviders = [],
    isLoading: isLoadingTop,
    isFetching: isFetchingTop,
    refetch: refetchTop,
  } = useFetchTopProvidersQuery(TOP_PROVIDERS_LIMIT);

  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    isFetching: isFetchingCategories,
    refetch: refetchCategories,
  } = useFetchActiveCategoriesQuery();

  // ── Combined loading / fetching ──
  const isLoading = isLoadingProviders || isLoadingTop || isLoadingCategories;
  const isFetching = isFetchingProviders || isFetchingTop || isFetchingCategories;

  // ── Stale‑time tracking for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000; // 30 seconds

  // ── Refetch all ──
  const refetchAll = useCallback(() => {
    refetchProviders();
    refetchTop();
    refetchCategories();
    lastFetchTime.current = Date.now();
  }, [refetchProviders, refetchTop, refetchCategories]);

  // ── Auto‑refetch when coming online ──
  useEffect(() => {
    if (!isOnline) return;

    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAll();
        }
        resetOfflineFlag();
      }, 500); // debounce

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) {
      // Optionally show a toast "You are offline"
      return;
    }
    refetchAll();
  }, [refetchAll, isOnline]);

  // ── Determine if we have any cached data to show offline ──
  const hasData = providers.length > 0 || topProviders.length > 0 || categoriesData?.categories?.length > 0;

  return {
    providers,
    topProviders,
    categoriesData,
    isLoading,
    isFetching,
    isOnline,
    showOfflineBanner: !isOnline && hasData,
    onRefresh,
    refetchAll,
  };
}