// screens/app/CommunityServices.jsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import {
  useFetchCommunityServicesQuery,
} from '../../redux/service/serviceOfferingApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  ServiceCard,
  ServiceGridCard,
} from '../../components/SharedCards';
import SearchHeader from '../../components/SearchHeader';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const CARD_WIDTH = width * 0.72;
const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;

const getCommunityName = (user) => {
  if (!user) return null;
  if (!user.communityCommunName || user.communityCommunName === '__other__') {
    return null;
  }
  return user.communityCommunName;
};

const mapServiceForCard = (service) => ({
  id: service._id,
  title: service.servicename,
  description: service.description,
  category: service.serviceCategory,
  image: service.portfolioImages?.[0]?.url,
  price: '',
  rating: service.averageRating || 0,
  reviewCount: service.reviewCount || 0,
  providerId: service.provider?._id,
  createdAt: service.createdAt,
  serviceOfferingCount: service.serviceOfferingCount || 0,
  providerName: service.provider?.user
    ? [service.provider.user.firstName, service.provider.user.lastName].filter(Boolean).join(' ')
    : '',
  providerAvatar: service.provider?.user?.profileImage || null,
});

const CommunityServices = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = useSelector((s) => s.auth.user);
  const userCommunityName = getCommunityName(currentUser);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Use the new community‑scoped services query ──
  const {
    data: communityData,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useFetchCommunityServicesQuery(
    { page: 1, limit: 50 },
    { skip: !userCommunityName }
  );

  const services = communityData?.services || [];
  const pagination = communityData?.pagination || {};
  const needsCommunity = communityData?.needsCommunity || false;

  // ── Refetch on focus ──
  useFocusEffect(
    useCallback(() => {
      if (isOnline && userCommunityName) {
        refetch();
      }
    }, [isOnline, refetch, userCommunityName])
  );

  // ── Auto‑refetch when coming online ──
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

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline || !userCommunityName) return;
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline, userCommunityName]);

  // ── Map services to card items ──
  const allServices = useMemo(() => services.map(mapServiceForCard), [services]);

  // ── Categories from the fetched services ──
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

  // ── Search & filter ──
  const matchesSearch = (service) => {
    const term = searchQuery.trim().toLowerCase();
    if (term === '') return true;
    const providerName = (service.providerName || '').toLowerCase();
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

  const filteredServices = allServices.filter(
    s => matchesCategory(s) && matchesSearch(s)
  );

  const goToDetail = service =>
    navigation?.navigate('ServiceDetail', { serviceId: service.id });

  const handleFilterPress = () => {
  };

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

  // ── Loading & error states ──
  const hasData = services.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Services
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Community Services
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={true}
        onFilterPress={handleFilterPress}
        placeholder="Search Community Services ..."
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
          {!userCommunityName || needsCommunity ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {needsCommunity ? 'No community services available' : 'Join a community first'}
              </Text>
              <Text style={styles.emptyStateSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {needsCommunity
                  ? 'You need to join a Commun community to see services here'
                  : 'You need to join a Commun community to see local services here'}
              </Text>
            </View>
          ) : (
            <>
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

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Services in your community
                </Text>
              </View>

              {filteredServices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {allServices.length === 0
                      ? 'No services available'
                      : 'No services match your filters'}
                  </Text>
                  <Text style={styles.emptyStateSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {allServices.length === 0
                      ? 'The secretary has disabled all categories or no one has added services yet'
                      : 'Try a different category or search term'}
                  </Text>
                </View>
              ) : (
                <View style={styles.recentGrid}>
                  {filteredServices.map(service => {
                    const provider = {
                      name: service.providerName,
                      avatar: service.providerAvatar,
                    };
                    return (
                      <ServiceGridCard
                        key={service.id}
                        item={service}
                        provider={provider}
                        onPress={() => goToDetail(service)}
                        cardWidth={GRID_WIDTH}
                        isWishlisted={wishlistIds.includes(service.id)}
                        onWishlistToggle={() => handleWishlistToggle(service.id)}
                        toggleDisabled={!isOnline}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – unchanged ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
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
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: scaleWidth(20) },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(14),
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: moderateScale(14, 0.3),
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

export default CommunityServices;