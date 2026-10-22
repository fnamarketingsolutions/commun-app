// components/CategorySection.jsx
// CA1 FIX: gridItem width adapts from 25% (4-col phones) to 16.66% (6-col tablets).
// CA2:     Icon size scales up on tablet for better visual weight.
// CA3:     Label fontSize has a 10pt minimum on small devices.
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, SHADOW, MAX_FONT_SCALE } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import GradientText from './common/GradientText';
import { getIoniconName, getIconGradient } from '../utils/categoryIconMap';
import { BREAKPOINTS } from '../utils/breakpoints';

// ─── Single grid cell ─────────────────────────────────────────────────────
const CategoryGridItem = ({ item, onPress, isTablet, isSmall }) => {
  const hasImage      = Boolean(item.image?.url);
  const iconName      = getIoniconName(item.icon);
  const gradientColors = getIconGradient(item.name || item._id);

  // CA2: Icon container size — larger on tablet
  const iconContainerSize = isTablet
    ? moderateScale(56, 0.3)
    : moderateScale(48, 0.3);

  // CA2: Icon glyph size scales with container
  const iconGlyphSize = isTablet ? scaleFont(24) : scaleFont(20);

  // CA3: Label font size — minimum 10 on small devices
  const labelSize = isSmall
    ? Math.max(scaleFont(9.5), 10)
    : isTablet
    ? scaleFont(11)
    : scaleFont(9.5);

  return (
    <TouchableOpacity
      style={[
        styles.gridItem,
        // CA1: 6 columns on tablet, 4 columns on phone
        { width: isTablet ? '16.66%' : '25%' },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.iconBg,
          {
            width: iconContainerSize,
            height: iconContainerSize,
            borderRadius: moderateScale(isTablet ? 16 : 13, 0.3),
          },
        ]}
      >
        {hasImage ? (
          <Image
            source={{ uri: item.image.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Icon name={iconName} size={iconGlyphSize} color={COLORS.white} />
        )}
      </LinearGradient>
      <Text
        style={[styles.label, { fontSize: labelSize }]}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * CategorySection
 * Card-shaped section (same visual language as HomeHeader: white, rounded,
 * elevated) showing a title + "View all" row and a category grid.
 * • 4 columns on phones (8 categories max → 2 rows)
 * • 6 columns on tablets (12 categories max → 2 rows)
 */
const CategorySection = ({
  categories = [],
  isLoading = false,
  onCategoryPress,
  onViewAllPress,
  title = 'Categories',
}) => {
  const { width } = useWindowDimensions();
  const isTablet  = width >= BREAKPOINTS.TABLET;
  const isSmall   = width < BREAKPOINTS.SMALL;

  // CA1: tablet shows 12 items (2 rows × 6 cols), phone shows 8 (2 rows × 4 cols)
  const maxItems = isTablet ? 12 : 8;
  const displayedCategories = categories.slice(0, maxItems);

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <GradientText
            colors={gradientColors}
            style={styles.viewAll}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
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
              isTablet={isTablet}
              isSmall={isSmall}
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
  // gridItem width is set inline per device class (see CategoryGridItem)
  gridItem: {
    alignItems: 'center',
    marginBottom: scaleHeight(16),
  },
  iconBg: {
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
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: scaleHeight(4),
    paddingHorizontal: scaleWidth(2),
  },
});

export default CategorySection;