// screens/provider/AllProvidersScreen.jsx
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ProviderGridCard } from '../../components/SharedCards';
import SearchHeader from '../../components/SearchHeader';
import {
  useFetchAllProvidersQuery,
  useIncrementProviderProfileCountMutation,
} from '../../redux/service/providerApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

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

// ─── Same mapper as ProvidersScreen ──────────────────────────────────────────
const mapProvider = (p) => {
  const primaryService = p.serviceOfferings?.[0];
  const categoryRaw    = primaryService?.serviceCategory || '';
  const coverImage =
    primaryService?.portfolioImages?.[0]?.url ||
    p.user?.profileImage ||
    null;
  const skills = [
    ...new Set(
      (p.serviceOfferings || []).map((s) => s.serviceCategory).filter(Boolean),
    ),
  ];
  return {
    id:          p._id,
    name:        [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || 'Provider',
    role:        categoryRaw || 'Service Provider',
    category:    categoryRaw.toLowerCase(),
    avatar:      p.user?.profileImage || null,
    coverImage,
    isVerified:  true,
    skills,
    rating:      primaryService?.averageRating ?? p.stats?.averageRating ?? 0,
    reviewCount: primaryService?.reviewCount   ?? p.stats?.totalReviews  ?? 0,
    location:    [p.user?.city, p.user?.state].filter(Boolean).join(', ') || '',
    bio:         p.bio || '',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
const AllProvidersScreen = ({ navigation }) => {
  const [searchQuery,    setSearchQuery]    = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const insets = useSafeAreaInsets();

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data:      rawProviders = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useFetchAllProvidersQuery();

  const [incrementCount] = useIncrementProviderProfileCountMutation();

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
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetch]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline]);

  // ── Map + filter ──────────────────────────────────────────────────────────
  const allProviders = useMemo(
    () => rawProviders.map(mapProvider),
    [rawProviders],
  );

  const filteredProviders = useMemo(() => {
    return allProviders.filter((p) => {
      const categoryMatch =
        activeCategory === 'all' ||
        p.category.includes(activeCategory.toLowerCase());
      const searchMatch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [allProviders, activeCategory, searchQuery]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleProviderPress = (provider) => {
    if (isOnline) {
      incrementCount(provider.id).catch(() => {});
    }
    navigation?.navigate('ProviderProfile', { providerId: provider.id });
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = allProviders.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            All Providers
          </Text>
          <View style={{ width: moderateScale(40, 0.3) }} />
        </View>
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
  if (isError && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            All Providers
          </Text>
          <View style={{ width: moderateScale(40, 0.3) }} />
        </View>
        <View style={styles.centeredState}>
          <Icon name="cloud-offline-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Unable to load providers.
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          All Providers
        </Text>
        <View style={{ width: moderateScale(40, 0.3) }} />
      </View>

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={false}
        placeholder="Search providers by name or role..."
      />

      {/* ── Wrap scrollable content with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
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
          {/* ── Category chips ─────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}>
                {activeCategory === cat.id ? (
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
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

          {/* ── Count ──────────────────────────────────────────────── */}
          <View style={styles.countContainer}>
            <Text style={styles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {/* ── Grid / Empty ───────────────────────────────────────── */}
          {filteredProviders.length === 0 ? (
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
              {filteredProviders.map((provider) => (
                <ProviderGridCard
                  key={provider.id}
                  provider={provider}
                  onPress={() => handleProviderPress(provider)}
                  cardWidth={CARD_WIDTH}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – updated colors to gradientStart ─────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Header ──
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingTop:        scaleHeight(16),
    paddingBottom:     scaleHeight(16),
    backgroundColor:   COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: moderateScale(4, 0.3) },
  headerTitle: {
    fontSize:   scaleFont(20),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },

  // ── Loading / Error ──
  centeredState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             moderateScale(10, 0.3),
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
    borderRadius:      moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical:   scaleHeight(8),
  },
  chipInactive: {
    borderRadius:      moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical:   scaleHeight(8),
    backgroundColor:   COLORS.card,
    borderWidth:       moderateScale(1, 0.3),
    borderColor:       COLORS.border,
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
  countContainer: {
    marginBottom: scaleHeight(12),
    marginTop:    scaleHeight(4),
  },
  countText: {
    fontSize:   scaleFont(13),
    color:      COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  gridWrap: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:          moderateScale(12, 0.3),
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
});

export default AllProvidersScreen;