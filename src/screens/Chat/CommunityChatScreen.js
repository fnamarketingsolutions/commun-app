// screens/Chat/CommunityChatScreen.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';

import {
  useFetchInterestCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from '../../redux/service/interestCommunityApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const isPendingError = (error) => {
  const msg = error?.data?.message || '';
  return (
    msg.toLowerCase().includes('pending') ||
    msg.toLowerCase().includes('approval') ||
    msg.toLowerCase().includes('secretary')
  );
};

const CommunityChatScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);

  const shouldShowCommunityMissing = !isSecretary && !userCommunityName && !communityPending;

  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);

  const {
    data: communities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchInterestCommunitiesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const [joinCommunity] = useJoinCommunityMutation();
  const [leaveCommunity, { isLoading: isLeaving }] = useLeaveCommunityMutation();

  useFocusEffect(
    useCallback(() => {
      if (isOnline && userCommunityName) {
        refetch();
      }
    }, [isOnline, userCommunityName, refetch])
  );

  useEffect(() => {
    if (isOnline && userCommunityName && !communityPending) {
      refetch();
    }
  }, [isOnline, userCommunityName, communityPending, refetch]);

  const wasOfflineRef = React.useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current && userCommunityName) {
      refetch();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, userCommunityName, refetch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) return;
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch, isOnline]);

  const handleJoin = async (communityId) => {
    if (!isOnline) {
      Alert.alert('You\u2019re offline', 'Connect to the internet to join this community.');
      return;
    }
    setJoiningId(communityId);
    try {
      await joinCommunity(communityId).unwrap();
      await refetch();
      navigation.navigate('ChatRoom', { interestCommunityId: communityId });
    } catch (err) {
      Alert.alert(
        'Unable to join',
        err?.data?.message || 'Something went wrong while joining this community. Please try again.'
      );
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (communityId, communityName) => {
    if (!isOnline) {
      Alert.alert('You\u2019re offline', 'Connect to the internet to leave this community.');
      return;
    }
    Alert.alert(
      `Leave ${communityName}?`,
      'You can join again anytime from the Community Chat list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeavingId(communityId);
            try {
              await leaveCommunity(communityId).unwrap();
              await refetch();
            } catch (err) {
              Alert.alert('Error', err?.data?.message || 'Could not leave community.');
            } finally {
              setLeavingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenChat = (communityId) => {
    navigation.navigate('ChatRoom', { interestCommunityId: communityId });
  };

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
    </TouchableOpacity>
  );

  if (shouldShowCommunityMissing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          {renderBackButton()}
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Chat
          </Text>
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
          <Text style={styles.communityMissingTitle} maxFontSizeMultiplier={1.3}>
            No Official Community
          </Text>
          <Text style={styles.communityMissingSubtitle} maxFontSizeMultiplier={1.3}>
            You are not part of any official community yet. Join one to access community chats.
          </Text>
          <TouchableOpacity
            style={styles.joinCommunityButton}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText} maxFontSizeMultiplier={1.3}>
                Join a Community
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && isPendingError(error)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          {renderBackButton()}
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community Chat
          </Text>
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
          <Text style={styles.pendingTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Waiting for Approval
          </Text>
          <Text style={styles.pendingMessage} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Your community secretary is reviewing your request. Community Chat will unlock once you're approved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        {renderBackButton()}
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Community Chat
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerDivider} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.gradientStart} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {error?.data?.message || 'Failed to load communities.'}
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          {communities.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="chatbubbles-outline" size={scaleFont(48)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No active communities yet.
              </Text>
              <Text style={styles.emptySubtext} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Check back when your secretary creates one.
              </Text>
            </View>
          ) : (
            communities.map((community) => {
              if (!community?._id) return null;

              const isJoining = joiningId === community._id;
              const isLeaving = leavingId === community._id;
              const isJoined = community.joined === true;

              return (
                <View key={community._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <Icon name="people" size={scaleFont(18)} color={COLORS.gradientStart} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.communityName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {community.name}
                      </Text>
                      <Text style={styles.memberCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {community.memberCount} members from your Commun
                      </Text>
                    </View>
                  </View>

                  {isJoined ? (
                    <View style={styles.joinedActions}>
                      <TouchableOpacity
                        style={styles.openChatBtnWrap}
                        activeOpacity={0.85}
                        onPress={() => handleOpenChat(community._id)}
                      >
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.openChatBtn}
                        >
                          <Text style={styles.openChatBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                            Open Chat
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.leaveBtn, isLeaving && styles.disabledBtn]}
                        activeOpacity={0.7}
                        onPress={() => handleLeave(community._id, community.name)}
                        disabled={isLeaving}
                      >
                        {isLeaving ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Text style={styles.leaveBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                            Leave
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinBtn, isJoining && styles.disabledBtn]}
                      activeOpacity={0.85}
                      onPress={() => handleJoin(community._id)}
                      disabled={isJoining}
                    >
                      {isJoining ? (
                        <ActivityIndicator size="small" color={COLORS.gradientStart} />
                      ) : (
                        <Text style={styles.joinBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Join
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ─── Styles – fixed button minHeight to prevent clipping ────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    position: 'absolute',
    left: scaleWidth(16),
    padding: moderateScale(4),
    zIndex: 1,
  },
  headerSpacer: {
    width: scaleWidth(24),
  },
  headerTitle: {
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white ?? '#ffff',
    paddingHorizontal: scaleWidth(32),
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  errorText: {
    marginTop: scaleHeight(12),
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: scaleHeight(16),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(10),
  },
  emptyText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(14),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(14),
  },
  iconCircle: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  cardHeaderText: {
    flex: 1,
  },
  communityName: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  memberCount: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  joinedActions: {
    flexDirection: 'row',
    gap: scaleWidth(10),
    alignItems: 'center',
    minHeight: moderateScale(44, 0.3),
  },
  openChatBtnWrap: {
    flex: 2,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    minHeight: moderateScale(44, 0.3),
  },
  openChatBtn: {
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(44, 0.3),
  },
  openChatBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  leaveBtn: {
    flex: 1,
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: '#EF4444',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    minHeight: moderateScale(44, 0.3),
  },
  leaveBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: '#EF4444',
  },
  joinBtn: {
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(44, 0.3),
  },
  joinBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  communityMissingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    paddingBottom: scaleHeight(30),
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
    color: COLORS.textMuted,
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

export default CommunityChatScreen;