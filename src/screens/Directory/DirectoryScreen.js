// screens/app/DirectoryScreen.jsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';

import { useCommunityDirectoryQuery } from '../../redux/service/api';
import { useFetchAllProvidersQuery } from '../../redux/service/providerApi';
import { useFetchCommunityMembersQuery } from '../../redux/service/secretaryApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import SearchHeader from '../../components/SearchHeader';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';
import { DirectoryListSkeleton, MemberCardSkeleton } from '../../components/common/DirectorySkeletons';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const PAGE_SIZE = 20;
const VISIBLE_INCREMENT = 20;

// Fixed item height for getItemLayout
const ITEM_HEIGHT = moderateScale(90, 0.3) + scaleHeight(12);

const formatFullAddress = (member) => {
  const parts = [];
  if (member.addressLine1) parts.push(member.addressLine1);
  if (member.addressLine2) parts.push(member.addressLine2);
  if (member.city) parts.push(member.city);
  if (member.state) parts.push(member.state);
  if (member.zip) parts.push(member.zip);
  return parts.join(', ') || 'Not provided';
};

// ─── Small row for an address field (kept for reuse elsewhere) ─────────────
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
  const phone = member.phoneNumber?.trim() || '';
  const email = member.email?.trim() || '';
  const role = member.role === 'provider' ? 'Provider' : 'Member';
  const communityName = member.communityCommunName?.trim();
  const flatNumber = member.flatNumber?.trim() || '';

  const fullAddress = formatFullAddress(member);
  // Show address if either flatNumber OR a full address exists
  const hasAddress = !!flatNumber || fullAddress !== 'Not provided';

 

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to send an email.');
      return;
    }
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleCopy = (value, label) => {
    if (!value) return;
    Clipboard.setString(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const handleDirections = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to open maps.');
      return;
    }
    const query = encodeURIComponent(fullAddress);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  const showCall = !!phone;
  const showEmail = !!email;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.sheetCloseBtn}
          >
            <Icon name="close" size={scaleFont(18)} color={COLORS.white} />
          </TouchableOpacity>

          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetHeader}
          />

          <View style={styles.sheetAvatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.sheetAvatar} />
            ) : (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sheetAvatarPlaceholder}
              >
                <Text style={styles.sheetAvatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {fullName}
            </Text>

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
              {!!flatNumber && (
                <View style={[styles.chip, styles.chipFlat]}>
                  <Icon name="home-outline" size={scaleFont(12)} color={COLORS.gradientStart} />
                  <Text style={[styles.chipText, styles.chipTextFlat]} numberOfLines={1}>
                    Flat {flatNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Contact */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Contact</Text>

              {showCall && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={handleCall}
                  onLongPress={() => handleCopy(phone, 'Phone number')}
                  activeOpacity={0.6}
                >
                  <View style={styles.infoIconCircle}>
                    <Icon name="call" size={scaleFont(15)} color={COLORS.gradientStart} />
                  </View>
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleCopy(phone, 'Phone number')}
                    style={styles.infoCopyBtn}
                  >
                    <Icon name="copy-outline" size={scaleFont(15)} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {showCall && showEmail && <View style={styles.infoDivider} />}

              {showEmail && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={handleEmail}
                  onLongPress={() => handleCopy(email, 'Email address')}
                  activeOpacity={0.6}
                >
                  <View style={styles.infoIconCircle}>
                    <Icon name="mail" size={scaleFont(15)} color={COLORS.gradientStart} />
                  </View>
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleCopy(email, 'Email address')}
                    style={styles.infoCopyBtn}
                  >
                    <Icon name="copy-outline" size={scaleFont(15)} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {!showCall && !showEmail && (
                <Text style={styles.infoEmpty}>No contact details available.</Text>
              )}
            </View>

            {/* Address — shows if flatNumber or full address exists */}
            {hasAddress && (
              <View style={styles.infoCard}>
                <View style={styles.addressHeaderRow}>
                  <Text style={styles.infoCardTitle}>Address</Text>
                  <TouchableOpacity
                    onPress={handleDirections}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.directionsPill}
                  >
                    <Icon name="navigate-outline" size={scaleFont(12)} color={COLORS.gradientStart} />
                    <Text style={styles.directionsPillText}>Directions</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.addressBlockRow}>
                  <View style={styles.infoIconCircle}>
                    <Icon name="location" size={scaleFont(15)} color={COLORS.gradientStart} />
                  </View>
                  <Text style={styles.addressBlockText}>
                    {flatNumber ? `${flatNumber}, ` : ''}
                    {fullAddress !== 'Not provided' ? fullAddress : 'No full address provided'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {(showCall || showEmail) && (
            <View style={[styles.sheetActions, { paddingBottom: insets.bottom + scaleHeight(12) }]}>
              {showCall && (
                <TouchableOpacity
                  style={[styles.sheetActionPrimary, !isOnline && styles.sheetActionDisabled]}
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
                    <Icon name="call" size={scaleFont(17)} color={COLORS.white} />
                    <Text style={styles.sheetActionText}>Call</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {showEmail && (
                <TouchableOpacity
                  style={[
                    showCall ? styles.sheetActionIconBtn : styles.sheetActionPrimary,
                    !isOnline && styles.sheetActionDisabled,
                  ]}
                  onPress={handleEmail}
                  disabled={!isOnline}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.sheetActionGradient,
                      styles.sheetActionOutline,
                      !showCall && { paddingHorizontal: scaleWidth(8) },
                    ]}
                  >
                    <Icon name="mail-outline" size={scaleFont(17)} color={COLORS.gradientStart} />
                    {!showCall && (
                      <Text style={[styles.sheetActionText, styles.sheetActionOutlineText]}>Email</Text>
                    )}
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
  const phone = member.phoneNumber?.trim() || '';
  const email = member.email?.trim() || '';

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to send an email.');
      return;
    }
    if (email) Linking.openURL(`mailto:${email}`);
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
        <Text style={styles.memberRole}>{member.role || 'Member'}</Text>
      </View>

      <View style={styles.memberActions}>
        {!!phone && (
          <TouchableOpacity
            style={[styles.memberActionBtn, !isOnline && styles.memberActionDisabled]}
            onPress={handleCall}
            disabled={!isOnline}
            activeOpacity={0.7}
          >
            <Icon name="call-outline" size={scaleFont(16)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
          </TouchableOpacity>
        )}
        {!!email && (
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

// ─── Helper: map provider to member-like object ────────────────────────────
const mapProviderToMember = (provider) => {
  const user = provider?.user || {};


  const mapped = {
    _id: provider._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    profileImage: user.profileImage || null,
    role: user.role === 'provider' ? 'Provider' : 'Member',
    communityCommunName: user.communityCommunName || 'Public',
    flatNumber: user.flatNumber || '',
    addressLine1: user.addressLine1 || '',
    addressLine2: user.addressLine2 || '',
    city: user.city || '',
    state: user.state || '',
    zip: user.zip || '',
  };
  return mapped;
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const DirectoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Pagination state ──
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // ── Client-side pagination for regular members ──
  const [visibleCount, setVisibleCount] = useState(VISIBLE_INCREMENT);

  // ── Ref to store previous member IDs string for comparison ──
  const prevMemberIdsRef = useRef('');

  // ── Ref for FlatList and scroll index preservation ──
  const flatListRef = useRef(null);
  const firstVisibleIndexRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);
  const isPublicMember = user?.isPublicMember ?? false;

  const shouldUsePublicQuery = isPublicMember;
  const shouldUseSecretaryQuery = isSecretary && !shouldUsePublicQuery;

  const shouldShowMissing =
    !isSecretary && !isPublicMember && !userCommunityName && !communityPending;

  // ── 1) Public providers ─────────────────────────────────────────────────────
  const {
    data: allProviders = [],
    isLoading: isLoadingProviders,
    isFetching: isFetchingProviders,
    refetch: refetchProviders,
    error: providersError,
  } = useFetchAllProvidersQuery(undefined, { skip: !shouldUsePublicQuery });

  // ── 2) Secretary's own community members (paginated) ──────────────────────
  const {
    data: membersPage,
    isLoading: isLoadingSecretary,
    isFetching: isFetchingSecretary,
    refetch: refetchSecretary,
    error: secretaryError,
  } = useFetchCommunityMembersQuery(
    { page, limit: PAGE_SIZE },
    { skip: !shouldUseSecretaryQuery }
  );

  // ── 3) Regular community member directory (all members) ──────────────────
  const {
    data: directoryData,
    isLoading: isLoadingDirectory,
    isFetching: isFetchingDirectory,
    refetch: refetchDirectory,
    error: directoryError,
  } = useCommunityDirectoryQuery(undefined, {
    skip: shouldUsePublicQuery || shouldUseSecretaryQuery || shouldShowMissing || !userCommunityName,
  });

  // ── Determine loading, fetching, refetch, error ──────────────────────────
  let isLoading, isFetching, refetch, error;
  let membersList = [];
  let total = 0;
  let hasMore = false;

  if (shouldUsePublicQuery) {
    isLoading = isLoadingProviders;
    isFetching = isFetchingProviders;
    refetch = refetchProviders;
    error = providersError;
    const publicProviders = allProviders.filter(
      (p) => p.user?.isPublicMember === true && p.user?.role === 'provider'
    );
    membersList = publicProviders.map(mapProviderToMember);
    total = membersList.length;
    hasMore = false;
  } else if (shouldUseSecretaryQuery) {
    isLoading = isLoadingSecretary;
    isFetching = isFetchingSecretary;
    refetch = refetchSecretary;
    error = secretaryError;
    const users = membersPage?.users || [];
    const pagination = membersPage?.pagination || {};
    total = pagination.totalMembers || users.length;
    hasMore = pagination.hasNextPage || false;
    membersList = members; // from state
  } else {
    // Regular member branch
    isLoading = isLoadingDirectory;
    isFetching = isFetchingDirectory;
    refetch = refetchDirectory;
    error = directoryError;
    const rawMembers = directoryData?.data?.members || directoryData?.members || [];
    total = directoryData?.data?.total ||
            directoryData?.total ||
            directoryData?.data?.pagination?.total ||
            directoryData?.pagination?.total ||
            rawMembers.length;
    hasMore = false;
    membersList = rawMembers;
  }

  // ── Process secretary pagination ──────────────────────────────────────────
  useEffect(() => {
    if (shouldUseSecretaryQuery && membersPage) {
      const newMembers = membersPage.users || [];
      const pagination = membersPage.pagination || {};
      const total = pagination.totalMembers || newMembers.length;
      const hasNext = pagination.hasNextPage || false;

      const idsString = newMembers.map(m => m._id).join(',');
      if (page === 1 && idsString === prevMemberIdsRef.current) {
        return;
      }

      if (page === 1) {
        setMembers(newMembers);
      } else {
        setMembers(prev => {
          const map = new Map();
          prev.forEach(m => map.set(m._id, m));
          newMembers.forEach(m => map.set(m._id, m));
          return Array.from(map.values());
        });
      }
      setTotalMembers(total);
      setHasNextPage(hasNext);
      setIsLoadingMore(false);
      setIsFirstLoad(false);
      if (page === 1) {
        prevMemberIdsRef.current = idsString;
      }
    }
  }, [membersPage, page, shouldUseSecretaryQuery]);

  // ── For regular members, we handle total and members directly ──────────────
  useEffect(() => {
    if (!shouldUsePublicQuery && !shouldUseSecretaryQuery && directoryData) {
      const rawMembers = directoryData?.data?.members || directoryData?.members || [];
      const total = directoryData?.data?.total ||
                    directoryData?.total ||
                    directoryData?.data?.pagination?.total ||
                    directoryData?.pagination?.total ||
                    rawMembers.length;



      const idsString = rawMembers.map(m => m._id).join(',');
      if (idsString !== prevMemberIdsRef.current) {
        prevMemberIdsRef.current = idsString;
        setMembers(rawMembers);
        setTotalMembers(total);
        setHasNextPage(false);
        setIsFirstLoad(false);
      }
    }
  }, [directoryData, shouldUsePublicQuery, shouldUseSecretaryQuery]);

  // ── Filter members by search ─────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const source = shouldUsePublicQuery ? membersList : members;
    if (!term) return source;
    return source.filter((member) => {
      const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').toLowerCase();
      const flatNumber = (member.flatNumber || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      return fullName.includes(term) || flatNumber.includes(term) || email.includes(term);
    });
  }, [members, membersList, searchQuery, shouldUsePublicQuery]);

  // ── Data to display (with slicing for regular members) ──────────────────
  const displayData = useMemo(() => {
    if (shouldUsePublicQuery || shouldUseSecretaryQuery) {
      return filteredMembers;
    } else {
      return filteredMembers.slice(0, visibleCount);
    }
  }, [filteredMembers, shouldUsePublicQuery, shouldUseSecretaryQuery, visibleCount]);

  const displayCount = searchQuery.trim() ? filteredMembers.length : totalMembers;

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (shouldUsePublicQuery) return;

    // Store current first visible index
    shouldRestoreScrollRef.current = true;

    if (shouldUseSecretaryQuery) {
      if (!isOnline || isLoadingMore || isFetching || !hasNextPage) return;
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    } else {
      if (!isOnline) return;
      if (visibleCount >= members.length) return;
      setVisibleCount(prev => Math.min(prev + VISIBLE_INCREMENT, members.length));
    }
  }, [
    shouldUsePublicQuery,
    shouldUseSecretaryQuery,
    isOnline,
    isLoadingMore,
    isFetching,
    hasNextPage,
    visibleCount,
    members.length,
  ]);

  // ── Restore scroll position after data update ──
  useEffect(() => {
    if (shouldRestoreScrollRef.current && flatListRef.current) {
      const index = Math.min(firstVisibleIndexRef.current, displayData.length - 1);
      if (index >= 0 && displayData.length > 0) {
        try {
          flatListRef.current?.scrollToIndex({
            index,
            animated: false,
            viewPosition: 0,
          });
        } catch (_) {
          // ignore
        }
      }
      shouldRestoreScrollRef.current = false;
    }
  }, [displayData]);

  // ── Pull to refresh ──────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (shouldUseSecretaryQuery && page !== 1) {
      setPage(1);
    } else {
      await refetch();
    }
    setRefreshing(false);
  }, [refetch, shouldUseSecretaryQuery, page]);

  // ── Auto-refetch on reconnect ───────────────────────────────────────────
  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      if (shouldUseSecretaryQuery && page !== 1) setPage(1);
      else refetch();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetch, shouldUseSecretaryQuery, page]);

  // ── Focus refetch ──────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (isOnline && (userCommunityName || isSecretary || shouldUsePublicQuery)) {
        if (shouldUseSecretaryQuery) {
          refetch();
        } else {
          refetch();
        }
      }
    }, [isOnline, userCommunityName, isSecretary, shouldUsePublicQuery, shouldUseSecretaryQuery, refetch, page])
  );

  // ── Pending approval ──
  if (communityPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
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

  // ── Loading (first load) ──
  if (isLoading && (members.length === 0 || isFirstLoad)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <SearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showFilter={false}
          placeholder={isPublicMember ? "Search public providers..." : "Search by name, flat, email..."}
        />
        <DirectoryListSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error && !isLoading) {
    const errorMessage = error?.data?.message || error?.error || 'Failed to load directory';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.7}>
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

  const handleMemberPress = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilter={false}
        placeholder={isPublicMember ? "Search public providers..." : "Search by name, flat, email..."}
      />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
        <FlatList
          ref={flatListRef}
          data={displayData}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              isOnline={isOnline}
              onPress={() => handleMemberPress(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: scaleHeight(12) }} />}
          contentContainerStyle={[
            styles.membersList,
            { paddingBottom: insets.bottom + moderateScale(86, 0.3) },
          ]}
          ListHeaderComponent={
            <View style={styles.countContainer}>
              <Text style={styles.countText}>
                {displayCount} {isPublicMember ? 'Provider' : 'Member'}
                {displayCount !== 1 ? 's' : ''}
              </Text>
              {searchQuery.trim() && (
                <Text style={styles.countSubtext}>
                  (filtered from {totalMembers})
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={scaleFont(48)} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>
                {isPublicMember ? 'No Public Providers Found' : 'No Members Found'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {isPublicMember
                  ? 'There are no public providers available yet.'
                  : searchQuery.trim()
                    ? 'Try a different name, flat number, or email.'
                    : "Your community doesn't have any members yet."}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            const index = Math.floor(offsetY / ITEM_HEIGHT);
            firstVisibleIndexRef.current = index;
          }}
          scrollEventThrottle={16}
          ListFooterComponent={
            (() => {
              if (isLoadingMore && shouldUseSecretaryQuery) {
                return (
                  <View style={styles.footerLoader}>
                    <MemberCardSkeleton />
                  </View>
                );
              }
              if (!shouldUsePublicQuery && !shouldUseSecretaryQuery && visibleCount < filteredMembers.length) {
                return (
                  <View style={styles.footerLoader}>
                    <MemberCardSkeleton />
                  </View>
                );
              }
              return null;
            })()
          }
          getItemLayout={(data, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
                viewPosition: 0,
              });
            }, 500);
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      </NetworkAwareView>

      <MemberDetailModal
        member={selectedMember}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedMember(null);
        }}
        isOnline={isOnline}
      />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  countContainer: {
    paddingTop: scaleHeight(4),
    paddingBottom: scaleHeight(4),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  countText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  countSubtext: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginLeft: scaleWidth(6),
  },
  membersList: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(8),
  },
  footerLoader: {
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActionDisabled: {
    opacity: 0.4,
  },
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
    zIndex: 6,
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: scaleHeight(14),
    right: scaleWidth(14),
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheetHeader: {
    height: scaleHeight(90),
  },
  sheetAvatarWrap: {
    position: 'absolute',
    top: scaleHeight(90) - moderateScale(42, 0.3),
    alignSelf: 'center',
    width: moderateScale(84, 0.3),
    height: moderateScale(84, 0.3),
    borderRadius: moderateScale(42, 0.3),
    borderWidth: moderateScale(4, 0.3),
    borderColor: COLORS.white,
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.3),
    elevation: 4,
    zIndex: 5,
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
  },
  sheetAvatarInitials: {
    fontSize: scaleFont(26),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetBody: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: moderateScale(42, 0.3) + scaleHeight(12),
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
  chipFlat: {
    backgroundColor: '#E0F2FE',
  },
  chipText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  chipTextGreen: {
    color: '#16A34A',
  },
  chipTextFlat: {
    color: '#0369A1',
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
    backgroundColor: '#ffff',
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
  infoCopyBtn: {
    padding: scaleWidth(4),
  },
  infoEmpty: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    paddingVertical: scaleHeight(6),
  },
  infoDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: scaleHeight(2),
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(10),
  },
  directionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: '#ffffff',
  },
  directionsPillText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  addressBlockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressBlockText: {
    flex: 1,
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    lineHeight: moderateScale(20, 0.3),
    paddingTop: scaleHeight(6),
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
    gap: scaleWidth(8),
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(12),
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  sheetActionPrimary: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  sheetActionIconBtn: {
    width: moderateScale(52, 0.3),
    borderRadius: moderateScale(2.5),
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
    paddingHorizontal: scaleWidth(8),
  },
  sheetActionOutline: {
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
    paddingHorizontal: scaleWidth(12),
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

export default DirectoryScreen;