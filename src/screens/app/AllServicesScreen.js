// screens/app/AllServicesScreen.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { useSelector } from 'react-redux';

import { useFetchAllProvidersQuery } from '../../redux/service/providerApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ServiceGridCard } from '../../components/SharedCards';
import SearchHeader from '../../components/SearchHeader';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;

const mapServiceForCard = (service, provider) => ({
  id: service._id,
  title: service.servicename,
  description: service.description,
  category: service.serviceCategory,
  image: service.portfolioImages?.[0]?.url,
  price: '',
  rating: service.averageRating || 0,
  reviewCount: service.reviewCount || 0,
  providerId: provider?._id,
});

const mapProviderForCard = (provider) => {
  if (!provider?.user) return null;
  const { user } = provider;
  return {
    id: provider._id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    avatar: user.profileImage,
  };
};

const AllServicesScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const insets = useSafeAreaInsets();

  // ── Network status (listens once, updates flags) ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data: providers = [],
    isLoading,
    isFetching,
    refetch,
  } = useFetchAllProvidersQuery();

  // ── Current user's community (for community-scoped filtering) ──────────────
  const user = useSelector(state => state.auth.user);
  const userCommunity = user?.communityCommunName
    ? String(user.communityCommunName).trim().toLowerCase()
    : '';

  // ── Restrict providers to the user's own community ──────────────────────
  // If the user has no community yet, fall back to showing nothing community-
  // scoped (empty state) rather than leaking services from other communities.
  const communityProviders = useMemo(() => {
    if (!userCommunity) return [];
    return providers.filter((provider) => {
      const providerCommunity = provider?.user?.communityCommunName
        ? String(provider.user.communityCommunName).trim().toLowerCase()
        : '';
      return providerCommunity === userCommunity;
    });
  }, [providers, userCommunity]);

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

  // ── Wishlist ──
  const wishlistIds = useSelector((s) => s.wishlist.ids);
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const handleWishlistToggle = async (serviceId) => {
    try {
      if (wishlistIds.includes(serviceId)) {
        await removeFromWishlist(serviceId).unwrap();
      } else {
        await addToWishlist(serviceId).unwrap();
      }
    } catch (_) {}
  };

  // ── Derived data (now scoped to the user's community) ──
  const allServices = useMemo(() => {
    const list = [];
    communityProviders.forEach(provider => {
      (provider.serviceOfferings || []).forEach(service => {
        list.push(mapServiceForCard(service, provider));
      });
    });
    return list;
  }, [communityProviders]);

  const providerById = useMemo(() => {
    const map = {};
    communityProviders.forEach(provider => {
      map[provider._id] = mapProviderForCard(provider);
    });
    return map;
  }, [communityProviders]);

  const getProviderById = providerId => providerById[providerId] || null;

  const getProviderName = (service) => {
    const provider = getProviderById(service.providerId);
    return provider?.name || '';
  };

  const matchesSearch = (service) => {
    const term = searchQuery.trim().toLowerCase();
    if (term === '') return true;
    const providerName = getProviderName(service).toLowerCase();
    return (
      service.title?.toLowerCase().includes(term) ||
      service.description?.toLowerCase().includes(term) ||
      providerName.includes(term) ||
      service.category?.toLowerCase().includes(term)
    );
  };

  const matchesCategory = (service) =>
    activeCategory === 'all' ||
    service.category?.toLowerCase() === activeCategory.toLowerCase();

  const serviceCategories = useMemo(() => {
    const seen = new Set();
    const cats = [{ id: 'all', label: 'All' }];
    allServices.forEach(service => {
      if (service.category && !seen.has(service.category)) {
        seen.add(service.category);
        cats.push({ id: service.category, label: service.category });
      }
    });
    return cats;
  }, [allServices]);

  const filteredServices = allServices.filter(
    s => matchesCategory(s) && matchesSearch(s)
  );

  const goToDetail = service =>
    navigation?.navigate('ServiceDetail', { serviceId: service.id });

  const hasData = communityProviders.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
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
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          All Services
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── SearchHeader – filter icon removed ── */}
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={false}
        placeholder="Search services, providers..."
      />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
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
              tintColor={COLORS.primary}
            />
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}>
            {serviceCategories.map(cat => (
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

          <View style={styles.countContainer}>
            <Text style={styles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {filteredServices.length} services found
            </Text>
          </View>

          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={scaleFont(48)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No services found
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Try a different category or search term
              </Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {filteredServices.map(service => {
                const provider = getProviderById(service.providerId);
                return (
                  <ServiceGridCard
                    key={service.id}
                    item={service}
                    provider={provider}
                    onPress={() => goToDetail(service)}
                    cardWidth={GRID_WIDTH}
                    isWishlisted={wishlistIds.includes(service.id)}
                    onWishlistToggle={() => handleWishlistToggle(service.id)}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – UNCHANGED ──────────────────────────────────────────────────────
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
  },
  categoriesRow: {
    paddingBottom: scaleHeight(16),
    gap: scaleWidth(8),
    paddingRight: scaleWidth(4),
  },
  chipActive: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(8),
  },
  chipInactive: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.card,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  chipTextActive: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  chipTextInactive: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  countContainer: {
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(4),
  },
  countText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: moderateScale(14, 0.3),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(8),
  },
  emptyTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
  },
  emptySubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default AllServicesScreen;