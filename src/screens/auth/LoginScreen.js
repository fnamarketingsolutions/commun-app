import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../theme';
import { moderateScale, scaleFont } from '../../utils/responsive';
import styles from './CSS/LoginScrencss';
import {
  useLoginMutation,
  useSendLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useLazyCheckAuthQuery,
} from '../../redux/service/api';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';
import CustomAlertModal from '../../components/CustomAlertModal';


const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ── Shared navigation helper ──────────────────────────────────────────────────
const getRouteForUser = (user) => {
  const role = user?.role;
  const status = user?.accountStatus || 'approved';
  if (role === 'admin' || role === 'secretary') return ROUTES.TABS;
  if (status === 'pending' || status === 'rejected') return ROUTES.PENDING;
  return ROUTES.TABS;
};

// ── Validation helpers ────────────────────────────────────────────────────────
const loginErrorText = (err, fallback) => {
  const data = err?.data;
  let serverMessage = fallback;
  if (typeof data === 'string' && data.trim()) serverMessage = data;
  else if (typeof data?.message === 'string' && data.message.trim()) serverMessage = data.message;
  else if (typeof data?.error === 'string' && data.error.trim()) serverMessage = data.error;
  else if (typeof err?.message === 'string' && err.message.trim()) serverMessage = err.message;

  const cleaned = String(serverMessage).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
  return cleaned || fallback;
};

const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validateOtp = (otp) => /^[0-9]{4,6}$/.test(otp.trim());

