// screens/extra/FAQScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FAQ Sections (matches website) ──────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    title: 'General',
    icon: '📌',
    faqs: [
      {
        question: 'What is CommuN?',
        answer:
          "CommuN is India's first Neighbourhood Operating System (N.O.S.)— a hyperlocal platform that helps residents discover trusted local services, home businesses, professionals, and opportunities within their own neighbourhood.",
      },
      {
        question: 'Why was CommuN created?',
        answer:
          'We realised that every neighbourhood is full of talented individuals and trusted service providers, yet most remain undiscovered. Residents often rely on WhatsApp groups, referrals, Google searches, or social media to find local services. CommuN brings everything together in one organised, searchable platform.',
      },
      {
        question: 'What makes CommuN different?',
        answer:
          'CommuN is built exclusively for neighbourhoods. Unlike search engines, directories, or social media, the platform focuses on helping residents discover and connect with trusted people and services within their own CommuNity.',
      },
      {
        question:
          'Why should I use CommuN when I already have WhatsApp, Google or an existing Society management app?',
        answer:
          'Because those platforms were built for different purposes. WhatsApp is designed for conversations, Google for searching the internet, and society management apps for managing gated CommuNities. CommuN is built exclusively for neighbourhood discovery—helping residents easily find trusted local services while giving neighbourhood entrepreneurs lasting visibility. Instead of searching across multiple apps, CommuN brings your neighbourhood together in one organised, searchable place.',
      },
    ],
  },
  {
    title: 'For Residents',
    icon: '🏠',
    faqs: [
      {
        question: 'How can CommuN help me?',
        answer:
          'CommuN helps you discover trusted local services nearby, such as:\n• Home tutors\n• Fitness trainers\n• Home bakers\n• Music teachers\n• Doctors\n• Lawyers\n• Architects\n• Electricians\n• Plumbers\n• Event planners\n• Pet services\n…and much more.',
      },
      {
        question: 'Is CommuN free to use?',
        answer: 'Yes! Browsing and discovering local services is completely free for residents.',
      },
      {
        question: 'Why should I use CommuN instead of WhatsApp?',
        answer:
          'WhatsApp is great for conversations, but not for discovery. Messages disappear quickly, information gets buried, and the same questions get asked repeatedly. CommuN keeps neighbourhood services organised, searchable, and available whenever you need them.',
      },
      {
        question: 'Why not just search on Google?',
        answer:
          'Google shows businesses across a broad area. CommuN helps you discover trusted people and services within your own neighbourhood—often including home-based businesses and professionals who may not even appear on Google.',
      },
      {
        question: 'How do I search for services on the platform?',
        answer:
          "You can search for services using the search bar in the navbar. When you click on it, you'll see all available categories. Start typing to search for specific services by keyword, category, or provider name.",
      },
      {
        question: 'Can I contact providers directly?',
        answer:
          'Yes! You can connect directly with providers through the contact information available on their profile.',
      },
      {
        question: "What if I'm not satisfied with a service?",
        answer:
          'We encourage open communication between customers and providers. If you have any concerns, please reach out to the provider first. You can also leave feedback through our review system. For serious issues, please contact our support team.',
      },
      {
        question: 'Can I leave reviews?',
        answer:
          'Yes! You can leave reviews and ratings to help other community members make informed decisions. Reviews help maintain quality and build trust within the community.',
      },
      {
        question: 'Can I give ratings to any provider?',
        answer:
          'Yes! You can give the provider star ratings based on your satisfaction to the services provided to you.',
      },
    ],
  },
  {
    title: 'For Service Providers',
    icon: '💼',
    faqs: [
      {
        question: 'Who can register as a provider?',
        answer:
          'Anyone offering a genuine product or service within the CommuNity can register, including:\n• Tutors\n• Fitness trainers\n• Home bakers\n• Consultants\n• Freelancers\n• Artists\n• Doctors\n• Lawyers\n• Coaches\n• Home businesses\n• Local professionals',
      },
      {
        question: 'Why should I list my services on CommuN?',
        answer:
          'CommuN helps you become visible to people most likely to become your customers—your neighbours. Instead of relying solely on word-of-mouth or repeated WhatsApp posts, your services remain discoverable whenever someone is looking.',
      },
      {
        question: 'Is listing free?',
        answer: 'Yes! Listing your service is completely free.',
      },
      {
        question: 'Will I receive enquiries directly?',
        answer:
          'Yes! Interested residents can contact you using the details shared on your profile.',
      },
      {
        question: 'Can I update my profile?',
        answer:
          'Absolutely. You can update your profile, services, and contact details whenever needed. Open Provider Dashboard from the menu, then use Update Profile or Manage Services to keep your information current and help customers find you easily.',
      },
    ],
  },
  {
    title: 'Trust & Safety',
    icon: '🛡️',
    faqs: [
      {
        question: 'Are all providers verified?',
        answer:
          'CommuN encourages genuine listings and aims to build a trusted CommuNity. All users get verified by the registered community representatives before becoming a part of one. Verification features will continue to evolve as the platform grows.',
      },
      {
        question: 'Does CommuN recommend providers?',
        answer:
          'CommuN provides a platform for discovery. Residents are encouraged to review provider profiles and choose the service that best meets their needs.',
      },
      {
        question: 'Is my personal information safe?',
        answer:
          'Yes! We take privacy seriously and only display the information you choose to make public.',
      },
    ],
  },
  {
    title: 'The Platform',
    icon: '🌐',
    faqs: [
      {
        question: 'Which areas does CommuN currently serve?',
        answer:
          'CommuN is currently expanding Community by Community. New neighbourhoods will continue to be added over time and updated on the platform.',
      },
      {
        question: 'Can I suggest my neighbourhood?',
        answer:
          "Absolutely. We'd love to hear from you. If your CommuNity isn't available yet, get in touch with us and we'll consider it for future expansion.",
      },
      {
        question: 'What features are coming next?',
        answer:
          'CommuN is continuously evolving. Future updates will include:\n• CommuNity groups\n• Local events\n• Secure payments\n• Resident recommendations\n• RWA tools\n• Announcements\n• Neighbourhood commerce\n• AI-powered local discovery',
      },
    ],
  },
  {
    title: 'Account',
    icon: '👤',
    faqs: [
      {
        question: 'How do I create an account?',
        answer:
          'Simply register using your email address or mobile number and follow the onboarding steps.',
      },
      {
        question: 'Can I register as both a resident and a provider?',
        answer:
          'Yes. Many residents also offer products or services, and CommuN supports both roles.',
      },
      {
        question: 'Can I edit or delete my account?',
        answer:
          'Yes! You can manage or delete your account at any time through your profile settings or by contacting our support team.',
      },
      {
        question: 'If I shift from one society to another, how do I join the new society?',
        answer:
          'You can simply send us a request at info@commun.in and mention all details. Our backend team will help you out within 24 hours.',
      },
    ],
  },
  {
    title: 'Support',
    icon: '💬',
    faqs: [
      {
        question: 'How can I contact CommuN?',
        answer: "You can reach us at info@commun.in, and we'll be happy to assist you.",
      },
      {
        question: 'I have a suggestion. How can I share it?',
        answer:
          'We welcome feedback from our CommuNity. Simply email us at info@commun.in with your ideas or suggestions.',
      },
    ],
  },
  {
    title: 'Vision',
    icon: '🚀',
    faqs: [
      {
        question: 'Is CommuN just another directory?',
        answer:
          'No! CommuN is much more than a directory. Our vision is to become the digital operating system for neighbourhoods—bringing together discovery, CommuNity engagement, local commerce, and neighbourhood management into one trusted platform.',
      },
    ],
  },
];

