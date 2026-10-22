import { Platform } from 'react-native';
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
} from 'sp-react-native-in-app-updates';

/**
 * InAppUpdateService
 *
 * Production-ready wrapper for Google Play In-App Updates.
 * Zero backend required: Directly communicates with Google Play Core.
 *
 * Provides native Google Play bottom sheet ("Update" vs "Not now / Remind me later").
 * - Flexible update: Downloads silently in background while user continues using app.
 * - Immediate update: Full screen flow for critical security updates.
 * - Graceful fallback: Errors in DEV, debug builds, or offline mode are caught safely.
 */
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
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      this.init();
      if (!this.inAppUpdates) {
        this.isChecking = false;
        return;
      }

      const result = await this.inAppUpdates.checkNeedsUpdate();

      if (result?.shouldUpdate) {
        if (__DEV__) {
          console.log('[InAppUpdateService] 🚀 New Google Play update available:', result);
        }

        const updateType = isImmediate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

        // On flexible updates, listen for download completion
        if (updateType === IAUUpdateKind.FLEXIBLE) {
          this.statusListener = (downloadStatus) => {
            if (downloadStatus?.status === IAUInstallStatus.DOWNLOADED) {
              if (__DEV__) {
                console.log('[InAppUpdateService] ✅ Update download complete. Applying install...');
              }
              // Completes the update without requiring user to leave the app
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
      } else {
        if (__DEV__) {
          console.log('[InAppUpdateService] App is up to date with Google Play Store.');
        }
      }
    } catch (error) {
      // In DEV, unreleased builds, or when testing without Play Store install, Play Core returns code -10
      // This is expected and must NEVER crash the app.
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
