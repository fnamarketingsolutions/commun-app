// screens/provider/ProvidersScreen.jsx
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import {
  ProviderFeaturedCard,
  ProviderGridCard,
} from '../../components/SharedCards';
import SearchHeader from '../../components/SearchHeader';
import { ROUTES } from '../../navigations/routes';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchAllProvidersQuery,
  useFetchTopProvidersQuery,
  useIncrementProviderProfileCountMutation,
} from '../../redux/service/providerApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const CARD_WIDTH = (width - moderateScale(52, 0.3)) / 2;

const CATEGORIES = [
  { id: 'all',      label: 'All'      },
  { id: 'interior', label: 'Interior' },
  { id: 'home',     label: 'Home'     },
  { id: 'fitness',  label: 'Fitness'  },
  { id: 'design',   label: 'Design'   },
];

// ─── Map a ProviderProfile document → shape SharedCards components expect ─────
const mapProvider = (p) => {
  const primaryService = p.serviceOfferings?.[0];
  const categoryRaw    = primaryService?.serviceCategory || '';
  const coverImage =
    primaryService?.portfolioImages?.[0]?.url ||
    p.user?.profileImage ||
    null;
  const skills = [
    ...new Set(
      (p.serviceOfferings || [])
        .map((s) => s.serviceCategory)
        .filter(Boolean),
    ),
  ];
  return {
    id:          p._id,
    name:        [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || 'Provider',
    role:        categoryRaw || 'Service Provider',
    category:    categoryRaw.toLowerCase(),
    avatar:      p.user?.profileImage || null,
    coverImage,
    skills,
    rating:      primaryService?.averageRating  ?? p.stats?.averageRating  ?? 0,
    reviewCount: primaryService?.reviewCount    ?? p.stats?.totalReviews   ?? 0,
    location:    [p.user?.city, p.user?.state].filter(Boolean).join(', ') || '',
    bio:         p.bio || '',
  };
};

const mapTopProvider = (p) => ({
  id:          p._id,
  name:        p.name || 'Provider',
  role:        'Top Provider',
  category:    'all',
  avatar:      p.avatar || null,
  coverImage:  p.avatar || null,
  skills:      [],
  rating:      0,
  reviewCount: 0,
  location:    '',
});

// ─────────────────────────────────────────────────────────────────────────────
const ProvidersScreen = ({ navigation }) => {
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeCategory,  setActiveCategory]  = useState('all');
  const insets = useSafeAreaInsets();

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data:      allProvidersRaw  = [],
    isLoading: isLoadingAll,
    isError:   isErrorAll,
    refetch:   refetchAll,
    isFetching: isFetchingAll,
  } = useFetchAllProvidersQuery();

  const {
    data:      topProvidersRaw  = [],
    isLoading: isLoadingTop,
    refetch:   refetchTop,
    isFetching: isFetchingTop,
  } = useFetchTopProvidersQuery(6);

  const [incrementCount] = useIncrementProviderProfileCountMutation();

  // ── Stale‑time guard for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  // ── Combined refetch ──
  const refetchAllData = useCallback(() => {
    refetchAll();
    refetchTop();
    lastFetchTime.current = Date.now();
  }, [refetchAll, refetchTop]);

  // ── Auto‑refetch when coming online ──
  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAllData();
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAllData]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAllData();
  }, [refetchAllData, isOnline]);

  // ── Map to UI shape ────────────────────────────────────────────────────────
  const allProviders = useMemo(
    () => allProvidersRaw.map(mapProvider),
    [allProvidersRaw],
  );

  const topProviders = useMemo(
    () => topProvidersRaw.map(mapTopProvider),
    [topProvidersRaw],
  );

  // ── Filters ────────────────────────────────────────────────────────────────
  const matchesCategory = (p) =>
    activeCategory === 'all' ||
    p.category.includes(activeCategory.toLowerCase());

  const matchesSearch = (p) =>
    searchQuery.trim() === '' ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredFeatured = useMemo(
    () => topProviders.filter((p) => matchesCategory(p) && matchesSearch(p)),
    [topProviders, activeCategory, searchQuery],
  );

  const filteredAll = useMemo(
    () => allProviders.filter((p) => matchesCategory(p) && matchesSearch(p)),
    [allProviders, activeCategory, searchQuery],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleProviderPress = (provider) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to view provider details.');
      return;
    }
    incrementCount(provider.id).catch(() => {});
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId:      provider.id,
      sharedElementId: `provider_${provider.id}_avatar`,
    });
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = allProviders.length > 0 || topProviders.length > 0;
  const showOfflineBanner = !isOnline && hasData;
  const isLoading = isLoadingAll || isLoadingTop;
  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <SearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showFilter={false}
          placeholder="Search providers by name or role..."
        />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading providers...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (only if no cached data) ──
  if (isErrorAll && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <SearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showFilter={false}
          placeholder="Search providers by name or role..."
        />
        <View style={styles.centeredState}>
          <Icon name="cloud-offline-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Unable to load providers.
          </Text>
          <Text style={styles.errorSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={false}
        placeholder="Search providers by name or role..."
      />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Providers are still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={(isFetchingAll || isFetchingTop) && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >

          {/* ── Category chips ───────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}
                disabled={!isOnline}
                style={!isOnline && { opacity: 0.6 }}
              >
                {activeCategory === cat.id ? (
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.chipActive}>
                    <Text style={styles.chipTextActive} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {cat.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chipInactive}>
                    <Text style={styles.chipTextInactive} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {cat.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Featured (Top) Providers ─────────────────────────── */}
          {filteredFeatured.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Featured Providers
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => isOnline && navigation.navigate('AllProviders')}
                  disabled={!isOnline}
                  style={!isOnline && { opacity: 0.5 }}
                >
                  <GradientText
                    colors={gradientColors}
                    style={styles.seeAllText}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    See all
                  </GradientText>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredScroll}>
                {filteredFeatured.map((provider) => (
                  <ProviderFeaturedCard
                    key={provider.id}
                    provider={provider}
                    onPress={() => handleProviderPress(provider)}
                    cardWidth={width * 0.62}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* ── All Providers ────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              All Providers
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => isOnline && navigation.navigate('AllProviders')}
              disabled={!isOnline}
              style={!isOnline && { opacity: 0.5 }}
            >
              <GradientText
                colors={gradientColors}
                style={styles.seeAllText}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                See all
              </GradientText>
            </TouchableOpacity>
          </View>

          {filteredAll.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={scaleFont(48)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No providers found
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Try a different category or search term
              </Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {filteredAll.slice(0, 4).map((provider) => (
                <ProviderGridCard
                  key={provider.id}
                  provider={provider}
                  onPress={() => handleProviderPress(provider)}
                  cardWidth={CARD_WIDTH}
                />
              ))}
            </View>
          )}

          {filteredAll.length > 4 && (
            <TouchableOpacity
              style={[styles.viewMoreBtn, !isOnline && { opacity: 0.5 }]}
              onPress={() => isOnline && navigation.navigate('AllProviders')}
              disabled={!isOnline}
            >
              <GradientText
                colors={gradientColors}
                style={styles.viewMoreText}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                View all {filteredAll.length} providers →
              </GradientText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – unchanged ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Loading / Error ──
  centeredState: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    gap: moderateScale(10, 0.3),
  },
  loadingText: {
    fontSize:   scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color:      COLORS.textSecondary,
  },
  errorText: {
    fontSize:   scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color:      '#DC2626',
    textAlign:  'center',
  },
  errorSubtext: {
    fontSize:  scaleFont(FONTS.small),
    color:     COLORS.textMuted,
    textAlign: 'center',
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
  },
  categoriesRow: {
    paddingBottom: scaleHeight(16),
    gap:           scaleWidth(8),
    paddingRight:  scaleWidth(4),
  },
  chipActive: {
    borderRadius:     moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical:  scaleHeight(8),
  },
  chipInactive: {
    borderRadius:     moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical:  scaleHeight(8),
    backgroundColor:  COLORS.card,
    borderWidth:      moderateScale(1, 0.3),
    borderColor:      COLORS.border,
  },
  chipTextActive: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
    color:      COLORS.white,
  },
  chipTextInactive: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color:      COLORS.textMuted,
  },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   scaleHeight(14),
  },
  sectionTitle: {
    fontSize:   scaleFont(18),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },
  seeAllText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
  },
  featuredScroll: {
    paddingBottom: scaleHeight(20),
    gap:           scaleWidth(14),
    paddingRight:  scaleWidth(4),
  },
  gridWrap: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:         moderateScale(12, 0.3),
    alignItems:     'stretch',
  },
  emptyState: {
    alignItems:     'center',
    paddingVertical: scaleHeight(60),
    gap:             scaleHeight(8),
  },
  emptyTitle: {
    fontSize:   scaleFont(16),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textMuted,
  },
  emptySubtitle: {
    fontSize:  scaleFont(13),
    color:     COLORS.textMuted,
    textAlign: 'center',
  },
  viewMoreBtn: {
    alignItems:     'center',
    marginTop:       scaleHeight(20),
    marginBottom:    scaleHeight(10),
    paddingVertical: scaleHeight(12),
  },
  viewMoreText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
  },

  // kept from original (unused but preserving stylesheet completeness)
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingTop:     scaleHeight(6),
    paddingBottom:  scaleHeight(8),
  },
  headerGreeting: {
    fontSize:   scaleFont(13),
    color:      COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  headerTitle: {
    fontSize:   scaleFont(24),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
    marginTop:  scaleHeight(1),
  },
  headerIconBtn: {
    width:           moderateScale(40, 0.3),
    height:          moderateScale(40, 0.3),
    borderRadius:    moderateScale(20, 0.3),
    backgroundColor: COLORS.card,
    alignItems:      'center',
    justifyContent:  'center',
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius:  moderateScale(4, 0.3),
    elevation: 2,
  },
  notifDot: {
    position:        'absolute',
    top:             moderateScale(8, 0.3),
    right:           moderateScale(8, 0.3),
    width:           moderateScale(7, 0.3),
    height:          moderateScale(7, 0.3),
    borderRadius:    moderateScale(3.5, 0.3),
    backgroundColor: COLORS.gradientEnd,
    borderWidth:     moderateScale(1.5, 0.3),
    borderColor:     COLORS.white,
  },
});

export default ProvidersScreen;