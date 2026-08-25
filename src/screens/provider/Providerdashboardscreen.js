// screens/provider/ProviderDashboardScreen.jsx
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchProviderDashboardStatsQuery,
  useFetchMyProviderProfileQuery,
} from '../../redux/service/providerApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFullName = (user) => {
  if (!user) return '';
  const first = user.firstName || '';
  const last  = user.lastName  || '';
  return [first, last].filter(Boolean).join(' ') || 'Provider';
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, subtext, color = COLORS.gradientStart }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={scaleFont(20)} color={color} />
    </View>
    <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {value}
    </Text>
    <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
    {subtext && (
      <Text style={styles.statSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {subtext}
      </Text>
    )}
  </View>
);

// ─── Action Button ─────────────────────────────────────────────────────────────
const ActionButton = ({ icon, label, onPress, gradient = false, disabled = false }) => {
  if (gradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.actionBtnWrap, disabled && { opacity: 0.5 }]}
        disabled={disabled}
      >
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionBtnGradient}>
          <Icon name={icon} size={scaleFont(18)} color={COLORS.white} style={{ marginRight: moderateScale(6, 0.3) }} />
          <Text
            style={styles.actionBtnText}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            numberOfLines={1}
            ellipsizeMode="tail">
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.actionBtnOutline, disabled && { opacity: 0.5, borderColor: COLORS.border }]}
      disabled={disabled}
    >
      <Icon name={icon} size={scaleFont(18)} color={disabled ? COLORS.textMuted : COLORS.gradientStart} style={{ marginRight: moderateScale(6, 0.3) }} />
      <Text
        style={[styles.actionBtnTextOutline, disabled && { color: COLORS.textMuted }]}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        numberOfLines={1}
        ellipsizeMode="tail">
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Engagement Item ──────────────────────────────────────────────────────────
const EngagementItem = ({ category, clicks }) => (
  <View style={styles.engagementItem}>
    <Text style={styles.engagementCategory} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {category || 'Service'}
    </Text>
    <Text style={styles.engagementClicks} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {clicks || 0} click{(clicks || 0) === 1 ? '' : 's'}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProviderDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth.user);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Dashboard stats ──
  const {
    data: dashboardStats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchProviderDashboardStatsQuery();

  // ── Provider profile (for "View public profile" button) ──
  const {
    data: providerProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useFetchMyProviderProfileQuery();

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  const refetchAll = useCallback(() => {
    if (!isOnline) return;
    refetch();
    refetchProfile();
    lastFetchTime.current = Date.now();
  }, [refetch, refetchProfile, isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAll();
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAll();
  }, [refetchAll, isOnline]);

  // ── Data ──
  const totalServices     = dashboardStats?.totalServices      ?? 0;
  const serviceClicks     = dashboardStats?.serviceClicks      ?? 0;
  const averageRating     = dashboardStats?.averageRating      ?? 0;
  const totalReviews      = dashboardStats?.totalReviews       ?? 0;
  const profileViews      = dashboardStats?.profileViews       ?? 0;
  const serviceClickDetails = dashboardStats?.serviceClickDetails ?? [];

  const hasData = !!dashboardStats;
  const showOfflineBanner = !isOnline && hasData;

  // ── Loading ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Dashboard
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (isError && !hasData) {
    const message = error?.data?.message || 'Unable to load dashboard.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Dashboard
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {message}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Dashboard
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Dashboard data is still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + moderateScale(24, 0.3),
              paddingTop: scaleHeight(16),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          {/* ── Welcome message ── */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeGreeting} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {getFullName(user)}
            </Text>
            {user?.communName && (
              <Text style={styles.welcomeCommun} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Welcome to {user.communName}
              </Text>
            )}
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatCard
              icon="briefcase-outline"
              label="Active Services"
              value={totalServices}
              color="#10B981"
            />
            <StatCard
              icon="eye-outline"
              label="Service Clicks"
              value={serviceClicks}
              color={COLORS.gradientStart}
            />
            <StatCard
              icon="star-outline"
              label="Avg. Rating"
              value={averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              subtext={`${totalReviews} reviews`}
              color="#F59E0B"
            />
          </View>

          {/* ── Action buttons ── */}
          <View style={styles.actionsRow}>
            <ActionButton
              icon="add-circle-outline"
              label="Manage Services"
              onPress={() => navigation?.navigate('ManageServices')}
              gradient
              disabled={!isOnline}
            />
            <ActionButton
              icon="person-outline"
              label="Update Profile"
              onPress={() => navigation?.navigate('UpdateProviderProfile')}
              disabled={!isOnline}
            />
          </View>

          {/* ── Engagement section ── */}
          <View style={styles.engagementCard}>
            <View style={styles.engagementHeader}>
              <View style={styles.engagementHeaderLeft}>
                <View style={styles.engagementIconWrap}>
                  <Icon name="eye-outline" size={scaleFont(16)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.engagementTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Engagement
                </Text>
              </View>
              <Text style={styles.engagementSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Profile views: {profileViews}
              </Text>
            </View>

            {serviceClickDetails.length === 0 ? (
              <View style={styles.engagementEmpty}>
                <Text style={styles.engagementEmptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No services yet. Add a service to start tracking clicks.
                </Text>
              </View>
            ) : (
              <View style={styles.engagementList}>
                {serviceClickDetails.map((service, index) => (
                  <EngagementItem
                    key={service.id || index}
                    category={service.serviceCategory}
                    clicks={service.clicks}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── View public profile button ── */}
          {providerProfile?._id && (
            <TouchableOpacity
              style={styles.viewProfileBtn}
              activeOpacity={0.7}
              onPress={() => navigation?.navigate('ProviderProfile', { providerId: providerProfile._id })}
              disabled={!isOnline}
            >
              <Icon name="open-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
              <Text style={[styles.viewProfileBtnText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                View Public Profile
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: moderateScale(40, 0.3),
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(20),
    gap: moderateScale(10, 0.3),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(14, 0.3),
    alignItems: 'center',
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  statIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(6),
  },
  statValue: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
    marginTop: scaleHeight(2),
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: scaleFont(10),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: moderateScale(12, 0.3),
    marginBottom: scaleHeight(20),
  },
  actionBtnWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.gradientStart,
    shadowOffset: { width: 0, height: moderateScale(4, 0.3) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12, 0.3),
    paddingHorizontal: moderateScale(10, 0.3),
  },
  actionBtnText: {
    fontSize: scaleFont(FONTS.button - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
    flexShrink: 1,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12, 0.3),
    paddingHorizontal: moderateScale(10, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.white,
  },
  actionBtnTextOutline: {
    fontSize: scaleFont(FONTS.button - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
    letterSpacing: moderateScale(0.3, 0.1),
    flexShrink: 1,
  },
  welcomeSection: {
    marginBottom: scaleHeight(16),
  },
  welcomeGreeting: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  welcomeCommun: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  engagementCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(20),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
    flexWrap: 'wrap',
  },
  engagementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  engagementIconWrap: {
    width: moderateScale(30, 0.3),
    height: moderateScale(30, 0.3),
    borderRadius: moderateScale(8, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  engagementSubtext: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  engagementEmpty: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: moderateScale(24, 0.3),
    alignItems: 'center',
  },
  engagementEmptyText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  engagementList: {
    gap: scaleHeight(8),
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.sm, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
  },
  engagementCategory: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(8),
  },
  engagementClicks: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
    marginBottom: scaleHeight(8),
  },
  viewProfileBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
});

export default ProviderDashboardScreen;