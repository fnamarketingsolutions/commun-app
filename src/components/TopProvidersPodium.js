// components/TopProvidersPodium.jsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS, MAX_FONT_SCALE } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import { BREAKPOINTS } from '../utils/breakpoints';

// MAX_FONT_SIZE_MULTIPLIER sourced from theme (TP: removes per-file re-declaration)
const MAX_FONT_SIZE_MULTIPLIER = MAX_FONT_SCALE;

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// ─── Empty placeholder slot ───────────────────────────────────────────────────
const EmptySlot = ({ rank, size, slotWidth }) => (
  <View style={[styles.slot, slotWidth ? { width: slotWidth } : null]}>
    <View
      style={[
        styles.avatarRing,
        styles.avatarRingEmpty,
        {
          width: size + moderateScale(6, 0.3),
          height: size + moderateScale(6, 0.3),
          borderRadius: (size + moderateScale(6, 0.3)) / 2,
        },
        rank === 1 && styles.avatarRingGold,
      ]}
    >
      <View
        style={[
          styles.emptyAvatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Icon name="account-outline" size={size * 0.45} color={COLORS.textMuted} />
      </View>

      <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeGold, styles.rankBadgeEmpty]}>
        <Text style={styles.rankBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {rank}
        </Text>
      </View>
    </View>

    <Text style={styles.emptyName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      Spot #{rank}
    </Text>
    <Text style={styles.emptyLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      Not claimed yet
    </Text>
  </View>
);

// ─── One podium slot (rank 1, 2, or 3) ───────────────────────────────────────
const PodiumSlot = ({ provider, rank, size, onPress, slotWidth }) => {
  if (!provider) return <EmptySlot rank={rank} size={size} slotWidth={slotWidth} />;

  const hasAvatar = Boolean(provider.avatar);
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress: () => onPress(provider), activeOpacity: 0.8 } : {};

  return (
    <Wrapper style={[styles.slot, slotWidth ? { width: slotWidth } : null]} {...wrapperProps}>
      {rank === 1 && (
        <LottieView
          source={require('../assets/animations/Crown_Drop.json')}
          autoPlay
          loop
          style={styles.crownLottie}
        />
      )}

      <View
        style={[
          styles.avatarRing,
          {
            width: size + moderateScale(6, 0.3),
            height: size + moderateScale(6, 0.3),
            borderRadius: (size + moderateScale(6, 0.3)) / 2,
          },
          rank === 1 && styles.avatarRingGold,
        ]}
      >
        {hasAvatar ? (
          <Image
            source={{ uri: provider.avatar }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.initialsAvatar, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <Text style={styles.initialsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {getInitials(provider.name)}
            </Text>
          </LinearGradient>
        )}

        <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeGold]}>
          <Text style={styles.rankBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {rank}
          </Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {provider.name || 'Provider'}
      </Text>
    </Wrapper>
  );
};

/**
 * TopProvidersPodium
 * Renders ranks 1–3 side by side (2nd, 1st, 3rd order) with rank #1 elevated
 * and larger. Expects `providers` already sorted best-first (index 0 = rank 1).
 * Empty slots (< 3 providers) show a "Not claimed yet" placeholder.
 * `onProviderPress(provider)` fires when any filled slot is tapped (optional).
 */
const TopProvidersPodium = ({ providers = [], onProviderPress }) => {
  const [first, second, third] = providers;
  // TP1-TP3: Reactive avatar sizes — tablets get larger avatars for better visual impact
  const { width } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.TABLET;

  const rank1Size = isTablet ? moderateScale(96, 0.3) : moderateScale(76, 0.3);
  const rank2Size = isTablet ? moderateScale(72, 0.3) : moderateScale(56, 0.3);
  const rank3Size = isTablet ? moderateScale(72, 0.3) : moderateScale(56, 0.3);
  // TP1: Slot width — slightly narrower on tablet for better proportions
  const slotWidth = isTablet ? '28%' : '32%';

  return (
    <View style={styles.row}>
      <PodiumSlot provider={second} rank={2} size={rank2Size} onPress={onProviderPress} slotWidth={slotWidth} />
      <PodiumSlot provider={first}  rank={1} size={rank1Size} onPress={onProviderPress} slotWidth={slotWidth} />
      <PodiumSlot provider={third}  rank={3} size={rank3Size} onPress={onProviderPress} slotWidth={slotWidth} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(14),
  },
  slot: {
    alignItems: 'center',
    width: '32%',
  },
  crownLottie: {
    width: moderateScale(58, 0.6),
    height: moderateScale(58, 0.6),
    marginBottom: -scaleHeight(4),
  },

  // ── Filled slot ──
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.border,
  },
  avatarRingGold: {
    borderColor: '#F4B400',
  },

  // ── Empty slot ──
  avatarRingEmpty: {
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  emptyAvatarInner: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeEmpty: {
    opacity: 0.5,
  },
  emptyName: {
    marginTop: scaleHeight(10),
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyLabel: {
    fontSize: scaleFont(10),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scaleHeight(2),
  },

  // ── Shared ──
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    fontSize: scaleFont(16),
  },
  rankBadge: {
    position: 'absolute',
    bottom: -scaleHeight(4),
    alignSelf: 'center',
    minWidth: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(4),
    backgroundColor: COLORS.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.white,
  },
  rankBadgeGold: {
    backgroundColor: '#F4B400',
  },
  rankBadgeText: {
    color: COLORS.white,
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
  },
  name: {
    marginTop: scaleHeight(12),
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    maxWidth: '100%',
  },
});

export default TopProvidersPodium;