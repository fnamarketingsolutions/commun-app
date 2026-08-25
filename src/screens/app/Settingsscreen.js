// screens/app/SettingsScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { getMessaging, getToken, deleteToken } from '@react-native-firebase/messaging';
import { clearUser } from '../../redux/slices/authSlice';
import { clearWishlist } from '../../redux/slices/wishlistSlice';
import { clearAllNotifications } from '../../redux/slices/notificationSlice';
import { useLogoutMutation, useUnregisterMobilePushMutation, api } from '../../redux/service/api';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

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

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ title }) => (
  <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
    {title}
  </Text>
);

// ─── Settings Row ─────────────────────────────────────────────────────────────
const SettingsRow = ({
  icon,
  label,
  onPress,
  showChevron = true,
  rightElement,
  isFirst = false,
}) => (
  <TouchableOpacity
    style={[styles.row, !isFirst && styles.rowBorderTop]}
    onPress={onPress}
    activeOpacity={onPress ? 0.65 : 1}>
    <View style={styles.rowLeft}>
      <View style={styles.rowIconWrap}>{icon}</View>
      <Text style={styles.rowLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label}
      </Text>
    </View>
    <View style={styles.rowRight}>
      {rightElement}
      {showChevron && (
        <Icon
          name="chevron-forward"
          size={scaleFont(18)}
          color={COLORS.textMuted}
          style={rightElement ? { marginLeft: moderateScale(6, 0.3) } : null}
        />
      )}
    </View>
  </TouchableOpacity>
);