// ─── Flatten for search ──────────────────────────────────────────────────────
const FLAT_FAQS = FAQ_SECTIONS.flatMap(section =>
  section.faqs.map(faq => ({ ...faq, sectionTitle: section.title }))
);

// ─── FAQItem ──────────────────────────────────────────────────────────────────
const FAQItem = ({ item, index, isOpen, onToggle }) => {
  const handlePress = () => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    onToggle(index);
  };

  return (
    <View style={[styles.faqCard, isOpen && styles.faqCardOpen]}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={handlePress}
        activeOpacity={0.75}>
        <View style={[styles.numBadge, isOpen && styles.numBadgeActive]}>
          <Text style={[styles.numText, isOpen && styles.numTextActive]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <Text style={[styles.question, isOpen && styles.questionActive]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {item.question}
        </Text>

        <View style={[styles.chevronBox, isOpen && styles.chevronBoxActive]}>
          <Icon
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={scaleFont(17)}
            color={isOpen ? COLORS.gradientStart : COLORS.textMuted}
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.answerWrap}>
          <View style={styles.answerDivider} />
          <Text style={styles.answerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {title.toUpperCase()}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const FAQScreen = ({ navigation }) => {
  const { isOnline } = useNetworkStatus();

  const [openKey, setOpenKey] = useState(null);
  const [search, setSearch] = useState('');

  const toggleFAQ = (key) => setOpenKey(openKey === key ? null : key);

  const searchLower = search.trim().toLowerCase();

  // ── Filtered sections ──
  const filteredSections = searchLower
    ? FAQ_SECTIONS.map(section => ({
        ...section,
        faqs: section.faqs.filter(
          f =>
            f.question.toLowerCase().includes(searchLower) ||
            f.answer.toLowerCase().includes(searchLower)
        ),
      })).filter(section => section.faqs.length > 0)
    : FAQ_SECTIONS;

  // ── Count for label ──
  const totalFiltered = filteredSections.reduce((sum, s) => sum + s.faqs.length, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(22)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          FAQ
        </Text>
        <View style={{ width: moderateScale(36, 0.3) }} />
      </View>

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. The FAQs are still available."
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ── Hero ── */}
          <View style={styles.heroSection}>
            <View style={styles.heroPill}>
              <Text style={[styles.heroPillText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                HELP CENTER
              </Text>
            </View>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {'Frequently\n'}
              <Text style={[styles.heroHighlight, { color: COLORS.gradientStart }]}>Asked Questions</Text>
            </Text>
            <Text style={styles.heroSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Find quick answers about CommuN — how it works, booking,
              verification and more.
            </Text>
          </View>

          {/* ── Search ── */}
          <View style={styles.searchBar}>
            <Icon
              name="search-outline"
              size={scaleFont(18)}
              color={COLORS.textMuted}
              style={{ marginRight: scaleWidth(10) }}
            />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search questions..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="search"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.countLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {totalFiltered} question{totalFiltered !== 1 ? 's' : ''}
            {search.trim() ? `  for "${search}"` : ''}
          </Text>

          {totalFiltered === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="help-circle-outline" size={scaleFont(52)} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No results found
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Try a different keyword or browse all questions
              </Text>
              <TouchableOpacity
                onPress={() => setSearch('')}
                style={styles.clearBtn}
                activeOpacity={0.8}>
                <Text style={[styles.clearBtnText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSections.map((section, sectionIdx) => {
              // ── Compute global index for the first item in this section ──
              // We need to know the total number of FAQs before this section
              // to show sequential numbers across sections.
              // We'll compute it by iterating over previous sections in filteredSections.
              let startIndex = 0;
              for (let i = 0; i < sectionIdx; i++) {
                startIndex += filteredSections[i].faqs.length;
              }

              return (
                <View key={section.title}>
                  <SectionHeader title={section.title} icon={section.icon} />
                  {section.faqs.map((faq, idx) => {
                    const globalIndex = startIndex + idx;
                    const key = `${section.title}-${faq.question}`;
                    const isOpen = openKey === key;
                    return (
                      <FAQItem
                        key={key}
                        item={faq}
                        index={globalIndex}
                        isOpen={isOpen}
                        onToggle={() => toggleFAQ(key)}
                      />
                    );
                  })}
                </View>
              );
            })
          )}

          {/* ── Still Have Questions CTA ── */}
          <View style={styles.ctaOuter}>
            <LinearGradient
              colors={[COLORS.inputBg, '#F3F0FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGrad}>
              <View style={styles.ctaIconWrap}>
                <Icon
                  name="chatbubble-ellipses-outline"
                  size={scaleFont(24)}
                  color={COLORS.gradientStart}
                />
              </View>
              <Text style={styles.ctaTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Still Have Questions?
              </Text>
              <Text style={styles.ctaBody} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Can't find what you're looking for? Reach out via our contact page
                — we'd be happy to help.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.ctaBtnWrap}
                onPress={() => navigation?.navigate('Contact')}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtn}>
                  <Icon
                    name="mail-outline"
                    size={scaleFont(17)}
                    color={COLORS.white}
                    style={{ marginRight: moderateScale(8, 0.3) }}
                  />
                  <Text style={styles.ctaBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Contact Us
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

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
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(12),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  heroSection: {
    paddingTop: scaleHeight(24),
    paddingBottom: scaleHeight(20),
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(5),
    marginBottom: scaleHeight(14),
  },
  heroPillText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(1.2, 0.2),
  },
  heroTitle: {
    fontSize: scaleFont(28),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    letterSpacing: moderateScale(-0.4, 0.2),
    lineHeight: moderateScale(36, 0.3),
    marginBottom: scaleHeight(10),
  },
  heroHighlight: {
    // color removed – handled by style array
  },
  heroSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(13) : scaleHeight(8),
    marginBottom: scaleHeight(12),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightMedium,
  },
  countLabel: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
    marginBottom: scaleHeight(14),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(6),
  },
  sectionIcon: {
    fontSize: scaleFont(18),
    marginRight: scaleWidth(8),
  },
  sectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    letterSpacing: moderateScale(0.5, 0.2),
  },
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    marginBottom: scaleHeight(10),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 2,
    overflow: 'hidden',
  },
  faqCardOpen: {
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    elevation: 5,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(15),
    gap: scaleWidth(12),
  },
  numBadge: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeActive: {
    backgroundColor: COLORS.white,
  },
  numText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
  },
  numTextActive: {
    // color removed – handled by style array
  },
  question: {
    flex: 1,
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    lineHeight: moderateScale(20, 0.3),
  },
  questionActive: {
    // color removed – handled by style array
  },
  chevronBox: {
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    borderRadius: moderateScale(8, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBoxActive: {
    backgroundColor: COLORS.white,
  },
  answerWrap: {
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleHeight(18),
  },
  answerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginBottom: scaleHeight(14),
  },
  answerText: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: scaleHeight(52),
  },
  emptyTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
    marginTop: scaleHeight(14),
    marginBottom: scaleHeight(6),
  },
  emptySubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(20),
  },
  clearBtn: {
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
  },
  clearBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
  },
  ctaOuter: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    overflow: 'hidden',
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(8),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(12, 0.3),
    elevation: 3,
  },
  ctaGrad: {
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
  },
  ctaIconWrap: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(14),
    ...SHADOW.card,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(2, 0.2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 2,
  },
  ctaTitle: {
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  ctaBody: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(18),
  },
  ctaBtnWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  ctaBtn: {
    paddingVertical: scaleHeight(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default FAQScreen;