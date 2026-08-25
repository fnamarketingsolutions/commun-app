import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont } from '../../utils/responsive';
import {
  useLoginMutation,
  useSendLoginOtpMutation,
  useVerifyLoginOtpMutation,
} from '../../redux/service/api';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ── Shared navigation helper ──────────────────────────────────────────────────
const getRouteForUser = (user) => {
  const role   = user?.role;
  const status = user?.accountStatus || 'approved';
  if (role === 'admin' || role === 'secretary') return ROUTES.TABS;
  if (status === 'pending' || status === 'rejected') return ROUTES.PENDING;
  return ROUTES.TABS;
};

// ── Validation helpers ────────────────────────────────────────────────────────
const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validateOtp   = (otp)   => /^[0-9]{4,6}$/.test(otp.trim());

// ─────────────────────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  // ── Login method: 'phone' (default) | 'email' ─────────────────────────────
  const [loginMethod, setLoginMethod] = useState('phone');

  // ── Phone OTP state ───────────────────────────────────────────────────────
  const [phone, setPhone]     = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp]         = useState('');

  // ── Email/password state ──────────────────────────────────────────────────
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPass] = useState(false);

  const [focusedField, setFocused] = useState(null);

  // ── RTK Query mutations ───────────────────────────────────────────────────
  const [login,          { isLoading: isEmailLoading }] = useLoginMutation();
  const [sendLoginOtp,   { isLoading: isSendingOtp }]   = useSendLoginOtpMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingOtp }] = useVerifyLoginOtpMutation();

  const isLoading = isEmailLoading || isSendingOtp || isVerifyingOtp;

  // ── Network status ────────────────────────────────────────────────────────
  const { isOnline } = useNetworkStatus();

  // ── Debounce timer ref ────────────────────────────────────────────────────
  const debounceTimer = useRef(null);

  // ── Scroll + input refs, so we can bring a focused field above the keyboard ─
  const scrollRef = useRef(null);
  const passwordInputRef = useRef(null);
  const passwordFieldY = useRef(0);

  // ── Cleanup timer on unmount ──────────────────────────────────────────────
  const clearDebounce = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDebounce();
    };
  }, [clearDebounce]);

  // ── Switch method ─────────────────────────────────────────────────────────
  const switchToPhone = useCallback(() => {
    clearDebounce();
    setLoginMethod('phone');
    setOtpStep(false);
    setOtp('');
    setFocused(null);
  }, [clearDebounce]);

  const switchToEmail = useCallback(() => {
    clearDebounce();
    setLoginMethod('email');
    setOtpStep(false);
    setFocused(null);
  }, [clearDebounce]);

  // ── Phone OTP handlers ────────────────────────────────────────────────────
  const handleSendOtp = useCallback(() => {
    clearDebounce();
    const digits = phone.replace(/\D/g, '');
    if (!validatePhone(digits)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10‑digit phone number.');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        await sendLoginOtp({ phoneNumber: digits }).unwrap();
        setOtpStep(true);
        setOtp('');
      } catch (err) {
        const msg = err?.data?.message || err?.message || 'Could not send OTP. Please try again.';
        Alert.alert('Unable to send OTP', msg);
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [phone, sendLoginOtp, clearDebounce]);

  const handleVerifyOtp = useCallback(() => {
    clearDebounce();
    const digits = phone.replace(/\D/g, '');
    const code   = otp.trim();
    if (!validateOtp(code)) {
      Alert.alert('Invalid OTP', 'Please enter the 6 digit OTP sent to your phone.');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await verifyLoginOtp({ phoneNumber: digits, code }).unwrap();
        const route = getRouteForUser(result?.user);
        navigation.replace(route);
      } catch (err) {
        const msg = err?.data?.message || err?.message || 'Invalid or expired OTP. Please try again.';
        Alert.alert('Verification failed', msg);
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [phone, otp, verifyLoginOtp, navigation, clearDebounce]);

  // ── Email login handler ───────────────────────────────────────────────────
  const handleEmailSignIn = useCallback(() => {
    clearDebounce();
    const emailTrim = email.trim();
    const pass      = password.trim();
    if (!validateEmail(emailTrim)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (pass.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await login({ email: emailTrim, password: pass }).unwrap();
        const route = getRouteForUser(result?.user);
        navigation.replace(route);
      } catch (err) {
        let msg = 'Invalid email or password. Please try again.';
        if (err?.data?.message) {
          msg = err.data.message;
        } else if (err?.message) {
          msg = err.message;
        } else if (typeof err === 'string') {
          msg = err;
        }
        Alert.alert('Sign in failed', msg);
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [email, password, login, navigation, clearDebounce]);

  // ── Scroll the password field above the keyboard when it's focused ────────
  const handlePasswordFocus = useCallback(() => {
    setFocused('password');
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: passwordFieldY.current, animated: true });
    }, 120);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : moderateScale(24, 0.2)}
        >
          <NetworkAwareView
            isOnline={isOnline}
            showOfflineBanner={!isOnline}
            message="No internet connection. Please check your network."
          >
            <ScrollView
              ref={scrollRef}
              style={styles.root}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

              {/* ── Badge ── */}
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badge}>
                <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  WELCOME BACK
                </Text>
              </LinearGradient>

              <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Sign In
              </Text>
              <Text style={styles.subheading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {loginMethod === 'phone'
                  ? otpStep
                    ? `OTP sent to +91 ${phone}`
                    : 'Enter your phone number to receive an OTP.'
                  : 'Sign in with your email and password.'}
              </Text>

              {/* ── PHONE OTP ── */}
              {loginMethod === 'phone' && (
                <>
                  {!otpStep && (
                    <>
                      <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        Phone Number
                      </Text>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.gradientBorder,
                          focusedField === 'phone' && styles.gradientBorderFocused,
                        ]}
                      >
                        <View style={styles.inputInnerContainer}>
                          <Text style={styles.phonePrefix}>+91</Text>
                          <View style={styles.phoneDivider} />
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Enter 10-digit number"
                            placeholderTextColor={COLORS.textMuted}
                            value={phone}
                            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                            onFocus={() => setFocused('phone')}
                            onBlur={() => setFocused(null)}
                            keyboardType="phone-pad"
                            editable={!isLoading && isOnline}
                            maxLength={10}
                            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                          />
                        </View>
                      </LinearGradient>

                      <TouchableOpacity
                        onPress={handleSendOtp}
                        activeOpacity={0.85}
                        style={styles.btnWrapper}
                        disabled={isLoading || !isOnline}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.btn}
                        >
                          {isSendingOtp ? (
                            <ActivityIndicator color={COLORS.white} />
                          ) : (
                            <>
                              <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                                {isOnline ? 'Send OTP' : 'No Internet'}
                              </Text>
                              {isOnline && (
                                <Icon
                                  name="arrow-forward"
                                  size={scaleFont(17)}
                                  color={COLORS.white}
                                  style={{ marginLeft: moderateScale(6, 0.2) }}
                                />
                              )}
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}

                  {otpStep && (
                    <>
                      <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        Enter OTP
                      </Text>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.gradientBorder,
                          focusedField === 'otp' && styles.gradientBorderFocused,
                        ]}
                      >
                        <View style={styles.inputInnerContainer}>
                          <TextInput
                            style={[styles.input, { flex: 1, letterSpacing: moderateScale(4, 0.2) }]}
                            placeholder="------"
                            placeholderTextColor={COLORS.textMuted}
                            value={otp}
                            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                            onFocus={() => setFocused('otp')}
                            onBlur={() => setFocused(null)}
                            keyboardType="number-pad"
                            editable={!isLoading && isOnline}
                            maxLength={6}
                            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                          />
                        </View>
                      </LinearGradient>

                      <View style={styles.otpActions}>
                        <TouchableOpacity
                          onPress={() => { setOtpStep(false); setOtp(''); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          disabled={isLoading}
                        >
                          <GradientText
                            colors={gradientColors}
                            style={styles.otpActionLink}
                            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                          >
                            Change number
                          </GradientText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSendOtp}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          disabled={isLoading || !isOnline}
                        >
                          <GradientText
                            colors={gradientColors}
                            style={styles.otpActionLink}
                            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                          >
                            Resend OTP
                          </GradientText>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={handleVerifyOtp}
                        activeOpacity={0.85}
                        style={styles.btnWrapper}
                        disabled={isLoading || !isOnline}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.btn}
                        >
                          {isVerifyingOtp ? (
                            <ActivityIndicator color={COLORS.white} />
                          ) : (
                            <>
                              <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                                {isOnline ? 'Verify & Sign In' : 'No Internet'}
                              </Text>
                              {isOnline && (
                                <Icon
                                  name="arrow-forward"
                                  size={scaleFont(17)}
                                  color={COLORS.white}
                                  style={{ marginLeft: moderateScale(6, 0.2) }}
                                />
                              )}
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    onPress={switchToEmail}
                    style={styles.toggleMethodBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={isLoading}
                  >
                    <Text style={styles.toggleMethodText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Login with email instead
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── EMAIL + PASSWORD ── */}
              {loginMethod === 'email' && (
                <>
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
                        placeholder="Enter your email address"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading && isOnline}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      />
                    </View>
                  </LinearGradient>

                  <View style={styles.labelRow}>
                    <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Password
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <GradientText
                        colors={gradientColors}
                        style={styles.forgotLink}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        Forgot Password?
                      </GradientText>
                    </TouchableOpacity>
                  </View>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.gradientBorder,
                      focusedField === 'password' && styles.gradientBorderFocused,
                    ]}
                  >
                    <View
                      style={styles.inputInnerContainer}
                      onLayout={(e) => { passwordFieldY.current = e.nativeEvent.layout.y; }}
                    >
                      <TextInput
                        ref={passwordInputRef}
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Enter your password"
                        placeholderTextColor={COLORS.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={handlePasswordFocus}
                        onBlur={() => setFocused(null)}
                        secureTextEntry={!showPassword}
                        editable={!isLoading && isOnline}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        returnKeyType="done"
                        onSubmitEditing={handleEmailSignIn}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPass((p) => !p)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={scaleFont(19)}
                          color={COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>

                  <TouchableOpacity
                    onPress={handleEmailSignIn}
                    activeOpacity={0.85}
                    style={styles.btnWrapper}
                    disabled={isLoading || !isOnline}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btn}
                    >
                      {isEmailLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <>
                          <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                            {isOnline ? 'Sign In' : 'No Internet'}
                          </Text>
                          {isOnline && (
                            <Icon
                              name="arrow-forward"
                              size={scaleFont(17)}
                              color={COLORS.white}
                              style={{ marginLeft: moderateScale(6, 0.2) }}
                            />
                          )}
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={switchToPhone}
                    style={styles.toggleMethodBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={isLoading}
                  >
                    <Text style={styles.toggleMethodText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Login with phone instead
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── Sign Up link ── */}
              <View style={styles.footer}>
                <Text style={styles.footerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.REGISTER)}
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

            </ScrollView>
          </NetworkAwareView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: moderateScale(20, 0.2),
    paddingVertical: moderateScale(10, 0.2),
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
    fontSize: scaleFont(FONTS.heading) + 4,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    lineHeight: moderateScale(19, 0.2),
    marginTop: moderateScale(3, 0.2),
    marginBottom: moderateScale(16, 0.2),
  },
  label: {
    fontSize: scaleFont(FONTS.label - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(5, 0.2),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(5, 0.2),
    marginTop: moderateScale(10, 0.2),
  },
  forgotLink: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
  },
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
  inputRowFocused: { borderColor: COLORS.primary },
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
    marginTop: moderateScale(16, 0.2),
    borderRadius: moderateScale(RADIUS.lg, 0.2),
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateScale(14, 0.2),
  },
  footerText: {
    fontSize: scaleFont(FONTS.link),
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: scaleFont(FONTS.link),
    fontWeight: FONTS.weightSemiBold,
  },
  phonePrefix: {
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
    marginRight: moderateScale(8, 0.2),
  },
  phoneDivider: {
    width: moderateScale(1, 0.2),
    height: moderateScale(18, 0.2),
    backgroundColor: COLORS.border,
    marginRight: moderateScale(10, 0.2),
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: moderateScale(8, 0.2),
  },
  otpActionLink: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
  },
  toggleMethodBtn: {
    alignSelf: 'center',
    marginTop: moderateScale(12, 0.2),
  },
  toggleMethodText: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
});

export default LoginScreen;