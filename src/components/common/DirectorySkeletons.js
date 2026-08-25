// components/common/DirectorySkeletons.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { COLORS, SHADOW } from '../../theme';
import { moderateScale, scaleWidth, scaleHeight } from '../../utils/responsive';

/**
 * MemberCardSkeleton
 * Mirrors DirectoryScreen's MemberCard: avatar circle, name + role lines,
 * and a couple of small action-icon placeholders on the right.
 */
export const MemberCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton width={moderateScale(48, 0.3)} height={48} borderRadius={24} style={styles.avatar} />
    <View style={styles.textWrap}>
      <Skeleton width="60%" height={14} borderRadius={4} />
      <Skeleton width="35%" height={11} borderRadius={4} style={{ marginTop: scaleHeight(8) }} />
    </View>
    <View style={styles.actions}>
      <Skeleton width={moderateScale(36, 0.3)} height={36} borderRadius={18} />
      <Skeleton width={moderateScale(36, 0.3)} height={36} borderRadius={18} style={{ marginLeft: scaleWidth(6) }} />
    </View>
  </View>
);

/**
 * DirectoryListSkeleton
 * A full-screen stand-in for the members FlatList while the first page
 * of data is loading — a stack of MemberCardSkeleton rows.
 */
export const DirectoryListSkeleton = ({ count = 8 }) => {
  const rows = new Array(count).fill(null);
  return (
    <View style={styles.list}>
      {rows.map((_, i) => (
        <View key={i} style={i > 0 && styles.rowSpacing}>
          <MemberCardSkeleton />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  rowSpacing: {
    marginTop: scaleHeight(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(14, 0.3),
    padding: moderateScale(12, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 1,
  },
  avatar: {
    marginRight: scaleWidth(12),
  },
  textWrap: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});