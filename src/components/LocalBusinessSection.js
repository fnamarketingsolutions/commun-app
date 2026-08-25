// components/home/LocalBusinessSection.jsx
import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { scaleFont, scaleWidth, scaleHeight, moderateScale } from '../utils/responsive';
import { ROUTES } from '../navigations/routes';
import { useFetchCommunityLocalBusinessesQuery } from '../redux/service/localBusinessMemberApi';
import GradientText from '../components/common/GradientText';

const CARD_SIZE = scaleWidth(70);
const CARD_MARGIN = scaleWidth(15);
const LABEL_HEIGHT = scaleHeight(20);

// Total item height for getItemLayout
const ITEM_HEIGHT = CARD_SIZE + CARD_MARGIN + LABEL_HEIGHT;

const BusinessCard = React.memo(({ business, onPress }) => {
  const categories = (business.businessCategories || []).filter(Boolean);
  const categoryLabel = categories.length > 0 ? categories.join(' · ') : '';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(business)}>
      <View style={styles.imageWrapper}>
        {business.logoUrl ? (
          <Image source={{ uri: business.logoUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Icon name="business" size={scaleFont(24)} color={COLORS.gradientStart} />
          </View>
        )}
        {business.discountActive && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText} maxFontSizeMultiplier={1.3}>
              {business.discountPercentage}% OFF
            </Text>
          </View>
        )}
      </View>

      {categoryLabel ? (
        <Text
          style={styles.categoryLabel}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.3}
        >
          {categoryLabel}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

const LocalBusinessSection = ({ refreshKey }) => {
  const navigation = useNavigation();
  const { data, isLoading, error, refetch } = useFetchCommunityLocalBusinessesQuery({});

  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // ── Filter: only show businesses with an active discount ──
  const discountBusinesses = useMemo(
    () => (data?.businesses || []).filter(b => b.discountActive === true),
    [data?.businesses]
  );

  const topBusinesses = useMemo(
    () => discountBusinesses.slice(0, 10),
    [discountBusinesses]
  );

  const needsCommunity = data?.needsCommunity ?? false;

  const onCardPress = (business) => {
    navigation.navigate(ROUTES.LOCAL_BUSINESS_DETAIL, { businessId: business._id });
  };

  const onViewAll = () => navigation.navigate(ROUTES.ALL_LOCAL_BUSINESSES);

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              Local Business Offers
            </Text>
            <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={1.3}>
              Exclusive discounts in your community
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              Local Business Offers
            </Text>
            <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={1.3}>
              Exclusive discounts in your community
            </Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cloud-offline-outline" size={scaleFont(32)} color={COLORS.textMuted} />
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.3}>
            Unable to load offers
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <GradientText colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.retryText}>
              Retry
            </GradientText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Hide if no community or no discount businesses ──
  if (needsCommunity || topBusinesses.length === 0) {
    return null;
  }

  // ── Render ──
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
            Local Business Offers
          </Text>
          <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={1.3}>
            Exclusive discounts in your community
          </Text>
        </View>
        <TouchableOpacity
          onPress={onViewAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.viewAllButton}
        >
          <GradientText colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.viewAllText}>
            View All
          </GradientText>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={topBusinesses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <BusinessCard business={item} onPress={onCardPress} />}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: {
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleHeight(12),
  },
  headerLeft: {
    flex: 1,
    flexShrink: 1,
    marginRight: scaleWidth(10),
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewAllButton: {
    flexShrink: 0,
    paddingVertical: scaleHeight(4),
  },
  viewAllText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: scaleWidth(20),
    gap: CARD_MARGIN,
  },
  card: {
    alignItems: 'center',
    width: CARD_SIZE,
    marginVertical: scaleHeight(6),
    marginTop: scaleHeight(10),
    overflow: 'visible',
  },
  imageWrapper: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    overflow: 'visible',
    backgroundColor: COLORS.white,
    position: 'relative',
    ...SHADOW.card,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: CARD_SIZE / 2,
    overflow: 'hidden',
  },
  imageFallback: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CARD_SIZE / 2,
  },
  discountBadge: {
    position: 'absolute',
    top: -scaleHeight(6),
    left: -scaleWidth(10),
    backgroundColor: '#1bba87',
    borderRadius: 999,
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(2),
    zIndex: 20,
    elevation: 8,
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.white,
  },
  discountBadgeText: {
    color: COLORS.white,
    fontSize: scaleFont(8),
    fontWeight: '700',
  },
  categoryLabel: {
    fontSize: scaleFont(10),
    color: '#000',
    textAlign: 'center',
    marginTop: scaleHeight(4),
    maxWidth: CARD_SIZE + scaleWidth(6),
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: scaleHeight(20),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scaleHeight(24),
    gap: scaleHeight(8),
  },
  emptyText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginTop: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(6),
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  joinButton: {
    marginTop: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(6),
  },
  joinText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
});

export default LocalBusinessSection;