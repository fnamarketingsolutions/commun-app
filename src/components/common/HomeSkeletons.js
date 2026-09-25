// components/common/HomeSkeletons.jsx
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Skeleton from './Skeleton';
import { COLORS, SHADOW } from '../../theme';
import { moderateScale, scaleWidth, scaleHeight } from '../../utils/responsive';

// A5 FIX: All static dimension constants removed.
// Each skeleton component now calls useWindowDimensions() for reactive values.

// ── Banner Carousel Skeleton ────────────────────────────────────────────────
export const BannerCarouselSkeleton = () => {
  const { width } = useWindowDimensions();
  const BANNER_HEIGHT = moderateScale(200, 0.3);
  return (
    <View style={styles.bannerWrapper}>
      <View style={styles.bannerSlide}>
        <Skeleton width="100%" height={BANNER_HEIGHT} borderRadius={20} />
      </View>
      <View style={styles.bannerDots}>
        {[1, 2, 3].map((_, i) => (
          <Skeleton
            key={i}
            width={i === 0 ? moderateScale(16, 0.3) : moderateScale(6, 0.3)}
            height={moderateScale(6, 0.3)}
            borderRadius={4}
            style={{ marginHorizontal: moderateScale(3, 0.3) }}
          />
        ))}
      </View>
    </View>
  );
};

// ── Category Section Skeleton ──────────────────────────────────────────────
export const CategorySectionSkeleton = () => {
  const items = new Array(8).fill(null);
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <Skeleton width={scaleWidth(90)} height={17} borderRadius={4} />
        <Skeleton width={scaleWidth(48)} height={12} borderRadius={4} />
      </View>
      <View style={styles.categoryGrid}>
        {items.map((_, i) => (
          <View key={i} style={styles.categoryGridItem}>
            <Skeleton width={moderateScale(48, 0.3)} height={48} borderRadius={13} />
            <Skeleton width={scaleWidth(40)} height={9} borderRadius={3} style={{ marginTop: scaleHeight(6) }} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Top Providers Podium Skeleton ──────────────────────────────────────────
export const TopProvidersPodiumSkeleton = () => {
  return (
    <View style={styles.podiumCard}>
      <View style={styles.podiumRow}>
        <PodiumColumn height={70} avatarSize={52} />
        <PodiumColumn height={92} avatarSize={64} />
        <PodiumColumn height={58} avatarSize={48} />
      </View>
    </View>
  );
};

const PodiumColumn = ({ height, avatarSize }) => (
  <View style={styles.podiumColumn}>
    <Skeleton width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
    <Skeleton width={scaleWidth(56)} height={10} borderRadius={3} style={{ marginTop: scaleHeight(8) }} />
    <View style={[styles.podiumBar, { height: scaleHeight(height) }]} />
  </View>
);

// ── Featured Services Skeleton ─────────────────────────────────────────────
export const FeaturedServicesSkeleton = () => {
  const cards = new Array(3).fill(null);
  return (
    <View style={styles.featuredRow}>
      {cards.map((_, i) => (
        <View key={i} style={styles.featuredCard}>
          <Skeleton width="100%" height={110} borderRadius={16} />
          <Skeleton width="80%" height={13} borderRadius={4} style={{ marginTop: scaleHeight(10) }} />
          <Skeleton width="55%" height={11} borderRadius={4} style={{ marginTop: scaleHeight(6) }} />
        </View>
      ))}
    </View>
  );
};

// ── Recent Services Skeleton ───────────────────────────────────────────────
export const RecentServicesSkeleton = () => {
  const rows = new Array(3).fill(null);
  return (
    <View>
      {rows.map((_, i) => (
        <View key={i} style={styles.recentRow}>
          <Skeleton width={moderateScale(72, 0.3)} height={72} borderRadius={14} />
          <View style={styles.recentTextWrap}>
            <Skeleton width="70%" height={14} borderRadius={4} />
            <Skeleton width="45%" height={11} borderRadius={4} style={{ marginTop: scaleHeight(8) }} />
            <Skeleton width="30%" height={11} borderRadius={4} style={{ marginTop: scaleHeight(8) }} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── Services Grid Skeleton ────────────────────────────────────────────────
export const ServicesGridSkeleton = () => {
  const items = new Array(6).fill(null); // 3 rows x 2 columns
  // A5 FIX: Reactive GRID_WIDTH
  const { width } = useWindowDimensions();
  const GRID_WIDTH = (width - moderateScale(52, 0.3)) / 2;
  return (
    <View style={styles.servicesGrid}>
      {items.map((_, i) => (
        <View key={i} style={[styles.servicesGridItem, { width: GRID_WIDTH }]}>
          <Skeleton width="100%" height={140} borderRadius={18} />
          <Skeleton width="80%" height={13} borderRadius={4} style={{ marginTop: scaleHeight(10) }} />
          <Skeleton width="50%" height={11} borderRadius={4} style={{ marginTop: scaleHeight(6) }} />
          <Skeleton width="30%" height={10} borderRadius={4} style={{ marginTop: scaleHeight(6) }} />
        </View>
      ))}
    </View>
  );
};


const styles = StyleSheet.create({
  // Banner skeleton
  bannerWrapper: {
    marginBottom: scaleHeight(12),
    paddingHorizontal: scaleWidth(18),
  },
  // A5 FIX: Inline width so it reacts to orientation
  bannerSlide: {
    borderRadius: moderateScale(20, 0.3),
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scaleHeight(10),
  },

  // Category section
  categoryCard: {
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(16),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryGridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: scaleHeight(16),
  },

  // Podium
  podiumCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingTop: scaleHeight(20),
    paddingBottom: scaleHeight(10),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: scaleWidth(16),
  },
  podiumColumn: {
    alignItems: 'center',
  },
  podiumBar: {
    width: scaleWidth(64),
    backgroundColor: COLORS.inputBg,
    borderTopLeftRadius: moderateScale(10, 0.3),
    borderTopRightRadius: moderateScale(10, 0.3),
    marginTop: scaleHeight(10),
  },

  // Featured
  featuredRow: {
    flexDirection: 'row',
    gap: scaleWidth(12),
  },
  featuredCard: {
    width: scaleWidth(150),
  },

  // Recent
  recentRow: {
    flexDirection: 'row',
    marginBottom: scaleHeight(14),
  },
  recentTextWrap: {
    flex: 1,
    marginLeft: scaleWidth(12),
    justifyContent: 'center',
  },

  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  servicesGridItem: {
    marginBottom: scaleHeight(16),
  },
});