import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { scaleWidth, scaleHeight, scaleFont, moderateScale } from '../utils/responsive';
import { useUpdateProfileMutation } from '../redux/service/api';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { setUser } from '../redux/slices/authSlice';

const MAX_FONT = 1.3;
const BOTTOM_TAB_HEIGHT = moderateScale(70, 0.3);

const LocationEditModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [flatNumber, setFlatNumber] = useState(user?.flatNumber || '');
  const communityName = user?.communityCommunName || user?.requestedCommunityName || '';

  const {
    addressLine1, setAddressLine1,
    city, setCity,
    state, setState,
    zip, setZip,
    isLocating,
    locationError,
    permissionDenied,
    isOnline,
    requestLocation,
    resetFields,
    openSettings,
  } = useDeviceLocation({
    addressLine1: user?.addressLine1 || '',
    city: user?.city || '',
    state: user?.state || '',
    zip: user?.zip || '',
  });

  useEffect(() => {
    if (visible) {
      resetFields({
        addressLine1: user?.addressLine1 || '',
        city: user?.city || '',
        state: user?.state || '',
        zip: user?.zip || '',
      });
      setFlatNumber(user?.flatNumber || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to save your address.');
      return;
    }
    if (!addressLine1.trim()) { Alert.alert('Address Required', 'Please enter your street address.'); return; }
    if (!city.trim())         { Alert.alert('City Required',    'Please enter your city.');           return; }
    if (!state.trim())        { Alert.alert('State Required',   'Please enter your state.');          return; }
    if (!zip.trim())          { Alert.alert('Zip Code Required','Please enter your zip code.');       return; }

    const formData = new FormData();
    formData.append('addressLine1', addressLine1.trim());
    formData.append('city',         city.trim());
    formData.append('state',        state.trim());
    formData.append('zip',          zip.trim());
    formData.append('flatNumber',   flatNumber.trim());

    try {
      const result = await updateProfile(formData).unwrap();
      dispatch(setUser(result.user));
      onClose();
    } catch (err) {
      Alert.alert('Unable to Save', err?.data?.message || 'Could not update your address. Please try again.');
    }
  }, [addressLine1, city, state, zip, flatNumber, isOnline, updateProfile, dispatch, onClose]);

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + BOTTOM_TAB_HEIGHT + scaleHeight(16) }]}>
            <View style={styles.grabber} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} maxFontSizeMultiplier={MAX_FONT}>
                Change Your Address
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={scaleFont(22)} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: BOTTOM_TAB_HEIGHT + scaleHeight(16) },
              ]}
            >
              {/* ── Use current location ── */}
              <TouchableOpacity
                style={styles.locateBtn}
                onPress={requestLocation}
                activeOpacity={0.7}
                disabled={!isOnline || isLocating}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.locateBtnGradient}
                >
                  {isLocating ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Icon name="locate-outline" size={scaleFont(18)} color={COLORS.white} />
                      <Text style={styles.locateBtnText} maxFontSizeMultiplier={MAX_FONT}>
                        {isOnline ? 'Use Current Location' : 'No Internet'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {locationError ? (
                <View style={styles.errorBanner}>
                  <Icon name="information-circle-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                  <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT}>{locationError}</Text>
                </View>
              ) : null}

              {permissionDenied ? (
                <View style={styles.errorBanner}>
                  <Icon name="information-circle-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                  <View style={styles.errorBannerBody}>
                    <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT}>
                      Location access denied. Enter your address manually, or update permission in Settings.
                    </Text>
                    <TouchableOpacity onPress={openSettings} style={styles.settingsLink}>
                      <Text style={styles.settingsLinkText} maxFontSizeMultiplier={MAX_FONT}>Open Settings</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* ── Flat Number ── */}
              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>Flat / Unit *</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="A-101, Block 2"
                  placeholderTextColor={COLORS.textMuted}
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT}
                />
              </View>

              {/* ── Community Name ── */}
              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>Community</Text>
              <View style={styles.lockedField}>
                <Text style={styles.lockedFieldText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT}>
                  {communityName || '—'}
                </Text>
                <Icon name="lock-closed-outline" size={scaleFont(15)} color={COLORS.textMuted} />
              </View>

              {/* ── Street Address ── */}
              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>Street Address *</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="123 Main St"
                  placeholderTextColor={COLORS.textMuted}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>City *</Text>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      placeholder="Mumbai"
                      placeholderTextColor={COLORS.textMuted}
                      value={city}
                      onChangeText={setCity}
                      editable={isOnline}
                      maxFontSizeMultiplier={MAX_FONT}
                    />
                  </View>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>State *</Text>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      placeholder="Maharashtra"
                      placeholderTextColor={COLORS.textMuted}
                      value={state}
                      onChangeText={setState}
                      editable={isOnline}
                      maxFontSizeMultiplier={MAX_FONT}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT}>Zip Code *</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="400001"
                  placeholderTextColor={COLORS.textMuted}
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="numeric"
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT}
                />
              </View>

              {/* ── Save ── */}
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                style={styles.saveBtnWrapper}
                disabled={isLoading || !isOnline}
              >
                <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveBtnText} maxFontSizeMultiplier={MAX_FONT}>
                      {isOnline ? 'Save Address' : 'No Internet'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 27, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    maxHeight: '88%',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(24, 0.2),
    borderTopRightRadius: moderateScale(24, 0.2),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(10),
    ...SHADOW.card,
  },
  grabber: {
    alignSelf: 'center',
    width: moderateScale(40, 0.2),
    height: moderateScale(4, 0.2),
    borderRadius: moderateScale(2, 0.2),
    backgroundColor: COLORS.inputBg,
    marginBottom: scaleHeight(12),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(20),
  },
  sheetTitle: {
    fontSize: scaleFont(FONTS.heading - 2),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingBottom: scaleHeight(8),
  },

  // ── Locate button ──
  locateBtn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    overflow: 'hidden',
    marginBottom: scaleHeight(10),
    ...SHADOW.button,
  },
  locateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(13, 0.2),
    gap: moderateScale(8),
  },
  locateBtnText: {
    fontSize: scaleFont(FONTS.button - 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  // ── Errors ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.2),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    marginBottom: scaleHeight(10),
    gap: moderateScale(8),
  },
  errorBannerBody: {
    flex: 1,
  },
  errorText: {
    fontSize: scaleFont(FONTS.small),
    color: COLORS.textSecondary,
    flex: 1,
  },
  settingsLink: {
    marginTop: scaleHeight(4),
  },
  settingsLinkText: {
    fontSize: scaleFont(FONTS.small),
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
  },

  // ── Labels / fields ──
  label: {
    fontSize: scaleFont(FONTS.label),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(6, 0.2),
    marginTop: scaleHeight(4),
  },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(12, 0.2),
    minHeight: moderateScale(46, 0.2),
    marginBottom: scaleHeight(14),
  },
  lockedFieldText: {
    flex: 1,
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textMuted,
  },
  inputField: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    minHeight: moderateScale(46, 0.2),
    justifyContent: 'center',
    marginBottom: scaleHeight(14),
  },
  input: {
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textPrimary,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    gap: scaleWidth(12),
  },
  halfField: { flex: 1 },

  // ── Save ──
  saveBtnWrapper: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    marginTop: scaleHeight(12),
  },
  saveBtn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(14, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: scaleFont(FONTS.button + 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3),
  },
});

export default LocationEditModal;