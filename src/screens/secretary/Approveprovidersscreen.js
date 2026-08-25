// screens/secretary/ApproveProvidersScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert, // 👈 Added Alert import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchPendingRegistrationsQuery,
  useApproveUserRegistrationMutation,
  useRejectUserRegistrationMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Get initials ────────────────────────────────────────────────────────────
const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
};

// ─── Avatar Component ────────────────────────────────────────────────────────
const RequestAvatar = ({ firstName, lastName, profileImage, size = 52 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);
  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.initialsAvatar,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ApproveProvidersScreen = () => {
  const navigation = useNavigation();

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

  const [approveUserRegistration] = useApproveUserRegistrationMutation();
  const [rejectUserRegistration] = useRejectUserRegistrationMutation();

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

  const handleDetails = item => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to view details.');
      return;
    }
    navigation.navigate('ProviderRequestDetail', {
      requestId: item._id,
      onApprove: () => handleApprove(item._id),
      onReject: () => handleReject(item._id),
    });
  };

  const handleApprove = async id => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to approve.');
      return;
    }
    try {
      await approveUserRegistration(id).unwrap();
    } catch (e) {
      // error handled by slice
    }
  };

  const handleReject = async id => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to reject.');
      return;
    }
    try {
      await rejectUserRegistration(id).unwrap();
    } catch (e) {}
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = requests.length > 0;
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
            Approve Providers
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (only if no cached data) ──
  if (isError && !hasData) {
    const message = error?.data?.message || 'Unable to load requests.';
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
            Approve Providers
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.emptyState}>
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

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Approve Providers
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Pending requests are still available."
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Pending Requests
            </Text>
            <Text style={styles.sectionCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {requests.length} TOTAL
            </Text>
          </View>

          {isLoading || isFetching ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={COLORS.gradientStart} />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="checkmark-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No pending requests right now.
              </Text>
            </View>
          ) : (
            requests.map((item, index) => {
              const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');
              const category = item.role
                ? item.role.charAt(0).toUpperCase() + item.role.slice(1)
                : '';
              const description = [item.email, item.phoneNumber].filter(Boolean).join(' · ');

              return (
                <View key={item._id}>
                  <View style={styles.requestRow}>
                    <RequestAvatar
                      firstName={item.firstName}
                      lastName={item.lastName}
                      profileImage={item.profileImage}
                      size={52}
                    />

                    <View style={styles.nameColumn}>
                      <Text style={styles.name} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {fullName}
                      </Text>
                      <Text style={styles.category} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {category}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.detailsButton, !isOnline && { opacity: 0.5 }]}
                      onPress={() => handleDetails(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={!isOnline}
                    >
                      <Text style={[styles.detailsText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        Details
                      </Text>
                      <Icon name="chevron-forward" size={scaleFont(15)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.description} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {description}
                  </Text>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.rejectButton, !isOnline && { opacity: 0.5, borderColor: COLORS.border }]}
                      activeOpacity={0.7}
                      onPress={() => handleReject(item._id)}
                      disabled={!isOnline}
                    >
                      <Text style={[styles.rejectText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {isOnline ? 'Reject' : 'Offline'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveButtonWrapper, !isOnline && { opacity: 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => handleApprove(item._id)}
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

                  {index < requests.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – updated back button, details, and loading colors ─────────────
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
    paddingTop: scaleHeight(24),
    paddingBottom: scaleHeight(32),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(20),
  },
  sectionTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
    letterSpacing: moderateScale(0.4, 0.2),
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    backgroundColor: COLORS.border,
    marginRight: scaleWidth(14),
  },
  initialsAvatar: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  nameColumn: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  name: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  category: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: scaleHeight(2),
  },
  detailsText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    // color now dynamically set
  },
  description: {
    fontSize: scaleFont(15),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
    marginTop: scaleHeight(14),
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: scaleHeight(18),
  },
  rejectButton: {
    flex: 1,
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rejectText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  approveButtonWrapper: {
    flex: 1,
  },
  approveButton: {
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginTop: scaleHeight(24),
    marginBottom: scaleHeight(24),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
  },
  emptyText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scaleHeight(12),
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
});

export default ApproveProvidersScreen;