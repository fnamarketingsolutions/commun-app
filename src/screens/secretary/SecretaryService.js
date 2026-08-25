// screens/admin/SecretaryService.jsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import {
  useFetchCategoryTogglesQuery,
  useUpdateCategoryToggleMutation,
} from '../../redux/service/secretaryApi';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import { ServiceGridCard } from '../../components/SharedCards';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../redux/service/api';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;

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

const SecretaryService = () => {
  const navigation = useNavigation();
  const { isOnline } = useNetworkStatus();
  const [modalVisible, setModalVisible] = useState(false);

  // ── Wishlist ──
  const wishlistIds = useSelector((state) => state.wishlist.ids);
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

  // ── Toggles & Services ──
  const {
    data,
    isLoading: isLoadingToggles,
    isFetching: isFetchingToggles,
    isError: isTogglesError,
    error: togglesError,
    refetch: refetchToggles,
  } = useFetchCategoryTogglesQuery();

  const [updateCategoryToggle] = useUpdateCategoryToggleMutation();

  const {
    data: servicesData,
    isLoading: isLoadingServices,
    isFetching: isFetchingServices,
    refetch: refetchServices,
    isError: isServicesError,
    error: servicesError,
  } = useFetchCommunityServicesQuery({ page: 1, limit: 50 });

  const categories = data?.categories || [];
  const communityCommunName = data?.meta?.communityCommunName;
  const needsCommunName = data?.meta?.needsCommunName;

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchToggles();
        refetchServices();
      }
    }, [isOnline, refetchToggles, refetchServices])
  );

  const handleToggle = async (categoryName, currentEnabled) => {
    if (!isOnline) return;
    try {
      await updateCategoryToggle({ categoryName, enabled: !currentEnabled }).unwrap();
      refetchServices();
    } catch (err) {
      // silent
    }
  };

  const onRefresh = () => {
    if (!isOnline) return;
    refetchToggles();
    refetchServices();
  };

  const isRefreshing = isFetchingToggles || isFetchingServices;

  const services = servicesData?.services || [];
  const allServices = services.map(mapServiceForCard);
  const hasData = categories.length > 0 || services.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ── FlatList render helpers (virtualized grid instead of ScrollView + map) ──
  const renderServiceItem = useCallback(
    ({ item: service }) => {
      const provider = {
        name: service.providerName,
        avatar: service.providerAvatar,
      };
      return (
        <ServiceGridCard
          item={service}
          provider={provider}
          onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
          cardWidth={GRID_WIDTH}
          showHeart={true}
          isWishlisted={wishlistIds.includes(service.id)}
          onWishlistToggle={() => handleWishlistToggle(service.id)}
        />
      );
    },
    [navigation, wishlistIds, handleWishlistToggle]
  );

  const ListHeader = (
    <>
      <Text style={styles.subtitle}>
        Services in your Commun community
        {communityCommunName ? <Text style={styles.subtitleHighlight}> ({communityCommunName})</Text> : null}
        . Use the <Text style={styles.subtitleHighlight}>⚙️ settings</Text> to manage categories.
      </Text>

      {isServicesError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{servicesError?.data?.message || 'Failed to load services.'}</Text>
        </View>
      ) : isLoadingServices ? (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="small" color={COLORS.gradientStart} />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyRow}>
          <Icon name="alert-circle-outline" size={scaleFont(18)} color={COLORS.textMuted} />
          <Text style={styles.emptyRowText}>
            {needsCommunName
              ? 'Set your Commun name to see services.'
              : categories.length === 0
              ? 'No services have been added to your community yet.'
              : 'No services match the current toggles. Enable more categories in the settings.'}
          </Text>
        </View>
      ) : null}
    </>
  );

  if (isLoadingToggles && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          disabled={!isOnline || needsCommunName || categories.length === 0}
        >
          <Icon
            name="settings-outline"
            size={scaleFont(22)}
            color={(!isOnline || needsCommunName || categories.length === 0) ? COLORS.textMuted : COLORS.gradientStart}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        <FlatList
          data={allServices}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceItem}
          numColumns={2}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          columnWrapperStyle={styles.servicesGrid}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          // ── Virtualization tuning: render a small window near the viewport,
          // recycle offscreen items, avoid mounting everything at once ──
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        />
      </NetworkAwareView>

      {/* ─── Centered Modal with Scrollable Toggles ────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={scaleFont(24)} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtext}>
              Toggle categories on/off. Disabled categories are hidden from members.
            </Text>

            {isLoadingToggles ? (
              <View style={styles.centeredBox}>
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              </View>
            ) : isTogglesError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{togglesError?.data?.message || 'Failed to load categories.'}</Text>
              </View>
            ) : needsCommunName ? (
              <View style={styles.centeredBox}>
                <Text style={styles.emptyText}>Set your Commun name to manage services.</Text>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.centeredBox}>
                <Text style={styles.emptyText}>No categories available yet. Providers must add services first.</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator showsHorizontalScrollIndicator={false}>
                {categories.map((item) => (
                  <View key={item.name} style={styles.modalToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleName}>{item.name}</Text>
                      <Text style={styles.toggleSubtext}>{item.serviceCount} service{item.serviceCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <Switch
                      value={Boolean(item.enabled)}
                      onValueChange={() => handleToggle(item.name, item.enabled)}
                      disabled={!isOnline}
                      trackColor={{ false: COLORS.border, true: COLORS.gradientStart }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalDoneGradient}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles – updated back button, settings icon, and modal done button ──
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
  headerActionBtn: { width: scaleWidth(24), alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerSpacer: { width: scaleWidth(24) },
  headerDivider: { height: moderateScale(1, 0.3), backgroundColor: COLORS.border },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(16), paddingBottom: scaleHeight(32) },
  subtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(20),
  },
  subtitleHighlight: { fontWeight: FONTS.weightBold, color: COLORS.gradientStart },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: moderateScale(1, 0.3),
    borderColor: '#FCA5A5',
    borderRadius: moderateScale(12, 0.3),
    padding: moderateScale(12, 0.3),
    marginBottom: scaleHeight(12),
  },
  errorText: { fontSize: scaleFont(13), color: '#991B1B' },
  centeredBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: scaleHeight(24), gap: moderateScale(8, 0.3) },
  loadingText: { fontSize: scaleFont(13), color: COLORS.textMuted },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(10),
    backgroundColor: '#F3F0FF',
    borderRadius: moderateScale(12, 0.3),
    padding: moderateScale(14, 0.3),
  },
  emptyRowText: { flex: 1, fontSize: scaleFont(13), color: COLORS.textSecondary, lineHeight: moderateScale(19, 0.3) },
  servicesGrid: {
    justifyContent: 'space-between',
    marginBottom: moderateScale(14, 0.3),
  },

  // ── Modal (centered, scrollable) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24, 0.3),
    paddingHorizontal: scaleWidth(24),
    paddingTop: scaleHeight(24),
    paddingBottom: scaleHeight(24),
    width: '90%',
    maxHeight: '85%',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(20, 0.3),
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  modalSubtext: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(16),
  },
  modalScrollView: {
    maxHeight: moderateScale(400, 0.3),
    marginBottom: scaleHeight(16),
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(12, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    marginBottom: scaleHeight(10),
  },
  toggleName: { fontSize: scaleFont(14), fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  toggleSubtext: { fontSize: scaleFont(12), color: COLORS.textMuted, marginTop: scaleHeight(2) },
  modalDoneBtn: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  modalDoneGradient: {
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
  },
  modalDoneText: { fontSize: scaleFont(16), fontWeight: FONTS.weightBold, color: COLORS.white },
  emptyText: { fontSize: scaleFont(13), color: COLORS.textMuted, textAlign: 'center' },
});

export default SecretaryService;