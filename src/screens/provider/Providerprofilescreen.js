// screens/provider/ProviderProfileScreen.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ServiceRowCard } from '../../components/SharedCards';
import { ROUTES } from '../../navigations/routes';
import {
  useFetchProviderByIdQuery,
  useIncrementProviderProfileCountMutation,
} from '../../redux/service/providerApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import GradientText from '../../components/common/GradientText';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Get initials ────────────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return '?';
};

// ─── Map a ServiceOffering → shape ServiceRowCard expects ─────────────────────
const mapService = (s) => ({
  id:          s._id,
  title:       s.servicename || s.serviceCategory || 'Service',
  category:    s.serviceCategory || '',
  description: s.description || '',
  image:       s.portfolioImages?.[0]?.url || '',
  rating:      s.averageRating  ?? 0,
  reviewCount: s.reviewCount    ?? 0,
  price:       s.experience ? `${s.experience} yrs exp` : '',
});

// ─── Derive display shape from ProviderProfile document ───────────────────────
const deriveProvider = (p) => {
  if (!p) return null;
  const primaryService = p.serviceOfferings?.[0];
  const skills = [
    ...new Set(
      (p.serviceOfferings || []).map((s) => s.serviceCategory).filter(Boolean),
    ),
  ];
  return {
    _id:          p._id,
    name:         [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || 'Provider',
    avatar:       p.user?.profileImage || null,
    coverImage:   primaryService?.portfolioImages?.[0]?.url || p.user?.profileImage || null,
    role:         primaryService?.serviceCategory || 'Service Provider',
    location:     [p.user?.city, p.user?.state].filter(Boolean).join(', ') || 'Location N/A',
    languages:    'English',
    rating:       p.stats?.averageRating ?? 0,
    reviewCount:  p.stats?.totalReviews  ?? 0,
    yearsExp:     primaryService?.experience ?? 'N/A',
    // ─── FIX: show number of services offered ─────────────────────────────────
    projectCount: (p.serviceOfferings || []).length,
    bio:          p.bio || '',
    isVerified:   true,
    skills,
    phoneNumber:  p.user?.phoneNumber || '',
    user:         p.user,
    isPublicMember: p.user?.isPublicMember ?? false,
    communityName:  p.user?.communityCommunName || p.user?.communName || null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
const ProviderProfileScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const providerId =
    route?.params?.providerId || route?.params?.provider?.id;

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data:      providerRaw,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFetchProviderByIdQuery(providerId, { skip: !providerId });

  const [incrementCount] = useIncrementProviderProfileCountMutation();

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetch]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline]);

  useEffect(() => {
    if (providerId && isOnline) {
      incrementCount(providerId).catch(() => {});
    }
  }, [providerId, isOnline]);

  const PROVIDER = deriveProvider(providerRaw);
  const SERVICES  = (providerRaw?.serviceOfferings || []).map(mapService);

  const renderAvatar = () => {
    const avatarUri = PROVIDER?.avatar;
    const initials = getInitials(PROVIDER?.name || '');

    if (avatarUri && !avatarError) {
      return (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          onError={() => setAvatarError(true)}
        />
      );
    }

    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatar, styles.initialsAvatar]}
      >
        <Text style={styles.initialsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  // ─── Render badge on top of avatar ──────────────────────────────────────────
  const renderStatusBadge = () => {
    if (!PROVIDER) return null;
    const { isPublicMember, communityName } = PROVIDER;

    let label = 'Community Provider';
    let icon = <Icon name="home-outline" size={scaleFont(10)} color={COLORS.white} />;
    let style = styles.badgeDefault;

    const hasCommunity = communityName && communityName.trim().length > 0;

    if (isPublicMember || !hasCommunity) {
      label = 'Public Provider';
      icon = <Icon name="globe-outline" size={scaleFont(10)} color={COLORS.white} />;
      style = styles.badgePublic;
    } else if (hasCommunity) {
      label = communityName;
      icon = <Icon name="home-outline" size={scaleFont(10)} color={COLORS.white} />;
      style = styles.badgeCommunity;
    }

    return (
      <View style={[styles.badge, style]}>
        {icon}
        <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {label}
        </Text>
      </View>
    );
  };

  const goToService = (service) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to view service details.');
      return;
    }
    navigation?.navigate('ServiceDetail', { serviceId: service.id });
  };

  const goToAllServices = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to view all services.');
      return;
    }
    if (!PROVIDER) return;
    navigation.navigate(ROUTES.PROVIDER_ALL_SERVICES, {
      providerId:   PROVIDER._id,
      providerName: PROVIDER.name,
    });
  };

  const hasData = !!PROVIDER;
  const showOfflineBanner = !isOnline && hasData;
  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Profile
          </Text>
          <View style={styles.rightButton} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !hasData) {
    const message = error?.data?.message || 'Provider not found.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Profile
          </Text>
          <View style={styles.rightButton} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {message}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Provider Profile
        </Text>
        <View style={styles.rightButton} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. The profile is still available."
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >

          <View style={styles.heroWrap}>
            <Image
              source={{ uri: PROVIDER.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              {renderAvatar()}
              {renderStatusBadge()}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.providerName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {PROVIDER.name}
              </Text>
            </View>

            <Text style={styles.providerRole} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {PROVIDER.role}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="location-outline" size={scaleFont(13)} color={COLORS.textMuted} />
                <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {PROVIDER.location}
                </Text>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <MaterialIcon name="translate" size={scaleFont(13)} color={COLORS.textMuted} />
                <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {PROVIDER.languages}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statTopRow}>
                  <Icon name="star" size={scaleFont(15)} color="#F59E0B" />
                  <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {PROVIDER.rating > 0 ? PROVIDER.rating.toFixed(1) : '0.0'}
                  </Text>
                </View>
                <Text style={styles.statSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {PROVIDER.reviewCount} reviews
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {PROVIDER.yearsExp !== 'N/A' ? `${PROVIDER.yearsExp} Yrs` : 'N/A'}
                </Text>
                <Text style={styles.statSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Experience
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {PROVIDER.projectCount}
                </Text>
                <Text style={styles.statSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Services
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              About {PROVIDER.name.split(' ')[0]}
            </Text>
            <Text
              style={styles.bioText}
              numberOfLines={bioExpanded ? undefined : 4}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {PROVIDER.bio || 'No bio available.'}
            </Text>
            <TouchableOpacity
              onPress={() => setBioExpanded((v) => !v)}
              activeOpacity={0.7}
              style={{ marginTop: scaleHeight(8) }}>
              <Text style={styles.readMoreText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {bioExpanded ? 'Show Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          </View>

          {PROVIDER.skills.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Skills & Expertise
              </Text>
              <View style={styles.skillsWrap}>
                {PROVIDER.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {SERVICES.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Services Offered
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={goToAllServices}
                  disabled={!isOnline}
                  style={!isOnline && { opacity: 0.5 }}>
                  <GradientText
                    colors={gradientColors}
                    style={styles.viewAllText}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    View All
                  </GradientText>
                </TouchableOpacity>
              </View>

              {SERVICES.map((service) => (
                <View key={service.id} style={{ marginBottom: moderateScale(12, 0.3) }}>
                  <ServiceRowCard
                    item={service}
                    onPress={() => goToService(service)}
                    showHeart={false}
                  />
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

ProviderProfileScreen.sharedElements = (route) => {
  const { providerId } = route.params;
  return [
    {
      id:        `provider_${providerId}_avatar`,
      animation: 'move',
      resize:    'clip',
    },
  ];
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop:        scaleHeight(16),
    paddingBottom:     scaleHeight(16),
    backgroundColor:   COLORS.white,
  },
  backButton: {
    width: scaleWidth(24),
  },
  rightButton: {
    width:      scaleWidth(24),
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex:       1,
    textAlign:  'center',
    fontSize:   scaleFont(19),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },
  headerDivider: {
    height:          moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },

  centeredState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize:   scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color:      COLORS.textSecondary,
  },
  errorText: {
    fontSize:          scaleFont(FONTS.body),
    fontWeight:        FONTS.weightMedium,
    color:             '#DC2626',
    textAlign:         'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop:         scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical:   scaleHeight(10),
    borderRadius:      moderateScale(RADIUS.md, 0.3),
    backgroundColor:   COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
    color:      COLORS.white,
  },

  scrollContent: {
    paddingHorizontal: scaleWidth(20),
  },

  heroWrap: {
    marginHorizontal: -scaleWidth(20),
    height:            moderateScale(200, 0.3),
    position:          'relative',
  },
  coverImage: { width: '100%', height: '100%' },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius:    moderateScale(20, 0.3),
    padding:         moderateScale(20, 0.3),
    marginTop:       -moderateScale(40, 0.3),
    marginBottom:    scaleHeight(14),
    alignItems:      'center',
    ...SHADOW.card,
    shadowOpacity: 0.07,
    shadowRadius:  moderateScale(12, 0.3),
    shadowOffset:  { width: 0, height: scaleHeight(4) },
    elevation: 4,
  },
  avatarWrap: {
    position:     'relative',
    marginBottom: scaleHeight(12),
  },
  avatar: {
    width:           moderateScale(84, 0.3),
    height:          moderateScale(84, 0.3),
    borderRadius:    moderateScale(42, 0.3),
    borderWidth:     moderateScale(3, 0.3),
    borderColor:     COLORS.white,
    backgroundColor: COLORS.border,
  },
  initialsAvatar: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: COLORS.primary,
  },
  initialsText: {
    fontSize:   scaleFont(28),
    fontWeight: FONTS.weightBold,
    color:      COLORS.white,
    textAlign:  'center',
  },
  nameRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             moderateScale(8, 0.3),
    flexWrap:        'wrap',
    justifyContent: 'center',
    marginBottom:    scaleHeight(4),
  },
  providerName: {
    fontSize:   scaleFont(20),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },
  providerRole: {
    fontSize:     scaleFont(14),
    color:        COLORS.textMuted,
    fontWeight:   FONTS.weightMedium,
    marginBottom: scaleHeight(10),
  },
  metaRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             moderateScale(8, 0.3),
    flexWrap:        'wrap',
    justifyContent: 'center',
    marginBottom:    scaleHeight(18),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            moderateScale(4, 0.3),
  },
  metaText: {
    fontSize: scaleFont(13),
    color:    COLORS.textMuted,
  },
  metaDot: {
    width:           moderateScale(4, 0.3),
    height:          moderateScale(4, 0.3),
    borderRadius:    moderateScale(2, 0.3),
    backgroundColor: COLORS.textMuted,
  },

  statsRow: {
    flexDirection:    'row',
    alignItems:       'center',
    width:            '100%',
    borderTopWidth:   moderateScale(1, 0.3),
    borderTopColor:   COLORS.border,
    paddingTop:       scaleHeight(16),
  },
  statItem: {
    flex:       1,
    alignItems: 'center',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            moderateScale(4, 0.3),
  },
  statValue: {
    fontSize:   scaleFont(16),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },
  statSub: {
    fontSize:  scaleFont(12),
    color:     COLORS.textMuted,
    marginTop: scaleHeight(3),
  },
  statDivider: {
    width:           moderateScale(1, 0.3),
    height:          moderateScale(36, 0.3),
    backgroundColor: COLORS.border,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    moderateScale(RADIUS.lg, 0.3),
    padding:         moderateScale(18, 0.3),
    marginBottom:    scaleHeight(14),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius:  moderateScale(8, 0.3),
    shadowOffset:  { width: 0, height: scaleHeight(2) },
    elevation: 2,
  },
  cardTitle: {
    fontSize:     scaleFont(16),
    fontWeight:   FONTS.weightBold,
    color:        COLORS.textPrimary,
    marginBottom: scaleHeight(12),
  },
  bioText: {
    fontSize:   scaleFont(14),
    color:      COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
  },
  readMoreText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
    color:      COLORS.primary,
  },

  skillsWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            moderateScale(8, 0.3),
  },
  skillChip: {
    backgroundColor:  COLORS.white,
    borderRadius:     moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical:  scaleHeight(7),
  },
  skillChipText: {
    fontSize:   scaleFont(13),
    color:      COLORS.textSecondary,
    fontWeight: FONTS.weightMedium,
  },

  sectionHeaderRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   scaleHeight(12),
  },
  sectionTitle: {
    fontSize:   scaleFont(17),
    fontWeight: FONTS.weightBold,
    color:      COLORS.textPrimary,
  },
  viewAllText: {
    fontSize:   scaleFont(14),
    fontWeight: FONTS.weightBold,
  },

  // ─── Badge – centered on the avatar border ──────────────────────────────
  badge: {
    position: 'absolute',
    top: -32.5,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    zIndex: 2,
  },
  badgePublic: {
    backgroundColor: COLORS.gradientStart
  },
  badgeCommunity: {
    backgroundColor:  COLORS.gradientEnd
  },
  badgeDefault: {
    backgroundColor: COLORS.gradientStart,
  },
  badgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
});

export default ProviderProfileScreen;