// components/CategorySection.jsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, SHADOW } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import GradientText from './common/GradientText';
import { getIoniconName, getIconGradient } from '../utils/categoryIconMap';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Single grid cell ─────────────────────────────────────────────────────
const CategoryGridItem = ({ item, onPress }) => {
  const hasImage = Boolean(item.image?.url);
  const iconName = getIoniconName(item.icon);
  const gradientColors = getIconGradient(item.name || item._id);

  return (
    <TouchableOpacity style={styles.gridItem} activeOpacity={0.8} onPress={onPress}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBg}
      >
        {hasImage ? (
          <Image
            source={{ uri: item.image.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Icon name={iconName} size={scaleFont(20)} color={COLORS.white} />
        )}
      </LinearGradient>
      <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * CategorySection
 * Card-shaped section (same visual language as HomeHeader: white, rounded,
 * elevated) showing a title + "View all" row and a 4-column category grid.
 * Renders at most 8 categories to fill a clean 2-row x 4-column grid.
 */
const CategorySection = ({
  categories = [],
  isLoading = false,
  onCategoryPress,
  onViewAllPress,
  title = 'Categories',
}) => {
  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];
  const displayedCategories = categories.slice(0, 8);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {title}
        </Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <GradientText
            colors={gradientColors}
            style={styles.viewAll}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            View all
          </GradientText>
        </TouchableOpacity>
      </View>

      {isLoading || displayedCategories.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.grid}>
          {displayedCategories.map((item) => (
            <CategoryGridItem
              key={item._id || item.name}
              item={item}
              onPress={() => onCategoryPress?.(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Same card language as HomeHeader: white, rounded, elevated.
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(16),
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  viewAll: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
  },
  loader: {
    height: moderateScale(80, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '25%', // 4 columns
    alignItems: 'center',
    marginBottom: scaleHeight(16),
  },
  iconBg: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(13, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: scaleFont(9.5),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: scaleHeight(4),
    paddingHorizontal: scaleWidth(2),
  },
});

export default CategorySection;