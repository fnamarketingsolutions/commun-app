import { Platform, Alert, Linking } from 'react-native';
import { getBundleId, getVersion } from '../utils/deviceInfoShim';

/**
 * InAppUpdateService
 *
 * Production-ready cross-platform update manager for both:
 * 1. Google Play Store (Android): Uses official Play Core bottom-sheet (FLEXIBLE / IMMEDIATE)
 * 2. Apple App Store (iOS): Checks App Store iTunes Lookup API and prompts native Update Alert
 *
 * - Zero external backend required
 * - Completely failsafe: If offline, in development, or outside stores, it never crashes
 */

let SpInAppUpdates = null;
let IAUUpdateKind = null;
let IAUInstallStatus = null;

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const inAppUpdatesModule = require('sp-react-native-in-app-updates');
    SpInAppUpdates = inAppUpdatesModule.default || inAppUpdatesModule;
    IAUUpdateKind = inAppUpdatesModule.IAUUpdateKind;
    IAUInstallStatus = inAppUpdatesModule.IAUInstallStatus;
  } catch (e) {
    if (__DEV__) {
      console.log('[InAppUpdateService] Native module not loaded:', e);
    }
  }
}

/**
 * Compares two semantic version strings (e.g. '1.0.3' vs '1.0.1').
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 == v2
 */
const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const parts1 = String(v1).split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = String(v2).split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

class InAppUpdateService {
  constructor() {
    this.inAppUpdates = null;
    this.isChecking = false;
    this.statusListener = null;
  }

  /**
   * Initializes the native Google Play update client (Android only).
   */
  init() {
    if (Platform.OS !== 'android') return;
    if (this.inAppUpdates) return;
    if (!SpInAppUpdates) return;
    try {
      this.inAppUpdates = new SpInAppUpdates(false);
    } catch (e) {
      if (__DEV__) {
        console.log('[InAppUpdateService] Android initialization error:', e);
      }
    }
  }

  /**
   * Main entrypoint to check and prompt for updates on Android or iOS.
   *
   * @param {boolean} isImmediate - true for blocking mandatory update, false for flexible
   */
  async checkAndPromptUpdate(isImmediate = false) {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      if (Platform.OS === 'android') {
        await this._checkAndroidUpdate(isImmediate);
      } else if (Platform.OS === 'ios') {
        await this._checkIOSUpdate(isImmediate);
      }
    } catch (err) {
      if (__DEV__) {
        console.log('[InAppUpdateService] Global check error:', err?.message || err);
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Handles Google Play Store In-App Updates for Android devices.
   */
  async _checkAndroidUpdate(isImmediate) {
    if (!SpInAppUpdates) return;
    this.init();
    if (!this.inAppUpdates) return;

    try {
      const currentVer = getVersion() || '1.0.3';
      const result = await this.inAppUpdates.checkNeedsUpdate({ curVersion: currentVer });

      if (result?.shouldUpdate && IAUUpdateKind) {
        if (__DEV__) {
          console.log('[InAppUpdateService] 🚀 New Google Play update available:', result);
        }

        const updateType = isImmediate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

        if (updateType === IAUUpdateKind.FLEXIBLE && IAUInstallStatus) {
          this.statusListener = (downloadStatus) => {
            if (downloadStatus?.status === IAUInstallStatus.DOWNLOADED) {
              if (__DEV__) {
                console.log('[InAppUpdateService] ✅ Play Store download complete. Applying install...');
              }
              try {
                this.inAppUpdates.installUpdate();
              } catch (_) {}
            }
          };
          this.inAppUpdates.addStatusUpdateListener(this.statusListener);
        }

        await this.inAppUpdates.startUpdate({ updateType });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[InAppUpdateService] Android Play Core check response:', error?.message || error);
      }
    }
  }

  /**
   * Handles Apple App Store updates for iOS devices.
   * Directly checks iTunes Lookup API and displays an Apple-standard Alert.
   */
  async _checkIOSUpdate(isImmediate) {
    try {
      const bundleId = getBundleId();
      const currentVersion = getVersion();

      // Query Apple App Store iTunes Lookup API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(
        `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&timestamp=${Date.now()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.resultCount === 0 || !data.results?.[0]) {
        if (__DEV__) {
          console.log('[InAppUpdateService] No published iOS version found on App Store yet for:', bundleId);
        }
        return;
      }

      const storeApp = data.results[0];
      const storeVersion = storeApp.version;
      const trackViewUrl = storeApp.trackViewUrl || `https://apps.apple.com/app/id${storeApp.trackId}`;

      const needsUpdate = compareVersions(storeVersion, currentVersion) > 0;

      if (needsUpdate) {
        if (__DEV__) {
          console.log(`[InAppUpdateService] 🚀 iOS App Store update found: v${storeVersion} (current: v${currentVersion})`);
        }

        if (isImmediate) {
          Alert.alert(
            'Update Required',
            `A new version (${storeVersion}) of Commun is required to continue. Please update from the App Store.`,
            [
              {
                text: 'Update Now',
                onPress: () => Linking.openURL(trackViewUrl),
              },
            ],
            { cancelable: false }
          );
        } else {
          Alert.alert(
            'Update Available',
            `A new version (${storeVersion}) of Commun is available on the App Store. Would you like to update now?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Update Now',
                onPress: () => Linking.openURL(trackViewUrl),
              },
            ]
          );
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[InAppUpdateService] iOS update check skipped:', error?.message || error);
      }
    }
  }
}

export const inAppUpdateService = new InAppUpdateService();
export default inAppUpdateService;
