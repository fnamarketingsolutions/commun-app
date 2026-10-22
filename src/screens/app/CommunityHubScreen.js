// screens/app/CommunityHubScreen.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

import { useTabBarHeight } from '../../navigations/BottomTabNavigator';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useCommunityFeaturesQuery } from '../../redux/service/api';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';
import { CommunityHubSkeleton } from '../../components/common/CommunityHubSkeletons';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// CH1 FIX: BOTTOM_TAB_HEIGHT is now computed from useTabBarHeight() inside the
// component, so it correctly includes safe area insets on all devices.

// ── Secretary panels ──────────────────────────────────────────────────────────
const SECRETARY_PANELS = [
  {
    id: 'chat',
    label: 'Chat',
    desc: 'Community conversations',
    icon: 'chatbubbles-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.COMMUNITY_CHAT,
  },
  {
    id: 'vendors',
    label: 'Vendors',
    desc: 'Manage trusted local vendors',
    icon: 'storefront-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.SECRETARY_VENDORS,
  },
  {
    id: 'emergency',
    label: 'Emergency Contacts',
    desc: 'Manage emergency numbers',
    icon: 'call-outline',
    iconBg: '#EF444415',
    iconColor: '#EF4444',
    route: ROUTES.SECRETARY_EMERGENCY_CONTACTS,
  },
  {
    id: 'events',
    label: 'Events',
    desc: 'Create and manage community events',
    icon: 'calendar-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.COMMUNITY_EVENT,
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    desc: 'Send announcements to residents',
    icon: 'megaphone-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.BROADCAST,
  },
  {
    id: 'localBusinesses',
    label: 'Local Businesses',
    desc: 'Onboard local businesses and manage community discount offers.',
    icon: 'storefront-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.SECRETARY_LOCAL_BUSINESSES,
  },
];

// ── Provider / Customer panels ──────────────────────────────────────────────
const CHAT_PANEL = {
  id: 'chat',
  label: 'Chat',
  desc: 'Community conversations',
  icon: 'chatbubbles-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  route: ROUTES.COMMUNITY_CHAT,
};

const VENDORS_PANEL = {
  id: 'vendors',
  label: 'Vendors',
  desc: 'Local businesses in your community',
  icon: 'storefront-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  route: ROUTES.VENDORS,
};

const EMERGENCY_PANEL = {
  id: 'emergency',
  label: 'Emergency Contacts',
  desc: 'Critical numbers for your community',
  icon: 'call-outline',
  iconBg: '#EF444415',
  iconColor: '#EF4444',
  route: ROUTES.EMERGENCYCONTACTS,
};

const EVENTS_PANEL = {
  id: 'events',
  label: 'Events',
  desc: 'Upcoming community events',
  icon: 'calendar-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  route: ROUTES.PROVIDER_EVENTS,
};

const BROADCAST_PANEL = {
  id: 'broadcast',
  label: 'Broadcast',
  desc: 'Community announcements',
  icon: 'megaphone-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  route: ROUTES.PROVIDER_BROADCAST,
};

// ── NEW: Local Businesses panel for provider/customer ──────────────────────
const LOCAL_BUSINESSES_PANEL = {
  id: 'localBusinesses',
  label: 'Local Businesses',
  desc: 'Browse local businesses and community offers',
  icon: 'storefront-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  route: ROUTES.ALL_LOCAL_BUSINESSES,
};

