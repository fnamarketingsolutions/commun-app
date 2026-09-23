// screens/auth/RegisterScreen.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux'; // ✅ Added

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { scaleWidth, scaleHeight, scaleFont, moderateScale } from '../../utils/responsive';
import {
  useRegisterMutation,
  useSignupCommunitiesQuery,
  useSendSignupOtpMutation,
  useVerifySignupOtpMutation,
} from '../../redux/service/api';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';
import { setUser } from '../../redux/slices/authSlice'; // ✅ Added
import { CustomAlertModal } from '../../components/CustomAlertModal';

const { width } = Dimensions.get('window');

// ── Validation helpers ──────────────────────────────────────────────────────
const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validateOtp = (otp) => /^[0-9]{4,6}$/.test(otp.trim());
const validateName = (name) => /^[A-Za-z\s]{1,50}$/.test(name.trim());

const getStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['#E5E7EB', '#EF4444', '#F59E0B', '#10B981', '#7C3AED'];

// ── Step meta ────────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Name', icon: 'person-outline' },
  { label: 'Account', icon: 'lock-closed-outline' },
  { label: 'Phone', icon: 'call-outline' },
  { label: 'Community', icon: 'home-outline' },
  { label: 'Flat', icon: 'location-outline' },
];

// ── Progress bar ─────────────────────────────────────────────────────────────
const StepProgress = ({ current, total }) => (
  <View style={progress.wrap}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          progress.seg,
          { backgroundColor: i < current ? COLORS.primary : COLORS.border },
        ]}
      />
    ))}
  </View>
);

const progress = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: moderateScale(4), marginBottom: scaleHeight(14) },
  seg: { flex: 1, height: moderateScale(4), borderRadius: moderateScale(RADIUS.full) },
});

