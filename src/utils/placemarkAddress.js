import { Platform } from 'react-native';

const clean = (value) => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.toLowerCase() === 'null' ? '' : text;
};

// Apple's geocoder shortens this district to "SAS Nagar". Android spells
// the full name. Same place, so show the full name on both screens.
const expandShortPlaceName = (value) =>
  value.replace(/\bS\.?\s*A\.?\s*S\.?\s*Nagar\b/gi, 'Sahibzada Ajit Singh Nagar');

export const addressFromPlacemark = (result = {}) => {
  const locality = expandShortPlaceName(clean(result.locality));
  const district = expandShortPlaceName(clean(result.subAdminArea || result.subAdministrativeArea));
  const state = clean(result.adminArea || result.administrativeArea);
  const zip = clean(result.postalCode);
  const country = clean(result.country);
  const formatted = expandShortPlaceName(clean(result.formattedAddress));

  const place = locality || district;
  const stateAndPin = [state, zip].filter(Boolean).join(' ');
  const addressLine1 = [place, stateAndPin, country].filter(Boolean).join(', ') || formatted;

  return {
    addressLine1,
    city: place,
    state,
    zip,
  };
};

export const logLocationOnScreen = ({ latitude, longitude, raw, address }) => {
  console.log('[location] GPS from this device', {
    platform: Platform.OS,
    latitude,
    longitude,
  });
  console.log('[location] geocoder result', raw);
  console.log('[location] shown on screen', {
    streetAddress: address?.addressLine1 || '',
    city: address?.city || '',
    state: address?.state || '',
    zip: address?.zip || '',
  });
};
