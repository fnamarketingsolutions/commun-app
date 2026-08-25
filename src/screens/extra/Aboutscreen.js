// screens/extra/AboutScreen.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { ROUTES } from '../../navigations/routes';

const { width } = Dimensions.get('window');

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Bullet = ({ text }) => (
  <View style={styles.bulletRow}>
    <View style={[styles.bulletDot, { backgroundColor: COLORS.gradientStart }]} />
    <Text style={styles.bulletText} maxFontSizeMultiplier={1.3}>
      {text}
    </Text>
  </View>
);

const SectionHeading = ({ icon: IconComponent, title, subtitle, light = false, iconLib = 'Ionicons' }) => (
  <View style={styles.sectionHeadingWrap}>
    <View style={[styles.sectionIconWrap, light && styles.sectionIconWrapLight]}>
      {iconLib === 'Material' ? (
        <MaterialIcon name={IconComponent} size={scaleFont(22)} color={light ? '#fff' : COLORS.gradientStart} />
      ) : (
        <Icon name={IconComponent} size={scaleFont(22)} color={light ? '#fff' : COLORS.gradientStart} />
      )}
    </View>
    <Text style={[styles.sectionHeadingTitle, light && styles.sectionHeadingTitleLight]}>
      {title}
    </Text>
    {subtitle && (
      <Text style={[styles.sectionHeadingSub, light && styles.sectionHeadingSubLight]}>
        {subtitle}
      </Text>
    )}
  </View>
);

const AudienceCard = ({ icon, iconLib = 'Ionicons', title, items }) => (
  <Card style={styles.audienceCard}>
    <View style={[styles.audienceIconWrap, { backgroundColor: COLORS.white }]}>
      {iconLib === 'Material' ? (
        <MaterialIcon name={icon} size={scaleFont(22)} color={COLORS.gradientStart} />
      ) : (
        <Icon name={icon} size={scaleFont(22)} color={COLORS.gradientStart} />
      )}
    </View>
    <Text style={styles.audienceTitle} maxFontSizeMultiplier={1.3}>
      {title}
    </Text>
    {items.map(text => (
      <Bullet key={text} text={text} />
    ))}
  </Card>
);

