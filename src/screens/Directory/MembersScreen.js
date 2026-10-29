import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  Alert,
  Modal,
  SafeAreaView as RNModalSafeArea,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useCommunityDirectoryQuery } from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import SearchHeader from '../../components/SearchHeader';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const formatFullAddress = (member) => {
  const parts = [];
  if (member.addressLine1) parts.push(member.addressLine1);
  if (member.addressLine2) parts.push(member.addressLine2);
  if (member.city) parts.push(member.city);
  if (member.state) parts.push(member.state);
  if (member.zip) parts.push(member.zip);
  return parts.join(', ') || 'Not provided';
};

// ─── Small row for an address field — only rendered when the value exists ──
const AddressLine = ({ label, value, isLast }) => (
  <View style={[styles.addressLine, isLast && styles.addressLineLast]}>
    <Text style={styles.addressLineLabel}>{label}</Text>
    <Text style={styles.addressLineValue} numberOfLines={2}>{value}</Text>
  </View>
);

// ─── Member Detail Modal (bottom sheet) ─────────────────────────────────────
const MemberDetailModal = ({ member, visible, onClose, isOnline }) => {
  const insets = useSafeAreaInsets();
  if (!member) return null;

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');
  const initials = fullName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatar = member.profileImage;
  const phone = member.phoneNumber?.trim();
  const email = member.email?.trim();
  const role = member.role === 'provider' ? 'Provider' : 'Member';
  const communityName = member.communityCommunName?.trim();

  const addressFields = [
    { label: 'Flat / House', value: member.flatNumber?.trim() },
    { label: 'Street', value: member.addressLine1?.trim() },
    { label: 'Street 2', value: member.addressLine2?.trim() },
    { label: 'City', value: member.city?.trim() },
    { label: 'State', value: member.state?.trim() },
    { label: 'ZIP', value: member.zip?.trim() },
  ].filter((f) => !!f.value);

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to send an email.');
      return;
    }
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetHeader}
          >
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.sheetCloseBtn}
            >
              <Icon name="close" size={scaleFont(20)} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.sheetAvatarWrap}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.sheetAvatar} />
              ) : (
                <View style={styles.sheetAvatarPlaceholder}>
                  <Text style={styles.sheetAvatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{fullName}</Text>

            <View style={styles.sheetChipsRow}>
              <View style={styles.chip}>
                <Icon
                  name={role === 'Provider' ? 'briefcase-outline' : 'person-outline'}
                  size={scaleFont(12)}
                  color={COLORS.gradientStart}
                />
                <Text style={styles.chipText}>{role}</Text>
              </View>
              {!!communityName && (
                <View style={[styles.chip, styles.chipGreen]}>
                  <Icon name="home-outline" size={scaleFont(12)} color="#16A34A" />
                  <Text style={[styles.chipText, styles.chipTextGreen]} numberOfLines={1}>
                    {communityName}
                  </Text>
                </View>
              )}
            </View>

            {/* Contact */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Contact</Text>

              <TouchableOpacity
                style={styles.infoRow}
                onPress={handleCall}
                disabled={!phone}
                activeOpacity={phone ? 0.6 : 1}
              >
                <View style={styles.infoIconCircle}>
                  <Icon name="call" size={scaleFont(15)} color={COLORS.gradientStart} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{phone || 'Not provided'}</Text>
                </View>
                {!!phone && <Icon name="chevron-forward" size={scaleFont(16)} color={COLORS.textMuted} />}
              </TouchableOpacity>

              <View style={styles.infoDivider} />

              <TouchableOpacity
                style={styles.infoRow}
                onPress={handleEmail}
                disabled={!email}
                activeOpacity={email ? 0.6 : 1}
              >
                <View style={styles.infoIconCircle}>
                  <Icon name="mail" size={scaleFont(15)} color={COLORS.gradientStart} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{email || 'Not provided'}</Text>
                </View>
                {!!email && <Icon name="chevron-forward" size={scaleFont(16)} color={COLORS.textMuted} />}
              </TouchableOpacity>
            </View>

            {/* Address — only shown if at least one field is present */}
            {addressFields.length > 0 && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Address</Text>
                {addressFields.map((f, idx) => (
                  <AddressLine
                    key={f.label}
                    label={f.label}
                    value={f.value}
                    isLast={idx === addressFields.length - 1}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {(phone || email) && (
            <View style={[styles.sheetActions, { paddingBottom: insets.bottom + scaleHeight(12) }]}>
              {!!phone && (
                <TouchableOpacity
                  style={[styles.sheetActionBtn, !isOnline && styles.sheetActionDisabled]}
                  onPress={handleCall}
                  disabled={!isOnline}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sheetActionGradient}
                  >
                    <Icon name="call" size={scaleFont(16)} color={COLORS.white} />
                    <Text style={styles.sheetActionText}>Call</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {!!email && (
                <TouchableOpacity
                  style={[styles.sheetActionBtn, !isOnline && styles.sheetActionDisabled]}
                  onPress={handleEmail}
                  disabled={!isOnline}
                  activeOpacity={0.85}
                >
                  <View style={[styles.sheetActionGradient, styles.sheetActionOutline]}>
                    <Icon name="mail-outline" size={scaleFont(16)} color={COLORS.gradientStart} />
                    <Text style={[styles.sheetActionText, styles.sheetActionOutlineText]}>Email</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Member Card ─────────────────────────────────────────────────────────────
const MemberCard = ({ member, isOnline, onPress }) => {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');
  const initials = fullName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatar = member.profileImage;
  const phone = member.phoneNumber?.trim();
  const email = member.email?.trim();

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to send an email.');
      return;
    }
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  return (
    <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.memberAvatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.memberAvatar} />
        ) : (
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.memberAvatarPlaceholder}
          >
            <Text style={styles.memberInitials}>{initials}</Text>
          </LinearGradient>
        )}
      </View>

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{fullName}</Text>
        <Text style={styles.memberRole}>{member.role || 'Member'}{member.flatNumber ? ' • Flat ' + member.flatNumber : ''}</Text>
      </View>

      <View style={styles.memberActions}>
        {phone && (
          <TouchableOpacity
            style={[styles.memberActionBtn, !isOnline && styles.memberActionDisabled]}
            onPress={handleCall}
            disabled={!isOnline}
            activeOpacity={0.7}
          >
            <Icon name="call-outline" size={scaleFont(16)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
          </TouchableOpacity>
        )}
        {email && (
          <TouchableOpacity
            style={[styles.memberActionBtn, !isOnline && styles.memberActionDisabled]}
            onPress={handleEmail}
            disabled={!isOnline}
            activeOpacity={0.7}
          >
            <Icon name="mail-outline" size={scaleFont(16)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <Icon name="chevron-forward" size={scaleFont(16)} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const MembersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Search — scoped to this screen only, filters by name / flat / email ──
  const [searchQuery, setSearchQuery] = useState('');

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);
  const shouldShowMissing = !isSecretary && !userCommunityName && !communityPending;

  const { data, isLoading, isFetching, refetch, error } = useCommunityDirectoryQuery(undefined, {
    skip: !userCommunityName || shouldShowMissing,
  });

  const members = data?.data?.members || data?.members || [];
  const needsCommunity = data?.data?.needsCommunity || data?.needsCommunity || false;

  // ── Filter members by name, flat number, or email ──
  const filteredMembers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return members;

    return members.filter((member) => {
      const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').toLowerCase();
      const flatNumber = (member.flatNumber || '').toLowerCase();
      const email = (member.email || '').toLowerCase();

      return (
        fullName.includes(term) ||
        flatNumber.includes(term) ||
        email.includes(term)
      );
    });
  }, [members, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline && userCommunityName) {
        refetch();
      }
    }, [isOnline, userCommunityName, refetch])
  );

  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      refetch();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetch]);

  const openMemberDetail = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  // ── FlatList render helpers (virtualized list instead of ScrollView + map) ──
  const renderMemberItem = useCallback(
    ({ item }) => (
      <MemberCard
        member={item}
        isOnline={isOnline}
        onPress={() => openMemberDetail(item)}
      />
    ),
    [isOnline]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const ItemSeparator = useCallback(() => <View style={{ height: scaleHeight(12) }} />, []);

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members</Text>
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
            Your community secretary is reviewing your request. Member list will appear once you're approved.
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members</Text>
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
            You are not part of any official community yet. Join one to see community members.
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

  // ── Loading state ──
  if (isLoading && !isFetching && members.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (error && !isLoading) {
    const errorMessage = error?.data?.message || error?.error || 'Failed to load members';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main content ──
  const showOfflineBanner = !isOnline && members.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={false}
        placeholder="Search by name, flat, email..."
      />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        <FlatList
          data={filteredMembers}
          keyExtractor={keyExtractor}
          renderItem={renderMemberItem}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={[
            styles.membersList,
            { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
          ]}
          ListHeaderComponent={
            <>
              {needsCommunity && (
                <View style={styles.needsCommunityBanner}>
                  <Icon name="information-circle-outline" size={scaleFont(18)} color="#92400E" />
                  <Text style={styles.needsCommunityText}>
                    You are not part of a community yet, so members from other communities will not be shown.
                  </Text>
                </View>
              )}
              <View style={styles.countContainer}>
                <Text style={styles.countText}>
                  {filteredMembers.length} Member{filteredMembers.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={scaleFont(48)} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>
                {searchQuery.trim() ? 'No Matching Members' : 'No Members Found'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery.trim()
                  ? 'Try a different name, flat number, or email.'
                  : "Your community doesn't have any members yet or the directory is not available."}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          // ── Virtualization tuning: only mount items near the viewport,
          // avoid loading every avatar image at once ──
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={true}
        />
      </NetworkAwareView>

      <MemberDetailModal
        member={selectedMember}
        visible={modalVisible}
        onClose={closeModal}
        isOnline={isOnline}
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  backButton: {
    width: scaleWidth(24),
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    gap: scaleHeight(12),
  },
  errorText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    overflow: 'hidden',
    minWidth: scaleWidth(100),
  },
  retryGradient: {
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  needsCommunityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(8),
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: moderateScale(12, 0.3),
    padding: moderateScale(14, 0.3),
    marginHorizontal: 0,
    marginBottom: scaleHeight(4),
  },
  needsCommunityText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#92400E',
    lineHeight: moderateScale(18, 0.3),
  },
  countContainer: {
    paddingTop: scaleHeight(4),
    paddingBottom: scaleHeight(4),
  },
  countText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  membersList: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },

  // ── Member Card ──
  memberCard: {
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
  memberAvatarWrap: {
    marginRight: scaleWidth(12),
  },
  memberAvatar: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(24, 0.3),
  },
  memberAvatarPlaceholder: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(24, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  memberRole: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
    textTransform: 'capitalize',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  memberActionBtn: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActionDisabled: {
    opacity: 0.4,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(10),
  },
  emptyStateTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  emptyStateSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scaleWidth(20),
    lineHeight: moderateScale(20, 0.3),
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

  // ── Member Detail Modal — bottom sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 30, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(28, 0.3),
    borderTopRightRadius: moderateScale(28, 0.3),
    maxHeight: '88%',
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(24, 0.3),
    elevation: 12,
  },
  sheetHandle: {
    position: 'absolute',
    top: scaleHeight(10),
    alignSelf: 'center',
    width: scaleWidth(40),
    height: moderateScale(4, 0.3),
    borderRadius: moderateScale(2, 0.3),
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 2,
  },
  sheetHeader: {
    paddingTop: scaleHeight(28),
    paddingBottom: scaleHeight(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: scaleHeight(14),
    right: scaleWidth(14),
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheetAvatarWrap: {
    width: moderateScale(84, 0.3),
    height: moderateScale(84, 0.3),
    borderRadius: moderateScale(42, 0.3),
    borderWidth: moderateScale(3, 0.3),
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 4,
  },
  sheetAvatar: {
    width: '100%',
    height: '100%',
  },
  sheetAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sheetAvatarInitials: {
    fontSize: scaleFont(28),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetBody: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(20),
  },
  sheetName: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sheetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginTop: scaleHeight(10),
    marginBottom: scaleHeight(20),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: '#F3F0FF',
    maxWidth: scaleWidth(220),
  },
  chipGreen: {
    backgroundColor: '#DCFCE7',
  },
  chipText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  chipTextGreen: {
    color: '#16A34A',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(14),
  },
  infoCardTitle: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: moderateScale(0.4, 0.2),
    marginBottom: scaleHeight(10),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(6),
  },
  infoIconCircle: {
    width: moderateScale(34, 0.3),
    height: moderateScale(34, 0.3),
    borderRadius: moderateScale(17, 0.3),
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(1),
  },
  infoValue: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  infoDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: scaleHeight(2),
  },
  addressLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: scaleHeight(8),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  addressLineLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  addressLineLabel: {
    fontSize: scaleFont(12.5),
    color: COLORS.textMuted,
  },
  addressLineValue: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: scaleWidth(16),
  },
  sheetActions: {
    flexDirection: 'row',
    gap: scaleWidth(10),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  sheetActionBtn: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  sheetActionDisabled: {
    opacity: 0.5,
  },
  sheetActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(6),
    paddingVertical: scaleHeight(13),
  },
  sheetActionOutline: {
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
  },
  sheetActionText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  sheetActionOutlineText: {
    color: COLORS.gradientStart,
  },
});

export default MembersScreen;