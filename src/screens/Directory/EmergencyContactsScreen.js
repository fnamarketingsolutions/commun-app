import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useCommunityEmergencyContactsQuery } from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { getUserCommunityName, isCommunityPending } from '../../utils/communityHelpers';
import { ROUTES } from '../../navigations/routes';

// Place this PNG in ../../assets/icons/shield-check.png
const ICON_SHIELD_CHECK = require('../../assets/images/shield-check.png');

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Contact Card ─────────────────────────────────────────────────────────────
const ContactCard = ({ contact, isOnline }) => {
  const phoneNumber = contact.phone?.trim();

  const handleCall = () => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Connect to the internet to make a call.');
      return;
    }
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactIconWrap}>
          <Image source={ICON_SHIELD_CHECK} style={styles.contactIconImage} resizeMode="contain" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {contact.title}
          </Text>
          {contact.name ? (
            <Text style={styles.contactName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {contact.name}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.contactPhone} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {contact.phone || 'No phone'}
      </Text>

      {contact.notes ? (
        <Text style={styles.contactNotes} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {contact.notes}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.callButton, !phoneNumber && styles.callButtonDisabled]}
        onPress={handleCall}
        disabled={!phoneNumber || !isOnline}
        activeOpacity={0.7}
      >
        <Icon
          name="call-outline"
          size={scaleFont(16)}
          color={phoneNumber && isOnline ? COLORS.primaryLight : COLORS.textMuted}
        />
        <Text
          style={[styles.callButtonText, !phoneNumber && styles.callButtonTextDisabled]}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          Call
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const EmergencyContactsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  const user = useSelector(state => state.auth.user);
  const userCommunityName = getUserCommunityName(user);
  // FIX 1: secretary has communName not communityCommunName — getUserCommunityName
  // returns empty for them, causing the "No Community" screen to flash before
  // we redirect. Detect secretary first and redirect immediately.
  const isSecretary = user?.role === 'secretary' || user?.userType === 'secretary';
  const communityPending = useMemo(() => isCommunityPending(user), [user]);
  const shouldShowMissing = !isSecretary && !userCommunityName && !communityPending;

  // ── Redirect secretary to their own screen ──
  useEffect(() => {
    if (isSecretary) {
      navigation.replace(ROUTES.SECRETARY_EMERGENCY_CONTACTS);
    }
  }, [isSecretary, navigation]);

  const {
    data: responseBody,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useCommunityEmergencyContactsQuery(undefined, {
    // FIX 2: also skip when secretary so we don't fire wrong API call
    skip: isSecretary || !userCommunityName || shouldShowMissing,
  });

  // FIX 4: the backend wraps its payload in an extra envelope —
  // { success: true, data: { contacts, needsCommunity, communityCommunName } }.
  // The query result (`responseBody`) is that whole envelope, so the actual
  // fields live one level deeper at `responseBody.data`, not on
  // `responseBody` directly. Reading `responseBody.contacts` was always
  // undefined, which silently fell back to an empty array even when the
  // backend had returned real contacts (confirmed via debug logging).
  const contacts = responseBody?.data?.contacts || [];
  const needsCommunity = responseBody?.data?.needsCommunity || false;

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Auto-refetch on focus ──
  useFocusEffect(
    useCallback(() => {
      if (isOnline && userCommunityName && !isSecretary) {
        refetch();
      }
    }, [isOnline, userCommunityName, isSecretary, refetch])
  );

  // ── Auto-refetch on reconnect ──
  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current && !isSecretary) {
      refetch();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, isSecretary, refetch]);

  // ── Secretary: render nothing while redirect fires ──
  if (isSecretary) return null;

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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
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
            Your community secretary is reviewing your request. Emergency contacts will unlock once you're approved.
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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
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
            You are not part of any official community yet. Join one to access emergency contacts.
          </Text>
          <TouchableOpacity
            style={styles.joinCommunityButton}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            activeOpacity={0.7}
          >
            <Text style={styles.joinButtonText}>Join a Community</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // FIX 3: isLoading && !isFetching is always false — isLoading implies isFetching
  // on the very first fetch. Correct condition is just isLoading.
  if (isLoading && contacts.length === 0) {
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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
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
    let errorMessage = 'Failed to load emergency contacts';
    if (error?.data?.message) errorMessage = error.data.message;
    else if (error?.error) errorMessage = error.error;
    else if (error?.status) errorMessage = 'Unable to connect to server. Please try again later.';
    else if (typeof error === 'string') errorMessage = error;

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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main content ──
  const showOfflineBanner = !isOnline && contacts.length > 0;

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
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>
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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Image source={ICON_SHIELD_CHECK} style={styles.sectionIconImage} resizeMode="contain" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              <Text style={styles.sectionSubtitle}>
                {userCommunityName
                  ? `Showing contacts for ${userCommunityName}.`
                  : 'Emergency contacts are available for your joined community.'}
              </Text>
            </View>
          </View>

          {(needsCommunity || !userCommunityName) && (
            <View style={styles.needsCommunityBanner}>
              <Icon name="information-circle-outline" size={scaleFont(18)} color="#92400E" />
              <Text style={styles.needsCommunityText}>
                You are not part of a community yet, so emergency contacts from other communities will not be shown.
              </Text>
            </View>
          )}

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Image source={ICON_SHIELD_CHECK} style={styles.emptyStateImage} resizeMode="contain" />
              <Text style={styles.emptyStateTitle}>No Emergency Contacts</Text>
              <Text style={styles.emptyStateSubtitle}>
                Your community secretary hasn't added any emergency contacts yet. Check back later.
              </Text>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {contacts.map((contact) => (
                <ContactCard key={contact._id} contact={contact} isOnline={isOnline} />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>
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
  container: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
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
    minWidth: scaleWidth(100),
    backgroundColor: COLORS.primaryLight,
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(24),
    alignItems: 'center',
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(16),
  },
  sectionIcon: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    borderRadius: moderateScale(12, 0.3),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconImage: {
    width: moderateScale(24, 0.3),
    height: moderateScale(24, 0.3),
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
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
    marginBottom: scaleHeight(16),
  },
  needsCommunityText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#92400E',
    lineHeight: moderateScale(18, 0.3),
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(10),
  },
  emptyStateImage: {
    width: moderateScale(56, 0.3),
    height: moderateScale(56, 0.3),
    opacity: 0.5,
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
    lineHeight: moderateScale(20, 0.3),
  },

  contactsList: {
    gap: scaleHeight(14),
  },

  // ── Contact Card ──
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(16, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.03,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(6),
  },
  contactIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconImage: {
    width: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  contactName: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  contactPhone: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginVertical: scaleHeight(4),
  },
  contactNotes: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(10),
    lineHeight: moderateScale(18, 0.3),
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(6),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(10, 0.3),
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.white,
  },
  callButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  callButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.primaryLight,
  },
  callButtonTextDisabled: {
    color: COLORS.textMuted,
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
    width: '100%',
    maxWidth: scaleWidth(250),
    backgroundColor: COLORS.primaryLight,
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

export default EmergencyContactsScreen;