const AboutScreen = ({ navigation }) => {
  const { isOnline } = useNetworkStatus();

  const audiences = [
    {
      icon: 'people-outline',
      iconLib: 'Ionicons',
      title: 'For Residents',
      items: [
        'Discover trusted local services offered by neighbours',
        'Stay informed with community announcements & events',
        'Connect with people who share your interests',
      ],
    },
    {
      icon: 'briefcase-outline',
      iconLib: 'Ionicons',
      title: 'For Local Professionals & Home Businesses',
      items: [
        'Get visible to the people who matter most – your neighbours',
        'Build a trusted audience without marketing spend',
        'Grow your business within your own community',
      ],
    },
    {
      icon: 'business-outline',
      iconLib: 'Ionicons',
      title: 'For RWAs',
      items: [
        'Communicate with residents in one place',
        'Keep the community informed & engaged',
        'Manage neighbourhood activities efficiently',
      ],
    },
  ];

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
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          About CommuN
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: scaleHeight(16) },
          ]}
          showsVerticalScrollIndicator={false}>

          <View style={styles.heroSection}>
            <View style={styles.badgePill}>
              <Text style={[styles.badgePillText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={1.3}>
                India's First Neighbourhood Operating System
              </Text>
            </View>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={1.3}>
              About{' '}
              <Text style={[styles.heroTitleGradient, { color: COLORS.gradientStart }]}>CommuN</Text>
            </Text>
            <Text style={styles.heroSubtitle} maxFontSizeMultiplier={1.3}>
              Reimagining Neighbourhood Living
            </Text>
            <Text style={styles.heroDesc} maxFontSizeMultiplier={1.3}>
              Neighbourhoods have always been at the heart of our lives. We believe they deserve a better
              digital experience – so we created CommuN.
            </Text>
          </View>

          <Card>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
              Neighbourhoods have always been at the heart of our lives. They're where we build
              friendships, celebrate milestones, seek recommendations, support local businesses, and
              create a sense of belonging.
            </Text>
            <Text style={[styles.bodyText, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Yet, despite living just a few doors apart, many of us remain disconnected from the
              people, services, and opportunities around us. Finding a trusted tutor often means asking
              on WhatsApp. Looking for a reliable plumber relies on referrals. Community announcements
              get buried in endless chats, and local talent often goes unnoticed.
            </Text>
            <Text style={[styles.bodyTextBold, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              We believe neighbourhoods deserve a better digital experience. That's why we created CommuN.
            </Text>
          </Card>

          <SectionHeading
            icon="sparkles-outline"
            title="What is CommuN?"
            subtitle="India's first Neighbourhood Operating System (N.O.S.)"
          />
          <Card>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
              CommuN is India's first Neighbourhood Operating System (N.O.S.) – a trusted digital
              platform designed to bring every aspect of neighbourhood life together in one place.
            </Text>
            <Text style={[styles.bodyText, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Whether it's discovering trusted local services, connecting with neighbours who share
              your interests, staying informed through community announcements, participating in local
              events, or accessing essential neighbourhood information, CommuN makes everyday
              neighbourhood living simpler, more connected, and more organised.
            </Text>
            <Text style={[styles.bodyTextBold, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Rather than replacing the relationships that make communities special, CommuN strengthens
              them by making it easier for neighbours to discover, connect, and support one another.
            </Text>
          </Card>

          <SectionHeading
            icon="bulb-outline"
            title="Why We Built CommuN"
            subtitle="The challenge isn't talent – it's discoverability"
          />
          <Card>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
              Every neighbourhood already has incredible people.
            </Text>
            <View style={styles.bulletList}>
              <Bullet text="The tutor helping students succeed" />
              <Bullet text="The home baker crafting amazing desserts" />
              <Bullet text="The fitness coach inspiring healthier lifestyles" />
              <Bullet text="The architect, doctor, lawyer, artist, musician, entrepreneur, and countless others who quietly contribute to the community every day" />
            </View>
            <Text style={[styles.bodyTextBold, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              The challenge isn't the lack of talent. It's discoverability.
            </Text>
            <Text style={[styles.bodyText, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Many neighbourhood services remain hidden behind word-of-mouth recommendations and
              scattered conversations. Important updates are spread across multiple channels, making it
              difficult for residents to stay informed and engaged.
            </Text>
            <Text style={[styles.bodyText, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              CommuN brings these everyday neighbourhood interactions into one trusted platform – making
              local opportunities easier to discover and community life easier to navigate.
            </Text>
          </Card>

          <SectionHeading
            icon="people-outline"
            title="Built Around the Needs of Every Neighbourhood"
            subtitle="Designed to serve everyone who contributes to neighbourhood life"
          />
          {audiences.map((audience, i) => (
            <AudienceCard key={i} {...audience} />
          ))}
          <Text style={styles.audienceFooter} maxFontSizeMultiplier={1.3}>
            Together, they create a stronger, more connected neighbourhood ecosystem.
          </Text>

          <View style={styles.visionMissionWrap}>
            <LinearGradient
              colors={[COLORS.gradientStart, '#2D1B4E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.visionCard}
            >
              <View style={[styles.visionIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Icon name="flag-outline" size={scaleFont(24)} color="#fff" />
              </View>
              <Text style={styles.visionTitle}>Our Vision</Text>
              <Text style={styles.visionText}>
                To create the world's most connected neighbourhood ecosystem where residents, local
                businesses, and communities discover, connect, and thrive together.
              </Text>
            </LinearGradient>

            <LinearGradient
              colors={['#2D1B4E', COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.visionCard}
            >
              <View style={[styles.visionIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Icon name="rocket-outline" size={scaleFont(24)} color="#fff" /> 
              </View>
              <Text style={styles.visionTitle}>Our Mission</Text>
              <Text style={styles.visionText}>
                To digitally empower neighbourhoods by making local communities more connected,
                discoverable, and organised through one trusted platform.
              </Text>
            </LinearGradient>
          </View>

          <SectionHeading
            icon="heart-outline"
            title="More Than an App"
            subtitle="The digital foundation for neighbourhood life"
          />
          <Card>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.3}>
              We don't see CommuN as just another app. We see it as the digital foundation for
              neighbourhood life – a platform that helps residents connect more easily, supports local
              entrepreneurs, strengthens communities, and makes everyday interactions more meaningful.
            </Text>
            <Text style={[styles.bodyTextBold, { marginTop: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Because when neighbourhoods become more connected, everyone benefits.
            </Text>
          </Card>

          <Card style={styles.ctaCard}>
            <View style={[styles.ctaIconWrap, { backgroundColor: COLORS.white }]}>
              <Icon name="book-outline" size={scaleFont(24)} color={COLORS.gradientStart} />
            </View>
            <Text style={styles.ctaTitle} maxFontSizeMultiplier={1.3}>
              Welcome to CommuN
            </Text>
            <Text style={styles.ctaBody} maxFontSizeMultiplier={1.3}>
              Whether you're looking for a trusted service, growing a local business, participating
              in your community, or simply staying connected with your neighbourhood, CommuN is built
              for you.
            </Text>
            <Text style={[styles.ctaBody, { marginBottom: scaleHeight(8) }]} maxFontSizeMultiplier={1.3}>
              Because we believe every neighbourhood already has everything it needs. It just needs a
              better way to connect.
            </Text>
            <Text style={styles.ctaTagline} maxFontSizeMultiplier={1.3}>
              Stronger neighbourhoods build stronger communities.
            </Text>

            <View style={styles.ctaBtnRow}>
              <TouchableOpacity
                style={[styles.ctaBtnOutline, !isOnline && styles.ctaBtnDisabled]}
                activeOpacity={0.8}
                onPress={() => isOnline && navigation.navigate(ROUTES.TABS, { screen: ROUTES.SERVICES })}
                disabled={!isOnline}
              >
                <Text style={[styles.ctaBtnOutlineText, !isOnline && styles.ctaBtnDisabledText]} maxFontSizeMultiplier={1.3}>
                  Browse Services
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.ctaBtnGradWrap}
                onPress={() => isOnline && navigation.navigate(ROUTES.TABS, { screen: ROUTES.CATEGORIES })}
                disabled={!isOnline}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.ctaBtnGrad, !isOnline && styles.ctaBtnGradDisabled]}>
                  <Text style={[styles.ctaBtnGradText, !isOnline && styles.ctaBtnDisabledText]} maxFontSizeMultiplier={1.3}>
                    {isOnline ? 'View Categories' : 'Offline'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={{ height: scaleHeight(32) }} />
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

  heroSection: {
    alignItems: 'center',
    paddingVertical: scaleHeight(24),
    paddingBottom: scaleHeight(32),
  },
  badgePill: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(6),
    marginBottom: scaleHeight(14),
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
    marginBottom: scaleHeight(8),
  },
  heroTitleGradient: {
  },
  heroSubtitle: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightSemibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(8),
  },
  heroDesc: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(24, 0.3),
    paddingHorizontal: scaleWidth(10),
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  bodyText: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
  },
  bodyTextBold: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    lineHeight: moderateScale(22, 0.3),
  },
  bulletList: {
    marginTop: scaleHeight(8),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(10),
    marginTop: scaleHeight(6),
  },
  bulletDot: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    borderRadius: moderateScale(3, 0.3),
    marginTop: scaleHeight(8),
  },
  bulletText: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
  },

  sectionHeadingWrap: {
    alignItems: 'center',
    marginBottom: scaleHeight(16),
    marginTop: scaleHeight(8),
  },
  sectionIconWrap: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(10),
  },
  sectionIconWrapLight: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeadingTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sectionHeadingTitleLight: {
    color: '#fff',
  },
  sectionHeadingSub: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scaleHeight(4),
    maxWidth: '80%',
  },
  sectionHeadingSubLight: {
    color: '#D8B4FE',
  },

  audienceCard: {
    paddingBottom: moderateScale(18, 0.3),
  },
  audienceIconWrap: {
    width: moderateScale(42, 0.3),
    height: moderateScale(42, 0.3),
    borderRadius: moderateScale(13, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(10),
  },
  audienceTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
  },
  audienceFooter: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(16),
    paddingHorizontal: scaleWidth(10),
  },

  visionMissionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(16),
  },
  visionCard: {
    flex: 1,
    minWidth: (width - moderateScale(40, 0.3) - moderateScale(10, 0.3)) / 2,
    borderRadius: moderateScale(20, 0.3),
    padding: moderateScale(18, 0.3),
    alignItems: 'center',
  },
  visionIcon: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(14, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(8),
  },
  visionTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: '#fff',
    marginBottom: scaleHeight(4),
  },
  visionText: {
    fontSize: scaleFont(13),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },

  ctaCard: {
    alignItems: 'center',
    paddingBottom: moderateScale(24, 0.3),
  },
  ctaIconWrap: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(14, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(10),
  },
  ctaTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
  },
  ctaBody: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(22, 0.3),
    paddingHorizontal: scaleWidth(10),
  },
  ctaTagline: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(20),
    paddingHorizontal: scaleWidth(10),
  },
  ctaBtnRow: {
    flexDirection: 'row',
    gap: scaleWidth(10),
    width: '100%',
  },
  ctaBtnOutline: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(14),
    backgroundColor: COLORS.white,
  },
  ctaBtnOutlineText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  ctaBtnGradWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  ctaBtnGrad: {
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnGradText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
    borderColor: COLORS.border,
  },
  ctaBtnGradDisabled: {
    opacity: 0.5,
  },
  ctaBtnDisabledText: {
    color: COLORS.textMuted,
  },
});

export default AboutScreen;