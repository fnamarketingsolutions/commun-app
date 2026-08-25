// components/AppLogo.jsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONTS, LOGO, SPACING } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

// Replace with your actual logo asset path
const LOGO_SOURCE = require('../assets/images/logo.png');

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const AppLogo = () => (
  <View style={styles.wrapper}>
    {/* White rounded container behind logo — now scaled */}
    <View style={styles.logoContainer}>
      <Image
        source={LOGO_SOURCE}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>

    {/* Brand name */}
    <Text style={styles.brandName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      Commun
    </Text>

    {/* Tagline */}
    <Text style={styles.tagline} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      CONNECT. DISCOVER. THRIVE.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: moderateScale(SPACING.lg, 0.3),
  },

  // ── Logo container ──────────────────────────────────────────────────────
  logoContainer: {
    width: moderateScale(LOGO.containerSize, 0.3),
    height: moderateScale(LOGO.containerSize, 0.3),
    borderRadius: moderateScale(LOGO.borderRadius, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(SPACING.sm, 0.3),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(2, 0.2) },
    shadowOpacity: 0.10,
    shadowRadius: moderateScale(8, 0.2),
    elevation: 4,
  },

  logoImage: {
    width: moderateScale(LOGO.size, 0.3),
    height: moderateScale(LOGO.size, 0.3),
  },

  // ── Brand name ──────────────────────────────────────────────────────────
  brandName: {
    fontSize: scaleFont(FONTS.brandName),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    fontFamily: FONTS.family, // undefined = system; swap when font loaded
    letterSpacing: moderateScale(0.5, 0.1),
  },

  // ── Tagline ─────────────────────────────────────────────────────────────
  tagline: {
    fontSize: scaleFont(FONTS.tagline),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family,
    letterSpacing: moderateScale(2, 0.1),
    marginTop: moderateScale(2, 0.2),
  },
});

export default AppLogo;