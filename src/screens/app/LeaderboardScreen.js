// screens/app/LeaderboardScreen.jsx
import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ROUTES } from '../../navigations/routes';
import {
  useFetchTopProvidersQuery,
  useFetchMyProviderProfileQuery,
} from '../../redux/service/providerApi';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import TopProvidersPodium from '../../components/TopProvidersPodium';
import RankListRow from '../../components/RankListRow';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const GLOBAL_FETCH_LIMIT = 12;
const DISPLAY_LIMIT = 10;

const TABS = {
  COMMUNITY: 'community',
  GLOBAL: 'global',
};

const LeaderboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();

  const user = useSelector((state) => state.auth.user);
  const isProvider = user?.role === 'provider' || user?.role === 'secretary';

  const [activeTab, setActiveTab] = useState(TABS.COMMUNITY);

  // ── Global: existing top-providers endpoint ────────────────────────────────
  const {
    data: globalTopProviders = [],
    isLoading: isLoadingGlobal,
    isFetching: isFetchingGlobal,
    refetch: refetchGlobal,
  } = useFetchTopProvidersQuery(GLOBAL_FETCH_LIMIT);

  // ── Community: services endpoint — backend resolves the community for ANY
  // role (customer, provider, secretary) via getMemberCommunityHandle(req.user),
  // so this works correctly regardless of who's logged in. We then aggregate
  // services by provider to build the ranked list, instead of filtering an
  // all-providers list by a client-side community-name match. ──
  const {
    data: communityData,
    isLoading: isLoadingCommunity,
    isFetching: isFetchingCommunity,
    refetch: refetchCommunity,
  } = useFetchCommunityServicesQuery({ page: 1, limit: 50 });

  const communityServices = communityData?.services || [];
  const needsCommunity = communityData?.needsCommunity ?? false;

  // ── My profile (for "Your Rank" highlight) ─────────────────────────────────
  // Don't skip based on role — accountStatus pending providers are still providers
  // and should see their rank. We skip only when clearly not a provider.
  const { data: myProfile } = useFetchMyProviderProfileQuery(undefined, {
    skip: !isProvider,
  });
  const myProviderId = myProfile?._id ? String(myProfile._id) : null;

  // ── Build community ranked list by aggregating services per provider ──────
  const communityProviders = useMemo(() => {
    const byProvider = {};
    communityServices.forEach((service) => {
      const provider = service.provider;
      if (!provider?._id) return;
      if (!byProvider[provider._id]) {
        byProvider[provider._id] = {
          _id: provider._id,
          name: provider.user ? [provider.user.firstName, provider.user.lastName].filter(Boolean).join(' ') : '',
          avatar: provider.user?.profileImage || '',
          totalServiceClicks: 0,
          serviceCount: 0,
          providerProfileCount: provider.providerProfileCount || 0,
        };
      }
      byProvider[provider._id].totalServiceClicks += service.serviceOfferingCount || 0;
      byProvider[provider._id].serviceCount += 1;
    });

    return Object.values(byProvider)
      .sort((a, b) => {
        // Primary: total service clicks; secondary: service count
        if (b.totalServiceClicks !== a.totalServiceClicks) {
          return b.totalServiceClicks - a.totalServiceClicks;
        }
        return b.serviceCount - a.serviceCount;
      })
      .slice(0, DISPLAY_LIMIT);
  }, [communityServices]);

  // ── Global list (already ranked by backend) ────────────────────────────────
  const globalProviders = useMemo(
    () => globalTopProviders.slice(0, DISPLAY_LIMIT),
    [globalTopProviders],
  );

  // ── Active list ────────────────────────────────────────────────────────────
  const displayedProviders =
    activeTab === TABS.COMMUNITY ? communityProviders : globalProviders;

  const topThree  = displayedProviders.slice(0, 3);
  const restRanked = displayedProviders.slice(3);

  const isLoading  = activeTab === TABS.COMMUNITY ? isLoadingCommunity  : isLoadingGlobal;
  const isFetching = activeTab === TABS.COMMUNITY ? isFetchingCommunity : isFetchingGlobal;

  // ── My rank in the active list ─────────────────────────────────────────────
  const myRankIndex = useMemo(() => {
    if (!myProviderId) return -1;
    return displayedProviders.findIndex(
      (p) => String(p._id) === myProviderId,
    );
  }, [displayedProviders, myProviderId]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    if (activeTab === TABS.COMMUNITY) {
      refetchCommunity();
    } else {
      refetchGlobal();
    }
  }, [isOnline, activeTab, refetchCommunity, refetchGlobal]);

  const goToProvider = useCallback(
    (provider) => {
      navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: provider._id });
    },
    [navigation],
  );

  // ── Empty state flags ──────────────────────────────────────────────────────
  const showNoCommunity  = activeTab === TABS.COMMUNITY && needsCommunity;
  const showEmptyCommunity =
    activeTab === TABS.COMMUNITY &&
    !needsCommunity &&
    !isLoading &&
    communityProviders.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={scaleFont(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Top Providers
        </Text>
        <View style={{ width: scaleWidth(24) }} />
      </View>

      {/* ── Segmented Pill Tabs ── */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsContainer}>

          <TouchableOpacity
            style={styles.tabBtn}
            activeOpacity={0.8}
            onPress={() => setActiveTab(TABS.COMMUNITY)}
          >
            {activeTab === TABS.COMMUNITY ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabActive}
              >
                <Icon name="people" size={scaleFont(13)} color={COLORS.white} style={styles.tabIcon} />
                <Text style={[styles.tabLabel, styles.tabLabelActive]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  My Community
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}>
                <Icon name="people-outline" size={scaleFont(13)} color={COLORS.textMuted} style={styles.tabIcon} />
                <Text style={styles.tabLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  My Community
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            activeOpacity={0.8}
            onPress={() => setActiveTab(TABS.GLOBAL)}
          >
            {activeTab === TABS.GLOBAL ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabActive}
              >
                <Icon name="globe" size={scaleFont(13)} color={COLORS.white} style={styles.tabIcon} />
                <Text style={[styles.tabLabel, styles.tabLabelActive]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Global
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}>
                <Icon name="globe-outline" size={scaleFont(13)} color={COLORS.textMuted} style={styles.tabIcon} />
                <Text style={styles.tabLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Global
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </View>
      </View>

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline && displayedProviders.length > 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(scaleHeight(16), insets.bottom + scaleHeight(20)) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>

          ) : showNoCommunity ? (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No Community Assigned
              </Text>
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                You haven't joined a Commun community yet. Switch to Global to see all top providers.
              </Text>
            </View>

          ) : showEmptyCommunity ? (
            <View style={styles.emptyState}>
              <Icon name="trophy-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No Providers Yet
              </Text>
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No ranked providers in your community yet. Check back soon or switch to Global.
              </Text>
            </View>

          ) : displayedProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trophy-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No ranked providers yet
              </Text>
            </View>

          ) : (
            <>
              {/* ── Ranks 1–3 Podium ── */}
              <View style={styles.podiumCard}>
                <TopProvidersPodium providers={topThree} onProviderPress={goToProvider} />
              </View>

              {/* ── My rank — shown whenever I'm in the list (any position) ── */}
              {myRankIndex >= 0 && (
                <View style={styles.myRankWrap}>
                  <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Your Rank
                  </Text>
                  <RankListRow
                    provider={displayedProviders[myRankIndex]}
                    rank={myRankIndex + 1}
                    isMe
                    onPress={() => goToProvider(displayedProviders[myRankIndex])}
                  />
                </View>
              )}

              {/* ── Ranks 4–10 ── */}
              {restRanked.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Ranking
                  </Text>
                  {restRanked.map((provider, idx) => (
                    <RankListRow
                      key={provider._id}
                      provider={provider}
                      rank={idx + 4}
                      isMe={provider._id === myProviderId}
                      onPress={() => goToProvider(provider)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background ?? '#F2F2F8',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },

  // ── Segmented Pill Tabs ──
  tabsWrap: {
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(10),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background ?? '#F2F2F8',
    borderRadius: moderateScale(999, 0.3),
    padding: moderateScale(3, 0.3),
  },
  tabBtn: {
    flex: 1,
  },
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(999, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(8),
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(999, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(8),
  },
  tabIcon: {
    marginRight: scaleWidth(4),
  },
  tabLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.white,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: scaleWidth(18),
  },

  // ── States ──
  loader: {
    paddingTop: scaleHeight(60),
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: scaleHeight(60),
    alignItems: 'center',
    paddingHorizontal: scaleWidth(24),
    gap: scaleHeight(8),
  },
  emptyTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: scaleHeight(4),
  },
  emptyText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: scaleFont(19),
  },

  // ── Cards ──
  podiumCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingBottom: scaleHeight(14),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  myRankWrap: {
    marginBottom: scaleHeight(16),
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingTop: scaleHeight(14),
    paddingBottom: scaleHeight(4),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  sectionLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
  },
});

export default LeaderboardScreen;