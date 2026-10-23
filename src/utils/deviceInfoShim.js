// src/utils/deviceInfoShim.js
// Lightweight shim for react-native-device-info required by sp-react-native-in-app-updates.
// Completely eliminates the "NativeModule.RNDeviceInfo is null" crash in production release APKs.

export const getBundleId = () => 'in.commun.app';
export const getVersion = () => '1.0.1';
export const getBuildNumber = () => '2';

export default {
  getBundleId,
  getVersion,
  getBuildNumber,
};
