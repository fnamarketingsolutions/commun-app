// components/LocalitiesSection.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, { Line, Ellipse } from 'react-native-svg';

import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Same data as web LocalitiesSection.jsx ───────────────────────────────────
const ACTIVE_LOCALITY = { name: 'Sainik Farms', top: 70, left: 70 };

const COMING_SOON_LOCALITIES = [
  { name: 'Hauz Khas',       top: 14, left: 30 },
  { name: 'Greater Kailash', top: 28, left: 78 },
  { name: 'Vasant Kunj',     top: 50, left: 12 },
  { name: 'Saket',           top: 46, left: 52 },
];

const GRID_SIZE = 36;

// ─────────────────────────────────────────────────────────────────────────────
const GridBackground = ({ width, height }) => {
  const vLines = Math.ceil(width / GRID_SIZE);
  const hLines = Math.ceil(height / GRID_SIZE);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none">
      {Array.from({ length: vLines }).map((_, i) => (
        <Line
          key={`v-${i}`}
          x1={i * GRID_SIZE}
          y1={0}
          x2={i * GRID_SIZE}
          y2={height}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: hLines }).map((_, i) => (
        <Line
          key={`h-${i}`}
          x1={0}
          y1={i * GRID_SIZE}
          x2={width}
          y2={i * GRID_SIZE}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
};

// ─── Active locality pin ────────────────────────────────────────────────────
const ActivePin = ({ locality }) => (
  <View style={[styles.pinWrap, { top: `${locality.top}%`, left: `${locality.left}%` }]}>
    <View style={styles.activeRingWrap}>
      <Svg width={moderateScale(72, 0.3)} height={moderateScale(64, 0.3)} viewBox="0 0 100 100">
        <Ellipse
          cx="50" cy="50" rx="32" ry="28"
          fill="rgba(217,70,239,0.30)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
        />
      </Svg>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.activeMarker}>
        <Icon name="location" size={scaleFont(16)} color={COLORS.white} />
      </LinearGradient>
    </View>
    <View style={styles.activeLabelWrap}>
      <Text style={styles.activeLabelText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {locality.name}
      </Text>
      <View style={styles.activeStatusRow}>
        <View style={styles.activeDot} />
        <Text style={styles.activeStatusText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Active Now
        </Text>
      </View>
    </View>
  </View>
);

// ─── Coming-soon pin ───────────────────────────────────────────────────────────
const ComingSoonPin = ({ locality }) => (
  <View style={[styles.pinWrap, { top: `${locality.top}%`, left: `${locality.left}%` }]}>
    <View style={styles.comingSoonMarker}>
      <Icon name="location" size={scaleFont(13)} color="#E9D5FF" />
    </View>
    <View style={styles.comingSoonLabelWrap}>
      <Text
        style={styles.comingSoonLabelText}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {locality.name}
      </Text>
      <Text style={styles.comingSoonSubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        Coming Soon
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const LocalitiesSection = ({ onRequestArea }) => {
  const mapWidth  = SCREEN_W - scaleWidth(40) - moderateScale(16, 0.3) * 2;
  const mapHeight = moderateScale(320, 0.3);

  return (
    <View style={styles.section}>
      <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        Available in Delhi
      </Text>
      <Text style={styles.subheading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        Starting with Sainik Farms. More localities coming soon.
      </Text>

      <LinearGradient
        colors={[COLORS.gradientStart, '#9B4FD8', COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>

        <View style={[styles.mapBox, { height: mapHeight }]}>
          <GridBackground width={mapWidth} height={mapHeight} />

          <ActivePin locality={ACTIVE_LOCALITY} />
          {COMING_SOON_LOCALITIES.map((loc) => (
            <ComingSoonPin key={loc.name} locality={loc} />
          ))}

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={styles.legendDotActive} />
              <Text style={styles.legendText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Active
              </Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendRow}>
              <View style={styles.legendDotComingSoon} />
              <Text style={styles.legendText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Coming Soon
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaWrap}>
          <Text style={styles.ctaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Want CommuN in your locality?
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={onRequestArea}>
            <Text style={[styles.ctaBtnText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Request Your Area
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: scaleHeight(22),
  },
  heading: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(6),
  },
  subheading: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(18),
  },

  card: {
    borderRadius: moderateScale(24, 0.3),
    padding: moderateScale(16, 0.3),
    overflow: 'hidden',
  },

  mapBox: {
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: 'rgba(107,70,193,0.35)',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(255,255,255,0.12)',
  },

  pinWrap: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -moderateScale(36, 0.3) }, { translateY: -moderateScale(28, 0.3) }],
  },

  activeRingWrap: {
    width: moderateScale(72, 0.3),
    height: moderateScale(64, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMarker: {
    position: 'absolute',
    width: moderateScale(30, 0.3),
    height: moderateScale(30, 0.3),
    borderRadius: moderateScale(15, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(2, 0.3),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeLabelWrap: {
    marginTop: scaleHeight(2),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: moderateScale(12, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    maxWidth: moderateScale(110, 0.3),
  },
  activeLabelText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
    textAlign: 'center',
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4, 0.3),
    marginTop: scaleHeight(3),
  },
  activeDot: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    borderRadius: moderateScale(3, 0.3),
    backgroundColor: '#F5D0FE',
  },
  activeStatusText: {
    fontSize: scaleFont(9),
    fontWeight: FONTS.weightBold,
    color: '#F5D0FE',
  },

  comingSoonMarker: {
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: 'rgba(216,180,254,0.3)',
    borderWidth: moderateScale(2, 0.3),
    borderColor: 'rgba(216,180,254,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonLabelWrap: {
    marginTop: scaleHeight(4),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(5),
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    minWidth: moderateScale(86, 0.3),
    maxWidth: moderateScale(108, 0.3),
  },
  comingSoonLabelText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightMedium,
    color: '#E9D5FF',
    textAlign: 'center',
  },
  comingSoonSubtext: {
    fontSize: scaleFont(9),
    color: '#D8B4FE',
    marginTop: scaleHeight(1),
  },

  legend: {
    position: 'absolute',
    bottom: scaleHeight(8),
    left: scaleWidth(8),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(255,255,255,0.2)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(5, 0.3),
  },
  legendDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: scaleHeight(4),
  },
  legendDotActive: {
    width: moderateScale(8, 0.3),
    height: moderateScale(8, 0.3),
    borderRadius: moderateScale(4, 0.3),
    backgroundColor: '#EC4899',
  },
  legendDotComingSoon: {
    width: moderateScale(8, 0.3),
    height: moderateScale(8, 0.3),
    borderRadius: moderateScale(4, 0.3),
    backgroundColor: 'rgba(216,180,254,0.4)',
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(216,180,254,0.5)',
  },
  legendText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightMedium,
    color: COLORS.white,
  },

  ctaWrap: {
    alignItems: 'center',
    marginTop: scaleHeight(20),
  },
  ctaText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: scaleHeight(12),
  },
  ctaBtn: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(28),
    paddingVertical: scaleHeight(13),
  },
  ctaBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
  },
});

export default LocalitiesSection;