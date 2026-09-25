// hooks/useDeviceLocation.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, Linking, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoder-reborn';

import { useNetworkStatus } from './useNetworkStatus';
import { addressFromPlacemark, logLocationOnScreen } from '../utils/placemarkAddress';

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
        const address = addressFromPlacemark(results[0]);
        logLocationOnScreen({ latitude: lat, longitude: lng, raw: results[0], address });
        setAddressLine1(address.addressLine1);
        setCity(address.city);
        setState(address.state);
        setZip(address.zip);
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
        // This library's iOS method is requestAuthorization. requestPermission
        // does not exist, so the call threw and every tap showed the settings error.
        const permission = await Geolocation.requestAuthorization('whenInUse');
        hasPermission = permission === 'granted';
        if (permission === 'disabled' && isMounted.current) {
          setLocationError('Location services are turned off. Please check your settings.');
          setIsLocating(false);
          return;
        }
      }

      if (!hasPermission) {
        if (isMounted.current) {
          setPermissionDenied(true);
          setIsLocating(false);
        }
        return;
      }

      const readPosition = (enableHighAccuracy) => new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout: 20000,
            maximumAge: 0,
            distanceFilter: 0,
            accuracy: { ios: 'best', android: 'high' },
          },
        );
      });

      let position;
      try {
        position = await readPosition(true);
      } catch (error) {
        // Simulator and indoor GPS often have no precise fix. A coarse reading still fills the address.
        if (error?.code === 2 || error?.code === 3) {
          position = await readPosition(false);
        } else {
          throw error;
        }
      }

      if (!isMounted.current) return;
      const { latitude, longitude } = position.coords;
      reverseGeocode(latitude, longitude);
    } catch (err) {
      console.warn('Location request error:', err);
      if (!isMounted.current) return;
      let message = 'Unable to access location services. Please check your settings.';
      if (err?.code === 1) message = 'Permission denied. Please enable location in settings.';
      else if (err?.code === 2) message = 'Location unavailable. Please turn on GPS.';
      else if (err?.code === 3) message = 'Location request timed out. Please try again.';
      setLocationError(message);
      setIsLocating(false);
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