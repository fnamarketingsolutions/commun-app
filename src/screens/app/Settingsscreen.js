import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
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
import { useLogoutMutation, useDeleteAccountMutation, useUnregisterMobilePushMutation, api } from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { ROUTES } from '../../navigations/routes';
import { clearToken } from '../../utils/tokenStorage';
import { CustomAlertModal } from '../../components/CustomAlertModal';

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
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const [unregisterMobilePush] = useUnregisterMobilePushMutation();
  const { isOnline } = useNetworkStatus();
  const [imageError, setImageError] = useState(false);

  // ── Delete Account Modal State ──
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isSecretaryOrAdmin = user?.role === 'secretary' || user?.role === 'admin';

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

  // ─── Sign Out Flow ─────────────────────────────────────────────────────────
  const handleSignOut = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutModal(false);

    // 1. Immediately clear local session, tokens & state
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
      routes: [{ name: ROUTES.LOGIN }],
    });

    // 3. Fire-and-forget server logout & FCM token cleanup in background
    (async () => {
      try {
        const messaging = getMessaging();
        const token = await Promise.race([
          getToken(messaging),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        if (token) {
          await unregisterMobilePush({ token }).unwrap().catch(() => {});
          await deleteToken(messaging).catch(() => {});
        }
      } catch (_) { }

      try {
        await logout().unwrap();
      } catch (_) { }
    })();
  };

  // ── Open Delete Modal ──
  const handleOpenDeleteModal = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to perform account operations.');
      return;
    }
    if (isSecretaryOrAdmin) {
      Alert.alert(
        'Action Not Allowed',
        'Secretary and admin accounts cannot be deleted directly from the mobile app.'
      );
      return;
    }
    setDeletePassword('');
    setDeleteConfirmationText('');
    setShowDeletePassword(false);
    setDeleteModalVisible(true);
  };

  // ── Confirm Delete Account Handler ──
  const handleConfirmDelete = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to delete your account.');
      return;
    }
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deletion.');
      return;
    }
    if (deleteConfirmationText.trim() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE in uppercase to confirm.');
      return;
    }

    const payload = { currentPassword: deletePassword.trim() };

    try {
      const response = await deleteAccount(payload).unwrap();

      // Clean up FCM & app state
      try {
        const messaging = getMessaging();
        const token = await getToken(messaging);
        if (token) {
          await unregisterMobilePush({ token }).unwrap();
          await deleteToken(messaging);
        }
      } catch (_) { }

      dispatch(clearAllNotifications());
      dispatch(clearUser());
      dispatch(clearWishlist());
      dispatch(api.util.resetApiState());

      setDeleteModalVisible(false);

      const successMsg =
        response?.message || 'Your account has been deleted permanently. You are now logged out.';

      Alert.alert(
        'Account Deleted',
        successMsg,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.LOGIN }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      console.error('========================================');
      console.error('[CLIENT DELETE ACCOUNT ERROR (Settings)] Error response:', err);
      console.error('========================================');

      const errorMsg =
        err?.data?.message || err?.message || 'Could not delete account. Please verify your password.';
      Alert.alert('Deletion Failed', errorMsg);
    }
  };

  const isDeleteButtonEnabled =
    deletePassword.trim().length > 0 &&
    deleteConfirmationText.trim() === 'DELETE' &&
    !isDeleting &&
    isOnline;

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
            label="Password & Security"
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

        {/* ── Delete Account (Above Sign Out) ── */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={handleOpenDeleteModal}
          activeOpacity={0.75}
          disabled={isDeleting}>
          <Icon name="trash-outline" size={scaleFont(18)} color="#DC2626" />
          <Text style={styles.deleteAccountBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {isDeleting ? 'Deleting account...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

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

      {/* ── Delete Account Confirmation Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setDeleteModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoid}
            >
              <View style={styles.modalCard}>
                {/* Modal Top Warning Icon */}
                <View style={styles.modalIconWrap}>
                  <Icon name="warning-outline" size={scaleFont(32)} color="#DC2626" />
                </View>

                <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Delete Account?
                </Text>

                <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  This action is permanent and cannot be undone. To proceed, please confirm your password and type{' '}
                  <Text style={{ fontWeight: FONTS.weightBold, color: '#DC2626' }}>DELETE</Text> below.
                </Text>

                {/* Input 1: Password Confirmation */}
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Confirm Password
                  </Text>
                  <View style={styles.modalInputWrap}>
                    <Icon name="lock-closed-outline" size={scaleFont(18)} color={COLORS.textMuted} style={{ marginRight: scaleWidth(8) }} />
                    <TextInput
                      style={styles.modalInput}
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showDeletePassword}
                      autoCapitalize="none"
                      editable={!isDeleting}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    />
                    <TouchableOpacity
                      onPress={() => setShowDeletePassword((v) => !v)}
                      style={styles.modalEyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon
                        name={showDeletePassword ? 'eye-outline' : 'eye-off-outline'}
                        size={scaleFont(18)}
                        color={COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Input 2: Type DELETE Input */}
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Type "DELETE" to confirm
                  </Text>
                  <View
                    style={[
                      styles.modalInputWrap,
                      deleteConfirmationText === 'DELETE' && styles.modalInputWrapValid,
                    ]}
                  >
                    <Icon
                      name="shield-outline"
                      size={scaleFont(18)}
                      color={deleteConfirmationText === 'DELETE' ? '#16A34A' : COLORS.textMuted}
                      style={{ marginRight: scaleWidth(8) }}
                    />
                    <TextInput
                      style={styles.modalInput}
                      value={deleteConfirmationText}
                      onChangeText={setDeleteConfirmationText}
                      placeholder="Type DELETE"
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!isDeleting}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    />
                    {deleteConfirmationText === 'DELETE' && (
                      <Icon name="checkmark-circle" size={scaleFont(18)} color="#16A34A" />
                    )}
                  </View>
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalDeleteBtn,
                      !isDeleteButtonEnabled && styles.modalDeleteBtnDisabled,
                    ]}
                    onPress={handleConfirmDelete}
                    disabled={!isDeleteButtonEnabled}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.modalDeleteBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        Delete Account
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Sign Out Confirmation Modal ── */}
      <CustomAlertModal
        visible={showLogoutModal}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        primaryButtonText="Sign Out"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmSignOut}
        onSecondaryPress={() => setShowLogoutModal(false)}
        onClose={() => setShowLogoutModal(false)}
      />
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
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8, 0.3),
    backgroundColor: '#FEF2F2',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: '#FECACA',
    paddingVertical: scaleHeight(15),
    marginBottom: scaleHeight(12),
  },
  deleteAccountBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: '#DC2626',
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

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  modalKeyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(22, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(16, 0.3),
    elevation: 8,
  },
  modalIconWrap: {
    width: moderateScale(56, 0.3),
    height: moderateScale(56, 0.3),
    borderRadius: moderateScale(28, 0.3),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: scaleHeight(12),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(6),
  },
  modalSubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(18, 0.3),
    marginBottom: scaleHeight(18),
    paddingHorizontal: scaleWidth(6),
  },
  modalFieldGroup: {
    marginBottom: scaleHeight(14),
  },
  modalFieldLabel: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(12),
    minHeight: moderateScale(48, 0.3),
  },
  modalInputWrapValid: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  modalInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(10) : scaleHeight(6),
    fontWeight: FONTS.weightMedium,
  },
  modalEyeBtn: {
    padding: moderateScale(4, 0.3),
    marginLeft: moderateScale(4, 0.3),
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12, 0.3),
    marginTop: scaleHeight(10),
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingVertical: scaleHeight(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  modalDeleteBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default SettingsScreen;