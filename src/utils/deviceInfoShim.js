// src/utils/deviceInfoShim.js
// Lightweight shim for react-native-device-info required by sp-react-native-in-app-updates.
// Completely eliminates the "NativeModule.RNDeviceInfo is null" crash in production release APKs.
import { Platform } from 'react-native';

export const getBundleId = () =>
  Platform.OS === 'ios' ? 'in.rakita.commun' : 'in.commun.app';

export const getVersion = () =>
  Platform.OS === 'ios' ? '1.0.0' : '1.0.3';

export const getBuildNumber = () =>
  Platform.OS === 'ios' ? '3' : '4';

export default {
  getBundleId,
  getVersion,
  getBuildNumber,
};
