// screens/secretary/BroadcastScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchBroadcastsQuery,
  useCreateBroadcastMutation,
  useFetchFeatureTogglesQuery,
  useUpdateFeatureToggleMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText'; // 👈 NEW

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

const BroadcastScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── RTK Query ──
  const {
    data: broadcastsData,
    isLoading: broadcastsLoading,
    isFetching: isFetchingBroadcasts,
    isError: isErrorBroadcasts,
    error: errorBroadcasts,
    refetch: refetchBroadcasts,
  } = useFetchBroadcastsQuery();

  const {
    data: featureTogglesData,
    isLoading: togglesLoading,
    isFetching: isFetchingToggles,
    isError: isErrorToggles,
    error: errorToggles,
    refetch: refetchToggles,
  } = useFetchFeatureTogglesQuery();

  const [createBroadcast, { isLoading: isSending }] = useCreateBroadcastMutation();
  const [updateFeatureToggle] = useUpdateFeatureToggleMutation();

  // ── Combined refetch ──
  const refetchAll = useCallback(() => {
    refetchBroadcasts();
    refetchToggles();
  }, [refetchBroadcasts, refetchToggles]);

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
          refetchAll();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAll();
    lastFetchTime.current = Date.now();
  }, [refetchAll, isOnline]);

  const broadcasts = broadcastsData?.broadcasts || [];
  const showToMembers = Boolean(featureTogglesData?.toggles?.broadcast);

  const handleToggleChange = async value => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change this setting.');
      return;
    }
    try {
      await updateFeatureToggle({ key: 'broadcast', enabled: value }).unwrap();
    } catch (e) {}
  };

  const handleSendBroadcast = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to send a broadcast.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      return;
    }

    try {
      await createBroadcast({ title: title.trim(), message: message.trim() }).unwrap();
      setTitle('');
      setMessage('');
    } catch (e) {}
  };

  const handleViewAll = () => {
    navigation.navigate('AllBroadcastsScreen');
  };

  // ── Determine if we have cached data for offline banner ──
  const hasData = !!broadcastsData || !!featureTogglesData;
  const showOfflineBanner = !isOnline && hasData;

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  // ── Full‑screen loader only on initial load (no cached data) ──
  const isLoading = broadcastsLoading || togglesLoading;
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
            Broadcast
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
  if ((isErrorBroadcasts || isErrorToggles) && !hasData) {
    const message = errorBroadcasts?.data?.message || errorToggles?.data?.message || 'Unable to load data.';
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
            Broadcast
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
          Broadcast
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* ── Wrap ScrollView with NetworkAwareView ── */}
        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={showOfflineBanner}
          message="You are offline. Broadcast settings are still available."
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={(isFetchingBroadcasts || isFetchingToggles) && isOnline}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.gradientStart}
              />
            }
          >
            {/* Toggle card */}
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextColumn}>
                  <Text style={styles.toggleTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Show Broadcast To Members
                  </Text>
                  <Text style={styles.toggleSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Allow residents and providers to view community broadcasts.
                  </Text>
                </View>
                <Switch
                  value={showToMembers}
                  onValueChange={handleToggleChange}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                  ios_backgroundColor={COLORS.border}
                  disabled={!isOnline}
                />
              </View>
            </View>

            {/* New broadcast form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                New Broadcast
              </Text>
              <Text style={styles.cardSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Share important information with your community.
              </Text>

              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Broadcast Title
              </Text>
              <TextInput
                style={[styles.input, !isOnline && { opacity: 0.6, color: COLORS.textMuted }]}
                placeholder="Water supply maintenance"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
                editable={isOnline}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              />

              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Message Body
              </Text>
              <TextInput
                style={[styles.textarea, !isOnline && { opacity: 0.6, color: COLORS.textMuted }]}
                placeholder="Write your announcement here..."
                placeholderTextColor={COLORS.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                editable={isOnline}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSendBroadcast}
                disabled={isSending || !isOnline}
                style={!isOnline && { opacity: 0.5 }}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendButton}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.sendButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {isOnline ? 'Send Broadcast' : 'No Internet'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Recent broadcasts */}
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Recent Broadcasts
              </Text>
              <TouchableOpacity onPress={handleViewAll}>
                <GradientText
                  colors={gradientColors}
                  style={styles.viewAllText}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  View All
                </GradientText>
              </TouchableOpacity>
            </View>

            {broadcastsLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              </View>
            ) : (
              broadcasts.map(item => (
                <View key={item._id} style={styles.broadcastCard}>
                  <View style={styles.broadcastTopRow}>
                    <Text style={styles.broadcastTitle} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {item.title}
                    </Text>
                    <View style={styles.sentBadge}>
                      <Text style={styles.sentBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        SENT
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.broadcastPreview} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {item.message}
                  </Text>
                  <View style={styles.broadcastDateRow}>
                    <Icon name="calendar-outline" size={scaleFont(14)} color={COLORS.textMuted} />
                    <Text style={styles.broadcastDateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {formatBroadcastDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles – updated back button and loading colors ──────────────────────
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(32),
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(40),
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextColumn: {
    flex: 1,
    paddingRight: scaleWidth(16),
  },
  toggleTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  toggleSubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    lineHeight: moderateScale(18, 0.3),
  },
  cardTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
  },
  cardSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(20),
  },
  fieldLabel: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
  },
  input: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(20),
  },
  textarea: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    height: moderateScale(160, 0.3),
    marginBottom: scaleHeight(24),
  },
  sendButton: {
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  sendButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(16),
  },
  recentTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  // ── View All text – color removed, handled by GradientText ──
  viewAllText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
  },
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
  broadcastPreview: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    marginTop: scaleHeight(6),
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
});

export default BroadcastScreen;