// screens/settings/PrivacyPolicyScreen.jsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const SECTIONS = [
  {
    id: '1',
    icon: 'person-circle-outline',
    title: 'Information We Collect',
    type: 'tags',
    content: 'To provide the best experience, we securely handle:',
    tags: ['Name', 'Email', 'Phone', 'Profile Picture'],
  },
  {
    id: '2',
    icon: 'server-outline',
    title: 'How We Use Information',
    type: 'bullets',
    bullets: [
      'Account Management',
      'Service Discovery',
      'Community Connections',
    ],
  },
  {
    id: '3',
    icon: 'shield-half-outline',
    title: 'Information Sharing',
    type: 'text',
    content:
      'Commun does not sell personal information. We only share data with service providers necessary for app functionality.',
  },
  {
    id: '4',
    icon: 'lock-closed-outline',
    title: 'Data Security',
    type: 'text',
    content:
      'Your information is protected through industry-standard security measures, including AES-256 encryption and multi-factor authentication.',
  },
  {
    id: '5',
    icon: 'chatbox-ellipses-outline',
    title: 'Contact Us',
    type: 'contact',
    content: 'Have questions about your data?',
    email: 'info@commun.in',
  },
];

const SectionCard = ({ section, navigation }) => {
  const handleAction = (key) => {
    if (key === 'Support') {
      Linking.openURL('mailto:info@commun.in');
    } else {
      navigation?.navigate(key);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBg}>
          <Icon name={section.icon} size={scaleFont(20)} color={COLORS.gradientStart} />
        </View>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {section.title}
        </Text>
      </View>

      {section.type === 'text' && (
        <Text style={styles.cardText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {section.content}
        </Text>
      )}

      {section.type === 'tags' && (
        <>
          <Text style={styles.cardText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {section.content}
          </Text>
          <View style={styles.tagRow}>
            {section.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {section.type === 'bullets' && (
        <View style={styles.bulletList}>
          {section.bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {b}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section.type === 'contact' && (
        <>
          <Text style={styles.cardText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {section.content}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${section.email}`)}>
            <Text style={styles.emailLink} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {section.email}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const PrivacyPolicyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Privacy Policy
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. The privacy policy is still available."
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingBottom: Math.max(moderateScale(32, 0.3), insets.bottom + moderateScale(24, 0.3)),
              paddingTop: scaleHeight(16),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBlock}>
            <View style={styles.shieldWrap}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shieldGradient}
              >
                <Icon name="shield-checkmark-outline" size={scaleFont(40)} color={COLORS.white} />
              </LinearGradient>
              <View style={styles.lockBadge}>
                <Icon name="lock-closed" size={scaleFont(11)} color={COLORS.gradientStart} />
              </View>
            </View>

            <View style={styles.protectedPill}>
              <Icon name="checkmark-circle" size={scaleFont(14)} color="#10B981" style={{ marginRight: moderateScale(5, 0.3) }} />
              <Text style={styles.protectedText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Your Data Is Protected
              </Text>
            </View>

            <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Privacy Center
            </Text>
            <Text style={styles.heroSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Your privacy and data protection{'\n'}matter to us.
            </Text>
          </View>

          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} navigation={navigation} />
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerTagline} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              We're committed to building a trusted,{'\n'}safe, and vibrant community together.
            </Text>

            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />

            <Text style={styles.footerSlogan} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              CONNECT. DISCOVER. THRIVE.
            </Text>
          </View>
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

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
  heroBlock: {
    alignItems: 'center',
    paddingTop: scaleHeight(SPACING.md),
    paddingBottom: scaleHeight(SPACING.xl ?? SPACING.lg + 8),
  },
  shieldWrap: {
    position: 'relative',
    marginBottom: scaleHeight(SPACING.md),
  },
  shieldGradient: {
    width: moderateScale(88, 0.3),
    height: moderateScale(88, 0.3),
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(20, 0.3),
    shadowOffset: { width: 0, height: moderateScale(8, 0.3) },
    elevation: 8,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -moderateScale(4, 0.3),
    right: -moderateScale(4, 0.3),
    width: moderateScale(26, 0.3),
    height: moderateScale(26, 0.3),
    borderRadius: moderateScale(13, 0.3),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(SPACING.md),
    paddingVertical: scaleHeight(SPACING.xs - 1),
    marginBottom: scaleHeight(SPACING.md),
    borderWidth: moderateScale(1, 0.3),
    borderColor: '#A7F3D0',
  },
  protectedText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: '#10B981',
  },
  heroTitle: {
    fontSize: scaleFont(FONTS.heading + 2),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(SPACING.xs),
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: scaleFont(FONTS.body),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(22, 0.3),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(SPACING.md + 2, 0.3),
    marginBottom: scaleHeight(SPACING.md),
    ...SHADOW.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(SPACING.sm),
    marginBottom: scaleHeight(SPACING.sm + 2),
  },
  cardIconBg: {
    width: moderateScale(38, 0.3),
    height: moderateScale(38, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: scaleFont(FONTS.label + 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    flexWrap: 'wrap',
  },
  cardText: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8, 0.3),
    marginTop: scaleHeight(SPACING.sm + 2),
  },
  tag: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(SPACING.md),
    paddingVertical: scaleHeight(SPACING.xs),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: scaleFont(FONTS.small + 1),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  bulletList: {
    gap: scaleHeight(SPACING.sm),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(SPACING.sm),
  },
  bulletDot: {
    width: moderateScale(7, 0.3),
    height: moderateScale(7, 0.3),
    borderRadius: moderateScale(4, 0.3),
    backgroundColor: COLORS.gradientStart,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
  },
  emailLink: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
    marginTop: scaleHeight(SPACING.xs),
  },
  footer: {
    alignItems: 'center',
    paddingTop: scaleHeight(SPACING.xs),
    paddingBottom: scaleHeight(SPACING.md),
    gap: moderateScale(8, 0.3),
  },
  footerTagline: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(SPACING.sm),
  },
  footerLogo: {
    width: scaleWidth(120),
    height: scaleHeight(40),
  },
  footerSlogan: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
    letterSpacing: moderateScale(1.5, 0.2),
    marginTop: scaleHeight(2),
  },
});