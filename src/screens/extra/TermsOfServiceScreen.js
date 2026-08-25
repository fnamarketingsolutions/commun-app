// screens/settings/TermsOfServiceScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const TERMS = [
  {
    id: '1',
    icon: 'person-outline',
    iconBg: '#EDE9FF',
    iconColor: '#7C3AED',
    title: 'Account Responsibility',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials. Any activity that occurs under your account is your responsibility. Notify us immediately of any unauthorized use.',
  },
  {
    id: '2',
    icon: 'construct-outline',
    iconBg: '#FFF0F6',
    iconColor: '#EC4899',
    title: 'Provider Responsibilities',
    content:
      'Service providers must accurately represent their qualifications, deliver agreed services on time, and maintain professional communication with clients at all times.',
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline',
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
    title: 'Acceptable Use',
    content:
      'You agree not to use Commun for any unlawful purpose, to transmit harmful content, or to interfere with other users\' experience. Misuse may result in account termination.',
  },
  {
    id: '4',
    icon: 'card-outline',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
    title: 'Service Agreements',
    content:
      'All service agreements are between the client and the provider. Commun facilitates the connection but is not a party to the service contract. Payment terms must be agreed upon before service begins.',
  },
  {
    id: '5',
    icon: 'document-text-outline',
    iconBg: '#EFF6FF',
    iconColor: '#3B82F6',
    title: 'User Content',
    content:
      'By posting content on Commun, you grant us a non-exclusive license to use, display, and distribute your content within the platform. You retain ownership of all content you create.',
  },
  {
    id: '6',
    icon: 'shield-outline',
    iconBg: '#FFF1F1',
    iconColor: '#EF4444',
    title: 'Violations & Suspension',
    content:
      'Violations of these terms may result in warnings, temporary suspension, or permanent account termination depending on the severity. You may appeal suspensions through our support channel.',
  },
];

const AGREEMENTS = [
  'Respect Community Members',
  'Provide Accurate Information',
  'Follow Community Guidelines',
  'Use The Platform Responsibly',
];

const TermsRow = ({ item }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  };

  return (
    <View style={styles.termCard}>
      <TouchableOpacity style={styles.termHeader} onPress={toggle} activeOpacity={0.75}>
        <View style={[styles.termIconBg, { backgroundColor: item.iconBg }]}>
          <Icon name={item.icon} size={scaleFont(20)} color={item.iconColor} />
        </View>
        <Text style={styles.termTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {item.title}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={scaleFont(18)}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.termBody}>
          <View style={styles.termDivider} />
          <Text style={styles.termContent} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {item.content}
          </Text>
        </View>
      )}
    </View>
  );
};

const TermsOfServiceScreen = ({ navigation }) => {
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
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Terms of Service
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. The terms of service are still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(moderateScale(32, 0.3), insets.bottom + moderateScale(24, 0.3)),
              paddingTop: scaleHeight(16),
            },
          ]}
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroPill}
            >
              <Text style={styles.heroPillText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Commun Platform Rules
              </Text>
            </LinearGradient>

            <Image
              source={require('../../assets/images/terms_hero.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.pageTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Terms of Service
          </Text>
          <Text style={styles.pageSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Understanding the rules and responsibilities{'\n'}that help keep Commun safe and trustworthy.
          </Text>

          <View style={styles.termsContainer}>
            {TERMS.map(item => (
              <TermsRow key={item.id} item={item} />
            ))}
          </View>

          <LinearGradient
            colors={[COLORS.gradientStart, '#9B4FD8', COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.agreementCard}
          >
            <View style={styles.blob1} />
            <View style={styles.blob2} />

            <Text style={styles.agreementTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              By Using Commun You{'\n'}Agree To
            </Text>
            <View style={styles.agreementList}>
              {AGREEMENTS.map(a => (
                <View key={a} style={styles.agreementRow}>
                  <View style={styles.agreementCheckCircle}>
                    <Icon name="checkmark" size={scaleFont(12)} color={COLORS.gradientStart} />
                  </View>
                  <Text style={styles.agreementText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {a}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

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
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(8),
    marginBottom: scaleHeight(24),
    ...SHADOW.card,
  },
  heroPill: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(6),
    marginBottom: scaleHeight(8),
    alignSelf: 'flex-start',
    marginLeft: scaleWidth(16),
  },
  heroPillText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  heroImage: {
    width: '100%',
    height: width * 0.44,
  },
  pageTitle: {
    fontSize: scaleFont(FONTS.heading + 4),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  pageSubtitle: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(24),
  },
  termsContainer: {
    gap: scaleHeight(8),
    marginBottom: scaleHeight(24),
  },
  termCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    overflow: 'hidden',
    ...SHADOW.card,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16, 0.3),
    gap: scaleWidth(16),
  },
  termIconBg: {
    width: moderateScale(42, 0.3),
    height: moderateScale(42, 0.3),
    borderRadius: moderateScale(RADIUS.md + 2, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  termTitle: {
    flex: 1,
    fontSize: scaleFont(FONTS.label),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    lineHeight: moderateScale(22, 0.3),
  },
  termBody: {
    paddingHorizontal: moderateScale(16, 0.3),
    paddingBottom: moderateScale(16, 0.3),
  },
  termDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginBottom: scaleHeight(8),
  },
  termContent: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
  },
  agreementCard: {
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(24, 0.3),
    marginBottom: scaleHeight(32),
    overflow: 'hidden',
    ...SHADOW.button,
  },
  blob1: {
    position: 'absolute',
    width: moderateScale(140, 0.3),
    height: moderateScale(140, 0.3),
    borderRadius: moderateScale(70, 0.3),
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -moderateScale(40, 0.3),
    right: -moderateScale(30, 0.3),
  },
  blob2: {
    position: 'absolute',
    width: moderateScale(90, 0.3),
    height: moderateScale(90, 0.3),
    borderRadius: moderateScale(45, 0.3),
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -moderateScale(25, 0.3),
    left: moderateScale(20, 0.3),
  },
  agreementTitle: {
    fontSize: scaleFont(FONTS.heading - 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    lineHeight: moderateScale(30, 0.3),
    marginBottom: scaleHeight(16),
  },
  agreementList: {
    gap: scaleHeight(8),
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  agreementCheckCircle: {
    width: moderateScale(24, 0.3),
    height: moderateScale(24, 0.3),
    borderRadius: moderateScale(12, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agreementText: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  footer: {
    alignItems: 'center',
    paddingTop: scaleHeight(8),
    paddingBottom: scaleHeight(20),
    gap: moderateScale(8, 0.3),
  },
  footerTagline: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(16),
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

export default TermsOfServiceScreen;