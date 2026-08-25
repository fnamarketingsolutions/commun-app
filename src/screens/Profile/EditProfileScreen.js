// screens/app/EditProfileScreen.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { useUpdateProfileMutation, useCheckAuthQuery } from '../../redux/service/api';
import {
  useFetchMyProviderProfileQuery,
  useUpdateProviderProfileMutation,
} from '../../redux/service/providerApi';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { JoinCommunityModal } from '../../components/JoinCommunityModal';
import { ROUTES } from '../../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const BIO_MAX_CHARS = 500;

// ─── Format community handle → display name ────────────────────────────────
const formatCommunityLabel = (commName) => {
  if (!commName || commName === '__other__') return '';
  return commName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ─── Get initials ────────────────────────────────────────────────────────────
const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  return '?';
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
const LabeledInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
  leftIcon,
  style,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  autoCapitalize = 'words',
  multiline = false,
  numberOfLines = 1,
  maxLength,
}) => (
  <View style={[fieldStyles.group, style]}>
    <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
    <View style={[fieldStyles.wrap, !editable && fieldStyles.wrapDisabled, multiline && { height: moderateScale(100, 0.3), alignItems: 'flex-start' }]}>
      {leftIcon && <View style={fieldStyles.iconLeft}>{leftIcon}</View>}
      <TextInput
        ref={inputRef}
        style={[
          fieldStyles.input,
          leftIcon && { paddingLeft: moderateScale(4, 0.3) },
          !editable && fieldStyles.inputDisabled,
          multiline && { height: moderateScale(80, 0.3), textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        editable={editable}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      />
    </View>
  </View>
);

const fieldStyles = StyleSheet.create({
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
    backgroundColor:COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    minHeight: moderateScale(50, 0.3),
  },
  wrapDisabled: {
    backgroundColor: COLORS.inputBg,
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
  },
  inputDisabled: { color: COLORS.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const EditProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [updateProfile, { isLoading: isSavingUser }] = useUpdateProfileMutation();

  // ── Provider bio ──
  const {
    data: providerProfile,
    isLoading: isLoadingProvider,
    refetch: refetchProvider,
  } = useFetchMyProviderProfileQuery(undefined, { skip: user?.role !== 'provider' });
  const [updateProviderProfile, { isLoading: isSavingBio }] = useUpdateProviderProfileMutation();

  const { isOnline } = useNetworkStatus();

  // ── Refresh control ──
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refetch: refetchUser } = useCheckAuthQuery();

  // ── Auto‑refresh on focus ──
  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchUser();
        if (user?.role === 'provider') {
          refetchProvider();
        }
      }
    }, [isOnline, refetchUser, refetchProvider, user?.role])
  );

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to refresh.');
      return;
    }
    setIsRefreshing(true);
    try {
      await Promise.all([refetchUser(), refetchProvider()]);
    } catch (_) {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, refetchUser, refetchProvider]);

  // ── Form state ──
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [flatNumber, setFlatNumber] = useState(user?.flatNumber || '');
  const [address1, setAddress1] = useState(user?.addressLine1 || '');
  const [address2, setAddress2] = useState(user?.addressLine2 || '');
  const [city, setCity] = useState(user?.city || '');
  const [stateName, setStateName] = useState(user?.state || '');
  const [zip, setZip] = useState(user?.zip || '');
  const [bio, setBio] = useState('');

  const [pickedImage, setPickedImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  // ── Populate bio from provider profile ──
  useEffect(() => {
    if (user?.role === 'provider' && providerProfile?.bio != null) {
      setBio(providerProfile.bio);
    } else if (user?.role !== 'provider') {
      setBio('');
    }
  }, [providerProfile?.bio, user?.role]);

  // ── Community join state ──
  const [showJoinModal, setShowJoinModal] = useState(false);

  // ─── COMMUNITY DISPLAY LOGIC (FIXED – includes secretary communName) ────
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

  // Current displayed avatar
  const displayAvatar = imageRemoved
    ? null
    : pickedImage
    ? pickedImage.uri
    : user?.profileImage || null;

  const lastNameRef = useRef(null);
  const phoneRef = useRef(null);
  const flatNumberRef = useRef(null);
  const address1Ref = useRef(null);
  const address2Ref = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const zipRef = useRef(null);
  const bioRef = useRef(null);

  // ── Populate form when user data changes ──
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phoneNumber || '');
      setFlatNumber(user.flatNumber || '');
      setAddress1(user.addressLine1 || '');
      setAddress2(user.addressLine2 || '');
      setCity(user.city || '');
      setStateName(user.state || '');
      setZip(user.zip || '');
    }
  }, [user]);

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
      Alert.alert('No Internet', 'Please connect to the internet and try again.');
      return;
    }

    if (!firstName.trim()) {
      Alert.alert('Missing Field', 'First name is required.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Missing Field', 'Last name is required.');
      return;
    }

    try {
      // 1. Update user profile
      const userFormData = new FormData();
      userFormData.append('firstName', firstName.trim());
      userFormData.append('lastName', lastName.trim());
      userFormData.append('phoneNumber', phone.trim());
      userFormData.append('flatNumber', flatNumber.trim());
      userFormData.append('addressLine1', address1.trim());
      userFormData.append('addressLine2', address2.trim());
      userFormData.append('city', city.trim());
      userFormData.append('state', stateName.trim());
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

      const userResult = await updateProfile(userFormData).unwrap();

      // 2. Update provider bio if user is a provider and bio changed
      if (user?.role === 'provider' && bio !== providerProfile?.bio) {
        await updateProviderProfile({ bio }).unwrap();
      }

      if (userResult?.user) {
        dispatch(setUser(userResult.user));
      }

      Alert.alert('Profile Updated ✓', 'Your profile has been saved successfully.', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to update profile. Please try again.');
    }
  };

  const renderAvatar = () => {
    if (displayAvatar) {
      return <Image source={{ uri: displayAvatar }} style={styles.avatar} />;
    }

    const initials = getInitials(firstName || user?.firstName, lastName || user?.lastName);
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatar, styles.initialsAvatar]}
      >
        <Text style={[styles.initialsText, { fontSize: scaleFont(36) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  // ─── onSuccess for the JoinCommunityModal ──
  const handleJoinSuccess = useCallback((updatedUser) => {
    if (updatedUser) {
      dispatch(setUser(updatedUser));
    }
    setShowJoinModal(false);
    navigation?.replace(ROUTES.PENDING);
  }, [dispatch, navigation]);

  const isSaving = isSavingUser || isSavingBio;

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
          Edit Profile
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={!isOnline}
          message="You are offline. Please connect to the internet to save changes."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + moderateScale(30, 0.3) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.primary}
              />
            }>

            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                {renderAvatar()}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  disabled={!isOnline}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.cameraBtnGrad}>
                    <Icon name="camera" size={scaleFont(14)} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarHint} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Tap camera to change photo
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
                <LabeledInput
                  label="Community Name"
                  value={communityLabel}
                  editable={false}
                  placeholder="—"
                  leftIcon={<Icon name="business-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                />
              )}

              {showPending && (
                <View style={styles.joinRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.joinRowTitle, { color: '#D97706' }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Pending Approval
                    </Text>
                    <Text style={styles.joinRowSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {user?.requestedCommunityName
                        ? `Your request to join ${user.requestedCommunityName} is being reviewed.`
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
                      {user?.requestedCommunityName
                        ? `You signed up with: ${user.requestedCommunityName}`
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

            {/* ── Provider Bio (only for providers) ── */}
            {user?.role === 'provider' && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <Icon name="text-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                  </View>
                  <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Provider Bio
                  </Text>
                </View>

                <LabeledInput
                  label={`Bio (max ${BIO_MAX_CHARS} characters)`}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell clients about yourself and your services..."
                  editable={isOnline}
                  multiline
                  numberOfLines={4}
                  maxLength={BIO_MAX_CHARS}
                  inputRef={bioRef}
                  returnKeyType="done"
                />
                <Text style={styles.charCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {bio.length}/{BIO_MAX_CHARS}
                </Text>
              </View>
            )}

            {/* ── Personal Info Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="person-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Personal Information
                </Text>
              </View>

              <View style={styles.nameRow}>
                <LabeledInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  style={{ flex: 1, marginRight: moderateScale(10, 0.3) }}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  editable={isOnline}
                />
                <LabeledInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  style={{ flex: 1 }}
                  inputRef={lastNameRef}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  editable={isOnline}
                />
              </View>

              <LabeledInput
                label="Email (Read-only)"
                value={user?.email || ''}
                editable={false}
                placeholder="Email"
                autoCapitalize="none"
                leftIcon={<Icon name="mail-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              />

              <LabeledInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                autoCapitalize="none"
                leftIcon={<Icon name="call-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
                inputRef={phoneRef}
                returnKeyType="next"
                onSubmitEditing={() => flatNumberRef.current?.focus()}
                editable={isOnline}
              />
            </View>

            {/* ── Flat / House Number Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="home-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Flat / House Number
                </Text>
              </View>

              <LabeledInput
                label="Flat / House Number"
                value={flatNumber}
                onChangeText={setFlatNumber}
                placeholder="e.g. A-101, Block 2"
                inputRef={flatNumberRef}
                returnKeyType="next"
                onSubmitEditing={() => address1Ref.current?.focus()}
                editable={isOnline}
                leftIcon={<Icon name="home-outline" size={scaleFont(18)} color={COLORS.textMuted} />}
              />
            </View>

            {/* ── Address Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Icon name="location-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                </View>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Address Details
                </Text>
              </View>

              <LabeledInput
                label="Address Line 1"
                value={address1}
                onChangeText={setAddress1}
                placeholder="Street address"
                inputRef={address1Ref}
                returnKeyType="next"
                onSubmitEditing={() => address2Ref.current?.focus()}
                editable={isOnline}
              />
              <LabeledInput
                label="Address Line 2 (Optional)"
                value={address2}
                onChangeText={setAddress2}
                placeholder="Apartment, suite, etc."
                inputRef={address2Ref}
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                editable={isOnline}
              />

              <View style={styles.cityRow}>
                <LabeledInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  style={{ flex: 2, marginRight: moderateScale(10, 0.3) }}
                  inputRef={cityRef}
                  returnKeyType="next"
                  onSubmitEditing={() => stateRef.current?.focus()}
                  editable={isOnline}
                />
                <LabeledInput
                  label="State"
                  value={stateName}
                  onChangeText={setStateName}
                  placeholder="ST"
                  style={{ flex: 1, marginRight: moderateScale(10, 0.3) }}
                  inputRef={stateRef}
                  returnKeyType="next"
                  onSubmitEditing={() => zipRef.current?.focus()}
                  editable={isOnline}
                />
                <LabeledInput
                  label="Zip"
                  value={zip}
                  onChangeText={setZip}
                  placeholder="00000"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  style={{ flex: 1 }}
                  inputRef={zipRef}
                  returnKeyType="done"
                  editable={isOnline}
                />
              </View>
            </View>

            {/* ── Save Button ── */}
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSaving || !isOnline}
              style={styles.saveBtnWrap}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.saveBtn, (!isOnline || isSaving) && { opacity: 0.6 }]}>
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} size="small" style={{ marginRight: moderateScale(8, 0.3) }} />
                ) : (
                  <Icon
                    name="checkmark-circle-outline"
                    size={scaleFont(20)}
                    color={COLORS.white}
                    style={{ marginRight: moderateScale(8, 0.3) }}
                  />
                )}
                <Text style={styles.saveBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isSaving ? 'Saving...' : isOnline ? 'Save Changes' : 'No Internet'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Security link ── */}
            <TouchableOpacity
              onPress={() => navigation?.navigate('Security')}
              activeOpacity={0.7}
              style={styles.securityLink}>
              <View style={[styles.securityLinkIconWrap, { marginLeft: scaleWidth(6) }]}>
                <MaterialIcon name="lock-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
              </View>
              <Text style={[styles.securityLinkText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Change password? Go to Security Settings
              </Text>
              <View style={[styles.securityLinkIconWrap, { marginRight: scaleWidth(6) }]}>
                <Icon name="chevron-forward" size={scaleFont(18)} color={COLORS.gradientStart} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

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
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
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
  scrollContent: { paddingHorizontal: scaleWidth(20) },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: scaleHeight(20),
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: scaleHeight(8),
  },
  avatar: {
    width: moderateScale(90, 0.3),
    height: moderateScale(90, 0.3),
    borderRadius: moderateScale(45, 0.3),
    borderWidth: moderateScale(3, 0.3),
    borderColor: COLORS.white,
    backgroundColor: COLORS.border,
  },
  initialsAvatar: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: moderateScale(2, 0.3),
    right: moderateScale(2, 0.3),
  },
  cameraBtnGrad: {
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    borderRadius: moderateScale(14, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.white,
  },
  avatarHint: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
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
    backgroundColor:COLORS.white,
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
  charCount: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: scaleHeight(4),
  },
  nameRow: { flexDirection: 'row' },
  cityRow: { flexDirection: 'row' },
  saveBtnWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(14),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  saveBtn: {
    paddingVertical: scaleHeight(17),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
  securityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(15, 0.3),
    paddingVertical: scaleHeight(14),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  securityLinkIconWrap: {
    width: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityLinkText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    flex: 1,
    textAlign: 'center',
  },
});

export default EditProfileScreen;