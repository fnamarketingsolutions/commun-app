// components/RankListRow.jsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * RankListRow — one row for ranks 4-10 (or any rank you pass).
 * `isMe` highlights the row when this is the logged-in provider's own entry.
 */
const RankListRow = ({ provider, rank, isMe = false, onPress }) => {
  const hasAvatar = Boolean(provider.avatar);
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

  return (
    <Wrapper style={[styles.row, isMe && styles.rowMe]} {...wrapperProps}>
      <Text style={[styles.rank, isMe && styles.rankMe]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {String(rank).padStart(2, '0')}
      </Text>

      {hasAvatar ? (
        <Image source={{ uri: provider.avatar }} style={styles.avatar} />
      ) : (
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatar, styles.initialsAvatar]}
        >
          <Text style={styles.initialsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {getInitials(provider.name)}
          </Text>
        </LinearGradient>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {provider.name || 'Provider'}
          {isMe ? ' (You)' : ''}
        </Text>
      </View>

      <View style={styles.pointsPill}>
        <Icon name="briefcase-outline" size={scaleFont(12)} color={COLORS.gradientStart} />
        <Text style={styles.pointsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {provider.serviceCount ?? 0} {provider.serviceCount === 1 ? 'service' : 'services'}
        </Text>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(10),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  rowMe: {
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(12, 0.3),
    borderBottomWidth: 0,
    paddingHorizontal: scaleWidth(8),
  },
  rank: {
    width: moderateScale(26, 0.3),
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
  },
  rankMe: {
    color: COLORS.gradientStart,
  },
  avatar: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: COLORS.inputBg,
    marginRight: scaleWidth(10),
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    fontSize: scaleFont(13),
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: scaleFont(13.5),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  subLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(1),
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(3),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(999, 0.3),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
  },
  pointsText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
});

export default RankListRow;