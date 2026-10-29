// screens/secretary/MembersScreen.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchCommunityMembersQuery,
  useUpdateCommunityMemberStatusMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const PAGE_SIZE = 20;

const STATUS_STYLES = {
  approved: { bg: '#DCFCE7', text: '#15803D', label: 'APPROVED' },
  pending: { bg: '#FEF3C7', text: '#B45309', label: 'PENDING' },
  rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'REJECTED' },
};

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const formatJoinedDate = (isoDate) => {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString();
  } catch {
    return '—';
  }
};

const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
};

const Avatar = ({ firstName, lastName, profileImage, isRejected, size = 56 }) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);

  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);

  if (profileImage && !imageError) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          isRejected && styles.avatarRejected,
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
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        isRejected && styles.avatarRejected,
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

const MembersScreen = () => {
  const navigation = useNavigation();
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: membersData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchCommunityMembersQuery({ page, limit: PAGE_SIZE });

  const [updateStatus, { isLoading: isUpdating }] = useUpdateCommunityMemberStatusMutation();

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  // Auto-refetch on reconnect
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
    if (page !== 1) {
      setPage(1);
    } else {
      refetch();
    }
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline, page]);

  const members = membersData?.users || [];
  const pagination = membersData?.pagination || null;
  const hasData = members.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  // ─── Search filter ────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => {
      const firstName = (member.firstName || '').toLowerCase();
      const lastName = (member.lastName || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const flatNumber = (member.flatNumber || '').toLowerCase();
      return (
        firstName.includes(term) ||
        lastName.includes(term) ||
        email.includes(term) ||
        flatNumber.includes(term)
      );
    });
  }, [members, searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (!isOnline) return;
    if (isFetching || isLoadingMore) return;
    if (!pagination?.hasNextPage) return;

    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [isOnline, isFetching, isLoadingMore, pagination]);

  useEffect(() => {
    if (!isFetching) {
      setIsLoadingMore(false);
    }
  }, [isFetching]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const handleStatusPress = (member) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change status.');
      return;
    }
    setSelectedMember(member);
    setModalVisible(true);
  };

  const handleSelectStatus = async (newStatus) => {
    if (!selectedMember) return;
    const currentStatus = selectedMember.accountStatus || 'approved';
    if (newStatus === currentStatus) {
      setModalVisible(false);
      setSelectedMember(null);
      return;
    }

    try {
      await updateStatus({
        userId: selectedMember._id,
        accountStatus: newStatus,
      }).unwrap();
      refetch();
      Alert.alert('Status Updated', `Member status changed to ${newStatus}.`);
    } catch (err) {
      const msg = err?.data?.message || 'Failed to update status. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setModalVisible(false);
      setSelectedMember(null);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  // ─── ✅ FIX: Pass the full member object ────────────────────────────────
  const handleMemberPress = (member) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to view member details.');
      return;
    }
    // Pass the entire member object so the detail screen uses it directly.
    navigation.navigate('MemberDetail', { member });
  };

  const renderMember = useCallback(
    ({ item: member }) => {
      const status = member.accountStatus || 'approved';
      const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.approved;
      const isProvider = member.role === 'provider';
      const isRejected = status === 'rejected';
      const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');

      return (
        <TouchableOpacity
          style={[styles.card, !isOnline && { opacity: 0.7 }]}
          activeOpacity={isOnline ? 0.7 : 1}
          onPress={() => handleMemberPress(member)}
          disabled={!isOnline}
        >
          {/* Top row: avatar, name, status badge */}
          <View style={styles.cardTopRow}>
            <View style={styles.avatarWrapper}>
              <Avatar
                firstName={member.firstName}
                lastName={member.lastName}
                profileImage={member.profileImage}
                isRejected={isRejected}
                size={56}
              />
              {isProvider && (
                <View style={styles.verifiedBadge}>
                  <Icon name="star" size={scaleFont(11)} color={COLORS.white} />
                </View>
              )}
            </View>

            <View style={styles.nameColumn}>
              <Text
                style={[styles.name, !isOnline && { color: COLORS.textMuted }]}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                {fullName}
              </Text>
              <Text
                style={[
                  styles.typeLabel,
                  isProvider ? styles.typeProvider : styles.typeMember,
                  !isOnline && { color: COLORS.textMuted },
                ]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                {isProvider ? 'PROVIDER' : 'MEMBER'}
              </Text>
            </View>

            {/* Status Badge (tappable) */}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg },
                !isOnline && styles.statusBadgeDisabled,
              ]}
              onPress={() => handleStatusPress(member)}
              disabled={!isOnline || isUpdating}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.statusText, { color: statusStyle.text }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                {statusStyle.label}
              </Text>
              <Icon
                name="chevron-down"
                size={scaleFont(14)}
                color={statusStyle.text}
                style={{ marginLeft: scaleWidth(4) }}
              />
            </TouchableOpacity>
          </View>

          {/* Contact info */}
          <View style={styles.contactBlock}>
            {!!(member.flatNumber || member.addressLine1 || member.city) && (
              <View style={styles.contactRow}>
                <Icon name="home-outline" size={scaleFont(16)} color={COLORS.textMuted} />
                <Text
                  style={[styles.contactText, !isOnline && { color: COLORS.textMuted }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {[member.flatNumber ? 'Flat ' + member.flatNumber : '', member.addressLine1, member.city].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
            <View style={styles.contactRow}>
              <Icon name="mail-outline" size={scaleFont(16)} color={COLORS.textMuted} />
              <Text
                style={[styles.contactText, !isOnline && { color: COLORS.textMuted }]}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                {member.email}
              </Text>
            </View>
            {!!member.phoneNumber && (
              <View style={styles.contactRow}>
                <Icon name="call-outline" size={scaleFont(16)} color={COLORS.textMuted} />
                <Text
                  style={[styles.contactText, !isOnline && { color: COLORS.textMuted }]}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {member.phoneNumber}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <Text
              style={[styles.joinedText, !isOnline && { color: COLORS.textMuted }]}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            >
              Joined: {formatJoinedDate(member.createdAt)}
            </Text>
            <Icon name="chevron-forward" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      );
    },
    [isOnline, isUpdating]
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.gradientStart} />
      </View>
    );
  };

  // ─── Loading state (first page only) ───────────────────────────────────
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Members</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (isError && !hasData) {
    const errorMessage = error?.data?.message || 'Unable to load members.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Members</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {errorMessage}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Members</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, !isOnline && styles.searchInputDisabled]}>
          <Icon name="search-outline" size={scaleFont(18)} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or flat number..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={isOnline}
            allowFontScaling={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Members are still available."
      >
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item._id}
          renderItem={renderMember}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline && page === 1 && !isLoadingMore}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            isFetching && !isOnline ? null : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {searchQuery.trim()
                    ? 'No members match your search.'
                    : 'No members in your community yet.'}
                </Text>
              </View>
            )
          }
        />
      </NetworkAwareView>

      {/* ─── Status Change Modal ───────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Change Status
                </Text>
                <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {selectedMember
                    ? `${selectedMember.firstName} ${selectedMember.lastName}`
                    : 'Select member'}
                </Text>

                {STATUS_OPTIONS.map((option) => {
                  const currentStatus = selectedMember?.accountStatus || 'approved';
                  const isActive = option.value === currentStatus;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionItem, isActive && styles.optionItemActive]}
                      onPress={() => handleSelectStatus(option.value)}
                      disabled={isUpdating}
                    >
                      <Text
                        style={[styles.optionText, isActive && styles.optionTextActive]}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        {option.label}
                      </Text>
                      {isActive && (
                        <Icon name="checkmark-circle" size={scaleFont(20)} color={COLORS.gradientStart} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal} activeOpacity={0.7}>
                  <Text style={styles.modalCancelText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────
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
  backButton: { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(24) },
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
  searchContainer: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dddada25',
    borderRadius: moderateScale(12, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: moderateScale(2, 0.3),
    borderWidth: 1,
    borderColor: '#0000',
  },
  searchInputDisabled: {
    opacity: 0.6,
  },
  searchIcon: {
    marginRight: scaleWidth(8),
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    paddingVertical: scaleHeight(10),
    includeFontPadding: false,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
    paddingBottom: scaleHeight(32),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleWidth(20),
  },
  footerLoader: {
    paddingVertical: scaleHeight(20),
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: scaleWidth(14),
  },
  avatar: {
    backgroundColor: COLORS.border,
  },
  avatarRejected: {
    opacity: 0.4,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -moderateScale(2, 0.3),
    right: -moderateScale(2, 0.3),
    width: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.white,
  },
  nameColumn: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  name: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  typeLabel: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.4, 0.2),
  },
  typeProvider: {
    color: COLORS.gradientStart,
  },
  typeMember: {
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(5),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignSelf: 'flex-start',
  },
  statusBadgeDisabled: {
    opacity: 0.5,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  contactBlock: {
    marginTop: scaleHeight(14),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
  },
  contactText: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    marginLeft: scaleWidth(8),
    flexShrink: 1,
  },
  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginTop: scaleHeight(6),
    marginBottom: scaleHeight(12),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24, 0.3),
    padding: moderateScale(24, 0.3),
    width: '80%',
    maxWidth: moderateScale(360, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16, 0.3),
    elevation: 8,
  },
  modalHandle: {
    width: scaleWidth(40),
    height: moderateScale(4, 0.3),
    backgroundColor: COLORS.border,
    borderRadius: moderateScale(2, 0.3),
    alignSelf: 'center',
    marginBottom: scaleHeight(16),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(4),
  },
  modalSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(20),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(4),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  optionItemActive: {
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(10),
  },
  optionText: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    flex: 1,
  },
  optionTextActive: {
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  modalCancelBtn: {
    marginTop: scaleHeight(16),
    paddingVertical: scaleHeight(14),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
});

export default MembersScreen;