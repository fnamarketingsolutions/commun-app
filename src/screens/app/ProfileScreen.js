// screens/app/ProfileScreen.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { ROUTES } from '../../navigations/routes';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useFetchAllProvidersQuery } from '../../redux/service/providerApi';
import { useCheckAuthQuery } from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import ProfileSkeleton from '../../components/common/ProfileSkeleton';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
};

const Avatar = ({ firstName, lastName, profileImage, size = 80 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);
  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.initialsAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
    >
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

const MenuCard = ({ icon, label, subtitle, onPress, rightElement }) => (
  <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.menuIconWrap}>{icon}</View>
    <View style={styles.menuTextWrap}>
      <Text style={styles.menuLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{label}</Text>
      <Text style={styles.menuSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{subtitle}</Text>
    </View>
    {rightElement ?? <Icon name="chevron-forward" size={scaleFont(20)} color={COLORS.textMuted} />}
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { user, isLoading: loading } = useSelector(state => state.auth);
  const wishlistIds = useSelector((state) => state.wishlist.ids);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data: providers = [],
    isLoading: isLoadingProviders,
    isFetching: isFetchingProviders,
    refetch: refetchProviders,
  } = useFetchAllProvidersQuery();

  const { refetch: refetchUser, isFetching: isFetchingUser } = useCheckAuthQuery();

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchUser();
        refetchProviders();
      }
    }, [isOnline, refetchUser, refetchProviders])
  );

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchUser();
          refetchProviders();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchUser, refetchProviders]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchUser();
    refetchProviders();
    lastFetchTime.current = Date.now();
  }, [refetchUser, refetchProviders, isOnline]);

  // ── User type flags ────────────────────────────────────────────────────────
  const isPublicMember = useMemo(() => Boolean(user?.isPublicMember), [user]);

  // ── canBecomeProvider:
  // - Public members (isPublicMember=true): approved and role is customer → can apply
  // - Official community members: approved + has community + role is customer → can apply
  // - Anyone already a provider or secretary → handled separately
  const canBecomeProvider = useMemo(() => {
    if (!user) return false;
    if (user.role === 'provider' || user.role === 'secretary') return false;
    const isApproved = user.accountStatus === 'approved';
    if (!isApproved) return false;
    // Public members are approved by default at signup — allow them
    if (isPublicMember) return true;
    // Official community members need a valid community
    return Boolean(user.communityCommunName && user.communityCommunName !== '__other__');
  }, [user, isPublicMember]);

  const isProviderPending = user?.role === 'provider' && user?.accountStatus === 'pending';
  const isProviderApproved = user?.role === 'provider' && user?.accountStatus === 'approved';

  // ── Show skeleton while auth loading ──
  if (loading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  const avatarUri = user.profileImage || null;
  const role = user?.role || '';
  const isPending = user.accountStatus === 'pending';

  const savedCount = wishlistIds.length;

  const getRoleCard = () => {
    // Provider approved
    if (role === 'provider' && isProviderApproved) {
      return {
        icon: <MaterialIcon name="view-dashboard-outline" size={scaleFont(22)} color={COLORS.gradientStart} />,
        label: 'Provider Dashboard',
        subtitle: 'Manage your services & bookings',
        onPress: () => navigation.navigate(ROUTES.PROVIDER_DASHBOARD_HUB),
      };
    }

    // Provider pending
    if (role === 'provider' && isProviderPending) {
      return {
        icon: <MaterialIcon name="clock-outline" size={scaleFont(22)} color="#D97706" />,
        label: 'Provider Application Pending',
        subtitle: 'Waiting for secretary approval',
        onPress: () => navigation.navigate(ROUTES.PENDING),
        rightElement: (
          <View style={[styles.providerBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.providerBadgeText, { color: '#B45309' }]}>Pending</Text>
          </View>
        ),
      };
    }

    // Secretary
    if (role === 'secretary') {
      return {
        icon: <MaterialIcon name="clipboard-account-outline" size={scaleFont(22)} color={COLORS.gradientStart} />,
        label: 'Secretary Dashboard',
        subtitle: 'Manage community & providers',
        onPress: () => navigation.navigate(ROUTES.COMMUNITY_MANAGEMENT),
      };
    }

    // Customer — determine what happens on press
    let subtitle = 'Share your skills & start earning';
    let onPressHandler;
    let rightElement = null;

    if (canBecomeProvider) {
      // Both public members and approved community members
      subtitle = isPublicMember
        ? 'Share your skills — no approval needed'
        : 'Share your skills & start earning';
      onPressHandler = () => navigation.navigate(ROUTES.BECOME_PROVIDER);
      rightElement = (
        <View style={styles.providerBadge}>
          <Text style={[styles.providerBadgeText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            New
          </Text>
        </View>
      );
    } else if (isPending) {
      // Official community member pending secretary approval
      subtitle = 'Waiting for secretary approval';
      onPressHandler = () => Alert.alert(
        'Pending Approval',
        'Your community join request is pending approval. Please wait for the secretary to approve your membership before applying as a provider.',
        [{ text: 'OK' }]
      );
    } else {
      // Edge case — no community, not public, not pending
      subtitle = 'Join a community first';
      onPressHandler = () => Alert.alert(
        'Join a Community First',
        'You need to join a Commun community before you can become a provider.',
        [{ text: 'OK', onPress: () => navigation.navigate('EditProfile') }]
      );
    }

    return { icon: <MaterialIcon name="rocket-launch-outline" size={scaleFont(22)} color={COLORS.gradientStart} />, label: 'Become a Provider', subtitle, onPress: onPressHandler, rightElement };
  };

  const roleCard = getRoleCard();

  const showOfflineBanner = !isOnline;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={(isFetchingProviders || isFetchingUser) && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.profileHeader}>
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              profileImage={avatarUri}
              size={80}
            />
            <Text style={styles.userName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {fullName}
            </Text>
          </View>

          <MenuCard
            icon={<Icon name="heart" size={scaleFont(22)} color={COLORS.gradientStart} />}
            label="Wishlist"
            subtitle={`${savedCount} item${savedCount === 1 ? '' : 's'} Wishlist`}
            onPress={() => navigation.navigate(ROUTES.SAVED_SERVICES)}
          />

          <MenuCard
            icon={<Icon name="settings-outline" size={scaleFont(22)} color={COLORS.gradientStart} />}
            label="Settings"
            subtitle="Privacy, Notifications"
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
          />

          <MenuCard
            icon={roleCard.icon}
            label={roleCard.label}
            subtitle={roleCard.subtitle}
            onPress={roleCard.onPress}
            rightElement={roleCard.rightElement}
          />

          <Text style={styles.versionText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Commun Version 1.0.0
          </Text>
          <View style={{ height: moderateScale(32, 0.3) }} />
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(40),
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: scaleHeight(24),
    marginTop: scaleHeight(8),
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  avatar: {
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  userName: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(8),
    textAlign: 'center',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(16),
    marginBottom: scaleHeight(12),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  menuIconWrap: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(13, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  menuTextWrap: { flex: 1 },
  menuLabel: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  menuSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightRegular,
  },
  providerBadge: {
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    marginRight: scaleWidth(4),
  },
  providerBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  versionText: {
    textAlign: 'center',
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(4),
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: scaleFont(16), color: COLORS.textMuted },
});

export default ProfileScreen;