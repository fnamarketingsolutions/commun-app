// components/common/ProfileSkeleton.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { COLORS, SHADOW } from '../../theme';
import { moderateScale, scaleWidth, scaleHeight } from '../../utils/responsive';

export const ProfileSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={moderateScale(80, 0.3)} height={moderateScale(80, 0.3)} borderRadius={40} />
        <Skeleton width={scaleWidth(160)} height={22} borderRadius={4} style={{ marginTop: scaleHeight(8) }} />
      </View>

      {/* Menu Cards */}
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.menuCard}>
          <Skeleton width={moderateScale(44, 0.3)} height={moderateScale(44, 0.3)} borderRadius={13} />
          <View style={styles.menuTextWrap}>
            <Skeleton width="60%" height={15} borderRadius={4} />
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: scaleHeight(4) }} />
          </View>
          <Skeleton width={scaleWidth(20)} height={20} borderRadius={4} />
        </View>
      ))}

      {/* Version text */}
      <Skeleton width="40%" height={13} borderRadius={4} style={{ alignSelf: 'center', marginTop: scaleHeight(8) }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(40),
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleHeight(24),
    marginTop: scaleHeight(8),
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(16, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(16),
    marginBottom: scaleHeight(12),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  menuTextWrap: {
    flex: 1,
    marginLeft: scaleWidth(14),
    marginRight: scaleWidth(8),
  },
});

export default ProfileSkeleton;