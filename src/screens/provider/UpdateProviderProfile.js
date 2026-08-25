// screens/provider/UpdateProviderProfileScreen.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';

import { setUser } from '../../redux/slices/authSlice';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchMyProviderProfileQuery,
  useUpdateProviderProfileMutation,
} from '../../redux/service/providerApi';
import {
  useUpdateProfileMutation,
  useLazyCheckAuthQuery,
  useChangePasswordMutation,
} from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { JoinCommunityModal } from '../../components/JoinCommunityModal';
import { ROUTES } from '../../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Format community handle → display name ────────────────────────────────
const formatCommunityLabel = (commName) => {
  if (!commName || commName === '__other__') return '';
  return commName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ── Password strength helper ─────────────────────────────────────────────────
const getStrength = (pwd) => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: 'Weak', color: '#EF4444', width: '25%' };
  if (score === 2) return { label: 'Fair', color: '#F59E0B', width: '50%' };
  if (score === 3) return { label: 'Good', color: '#3B82F6', width: '75%' };
  return { label: 'Strong', color: '#22C55E', width: '100%' };
};

// ── Password Input ───────────────────────────────────────────────────────────
const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  editable = true,
}) => {
  const [show, setShow] = useState(false);
  return (
    <View style={passwordFieldStyles.group}>
      <Text style={passwordFieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {label}
      </Text>
      <View style={[passwordFieldStyles.wrap, !editable && passwordFieldStyles.wrapDisabled]}>
        {leftIcon && <View style={passwordFieldStyles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={[passwordFieldStyles.input, !editable && passwordFieldStyles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!show}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="none"
          editable={editable}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
        <TouchableOpacity
          onPress={() => setShow(v => !v)}
          style={passwordFieldStyles.eyeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!editable}
        >
          <Icon
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={scaleFont(20)}
            color={!editable ? COLORS.textMuted : COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const passwordFieldStyles = StyleSheet.create({
  group: { marginBottom: moderateScale(14, 0.3) },
  label: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    marginBottom: scaleHeight(6),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    minHeight: moderateScale(50, 0.3),
  },
  wrapDisabled: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  iconLeft: { marginRight: scaleWidth(8) },
  input: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(12) : scaleHeight(8),
    fontWeight: FONTS.weightMedium,
    paddingLeft: moderateScale(4, 0.3),
  },
  inputDisabled: { color: COLORS.textMuted },
  eyeBtn: { padding: moderateScale(4, 0.3), marginLeft: moderateScale(4, 0.3) },
});

// ── Reusable field ────────────────────────────────────────────────────────────
const Field = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, style, editable = true }) => (
  <View style={[fieldStyles.wrap, style]}>
    <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
    <View style={[fieldStyles.inputWrap, !editable && fieldStyles.inputWrapDisabled]}>
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secureTextEntry || false}
        autoCapitalize="none"
        editable={editable}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      />
    </View>
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: moderateScale(14, 0.3) },
  label: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    marginBottom: moderateScale(6, 0.3),
  },
  inputWrap: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: moderateScale(14, 0.3),
    justifyContent: 'center',
    minHeight: moderateScale(48, 0.3),
  },
  inputWrapDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  input: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? moderateScale(12, 0.3) : moderateScale(8, 0.3),
  },
  inputDisabled: {
    color: COLORS.textMuted,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
const UpdateProviderProfile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const authUser = useSelector((state) => state.auth.user);

  const {
    data: providerProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
    isFetching: isFetchingProfile,
  } = useFetchMyProviderProfileQuery();

  const [updateProviderProfile, { isLoading: isSavingBio }] = useUpdateProviderProfileMutation();
  const [updateUserProfile, { isLoading: isSavingUser }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [triggerCheckAuth] = useLazyCheckAuthQuery();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        triggerCheckAuth();
        refetchProfile();
      }
    }, [isOnline, triggerCheckAuth, refetchProfile])
  );

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to refresh.');
      return;
    }
    setIsRefreshing(true);
    try {
      await Promise.all([triggerCheckAuth(), refetchProfile()]);
    } catch (_) {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, triggerCheckAuth, refetchProfile]);

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          triggerCheckAuth();
          refetchProfile();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, triggerCheckAuth, refetchProfile]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [flatNumber, setFlatNumber] = useState(''); // NEW
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [stateFld, setStateFld] = useState('');
  const [zip, setZip] = useState('');

  const [bio, setBio] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const strength = getStrength(newPassword);

  const [pickedImage, setPickedImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);

  const accountStatus = authUser?.accountStatus || 'approved';
  const isPending = accountStatus === 'pending';
  const isPublicMember = authUser?.isPublicMember || !authUser?.communityCommunName || authUser?.communityCommunName === '__other__';
  const communityLabel = authUser?.communityLabel
    || authUser?.community?.label
    || formatCommunityLabel(authUser?.communityCommunName)
    || null;

  const showCommunityName = !isPublicMember && !isPending && communityLabel;
  const showPending = isPending && !isPublicMember;
  const showJoinButton = isPublicMember && !isPending;

  useEffect(() => {
    if (authUser) {
      setFirstName(authUser.firstName || '');
      setLastName(authUser.lastName || '');
      setEmail(authUser.email || '');
      setPhone(authUser.phoneNumber || '');
      setFlatNumber(authUser.flatNumber || ''); // NEW
      setAddress1(authUser.addressLine1 || '');
      setAddress2(authUser.addressLine2 || '');
      setCity(authUser.city || '');
      setStateFld(authUser.state || '');
      setZip(authUser.zip || '');
    }
  }, [authUser]);

  useEffect(() => {
    if (providerProfile?.bio != null) {
      setBio(providerProfile.bio);
    }
  }, [providerProfile?.bio]);

  const displayAvatar = imageRemoved
    ? null
    : pickedImage
    ? pickedImage.uri
    : authUser?.profileImage || null;

  const hasData = !!authUser || !!providerProfile;
  const showOfflineBanner = !isOnline && hasData;

  const handlePickImage = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Choose from Library',
        onPress: () => {
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
            response => {
              if (response.didCancel || response.errorCode) return;
              const asset = response.assets?.[0];
              if (asset) {
                setPickedImage({ uri: asset.uri, type: asset.type, fileName: asset.fileName });
                setImageRemoved(false);
              }
            },
          );
        },
      },
      displayAvatar
        ? {
            text: 'Remove Photo',
            style: 'destructive',
            onPress: () => {
              setPickedImage(null);
              setImageRemoved(true);
            },
          }
        : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean));
  };

  const handleSave = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to save changes.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing Fields', 'First name and last name are required.');
      return;
    }
    if (isSavingUser || isSavingBio) return;

    try {
      const userFormData = new FormData();
      userFormData.append('firstName', firstName.trim());
      userFormData.append('lastName', lastName.trim());
      userFormData.append('phoneNumber', phone.trim());
      userFormData.append('flatNumber', flatNumber.trim()); // NEW
      userFormData.append('addressLine1', address1.trim());
      userFormData.append('addressLine2', address2.trim());
      userFormData.append('city', city.trim());
      userFormData.append('state', stateFld.trim());
      userFormData.append('zip', zip.trim());

      if (pickedImage) {
        userFormData.append('profileImage', {
          uri: pickedImage.uri,
          type: pickedImage.type || 'image/jpeg',
          name: pickedImage.fileName || 'profile.jpg',
        });
      } else if (imageRemoved) {
        userFormData.append('removeProfileImage', 'true');
      }

      const userResult = await updateUserProfile(userFormData).unwrap();

      if (bio !== providerProfile?.bio) {
        await updateProviderProfile({ bio }).unwrap();
      }

      if (userResult?.user) {
        dispatch(setUser(userResult.user));
      } else {
        await triggerCheckAuth();
      }

      Alert.alert('Profile Updated', 'Your changes have been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Unable to save profile. Please try again.');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change your password.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Missing Field', 'Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Same Password', 'New password must be different from current password.');
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      Alert.alert('Password Changed ✓', 'Your password has been updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to change password. Please try again.');
    }
  };

  const handleJoinSuccess = useCallback((updatedUser) => {
    if (updatedUser) {
      dispatch(setUser(updatedUser));
    }
    setShowJoinModal(false);
    navigation?.replace(ROUTES.PENDING);
  }, [dispatch, navigation]);

  if (isLoadingProfile && !providerProfile && !hasData) {
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
            Update Profile
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          {!isOnline ? (
            <>
              <Icon name="cloud-offline-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No internet connection.
              </Text>
              <TouchableOpacity onPress={refetchProfile} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={COLORS.gradientStart} />
              <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Loading your profile...
              </Text>
            </>
          )}
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
          Update Profile
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={showOfflineBanner}
          message="You are offline. Please connect to the internet to save changes."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: insets.bottom + moderateScale(100, 0.3),
                paddingTop: scaleHeight(16),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.gradientStart}
              />
            }>

            {/* ── Avatar – no ring, no tick ── */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {(firstName?.[0] || '').toUpperCase()}{(lastName?.[0] || '').toUpperCase()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.cameraBtn, !isOnline && { opacity: 0.5 }]}
                  activeOpacity={0.8}
                  onPress={handlePickImage}
                  disabled={!isOnline}>
                  <View style={styles.cameraBtnInner}>
                    <Icon name="camera-outline" size={scaleFont(16)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {firstName} {lastName}
              </Text>
              <Text style={styles.avatarTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Top Tier Community Provider
              </Text>
            </View>

            {/* ── Community Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="home-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Community
                </Text>
              </View>

              {showCommunityName && (
                <Field
                  label="Community Name"
                  value={communityLabel}
                  editable={false}
                  style={{ marginBottom: 0 }}
                />
              )}

              {showPending && (
                <View style={styles.joinRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.joinRowTitle, { color: '#D97706' }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Pending Approval
                    </Text>
                    <Text style={styles.joinRowSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {authUser?.requestedCommunityName
                        ? `Your request to join ${authUser.requestedCommunityName} is being reviewed.`
                        : 'Your community join request is being reviewed by the secretary.'}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Pending
                    </Text>
                  </View>
                </View>
              )}

              {showJoinButton && (
                <View style={styles.joinRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.joinRowTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Not linked to a community
                    </Text>
                    <Text style={styles.joinRowSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {authUser?.requestedCommunityName
                        ? `You signed up with: ${authUser.requestedCommunityName}`
                        : 'Join a community to connect with your neighbours.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowJoinModal(true)}
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

            {/* Provider Bio */}
            <Text style={styles.sectionHeading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Provider Bio
            </Text>
            <View style={styles.card}>
              <View style={fieldStyles.wrap}>
                <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Bio (max 500 characters)
                </Text>
                <View style={[fieldStyles.inputWrap, { height: moderateScale(110, 0.3), alignItems: 'flex-start' }, !isOnline && fieldStyles.inputWrapDisabled]}>
                  <TextInput
                    style={[fieldStyles.input, { height: moderateScale(90, 0.3), textAlignVertical: 'top' }, !isOnline && fieldStyles.inputDisabled]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell clients about yourself and your services..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    maxLength={500}
                    editable={isOnline}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  />
                </View>
              </View>
            </View>

            {/* ── Security / Password Change ── */}
            <Text style={styles.sectionHeading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Security
            </Text>
            <View style={styles.card}>
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                leftIcon={<Icon name="key-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
                editable={isOnline}
              />

              <PasswordInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Create new password"
                leftIcon={<MaterialIcon name="lock-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                inputRef={newPasswordRef}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                editable={isOnline}
              />

              {newPassword.length > 0 && strength && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: strength.width, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {strength.label}
                  </Text>
                </View>
              )}

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type new password"
                leftIcon={<MaterialIcon name="lock-check-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                inputRef={confirmPasswordRef}
                returnKeyType="done"
                editable={isOnline}
              />

              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <View style={styles.mismatchRow}>
                  <Icon name="alert-circle-outline" size={scaleFont(14)} color="#EF4444" />
                  <Text style={styles.mismatchText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Passwords do not match
                  </Text>
                </View>
              )}
              {confirmPassword.length > 0 && newPassword === confirmPassword && (
                <View style={styles.matchRow}>
                  <Icon name="checkmark-circle-outline" size={scaleFont(14)} color="#22C55E" />
                  <Text style={styles.matchText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Passwords match
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePasswordUpdate}
                activeOpacity={0.85}
                disabled={isChangingPassword || !isOnline}
                style={styles.pwBtnWrap}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.pwBtn, (isChangingPassword || !isOnline) && { opacity: 0.6 }]}>
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Icon
                        name="shield-checkmark-outline"
                        size={scaleFont(18)}
                        color={COLORS.white}
                        style={{ marginRight: moderateScale(8, 0.3) }}
                      />
                      <Text style={styles.pwBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {isOnline ? 'Update Password' : 'No Internet'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Personal Information */}
            <Text style={styles.sectionHeading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Personal Information
            </Text>
            <View style={styles.card}>
              <Field label="First Name" value={firstName} onChangeText={setFirstName} editable={isOnline} />
              <Field label="Last Name" value={lastName} onChangeText={setLastName} editable={isOnline} />
              <Field
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={false}
              />
              <Field
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={isOnline}
              />
              <Field
                label="Flat / House Number" // NEW
                value={flatNumber}
                onChangeText={setFlatNumber}
                placeholder="e.g. A-101, Block 2"
                editable={isOnline}
              />
              <Field label="Address Line 1" value={address1} onChangeText={setAddress1} editable={isOnline} />
              <Field label="Address Line 2" value={address2} onChangeText={setAddress2} editable={isOnline} />

              <View style={styles.rowFields}>
                <View style={{ flex: 2, marginRight: moderateScale(10, 0.3) }}>
                  <Field label="City" value={city} onChangeText={setCity} editable={isOnline} />
                </View>
                <View style={{ flex: 1, marginRight: moderateScale(10, 0.3) }}>
                  <Field label="State" value={stateFld} onChangeText={setStateFld} editable={isOnline} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Zip" value={zip} onChangeText={setZip} keyboardType="number-pad" editable={isOnline} />
                </View>
              </View>
            </View>
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, moderateScale(14, 0.3)) }]}>
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSavingUser || isSavingBio || !isOnline}
          style={styles.saveWrap}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, (isSavingUser || isSavingBio || !isOnline) && { opacity: 0.6 }]}>
            {(isSavingUser || isSavingBio) ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Save Changes' : 'No Internet'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <JoinCommunityModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
        isOnline={isOnline}
      />
    </SafeAreaView>
  );
};

