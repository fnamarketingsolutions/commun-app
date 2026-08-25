// screens/app/ProfileInfoScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { JoinCommunityModal } from '../../components/JoinCommunityModal';
import { ROUTES } from '../../navigations/routes';
import { setUser } from '../../redux/slices/authSlice';
import { useFetchMyProviderProfileQuery } from '../../redux/service/providerApi';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Format community handle → display name ────────────────────────────────
const formatCommunityLabel = (commName) => {
  if (!commName || commName === '__other__') return '';
  return commName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ─── Get initials ────────────────────────────────────────────────────────────
const getInitials = (firstName, lastName, email) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
};

// ─── Avatar Component ────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, email, profileImage, size = 96 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName, email);

  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);
  const borderWidth = moderateScale(3, 0.3);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[
          styles.avatarImage,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderWidth },
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.initialsAvatar,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderWidth },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, isLast = false }) => (
  <>
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>{icon}</View>
      <View style={styles.infoRowTexts}>
        <Text style={styles.infoRowLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {label}
        </Text>
        <Text style={styles.infoRowValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {value || '—'}
        </Text>
      </View>
    </View>
    {!isLast && <View style={styles.rowDivider} />}
  </>
);

// ─── Menu Row ─────────────────────────────────────────────────────────────────
const MenuRow = ({ icon, label, subtitle, onPress, danger = false, disabled = false }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.menuRow, disabled && styles.menuRowDisabled]}
    disabled={disabled}
  >
    <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger, disabled && styles.menuIconWrapDisabled]}>
      {icon}
    </View>
    <View style={styles.menuRowTexts}>
      <Text style={[styles.menuRowLabel, danger && styles.menuRowLabelDanger, disabled && styles.menuRowLabelDisabled]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.menuRowSubtitle, disabled && styles.menuRowSubtitleDisabled]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {subtitle}
        </Text>
      )}
    </View>
    <Icon
      name="chevron-forward"
      size={scaleFont(18)}
      color={disabled ? COLORS.textMuted : (danger ? '#EF4444' : COLORS.textMuted)}
    />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProfileInfoScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);

  const { isOnline } = useNetworkStatus();

  // ── Provider bio (read‑only) ──
  const { data: providerProfile } = useFetchMyProviderProfileQuery(undefined, {
    skip: user?.role !== 'provider',
  });

  // ── Join modal state ──
  const [showJoinModal, setShowJoinModal] = useState(false);

  // ─── COMMUNITY DISPLAY LOGIC ──────────────────────────────────────────────
  const accountStatus = user?.accountStatus || 'approved';
  const isPending = accountStatus === 'pending';
  const isPublicMember = user?.isPublicMember ?? false;

  const hasCommunity = !isPublicMember ||
    (!!user?.communityCommunName && user?.communityCommunName !== '__other__') ||
    !!user?.communName;

  const communityLabel = user?.communityLabel
    || user?.community?.label
    || formatCommunityLabel(user?.communityCommunName)
    || formatCommunityLabel(user?.communName)
    || null;

  const showCommunityName = !isPending && hasCommunity && communityLabel;
  const showPending = isPending;
  const showJoinButton = isPublicMember && !isPending;

  const providerBio = providerProfile?.bio || null;
  const isProvider = user?.role === 'provider';

  // ── Join handler ──
  const handleJoinPress = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to join a community.');
      return;
    }
    setShowJoinModal(true);
  };

  // ─── onSuccess for JoinCommunityModal – updates Redux user ───────────────
  const handleJoinSuccess = (updatedUser) => {
    if (updatedUser) {
      dispatch(setUser(updatedUser));
    }
    setShowJoinModal(false);
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const avatarUri = user?.profileImage || null;

  const locationParts = [user?.city, user?.state].filter(Boolean);
  const location = locationParts.length ? locationParts.join(', ') : null;

  const flatNumber = user?.flatNumber || null;
  const streetParts = [user?.addressLine1, user?.addressLine2].filter(Boolean);
  const street = streetParts.length ? streetParts.join(', ') : null;

  const cityLine = [user?.city, user?.state, user?.zip].filter(Boolean).join(', ') || null;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

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
          My Profile
        </Text>
        <TouchableOpacity
          onPress={() => navigation?.navigate('EditProfile')}
          style={styles.editHeaderBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!isOnline}>
          <Icon
            name="create-outline"
            size={scaleFont(20)}
            color={isOnline ? COLORS.gradientStart : COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. Your profile information is still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(30, 0.3) },
          ]}>

          {/* ── Avatar Hero ── */}
          <View style={styles.heroSection}>
            <View style={styles.heroBg}>
              <View style={styles.avatarWrap}>
                <Avatar
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  email={user?.email}
                  profileImage={avatarUri}
                  size={96}
                />
              </View>
              <Text style={styles.heroName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {fullName}
              </Text>
              {location && (
                <Text style={styles.heroLocation} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  <Icon name="location-outline" size={scaleFont(13)} color={COLORS.textMuted} />{' '}
                  {location}
                </Text>
              )}
            </View>
          </View>

          {/* ── Community Card ── */}
          <View style={styles.card}>
            {showCommunityName && (
              <InfoRow
                icon={<Icon name="business-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
                label="Community Name"
                value={communityLabel}
                isLast
              />
            )}

            {showPending && (
              <View style={styles.pendingRow}>
                <Icon name="time-outline" size={scaleFont(18)} color="#D97706" />
                <Text style={styles.pendingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Pending approval for {user?.requestedCommunityName || 'your community'}
                </Text>
              </View>
            )}

            {showJoinButton && (
              <View style={styles.joinRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.joinRowTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Not linked to a community
                  </Text>
                  <Text style={styles.joinRowSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {user?.requestedCommunityName
                      ? `You signed up with: ${user.requestedCommunityName}`
                      : 'Join a community to connect with your neighbours.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleJoinPress}
                  activeOpacity={0.85}
                  disabled={!isOnline}
                  style={[styles.joinRowBtnWrap, !isOnline && { opacity: 0.5 }]}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.joinRowBtn}>
                    <Text style={styles.joinRowBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Join
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Provider Bio (read‑only, only if provider and bio exists) ── */}
          {isProvider && providerBio && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="text-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Provider Bio
                </Text>
              </View>
              <Text style={styles.bioText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {providerBio}
              </Text>
            </View>
          )}

          {/* ── Account Info Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Icon name="information-circle-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
              </View>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Account Info
              </Text>
            </View>

            <InfoRow
              icon={<Icon name="mail-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="Email Address"
              value={user?.email}
            />
            <InfoRow
              icon={<Icon name="call-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="Phone Number"
              value={user?.phoneNumber}
            />
            <InfoRow
              icon={<Icon name="calendar-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="Member Since"
              value={memberSince}
            />
          </View>

          {/* ── Address Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Icon name="location-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
              </View>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Address
              </Text>
            </View>

            <InfoRow
              icon={<Icon name="home-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="Flat / House Number"
              value={flatNumber}
            />
            <InfoRow
              icon={<Icon name="home-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="Street"
              value={street}
            />
            <InfoRow
              icon={<MaterialIcon name="city-variant-outline" size={scaleFont(16)} color={COLORS.gradientStart} />}
              label="City / State / Zip"
              value={cityLine}
              isLast
            />
          </View>

          {/* ── Account Settings Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Icon name="settings-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
              </View>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Account Settings
              </Text>
            </View>

            <MenuRow
              icon={<Icon name="create-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />}
              label="Edit Profile"
              subtitle="Update personal info & address"
              onPress={() => navigation?.navigate('EditProfile')}
              disabled={!isOnline}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon={<MaterialIcon name="lock-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />}
              label="Security & Password"
              subtitle="Change password, manage security"
              onPress={() => navigation?.navigate('Security')}
              disabled={!isOnline}
            />
          </View>
        </ScrollView>
      </NetworkAwareView>

      {/* ── Join Community Modal ── */}
      <JoinCommunityModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
        isOnline={isOnline}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: scaleWidth(24),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  editHeaderBtn: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  heroSection: {
    marginBottom: scaleHeight(16),
  },
  heroBg: {
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: scaleHeight(14),
  },
  avatarImage: {
    borderColor: COLORS.white,
    backgroundColor: COLORS.border,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  heroName: {
    fontSize: scaleFont(22),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  heroLocation: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(18, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(18),
  },
  cardHeaderIcon: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  bioText: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
  },
  joinRowTitle: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  joinRowSub: {
    fontSize: scaleFont(11),
    color: COLORS.textSecondary,
    marginTop: scaleHeight(2),
  },
  joinRowBtnWrap: {
    flexShrink: 0,
  },
  joinRowBtn: {
    paddingHorizontal: moderateScale(16, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    borderRadius: moderateScale(RADIUS.md, 0.2),
  },
  joinRowBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8, 0.3),
    paddingVertical: scaleHeight(6),
  },
  pendingText: {
    fontSize: scaleFont(13),
    color: '#D97706',
    fontWeight: FONTS.weightMedium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12, 0.3),
    paddingVertical: scaleHeight(10),
  },
  infoIconWrap: {
    width: moderateScale(34, 0.3),
    height: moderateScale(34, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowTexts: { flex: 1 },
  infoRowLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  infoRowValue: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
    marginTop: scaleHeight(2),
  },
  rowDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: scaleHeight(2),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(12),
    gap: moderateScale(12, 0.3),
  },
  menuRowDisabled: {
    opacity: 0.6,
  },
  menuIconWrap: {
    width: moderateScale(38, 0.3),
    height: moderateScale(38, 0.3),
    borderRadius: moderateScale(12, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuIconWrapDisabled: {
    backgroundColor: COLORS.white,
  },
  menuRowTexts: { flex: 1 },
  menuRowLabel: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  menuRowLabelDanger: {
    color: '#EF4444',
  },
  menuRowLabelDisabled: {
    color: COLORS.textMuted,
  },
  menuRowSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  menuRowSubtitleDisabled: {
    color: COLORS.textMuted,
  },
});

export default ProfileInfoScreen;