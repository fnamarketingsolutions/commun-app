// screens/provider/ProviderAllServicesScreen.jsx
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
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
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

import { ServiceGridCard } from '../../components/SharedCards';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useFetchProviderByIdQuery } from '../../redux/service/providerApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;

// ─── Map ServiceOffering → ServiceGridCard item prop ─────────────────────────
const mapServiceItem = (s) => ({
  id:          s._id,
  title:       s.servicename || s.serviceCategory || 'Service',
  category:    s.serviceCategory || '',
  description: s.description || '',
  image:       s.portfolioImages?.[0]?.url || '',
  rating:      s.averageRating  ?? 0,
  reviewCount: s.reviewCount    ?? 0,
  price:       '',
});

// ─── Map ProviderProfile → ServiceGridCard provider prop ──────────────────────
const mapProviderForCard = (p) => ({
  avatar: p?.user?.profileImage || null,
  name:   [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ') || 'Provider',
});

// ─────────────────────────────────────────────────────────────────────────────
const ProviderAllServicesScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { providerId, providerName } = route.params || {};

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data:      providerRaw,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFetchProviderByIdQuery(providerId, { skip: !providerId });

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

  // ── Wishlist ──────────────────────────────────────────────────────────────
  const wishlistIds = useSelector((state) => state.wishlist?.ids ?? []);
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const handleWishlistToggle = useCallback(async (serviceId) => {
    try {
      if (wishlistIds.includes(serviceId)) {
        await removeFromWishlist(serviceId).unwrap();
      } else {
        await addToWishlist(serviceId).unwrap();
      }
    } catch (_) {
      // silent
    }
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const services = useMemo(
    () => (providerRaw?.serviceOfferings || []).map(mapServiceItem),
    [providerRaw],
  );

  const providerCard = useMemo(
    () => mapProviderForCard(providerRaw),
    [providerRaw],
  );

  const goToServiceDetail = (service) =>
    navigation.navigate('ServiceDetail', { serviceId: service.id });

  // ── Determine if we have cached data for offline banner ──
  const hasData = !!providerRaw;
  const showOfflineBanner = !isOnline && hasData;

  // ── Shared header ──
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
      </TouchableOpacity>
      <Text
        style={styles.headerTitle}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {providerName ? `${providerName.split(' ')[0]}'s Services` : 'All Services'}
      </Text>
      <View style={{ width: moderateScale(40, 0.3) }} />
    </View>
  );

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Header />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading services...
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
        <Header />
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {error?.data?.message || 'Unable to load services.'}
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
      <Header />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. The services are still available."
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + moderateScale(16, 0.3),
              paddingTop:    scaleHeight(16),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="construct-outline" size={scaleFont(64)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No services yet
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                This provider hasn't added any services.
              </Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {services.map((service) => (
                <ServiceGridCard
                  key={service.id}
                  item={service}
                  provider={providerCard}
                  onPress={() => goToServiceDetail(service)}
                  cardWidth={GRID_WIDTH}
                  isWishlisted={wishlistIds.includes(service.id)}
                  onWishlistToggle={() => handleWishlistToggle(service.id)}
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

// ─── Styles – unchanged ──────────────────────────────────────────────────────
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
  backBtn: {
    width:          moderateScale(40, 0.3),
    height:         moderateScale(40, 0.3),
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:   scaleFont(20),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
    flex:       1,
    textAlign:  'center',
  },

  // ── Loading / Error ──
  centeredState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize:   scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color:      COLORS.textSecondary,
  },
  errorText: {
    fontSize:          scaleFont(FONTS.body),
    fontWeight:        FONTS.weightMedium,
    color:             '#DC2626',
    textAlign:         'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop:         scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical:   scaleHeight(10),
    borderRadius:      moderateScale(RADIUS.md, 0.3),
    backgroundColor:   COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
    color:      COLORS.white,
  },

  scrollContent: {
    paddingHorizontal: scaleWidth(20),
  },
  gridWrap: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:          moderateScale(14, 0.3),
    alignItems:     'stretch',
  },
  emptyState: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     scaleHeight(100),
    gap:             moderateScale(12, 0.3),
  },
  emptyTitle: {
    fontSize:   scaleFont(18),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textMuted,
  },
  emptySubtitle: {
    fontSize:          scaleFont(14),
    color:             COLORS.textMuted,
    textAlign:         'center',
    paddingHorizontal: scaleWidth(40),
  },
});

export default ProviderAllServicesScreen;