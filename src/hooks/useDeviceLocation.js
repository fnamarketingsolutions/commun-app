// hooks/useDeviceLocation.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, Linking, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoder-reborn';

import { useNetworkStatus } from './useNetworkStatus';

// ─────────────────────────────────────────────────────────────────────────────
// Shared device-location logic (permission request → GPS fetch → reverse
// geocode). Extracted from LocationPermissionScreen so it can be reused by
// the HomeHeader "change location" modal without duplicating the flow.
// LocationPermissionScreen itself is left untouched and keeps its own copy
// of this logic inline.
// ─────────────────────────────────────────────────────────────────────────────
export const useDeviceLocation = (initial = {}) => {
  const { isOnline } = useNetworkStatus();

  // ── Address fields ──────────────────────────────────────────────────────
  const [addressLine1, setAddressLine1] = useState(initial.addressLine1 || '');
  const [city, setCity] = useState(initial.city || '');
  const [state, setState] = useState(initial.state || '');
  const [zip, setZip] = useState(initial.zip || '');

  // ── Location fetch state ────────────────────────────────────────────────
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // ── Mount guard ──────────────────────────────────────────────────────────
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // ── Reset editable fields (used when modal re-opens with fresh user data) ─
  const resetFields = useCallback((next = {}) => {
    setAddressLine1(next.addressLine1 || '');
    setCity(next.city || '');
    setState(next.state || '');
    setZip(next.zip || '');
    setLocationError(null);
    setPermissionDenied(false);
  }, []);

  // ── Reverse geocoding ────────────────────────────────────────────────────
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

  // ── Request location ─────────────────────────────────────────────────────
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
      ('Location request error:', err);
      if (isMounted.current) {
        setLocationError('Unable to access location services. Please check your settings.');
        setIsLocating(false);
      }
    }
  }, [isOnline, isLocating, reverseGeocode]);

  return {
    // fields
    addressLine1, setAddressLine1,
    city, setCity,
    state, setState,
    zip, setZip,
    // status
    isLocating,
    locationError,
    permissionDenied,
    isOnline,
    // actions
    requestLocation,
    resetFields,
    openSettings: () => Linking.openSettings(),
  };
};