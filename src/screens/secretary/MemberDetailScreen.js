// screens/secretary/MemberDetailScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchCommunityMembersQuery,
  useApproveUserRegistrationMutation,
  useRejectUserRegistrationMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const STATUS_STYLES = {
  approved: { bg: '#DCFCE7', text: '#15803D', label: 'APPROVED' },
  pending:  { bg: '#FEF3C7', text: '#B45309', label: 'PENDING'  },
  rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'REJECTED' },
};

const formatJoinedDate = isoDate => {
  if (!isoDate) return '—';
  try { return new Date(isoDate).toLocaleDateString(); }
  catch { return '—'; }
};

const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last  = lastName?.charAt(0)  || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last)  return last.toUpperCase();
  return '?';
};

const Avatar = ({ firstName, lastName, profileImage, size = 100 }) => {
  const [imageError, setImageError] = useState(false);
  const initials   = getInitials(firstName, lastName);
  const avatarSize = moderateScale(size, 0.3);
  const fontSize   = scaleFont(size * 0.4);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[styles.avatarLarge, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
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

const MemberDetailScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();

  // ── Accept either full member object or memberId ──
  const { member: memberFromParams, memberId: memberIdFromParams } = route.params || {};

  const { isOnline } = useNetworkStatus();

  const [approveUserRegistration] = useApproveUserRegistrationMutation();
  const [rejectUserRegistration]  = useRejectUserRegistrationMutation();

  // ── If member is passed directly, use it ──
  const [member, setMember] = useState(memberFromParams || null);

  // ── If only memberId is passed, fetch the list and find the member ──
  const shouldFetch = !member && memberIdFromParams;
  const {
    data: membersData,
    isLoading,
    isFetching,
    refetch,
  } = useFetchCommunityMembersQuery(undefined, { skip: !shouldFetch });

  useEffect(() => {
    if (shouldFetch && membersData) {
      const found = membersData.users?.find(u => u._id === memberIdFromParams);
      if (found) {
        setMember(found);
      }
    }
  }, [membersData, shouldFetch, memberIdFromParams]);

  // ── If no member and no memberId, show error ──
  if (!member && !memberIdFromParams) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member Detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(48)} color="#EF4444" />
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading while fetching (only when memberId is used) ──
  if (shouldFetch && isLoading && !member) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member Detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText}>Loading member...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── If memberId was provided but member not found after fetch ──
  if (shouldFetch && !isLoading && !member) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member Detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(48)} color="#EF4444" />
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Now we have a valid member ──
  const status      = member.accountStatus || 'approved';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.approved;
  const isProvider  = member.role === 'provider';
  const fullName    = [member.firstName, member.lastName].filter(Boolean).join(' ');

  const handleApprove = async () => {
    if (!isOnline) { Alert.alert('No Internet', 'Please connect to the internet to approve.'); return; }
    Alert.alert('Approve', `Approve ${fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await approveUserRegistration(member._id).unwrap();
            Alert.alert('Success', 'Member approved.');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err?.data?.message || 'Could not approve member.');
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!isOnline) { Alert.alert('No Internet', 'Please connect to the internet to reject.'); return; }
    Alert.alert('Reject', `Reject ${fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectUserRegistration(member._id).unwrap();
            Alert.alert('Success', 'Member rejected.');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err?.data?.message || 'Could not reject member.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member Detail</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={!isOnline}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar & Name */}
          <View style={styles.profileHeader}>
            <Avatar
              firstName={member.firstName}
              lastName={member.lastName}
              profileImage={member.profileImage}
              size={100}
            />
            <Text style={styles.name} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{fullName}</Text>
            <View style={styles.roleRow}>
              <Text style={styles.roleText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isProvider ? 'Provider' : 'Member'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {statusStyle.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Contact Information</Text>
            <View style={styles.infoRow}>
              <Icon name="mail-outline" size={scaleFont(20)} color={COLORS.textSecondary} />
              <Text style={styles.infoText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{member.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="call-outline" size={scaleFont(20)} color={COLORS.textSecondary} />
              <Text style={styles.infoText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {member.phoneNumber || 'Not provided'}
              </Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Additional Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Joined</Text>
              <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {formatJoinedDate(member.createdAt)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Provider Handle</Text>
              <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {member.communName || '—'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </NetworkAwareView>

      {status === 'pending' && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.rejectButton, !isOnline && { opacity: 0.5 }]}
            onPress={handleReject}
            disabled={!isOnline}
          >
            <Text style={[styles.rejectText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {isOnline ? 'Reject' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveButtonWrapper, !isOnline && { opacity: 0.5 }]}
            activeOpacity={isOnline ? 0.85 : 1}
            onPress={handleApprove}
            disabled={!isOnline}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.approveButton, !isOnline && { opacity: 0.6 }]}
            >
              <Text style={[styles.approveText, !isOnline && { color: COLORS.border }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Approve' : 'Offline'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16), paddingBottom: scaleHeight(16),
  },
  backButton:   { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(24) },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: scaleFont(19), fontWeight: FONTS.weightBold, color: COLORS.textPrimary,
  },
  headerDivider: { height: moderateScale(1, 0.3), backgroundColor: COLORS.border },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(24), paddingBottom: scaleHeight(24),
  },
  profileHeader: { alignItems: 'center', marginBottom: scaleHeight(28) },
  avatarLarge:   { backgroundColor: COLORS.border, marginBottom: scaleHeight(16) },
  initialsAvatar: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, marginBottom: scaleHeight(16),
  },
  initialsText: { color: COLORS.white, fontWeight: FONTS.weightBold, textAlign: 'center' },
  name: { fontSize: scaleFont(24), fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: scaleHeight(6) },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12, 0.3) },
  roleText: { fontSize: scaleFont(15), fontWeight: FONTS.weightSemiBold, color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(4), borderRadius: moderateScale(RADIUS.md, 0.3) },
  statusText: { fontSize: scaleFont(12), fontWeight: FONTS.weightBold, letterSpacing: moderateScale(0.3, 0.1) },
  infoSection: { marginBottom: scaleHeight(24) },
  sectionLabel: { fontSize: scaleFont(16), fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary, marginBottom: scaleHeight(12) },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: scaleHeight(6), borderBottomWidth: moderateScale(1, 0.3), borderBottomColor: COLORS.border },
  infoText: { fontSize: scaleFont(15), color: COLORS.textSecondary, marginLeft: scaleWidth(12), flex: 1 },
  infoLabel: { fontSize: scaleFont(14), fontWeight: FONTS.weightMedium, color: COLORS.textSecondary, width: moderateScale(120, 0.3) },
  infoValue: { fontSize: scaleFont(14), color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(16),
    borderTopWidth: moderateScale(1, 0.3), borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  rejectButton: {
    flex: 1, height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3), borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginRight: scaleWidth(12),
  },
  rejectText: { fontSize: scaleFont(16), fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  approveButtonWrapper: {
    flex: 1, borderRadius: moderateScale(RADIUS.md, 0.3), overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15, shadowRadius: moderateScale(10, 0.2), elevation: 3,
  },
  approveButton: { height: moderateScale(52, 0.3), alignItems: 'center', justifyContent: 'center' },
  approveText:   { fontSize: scaleFont(16), fontWeight: FONTS.weightBold, color: COLORS.white },
  errorContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scaleWidth(20) },
  errorText: { fontSize: scaleFont(16), color: '#EF4444', marginTop: scaleHeight(12), textAlign: 'center' },
  retryBtn: { marginTop: scaleHeight(12), paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(10), borderRadius: moderateScale(RADIUS.md, 0.3), backgroundColor: COLORS.gradientStart },
  retryBtnText: { fontSize: scaleFont(14), fontWeight: FONTS.weightBold, color: COLORS.white },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scaleWidth(20) },
  loadingText: { fontSize: scaleFont(16), color: COLORS.textSecondary, marginTop: scaleHeight(12) },
});

export default MemberDetailScreen;