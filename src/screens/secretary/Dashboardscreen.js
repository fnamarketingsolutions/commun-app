// screens/secretary/DashboardScreen.jsx
import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

import {
  useFetchPendingRegistrationsQuery,
  useFetchCommunityMembersQuery,
  useFetchCommunityMembersCountQuery, 
  useFetchBroadcastsQuery,
  useFetchCommunityEventsQuery,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const DashboardScreen = () => {
  const navigation = useNavigation();

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Queries ──
  const {
    data: pendingRegistrations = [],
    isLoading: isLoadingPending,
    isFetching: isFetchingPending,
    refetch: refetchPending,
    isError: isErrorPending,
    error: errorPending,
  } = useFetchPendingRegistrationsQuery();

 const {
  data: membersCount = 0,
  isLoading: isLoadingMembers,
  isFetching: isFetchingMembers,
  refetch: refetchMembers,
  isError: isErrorMembers,
  error: errorMembers,
} = useFetchCommunityMembersCountQuery();

  const {
    data: broadcastsData,
    isLoading: isLoadingBroadcasts,
    isFetching: isFetchingBroadcasts,
    refetch: refetchBroadcasts,
    isError: isErrorBroadcasts,
    error: errorBroadcasts,
  } = useFetchBroadcastsQuery();

  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    isFetching: isFetchingEvents,
    refetch: refetchEvents,
    isError: isErrorEvents,
    error: errorEvents,
  } = useFetchCommunityEventsQuery();

  // ── Combined refetch ──
  const refetchAll = useCallback(() => {
    refetchPending();
    refetchMembers();
    refetchBroadcasts();
    refetchEvents();
  }, [refetchPending, refetchMembers, refetchBroadcasts, refetchEvents]);

  // ── Stale‑time guard for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  // ── Auto‑refetch when coming online ──
  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAll();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAll();
    lastFetchTime.current = Date.now();
  }, [refetchAll, isOnline]);

  const broadcasts = broadcastsData?.broadcasts || [];
  const events = eventsData?.events || [];

 const communityHandle =
  broadcastsData?.communityCommunName ||
  eventsData?.communityCommunName ||
  '';

const hasData =
  pendingRegistrations.length > 0 ||
  membersCount > 0 ||
  broadcasts.length > 0 ||
  events.length > 0 ||
  communityHandle !== '';

  const showOfflineBanner = !isOnline && hasData;

  // ── Combined loading (only for initial full‑screen loader) ──
  const isLoading = isLoadingPending || isLoadingMembers || isLoadingBroadcasts || isLoadingEvents;

  // ── Error state ──
  const hasError = isErrorPending || isErrorMembers || isErrorBroadcasts || isErrorEvents;
  const errorMessage =
    errorPending?.data?.message ||
    errorMembers?.data?.message ||
    errorBroadcasts?.data?.message ||
    errorEvents?.data?.message ||
    'Unable to load dashboard data.';

  // ── Full‑screen loader on initial load without cached data ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Dashboard
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (only if no cached data) ──
  if (hasError && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Dashboard
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {errorMessage}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dashboardTiles = [
    {
      key: 'approve',
      icon: 'clipboard-outline',
      count: pendingRegistrations.length,
      title: 'Approve / reject',
      subtitle: 'Review pending signups and provider applications',
      screen: 'ApproveProviders',
    },
    {
  key: 'members',
  icon: 'people-outline',
  count: membersCount,   // ← was members.length
  title: 'Member list',
  subtitle: 'View everyone in your Commun community',
  screen: 'CommunityMembers',
},
    {
      key: 'broadcast',
      icon: 'megaphone-outline',
      count: broadcasts.length,
      title: 'Broadcast',
      subtitle: 'Send neighbourhood updates to your community',
      screen: 'BroadcastMessage',
    },
    {
      key: 'events',
      icon: 'calendar-outline',
      count: events.length,
      title: 'Events',
      subtitle: 'Create and manage community events',
      screen: 'CommunityEvents',
    },
  ];

  const handleTilePress = screen => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to access this feature.');
      return;
    }
    navigation.navigate(screen);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Dashboard
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Dashboard data is still available."
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={
                (isFetchingPending || isFetchingMembers || isFetchingBroadcasts || isFetchingEvents) &&
                isOnline
              }
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          <Text style={styles.description} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Welcome to your secretary workspace{' '}
            <Text style={styles.linkText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              ({communityHandle})
            </Text>
            . Tap a tile below to open each section.
          </Text>

          <View style={styles.grid}>
            {dashboardTiles.map(tile => (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, !isOnline && { opacity: 0.6 }]}
                activeOpacity={isOnline ? 0.7 : 1}
                onPress={() => handleTilePress(tile.screen)}
                disabled={!isOnline}
              >
                <View style={styles.tileTopRow}>
                  <View style={[styles.iconCircle, { backgroundColor: COLORS.white + '15' }]}>
                    <Icon
                      name={tile.icon}
                      size={scaleFont(18)}
                      color={isOnline ? COLORS.gradientStart : COLORS.textMuted}
                    />
                  </View>
                  <Text style={[styles.tileCount, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {tile.count}
                  </Text>
                </View>

                <Text style={[styles.tileTitle, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {tile.title}
                </Text>
                <Text style={[styles.tileSubtitle, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {tile.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – updated back button, retry, and tile icon colors ────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: scaleWidth(24),
  },
  headerSpacer: {
    width: scaleWidth(24),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(32),
  },
  description: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(24),
  },
  linkText: {
    color: COLORS.link,
    fontWeight: FONTS.weightSemiBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(14),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(14),
  },
  iconCircle: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCount: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  tileTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  tileSubtitle: {
    fontSize: scaleFont(12.5),
    color: COLORS.textMuted,
    lineHeight: moderateScale(17, 0.3),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
    marginTop: scaleHeight(12),
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default DashboardScreen;