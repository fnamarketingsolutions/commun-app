// components/NetworkAwareView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SPACING, SHADOW, MAX_FONT_SCALE } from '../theme';
import { scaleFont } from '../utils/responsive';

export const NetworkAwareView = ({
  children,
  isOnline,
  showOfflineBanner,
  message = 'You are offline.',
}) => {
  if (!showOfflineBanner) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Icon name="wifi-off" size={scaleFont(18)} color={COLORS.white} style={styles.icon} />
        <Text style={styles.bannerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{message}</Text>
      </LinearGradient>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // 👈 critical – no white/lavender overlay
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...SHADOW.button,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  icon: { marginRight: SPACING.sm },
  bannerText: {
    color: COLORS.white,
    // NW1 FIX: was FONTS.small (raw 12) — now uses scaleFont() for density-aware sizing
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightMedium,
    fontFamily: FONTS.family,
    flex: 1,
  },
});