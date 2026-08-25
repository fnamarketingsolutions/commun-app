// screens/app/CategoryServicesScreen.jsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';

import { useLazyFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';
import { COLORS, FONTS, RADIUS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ServiceGridCard } from '../../components/SharedCards';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import PendingApprovalCard from '../../components/common/PendingApprovalCard';
import { isCommunityPending } from '../../utils/communityStatus';
import { ServicesGridSkeleton } from '../../components/common/HomeSkeletons';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;
const PAGE_LIMIT = 50;
const MIN_SKELETON_DISPLAY_MS = 300;

// ─── Mappers ─────────────────────────────────────────────────────────────────
const mapServiceForCard = (service) => {
  const provider = service.provider;
  return {
    id: service._id,
    title: service.servicename,
    description: service.description,
    category: service.serviceCategory,
    image: service.portfolioImages?.[0]?.url,
    price: '',
    rating: service.averageRating || 0,
    reviewCount: service.reviewCount || 0,
    providerId: provider?._id,
    createdAt: service.createdAt,
    serviceOfferingCount: service.serviceOfferingCount || 0,
    _providerRaw: provider,
  };
};

const mapProviderForCard = (provider) => {
  if (!provider?.user) return null;
  const { user } = provider;
  return {
    id: provider._id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    avatar: user.profileImage,
  };
};

// ─── Hook: fetch every page dynamically and merge ────────────────────────────
const useAllCommunityServices = () => {
  const [fetchPage] = useLazyFetchCommunityServicesQuery();

  const [allServices, setAllServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const result1 = await fetchPage({ page: 1, limit: PAGE_LIMIT }).unwrap();
      const pages = result1?.pagination?.totalPages || 1;
      setTotalPages(pages);

      let merged = [...(result1?.services || [])];

      if (pages > 1) {
        const remainingPages = Array.from({ length: pages - 1 }, (_, i) => i + 2);
        const results = await Promise.all(
          remainingPages.map(p => fetchPage({ page: p, limit: PAGE_LIMIT }).unwrap())
        );
        results.forEach(r => {
          merged = [...merged, ...(r?.services || [])];
        });
      }

      setAllServices(merged);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setIsLoading(true);
    fetchAll();
  }, [fetchAll]);

  return { allServices, isLoading, isFetching, error, totalPages, refetch: fetchAll };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CategoryServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const categoryName = route?.params?.categoryName || '';

  const [searchQuery, setSearchQuery] = useState('');

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const user = useSelector(state => state.auth.user);
  const isPublicMember = user?.isPublicMember ?? false;
  const communityPending = useMemo(() => isCommunityPending(user), [user]);

  const {
    allServices: allFetchedServices,
    isLoading,
    isFetching,
    error,
    totalPages,
    refetch,
  } = useAllCommunityServices();

  // ── Skeleton visibility (min display time) ──
  const [skeletonVisible, setSkeletonVisible] = useState(false);

  useEffect(() => {
    let timer;
    const hasData = allFetchedServices.length > 0;
    if (!hasData && isLoading) {
      setSkeletonVisible(true);
      timer = setTimeout(() => {
        if (!isLoading) {
          setSkeletonVisible(false);
        }
      }, MIN_SKELETON_DISPLAY_MS);
    } else if (hasData && !isLoading) {
      setSkeletonVisible(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [allFetchedServices.length, isLoading]);

  // ── Filter by category client-side ──
  const categoryServices = useMemo(() => {
    return allFetchedServices
      .filter(s => s.serviceCategory === categoryName)
      .map(mapServiceForCard);
  }, [allFetchedServices, categoryName]);

  // ── Provider lookup map ──
  const providerById = useMemo(() => {
    const map = {};
    categoryServices.forEach(s => {
      if (s.providerId && !map[s.providerId]) {
        map[s.providerId] = mapProviderForCard(s._providerRaw);
      }
    });
    return map;
  }, [categoryServices]);

  // ── Search filter (client-side) ──
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return categoryServices;
    const q = searchQuery.trim().toLowerCase();
    return categoryServices.filter(s => {
      const provider = providerById[s.providerId];
      return (
        s.title?.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (provider?.name || '').toLowerCase().includes(q)
      );
    });
  }, [categoryServices, searchQuery, providerById]);

  // ── Stale‑time auto-refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

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

  const goToDetail = (service) =>
    navigation?.navigate('ServiceDetail', { serviceId: service.id });

  const hasData = allFetchedServices.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── Pending approval ──
  if (communityPending) {
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
            {categoryName || 'Category'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.pendingWrap}>
          <PendingApprovalCard />
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading state with skeleton ──
  if (skeletonVisible || (isLoading && !hasData)) {
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
            {categoryName || 'Category'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />

        {/* ── Search bar (visible during loading) ── */}
        <View style={styles.searchWrap}>
          <Icon
            name="search-outline"
            size={scaleFont(18)}
            color={COLORS.textMuted}
            style={{ marginRight: scaleWidth(8) }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${categoryName} services...`}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            editable={false}
          />
        </View>

        <ServicesGridSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (error && !isLoading) {
    const errorMessage = error?.data?.message || error?.error || 'Failed to load services';
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
            {categoryName || 'Category'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main content ──
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
          {categoryName || 'Category'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <View style={styles.searchWrap}>
        <Icon
          name="search-outline"
          size={scaleFont(18)}
          color={COLORS.textMuted}
          style={{ marginRight: scaleWidth(8) }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${categoryName} services...`}
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        {filteredServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="albums-outline" size={scaleFont(48)} color={COLORS.border} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              No services found
            </Text>
            <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {searchQuery.trim()
                ? `No services match "${searchQuery}"`
                : isPublicMember
                  ? `No public services available in ${categoryName}.`
                  : `No services available in ${categoryName} yet.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredServices}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + moderateScale(30, 0.3) },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && isOnline}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.gradientStart}
              />
            }
            ListHeaderComponent={
              <Text style={styles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
              </Text>
            }
            renderItem={({ item: service }) => {
              const provider = providerById[service.providerId] || null;
              return (
                <ServiceGridCard
                  item={service}
                  provider={provider}
                  onPress={() => goToDetail(service)}
                  cardWidth={GRID_WIDTH}
                  isWishlisted={wishlistIds.includes(service.id)}
                  onWishlistToggle={() => handleWishlistToggle(service.id)}
                />
              );
            }}
          />
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
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: moderateScale(16, 0.3),
  },
  countText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: scaleHeight(8),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingWrap: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    justifyContent: 'center',
    paddingBottom: scaleHeight(60),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(40),
    paddingTop: scaleHeight(60),
    gap: scaleHeight(8),
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(16),
  },
  emptySubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    gap: scaleHeight(12),
  },
  errorText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    overflow: 'hidden',
    minWidth: scaleWidth(100),
  },
  retryGradient: {
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default CategoryServicesScreen;