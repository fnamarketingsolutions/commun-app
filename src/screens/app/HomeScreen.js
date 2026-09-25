// screens/app/HomeScreen.jsx
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import LocalBusinessSection from '../../components/LocalBusinessSection';
import { ROUTES } from '../../navigations/routes';
import {
  ServiceCard,
  ServiceRowCard,
} from '../../components/SharedCards';
import LocalitiesSection from '../../components/LocalitiesSection';
import HomeHeader from '../../components/HomeHeader';
import HomeBannerCarousel from '../../components/HomeBannerCarousel';
import CategorySection from '../../components/CategorySection';
import BroadcastSection from '../../components/BroadcastSection';
import TopProvidersPodium from '../../components/TopProvidersPodium';
import { COLORS, FONTS, SHADOW, MAX_FONT_SCALE } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useLazyCheckAuthQuery,
} from '../../redux/service/api';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import { useHomeData } from '../../hooks/useHomeData';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';
import PendingApprovalCard from '../../components/common/PendingApprovalCard';
import {
  CategorySectionSkeleton,
  TopProvidersPodiumSkeleton,
  FeaturedServicesSkeleton,
  RecentServicesSkeleton,
  BannerCarouselSkeleton,
} from '../../components/common/HomeSkeletons';
import { isCommunityPending } from '../../utils/communityStatus';
import { getUserCommunityName } from '../../utils/communityHelpers';
import { useGetActiveBannersQuery } from '../../redux/service/bannerApi';
import { useLazyFetchCommunityLocalBusinessesQuery } from '../../redux/service/localBusinessMemberApi';

// H1 FIX: width and CARD_W are now computed inside the component using useWindowDimensions()
// so they update on orientation/fold/split-screen changes.
const MAX_FONT_SIZE_MULTIPLIER = MAX_FONT_SCALE; // sourced from theme

// ─── Mapper ────────────────────────────────────────────────────────────────
const mapServiceForCard = (service) => {
  const provider = service.provider;
  return {
    id: service._id,
    title: service.servicename || service.serviceCategory || 'Service',
    image: service.portfolioImages?.[0]?.url || '',
    category: service.serviceCategory || '',
    description: service.description || '',
    rating: service.averageRating ?? 0,
    reviewCount: service.reviewCount ?? 0,
    price: '',
    createdAt: service.createdAt,
    serviceOfferingCount: service.serviceOfferingCount ?? 0,
    providerId: provider?._id,
    providerName: provider?.user ? [provider.user.firstName, provider.user.lastName].filter(Boolean).join(' ') : '',
    providerAvatar: provider?.user?.profileImage || null,
  };
};

