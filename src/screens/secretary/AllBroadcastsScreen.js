// screens/secretary/AllBroadcastsScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchBroadcastsQuery,
  useDeleteBroadcastMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const formatBroadcastDate = isoDate => {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return '';
  }
};

// ── Confirm Delete Modal ────────────────────────────────────────────────────
const DeleteConfirmModal = ({ visible, broadcast, onConfirm, onCancel, isDeleting, isOnline }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconWrap}>
          <Icon name="trash-outline" size={scaleFont(28)} color={COLORS.error || '#E53935'} />
        </View>

        <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Delete Broadcast?
        </Text>
        <Text style={styles.modalBody} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {broadcast
            ? `"${broadcast.title}" will be permanently removed and members will no longer see it.`
            : ''}
        </Text>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.cancelBtn, !isOnline && { opacity: 0.5 }]}
            onPress={onCancel}
            disabled={isDeleting || !isOnline}
            activeOpacity={0.75}
          >
            <Text style={[styles.cancelBtnText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {isOnline ? 'Cancel' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, !isOnline && { opacity: 0.5 }]}
            onPress={onConfirm}
            disabled={isDeleting || !isOnline}
            activeOpacity={0.85}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.deleteBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Delete' : 'Offline'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Broadcast Row Card ──────────────────────────────────────────────────────
const BroadcastCard = ({ item, onDeletePress, isOnline }) => (
  <View style={styles.broadcastCard}>
    <View style={styles.broadcastTopRow}>
      <Text
        style={styles.broadcastTitle}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      >
        {item.title}
      </Text>

      <View style={styles.cardRight}>
        <View style={styles.sentBadge}>
          <Text style={styles.sentBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            SENT
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteIconBtn, !isOnline && { opacity: 0.4 }]}
          onPress={() => isOnline && onDeletePress(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          disabled={!isOnline}
        >
          <Icon name="trash-outline" size={scaleFont(18)} color={isOnline ? (COLORS.error || '#E53935') : COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>

    <Text
      style={styles.broadcastMessage}
      numberOfLines={3}
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
    >
      {item.message}
    </Text>

    <View style={styles.broadcastDateRow}>
      <Icon name="calendar-outline" size={scaleFont(14)} color={COLORS.textMuted} />
      <Text style={styles.broadcastDateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {formatBroadcastDate(item.createdAt)}
      </Text>
    </View>
  </View>
);

// ── Main Screen ─────────────────────────────────────────────────────────────
const AllBroadcastsScreen = () => {
  const navigation = useNavigation();

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data: broadcastsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchBroadcastsQuery();

  const [deleteBroadcast, { isLoading: isDeleting }] = useDeleteBroadcastMutation();

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

  const broadcasts = broadcastsData?.broadcasts || [];

  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleDeletePress = item => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to delete a broadcast.');
      return;
    }
    setSelectedBroadcast(item);
    setModalVisible(true);
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setModalVisible(false);
    setSelectedBroadcast(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBroadcast) return;
    try {
      await deleteBroadcast(selectedBroadcast._id).unwrap();
      setModalVisible(false);
      setSelectedBroadcast(null);
    } catch (e) {
      setModalVisible(false);
      setSelectedBroadcast(null);
      Alert.alert('Error', 'Could not delete broadcast. Please try again.');
    }
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = !!broadcastsData;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
            All Broadcasts
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (only if no cached data) ──
  if (isError && !hasData) {
    const message = error?.data?.message || 'Unable to load broadcasts.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
            All Broadcasts
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingState}>
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
          All Broadcasts
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Count sub-header ── */}
      {!isLoading && broadcasts.length > 0 && (
        <View style={styles.countBar}>
          <Text style={styles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {broadcasts.length} {broadcasts.length === 1 ? 'broadcast' : 'broadcasts'}
          </Text>
        </View>
      )}

      {/* ── Wrap FlatList with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Broadcasts are still available."
      >
        <FlatList
          data={broadcasts}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <BroadcastCard
              item={item}
              onDeletePress={handleDeletePress}
              isOnline={isOnline}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            broadcasts.length === 0 && styles.listContentEmpty,
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
        />
      </NetworkAwareView>

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        visible={modalVisible}
        broadcast={selectedBroadcast}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
        isOnline={isOnline}
      />
    </SafeAreaView>
  );
};

// ─── Render Empty ────────────────────────────────────────────────────────────
const renderEmpty = () => (
  <View style={styles.emptyState}>
    <Icon name="megaphone-outline" size={scaleFont(48)} color={COLORS.border} />
    <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      No Broadcasts Yet
    </Text>
    <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      Broadcasts you send will appear here.
    </Text>
  </View>
);

// ─── Styles – updated back button and loading colors ──────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
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

  // Count bar
  countBar: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(14),
    paddingBottom: scaleHeight(2),
  },
  countText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightSemiBold,
  },

  // List
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(14),
    paddingBottom: scaleHeight(32),
  },
  listContentEmpty: {
    flex: 1,
  },

  // Loading / Empty
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(40),
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
  },
  emptySubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },

  // Broadcast card
  broadcastCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(14),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  broadcastTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  broadcastTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  sentBadge: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(5),
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  sentBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.3, 0.1),
    color: COLORS.primary,
  },
  deleteIconBtn: {
    padding: scaleWidth(2),
  },
  broadcastMessage: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    marginTop: scaleHeight(8),
    lineHeight: moderateScale(20, 0.3),
  },
  broadcastDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleHeight(12),
  },
  broadcastDateText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginLeft: scaleWidth(6),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(28),
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
    ...SHADOW.card,
    elevation: 8,
  },
  modalIconWrap: {
    width: moderateScale(56, 0.3),
    height: moderateScale(56, 0.3),
    borderRadius: moderateScale(28, 0.3),
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(16),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(10),
    textAlign: 'center',
  },
  modalBody: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(24),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scaleWidth(12),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  deleteBtn: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.error || '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default AllBroadcastsScreen;