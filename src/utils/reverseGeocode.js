

import Config from 'react-native-config';

const LOCATIONIQ_API_KEY = Config.LOCATIONIQ_API_KEY;
const LOCATIONIQ_REVERSE_URL = 'https://us1.locationiq.com/v1/reverse';

/**
 * Builds a clean "line 1" from whatever house/road/locality fields LocationIQ
 * returns — different regions populate different subsets of these fields.
 */
const buildAddressLine1 = (addr = {}) => {
  const parts = [
    addr.house_number,
    addr.road || addr.pedestrian || addr.neighbourhood,
    addr.suburb,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(', ');

  // Fallback if nothing granular is available
  return addr.residential || addr.village || addr.county || '';
};

const buildCity = (addr = {}) =>
  addr.city || addr.town || addr.village || addr.county || '';

const buildState = (addr = {}) => addr.state || addr.state_district || '';

const buildZip = (addr = {}) => addr.postcode || '';

/**
 * Reverse-geocodes GPS coordinates into a plain address.
 * Resolves with: { addressLine1, city, state, zip, formatted }
 * Throws: { code: 'NO_KEY' | 'NETWORK' | 'NOT_FOUND' | 'RATE_LIMIT' | 'UNKNOWN', message }
 */
export const reverseGeocode = async ({ latitude, longitude }) => {
  if (!LOCATIONIQ_API_KEY) {
    throw { code: 'NO_KEY', message: 'Location lookup is not configured.' };
  }
  if (latitude == null || longitude == null) {
    throw { code: 'UNKNOWN', message: 'Missing coordinates.' };
  }

  const url =
    `${LOCATIONIQ_REVERSE_URL}?key=${encodeURIComponent(LOCATIONIQ_API_KEY)}` +
    `&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}` +
    `&format=json&addressdetails=1`;

  let response;
  try {
    response = await fetch(url);
  } catch (_) {
    throw { code: 'NETWORK', message: 'No internet connection. Please try again.' };
  }

  if (response.status === 429) {
    throw { code: 'RATE_LIMIT', message: 'Too many requests. Please try again in a moment.' };
  }

  if (response.status === 404) {
    throw { code: 'NOT_FOUND', message: 'Could not find an address for your location.' };
  }

  if (!response.ok) {
    throw { code: 'UNKNOWN', message: 'Could not detect your address. Please enter it manually.' };
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw { code: 'UNKNOWN', message: 'Could not read location response.' };
  }

  const addr = data?.address || {};

  return {
    addressLine1: buildAddressLine1(addr),
    city: buildCity(addr),
    state: buildState(addr),
    zip: buildZip(addr),
    formatted: data?.display_name || '',
  };
};

export default { reverseGeocode };