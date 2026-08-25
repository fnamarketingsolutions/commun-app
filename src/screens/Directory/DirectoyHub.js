import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { isCommunityPending } from '../../utils/communityStatus';
import { getUserCommunityName } from '../../utils/communityHelpers';
import { useCommunityVendorsQuery } from '../../redux/service/api';

// Place these 3 PNGs in ../../assets/icons/ (vendors.png, members.png, emergency.png)
const ICON_VENDORS = require('../../assets/images/vendors.png');
const ICON_MEMBERS = require('../../assets/images/members.png');
const ICON_EMERGENCY = require('../../assets/images/emergency.png');

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const ROW_GAP = moderateScale(14, 0.3);

// ─── Row Item (Full-width horizontal card, white background) ──────────────
const GridItem = ({ iconSource, label, onPress, comingSoon = false, description }) => {
  return (
    <TouchableOpacity
      style={styles.cardWrapper}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={comingSoon}
    >
      <View style={styles.cardInner}>
        <View style={styles.iconCircle}>
          <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
        </View>

        <View style={styles.cardTextWrap}>
          <Text style={styles.cardLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {label}
          </Text>
          {description && (
            <Text style={styles.cardDescription} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {description}
            </Text>
          )}
        </View>

        {comingSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        ) : (
          <Icon name="chevron-forward" size={scaleFont(20)} color={COLORS.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const DirectoryHub = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);
  const shouldShowMissing = !isSecretary && !userCommunityName && !communityPending;

  const { refetch } = useCommunityVendorsQuery(undefined, {
    skip: !userCommunityName,
  });

  const fetchData = useCallback(() => {
    if (isOnline && userCommunityName) {
      refetch();
    }
  }, [isOnline, userCommunityName, refetch]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const goToVendors = () => navigation.navigate('Vendors');
  const goToEmergency = () => navigation.navigate('EmergencyContacts');

  const goToMembers = () => {
    Alert.alert('Coming Soon', 'The Members directory is currently under development. Stay tuned!');
  };

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Directory</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.pendingWrap}>
          <LottieView
            source={require('../../assets/animations/CatTyping.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.pendingTitle}>Waiting for Approval</Text>
          <Text style={styles.pendingMessage}>
            Your community secretary is reviewing your request. The directory will unlock once you're approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── No community ──
  if (shouldShowMissing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Directory</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.communityMissingContainer}>
          <LottieView
            source={require('../../assets/animations/not_found.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.communityMissingTitle}>No Official Community</Text>
          <Text style={styles.communityMissingSubtitle}>
            You are not part of any official community yet. Join one to access the directory.
          </Text>
          <TouchableOpacity
            style={styles.joinCommunityButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText}>Join a Community</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main content (white background) ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Directory</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={!isOnline}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            <GridItem
              iconSource={ICON_VENDORS}
              label="Vendors"
              description="Local businesses"
              onPress={goToVendors}
            />
            <GridItem
              iconSource={ICON_MEMBERS}
              label="Members"
              description="Connect with neighbours"
              onPress={goToMembers}
              comingSoon
            />
            <GridItem
              iconSource={ICON_EMERGENCY}
              label="Emergency"
              description="Critical contacts"
              onPress={goToEmergency}
            />
          </View>
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles – White background ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  headerSpacer: {
    width: scaleWidth(24),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  container: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  list: {
    rowGap: ROW_GAP,
    marginTop: scaleHeight(8),
  },
  cardWrapper: {
    borderRadius: moderateScale(20, 0.3),
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    ...SHADOW.card,
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(12, 0.3),
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(16),
    minHeight: moderateScale(88, 0.3),
  },
  iconCircle: {
    width: moderateScale(54, 0.3),
    height: moderateScale(54, 0.3),
    borderRadius: moderateScale(27, 0.3),
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  iconImage: {
    width: moderateScale(30, 0.3),
    height: moderateScale(30, 0.3),
  },
  cardTextWrap: {
    flex: 1,
  },
  cardLabel: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  cardDescription: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
    marginTop: scaleHeight(2),
  },
  comingSoonBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: moderateScale(12, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
  },
  comingSoonText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Pending ──
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
    backgroundColor: COLORS.white,
  },
  lottie: {
    width: moderateScale(220, 0.3),
    height: moderateScale(220, 0.3),
    marginBottom: scaleHeight(8),
  },
  pendingTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: scaleFont(13.5),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },

  // ── No community ──
  communityMissingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    paddingBottom: scaleHeight(30),
    backgroundColor: COLORS.white,
  },
  lottieAnimation: {
    width: moderateScale(200, 0.3),
    height: moderateScale(200, 0.3),
  },
  communityMissingTitle: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(16),
    textAlign: 'center',
  },
  communityMissingSubtitle: {
    fontSize: scaleFont(16),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scaleHeight(10),
    marginBottom: scaleHeight(30),
    lineHeight: moderateScale(24, 0.3),
  },
  joinCommunityButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    overflow: 'hidden',
    width: '100%',
    maxWidth: scaleWidth(250),
  },
  joinButtonGradient: {
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default DirectoryHub;