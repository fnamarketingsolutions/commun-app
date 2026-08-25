// screens/onboarding/OnboardingScreen.jsx
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import  LinearGradient  from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const PURPLE = '#6C3CE1';
const PINK   = '#F25CA2';
const BG     = '#EDEEF6';

const SLIDES = [
  {
    id: '1',
    image: require('../../assets/images/onboard1.png'),
  },
  {
    id: '2',
    title: 'Connect With Experts',
    description:
      'View provider profiles, check experience, browse portfolios, and contact them directly.',
    image: require('../../assets/images/onboard2.png'),
  },
  {
    id: '3',
    title: 'Share Your Skills & Grow',
    description:
      'Become a provider, showcase your expertise, and reach more customers.',
    image: require('../../assets/images/onboard3.png'),
  },
];

const AVATAR_COLORS = ['#9B8EC4', '#7B6BB4', '#5A4FA0'];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Safe area insets — handles notch, Dynamic Island, gesture bar
  // on every device (iOS + all Android nav modes)
  const insets = useSafeAreaInsets();

  const isLast  = currentIndex === SLIDES.length - 1;
  const isFirst = currentIndex === 0;

  // Responsive sizing — computed once, used everywhere
  // Small phones  (h < 700): compact layout
  // Medium phones (h < 800): standard layout
  // Large phones  (h >= 800): generous layout
  const isSmall  = height < 700;
  const isMedium = height < 800;

  // Image takes a % of available height (after insets are subtracted)
  const availableHeight = height - insets.top - insets.bottom;
  const welcomeImageH   = availableHeight * (isSmall ? 0.38 : isMedium ? 0.42 : 0.46);
  const infoCardSize    = width  * (isSmall ? 0.72 : 0.78);  // card width
  const infoCardH       = infoCardSize * (isSmall ? 0.88 : 0.85); // slightly portrait

  const changeTo = (nextIndex) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCurrentIndex(nextIndex), 150);
  };

  const goNext = () => {
    if (isLast) {
      navigation.replace('Register');
    } else {
      changeTo(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (!isFirst) changeTo(currentIndex - 1);
  };

  const skip = () => navigation.replace('Register');

  // ── Dots ───────────────────────────────────────────────────────────────────
  const Dots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );

  // ── Avatar stack ───────────────────────────────────────────────────────────
  const AvatarStack = () => (
    <View style={styles.avatarRow}>
      <View style={styles.avatarStack}>
        {AVATAR_COLORS.map((color, i) => (
          <View
            key={i}
            style={[
              styles.avatarCircle,
              { backgroundColor: color, marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i },
            ]}
          >
            <Text style={styles.avatarText}>im</Text>
          </View>
        ))}
        <View style={[styles.avatarCircle, styles.avatarBadge]}>
          <Text style={styles.avatarBadgeText}>+2k</Text>
        </View>
      </View>
      <Text style={styles.avatarLabel}>Joined by local providers</Text>
    </View>
  );

  // ── SLIDE 0 — Welcome ──────────────────────────────────────────────────────
  const WelcomeSlide = () => (
    <View style={styles.welcomeContainer}>
      {/* Header — top inset applied via paddingTop on SafeAreaView edges,
          so we just need horizontal padding here */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.marketplaceText}>Commun</Text>
        <TouchableOpacity
          onPress={skip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Full-width image — height computed from available screen space */}
      <Image
        source={SLIDES[0].image}
        style={[styles.welcomeImage, { height: welcomeImageH }]}
        resizeMode="cover"
      />

      {/* White content panel — flex:1 fills remaining space naturally */}
      <View style={styles.welcomeContent}>
        <Text style={[styles.heroHeading, isSmall && { fontSize: 26, lineHeight: 34 }]}>
          <Text style={styles.heroBlack}>Connect. </Text>
          <Text style={styles.heroPurple}>Discover. </Text>
          {'\n'}
          <Text style={styles.heroBlack}>Thrive.</Text>
        </Text>

        <Text style={styles.heroDesc}>
          Discover trusted local services and talented providers in your community.
        </Text>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[PURPLE, PINK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedBtn}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signInRow}>
            Already have an account?{' '}
            <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <AvatarStack />
      </View>

      {/* Dots sit below content, above gesture bar */}
      <View style={[
        styles.welcomeDots,
        // Extra bottom padding so dots clear the home indicator / gesture bar
        { paddingBottom: Math.max(20, insets.bottom + 8) },
      ]}>
        <Dots />
      </View>
    </View>
  );

  // ── SLIDES 1+ — Info slides ────────────────────────────────────────────────
  const InfoSlide = () => {
    const slide = SLIDES[currentIndex];
    return (
      <View style={styles.infoContainer}>
        {/* Header — uses Ionicons icon (no raw text rendering) */}
        <View style={styles.infoHeader}>
          <TouchableOpacity
            onPress={goPrev}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.backBtn}
          >
            <Icon name="arrow-back" size={22} color={PURPLE} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={skip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipTextPurple}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Image card — responsive size, centred in remaining space */}
        <View style={styles.infoImageArea}>
          <View style={[
            styles.infoImageCard,
            { width: infoCardSize, height: infoCardH },
          ]}>
            <Image
              source={slide.image}
              style={styles.infoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Bottom panel */}
        <View style={[
          styles.infoPanel,
          // Extra bottom padding for home indicator / gesture bar
          { paddingBottom: Math.max(32, insets.bottom + 16) },
        ]}>
          <Text style={[styles.infoTitle, isSmall && { fontSize: 22, lineHeight: 28 }]}>
            {slide.title}
          </Text>
          <Text style={styles.infoDesc}>{slide.description}</Text>

          <View style={styles.infoNavRow}>
            <Dots />
            <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
              <LinearGradient
                colors={[PURPLE, PINK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>
                  {isLast ? 'Get Started  →' : 'Next  →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    // SafeAreaView with all edges — handles notch/Dynamic Island (top) and
    // gesture bar / home indicator (bottom) on every iOS & Android device.
    // 'left' + 'right' handles rounded corners on foldables.
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        {currentIndex === 0 ? <WelcomeSlide /> : <InfoSlide />}
      </Animated.View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex:            1,
    backgroundColor: BG,   // matches screen BG so inset zones blend in
  },
  root: {
    flex: 1,
  },

  // ── Welcome ──────────────────────────────────────────────────────────────────
  welcomeContainer: {
    flex:            1,
    backgroundColor: BG,
  },
  welcomeHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 24,
    paddingTop:        16,    // SafeAreaView already consumed notch; just breathing room
    paddingBottom:     12,
  },
  marketplaceText: {
    fontSize:      22,
    fontWeight:    '800',
    color:         PURPLE,
    letterSpacing: 0.2,
  },
  skipText: {
    fontSize:   15,
    fontWeight: '500',
    color:      '#444',
  },
  // width: '100%' + height from JS = image fills full width, responsive height
  welcomeImage: {
    width: '100%',
  },
  welcomeContent: {
    flex:              1,
    backgroundColor:   '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop:        22,
  },
  heroHeading: {
    fontSize:     32,
    lineHeight:   42,
    fontWeight:   '800',
    marginBottom: 10,
  },
  heroBlack: {
    color: '#1A1A2E',
  },
  heroPurple: {
    color: PURPLE,
  },
  heroDesc: {
    fontSize:     14,
    color:        '#888',
    lineHeight:   22,
    marginBottom: 22,
  },
  getStartedBtn: {
    width:          '100%',
    height:         54,
    borderRadius:   27,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   14,
  },
  getStartedText: {
    color:         '#FFFFFF',
    fontSize:      16,
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
  signInRow: {
    textAlign:    'center',
    fontSize:     13,
    color:        '#888',
    marginBottom: 18,
  },
  signInLink: {
    color:      PURPLE,
    fontWeight: '600',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  avatarCircle: {
    width:          32,
    height:         32,
    borderRadius:   16,
    borderWidth:    2,
    borderColor:    '#FFFFFF',
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize:   8,
    color:      '#FFFFFF',
    fontWeight: '600',
  },
  avatarBadge: {
    backgroundColor: PURPLE,
    marginLeft:      -10,
    zIndex:          0,
  },
  avatarBadgeText: {
    fontSize:   8,
    color:      '#FFFFFF',
    fontWeight: '700',
  },
  avatarLabel: {
    fontSize:   13,
    color:      '#555',
    fontWeight: '500',
  },
  welcomeDots: {
    backgroundColor: '#FFFFFF',
    paddingTop:      12,
    alignItems:      'center',
  },

  // ── Info slides ───────────────────────────────────────────────────────────────
  infoContainer: {
    flex:            1,
    backgroundColor: BG,
  },
  infoHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 24,
    paddingTop:        16,
    paddingBottom:     8,
  },
  backBtn: {
    padding: 4,
  },
  skipTextPurple: {
    fontSize:   15,
    color:      PURPLE,
    fontWeight: '600',
  },
  infoImageArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  // width + height injected inline from JS responsive values
  infoImageCard: {
    borderRadius:     20,
    backgroundColor:  '#FFFFFF',
    overflow:         'hidden',
    shadowColor:      '#000',
    shadowOpacity:    0.08,
    shadowRadius:     20,
    shadowOffset:     { width: 0, height: 6 },
    elevation:        6,
  },
  infoImage: {
    width:  '100%',
    height: '100%',
  },
  infoPanel: {
    backgroundColor:      '#FFFFFF',
    borderTopLeftRadius:  32,
    borderTopRightRadius: 32,
    paddingHorizontal:    28,
    paddingTop:           24,
  },
  infoTitle: {
    fontSize:     26,
    fontWeight:   '800',
    color:        '#1A1A2E',
    marginBottom: 8,
    lineHeight:   34,
  },
  infoDesc: {
    fontSize:     14,
    color:        '#888',
    lineHeight:   22,
    marginBottom: 24,
  },
  infoNavRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  nextBtn: {
    height:            50,
    paddingHorizontal: 28,
    borderRadius:      25,
    alignItems:        'center',
    justifyContent:    'center',
  },
  nextBtnText: {
    color:         '#FFFFFF',
    fontSize:      15,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },

  // ── Shared dots ───────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  dot: {
    height:       8,
    borderRadius: 4,
  },
  dotActive: {
    width:           22,
    backgroundColor: PURPLE,
  },
  dotInactive: {
    width:           8,
    backgroundColor: '#D0D0D0',
  },
});