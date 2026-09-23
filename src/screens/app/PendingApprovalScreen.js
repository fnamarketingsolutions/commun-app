// screens/app/PendingApprovalScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useLogoutMutation, useCheckAuthQuery, api } from '../../redux/service/api';
import { clearUser } from '../../redux/slices/authSlice';
import { clearWishlist } from '../../redux/slices/wishlistSlice';
import { clearAllNotifications } from '../../redux/slices/notificationSlice';
import { clearToken } from '../../utils/tokenStorage';
import { CustomAlertModal } from '../../components/CustomAlertModal';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ROUTES } from '../../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const PendingApprovalScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState('Just now');

  // ── Polling: Hit /check-auth every 30 seconds ─────────────────────────────
  const {
    data: authData,
    refetch: refetchAuth,
    isFetching: isCheckingStatus,
  } = useCheckAuthQuery(undefined, {
    pollingInterval: 30000,
  });

  // ── Automatic redirect once approved ──────────────────────────────────────
  useEffect(() => {
    const currentStatus = user?.accountStatus || authData?.user?.accountStatus;
    if (currentStatus === 'approved') {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.TABS }],
      });
    }
  }, [user?.accountStatus, authData?.user?.accountStatus, navigation]);

  // ── Pulse & Breathing Animation for Hourglass ────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(1)).current;
  const ringOpacityAnim = useRef(new Animated.Value(0.6)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing icon
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glowing expanding ring
    const ringRipple = Animated.loop(
      Animated.parallel([
        Animated.timing(ringScaleAnim, {
          toValue: 1.45,
          duration: 2400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ringOpacityAnim, {
            toValue: 0,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breathing.start();
    ringRipple.start();

    return () => {
      breathing.stop();
      ringRipple.stop();
    };
  }, [pulseAnim, ringScaleAnim, ringOpacityAnim]);

  // Spin animation when checking status
  useEffect(() => {
    if (isCheckingStatus) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
      const now = new Date();
      setLastCheckedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [isCheckingStatus, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleManualCheck = useCallback(() => {
    refetchAuth();
  }, [refetchAuth]);

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);

    // 1. Immediately clear local session & tokens
    try {
      await clearToken();
    } catch (_) { }

    dispatch(clearAllNotifications());
    dispatch(clearUser());
    dispatch(clearWishlist());
    dispatch(api.util.resetApiState());

    // 2. Immediately redirect navigation to Login screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    // 3. Fire-and-forget server logout in background
    try {
      logoutMutation().unwrap().catch(() => {});
    } catch (_) { }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Resident';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Badge & Icon */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: ringScaleAnim }],
                opacity: ringOpacityAnim,
              },
            ]}
          />
          <Animated.View style={[styles.iconCard, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialIcon name="timer-sand" size={scaleFont(52)} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Live Status Badge */}
        <View style={styles.statusPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusPillText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Wait till Secretary Approval
          </Text>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Account Pending Approval
        </Text>

        <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Hello <Text style={styles.userNameHighlight}>{fullName}</Text>, your application has been submitted and is currently under review by the community secretary.
        </Text>

        {/* Community Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon name="home-outline" size={scaleFont(18)} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Community</Text>
              <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                @{user?.communityCommunName || 'Your Community'}
              </Text>
            </View>
          </View>

          {!!user?.flatNumber && (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <View style={styles.infoIconWrap}>
                <Icon name="business-outline" size={scaleFont(18)} color={COLORS.primary} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Flat / Unit</Text>
                <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {user.flatNumber}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <View style={styles.infoIconWrap}>
              <Icon name="sync-outline" size={scaleFont(18)} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Auto-Checking Status</Text>
              <Text style={styles.infoSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Auto-refreshes every 30 seconds (Last: {lastCheckedTime})
              </Text>
            </View>
          </View>
        </View>

        {/* Check Status Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleManualCheck}
          disabled={isCheckingStatus}
          activeOpacity={0.75}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="refresh" size={scaleFont(18)} color={COLORS.primary} />
          </Animated.View>
          <Text style={styles.refreshButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {isCheckingStatus ? 'Checking Status...' : 'Check Status Now'}
          </Text>
        </TouchableOpacity>

        {/* Go Home Button */}
        <TouchableOpacity
          style={styles.homeButtonWrap}
          onPress={handleGoHome}
          activeOpacity={0.85}
          disabled={isLoggingOut}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.homeButton}
          >
            <Text style={styles.homeButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Browse Public Home
            </Text>
            <Icon name="arrow-forward" size={scaleFont(18)} color={COLORS.white} style={{ marginLeft: scaleWidth(6) }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.75}
        >
          <Icon name="log-out-outline" size={scaleFont(18)} color="#EF4444" style={{ marginRight: scaleWidth(6) }} />
          <Text style={styles.logoutText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Sign Out Confirmation Modal ── */}
      <CustomAlertModal
        visible={showLogoutModal}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        primaryButtonText="Yes, Sign Out"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmLogout}
        onSecondaryPress={() => setShowLogoutModal(false)}
        onClose={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    paddingHorizontal: scaleWidth(24),
    paddingTop: scaleHeight(28),
    paddingBottom: scaleHeight(36),
    alignItems: 'center',
  },
  animationContainer: {
    width: moderateScale(120, 0.3),
    height: moderateScale(120, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(20),
  },
  pulseRing: {
    position: 'absolute',
    width: moderateScale(110, 0.3),
    height: moderateScale(110, 0.3),
    borderRadius: moderateScale(55, 0.3),
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  iconCard: {
    width: moderateScale(94, 0.3),
    height: moderateScale(94, 0.3),
    borderRadius: moderateScale(47, 0.3),
    overflow: 'hidden',
    ...SHADOW.button,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: moderateScale(RADIUS.full, 0.2),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(6),
    marginBottom: scaleHeight(16),
  },
  pulseDot: {
    width: moderateScale(8, 0.2),
    height: moderateScale(8, 0.2),
    borderRadius: moderateScale(4, 0.2),
    backgroundColor: '#D97706',
    marginRight: scaleWidth(8),
  },
  statusPillText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: '#92400E',
    letterSpacing: moderateScale(0.3, 0.1),
  },
  title: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(10),
  },
  subtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scaleHeight(21),
    marginBottom: scaleHeight(22),
    paddingHorizontal: scaleWidth(8),
  },
  userNameHighlight: {
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    marginBottom: scaleHeight(18),
    ...SHADOW.card,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(10),
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  infoIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    marginBottom: scaleHeight(2),
  },
  infoValue: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  infoSubtext: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(18),
    backgroundColor: '#F5F3FF',
    borderRadius: moderateScale(RADIUS.full, 0.2),
    marginBottom: scaleHeight(20),
  },
  refreshButtonText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
  },
  homeButtonWrap: {
    width: '100%',
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(12),
    ...SHADOW.button,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(24),
  },
  homeButtonText: {
    color: COLORS.white,
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    width: '100%',
  },
  logoutText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: '#DC2626',
  },
});

export default PendingApprovalScreen;