// ─────────────────────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  // ── Login method: 'phone' (default) | 'email' ─────────────────────────────
  const [loginMethod, setLoginMethod] = useState('phone');

  // ── Phone OTP state ───────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (otpStep) {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [otpStep]);

  // ── Resend countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  // ── Email/password state ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPass] = useState(false);

  const [focusedField, setFocused] = useState(null);

  // ── RTK Query mutations ───────────────────────────────────────────────────
  const [login, { isLoading: isEmailLoading }] = useLoginMutation();
  const [sendLoginOtp, { isLoading: isSendingOtp }] = useSendLoginOtpMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingOtp }] = useVerifyLoginOtpMutation();
  const [triggerCheckAuth] = useLazyCheckAuthQuery();

  const isLoading = isEmailLoading || isSendingOtp || isVerifyingOtp;

  // ── Network status ────────────────────────────────────────────────────────
  const { isOnline } = useNetworkStatus();

  // ── Debounce timer ref ────────────────────────────────────────────────────
  const debounceTimer = useRef(null);

  // ── Scroll + input refs, so we can bring a focused field above the keyboard ─
  const scrollRef = useRef(null);
  const passwordInputRef = useRef(null);
  const otpInputRef = useRef(null);
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

  // ── Alert Modal state ─────────────────────────────────────────────────────
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
  });

  const showAlert = useCallback((title, message, type = 'error') => {
    setAlertConfig({ visible: true, title, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  // ── Switch method ─────────────────────────────────────────────────────────
  const switchToPhone = useCallback(() => {
    clearDebounce();
    setLoginMethod('phone');
    setOtpStep(false);
    setOtp('');
    setResendSeconds(0);
    setFocused(null);
  }, [clearDebounce]);

  const switchToEmail = useCallback(() => {
    clearDebounce();
    setLoginMethod('email');
    setOtpStep(false);
    setResendSeconds(0);
    setFocused(null);
  }, [clearDebounce]);

  // ── Phone OTP handlers ────────────────────────────────────────────────────
  const handleSendOtp = useCallback(() => {
    clearDebounce();
    const digits = phone.replace(/\D/g, '');
    if (!validatePhone(digits)) {
      showAlert('Invalid Number', 'Please enter a valid 10‑digit phone number.', 'warning');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        await sendLoginOtp({ phoneNumber: digits }).unwrap();
        setOtpStep(true);
        setOtp('');
        setResendSeconds(30);
      } catch (err) {
        showAlert('Unable to send OTP', loginErrorText(err, 'Could not send OTP. Please try again.'), 'error');
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [phone, sendLoginOtp, clearDebounce, showAlert]);

  const handleVerifyOtp = useCallback(() => {
    clearDebounce();
    const digits = phone.replace(/\D/g, '');
    const code = otp.trim();
    if (!validateOtp(code)) {
      showAlert('Invalid OTP', 'Please enter the 6 digit OTP sent to your phone.', 'warning');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await verifyLoginOtp({ phoneNumber: digits, code }).unwrap();
        let user = result?.user;
        try {
          const checked = await triggerCheckAuth(undefined, false).unwrap();
          console.log('[auth] check-auth after login', {
            platform: Platform.OS,
            valid: Boolean(checked?.user),
          });
          if (checked?.user) user = checked.user;
        } catch (checkErr) {
          console.log('[auth] check-auth after login failed', checkErr?.status || checkErr?.message);
        }
        navigation.replace(getRouteForUser(user));
      } catch (err) {
        showAlert('Verification failed', loginErrorText(err, 'Invalid or expired OTP. Please try again.'), 'error');
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [phone, otp, verifyLoginOtp, triggerCheckAuth, navigation, clearDebounce, showAlert]);

  // ── Email login handler ───────────────────────────────────────────────────
  const handleEmailSignIn = useCallback(() => {
    clearDebounce();
    const emailTrim = email.trim();
    const pass = password.trim();
    if (!validateEmail(emailTrim)) {
      showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }
    if (pass.length < 8) {
      showAlert('Invalid Password', 'Password must be at least 8 characters.', 'warning');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await login({ email: emailTrim, password: pass }).unwrap();
        let user = result?.user;
        try {
          const checked = await triggerCheckAuth(undefined, false).unwrap();
          console.log('[auth] check-auth after login', {
            platform: Platform.OS,
            valid: Boolean(checked?.user),
          });
          if (checked?.user) user = checked.user;
        } catch (checkErr) {
          console.log('[auth] check-auth after login failed', checkErr?.status || checkErr?.message);
        }
        navigation.replace(getRouteForUser(user));
      } catch (err) {
        showAlert('Sign in failed', loginErrorText(err, 'Invalid email or password. Please try again.'), 'error');
      } finally {
        debounceTimer.current = null;
      }
    }, 300);
  }, [email, password, login, triggerCheckAuth, navigation, clearDebounce, showAlert]);

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
                <Text
                  style={styles.badgeText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
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
                        Enter 6-Digit OTP
                      </Text>

                      {/* ── 6-Box Hotstar-style OTP Input ── */}
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => otpInputRef.current?.focus()}
                        style={styles.otpContainer}
                      >
                        <View style={styles.otpBoxesRow}>
                          {[0, 1, 2, 3, 4, 5].map((index) => {
                            const digit = otp[index] || '';
                            const isCurrentBox =
                              focusedField === 'otp' &&
                              (otp.length === index || (index === 5 && otp.length === 6));

                            return (
                              <View
                                key={index}
                                style={[
                                  styles.otpBox,
                                  digit ? styles.otpBoxFilled : null,
                                  isCurrentBox ? styles.otpBoxFocused : null,
                                ]}
                              >
                                {digit ? (
                                  <Text style={styles.otpDigit} maxFontSizeMultiplier={1.2}>
                                    {digit}
                                  </Text>
                                ) : isCurrentBox ? (
                                  <View style={styles.otpCursor} />
                                ) : null}
                              </View>
                            );
                          })}
                        </View>

                        {/* Hidden TextInput handling keyboard input, backspace & SMS autofill */}
                        <TextInput
                          ref={otpInputRef}
                          style={styles.hiddenInput}
                          value={otp}
                          onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                          onFocus={() => setFocused('otp')}
                          onBlur={() => setFocused(null)}
                          keyboardType="number-pad"
                          maxLength={6}
                          textContentType="oneTimeCode"
                          autoComplete="sms-otp"
                          editable={!isLoading && isOnline}
                          caretHidden
                        />
                      </TouchableOpacity>

                      <View style={styles.otpActions}>
                        <TouchableOpacity
                          onPress={() => { setOtpStep(false); setOtp(''); setResendSeconds(0); }}
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
                          disabled={isLoading || !isOnline || resendSeconds > 0}
                        >
                          {resendSeconds > 0 ? (
                            <Text style={styles.otpActionDisabled} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                              Resend OTP in {resendSeconds}s
                            </Text>
                          ) : (
                            <GradientText
                              colors={gradientColors}
                              style={styles.otpActionLink}
                              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                            >
                              Resend OTP
                            </GradientText>
                          )}
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

      {/* ── Beautiful Themed Alert Modal ── */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
      />
    </GestureHandlerRootView>
  );
};

export default LoginScreen;