// screens/Directory/VendorsScreen.jsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Alert,
  Modal,
  SafeAreaView as RNModalSafeArea,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useCommunityVendorsQuery } from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Vendor Detail Modal ───────────────────────────────────────────────────
const VendorDetailModal = ({ vendor, visible, onClose, isOnline }) => {
  const phoneNumber = vendor?.phone?.trim();
  const email = vendor?.email?.trim();

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to send an email.');
      return;
    }
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  if (!vendor) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <RNModalSafeArea style={styles.modalSafeArea} edges={['top', 'bottom']}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={scaleFont(28)} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Vendor Details</Text>
            <View style={{ width: scaleWidth(28) }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {/* White header, no gradient */}
            <View style={styles.modalTopSection}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalInitials}>
                  {vendor.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.modalCategoryBadge}>
                <Text style={styles.modalCategoryBadgeText}>{vendor.category}</Text>
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalName}>{vendor.name}</Text>
              <Text style={styles.modalService}>{vendor.service || vendor.category}</Text>

              {vendor.notes ? (
                <Text style={styles.modalNotes}>{vendor.notes}</Text>
              ) : null}

              <View style={styles.modalInfoRow}>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Phone</Text>
                  <Text style={styles.modalInfoValue}>{phoneNumber || '—'}</Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Email</Text>
                  <Text style={styles.modalInfoValue}>{email || '—'}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalActionBtnCall, !phoneNumber && styles.modalActionBtnDisabled]}
                  onPress={handleCall}
                  disabled={!phoneNumber || !isOnline}
                  activeOpacity={0.7}
                >
                  <Icon name="call-outline" size={scaleFont(18)} color={COLORS.white} />
                  <Text style={styles.modalActionText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalActionBtnEmail, !email && styles.modalActionBtnDisabled]}
                  onPress={handleEmail}
                  disabled={!email || !isOnline}
                  activeOpacity={0.7}
                >
                  <Icon name="mail-outline" size={scaleFont(18)} color={COLORS.white} />
                  <Text style={styles.modalActionText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </RNModalSafeArea>
    </Modal>
  );
};

// ─── Vendor Card (full-width row, white background) ────────────────────────
const VendorCard = ({ vendor, isOnline, onPress }) => {
  const phoneNumber = vendor.phone?.trim();

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const initials = vendor.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardInitials}>{initials}</Text>
        </View>

        <View style={styles.cardTextWrap}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{vendor.category}</Text>
          </View>
          <Text style={styles.cardName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {vendor.name}
          </Text>
          <Text style={styles.cardService} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {vendor.service || vendor.category}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.callButton, !phoneNumber && styles.callButtonDisabled]}
          onPress={handleCall}
          disabled={!phoneNumber || !isOnline}
          activeOpacity={0.7}
        >
          <Icon
            name="call-outline"
            size={scaleFont(16)}
            color={phoneNumber && isOnline ? COLORS.primaryLight : COLORS.textMuted}
          />
          <Text
            style={[styles.callButtonText, !phoneNumber && styles.callButtonTextDisabled]}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {phoneNumber ? 'Call' : 'No Phone'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.detailButtonText}>Details</Text>
          <Icon name="arrow-forward" size={scaleFont(14)} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Category Chip (flat, no gradient) ──────────────────────────────────────
