// src/components/EventAttachmentList.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const getIconForType = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  return 'attach-outline';
};

const getFileName = (url = '') => {
  const parts = url.split('/');
  return parts[parts.length - 1] || 'Attachment';
};

const EventAttachmentList = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  const handleOpen = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      {attachments.map((att, idx) => (
        <TouchableOpacity
          key={att.url || idx}
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => handleOpen(att.url)}
        >
          <View style={styles.iconCircle}>
            <Icon name={getIconForType(att.mimeType)} size={scaleFont(16)} color={COLORS.gradientStart} />
          </View>
          <Text style={styles.fileName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {getFileName(att.url)}
          </Text>
          <Icon name="open-outline" size={scaleFont(14)} color={COLORS.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: scaleHeight(10),
    gap: scaleHeight(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(10),
    gap: scaleWidth(8),
  },
  iconCircle: {
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightMedium,
  },
});

export default EventAttachmentList;