// ─── Settings Card ────────────────────────────────────────────────────────────
const SettingsCard = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [unregisterMobilePush] = useUnregisterMobilePushMutation();
  const [imageError, setImageError] = useState(false);

  // Backend returns firstName + lastName separately
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const avatarUri = user?.profileImage || null;

  // Determine user role and status
  const role = user?.role || 'customer';
  const accountStatus = user?.accountStatus || 'approved';

  // ─── Community & provider eligibility (same logic as ProfileScreen) ──────
  const isPublic = useMemo(() => {
    if (!user) return true;
    return user.isPublicMember === true || !user.communityCommunName || user.communityCommunName === '__other__';
  }, [user]);

  const isPending = useMemo(() => accountStatus === 'pending', [accountStatus]);

  const canBecomeProvider = useMemo(() => {
    if (!user) return false;
    const isApproved = accountStatus === 'approved';
    return !isPublic && isApproved;
  }, [user, isPublic, accountStatus]);

  // ─── Handler for "Become a Provider" press ────────────────────────────────
  const handleBecomeProviderPress = () => {
    if (canBecomeProvider) {
      navigation.navigate('BecomeProvider');
      return;
    }

    // Show appropriate alert explaining why they cannot proceed
    if (isPublic) {
      Alert.alert(
        'Join a Community First',
        'You need to join a Commun community before you can become a provider. Please go to your profile settings and join a community.',
        [{ text: 'OK', onPress: () => navigation.navigate('EditProfile') }]
      );
    } else if (isPending) {
      Alert.alert(
        'Pending Approval',
        'Your community join request is pending approval. Please wait for the secretary to approve your membership before applying as a provider.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Unable to proceed',
        'Your account is not ready to become a provider. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  // ─── Render avatar – circular, no border/ring ─────────────────────────────
  const renderAvatar = () => {
    if (avatarUri && !imageError) {
      return (
        <Image
          source={{ uri: avatarUri }}
          style={styles.userAvatar}
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback: initials on gradient
    const initials = getInitials(user?.firstName, user?.lastName);
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.userAvatar, styles.initialsAvatar]}
      >
        <Text style={[styles.initialsText, { fontSize: scaleFont(22) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  // ─── Sign Out with FCM cleanup ─────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // ── 1. Clean up FCM token ──────────────────────────────────
              try {
                const messaging = getMessaging();
                const token = await getToken(messaging);
                if (token) {
                  await unregisterMobilePush({ token }).unwrap();
                  await deleteToken(messaging);
                }
              } catch (_) {
                // Ignore FCM cleanup errors – they shouldn't block logout
              }

              // ── 2. Clear all notifications from Redux ──────────────────
              dispatch(clearAllNotifications());

              // ── 3. Perform server logout ────────────────────────────────
              try {
                await logout().unwrap();
              } catch (_) {
                // Even if server fails, clear local state
              }

              // ── 4. Clear local state ────────────────────────────────────
              dispatch(clearUser());
              dispatch(clearWishlist());
              dispatch(api.util.resetApiState());

              // ── 5. Navigate to Login ────────────────────────────────────
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (_) {
              // Fallback: if anything fails, still reset navigation
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── User Card ── */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation?.navigate('ProfileInfo')}
          activeOpacity={0.8}>
          <View style={styles.userAvatarWrap}>
            {renderAvatar()}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {fullName}
            </Text>
            <Text style={styles.userEmail} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {user?.email || ''}
            </Text>
            <View style={styles.roleBadgeContainer}>
              <Text style={styles.roleBadge} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
                {accountStatus === 'pending' && ' (Pending)'}
                {accountStatus === 'rejected' && ' (Rejected)'}
              </Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={scaleFont(18)} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* ── Role-specific actions ──────────────────────────────────────── */}

        {/* Customer: become a provider (with eligibility check) */}
        {role === 'customer' && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleBecomeProviderPress}
            activeOpacity={0.75}>
            <Icon name="briefcase-outline" size={scaleFont(24)} color={COLORS.gradientStart} />
            <Text style={styles.actionText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Become a Provider
            </Text>
            {!canBecomeProvider && (
              <Text style={styles.actionSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isPublic ? '' : isPending ? 'Pending approval' : 'Unavailable'}
              </Text>
            )}
            <Icon name="chevron-forward" size={scaleFont(18)} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Provider: dashboard */}
        {role === 'provider' && accountStatus === 'approved' && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProviderDashboard')}>
            <Icon name="stats-chart-outline" size={scaleFont(24)} color={COLORS.gradientStart} />
            <Text style={styles.actionText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Provider Dashboard
            </Text>
            <Icon name="chevron-forward" size={scaleFont(18)} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Admin / Secretary panel */}
        {(role === 'admin' || role === 'secretary') && (
          <>
            <SectionLabel title="Admin Panel" />
            <SettingsCard>
              <SettingsRow
                isFirst
                icon={<Icon name="people-outline" size={scaleFont(20)} color={COLORS.gradientStart} />}
                label="Member List"
                onPress={() => navigation.navigate('CommunityMembers')}
              />
              <SettingsRow
                icon={<Icon name="checkmark-done-outline" size={scaleFont(20)} color={COLORS.gradientStart} />}
                label="Provider Approvals"
                onPress={() => navigation.navigate('ApproveProviders')}
              />
            </SettingsCard>
          </>
        )}

        {/* ── Profile ── */}
        <SectionLabel title="Profile" />
        <SettingsCard>
          <SettingsRow
            isFirst
            icon={<Icon name="create-outline" size={scaleFont(20)} color={COLORS.gradientStart} />}
            label="Edit Profile"
            onPress={() => navigation?.navigate('EditProfile')}
          />
          <SettingsRow
            icon={<MaterialIcon name="lock-outline" size={scaleFont(20)} color={COLORS.gradientStart} />}
            label="Security & Password"
            onPress={() => navigation?.navigate('Security')}
          />
        </SettingsCard>

        {/* ── Privacy ── */}
        <SectionLabel title="Privacy" />
        <SettingsCard>
          <SettingsRow
            isFirst
            icon={<MaterialIcon name="shield-account-outline" size={scaleFont(20)} color={COLORS.gradientStart} />}
            label="Privacy Policy"
            onPress={() => navigation.navigate('privacy')}
          />
        </SettingsCard>

        {/* ── Support & About ── */}
        <SectionLabel title="Support & About" />
        <SettingsCard>
          <SettingsRow
            isFirst
            icon={<Icon name="information-circle-outline" size={scaleFont(20)} color={COLORS.textMuted} />}
            label="About Commun"
            onPress={() => navigation?.navigate('about')}
          />
          <SettingsRow
            icon={<MaterialIcon name="file-document-outline" size={scaleFont(20)} color={COLORS.textMuted} />}
            label="Terms of Service"
            onPress={() => navigation.navigate('TermsOfService')}
          />
          <SettingsRow
            icon={<MaterialIcon name="help-circle-outline" size={scaleFont(20)} color={COLORS.textMuted} />}
            label="FAQ"
            onPress={() => navigation.navigate('FAQ')}
          />
          <SettingsRow
            icon={<MaterialIcon name="contacts" size={scaleFont(20)} color={COLORS.textMuted} />}
            label="Contact Us"
            onPress={() => navigation.navigate('Contact')}
          />
        </SettingsCard>

        {/* ── Sign Out ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.75}
          disabled={isLoggingOut}>
          <Icon name="log-out-outline" size={scaleFont(20)} color="#EF4444" />
          <Text style={styles.signOutText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
         Commun Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles – updated for circular avatar without border/ring ──────────────
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
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(4),
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(28),
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  // ── Avatar wrapper – no border, just circular clip ──
  userAvatarWrap: {
    width: moderateScale(58, 0.3),
    height: moderateScale(58, 0.3),
    borderRadius: moderateScale(29, 0.3),
    marginRight: scaleWidth(14),
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(29, 0.3), // half the size for circular
    backgroundColor: COLORS.border,
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
  userInfo: { flex: 1 },
  userName: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(3),
  },
  userEmail: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  roleBadgeContainer: {
    marginTop: 4,
  },
  roleBadge: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.05,
  },
  actionText: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginLeft: moderateScale(14, 0.3),
  },
  actionSubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginRight: moderateScale(6, 0.3),
  },
  sectionLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
    letterSpacing: moderateScale(0.3, 0.2),
    marginBottom: scaleHeight(10),
    marginLeft: scaleWidth(4),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    marginBottom: scaleHeight(28),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(15),
    minHeight: moderateScale(56, 0.3),
  },
  rowBorderTop: {
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  rowLabel: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(10, 0.3),
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: '#FECACA',
    paddingVertical: scaleHeight(17),
    marginBottom: scaleHeight(18),
    ...SHADOW.card,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  signOutText: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(8),
  },
});

export default SettingsScreen;