// ─── Styles – updated back button color ──────────────────────────────────────
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
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
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
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: scaleHeight(24),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: scaleHeight(14),
  },
  avatar: {
    width: moderateScale(102, 0.3),
    height: moderateScale(102, 0.3),
    borderRadius: moderateScale(51, 0.3),
    borderWidth: moderateScale(3, 0.3),
    borderColor: COLORS.white,
  },
  avatarFallback: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: scaleFont(32),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -moderateScale(4, 0.3),
  },
  cameraBtnInner: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4, 0.3),
    elevation: 3,
  },
  avatarName: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightExtraBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  avatarTitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(18, 0.3),
    marginBottom: scaleHeight(20),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(14),
  },
  cardHeaderIcon: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
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
  joinRowBtnWrap: { flexShrink: 0 },
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
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: moderateScale(12, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    flexShrink: 0,
  },
  pendingBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: '#B45309',
  },
  sectionHeading: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightExtraBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(4),
  },
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(14),
    marginTop: -scaleHeight(4),
  },
  strengthBarBg: {
    flex: 1,
    height: moderateScale(5, 0.3),
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(3, 0.3),
    overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: moderateScale(3, 0.3) },
  strengthLabel: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    minWidth: moderateScale(48, 0.3),
  },
  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(12),
  },
  mismatchText: {
    fontSize: scaleFont(12),
    color: '#EF4444',
    fontWeight: FONTS.weightMedium,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(12),
  },
  matchText: {
    fontSize: scaleFont(12),
    color: '#22C55E',
    fontWeight: FONTS.weightMedium,
  },
  pwBtnWrap: {
    marginTop: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.gradientStart,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  pwBtn: {
    paddingVertical: moderateScale(14, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  bottomBar: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  saveWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.gradientStart,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  saveBtn: {
    paddingVertical: moderateScale(14, 0.3),
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default UpdateProviderProfile;