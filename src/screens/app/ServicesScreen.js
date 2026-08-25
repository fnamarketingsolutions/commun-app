// screens/app/ServicesScreen.jsx

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// ── Queries ──
import { useGetPublicServicesQuery } from '../../redux/service/api';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';

import { COLORS, FONTS, RADIUS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ServiceGridCard } from '../../components/SharedCards';
import SearchHeader from '../../components/SearchHeader';
import PaginationBar from '../../components/PaginationBar';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import PendingApprovalCard from '../../components/common/PendingApprovalCard';
import { isCommunityPending } from '../../utils/communityStatus';
import { getUserCommunityName } from '../../utils/communityHelpers';
import { ServicesGridSkeleton } from '../../components/common/HomeSkeletons';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;
const PAGE_LIMIT = 50;
const MIN_SKELETON_DISPLAY_MS = 300;

// ─── Mapper ──────────────────────────────────────────────────────────────────
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
    providerName: provider?.user ? [provider.user.firstName, provider.user.lastName].filter(Boolean).join(' ') : '',
    providerAvatar: provider?.user?.profileImage || null,
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

const ServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const initialCategory = route?.params?.filterCategory;

  const [selectedCategories, setSelectedCategories] = useState(
    initialCategory ? [initialCategory] : []
  );
  const [searchQuery, setSearchQuery] = useState('');

  // ── Server-side numbered pagination ──
  const [page, setPage] = useState(1);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const isPublicMember = user?.isPublicMember ?? false;
  const communityPending = useMemo(() => isCommunityPending(user), [user]);

  const shouldShowMissing = !isSecretary && !isPublicMember && !userCommunityName && !communityPending;

  // ── Determine if "All" is selected ──
  const isAllSelected = selectedCategories.includes('__all__');

  // ── Category param sent to the server (omit for All/empty) ──
  const categoryParam = useMemo(() => {
    if (isAllSelected || selectedCategories.length === 0) return undefined;
    return selectedCategories.join(',');
  }, [isAllSelected, selectedCategories]);

  // ── Query selection ──
  const {
    data: allData,
    isLoading: isLoadingAll,
    isFetching: isFetchingAll,
    refetch: refetchAll,
    error: allError,
  } = useGetPublicServicesQuery(
    { page, limit: PAGE_LIMIT, category: categoryParam },
    { skip: !isAllSelected || communityPending }
  );

  const {
    data: communityData,
    isLoading: isLoadingCommunity,
    isFetching: isFetchingCommunity,
    refetch: refetchCommunity,
    error: communityError,
  } = useFetchCommunityServicesQuery(
    { page, limit: PAGE_LIMIT, category: categoryParam },
    { skip: isAllSelected || communityPending }
  );

  // ── Determine loading / fetching / refetch / error ──
  const isLoading = isAllSelected ? isLoadingAll : isLoadingCommunity;
  const isFetching = isAllSelected ? isFetchingAll : isFetchingCommunity;
  const refetch = isAllSelected ? refetchAll : refetchCommunity;
  const error = isAllSelected ? allError : communityError;

  // ── Get raw services + pagination info for the active source ──
  const rawServices = isAllSelected
    ? allData?.services || []
    : communityData?.services || [];

  const pagination = isAllSelected ? allData?.pagination : communityData?.pagination;

  // ── True only during the brief window where `page` state has changed
  //    but the response for that page hasn't arrived yet — prevents
  //    showing the previous page's items mislabeled under the new page ──
  const isPageTransitioning = isFetching && pagination?.page !== page;

  // ── Current page only — no accumulation across pages ──
  const allServices = useMemo(
    () => rawServices.map(mapServiceForCard),
    [rawServices],
  );

  // ── Categories from the current page's services ──
  const serviceCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];
    allServices.forEach(service => {
      if (service.category && !seen.has(service.category)) {
        seen.add(service.category);
        cats.push({ id: service.category, label: service.category });
      }
    });
    return cats;
  }, [allServices]);

  // ── Ensure initialCategory exists ──
  useEffect(() => {
    if (initialCategory) {
      const exists = serviceCategories.some(c => c.id === initialCategory);
      if (!exists) {
        setSelectedCategories([]);
      }
    }
  }, [serviceCategories]);

  // ── Stale‑time guard for auto‑refetch ──
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
    setPage(1);
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline]);

  // ── Reset to page 1 when the active source or filters change ──
  useEffect(() => {
    setPage(1);
  }, [isAllSelected, selectedCategories, searchQuery]);

  // ── Numbered pagination — jump straight to the requested page ──
  const handlePageChange = useCallback((newPage) => {
    if (isFetching) return;
    setPage(newPage);
  }, [isFetching]);

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

  const providerById = useMemo(() => {
    const map = {};
    allServices.forEach(s => {
      if (s.providerId && !map[s.providerId]) {
        map[s.providerId] = mapProviderForCard(s._providerRaw);
      }
    });
    return map;
  }, [allServices]);

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

  const matchesCategory = (service) => {
    if (selectedCategories.length === 0 || selectedCategories.includes('__all__')) {
      return true;
    }
    return selectedCategories.includes(service.category);
  };

  // ── Sort by recency ──
  const recentServices = useMemo(() => {
    return [...allServices].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [allServices]);

  // ── Category filtering is server-side now (categoryParam); this stays as
  //    a safety net + drives the client-side search on the current page ──
  const filteredServices = useMemo(
    () => recentServices.filter(s => matchesCategory(s) && matchesSearch(s)),
    [recentServices, selectedCategories, searchQuery]
  );

  const displayedServices = filteredServices;

  const goToDetail = service =>
    navigation?.navigate('ServiceDetail', { serviceId: service.id });

  const hasData = allServices.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── Skeleton display logic ──
  // Show skeleton if we don't have data yet (initial load) OR if we are loading
  // and we have no data (to prevent flash). Also add a minimum display time.
  const [skeletonVisible, setSkeletonVisible] = useState(false);

  useEffect(() => {
    let timer;
    if (!hasData && isLoading) {
      // Show skeleton immediately
      setSkeletonVisible(true);
      // Keep it visible for at least MIN_SKELETON_DISPLAY_MS
      timer = setTimeout(() => {
        if (!isLoading) {
          setSkeletonVisible(false);
        }
      }, MIN_SKELETON_DISPLAY_MS);
    } else if (hasData && !isLoading) {
      // Hide skeleton after data loads and minimum time passed
      setSkeletonVisible(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hasData, isLoading]);

  // ── Missing community screen ──
  if (shouldShowMissing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Services
          </Text>
        </View>
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
            You are not part of any official community yet. Join one to discover local services.
          </Text>
          <TouchableOpacity
            style={styles.joinCommunityButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText} maxFontSizeMultiplier={1.3}>
                Join a Community
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.pendingWrap}>
          <LottieView
            source={require('../../assets/animations/CatTyping.json')}
            autoPlay
            loop
            style={styles.pendingLottie}
          />
          <Text style={styles.pendingTitle} maxFontSizeMultiplier={1.3}>
            Waiting for Approval
          </Text>
          <Text style={styles.pendingMessage} maxFontSizeMultiplier={1.3}>
            Your community secretary is reviewing your request. Services will unlock once you're approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading (show skeleton) ──
  if (skeletonVisible || (isLoading && !hasData)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        <SearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showFilter={true}
          placeholder="Search Services ..."
          categories={serviceCategories}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          isLoading={true}
        />

        <ServicesGridSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error && !isLoading) {
    const errorMessage = error?.data?.message || error?.error || 'Failed to load services';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Services
          </Text>
        </View>
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

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={true}
        placeholder="Search Services ..."
        categories={serviceCategories}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        {isPageTransitioning ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              No services found
            </Text>
            <Text style={styles.emptyStateSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {isAllSelected
                ? 'No services available across all communities.'
                : isPublicMember
                  ? 'No public services available. Be the first to offer one!'
                  : allServices.length === 0 && !isLoading
                    ? 'No services in your community. Ask the secretary to enable categories.'
                    : 'Try a different category or search term'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedServices}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && isOnline && !isPageTransitioning}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.primary}
              />
            }
            ListFooterComponent={
              <PaginationBar
                currentPage={pagination?.page || page}
                totalPages={pagination?.totalPages || 1}
                onPageChange={handlePageChange}
              />
            }
            renderItem={({ item: service }) => {
              const provider = getProviderById(service.providerId);
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
    backgroundColor: COLORS.white,
  },
  pendingLottie: {
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
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: moderateScale(16, 0.3),
  },
  footerLoader: {
    paddingVertical: scaleHeight(20),
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
    gap: scaleHeight(8),
  },
  emptyStateText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  emptyStateSubtext: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
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
    marginBottom: scaleHeight(30),
    lineHeight: moderateScale(24, 0.3),
  },
  joinCommunityButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    overflow: 'hidden',
    width: '100%',
    maxWidth: scaleWidth(250),
  },
  joinButtonGradient: {
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
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

export default ServicesScreen;