// screens/secretary/ProviderRequestDetailScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useFetchPendingRegistrationsQuery } from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
};

const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
};

// ─── Avatar Component ────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, profileImage, size = 100 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);
  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        onError={() => setImageError(true)}
      />
    );
  }
  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, styles.initialsAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
    >
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

// ─── Info Row ────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, isLast = false }) => (
  <>
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>{icon}</View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {label}
        </Text>
        <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {value || '—'}
        </Text>
      </View>
    </View>
    {!isLast && <View style={styles.rowDivider} />}
  </>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProviderRequestDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestId, onApprove, onReject } = route.params || {};

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data: requests = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchPendingRegistrationsQuery();

  const item = requests.find(r => r._id === requestId);

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

  // ── Determine if we have cached data for offline banner ──
  const hasData = !!item;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader only on initial load (no cached data) ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Request
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error / not found state (only if no cached data) ──
  if ((isError || !item) && !hasData) {
    const message = error?.data?.message || 'Request not found.';
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Request
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(48)} color="#EF4444" />
          <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {message}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── If for some reason item is still missing but hasData is false, fallback ──
  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Request
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(48)} color="#EF4444" />
          <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Request not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'User';
  const role = item.role || 'provider';

  const handleApprove = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to approve.');
      return;
    }
    Alert.alert(
      'Approve Provider',
      `Are you sure you want to approve ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            if (onApprove) onApprove();
            navigation.goBack();
          },
          style: 'default',
        },
      ],
      { cancelable: true }
    );
  };

  const handleReject = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to reject.');
      return;
    }
    Alert.alert(
      'Reject Provider',
      `Are you sure you want to reject ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: () => {
            if (onReject) onReject();
            navigation.goBack();
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Provider Request
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Request details are still available."
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <Avatar
              firstName={item.firstName}
              lastName={item.lastName}
              profileImage={item.profileImage}
              size={100}
            />
            <Text style={styles.name} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {fullName}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                PENDING
              </Text>
            </View>
          </View>

          {/* Contact Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="person-circle-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Contact Information
              </Text>
            </View>
            <InfoRow
              icon={<Icon name="mail-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              label="Email"
              value={item.email}
            />
            <InfoRow
              icon={<Icon name="call-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              label="Phone"
              value={item.phoneNumber || '—'}
              isLast
            />
          </View>

          {/* Request Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="information-circle-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Request Details
              </Text>
            </View>
            <InfoRow
              icon={<MaterialIcon name="badge-account-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              label="Role"
              value={role.charAt(0).toUpperCase() + role.slice(1)}
            />
            <InfoRow
              icon={<Icon name="calendar-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              label="Requested On"
              value={formatDate(item.createdAt)}
              isLast
            />
          </View>

          {/* Address Card (if available) */}
          {item.addressLine1 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="location-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Address
                </Text>
              </View>
              <InfoRow
                icon={<Icon name="home-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                label="Street"
                value={item.addressLine1}
              />
              {item.city && (
                <InfoRow
                  icon={<MaterialIcon name="city-variant-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                  label="City / State / Zip"
                  value={[item.city, item.state, item.zip].filter(Boolean).join(', ')}
                  isLast
                />
              )}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.rejectButton, !isOnline && { opacity: 0.5 }]}
          onPress={handleReject}
          disabled={!isOnline}
        >
          <Text style={[styles.rejectText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {isOnline ? 'Reject' : 'Offline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveButtonWrapper, !isOnline && { opacity: 0.5 }]}
          onPress={handleApprove}
          activeOpacity={0.85}
          disabled={!isOnline}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.approveButton}
          >
            <Text style={[styles.approveText, !isOnline && { color: COLORS.border }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {isOnline ? 'Approve' : 'Offline'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles – updated icon colors ──────────────────────────────────────────
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(24),
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: scaleHeight(24),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
  },
  avatar: {
    backgroundColor: COLORS.border,
    marginBottom: scaleHeight(12),
    borderWidth: moderateScale(3, 0.3),
    borderColor: COLORS.white,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  name: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
  },
  roleBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    marginBottom: scaleHeight(8),
  },
  roleBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.full, 0.3),
  },
  statusPillText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: '#B45309',
    letterSpacing: moderateScale(0.5, 0.2),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(14),
  },
  cardTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(8),
    gap: moderateScale(12, 0.3),
  },
  infoIconWrap: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(8, 0.3),
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  infoValue: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightMedium,
    marginTop: scaleHeight(2),
  },
  rowDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: scaleHeight(4),
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(16),
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  rejectButton: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rejectText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  approveButtonWrapper: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(8, 0.2),
    elevation: 3,
  },
  approveButton: {
    height: moderateScale(48, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleWidth(20),
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: '#EF4444',
    marginTop: scaleHeight(12),
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
});

export default ProviderRequestDetailScreen;