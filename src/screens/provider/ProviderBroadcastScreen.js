// screens/provider/ProviderBroadcastScreen.jsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  SafeAreaView as RNModalSafeArea,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { useCommunityBroadcastsQuery } from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (e) {
    return '—';
  }
};

// ─── Broadcast Detail Modal ──────────────────────────────────────────────────
const BroadcastDetailModal = ({ visible, broadcast, onClose }) => {
  if (!broadcast) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalSheet}
          onPress={() => {}}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {broadcast.title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={scaleFont(24)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDate} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {formatDate(broadcast.createdAt)}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scaleHeight(20) }}
          >
            <Text style={styles.modalMessage} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {broadcast.message}
            </Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProviderBroadcastScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ── Modal state ──
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useCommunityBroadcastsQuery();

  const broadcasts = data?.data?.broadcasts || [];
  const meta = data?.data || {};

  // ── Stale‑time guard for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000; // 30 seconds

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

  // ── Open modal ──
  const openBroadcastDetail = (broadcast) => {
    setSelectedBroadcast(broadcast);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBroadcast(null);
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = !!data;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
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
            Broadcast
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render content ──
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
          Broadcast
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Broadcasts are still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
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
          <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Updates from your neighbourhood secretary
            {meta.communityCommunName ? ` (${meta.communityCommunName})` : ''}.
          </Text>

          {!meta.hasCommunity && (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                You are not linked to a Commun community yet.
              </Text>
            </View>
          )}

          {meta.hasCommunity && !meta.broadcastEnabled && (
            <View style={styles.emptyState}>
              <Icon name="megaphone-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Broadcast is not enabled for your community right now.
              </Text>
            </View>
          )}

          {meta.hasCommunity && meta.broadcastEnabled && broadcasts.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="mail" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No broadcasts yet. Check back later.
              </Text>
            </View>
          )}

          {broadcasts.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => openBroadcastDetail(item)}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {item.title}
                </Text>
                <Text style={styles.cardDate} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <Text style={styles.cardMessage} numberOfLines={3} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {item.message}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </NetworkAwareView>

      {/* ── Broadcast Detail Modal ── */}
      <BroadcastDetailModal
        visible={modalVisible}
        broadcast={selectedBroadcast}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  subtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(48),
    gap: scaleHeight(10),
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(14),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
  },
  cardTitle: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginRight: scaleWidth(8),
  },
  cardDate: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },
  cardMessage: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
  },

  // ── Modal styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    width: '100%',
    maxWidth: scaleWidth(420),
    maxHeight: '80%',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(4) },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
    paddingBottom: scaleHeight(8),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginRight: scaleWidth(12),
  },
  modalDate: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(14),
  },
  modalMessage: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    lineHeight: moderateScale(24, 0.3),
  },
});

export default ProviderBroadcastScreen;