// components/common/CommunityHubSkeletons.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleWidth, scaleHeight } from '../../utils/responsive';

export const PanelCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton width={moderateScale(52, 0.3)} height={52} borderRadius={26} style={styles.iconCircle} />
    <View style={styles.textWrap}>
      <Skeleton width="55%" height={17} borderRadius={4} />
      <Skeleton width="80%" height={13} borderRadius={4} style={{ marginTop: scaleHeight(8) }} />
    </View>
    <Skeleton width={moderateScale(20, 0.3)} height={20} borderRadius={4} />
  </View>
);


export const CommunityHubSkeleton = ({ count = 5 }) => {
  const rows = new Array(count).fill(null);
  return (
    <View style={styles.wrap}>
      <Skeleton width="90%" height={16} borderRadius={4} />
      <Skeleton width="60%" height={16} borderRadius={4} style={{ marginTop: scaleHeight(8), marginBottom: scaleHeight(24) }} />
      {rows.map((_, i) => (
        <View key={i} style={i > 0 && styles.rowSpacing}>
          <PanelCardSkeleton />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  rowSpacing: {
    marginTop: scaleHeight(16),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  iconCircle: {
    marginRight: scaleWidth(16),
  },
  textWrap: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
});