// ─────────────────────────────────────────────────────────────────────────────
const RegisterScreen = ({ navigation }) => {
  const { isOnline } = useNetworkStatus();
  const dispatch = useDispatch(); // ✅ Added

  // ── Current wizard step (1-5) ────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: Name ─────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // ── Step 2: Account (email + password) ───────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Step 3: Phone + OTP ───────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  // ── Step 4: Community ─────────────────────────────────────────────────────
  const [community, setCommunity] = useState(null);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [otherCommunityName, setOtherCommunityName] = useState('');

  // ── Step 5: Flat number ───────────────────────────────────────────────────
  const [flatNumber, setFlatNumber] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ── Shared UI ─────────────────────────────────────────────────────────────
  const [focusedField, setFocused] = useState(null);

  // ── RTK Query ─────────────────────────────────────────────────────────────
  const { data: communitiesData, isLoading: communitiesLoading } = useSignupCommunitiesQuery();
  const communities = communitiesData?.data?.communities || [];

  const [sendSignupOtp, { isLoading: isSendingOtp }] = useSendSignupOtpMutation();
  const [verifySignupOtp, { isLoading: isVerifyingOtp }] = useVerifySignupOtpMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  // ── Combined loading state for OTP actions ──────────────────────────────
  const isLoading = isSendingOtp || isVerifyingOtp || isRegistering;

  // ── Debounce ref ──────────────────────────────────────────────────────────
  const debounceTimer = useRef(null);
  const clearDebounce = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);
  useEffect(() => clearDebounce, [clearDebounce]);

  // ── Scroll + field-position refs so focused inputs never hide behind the keyboard ─
  const scrollRef = useRef(null);
  const passwordFieldY = useRef(0);

  const scrollToY = useCallback((y) => {
    // Let the keyboard finish animating in before scrolling.
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(y - moderateScale(24), 0), animated: true });
    }, 120);
  }, []);

  const handlePasswordFocus = useCallback(() => {
    setFocused('password');
    scrollToY(passwordFieldY.current);
  }, [scrollToY]);

  // ── Resend countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => setResendSeconds(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  const strength = getStrength(password);

  // ── Navigation helpers ────────────────────────────────────────────────────
  // ── Alert Modal state ─────────────────────────────────────────────────────
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onPrimaryPress: null,
  });

  const showAlert = useCallback((title, message, type = 'error', onPrimaryPress = null) => {
    setAlertConfig({ visible: true, title, message, type, onPrimaryPress });
  }, []);

  const hideAlert = useCallback(() => {
    const cb = alertConfig.onPrimaryPress;
    setAlertConfig((prev) => ({ ...prev, visible: false, onPrimaryPress: null }));
    if (typeof cb === 'function') {
      cb();
    }
  }, [alertConfig.onPrimaryPress]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length));
  const goPrev = () => {
    if (step === 1) navigation.goBack();
    else setStep(s => s - 1);
  };

  // ── Step 1 validation ─────────────────────────────────────────────────────
  const handleStep1 = useCallback(() => {
    if (!validateName(firstName)) {
      showAlert('Invalid First Name', 'Please enter a valid first name (letters only).', 'warning');
      return;
    }
    if (!validateName(lastName)) {
      showAlert('Invalid Last Name', 'Please enter a valid last name (letters only).', 'warning');
      return;
    }
    goNext();
  }, [firstName, lastName, showAlert]);

  // ── Step 2 validation ─────────────────────────────────────────────────────
  const handleStep2 = useCallback(() => {
    if (!validateEmail(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }
    if (password.length < 8) {
      showAlert('Weak Password', 'Password must be at least 8 characters long.', 'warning');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      showAlert(
        'Special Character Required',
        'Password must contain at least one special character (e.g. @, #, $, %, &, *).',
        'warning'
      );
      return;
    }
    goNext();
  }, [email, password, showAlert]);

  // ── Step 3: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = useCallback(() => {
    clearDebounce();
    if (!isOnline) { showAlert('No Internet', 'Please connect and try again.', 'warning'); return; }
    const digits = phone.replace(/\D/g, '');
    if (!validatePhone(digits)) {
      showAlert('Invalid Number', 'Please enter a valid 10‑digit phone number.', 'warning');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        await sendSignupOtp({ phoneNumber: digits }).unwrap();
        setOtpSent(true);
        setOtp('');
        setResendSeconds(30);
      } catch (err) {
        showAlert('Error', err?.data?.message || 'Could not send OTP. Please try again.', 'error');
      } finally { debounceTimer.current = null; }
    }, 300);
  }, [phone, sendSignupOtp, clearDebounce, isOnline, showAlert]);

  // ── Step 3: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(() => {
    clearDebounce();
    if (!isOnline) { showAlert('No Internet', 'Please connect and try again.', 'warning'); return; }
    const digits = phone.replace(/\D/g, '');
    const code = otp.trim();
    if (!validateOtp(code)) {
      showAlert('Invalid OTP', 'Please enter the 4‑6 digit OTP sent to your phone.', 'warning');
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await verifySignupOtp({ phoneNumber: digits, code }).unwrap();
        const token = result?.data?.phoneVerificationToken;
        if (!token) throw new Error('Verification token missing.');
        setPhoneVerificationToken(token);
        setPhoneVerified(true);
      } catch (err) {
        showAlert('Verification Failed', err?.data?.message || 'Invalid or expired OTP. Please try again.', 'error');
      } finally { debounceTimer.current = null; }
    }, 300);
  }, [phone, otp, verifySignupOtp, clearDebounce, isOnline, showAlert]);

  // ── Step 3 → 4 ───────────────────────────────────────────────────────────
  const handleStep3 = useCallback(() => {
    const digits = phone.replace(/\D/g, '');
    if (!validatePhone(digits)) {
      showAlert('Invalid Number', 'Please enter a valid 10‑digit phone number.', 'warning');
      return;
    }
    if (!phoneVerified) {
      showAlert('Verify Phone', 'Please verify your phone number with the OTP before continuing.', 'warning');
      return;
    }
    goNext();
  }, [phone, phoneVerified, showAlert]);

  // ── Step 4 validation ─────────────────────────────────────────────────────
  const handleStep4 = useCallback(() => {
    if (!community) {
      showAlert('Community Required', 'Please select your community.', 'warning');
      return;
    }
    if (community.communName === '__other__' && !otherCommunityName.trim()) {
      showAlert('Community Name Required', 'Please enter your community name.', 'warning');
      return;
    }
    goNext();
  }, [community, otherCommunityName, showAlert]);

  // ── Step 5: Final submit ──────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    clearDebounce();
    if (!isOnline) { showAlert('No Internet', 'Please connect and try again.', 'warning'); return; }

    const flat = flatNumber.trim();
    if (!flat) {
      showAlert('Flat Number Required', 'Please enter your flat number.', 'warning');
      return;
    }
    if (!agreed) {
      showAlert('Terms Required', 'Please agree to the Terms & Conditions and Privacy Policy.', 'warning');
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          phoneNumber: phone.replace(/\D/g, ''),
          phoneVerificationToken,
          communityCommunName: community.communName === '__other__' ? '__other__' : community.communName,
          otherCommunityName: community.communName === '__other__' ? otherCommunityName.trim() : '',
          flatNumber: flat,
        }).unwrap();

        // ✅ Dispatch setUser to update Redux with the user data (including flatNumber)
        dispatch(setUser(result.user));

        const isOtherCommunity = community.communName === '__other__';

        // Navigate to location permission after alert for both flows
        const navigateToLocation = () => {
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.TABS }],
          });
        };

        if (isOtherCommunity) {
          showAlert(
            'Welcome!',
            'Your community has been created. You are now logged in.',
            'success',
            navigateToLocation
          );
        } else {
          showAlert(
            'Registration Submitted',
            'Your request has been sent to the secretary for approval. You will be notified once approved.',
            'info',
            navigateToLocation
          );
        }
      } catch (error) {
        showAlert('Registration Failed', error?.data?.message || 'Something went wrong.', 'error');
      } finally { debounceTimer.current = null; }
    }, 300);
  }, [
    flatNumber, agreed, firstName, lastName, email, password,
    phone, phoneVerificationToken, community, register, navigation,
    clearDebounce, isOnline, dispatch, otherCommunityName, showAlert,
  ]);

  // ── Step header copy ──────────────────────────────────────────────────────
  const stepHeading = ['Your Name', 'Account Details', 'Verify Phone', 'Your Community', 'Flat Number'];
  const stepSubtext = [
    'Tell us who you are.',
    'Set up your login credentials.',
    'We will send a one-time code to your phone.',
    'Select your residential community.',
    'Enter your flat or house number.',
  ];

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Back button ── */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={goPrev}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={scaleFont(20)} color={COLORS.textPrimary} />
              <Text style={styles.backText} maxFontSizeMultiplier={1.3}>
                {step === 1 ? 'Back' : 'Previous'}
              </Text>
            </TouchableOpacity>

            {/* ── Badge ── */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>
                JOIN COMMUN · Step {step} of {STEPS.length}
              </Text>
            </LinearGradient>

            {/* ── Heading ── */}
            <Text style={styles.heading} maxFontSizeMultiplier={1.3}>
              {stepHeading[step - 1]}
            </Text>
            <Text style={styles.subheading} maxFontSizeMultiplier={1.3}>
              {stepSubtext[step - 1]}
            </Text>

            {/* ── Progress ── */}
            <StepProgress current={step} total={STEPS.length} />

            {/* ══════════════ STEP 1 – Name ══════════════ */}
            {step === 1 && (
              <>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <Text style={styles.label} maxFontSizeMultiplier={1.3}>First Name</Text>
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.gradientBorder,
                        focusedField === 'firstName' && styles.gradientBorderFocused,
                      ]}
                    >
                      <View style={styles.inputInnerContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="John"
                          placeholderTextColor={COLORS.textMuted}
                          value={firstName}
                          onChangeText={setFirstName}
                          onFocus={() => setFocused('firstName')}
                          onBlur={() => setFocused(null)}
                          autoCapitalize="words"
                          editable={isOnline}
                          maxFontSizeMultiplier={1.3}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.label} maxFontSizeMultiplier={1.3}>Last Name</Text>
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.gradientBorder,
                        focusedField === 'lastName' && styles.gradientBorderFocused,
                      ]}
                    >
                      <View style={styles.inputInnerContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Doe"
                          placeholderTextColor={COLORS.textMuted}
                          value={lastName}
                          onChangeText={setLastName}
                          onFocus={() => setFocused('lastName')}
                          onBlur={() => setFocused(null)}
                          autoCapitalize="words"
                          editable={isOnline}
                          maxFontSizeMultiplier={1.3}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleStep1}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={!isOnline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                      {isOnline ? 'Next' : 'No Internet'}
                    </Text>
                    {isOnline && (
                      <Icon name="arrow-forward" size={scaleFont(17)} color={COLORS.white} style={{ marginLeft: moderateScale(6) }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════ STEP 2 – Account ══════════════ */}
            {step === 2 && (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.3}>Email Address</Text>
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
                      editable={isOnline}
                      maxFontSizeMultiplier={1.3}
                    />
                  </View>
                </LinearGradient>

                <Text style={styles.label} maxFontSizeMultiplier={1.3}>Password</Text>
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
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={COLORS.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={handlePasswordFocus}
                      onBlur={() => setFocused(null)}
                      secureTextEntry={!showPassword}
                      editable={isOnline}
                      maxFontSizeMultiplier={1.3}
                      returnKeyType="done"
                      onSubmitEditing={handleStep2}
                    />
                    {password.length > 0 && (
                      <Text
                        style={[styles.strengthBadge, { color: STRENGTH_COLORS[strength] }]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {STRENGTH_LABELS[strength]}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={() => setShowPassword(p => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginLeft: scaleWidth(SPACING.xs) }}
                    >
                      <Icon
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={scaleFont(19)}
                        color={COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {password.length > 0 && (
                  <View style={styles.strengthBarRow}>
                    {[1, 2, 3, 4].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : COLORS.border },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* ── Password Suggestions & Requirements Box ── */}
                <View style={styles.passwordHintsCard}>
                  <View style={styles.passwordHintsHeader}>
                    <Icon name="shield-checkmark-outline" size={scaleFont(15)} color={COLORS.primary} />
                    <Text style={styles.passwordHintsTitle} maxFontSizeMultiplier={1.3}>
                      Password Requirements
                    </Text>
                  </View>

                  <View style={styles.passwordHintsGrid}>
                    <View style={styles.passwordHintItem}>
                      <Icon
                        name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                        size={scaleFont(14)}
                        color={password.length >= 8 ? '#10B981' : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordHintText,
                          password.length >= 8 && styles.passwordHintTextMet,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        At least 8 characters
                      </Text>
                    </View>

                    <View style={styles.passwordHintItem}>
                      <Icon
                        name={/[^A-Za-z0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={scaleFont(14)}
                        color={/[^A-Za-z0-9]/.test(password) ? '#10B981' : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordHintText,
                          /[^A-Za-z0-9]/.test(password) && styles.passwordHintTextMet,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        At least 1 special character (e.g. @, #, $, %)
                      </Text>
                    </View>

                    <View style={styles.passwordHintItem}>
                      <Icon
                        name={/[A-Z]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={scaleFont(14)}
                        color={/[A-Z]/.test(password) ? '#10B981' : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordHintText,
                          /[A-Z]/.test(password) && styles.passwordHintTextMet,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        1+ uppercase letter (A-Z)
                      </Text>
                    </View>

                    <View style={styles.passwordHintItem}>
                      <Icon
                        name={/[0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={scaleFont(14)}
                        color={/[0-9]/.test(password) ? '#10B981' : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordHintText,
                          /[0-9]/.test(password) && styles.passwordHintTextMet,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        1+ number (0-9)
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleStep2}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={!isOnline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                      {isOnline ? 'Next' : 'No Internet'}
                    </Text>
                    {isOnline && (
                      <Icon name="arrow-forward" size={scaleFont(17)} color={COLORS.white} style={{ marginLeft: moderateScale(6) }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════ STEP 3 – Phone / OTP ══════════════ */}
            {step === 3 && (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.3}>Phone Number</Text>
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
                      onChangeText={(t) => {
                        setPhone(t.replace(/\D/g, '').slice(0, 10));
                        if (phoneVerified) {
                          setPhoneVerified(false);
                          setPhoneVerificationToken('');
                          setOtpSent(false);
                          setOtp('');
                        }
                      }}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused(null)}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!isSendingOtp && isOnline && !phoneVerified}
                      maxFontSizeMultiplier={1.3}
                    />
                    {phoneVerified && (
                      <View style={styles.verifiedBadge}>
                        <Icon name="checkmark-circle" size={scaleFont(14)} color="#10B981" />
                        <Text style={styles.verifiedBadgeText} maxFontSizeMultiplier={1.3}>Verified</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>

                {!otpSent && !phoneVerified && (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    activeOpacity={0.85}
                    style={[styles.btnWrapper, { marginBottom: scaleHeight(10) }]}
                    disabled={isSendingOtp || !isOnline || phone.length < 10}
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
                        <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                          {!isOnline ? 'No Internet' : 'Send OTP'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {otpSent && !phoneVerified && (
                  <>
                    <Text style={styles.label} maxFontSizeMultiplier={1.3}>Enter OTP</Text>
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
                          maxLength={6}
                          editable={!isVerifyingOtp && isOnline}
                          maxFontSizeMultiplier={1.3}
                        />
                      </View>
                    </LinearGradient>

                    <View style={styles.otpActions}>
                      <TouchableOpacity
                        onPress={() => { setOtpSent(false); setOtp(''); setResendSeconds(0); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={isLoading}
                      >
                        <GradientText
                          colors={gradientColors}
                          style={styles.otpActionLink}
                          maxFontSizeMultiplier={1.3}
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
                          <Text style={styles.otpActionDisabled} maxFontSizeMultiplier={1.3}>
                            Resend OTP in {resendSeconds}s
                          </Text>
                        ) : (
                          <GradientText
                            colors={gradientColors}
                            style={styles.otpActionLink}
                            maxFontSizeMultiplier={1.3}
                          >
                            Resend OTP
                          </GradientText>
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      activeOpacity={0.85}
                      style={[styles.btnWrapper, { marginBottom: scaleHeight(10) }]}
                      disabled={isVerifyingOtp || isSendingOtp || !isOnline || otp.length < 4}
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
                          <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                            {isOnline ? 'Verify OTP' : 'No Internet'}
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {phoneVerified && (
                  <View style={styles.verifiedBanner}>
                    <Icon name="checkmark-circle" size={scaleFont(16)} color="#10B981" />
                    <Text style={styles.verifiedBannerText} maxFontSizeMultiplier={1.3}>
                      Phone number verified successfully.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleStep3}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={!isOnline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                      {isOnline ? 'Continue' : 'No Internet'}
                    </Text>
                    {isOnline && (
                      <Icon name="arrow-forward" size={scaleFont(17)} color={COLORS.white} style={{ marginLeft: moderateScale(6) }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════ STEP 4 – Community ══════════════ */}
            {step === 4 && (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.3}>Community</Text>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.gradientBorder,
                    focusedField === 'community' && styles.gradientBorderFocused,
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.inputInnerContainer, styles.dropdownInner]}
                    activeOpacity={0.8}
                    disabled={!isOnline}
                    onPress={() => {
                      setFocused('community');
                      setShowCommunityModal(true);
                    }}
                  >
                    <Text
                      style={[styles.dropdownText, !community && { color: COLORS.textMuted }]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {communitiesLoading
                        ? 'Loading communities…'
                        : community?.label || 'Select your Community'}
                    </Text>
                    <Icon name="chevron-down" size={scaleFont(18)} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </LinearGradient>

                {community?.communName === '__other__' && (
                  <>
                    <Text style={styles.label} maxFontSizeMultiplier={1.3}>Community Name</Text>
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.gradientBorder,
                        focusedField === 'otherCommunity' && styles.gradientBorderFocused,
                      ]}
                    >
                      <View style={styles.inputInnerContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your community name"
                          placeholderTextColor={COLORS.textMuted}
                          value={otherCommunityName}
                          onChangeText={setOtherCommunityName}
                          onFocus={() => setFocused('otherCommunity')}
                          onBlur={() => setFocused(null)}
                          autoCapitalize="words"
                          editable={isOnline}
                          maxFontSizeMultiplier={1.3}
                        />
                      </View>
                    </LinearGradient>
                  </>
                )}

                <TouchableOpacity
                  onPress={handleStep4}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={!isOnline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                      {isOnline ? 'Next' : 'No Internet'}
                    </Text>
                    {isOnline && (
                      <Icon name="arrow-forward" size={scaleFont(17)} color={COLORS.white} style={{ marginLeft: moderateScale(6) }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════ STEP 5 – Flat + T&C + Submit ══════════════ */}
            {step === 5 && (
              <>
                <Text style={styles.label} maxFontSizeMultiplier={1.3}>Flat Number</Text>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.gradientBorder,
                    focusedField === 'flatNumber' && styles.gradientBorderFocused,
                  ]}
                >
                  <View style={styles.inputInnerContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="A-101, Tower 3"
                      placeholderTextColor={COLORS.textMuted}
                      value={flatNumber}
                      onChangeText={setFlatNumber}
                      onFocus={() => setFocused('flatNumber')}
                      onBlur={() => setFocused(null)}
                      autoCapitalize="characters"
                      editable={isOnline}
                      maxFontSizeMultiplier={1.3}
                    />
                  </View>
                </LinearGradient>

                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => setAgreed(a => !a)}
                  activeOpacity={0.7}
                  disabled={!isOnline}
                >
                  <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                    {agreed && <Icon name="checkmark" size={scaleFont(11)} color={COLORS.white} />}
                  </View>
                  <Text style={styles.termsText} maxFontSizeMultiplier={1.3}>
                    I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreate}
                  activeOpacity={0.85}
                  style={styles.btnWrapper}
                  disabled={isRegistering || !isOnline}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    {isRegistering ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                          {isOnline ? 'Sign Up' : 'No Internet'}
                        </Text>
                        {isOnline && (
                          <Icon name="arrow-forward" size={scaleFont(17)} color={COLORS.white} style={{ marginLeft: moderateScale(6) }} />
                        )}
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── Sign In link ── */}
            <View style={styles.footer}>
              <Text style={styles.footerText} maxFontSizeMultiplier={1.3}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN)}>
                <GradientText
                  colors={gradientColors}
                  style={styles.footerLink}
                  maxFontSizeMultiplier={1.3}
                >
                  Sign In
                </GradientText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

      {/* ── Community Modal ── */}
      <Modal
        visible={showCommunityModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCommunityModal(false);
          setFocused(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCommunityModal(false);
            setFocused(null);
          }}
        >
          <View style={styles.simpleDropdown}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.simpleDropdownScroll}>
              {communities.map(item => {
                const selected = item.communName === community?.communName;
                return (
                  <TouchableOpacity
                    key={item.communName}
                    style={[styles.simpleOption, selected && styles.simpleOptionSelected]}
                    onPress={() => {
                      setCommunity(item);
                      setShowCommunityModal(false);
                      setFocused(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.simpleOptionText, selected && styles.simpleOptionTextSelected]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {item.label}
                    </Text>
                    {selected && <Icon name="checkmark" size={scaleFont(18)} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
              {!communitiesLoading && communities.length === 0 && (
                <View style={{ padding: scaleWidth(18) }}>
                  <Text style={styles.simpleOptionText} maxFontSizeMultiplier={1.3}>
                    No communities available right now.
                  </Text>
                </View>
              )}

              {/* ── Other option ── */}
              {!communitiesLoading && (() => {
                const selected = community?.communName === '__other__';
                return (
                  <TouchableOpacity
                    style={[styles.simpleOption, styles.otherOption, selected && styles.simpleOptionSelected]}
                    onPress={() => {
                      setCommunity({ communName: '__other__', label: 'Other' });
                      setOtherCommunityName('');
                      setShowCommunityModal(false);
                      setFocused(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.otherOptionLeft}>
                      <Icon name="add-circle-outline" size={scaleFont(18)} color={selected ? COLORS.primary : COLORS.textSecondary} />
                      <Text
                        style={[styles.simpleOptionText, selected && styles.simpleOptionTextSelected]}
                        maxFontSizeMultiplier={1.3}
                      >
                        Other
                      </Text>
                    </View>
                    {selected && <Icon name="checkmark" size={scaleFont(18)} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Custom Alert Modal ── */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={hideAlert}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(14),
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginBottom: scaleHeight(14),
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: scaleFont(FONTS.small + 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: moderateScale(RADIUS.full, 0.2),
    paddingHorizontal: moderateScale(16, 0.2),
    paddingVertical: moderateScale(6, 0.2),
    marginBottom: scaleHeight(8),
    ...SHADOW.button,
  },
  badgeText: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.5),
  },

  heading: {
    fontSize: scaleFont(FONTS.heading + 2),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: scaleHeight(2),
    marginBottom: scaleHeight(12),
  },

  label: {
    fontSize: scaleFont(FONTS.label - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(4, 0.2),
    letterSpacing: moderateScale(0.2, 0.1),
  },

  nameRow: { flexDirection: 'row', gap: scaleWidth(SPACING.sm), marginBottom: scaleHeight(6) },
  nameField: { flex: 1, marginBottom: 0 },

  // Original inputRow styles (kept for reference)
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    marginBottom: scaleHeight(8),
    minHeight: moderateScale(46, 0.2),
    borderWidth: moderateScale(1, 0.2),
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  inputRowFocused: { borderColor: COLORS.primary },

  // Gradient border styles
  gradientBorder: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    padding: 2,
    backgroundColor: 'transparent',
    ...SHADOW.card,
    marginBottom: scaleHeight(8),
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

  input: { flex: 1, fontSize: scaleFont(FONTS.input), color: COLORS.textPrimary, padding: 0 },

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

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4, 0.2),
  },
  verifiedBadgeText: {
    fontSize: scaleFont(FONTS.small),
    color: '#10B981',
    fontWeight: FONTS.weightSemiBold,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    marginBottom: scaleHeight(12),
  },
  verifiedBannerText: {
    fontSize: scaleFont(FONTS.small + 1),
    color: '#065F46',
    fontWeight: FONTS.weightMedium,
    flex: 1,
  },

  dropdownInner: { justifyContent: 'space-between' },
  dropdownText: { flex: 1, fontSize: scaleFont(FONTS.input), color: COLORS.textPrimary },

  strengthBadge: {
    fontSize: scaleFont(FONTS.small - 1),
    fontWeight: FONTS.weightSemiBold,
    marginRight: scaleWidth(SPACING.xs),
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: moderateScale(4),
    marginTop: -scaleHeight(2),
    marginBottom: scaleHeight(8),
  },
  strengthSegment: {
    flex: 1,
    height: moderateScale(3),
    borderRadius: moderateScale(RADIUS.full),
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(10),
    marginTop: scaleHeight(2),
    gap: scaleWidth(SPACING.sm),
  },
  checkbox: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(5),
    borderWidth: moderateScale(1.5),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(1),
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: {
    flex: 1,
    fontSize: scaleFont(FONTS.small + 1),
    color: COLORS.textSecondary,
    lineHeight: scaleHeight(17),
  },
  termsLink: { color: COLORS.link, fontWeight: FONTS.weightSemiBold },

  btnWrapper: { borderRadius: moderateScale(RADIUS.lg, 0.2), ...SHADOW.button },
  btn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(13, 0.2),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: scaleFont(FONTS.button + 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3),
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scaleHeight(20),
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

  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: moderateScale(8, 0.2),
    marginBottom: scaleHeight(4),
  },
  otpActionLink: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
    // color removed – handled by GradientText
  },
  otpActionDisabled: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md),
    width: width * 0.8,
    maxHeight: moderateScale(420),
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10),
  },
  simpleDropdownScroll: { maxHeight: moderateScale(420) },
  simpleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(16),
    borderBottomWidth: moderateScale(1),
    borderBottomColor: COLORS.border,
  },
  simpleOptionSelected: { backgroundColor: '#F5F3FF' },
  simpleOptionText: { fontSize: scaleFont(FONTS.input), color: COLORS.textPrimary, fontWeight: FONTS.weightMedium },
  simpleOptionTextSelected: { color: COLORS.primary, fontWeight: FONTS.weightSemiBold },
  otherOption: { borderBottomWidth: 0 },
  otherOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },

  passwordHintsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(RADIUS.md, 0.2),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: moderateScale(12, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(2),
  },
  passwordHintsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.2),
    marginBottom: moderateScale(8, 0.2),
  },
  passwordHintsTitle: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  passwordHintsGrid: {
    gap: moderateScale(6, 0.2),
  },
  passwordHintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.2),
  },
  passwordHintText: {
    fontSize: scaleFont(FONTS.small - 1),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightRegular,
  },
  passwordHintTextMet: {
    color: '#065F46',
    fontWeight: FONTS.weightMedium,
  },
});

export default RegisterScreen;