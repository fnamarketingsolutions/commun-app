import { Platform } from 'react-native';

/**
 * InAppUpdateService
 *
 * Production-ready fail-safe wrapper for Google Play In-App Updates.
 * Zero backend required: Directly communicates with Google Play Core.
 *
 * Provides native Google Play bottom sheet ("Update" vs "Not now / Remind me later").
 * - Flexible update: Downloads silently in background while user continues using app.
 * - Immediate update: Full screen flow for critical security updates.
 * - Bulletproof safety: If the native module is unavailable or running outside Play Store,
 *   it will NEVER crash the app.
 */

let SpInAppUpdates = null;
let IAUUpdateKind = null;
let IAUInstallStatus = null;

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

class InAppUpdateService {
  constructor() {
    this.inAppUpdates = null;
    this.isChecking = false;
    this.statusListener = null;
  }

  /**
   * Initializes the native Google Play update client.
   */
  init() {
    if (this.inAppUpdates) return;
    if (!SpInAppUpdates) return;
    try {
      this.inAppUpdates = new SpInAppUpdates(false);
    } catch (e) {
      if (__DEV__) {
        console.log('[InAppUpdateService] Initialization error:', e);
      }
    }
  }

  /**
   * Checks Google Play Store for newer version code.
   * If available, triggers the native Google Play bottom sheet.
   *
   * @param {boolean} isImmediate - true for blocking full-screen update, false for flexible (recommended)
   */
  async checkAndPromptUpdate(isImmediate = false) {
    if (Platform.OS !== 'android') return;
    if (!SpInAppUpdates) return;
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      this.init();
      if (!this.inAppUpdates) {
        this.isChecking = false;
        return;
      }

      const result = await this.inAppUpdates.checkNeedsUpdate({ curVersion: '1.0.1' });

      if (result?.shouldUpdate && IAUUpdateKind) {
        if (__DEV__) {
          console.log('[InAppUpdateService] 🚀 New Google Play update available:', result);
        }

        const updateType = isImmediate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

        // On flexible updates, listen for download completion
        if (updateType === IAUUpdateKind.FLEXIBLE && IAUInstallStatus) {
          this.statusListener = (downloadStatus) => {
            if (downloadStatus?.status === IAUInstallStatus.DOWNLOADED) {
              if (__DEV__) {
                console.log('[InAppUpdateService] ✅ Update download complete. Applying install...');
              }
              try {
                this.inAppUpdates.installUpdate();
              } catch (_) {}
            }
          };
          this.inAppUpdates.addStatusUpdateListener(this.statusListener);
        }

        // Trigger official Google Play bottom sheet with "Update" & "Later" options
        await this.inAppUpdates.startUpdate({
          updateType,
        });
      }
    } catch (error) {
      // In DEV, unreleased builds, or outside Play Store, Play Core returns code -10
      // This is normal and must NEVER crash the app.
      if (__DEV__) {
        console.log('[InAppUpdateService] Update check response:', error?.message || error);
      }
    } finally {
      this.isChecking = false;
    }
  }
}

export const inAppUpdateService = new InAppUpdateService();
export default inAppUpdateService;