// ─────────────────────────────────────────────────────────────────────────────
const CommunityHubScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight(); // CH1: reactive tab bar height (includes insets)
  const [activeId, setActiveId] = useState(null);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Auth user / community status ──
  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const isPublicMember = user?.isPublicMember ?? false;
  const communityPending = useMemo(() => isCommunityPending(user), [user]);

  // ── Public users now show the "No Official Community" screen ──
  const shouldShowCommunityMissing =
    !isSecretary && !userCommunityName && !communityPending;

  // ── Feature toggles (secretary always sees everything, so skip the query) ──
  const {
    data: featuresData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCommunityFeaturesQuery(undefined, { skip: isSecretary });

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;
  const canRefetch = !isSecretary;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline && canRefetch) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetch, canRefetch]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    if (canRefetch) {
      refetch();
      lastFetchTime.current = Date.now();
    }
  }, [refetch, isOnline, canRefetch]);

  const features = featuresData?.data || {};

  // ── Build panel list based on role ──
  const panels = isSecretary
    ? SECRETARY_PANELS
    : [
        CHAT_PANEL,
        VENDORS_PANEL,
        EMERGENCY_PANEL,
        // ── Always show Local Businesses for provider/customer ──
        LOCAL_BUSINESSES_PANEL,
        ...(features.events ? [EVENTS_PANEL] : []),
        ...(features.broadcast ? [BROADCAST_PANEL] : []),
      ];

  const handlePress = (panel) => {
    setActiveId(panel.id);
    setTimeout(() => {
      navigation?.navigate(panel.route);
      setActiveId(null);
    }, 150);
  };

  // ── No official community ──
  if (shouldShowCommunityMissing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Hub
          </Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.communityMissingContainer}>
          <LottieView
            source={require('../../assets/animations/not_found.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.communityMissingTitle} maxFontSizeMultiplier={1.3}>
            No Official Community
          </Text>
          <Text style={styles.communityMissingSubtitle} maxFontSizeMultiplier={1.3}>
            You are not part of any official community yet. Join one to access the Community Hub.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Hub
          </Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.pendingWrap}>
          <LottieView
            source={require('../../assets/animations/CatTyping.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.pendingTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Waiting for Approval
          </Text>
          <Text style={styles.pendingMessage} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Your community secretary is reviewing your request. The Community Hub will unlock once you're approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasData = isSecretary || !!featuresData;
  const showOfflineBanner = !isOnline && hasData;

  if (!isSecretary && isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Hub
          </Text>
        </View>
        <View style={styles.headerDivider} />
        <CommunityHubSkeleton count={5} />
      </SafeAreaView>
    );
  }

  if (!isSecretary && isError && !hasData) {
    const message = error?.data?.message || 'Unable to load features.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Hub
          </Text>
        </View>
        <View style={styles.headerDivider} />
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

  // ── Main hub ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Community Hub
        </Text>
      </View>
      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. The hub features are still available."
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + tabBarHeight + moderateScale(16, 0.3),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline && canRefetch}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {isSecretary
              ? 'Manage vendors, emergency contacts, events, broadcasts, and chat for your community.'
              : 'Connect with your community through chat, vendors, emergency contacts, and more.'}
          </Text>

          {panels.map((panel) => {
            const isActive = activeId === panel.id;
            const disabled = !isOnline;

            return (
              <TouchableOpacity
                key={panel.id}
                style={[
                  styles.card,
                  disabled && { opacity: 0.5 },
                  isActive && styles.cardActive,
                ]}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => handlePress(panel)}
                disabled={disabled}
              >
                <View style={[styles.iconCircle, { backgroundColor: panel.white }]}>
                  <Icon
                    name={panel.icon}
                    size={scaleFont(24)}
                    color={disabled ? COLORS.textMuted : panel.iconColor}
                  />
                </View>

                <View style={styles.cardTextContainer}>
                  <Text
                    style={[styles.cardTitle, disabled && { color: COLORS.textMuted }]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    {panel.label}
                  </Text>
                  <Text
                    style={[styles.cardDescription, disabled && { color: COLORS.textMuted }]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    {panel.desc}
                  </Text>
                </View>

                <Icon name="chevron-forward" size={scaleFont(20)} color={COLORS.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  subtitle: {
    fontSize: scaleFont(16),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(24, 0.3),
    marginBottom: scaleHeight(24),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  cardActive: {
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
  },
  iconCircle: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(26, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(16),
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  cardTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  cardDescription: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    lineHeight: moderateScale(19, 0.3),
  },

  // ── Missing community state ──
  communityMissingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    paddingBottom: scaleHeight(30),
  },
  lottieAnimation: {
    width: moderateScale(200, 0.3),
    height: moderateScale(200, 0.3),
  },
  communityMissingTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(16),
    textAlign: 'center',
  },
  communityMissingSubtitle: {
    fontSize: scaleFont(16),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scaleHeight(10),
    lineHeight: moderateScale(24, 0.3),
  },

  // ── Pending approval state ──
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
  },
  lottie: {
    width: moderateScale(220, 0.3),
    height: moderateScale(220, 0.3),
    marginBottom: scaleHeight(8),
  },
  pendingTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: scaleFont(13.5),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
});

export default CommunityHubScreen;