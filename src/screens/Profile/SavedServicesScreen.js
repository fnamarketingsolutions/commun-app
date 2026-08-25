// screens/app/SavedServicesScreen.jsx
import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { ServiceGridCard } from '../../components/SharedCards';
import { COLORS, FONTS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useRemoveFromWishlistMutation,
  useCheckAuthQuery,
  useGetPublicServicesQuery,
} from '../../redux/service/api';
import { useFetchAllProvidersQuery } from '../../redux/service/providerApi';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { ROUTES } from '../../navigations/routes'; // ✅ import routes

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;

// ─── Map service to card item ──────────────────────────────────────
const mapServiceItem = (service) => ({
  id: service._id,
  title: service.servicename || service.serviceCategory || 'Service',
  category: service.serviceCategory || '',
  description: service.description || '',
  image: service.portfolioImages?.[0]?.url || '',
  rating: service.averageRating ?? 0,
  reviewCount: service.reviewCount ?? 0,
  price: '',
});

const mapProviderForCard = (provider) => {
  if (!provider?.user) return null;
  const { user } = provider;
  return {
    avatar: user.profileImage || null,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Provider',
  };
};

const SavedServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // ── Safe goBack handler ────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to the Profile tab
      navigation.navigate(ROUTES.TABS, { screen: 'Profile' });
    }
  }, [navigation]);

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data: providers = [],
    isLoading,
    isFetching: isFetchingProviders,
    refetch: refetchProviders,
  } = useFetchAllProvidersQuery();

  // ── Community + Public services (same sources ServiceDetailScreen uses) ──
  // Wishlisted services can come from any of these three sources. Only
  // matching against `providers` was causing saved-but-not-in-providers-list
  // services to silently disappear from the Wishlist screen.
  const {
    data: communityData,
    isFetching: isFetchingCommunity,
    refetch: refetchCommunity,
  } = useFetchCommunityServicesQuery({ page: 1, limit: 50 });

  const {
    data: publicData,
    isFetching: isFetchingPublic,
    refetch: refetchPublic,
  } = useGetPublicServicesQuery({ page: 1, limit: 50 });

  // ── Refetch user data (to sync wishlist) ──────────────────────────────────
  const {
    refetch: refetchUser,
    isFetching: isFetchingUser,
  } = useCheckAuthQuery();

  // ── Refetch on focus ──────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchUser();
        refetchProviders();
        refetchCommunity();
        refetchPublic();
      }
    }, [isOnline, refetchUser, refetchProviders, refetchCommunity, refetchPublic])
  );

  // ── Stale‑time guard for auto‑refetch on reconnect ──────────────────────
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchUser();
          refetchProviders();
          refetchCommunity();
          refetchPublic();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchUser, refetchProviders, refetchCommunity, refetchPublic]);

  // ── Pull‑to‑refresh handler ──────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchUser();
    refetchProviders();
    refetchCommunity();
    refetchPublic();
    lastFetchTime.current = Date.now();
  }, [refetchUser, refetchProviders, refetchCommunity, refetchPublic, isOnline]);

  // ── Redux wishlist IDs ────────────────────────────────────────────
  const wishlistIds = useSelector((state) => state.wishlist.ids);
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [removingId, setRemovingId] = React.useState(null);

  // ── Build a flat list of all services with provider info ────────
  // Merges providers' serviceOfferings + community services + public
  // services (deduped by _id) so wishlist items from any source resolve.
  const allServices = useMemo(() => {
    const map = new Map();

    providers.forEach(provider => {
      (provider.serviceOfferings || []).forEach(service => {
        map.set(String(service._id), { ...service, provider: service.provider || provider });
      });
    });

    (communityData?.services || []).forEach(service => {
      const key = String(service._id);
      if (!map.has(key)) {
        map.set(key, { ...service, provider: service.provider });
      }
    });

    (publicData?.services || []).forEach(service => {
      const key = String(service._id);
      if (!map.has(key)) {
        map.set(key, { ...service, provider: service.provider });
      }
    });

    return Array.from(map.values());
  }, [providers, communityData, publicData]);

  // ── Deduplicate wishlist IDs ──────────────────────────────────────
  const uniqueWishlistIds = useMemo(() => {
    const unique = [...new Set(wishlistIds.map(id => String(id)))];
    return unique;
  }, [wishlistIds]);

  // ── Filter only the ones that actually exist in the providers ──
  const savedServices = useMemo(() => {
    const serviceIds = new Set(allServices.map(s => String(s._id)));
    const validIds = uniqueWishlistIds.filter(id => serviceIds.has(id));
    const missingIds = uniqueWishlistIds.filter(id => !serviceIds.has(id));

    if (missingIds.length > 0) {
      console.warn('⚠️ Wishlist contains services that are not in the providers/community/public lists:', missingIds);
    }

    return validIds
      .map(id => allServices.find(s => String(s._id) === id))
      .filter(Boolean)
      .map(service => ({
        item: mapServiceItem(service),
        provider: mapProviderForCard(service.provider),
        raw: service,
      }));
  }, [allServices, uniqueWishlistIds]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleRemoveSaved = (serviceId) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to remove saved services.');
      return;
    }
    if (!serviceId) {
      Alert.alert('Error', 'Service ID is missing.');
      return;
    }
    Alert.alert(
      'Remove from Saved',
      'Do you want to remove this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(serviceId);
              await removeFromWishlist(serviceId).unwrap();
            } catch (err) {
              Alert.alert('Error', err?.data?.message || 'Unable to remove.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  const goToDetail = (item) => {
    navigation.navigate('ServiceDetail', { serviceId: item.id });
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = providers.length > 0 || (communityData?.services?.length > 0) || (publicData?.services?.length > 0);
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading saved services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Wishlist</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Your saved services are still available."
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + moderateScale(16, 0.3) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={(isFetchingProviders || isFetchingUser || isFetchingCommunity || isFetchingPublic) && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
        >
          {savedServices.length === 0 ? (
            <View style={styles.emptyState}>
              <LottieView
                source={require('../../assets/animations/Lovely_cats.json')}
                autoPlay
                loop
                style={styles.emptyLottie}
              />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>No Wishlist</Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Tap the heart ❤️ on any service to save it here
              </Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {savedServices.map(({ item, provider }) => (
                <ServiceGridCard
                  key={item.id}
                  item={item}
                  provider={provider}
                  onPress={() => goToDetail(item)}
                  cardWidth={GRID_WIDTH}
                  isWishlisted={true}
                  onWishlistToggle={() => handleRemoveSaved(item.id)}
                  toggleDisabled={!isOnline}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────
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
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: moderateScale(14, 0.3),
    alignItems: 'stretch',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scaleHeight(60),
    gap: moderateScale(12, 0.3),
  },
  emptyLottie: {
    width: scaleWidth(250),
    height: scaleWidth(250),
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
  },
  emptySubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scaleWidth(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(16),
    color: COLORS.textMuted,
  },
});

export default SavedServicesScreen;