const shuffleSlice = (arr, count) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  // H1 FIX: Reactive width — adapts to orientation, foldable, split-screen
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmall  = width < 360;
  const CARD_W   = isTablet ? width * 0.35 : isSmall ? width * 0.65 : width * 0.58;
  // H2: Horizontal padding adapts to device class
  const HORIZONTAL_PAD = isTablet ? 24 : width >= 414 ? 20 : isSmall ? 14 : 18;

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const isPublicMember = user?.isPublicMember ?? false;
  const communityPending = useMemo(() => isCommunityPending(user), [user]);

  const wishlistIds = useSelector((state) => state.wishlist?.ids ?? []);
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const [refetchUser, { isFetching: isFetchingUser }] = useLazyCheckAuthQuery();

  const handleWishlistToggle = useCallback(async (serviceId) => {
    try {
      if (wishlistIds.includes(serviceId)) {
        await removeFromWishlist(serviceId).unwrap();
      } else {
        await addToWishlist(serviceId).unwrap();
      }
    } catch (_) {}
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  // ── Banners ──
  const {
    data: banners = [],
    isLoading: isLoadingBanners,
    isError: isBannerError,
    refetch: refetchBanners,
  } = useGetActiveBannersQuery();

  // ── Home data ──
  const {
    topProviders,
    categoriesData,
    isLoading: isLoadingHomeData,
    isFetching: isFetchingHomeData,
    isOnline,
    showOfflineBanner,
    onRefresh: onRefreshData,
  } = useHomeData();

  // ── Community services ──
  const {
    data: servicesData,
    isLoading: isLoadingServices,
    isFetching: isFetchingServices,
    refetch: refetchServices,
  } = useFetchCommunityServicesQuery({ page: 1, limit: 50 });

  // ✅ Lazy trigger for local businesses
  const [triggerLocalBusiness] = useLazyFetchCommunityLocalBusinessesQuery();

  // ✅ Refresh key to force child component to refetch
  const [refreshKey, setRefreshKey] = useState(0);

  const isLoading = isLoadingHomeData || isLoadingServices || isLoadingBanners;
  const isFetchingData = isFetchingHomeData || isFetchingServices;

  // ✅ refetchAll includes trigger + increments refreshKey
  const refetchAll = useCallback(() => {
    if (!isOnline) return;
    refetchUser();
    onRefreshData();
    refetchServices();
    refetchBanners();
    triggerLocalBusiness();
    setRefreshKey(prev => prev + 1);
  }, [isOnline, refetchUser, onRefreshData, refetchServices, refetchBanners, triggerLocalBusiness]);

  const onRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  // ── Auto-refetch on focus ──
  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchUser();
        refetchServices();
        refetchBanners();
        triggerLocalBusiness();
        setRefreshKey(prev => prev + 1);
      }
    }, [isOnline, refetchUser, refetchServices, refetchBanners, triggerLocalBusiness])
  );

  // ── Stale-time auto-refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    const now = Date.now();
    if (now - lastFetchTime.current > STALE_TIME) {
      refetchAll();
      lastFetchTime.current = now;
    }
  }, [isOnline, refetchAll]);

  // ── Categories ──
  const categoriesSignature = useMemo(() => {
    const cats = categoriesData?.categories || [];
    return cats.map((c) => c._id || c.name).join('|');
  }, [categoriesData?.categories]);

  const shuffledCategoriesRef = useRef({ signature: null, result: [] });

  const displayedCategories = useMemo(() => {
    const cats = categoriesData?.categories || [];
    if (shuffledCategoriesRef.current.signature !== categoriesSignature) {
      shuffledCategoriesRef.current = {
        signature: categoriesSignature,
        result: shuffleSlice(cats, 10),
      };
    }
    return shuffledCategoriesRef.current.result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesSignature]);

  // ── Services ──
  const allServices = useMemo(() => {
    const services = servicesData?.services || [];
    return services.map(mapServiceForCard);
  }, [servicesData?.services]);

  const featuredServices = useMemo(() => {
    return [...allServices]
      .sort((a, b) => (b.serviceOfferingCount ?? 0) - (a.serviceOfferingCount ?? 0))
      .slice(0, 10);
  }, [allServices]);

  const recentServices = useMemo(() => {
    return [...allServices]
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 10);
  }, [allServices]);

  const topThreeProviders = useMemo(() => {
    if (allServices.length === 0) {
      return topProviders.slice(0, 3);
    }
    const byProvider = {};
    allServices.forEach((service) => {
      const provider = service.providerId;
      if (!provider) return;
      if (!byProvider[provider]) {
        byProvider[provider] = {
          _id: provider,
          name: service.providerName || '',
          avatar: service.providerAvatar || '',
          totalServiceClicks: 0,
          serviceCount: 0,
        };
      }
      byProvider[provider].totalServiceClicks += service.serviceOfferingCount || 0;
      byProvider[provider].serviceCount += 1;
    });
    return Object.values(byProvider)
      .sort((a, b) => {
        if (b.totalServiceClicks !== a.totalServiceClicks) {
          return b.totalServiceClicks - a.totalServiceClicks;
        }
        return b.serviceCount - a.serviceCount;
      })
      .slice(0, 3);
  }, [allServices, topProviders]);

  // ── Navigation helpers ──
  const goToService = service => navigation.navigate(ROUTES.SERVICE_DETAIL, { serviceId: service.id });
  const goToProvider = provider => navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: provider._id });
  const goToCategory = category => navigation.navigate(ROUTES.CATEGORY_SERVICES, { categoryName: category.name });
  const goToAllCategories = () => navigation.navigate(ROUTES.CATEGORIES);
  const goToContact = () => navigation.navigate(ROUTES.CONTACT);
  const goToLeaderboard = () => navigation.navigate(ROUTES.LEADERBOARD);

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  if (communityPending) {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />
          <View style={styles.headerWrap}>
            <HomeHeader />
          </View>
          <View style={[styles.pendingWrap, { paddingBottom: insets.bottom + scaleHeight(24) }]}>
            <PendingApprovalCard />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

        <View style={styles.headerWrap}>
          <HomeHeader />
        </View>

        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={showOfflineBanner}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(scaleHeight(16), insets.bottom + moderateScale(60, 0.3)) },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetchingData && isOnline}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* ── 1. Promo Carousel ── */}
            {isLoadingBanners ? (
              <BannerCarouselSkeleton />
            ) : (
              <HomeBannerCarousel
                banners={banners}
                isLoading={isLoadingBanners}
                isError={isBannerError}
              />
            )}

            {/* ✅ Pass refreshKey to LocalBusinessSection */}
            <LocalBusinessSection refreshKey={refreshKey} />

            {/* ── 2. Trending Categories ── */}
            <View style={[styles.contentPad, styles.sectionSpacing]}>
              {isLoading ? (
                <CategorySectionSkeleton />
              ) : (
                <CategorySection
                  categories={displayedCategories}
                  isLoading={isLoading}
                  onCategoryPress={goToCategory}
                  onViewAllPress={goToAllCategories}
                />
              )}
            </View>

            {/* ── 3. Available Localities ── */}
            <View style={styles.contentPad}>
              <LocalitiesSection onRequestArea={goToContact} />
            </View>

            {/* ── 4. Top Providers ── */}
            <View style={[styles.sectionHeader, styles.contentPad]}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Top Providers
              </Text>
              <TouchableOpacity onPress={goToLeaderboard}>
                <GradientText
                  colors={gradientColors}
                  style={styles.sectionLink}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  View Leaderboard
                </GradientText>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.contentPad}>
                <TopProvidersPodiumSkeleton />
              </View>
            ) : topThreeProviders.length === 0 ? null : (
              <View style={styles.contentPad}>
                <TouchableOpacity
                  style={styles.rankingCard}
                  activeOpacity={0.9}
                  onPress={goToLeaderboard}
                >
                  <TopProvidersPodium providers={topThreeProviders} onProviderPress={goToProvider} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── 5. Broadcasts ── */}
            <BroadcastSection />

            {/* ── 6. Featured Services ── */}
            <View style={[styles.sectionHeader, styles.contentPad, { marginTop: scaleHeight(20) }]}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Featured Services
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SERVICES)}>
                <GradientText
                  colors={gradientColors}
                  style={styles.sectionLink}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  View all
                </GradientText>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.contentPad}>
                <FeaturedServicesSkeleton />
              </View>
            ) : featuredServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No Featured Services
                </Text>
                <Text style={styles.emptyStateSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isPublicMember
                    ? 'Be the first public provider!'
                    : 'No services have been added yet.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={featuredServices}
                horizontal
                keyExtractor={i => i.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.featuredList, styles.contentPad]}
                renderItem={({ item }) => (
                  <ServiceCard
                    item={item}
                    onPress={() => goToService(item)}
                    cardWidth={CARD_W}
                    provider={{ name: item.providerName, avatar: item.providerAvatar }}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ width: scaleWidth(12) }} />}
              />
            )}

            {/* ── 7. Recent Services ── */}
            <Text
              style={[styles.sectionTitle, styles.contentPad, { marginTop: scaleHeight(20), marginBottom: scaleHeight(10) }]}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            >
              Recent Services
            </Text>

            {isLoading ? (
              <View style={styles.contentPad}>
                <RecentServicesSkeleton />
              </View>
            ) : recentServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No Recent Services
                </Text>
                <Text style={styles.emptyStateSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isPublicMember
                    ? 'Start offering services as a public provider.'
                    : 'Check back later for new services.'}
                </Text>
              </View>
            ) : (
              recentServices.map(item => (
                <View key={item.id} style={[styles.contentPad, { marginBottom: scaleHeight(10) }]}>
                  <ServiceRowCard
                    item={item}
                    onPress={() => goToService(item)}
                    showHeart={true}
                    provider={{ name: item.providerName, avatar: item.providerAvatar }}
                    isWishlisted={wishlistIds.includes(item.id)}
                    onWishlistToggle={() => handleWishlistToggle(item.id)}
                  />
                </View>
              ))
            )}
          </ScrollView>
        </NetworkAwareView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: { flex: 1 },
  headerWrap: {
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingTop: scaleHeight(8),
  },
  contentPad: {
    paddingHorizontal: scaleWidth(18),
    marginTop: scaleHeight(20),
  },
  sectionSpacing: {
    marginTop: scaleHeight(4),
    marginBottom: scaleHeight(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(10),
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  sectionLink: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
  },
  sectionLoader: {
    height: moderateScale(80, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(16),
  },
  featuredList: {
    paddingBottom: scaleHeight(4),
    marginBottom: scaleHeight(16),
  },
  rankingCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingBottom: scaleHeight(10),
    marginBottom: scaleHeight(4),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  pendingWrap: {
    flex: 1,
    paddingHorizontal: scaleWidth(18),
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(40),
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
});

export default HomeScreen;