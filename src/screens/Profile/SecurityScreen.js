// screens/app/SecurityScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useChangePasswordMutation } from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Password strength helper ─────────────────────────────────────────────────
const getStrength = pwd => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: 'Weak', color: '#EF4444', width: '25%' };
  if (score === 2) return { label: 'Fair', color: '#F59E0B', width: '50%' };
  if (score === 3) return { label: 'Good', color: '#3B82F6', width: '75%' };
  return { label: 'Strong', color: '#22C55E', width: '100%' };
};

// ─── Password Input ───────────────────────────────────────────────────────────
const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  editable = true,
}) => {
  const [show, setShow] = useState(false);
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label}
      </Text>
      <View style={[fieldStyles.wrap, !editable && fieldStyles.wrapDisabled]}>
        {leftIcon && <View style={fieldStyles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!show}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="none"
          editable={editable}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
        <TouchableOpacity
          onPress={() => setShow(v => !v)}
          style={fieldStyles.eyeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!editable}
        >
          <Icon
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={scaleFont(20)}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const fieldStyles = StyleSheet.create({
  group: { marginBottom: moderateScale(14, 0.3) },
  label: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    marginBottom: scaleHeight(6),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    minHeight: moderateScale(50, 0.3),
  },
  wrapDisabled: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  iconLeft: { marginRight: scaleWidth(8) },
  input: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(12) : scaleHeight(8),
    fontWeight: FONTS.weightMedium,
    paddingLeft: moderateScale(4, 0.3),
  },
  inputDisabled: { color: COLORS.textMuted },
  eyeBtn: { padding: moderateScale(4, 0.3), marginLeft: moderateScale(4, 0.3) },
});

// ─── Security Tip Row ─────────────────────────────────────────────────────────
const TipRow = ({ text }) => (
  <View style={styles.tipRow}>
    <View style={styles.tipDot} />
    <Text style={styles.tipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {text}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SecurityScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();

  // ── Network status ──
  const { isOnline } = useNetworkStatus();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const strength = getStrength(newPassword);

  const handleChangePassword = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change your password.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Missing Field', 'Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();

      Alert.alert('Password Changed ✓', 'Your password has been updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to change password. Please try again.');
    }
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
          Security & Password
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={!isOnline}
          message="You are offline. Please connect to the internet to change your password."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + moderateScale(30, 0.3) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── Security Status Banner ── */}
            <LinearGradient
              colors={[`${COLORS.gradientStart}18`, `${COLORS.gradientEnd}18`]}
              style={styles.statusBanner}>
              <View style={styles.statusIconWrap}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.statusIconGrad}>
                  <Icon name="shield-checkmark-outline" size={scaleFont(24)} color={COLORS.white} />
                </LinearGradient>
              </View>
              <View style={styles.statusTexts}>
                <Text style={styles.statusTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Account Secured
                </Text>
                <Text style={styles.statusSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Keep your password strong and unique
                </Text>
              </View>
            </LinearGradient>

            {/* ── Change Password Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialIcon name="lock-reset" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Change Password
                </Text>
              </View>

              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                leftIcon={<Icon name="key-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
                editable={isOnline}
              />

              <PasswordInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Create new password"
                leftIcon={<MaterialIcon name="lock-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                inputRef={newPasswordRef}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                editable={isOnline}
              />

              {/* Strength bar */}
              {newPassword.length > 0 && strength && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: strength.width, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {strength.label}
                  </Text>
                </View>
              )}

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type new password"
                leftIcon={<MaterialIcon name="lock-check-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                inputRef={confirmPasswordRef}
                returnKeyType="done"
                editable={isOnline}
              />

              {/* Mismatch / match hint */}
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <View style={styles.mismatchRow}>
                  <Icon name="alert-circle-outline" size={scaleFont(14)} color="#EF4444" />
                  <Text style={styles.mismatchText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Passwords do not match
                  </Text>
                </View>
              )}
              {confirmPassword.length > 0 && newPassword === confirmPassword && (
                <View style={styles.matchRow}>
                  <Icon name="checkmark-circle-outline" size={scaleFont(14)} color="#22C55E" />
                  <Text style={styles.matchText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Passwords match
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleChangePassword}
                activeOpacity={0.85}
                disabled={isChanging || !isOnline}
                style={styles.gradBtnWrap}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.gradBtn, (isChanging || !isOnline) && { opacity: 0.6 }]}>
                  {isChanging ? (
                    <ActivityIndicator color={COLORS.white} size="small" style={{ marginRight: moderateScale(8, 0.3) }} />
                  ) : (
                    <Icon
                      name="shield-checkmark-outline"
                      size={scaleFont(18)}
                      color={COLORS.white}
                      style={{ marginRight: moderateScale(8, 0.3) }}
                    />
                  )}
                  <Text style={styles.gradBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {isChanging ? 'Updating...' : isOnline ? 'Change Password' : 'No Internet'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Tips Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="bulb-outline" size={scaleFont(18)} color="#F59E0B" />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Password Tips
                </Text>
              </View>
              <TipRow text="Use at least 8 characters" />
              <TipRow text="Include uppercase and lowercase letters" />
              <TipRow text="Add at least one number" />
              <TipRow text="Use special characters (!, @, #, $...)" />
              <TipRow text="Avoid using your name or email" />
            </View>

            {/* Back to profile link */}
            <TouchableOpacity
              onPress={() => navigation?.navigate('EditProfile')}
              activeOpacity={0.7}
              style={styles.editLink}>
              <View style={styles.editLinkIconWrap}>
                <Icon name="person-outline" size={scaleFont(16)} color={COLORS.gradientStart} />
              </View>
              <Text style={[styles.editLinkText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Update personal info? Go to Edit Profile
              </Text>
              <View style={styles.editLinkIconWrap}>
                <Icon name="chevron-forward" size={scaleFont(16)} color={COLORS.gradientStart} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles – Danger Zone (Delete Account) styles removed ────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
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
    paddingTop: scaleHeight(16),
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(14, 0.3),
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
  },
  statusIconWrap: {},
  statusIconGrad: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(24, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTexts: { flex: 1 },
  statusTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  statusSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(3),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(18),
  },
  cardHeaderIcon: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(14),
    marginTop: -scaleHeight(4),
  },
  strengthBarBg: {
    flex: 1,
    height: moderateScale(5, 0.3),
    backgroundColor:COLORS.white,
    borderRadius: moderateScale(3, 0.3),
    overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: moderateScale(3, 0.3) },
  strengthLabel: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    minWidth: moderateScale(48, 0.3),
  },
  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(12),
  },
  mismatchText: {
    fontSize: scaleFont(12),
    color: '#EF4444',
    fontWeight: FONTS.weightMedium,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(12),
  },
  matchText: {
    fontSize: scaleFont(12),
    color: '#22C55E',
    fontWeight: FONTS.weightMedium,
  },
  gradBtnWrap: {
    marginTop: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  gradBtn: {
    paddingVertical: scaleHeight(17),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    paddingVertical: scaleHeight(6),
  },
  tipDot: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    borderRadius: moderateScale(3, 0.3),
    backgroundColor: COLORS.primary,
  },
  tipText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: moderateScale(18, 0.3),
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6, 0.3),
    paddingVertical: scaleHeight(14),
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    marginBottom: scaleHeight(8),
  },
  editLinkIconWrap: {
    width: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft:scaleHeight(10),
    marginRight:scaleHeight(10),
  },
  editLinkText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    flex: 1,
    textAlign: 'center',
    // color: COLORS.primary, // removed, now applied via style array
  },
});

export default SecurityScreen;