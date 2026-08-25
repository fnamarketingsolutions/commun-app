// screens/extra/CommunityGuidelinesScreen.jsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const GUIDELINES = [
  {
    id: '1',
    icon: 'heart-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Be Respectful',
    desc: 'Kindness, respect, and professionalism.',
  },
  {
    id: '2',
    icon: 'shield-checkmark-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Be Honest',
    desc: 'Accurate information about yourself and services.',
  },
  {
    id: '3',
    icon: 'shield-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Keep It Safe',
    desc: 'No harmful, abusive, or fraudulent activities.',
  },
  {
    id: '4',
    icon: 'people-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Support Your Community',
    desc: 'Positive environment for local talent growth.',
  },
  {
    id: '5',
    icon: 'star-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Deliver Quality Services',
    desc: 'Maintain professionalism and deliver responsibly.',
  },
  {
    id: '6',
    icon: 'flag-outline',
    iconBg: COLORS.inputBg,
    iconColor: COLORS.gradientStart,
    title: 'Report Concerns',
    desc: 'Report suspicious behavior or violations.',
  },
];

const CORE_VALUES = ['Trust', 'Respect', 'Growth', 'Connection'];

const GuidelineRow = ({ item }) => (
  <View style={styles.guidelineCard}>
    <View style={[styles.guidelineIconBg, { backgroundColor: item.iconBg }]}>
      <Icon name={item.icon} size={scaleFont(20)} color={item.iconColor} />
    </View>
    <View style={styles.guidelineText}>
      <Text style={styles.guidelineTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {item.title}
      </Text>
      <Text style={styles.guidelineDesc} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {item.desc}
      </Text>
    </View>
  </View>
);

const CommunityGuidelinesScreen = ({ navigation }) => {
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
          Community Guidelines
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. The content is still available."
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
          <Text style={styles.subHeading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Helping us create a safe, trusted, and supportive community for everyone.
          </Text>

          <View style={styles.heroBannerCard}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBannerGradient}
            >
              <View style={styles.heroBannerInner}>
                <Text style={styles.heroBannerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  COMMUNITY GUIDELINES
                </Text>
                <Text style={styles.heroBannerSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Trust, Respect, Belonging
                </Text>

                <Image
                  source={require('../../assets/images/community_guidelines.png')}
                  style={styles.heroBannerImage}
                  resizeMode="contain"
                />

                <View style={styles.heroBannerLabel}>
                  <Icon name="shield-checkmark-outline" size={scaleFont(13)} color={COLORS.gradientStart} style={{ marginRight: moderateScale(5, 0.3) }} />
                  <Text style={[styles.heroBannerLabelText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    COMMUN COMMUNITY STANDARDS
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.guidelinesContainer}>
            {GUIDELINES.map((item, index) => (
              <React.Fragment key={item.id}>
                <GuidelineRow item={item} />
                {index < GUIDELINES.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.coreValuesCard}>
            <Text style={styles.coreValuesTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Our Core Values
            </Text>
            <View style={styles.coreValuesTags}>
              {CORE_VALUES.map(value => (
                <LinearGradient
                  key={value}
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.coreValuePill}
                >
                  <Text style={styles.coreValueText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {value}
                  </Text>
                </LinearGradient>
              ))}
            </View>
          </View>

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
  subHeading: {
    fontSize: scaleFont(FONTS.body),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
    marginBottom: scaleHeight(24),
  },
  heroBannerCard: {
    borderRadius: moderateScale(RADIUS.xl + 4, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(24),
    ...SHADOW.card,
  },
  heroBannerGradient: {
    padding: moderateScale(3, 0.3),
    borderRadius: moderateScale(RADIUS.xl + 4, 0.3),
  },
  heroBannerInner: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.xl + 2, 0.3),
    paddingTop: scaleHeight(24),
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleHeight(20),
    alignItems: 'center',
  },
  heroBannerTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    letterSpacing: moderateScale(1.2, 0.2),
    marginBottom: scaleHeight(4),
    textAlign: 'center',
  },
  heroBannerSub: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(16),
    textAlign: 'center',
  },
  heroBannerImage: {
    width: '100%',
    height: width * 0.55,
    marginBottom: scaleHeight(20),
  },
  heroBannerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
    width: '100%',
    paddingTop: scaleHeight(16),
    justifyContent: 'center',
  },
  heroBannerLabelText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    letterSpacing: moderateScale(0.8, 0.2),
  },
  guidelinesContainer: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleHeight(24),
    ...SHADOW.card,
  },
  guidelineCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: scaleHeight(20),
    gap: scaleWidth(16),
  },
  guidelineIconBg: {
    width: moderateScale(42, 0.3),
    height: moderateScale(42, 0.3),
    borderRadius: moderateScale(RADIUS.md + 2, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: moderateScale(1, 0.3),
  },
  guidelineText: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: scaleFont(FONTS.label),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(3),
  },
  guidelineDesc: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
  },
  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginLeft: moderateScale(42 + 16, 0.3),
  },
  coreValuesCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(24, 0.3),
    marginBottom: scaleHeight(24),
    ...SHADOW.card,
  },
  coreValuesTitle: {
    fontSize: scaleFont(FONTS.heading - 2),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(16),
  },
  coreValuesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10, 0.3),
  },
  coreValuePill: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleHeight(8),
  },
  coreValueText: {
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

export default CommunityGuidelinesScreen;