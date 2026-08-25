// screens/provider/ManageServicesScreen.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchMyProviderProfileQuery,
  useDeleteServiceOfferingMutation,
} from '../../redux/service/providerApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import SvgImage from '../../components/SvgImage';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <View
    style={[
      styles.statusBadge,
      { backgroundColor: status === 'active' ? '#10B981' : '#F59E0B' },
    ]}>
    <View style={styles.statusDot} />
    <Text style={styles.statusText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {status === 'active' ? 'Active' : 'Paused'}
    </Text>
  </View>
);

// ── Service Card ──────────────────────────────────────────────────────────────
const ServiceCard = ({ service, onEdit, onDelete, isDeleting, isOnline }) => {
  const [imageError, setImageError] = useState(false);
  const hasImageCandidate = service.portfolioImages?.length > 0 && !!service.portfolioImages[0]?.url;
  const url = service.portfolioImages?.[0]?.url || '';
  const isAbsoluteUrl = /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
  const shouldShowImage = hasImageCandidate && isAbsoluteUrl && !imageError;
  const serviceName = service.servicename || service.serviceCategory || 'Service';

  const coverHeight = shouldShowImage ? moderateScale(180, 0.3) : moderateScale(120, 0.3);

  return (
    <View style={styles.serviceCard}>
      {/* coverWrap height driven entirely by inline style — no hardcoded height in StyleSheet */}
      <View style={[styles.coverWrap, { height: coverHeight }]}>
        {shouldShowImage ? (
          url.endsWith('.svg') ? (
            <SvgImage uri={url} style={styles.coverImage} onError={() => setImageError(true)} />
          ) : (
            <Image
              source={{ uri: url }}
              style={styles.coverImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )
        ) : (
          // flex: 1 fills the parent coverWrap exactly — no internal top/bottom gap
          <View style={styles.coverPlaceholder}>
            <Icon name="image-outline" size={scaleFont(28)} color={COLORS.textMuted} />
            <Text
              style={styles.coverPlaceholderName}
              numberOfLines={2}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {serviceName}
            </Text>
          </View>
        )}
        <StatusBadge status="active" />
      </View>

      {/* ── Info ── */}
      <View style={styles.serviceInfo}>
        <View style={styles.titleRow}>
          <Text
            style={styles.serviceTitle}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {serviceName}
          </Text>
        </View>

        <Text
          style={styles.serviceDesc}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {service.description || 'No description provided.'}
        </Text>

        <View style={styles.cardDivider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, !isOnline && { opacity: 0.5 }]}
            onPress={() => isOnline && onEdit(service)}
            activeOpacity={0.7}
            disabled={!isOnline}>
            <Icon name="pencil-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.border} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 'auto' }, !isOnline && { opacity: 0.5 }]}
            onPress={() => isOnline && onDelete(service._id)}
            disabled={isDeleting || !isOnline}
            activeOpacity={0.7}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="trash-outline" size={scaleFont(18)} color={isOnline ? '#EF4444' : COLORS.border} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ManageServicesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data: providerProfile,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFetchMyProviderProfileQuery();

  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceOfferingMutation();

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

  const [deletingId, setDeletingId] = useState(null);

  const services = providerProfile?.serviceOfferings ?? [];
  const activeCount = services.length;

  const handleEdit = (service) =>
    navigation?.navigate('EditService', { serviceId: service._id });

  const handleDelete = (serviceId) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(serviceId);
              await deleteService(serviceId).unwrap();
            } catch (err) {
              Alert.alert(
                'Unable to delete service',
                err?.data?.message || 'Please try again later.',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const hasData = !!providerProfile;
  const showOfflineBanner = !isOnline && hasData;

  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Manage Services
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading your services...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !hasData) {
    const message = error?.data?.message || 'Unable to load services.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Manage Services
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {message}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Manage Services
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Your services are still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + moderateScale(20, 0.3),
              paddingTop: scaleHeight(8),
            },
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
          <Text style={styles.snapshotTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Business Snapshot
          </Text>
          <Text style={styles.snapshotSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            You have {activeCount} active service{activeCount !== 1 ? 's' : ''}.
          </Text>

          <TouchableOpacity
            onPress={() => isOnline && navigation?.navigate('AddService')}
            activeOpacity={0.85}
            style={[styles.addBtnWrap, !isOnline && { opacity: 0.5 }]}
            disabled={!isOnline}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtn}>
              <Icon name="add" size={scaleFont(20)} color={isOnline ? COLORS.white : COLORS.border} />
              <Text style={[styles.addBtnText, !isOnline && { color: COLORS.border }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Add New Service' : 'Offline'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {services.length === 0 && (
            <View style={styles.emptyCard}>
              <Icon name="briefcase-outline" size={scaleFont(32)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No services yet.
              </Text>
              <Text style={styles.emptySubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Add your first service to start receiving bookings.
              </Text>
            </View>
          )}

          {services.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === service._id}
              isOnline={isOnline}
            />
          ))}

          <Text style={styles.footer} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            © 2024 Commun. All rights reserved.
          </Text>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
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
  snapshotTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
    marginTop: scaleHeight(4),
  },
  snapshotSub: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
  },
  addBtnWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(24),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14, 0.3),
    gap: scaleWidth(8),
  },
  addBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
    ...SHADOW.card,
    shadowOpacity: 0.03,
    elevation: 1,
    marginBottom: scaleHeight(16),
  },
  emptyText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
    marginTop: scaleHeight(8),
  },
  emptySubtext: {
    fontSize: scaleFont(FONTS.small),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(18, 0.3),
    marginBottom: scaleHeight(10),
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  // ✅ No hardcoded height here — inline style on the View wins cleanly
  coverWrap: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  // ✅ flex: 1 fills coverWrap exactly — eliminates top/bottom spacing
  coverPlaceholder: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(20),
  },
  coverPlaceholderName: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: moderateScale(12, 0.3),
    left: moderateScale(12, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(5, 0.3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: moderateScale(10, 0.3),
    paddingVertical: moderateScale(5, 0.3),
  },
  statusDot: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    borderRadius: moderateScale(3, 0.3),
    backgroundColor: COLORS.white,
  },
  statusText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  serviceInfo: { padding: moderateScale(12, 0.3) },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(6),
  },
  serviceTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(8),
  },
  serviceDesc: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    lineHeight: moderateScale(19, 0.3),
  },
  cardDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: moderateScale(6, 0.3),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: moderateScale(6, 0.3),
    marginRight: scaleWidth(16),
  },
  footer: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(8),
  },
});

export default ManageServicesScreen;