// screens/app/CategoriesScreen.jsx
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useFetchActiveCategoriesQuery } from '../../redux/service/adminApi';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { getIoniconName, getIconGradient } from '../../utils/categoryIconMap';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const MAX_KEYWORDS_SHOWN = 4;

// ─── Single category card ─────────────────────────────────────────────────────
const CategoryCard = ({ item, onPress }) => {
  const iconName = getIoniconName(item.icon);
  // Same lookup as CategorySection (home) so a given category always
  // renders with the same icon box color on every screen.
  const gradientColors = getIconGradient(item.name || item._id);
  const keywords = (item.keywords || []).slice(0, MAX_KEYWORDS_SHOWN);
  const extraKeywordCount = (item.keywords || []).length - keywords.length;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.cardTopRow}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Icon name={iconName} size={scaleFont(26)} color={COLORS.white} />
        </LinearGradient>

        <View style={styles.cardTitleWrap}>
          <Text
            style={styles.cardName}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {item.name}
          </Text>
          {(item.subCategories?.length || 0) > 0 && (
            <Text
              style={styles.cardSub}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            >
              {item.subCategories.length} sub-{item.subCategories.length === 1 ? 'category' : 'categories'}
            </Text>
          )}
        </View>

        <Icon
          name="chevron-forward"
          size={scaleFont(18)}
          color={COLORS.textMuted}
        />
      </View>

      {keywords.length > 0 && (
        <View style={styles.chipsRow}>
          {keywords.map((keyword) => (
            <View key={keyword} style={styles.chip}>
              <Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {keyword}
              </Text>
            </View>
          ))}
          {extraKeywordCount > 0 && (
            <View style={[styles.chip, styles.chipMore]}>
              <Text style={[styles.chipText, styles.chipMoreText]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                +{extraKeywordCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CategoriesScreen = ({ navigation, route }) => {
  // Optional: if navigated from a chip tap, pre-highlight that category
  const preSelected = route?.params?.category || null;

  // ── RTK Query ──
  const {
    data: categoriesData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useFetchActiveCategoriesQuery();

  const allCategories = categoriesData?.categories || [];

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Stale‑time guard for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000; // 30 seconds

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

  // ── Search state ──
  const [search, setSearch] = useState('');

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return allCategories;
    const q = search.trim().toLowerCase();
    return allCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.subCategories || []).some((s) => s.toLowerCase().includes(q)) ||
        (c.keywords || []).some((k) => k.toLowerCase().includes(q))
    );
  }, [allCategories, search]);

  const handleCategoryPress = (category) => {
    navigation.navigate(ROUTES.CATEGORY_SERVICES, { categoryName: category.name });
  };

  const renderItem = ({ item }) => (
    <CategoryCard item={item} onPress={() => handleCategoryPress(item)} />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="albums-outline" size={scaleFont(48)} color={COLORS.border} />
        <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {search.trim() ? 'No results found' : 'No Categories Yet'}
        </Text>
        <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {search.trim()
            ? `No categories match "${search}"`
            : 'Check back soon for available categories.'}
        </Text>
      </View>
    );
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = allCategories.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            All Categories
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          All Categories
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Icon
          name="search-outline"
          size={scaleFont(18)}
          color={COLORS.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content with offline banner ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
      >
        {isError && !isLoading ? (
          <View style={styles.emptyState}>
            <Icon name="alert-circle-outline" size={scaleFont(48)} color={COLORS.border} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Failed to load
            </Text>
            <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Please check your connection and try again.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Count bar ── */}
            {!isLoading && filtered.length > 0 && (
              <View style={styles.countBar}>
                <Text style={styles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {filtered.length} {filtered.length === 1 ? 'category' : 'categories'}
                  {search.trim() ? ' found' : ''}
                </Text>
              </View>
            )}

            {/* ── List ── */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id || item.name}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
              ItemSeparatorComponent={() => <View style={{ height: scaleHeight(12) }} />}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching && isOnline}
                  onRefresh={onRefresh}
                  enabled={isOnline}
                  tintColor={COLORS.primary}
                />
              }
            />
          </>
        )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(24) },
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

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scaleWidth(20),
    marginTop: scaleHeight(14),
    marginBottom: scaleHeight(4),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: scaleWidth(8) },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    padding: 0,
  },

  // Count bar
  countBar: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(10),
    paddingBottom: scaleHeight(4),
  },
  countText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightSemiBold,
  },

  // List
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(32),
  },

  // Card (single-column, website-style)
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(14, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(16, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
    marginLeft: scaleWidth(12),
    marginRight: scaleWidth(8),
  },
  cardName: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  cardSub: {
    fontSize: scaleFont(11.5),
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: scaleHeight(10),
    gap: scaleWidth(6),
  },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.pill ?? 999, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
  },
  chipMore: {
    backgroundColor: COLORS.white,
  },
  chipMoreText: {
    color: COLORS.textMuted,
  },

  // Loading / Empty
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(40),
    paddingTop: scaleHeight(60),
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
  },
  emptySubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },
});

export default CategoriesScreen;