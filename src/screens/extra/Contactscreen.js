// screens/extra/ContactScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { ROUTES } from '../../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// EmailJS REST endpoint — the @emailjs/browser SDK is web-only, so React Native
// calls the same underlying API directly with fetch.
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_SERVICE_ID = 'service_j70psri';
const EMAILJS_TEMPLATE_ID = 'template_rtmto2q';
const EMAILJS_PUBLIC_KEY = 'CHh6M29utstehJebQ';

const CONTACT_INFO = [
  {
    id: 'email',
    icon: 'mail-outline',
    title: 'Email Us',
    content: 'info@commun.in',
    description: 'Send us an email anytime',
    onPress: () => Linking.openURL('mailto:info@commun.in'),
  },
  {
    id: 'phone',
    icon: 'call-outline',
    title: 'Call Us',
    content: '+91 76781 71765',
    description: 'Mon to Fri, 9am to 6pm',
    onPress: () => Linking.openURL('tel:+917678171765'),
  },
  {
    id: 'response',
    icon: 'time-outline',
    title: 'Response Time',
    content: 'Within 24 hours',
    description: 'We aim to respond quickly',
    onPress: null,
  },
];

const FormInput = ({
  label,
  required,
  optional,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  error,
  maxLength,
  showCount,
  editable = true,
  autoCapitalize = 'none',
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label}
      </Text>
      {required && <Text style={styles.required}> *</Text>}
      {optional && <Text style={styles.optional}> (Optional)</Text>}
    </View>
    <View
      style={[
        styles.inputWrap,
        multiline && styles.inputWrapMulti,
        error && styles.inputWrapError,
        !editable && styles.inputWrapDisabled,
      ]}>
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        editable={editable}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      />
    </View>
    {error ? (
      <View style={styles.errorRow}>
        <Icon name="alert-circle-outline" size={scaleFont(13)} color="#EF4444" />
        <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {error}
        </Text>
      </View>
    ) : showCount ? (
      <Text style={styles.charCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {value.length} characters (minimum 10)
      </Text>
    ) : null}
  </View>
);

const ContactScreen = ({ navigation }) => {
  const { isOnline } = useNetworkStatus();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!form.subject.trim()) newErrors.subject = 'Subject is required';
    if (!form.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (form.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet and try again.');
      return;
    }
    if (!validate()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(EMAILJS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            from_name: form.name.trim(),
            from_email: form.email.trim(),
            from_phone: form.phone.trim() || 'N/A',
            subject: form.subject.trim(),
            message: form.message.trim(),
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Request failed with status ${response.status}`);
      }

      Alert.alert(
        'Message Sent ✓',
        "Thank you for contacting us! We'll get back to you within 24 hours.",
        [{ text: 'OK', onPress: () => setForm({ name: '', email: '', phone: '', subject: '', message: '' }) }],
      );
      setErrors({});
    } catch (error) {
      console.error('Error submitting contact form:', error);
      Alert.alert('Failed to Send', 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Contact Us
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
          message="You are offline. Please connect to the internet to send a message."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: scaleHeight(16) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── Hero ── */}
            <View style={styles.heroSection}>
              <View style={styles.badgePill}>
                <Text style={[styles.badgePillText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  We're Here to Help
                </Text>
              </View>
              <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Contact Us
              </Text>
              <Text style={styles.heroSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Have a question or need help? Reach out through the form below or use our contact
                information — we're here for neighbours.
              </Text>
            </View>

            {/* ── Contact Info Cards ── */}
            {CONTACT_INFO.map(info => (
              <TouchableOpacity
                key={info.id}
                style={styles.contactCard}
                onPress={info.onPress}
                activeOpacity={info.onPress ? 0.75 : 1}>
                <View style={styles.contactIconWrap}>
                  <Icon name={info.icon} size={scaleFont(22)} color={COLORS.gradientStart} />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {info.title}
                  </Text>
                  <Text
                    style={[
                      styles.contactContent,
                      info.onPress && styles.contactContentLink,
                    ]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {info.content}
                  </Text>
                  <Text style={styles.contactDesc} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {info.description}
                  </Text>
                </View>
                {info.onPress && (
                  <Icon name="chevron-forward" size={scaleFont(18)} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            ))}

            {/* ── Need Immediate Help? ── */}
            <View style={styles.urgentCard}>
              <View style={styles.urgentIconWrap}>
                <Icon name="flash-outline" size={scaleFont(20)} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.urgentTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Need Immediate Help?
                </Text>
                <Text style={styles.urgentBody} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  For urgent matters, mark your message as urgent in the subject
                  line. We prioritize urgent requests and respond as quickly as
                  possible.
                </Text>
              </View>
            </View>

            {/* ── Contact Form ── */}
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconWrap}>
                  <Icon name="send-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.formTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Send us a Message
                </Text>
              </View>

              <FormInput
                label="Name"
                required
                value={form.name}
                onChangeText={v => setField('name', v)}
                placeholder="Enter your full name"
                keyboardType="default"
                autoCapitalize="words"
                error={errors.name}
                editable={isOnline}
              />
              <FormInput
                label="Email"
                required
                value={form.email}
                onChangeText={v => setField('email', v)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                error={errors.email}
                editable={isOnline}
              />
              <FormInput
                label="Phone Number"
                optional
                value={form.phone}
                onChangeText={v => setField('phone', v)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                editable={isOnline}
              />
              <FormInput
                label="Subject"
                required
                value={form.subject}
                onChangeText={v => setField('subject', v)}
                placeholder="What is this regarding?"
                error={errors.subject}
                editable={isOnline}
              />
              <FormInput
                label="Message"
                required
                value={form.message}
                onChangeText={v => setField('message', v)}
                placeholder="Tell us more about your question or concern..."
                multiline
                numberOfLines={6}
                error={errors.message}
                showCount={!errors.message}
                editable={isOnline}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || !isOnline}
                activeOpacity={0.85}
                style={[styles.submitWrap, (isSubmitting || !isOnline) && { opacity: 0.5 }]}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}>
                  {isSubmitting ? (
                    <Text style={styles.submitBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Sending...
                    </Text>
                  ) : (
                    <>
                      <Icon
                        name="paper-plane-outline"
                        size={scaleFont(18)}
                        color={COLORS.white}
                        style={{ marginRight: moderateScale(8, 0.3) }}
                      />
                      <Text style={styles.submitBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {isOnline ? 'Send Message' : 'No Internet'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.privacyNote} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                By submitting this form, you agree to our terms of service and
                privacy policy.
              </Text>
            </View>

            {/* ── FAQ Prompt ── */}
            <View style={styles.faqCard}>
              <Text style={styles.faqTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Before You Contact Us
              </Text>
              <Text style={styles.faqBody} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Many questions are already answered in our Frequently Asked
                Questions section. Check there first for quick solutions!
              </Text>
              <TouchableOpacity
                style={styles.faqBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.FAQ)}>
                <Icon
                  name="help-circle-outline"
                  size={scaleFont(16)}
                  color={COLORS.gradientStart}
                  style={{ marginRight: moderateScale(6, 0.3) }}
                />
                <Text style={[styles.faqBtnText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Visit FAQ Page
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: scaleHeight(32) }} />
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  },
  // ── Hero ──
  heroSection: {
    paddingVertical: scaleHeight(20),
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(5),
    marginBottom: scaleHeight(12),
    alignSelf: 'center',
  },
  badgePillText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.5, 0.2),
  },
  heroTitle: {
    fontSize: scaleFont(32),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(10),
  },
  heroSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(22, 0.3),
    paddingHorizontal: scaleWidth(10),
  },
  // ── Contact Info ──
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(12),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  contactIconWrap: {
    width: moderateScale(46, 0.3),
    height: moderateScale(46, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  contactTextWrap: { flex: 1 },
  contactTitle: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  contactContent: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  contactContentLink: {
    color: COLORS.gradientStart,
  },
  contactDesc: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  // ── Urgent Card ──
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(20),
    borderWidth: moderateScale(1, 0.3),
    borderColor: '#FDE68A',
    gap: scaleWidth(12),
  },
  urgentIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: '#92400E',
    marginBottom: scaleHeight(4),
  },
  urgentBody: {
    fontSize: scaleFont(13),
    color: '#78350F',
    lineHeight: moderateScale(19, 0.3),
  },
  // ── Form ──
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(20),
  },
  formIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  inputGroup: { marginBottom: scaleHeight(16) },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(6),
  },
  inputLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  required: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: '#EF4444',
  },
  optional: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    minHeight: moderateScale(48, 0.3),
  },
  inputWrapMulti: {
    minHeight: moderateScale(120, 0.3),
    alignItems: 'flex-start',
    paddingVertical: scaleHeight(12),
  },
  inputWrapError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  inputWrapDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(12) : scaleHeight(8),
    fontWeight: FONTS.weightMedium,
  },
  textInputMulti: {
    minHeight: moderateScale(100, 0.3),
    paddingTop: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4, 0.3),
    marginTop: scaleHeight(5),
  },
  errorText: {
    fontSize: scaleFont(12),
    color: '#EF4444',
  },
  charCount: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(5),
  },
  submitWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    marginTop: scaleHeight(6),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  submitBtn: {
    paddingVertical: scaleHeight(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  privacyNote: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scaleHeight(12),
    lineHeight: moderateScale(18, 0.3),
  },
  // ── FAQ ──
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(8),
    alignItems: 'center',
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  faqTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  faqBody: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
  },
  faqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(11),
    backgroundColor: COLORS.white,
  },
  faqBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
  },
});

export default ContactScreen;