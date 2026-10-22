// screens/auth/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, ScrollView,
  Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont } from '../../utils/responsive';
import { useForgotPasswordMutation } from '../../redux/service/api';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import GradientText from '../../components/common/GradientText';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [focusedField, setFocused] = useState(null);
  const [sent, setSent] = useState(false);

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  // ── Offline detection ──
  const { isOnline } = useNetworkStatus();
  const isOffline = !isOnline;

  const handleSend = async () => {
    if (isOffline) {
      Alert.alert('No Internet', 'Please connect to the internet to send a reset link.');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email Required', 'Please enter your registered email address.');
      return;
    }
    try {
      await forgotPassword({ email: trimmed }).unwrap();
      setSent(true);
    } catch (error) {
      // Silent: no console.error
      const message = error?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Unable to send reset link', message);
    }
  };

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

        {/* ── OFFLINE BANNER ── */}
        {isOffline && (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.offlineBanner}
          >
            <Text style={styles.offlineBannerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              No Internet Connection
            </Text>
          </LinearGradient>
        )}

        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.root}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="arrow-back" size={scaleFont(18)} color={COLORS.primary} />
            </TouchableOpacity>

            {sent ? (
              <View style={styles.successWrapper}>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    ACCOUNT RECOVERY
                  </Text>
                </LinearGradient>

                <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Check Your Inbox
                </Text>
                <Text style={styles.subheading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  If an account exists for{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                  , we've sent a reset link.
                </Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.LOGIN)}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Back To Sign In
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSend}
                  style={styles.resendBtn}
                  activeOpacity={0.7}
                  disabled={isLoading || isOffline}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Text style={styles.resendText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        Didn't receive it?{' '}
                      </Text>
                      <GradientText
                        colors={gradientColors}
                        style={styles.resendLink}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        Resend
                      </GradientText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    ACCOUNT RECOVERY
                  </Text>
                </LinearGradient>

                <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Forgot Password?
                </Text>
                <Text style={styles.subheading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Enter your registered email address and we'll send you a password reset link.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Email Address
                  </Text>

                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.gradientBorder,
                      focusedField === 'email' && styles.gradientBorderFocused,
                    ]}
                  >
                    <View style={styles.inputInnerContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="name@example.com"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading && !isOffline}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        returnKeyType="done"
                        onSubmitEditing={handleSend}
                      />
                      {email.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setEmail('')}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Icon name="close-circle" size={scaleFont(16)} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                </View>

                <TouchableOpacity
                  onPress={handleSend}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={isLoading || isOffline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {isOffline ? 'No Internet' : 'Send Reset Link'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                  style={styles.secondaryBtnWrapper}
                >
                  <View style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Back To Sign In
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate(ROUTES.REGISTER)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  >
                    <GradientText
                      colors={gradientColors}
                      style={styles.footerLink}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      Sign Up
                    </GradientText>
                  </TouchableOpacity>
                </View>

                <Text style={styles.copyright} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  © 2024 Commun. All rights reserved.
                </Text>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: moderateScale(20, 0.2),
    paddingVertical: moderateScale(8, 0.2),
  },
  offlineBanner: {
    paddingVertical: moderateScale(6, 0.2),
    paddingHorizontal: moderateScale(16, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  backBtn: {
    position: 'absolute',
    top: moderateScale(8, 0.2),
    left: moderateScale(20, 0.2),
    width: moderateScale(38, 0.2),
    height: moderateScale(38, 0.2),
    borderRadius: moderateScale(RADIUS.md, 0.2),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...SHADOW.card,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: moderateScale(RADIUS.full, 0.2),
    paddingHorizontal: moderateScale(16, 0.2),
    paddingVertical: moderateScale(6, 0.2),
    marginBottom: moderateScale(10, 0.2),
    ...SHADOW.button,
  },
  badgeText: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.5, 0.1),
  },
  heading: {
    fontSize: scaleFont(FONTS.heading) + 2,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    lineHeight: moderateScale(18, 0.2),
    marginTop: moderateScale(3, 0.2),
    marginBottom: moderateScale(14, 0.2),
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
  },
  fieldGroup: { marginBottom: moderateScale(4, 0.2) },
  label: {
    fontSize: scaleFont(FONTS.label - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(5, 0.2),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  // Original input styles (kept for reference)
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    minHeight: moderateScale(46, 0.2),
    borderWidth: moderateScale(1, 0.2),
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  inputRowFocused: { borderColor: COLORS.gradientStart },
  // Gradient border styles
  gradientBorder: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    padding: 2,
    backgroundColor: 'transparent',
    ...SHADOW.card,
  },
  gradientBorderFocused: {
    padding: 3,
  },
  inputInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg - 2, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    minHeight: moderateScale(46, 0.2),
  },
  input: {
    flex: 1,
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textPrimary,
    padding: 0,
  },
  btnWrapper: {
    marginTop: moderateScale(14, 0.2),
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    alignSelf: 'stretch',
    ...SHADOW.button,
  },
  btn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(13, 0.2),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: scaleFont(FONTS.button) + 1,
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  secondaryBtnWrapper: { marginTop: moderateScale(10, 0.2) },
  secondaryBtn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(13, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1, 0.2),
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    fontSize: scaleFont(FONTS.button) + 1,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateScale(16, 0.2),
  },
  footerText: {
    fontSize: scaleFont(FONTS.link),
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: scaleFont(FONTS.link),
    fontWeight: FONTS.weightSemiBold,
    // color removed – handled by GradientText
  },
  copyright: {
    textAlign: 'center',
    fontSize: scaleFont(FONTS.small) - 1,
    color: COLORS.textMuted,
    marginTop: moderateScale(8, 0.2),
  },
  successWrapper: {
    alignItems: 'stretch',
    paddingVertical: moderateScale(4, 0.2),
  },
  resendBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: moderateScale(12, 0.2),
  },
  resendText: {
    fontSize: scaleFont(FONTS.link),
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontSize: scaleFont(FONTS.link),
    fontWeight: FONTS.weightSemiBold,
    // color removed – handled by GradientText
  },
});

export default ForgotPasswordScreen;