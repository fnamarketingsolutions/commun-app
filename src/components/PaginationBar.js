import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

// ── Builds the list of page numbers/ellipses to render ──
// Always shows: first page, last page, current-1, current, current+1.
// Collapses any gap into a single '...' marker.
const buildPageItems = (current, total) => {
  if (total <= 1) return [1];

  const items = [];
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  let prev = null;
  sorted.forEach(p => {
    if (prev !== null && p - prev > 1) {
      items.push(`ellipsis-${p}`);
    }
    items.push(p);
    prev = p;
  });

  return items;
};

const PaginationBar = ({ currentPage, totalPages, onPageChange }) => {
  const items = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const goPrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };
  const goNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.arrowBtn, currentPage === 1 && styles.arrowBtnDisabled]}
        onPress={goPrev}
        disabled={currentPage === 1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="chevron-back" size={scaleFont(18)} color={currentPage === 1 ? COLORS.textMuted : COLORS.textPrimary} />
      </TouchableOpacity>

      {items.map((item) =>
        typeof item === 'number' ? (
          <TouchableOpacity
            key={item}
            style={[styles.pageBtn, item === currentPage && styles.pageBtnActive]}
            onPress={() => onPageChange(item)}
          >
            <Text
              style={[styles.pageText, item === currentPage && styles.pageTextActive]}
              maxFontSizeMultiplier={1.3}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text key={item} style={styles.ellipsis} maxFontSizeMultiplier={1.3}>
            ...
          </Text>
        )
      )}

      <TouchableOpacity
        style={[styles.arrowBtn, currentPage === totalPages && styles.arrowBtnDisabled]}
        onPress={goNext}
        disabled={currentPage === totalPages}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="chevron-forward" size={scaleFont(18)} color={currentPage === totalPages ? COLORS.textMuted : COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(14),
    gap: scaleWidth(6),
  },
  arrowBtn: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  pageBtn: {
    minWidth: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(4),
  },
  pageBtnActive: {
    backgroundColor: COLORS.primary,
  },
  pageText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  pageTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
  },
  ellipsis: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    paddingHorizontal: scaleWidth(2),
  },
});

export default PaginationBar;