const CategoryChip = ({ label, count, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const VendorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);
  const shouldShowMissing = !isSecretary && !userCommunityName && !communityPending;

  // ── RTK Query ──
  const { data, isLoading, isFetching, refetch, error } = useCommunityVendorsQuery(undefined, {
    skip: !userCommunityName || shouldShowMissing,
  });

const categories = data?.data?.categories || [];
const vendorsByCategory = data?.data?.vendorsByCategory || {};
const needsCommunity = data?.data?.needsCommunity || false;

  const scopedCategories = useMemo(() => {
    return categories.filter((cat) => (vendorsByCategory[cat] || []).length > 0);
  }, [categories, vendorsByCategory]);

  // Auto-select first category
  useEffect(() => {
    if (scopedCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(scopedCategories[0]);
    }
    if (selectedCategory && !scopedCategories.includes(selectedCategory)) {
      setSelectedCategory('');
    }
  }, [scopedCategories, selectedCategory]);

  const selectedVendors = useMemo(() => {
    if (!selectedCategory) return [];
    return vendorsByCategory[selectedCategory] || [];
  }, [vendorsByCategory, selectedCategory]);

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Auto-refetch on focus
  useFocusEffect(
    useCallback(() => {
      if (isOnline && userCommunityName) {
        refetch();
      }
    }, [isOnline, userCommunityName, refetch])
  );

  // Auto-refetch on reconnect
  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      refetch();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetch]);

  // ── Open modal ──
  const openVendorDetail = (vendor) => {
    setSelectedVendor(vendor);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVendor(null);
  };

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendors</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.pendingWrap}>
          <LottieView
            source={require('../../assets/animations/CatTyping.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.pendingTitle}>Waiting for Approval</Text>
          <Text style={styles.pendingMessage}>
            Your community secretary is reviewing your request. Vendors will appear once you're approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── No community ──
  if (shouldShowMissing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendors</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.communityMissingContainer}>
          <LottieView
            source={require('../../assets/animations/not_found.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.communityMissingTitle}>No Official Community</Text>
          <Text style={styles.communityMissingSubtitle}>
            You are not part of any official community yet. Join one to see local vendors.
          </Text>
          <TouchableOpacity
            style={styles.joinCommunityButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.joinButtonText}>Join a Community</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading state ──
  if (isLoading && !isFetching && scopedCategories.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendors</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (error && !isLoading) {
    const errorMessage = error?.data?.message || error?.error || 'Failed to load vendors';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendors</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main content ──
  const showOfflineBanner = !isOnline && scopedCategories.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendors</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        {needsCommunity && (
          <View style={styles.needsCommunityBanner}>
            <Icon name="information-circle-outline" size={scaleFont(18)} color="#92400E" />
            <Text style={styles.needsCommunityText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              You are not part of a community yet, so vendors from other communities will not be shown.
            </Text>
          </View>
        )}

        {/* ── Categories horizontal scroll ── */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {scopedCategories.length === 0 ? (
              <View style={styles.emptyChipsContainer}>
                <Icon name="business-outline" size={scaleFont(24)} color={COLORS.textMuted} />
                <Text style={styles.emptyChipsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No vendors in your community yet.
                </Text>
              </View>
            ) : (
              scopedCategories.map((cat) => {
                const count = (vendorsByCategory[cat] || []).length;
                const active = selectedCategory === cat;
                return (
                  <CategoryChip
                    key={cat}
                    label={cat}
                    count={count}
                    active={active}
                    onPress={() => setSelectedCategory(cat)}
                  />
                );
              })
            )}
          </ScrollView>
        </View>

        {/* ── Vendor list ── */}
        <ScrollView
          style={styles.vendorsSection}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + moderateScale(30, 0.3) }}
        >
          {!selectedCategory ? (
            <View style={styles.emptyState}>
              <Icon name="grid-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Select a category above
              </Text>
            </View>
          ) : selectedVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="business-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No vendors in this category
              </Text>
            </View>
          ) : (
            <View style={styles.vendorsList}>
              {selectedVendors.map((vendor) => (
                <VendorCard
                  key={vendor._id}
                  vendor={vendor}
                  isOnline={isOnline}
                  onPress={() => openVendorDetail(vendor)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>

      {/* ── Vendor Detail Modal ── */}
      <VendorDetailModal
        vendor={selectedVendor}
        visible={modalVisible}
        onClose={closeModal}
        isOnline={isOnline}
      />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: scaleWidth(100),
    backgroundColor: COLORS.primaryLight,
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  needsCommunityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(8),
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: moderateScale(12, 0.3),
    padding: moderateScale(14, 0.3),
    marginHorizontal: scaleWidth(20),
    marginTop: scaleHeight(12),
  },
  needsCommunityText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#92400E',
    lineHeight: moderateScale(18, 0.3),
  },
  categoriesSection: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(8),
  },
  chipsContainer: {
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(4),
  },
  chip: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
  },
  chipActive: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F5F3FF',
  },
  chipText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
  },
  emptyChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    paddingVertical: scaleHeight(8),
  },
  emptyChipsText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },
  vendorsSection: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(12),
  },
  emptyStateText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  vendorsList: {
    rowGap: moderateScale(14, 0.3),
    paddingTop: scaleHeight(8),
    paddingBottom: moderateScale(20, 0.3),
  },

  // ── Vendor Card (full-width, white) ──
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(14, 0.3),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardAvatar: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(26, 0.3),
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  cardInitials: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
  },
  cardTextWrap: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(3),
    borderRadius: moderateScale(12, 0.3),
    marginBottom: scaleHeight(4),
  },
  categoryBadgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  cardService: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    marginTop: scaleHeight(12),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(4),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(10, 0.3),
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.white,
  },
  callButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  callButtonText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
  },
  callButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(4),
    flex: 1,
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#F3F0FF',
  },
  detailButtonText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primaryLight,
  },

  // ── Modal (white, size-to-content, no gradient) ──
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: moderateScale(20, 0.3),
    maxHeight: '80%',
    borderRadius: moderateScale(24, 0.3),
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(14),
    paddingBottom: scaleHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  modalContent: {
    paddingBottom: scaleHeight(20),
  },
  modalTopSection: {
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(140, 0.3),
    backgroundColor: COLORS.white,
  },
  modalAvatar: {
    width: moderateScale(84, 0.3),
    height: moderateScale(84, 0.3),
    borderRadius: moderateScale(42, 0.3),
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(10),
  },
  modalInitials: {
    fontSize: scaleFont(36),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
  },
  modalCategoryBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(14, 0.3),
  },
  modalCategoryBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBody: {
    padding: moderateScale(20, 0.3),
  },
  modalName: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalService: {
    fontSize: scaleFont(16),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(12),
  },
  modalNotes: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scaleHeight(16),
    lineHeight: moderateScale(20, 0.3),
  },
  modalInfoRow: {
    flexDirection: 'row',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(16),
  },
  modalInfoItem: {
    flex: 1,
    backgroundColor: '#F9F7FF',
    borderRadius: moderateScale(12, 0.3),
    padding: moderateScale(12, 0.3),
    borderWidth: 1,
    borderColor: '#EDE9FF',
  },
  modalInfoLabel: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInfoValue: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(2),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scaleWidth(12),
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: moderateScale(12, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(6),
    paddingVertical: scaleHeight(12),
  },
  modalActionBtnCall: {
    backgroundColor: COLORS.primaryLight,
  },
  modalActionBtnEmail: {
    backgroundColor: '#6D28D9',
  },
  modalActionBtnDisabled: {
    opacity: 0.5,
  },
  modalActionText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  // ── Pending ──
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
    backgroundColor: COLORS.white,
  },
  lottie: {
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
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },

  // ── No community ──
  communityMissingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    paddingBottom: scaleHeight(30),
    backgroundColor: COLORS.white,
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
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scaleHeight(10),
    marginBottom: scaleHeight(30),
    lineHeight: moderateScale(24, 0.3),
  },
  joinCommunityButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    width: '100%',
    maxWidth: scaleWidth(250),
    backgroundColor: COLORS.primaryLight,
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default VendorsScreen;