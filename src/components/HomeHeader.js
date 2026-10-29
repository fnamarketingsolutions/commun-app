import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import { ROUTES } from '../navigations/routes';
import { useGetInboxCountsQuery } from '../redux/service/api';
import LocationEditModal from './LocationEditModal';

const HomeHeader = () => {
  const navigation = useNavigation();
  const user        = useSelector((state) => state.auth.user);

  // ── Unread notification count (Synced with Server & Fallback) ───────────
  const { data: inboxCountsData } = useGetInboxCountsQuery(undefined, {
    pollingInterval: 15000,
  });
  const serverCounts = inboxCountsData?.data?.counts;
  const serverTotalUnread = serverCounts
    ? Object.values(serverCounts).reduce((total, count) => total + Number(count || 0), 0)
    : null;

  const localUnreadCount = useSelector(
    (state) => state.notifications.items.filter((n) => !n.isRead).length
  );

  const unreadCount = serverTotalUnread !== null ? serverTotalUnread : localUnreadCount;
  const badgeCount = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  // ── Location edit modal ────────────────────────────────────────────────
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // ── Location display ───────────────────────────────────────────────────
  const flatNumber = user?.flatNumber || '';

  const addressParts = [];
  if (user?.addressLine1) addressParts.push(user.addressLine1);
  if (user?.addressLine2) addressParts.push(user.addressLine2);

  const locationParts = [];
  if (user?.city)  locationParts.push(user.city);
  if (user?.state) locationParts.push(user.state);
  if (user?.zip)   locationParts.push(user.zip);

  const addressLine  = addressParts.join(', ');
  const locationLine = locationParts.join(', ');
  const fullAddress  = [addressLine, locationLine].filter(Boolean).join(', ');

  const communityName = user?.communityCommunName || user?.requestedCommunityName || user?.communName || '';
  const hasLocationData = flatNumber || fullAddress || communityName;

  // ── Avatar ─────────────────────────────────────────────────────────────
  const avatarUri = user?.profileImage || 'https://via.placeholder.com/150';
  const initials  = (() => {
    const first = user?.firstName?.charAt(0) || '';
    const last  = user?.lastName?.charAt(0)  || '';
    return (first + last).toUpperCase() || '?';
  })();

  return (
    <View style={styles.outer}>
      <View style={styles.card}>

        {/* Left: Profile image */}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => navigation.navigate(ROUTES.PROFILE)}
          activeOpacity={0.7}
        >
          {user?.profileImage ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, styles.initialsAvatar]}
            >
              <Text style={styles.initialsText} maxFontSizeMultiplier={1.3}>
                {initials}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Center: Location */}
        <TouchableOpacity
          style={styles.locationWrap}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locationTextWrap}>
            {hasLocationData ? (
              <>
                {flatNumber ? (
                  <Text style={styles.locationLine1} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {flatNumber}
                  </Text>
                ) : null}
                {fullAddress ? (
                  <Text style={styles.locationLine2} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {fullAddress}
                  </Text>
                ) : null}
                {communityName ? (
                  <Text style={styles.locationLine3} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {communityName}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.locationLine1} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                Set your location
              </Text>
            )}
          </View>
          <Icon
            name="chevron-down"
            size={scaleFont(14)}
            color={COLORS.textMuted}
            style={styles.locationChevron}
          />
        </TouchableOpacity>

        {/* Right: Notification + Search + Settings */}
        <View style={styles.iconGroup}>

          {/* Notification bell with badge */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="notifications-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
            {badgeCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
                  {badgeCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate(ROUTES.SERVICES)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="search-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="settings-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
          </TouchableOpacity>
        </View>
      </View>

      <LocationEditModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(10),
    backgroundColor: 'transparent',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(14, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(6) },
    elevation: 6,
  },
  avatarWrap: {
    marginRight: scaleWidth(10),
  },
  avatar: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    borderRadius: moderateScale(20, 0.3),
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    fontSize: scaleFont(15),
  },
  locationWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scaleWidth(8),
  },
  locationTextWrap: {
    flex: 1,
  },
  locationChevron: {
    marginLeft: scaleWidth(4),
  },
  locationLine1: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  locationLine2: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(2),
  },
  locationLine3: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(2),
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  iconBtn: {
    width: moderateScale(32, 0.3),
    height: moderateScale(34, 0.3),
    borderRadius: moderateScale(17, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: moderateScale(-4, 0.3),
    right: moderateScale(-4, 0.3),
    minWidth: moderateScale(16, 0.3),
    height: moderateScale(16, 0.3),
    borderRadius: moderateScale(8, 0.3),
    backgroundColor: COLORS.gradientEnd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(3, 0.3),
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: {
    fontSize: scaleFont(9),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    lineHeight: scaleFont(10),
  },
});

export default HomeHeader;