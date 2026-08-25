// components/NetworkAwareView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SPACING, SHADOW } from '../theme';

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
        <Icon name="wifi-off" size={18} color={COLORS.white} style={styles.icon} />
        <Text style={styles.bannerText}>{message}</Text>
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
    fontSize: FONTS.small,
    fontWeight: FONTS.weightMedium,
    fontFamily: FONTS.family,
    flex: 1,
  },
});