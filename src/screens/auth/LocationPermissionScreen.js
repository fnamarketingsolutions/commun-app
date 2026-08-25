// screens/app/LocationPermissionScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoder-reborn';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { scaleWidth, scaleHeight, scaleFont, moderateScale } from '../../utils/responsive';
import { useUpdateProfileMutation } from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { ROUTES } from '../../navigations/routes';
import { setUser } from '../../redux/slices/authSlice';

const LocationPermissionScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  // ── Lottie ref (to control play/pause) ────────────────────────────────────
  const lottieRef = useRef(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [addressLine1, setAddressLine1] = useState(user?.addressLine1 || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [zip, setZip] = useState(user?.zip || '');
  const [flatNumber, setFlatNumber] = useState(user?.flatNumber || '');

  // ── Location state ──────────────────────────────────────────────────────────
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // ── Mount guard ─────────────────────────────────────────────────────────────
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // ── Play lottie when locating ──────────────────────────────────────────────
  useEffect(() => {
    if (isLocating) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [isLocating]);

  // ── Reverse geocoding ──────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const results = await Geocoder.geocodePosition({ lat, lng });
      if (!isMounted.current) return;
      if (results && results.length > 0) {
        const result = results[0];
        setAddressLine1(
          result.streetNumber
            ? `${result.streetNumber} ${result.streetName}`
            : result.streetName || result.formattedAddress || ''
        );
        setCity(result.locality || result.subAdministrativeArea || '');
        setState(result.administrativeArea || '');
        setZip(result.postalCode || '');
        setLocationError(null);
      } else {
        setLocationError('Could not find address for this location.');
      }
    } catch (err) {
      if (isMounted.current) {
        setLocationError('Reverse geocoding failed. Please enter your address manually.');
      }
    } finally {
      if (isMounted.current) {
        setIsLocating(false);
      }
    }
  }, []);

  // ── Request location ───────────────────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to fetch location.');
      return;
    }
    if (isLocating) return;

    setIsLocating(true);
    setLocationError(null);
    setPermissionDenied(false);

    try {
      let hasPermission = false;

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to show you nearby services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const permission = await Geolocation.requestPermission('whenInUse');
        hasPermission = permission === 'granted';
      }

      if (!hasPermission) {
        if (isMounted.current) {
          setPermissionDenied(true);
          setIsLocating(false);
          Alert.alert(
            'Location Access Required',
            'Please allow location access in settings to auto‑fill your address.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted.current) return;
          const { latitude, longitude } = position.coords;
          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.warn('Location error:', error);
          if (!isMounted.current) return;
          let message = 'Unable to get your location.';
          if (error.code === 1) message = 'Permission denied. Please enable location in settings.';
          else if (error.code === 2) message = 'Location unavailable. Please turn on GPS.';
          else if (error.code === 3) message = 'Location request timed out. Please try again.';
          setLocationError(message);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch (err) {
      if (isMounted.current) {
        setLocationError('Unable to access location services. Please check your settings.');
        setIsLocating(false);
      }
    }
  }, [isOnline, isLocating, reverseGeocode]);

  // ── Auto‑fetch on mount if address fields empty ───────────────────────────
  useEffect(() => {
    if (isOnline && !user?.addressLine1 && !addressLine1 && !city && !state && !zip) {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
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
    formData.append('flatNumber',   flatNumber.trim() || user?.flatNumber || '');

    try {
      const result = await updateProfile(formData).unwrap();
      dispatch(setUser(result.user));
      navigation.reset({ index: 0, routes: [{ name: ROUTES.TABS }] });
    } catch (err) {
      Alert.alert('Unable to Save', err?.data?.message || 'Could not update profile. Please try again.');
    }
  }, [addressLine1, city, state, zip, flatNumber, isOnline, updateProfile, dispatch, navigation, user]);

  // ── Skip ──────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: ROUTES.TABS }] });
  }, [navigation]);

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={!isOnline}
          message="No internet connection. Please check your network."
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero: Lottie animation ── */}
            <View style={styles.header}>
              <View style={styles.lottieWrap}>
                <LottieView
                  ref={lottieRef}
                  source={require('../../assets/animations/Location.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={1.3}>
                Where do you live?
              </Text>
              <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
                We'll use your address to show you relevant services and providers nearby.
              </Text>
            </View>

            {/* ── Auto-locate button ── */}
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={requestLocation}
              activeOpacity={0.7}
              disabled={!isOnline || isLocating}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.locationBtnGradient}
              >
                {isLocating ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="locate-outline" size={scaleFont(19)} color={COLORS.white} />
                    <Text style={styles.locationBtnText} maxFontSizeMultiplier={1.3}>
                      {isOnline ? 'Fetch My Current Location' : 'No Internet'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Errors ── */}
            {locationError && (
              <View style={styles.errorContainer}>
                <Icon name="information-circle-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                <Text style={styles.errorText} maxFontSizeMultiplier={1.3}>{locationError}</Text>
              </View>
            )}
            {permissionDenied && (
              <View style={styles.errorContainer}>
                <Icon name="information-circle-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                <Text style={styles.errorText} maxFontSizeMultiplier={1.3}>
                  Location access denied. Please enter your address manually.
                </Text>
              </View>
            )}

            {/* ── Divider ── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText} maxFontSizeMultiplier={1.3}>OR ENTER MANUALLY</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Form ── */}
            <View style={styles.form}>
              <Text style={styles.label} maxFontSizeMultiplier={1.3}>Flat / Unit (optional)</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="A-101, Tower 3"
                  placeholderTextColor={COLORS.textMuted}
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  editable={isOnline}
                  maxFontSizeMultiplier={1.3}
                />
              </View>

              <Text style={styles.label} maxFontSizeMultiplier={1.3}>Street Address *</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="123 Main St"
                  placeholderTextColor={COLORS.textMuted}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  editable={isOnline}
                  maxFontSizeMultiplier={1.3}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label} maxFontSizeMultiplier={1.3}>City *</Text>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      placeholder="Mumbai"
                      placeholderTextColor={COLORS.textMuted}
                      value={city}
                      onChangeText={setCity}
                      editable={isOnline}
                      maxFontSizeMultiplier={1.3}
                    />
                  </View>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label} maxFontSizeMultiplier={1.3}>State *</Text>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      placeholder="Maharashtra"
                      placeholderTextColor={COLORS.textMuted}
                      value={state}
                      onChangeText={setState}
                      editable={isOnline}
                      maxFontSizeMultiplier={1.3}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label} maxFontSizeMultiplier={1.3}>Zip Code *</Text>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder="400001"
                  placeholderTextColor={COLORS.textMuted}
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="numeric"
                  editable={isOnline}
                  maxFontSizeMultiplier={1.3}
                />
              </View>
            </View>

            {/* ── Submit ── */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              style={styles.btnWrapper}
              disabled={isLoading || !isOnline}
            >
              <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
                    {isOnline ? 'Continue to Home' : 'No Internet'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} disabled={!isOnline} style={styles.skipBtn}>
              <Text style={styles.skipText} maxFontSizeMultiplier={1.3}>Skip for now</Text>
            </TouchableOpacity>
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scaleWidth(22),
    paddingVertical: scaleHeight(18),
    backgroundColor: COLORS.white,
  },

  // ── Header / Lottie ──
  header: {
    alignItems: 'center',
    marginBottom: scaleHeight(28),
  },
  lottieWrap: {
    width: moderateScale(170, 0.3),
    height: moderateScale(170, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(4),
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: scaleFont(FONTS.heading + 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(2),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scaleFont(FONTS.body - 1),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scaleHeight(6),
    lineHeight: scaleFont(FONTS.body + 6),
    maxWidth: '85%',
  },

  // ── Location button ──
  locationBtn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    overflow: 'hidden',
    marginBottom: scaleHeight(12),
    ...SHADOW.button,
  },
  locationBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(15, 0.2),
    gap: moderateScale(8),
  },
  locationBtnText: {
    fontSize: scaleFont(FONTS.button),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  // ── Errors — calm, informational tone rather than alarming red-on-red ──
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.2),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(11),
    marginBottom: scaleHeight(10),
    gap: moderateScale(8),
  },
  errorText: {
    fontSize: scaleFont(FONTS.small),
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: scaleFont(FONTS.small + 6),
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scaleHeight(18),
    gap: moderateScale(10),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    fontSize: scaleFont(FONTS.small - 1),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightSemiBold,
    letterSpacing: moderateScale(0.5),
  },

  // ── Form ──
  form: { marginTop: scaleHeight(2) },
  label: {
    fontSize: scaleFont(FONTS.label),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(6, 0.2),
  },
  inputField: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(12, 0.2),
    minHeight: moderateScale(48, 0.2),
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

  // ── Buttons ──
  btnWrapper: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    ...SHADOW.button,
    marginTop: scaleHeight(6),
  },
  btn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(15, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: scaleFont(FONTS.button + 1),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3),
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: scaleHeight(14),
    paddingVertical: scaleHeight(8),
  },
  skipText: {
    fontSize: scaleFont(FONTS.link),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
});

export default LocationPermissionScreen;