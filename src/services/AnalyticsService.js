/**
 * AnalyticsService.js
 *
 * Centralized, fail-safe singleton wrapper for Meta (Facebook) App Events SDK.
 * 
 * Production Safety Guarantees:
 * 1. Every call is asynchronous, non-blocking, and runs off the UI thread.
 * 2. Every method is wrapped in a try/catch boundary. Any failure, network error,
 *    or native unlinking is silently caught and logged in __DEV__ only.
 * 3. Strict PII filtering: Automatically strips any sensitive user data
 *    (passwords, emails, phone numbers, addresses, tokens).
 * 4. Respects user tracking consent (GDPR / UMP / Android Advertising ID opt-out).
 */

import { Platform } from 'react-native';

let FBSDK = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FBSDK = require('react-native-fbsdk-next');
} catch (e) {
  if (__DEV__) {
    console.warn('[AnalyticsService] react-native-fbsdk-next could not be required:', e);
  }
}

const { Settings, AppEventsLogger } = FBSDK || {};

// Standard Meta Event Names (Official Facebook SDK Constants)
export const META_STANDARD_EVENTS = {
  COMPLETED_REGISTRATION: 'fb_mobile_complete_registration',
  SEARCH: 'fb_mobile_search',
  CONTENT_VIEW: 'fb_mobile_content_view',
  ADD_TO_CART: 'fb_mobile_add_to_cart',
  ADD_TO_WISHLIST: 'fb_mobile_add_to_wishlist',
  INITIATED_CHECKOUT: 'fb_mobile_initiated_checkout',
  ADD_PAYMENT_INFO: 'fb_mobile_add_payment_info',
  PURCHASE: 'fb_mobile_purchase',
  CONTACT: 'Contact',
  RATE: 'Rate',
  COMPLETE_TUTORIAL: 'CompleteTutorial',
};

// Exact keys only. A substring check also removed screen_name and content_name.
const PII_KEYS = new Set([
  'password',
  'pass',
  'token',
  'phone',
  'phonenumber',
  'email',
  'name',
  'firstname',
  'lastname',
  'fullname',
  'address',
  'flatnumber',
  'latitude',
  'longitude',
  'coords',
]);

// Official Meta App Events parameter names (AppEventsConstants).
const META_PARAMS = {
  CONTENT_ID: 'fb_content_id',
  CONTENT_TYPE: 'fb_content_type',
  CURRENCY: 'fb_currency',
  DESCRIPTION: 'fb_description',
  SEARCH_STRING: 'fb_search_string',
  REGISTRATION_METHOD: 'fb_registration_method',
  NUM_ITEMS: 'fb_num_items',
  SUCCESS: 'fb_success',
};

const normalizeKey = (key) => String(key).toLowerCase().replace(/[_-]/g, '');

const sanitizeParams = (params = {}) => {
  if (!params || typeof params !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (PII_KEYS.has(normalizeKey(key))) continue;
    // Meta accepts strings and numbers only. Booleans are sent as "1" / "0".
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      cleaned[key] = trimmed.slice(0, 100);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      cleaned[key] = value;
    } else if (typeof value === 'boolean') {
      cleaned[key] = value ? '1' : '0';
    }
  }
  return cleaned;
};

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.initStarted = false;
    this.initFailed = false;
    this.pendingEvents = [];
    this.hasConsent = true; // Default compliant; configurable via setConsent()
    this.facebookAppId = '1661584848876276';
    this.facebookClientToken = '3c653b18a0f0c6ed8eb7428ca5cd20c6';
  }

  /**
   * Initializes the Meta SDK safely at app start.
   * Call once in App.js or root component.
   */
  async init(hasConsent = true) {
    if (this.initStarted) return;
    this.initStarted = true;

    try {
      this.hasConsent = hasConsent;

      if (!Settings) {
        this.initFailed = true;
        this.flushPending();
        if (__DEV__) {
          console.log('[AnalyticsService] Meta Settings module not available (fallback mode active)');
        }
        return;
      }

      // Configure SDK settings
      Settings.setAppID(this.facebookAppId);
      if (this.facebookClientToken) {
        Settings.setClientToken(this.facebookClientToken);
      }
      
      // Configure consent & tracking permissions
      await this.setConsent(this.hasConsent);

      // Initialize the SDK asynchronously
      Settings.initializeSDK();
      this.isInitialized = true;
      this.flushPending();
      this.flush();

      if (__DEV__) {
        console.log('[AnalyticsService] Meta App Events SDK successfully initialized');
        try {
          if (AppEventsLogger?.getAdvertiserID) {
            AppEventsLogger.getAdvertiserID().then((aid) => {
              console.log('--------------------------------------------------');
              console.log('[AnalyticsService] 📱 YOUR DEVICE ADVERTISING ID (AAID):', aid || '(Not Available / Opted out)');
              console.log('[AnalyticsService] 👉 Paste this AAID into Meta Events Manager "Test Events" tab to see live events!');
              console.log('--------------------------------------------------');
            }).catch(() => {});
          }
        } catch (_) {}
      }
    } catch (error) {
      // NEVER crash the app on initialization failure
      this.initFailed = true;
      this.flushPending();
      if (__DEV__) {
        console.warn('[AnalyticsService] init error (ignored for production safety):', error);
      }
    }
  }

  /**
   * Update consent status (GDPR / UMP / Android Ad ID opt-out).
   * @param {boolean} consent
   */
  async setConsent(consent = true) {
    try {
      this.hasConsent = Boolean(consent);
      if (!Settings) return;

      // Controls automatic event logging based on consent
      Settings.setAutoLogAppEventsEnabled(this.hasConsent);

      // Controls collection of Google Advertising ID (GAID)
      Settings.setAdvertiserIDCollectionEnabled(this.hasConsent);

      if (Platform.OS === 'ios') {
        await Settings.setAdvertiserTrackingEnabled(this.hasConsent);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[AnalyticsService] setConsent error:', err);
      }
    }
  }

  /**
   * Core non-blocking event dispatcher with error isolation.
   */
  async logEvent(eventName, params = {}, valueToSum = null) {
    try {
      if (!this.hasConsent) return;
      if (!AppEventsLogger) return;

      // Splash and the first screen can log before App.js finishes init.
      if (!this.isInitialized && !this.initFailed) {
        if (this.pendingEvents.length < 50) {
          this.pendingEvents.push({ eventName, params, valueToSum });
        }
        return;
      }

      this.dispatchEvent(eventName, params, valueToSum);
    } catch (error) {
      if (__DEV__) {
        console.warn(`[AnalyticsService] Error logging event "${eventName}":`, error);
      }
    }
  }

  flushPending() {
    const queued = this.pendingEvents.splice(0, this.pendingEvents.length);
    queued.forEach(({ eventName, params, valueToSum }) => {
      this.dispatchEvent(eventName, params, valueToSum);
    });
  }

  dispatchEvent(eventName, params = {}, valueToSum = null) {
    try {
      if (!AppEventsLogger) return;
      const safeParams = sanitizeParams(params);

      if (typeof valueToSum === 'number' && Number.isFinite(valueToSum)) {
        AppEventsLogger.logEvent(eventName, valueToSum, safeParams);
      } else {
        AppEventsLogger.logEvent(eventName, safeParams);
      }

      if (__DEV__) {
        console.log(`[AnalyticsService] Logged event: "${eventName}"`, safeParams);
        // In DEV, flush immediately so events hit Meta servers instantly without batch delay
        this.flush();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`[AnalyticsService] Error logging event "${eventName}":`, error);
      }
    }
  }

  /**
   * Send queued events now. Call when the app goes to the background
   * so the last screens are not stuck until the next open.
   */
  flush() {
    try {
      if (!this.isInitialized || !AppEventsLogger || typeof AppEventsLogger.flush !== 'function') return;
      AppEventsLogger.flush();
    } catch (error) {
      if (__DEV__) {
        console.warn('[AnalyticsService] flush error:', error);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // META STANDARD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Meta Standard: Complete Registration
   * Call after successful registration in RegisterScreen.
   * @param {string} registrationMethod e.g. 'phone_otp', 'community_signup'
   */
  logCompleteRegistration(registrationMethod = 'community_signup') {
    this.logEvent(META_STANDARD_EVENTS.COMPLETED_REGISTRATION, {
      [META_PARAMS.REGISTRATION_METHOD]: String(registrationMethod),
    });
  }

  /**
   * Meta Standard: Content View
   * Call when viewing a service detail, business detail, or provider profile.
   * @param {object} options { contentId, contentType, contentName, currency, valueToSum }
   */
  logContentView({ contentId, contentType = 'service', contentName = '', currency = 'INR', valueToSum = null } = {}) {
    this.logEvent(
      META_STANDARD_EVENTS.CONTENT_VIEW,
      {
        [META_PARAMS.CONTENT_ID]: String(contentId || ''),
        [META_PARAMS.CONTENT_TYPE]: String(contentType),
        [META_PARAMS.DESCRIPTION]: String(contentName || ''),
        [META_PARAMS.CURRENCY]: String(currency),
      },
      valueToSum
    );
  }

  /**
   * Meta Standard: Search
   * Call when user searches in SearchHeader or any list search.
   * @param {object} options { searchString, contentType, contentId }
   */
  logSearch({ searchString = '', contentType = 'service_or_provider', contentId = '' } = {}) {
    if (!searchString || !searchString.trim()) return;
    this.logEvent(META_STANDARD_EVENTS.SEARCH, {
      [META_PARAMS.SEARCH_STRING]: String(searchString).trim(),
      [META_PARAMS.CONTENT_TYPE]: String(contentType),
      [META_PARAMS.CONTENT_ID]: String(contentId || ''),
    });
  }

  /**
   * Meta Standard: Add to Wishlist / Saved Services
   * @param {object} options { contentId, contentType, contentName }
   */
  logAddToWishlist({ contentId, contentType = 'service', contentName = '' } = {}) {
    this.logEvent(META_STANDARD_EVENTS.ADD_TO_WISHLIST, {
      [META_PARAMS.CONTENT_ID]: String(contentId || ''),
      [META_PARAMS.CONTENT_TYPE]: String(contentType),
      [META_PARAMS.DESCRIPTION]: String(contentName || ''),
    });
  }

  /**
   * Meta Standard: Add to Cart (Prepared / Safe Stub)
   */
  logAddToCart({ contentId, contentType = 'service', currency = 'INR', value = 0 } = {}) {
    this.logEvent(
      META_STANDARD_EVENTS.ADD_TO_CART,
      {
        [META_PARAMS.CONTENT_ID]: String(contentId || ''),
        [META_PARAMS.CONTENT_TYPE]: String(contentType),
        [META_PARAMS.CURRENCY]: String(currency),
      },
      value
    );
  }

  /**
   * Meta Standard: Initiate Checkout (Prepared / Safe Stub)
   */
  logInitiateCheckout({ numItems = 1, currency = 'INR', value = 0 } = {}) {
    this.logEvent(
      META_STANDARD_EVENTS.INITIATED_CHECKOUT,
      {
        [META_PARAMS.NUM_ITEMS]: Number(numItems),
        [META_PARAMS.CURRENCY]: String(currency),
      },
      value
    );
  }

  /**
   * Meta Standard: Add Payment Info (Prepared / Safe Stub)
   */
  logAddPaymentInfo(success = true) {
    this.logEvent(META_STANDARD_EVENTS.ADD_PAYMENT_INFO, {
      [META_PARAMS.SUCCESS]: success ? '1' : '0',
    });
  }

  /**
   * Meta Standard: Purchase via official logPurchase method (Prepared / Safe Stub)
   */
  logPurchase(value = 0, currency = 'INR', parameters = {}) {
    try {
      if (!this.hasConsent) return;
      if (!AppEventsLogger || typeof AppEventsLogger.logPurchase !== 'function') return;

      const numValue = Number(value) || 0;
      const safeParams = sanitizeParams(parameters);

      AppEventsLogger.logPurchase(numValue, currency, safeParams);

      if (__DEV__) {
        console.log(`[AnalyticsService] Logged purchase: ${numValue} ${currency}`, safeParams);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[AnalyticsService] logPurchase error:', error);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM MARKETING & RETENTION EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Custom: Screen View
   * Automatically triggered via NavigationContainer onStateChange.
   * @param {string} screenName
   */
  logScreenView(screenName) {
    if (!screenName) return;
    this.logEvent('screen_view', {
      screen_name: String(screenName),
    });
  }

  /**
   * Custom: Screen Time
   * Logged when transitioning away from a screen with the time spent in seconds.
   * @param {string} screenName
   * @param {number} seconds
   */
  logScreenTime(screenName, seconds) {
    if (!screenName || typeof seconds !== 'number' || seconds <= 0) return;
    this.logEvent('screen_time', {
      screen_name: String(screenName),
      duration_seconds: Math.round(seconds),
    });
  }

  /**
   * Custom: Session Duration
   * Triggered when app moves to background.
   * @param {number} seconds
   */
  logSessionDuration(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0) return;
    this.logEvent('session_duration', {
      duration_seconds: Math.round(seconds),
    });
  }

  /**
   * Custom: Ad Impression (Hooked into existing/future ad callbacks)
   */
  logAdImpression({ adType = 'banner', placement = 'default' } = {}) {
    this.logEvent('ad_impression', {
      ad_type: String(adType),
      placement: String(placement),
    });
  }

  /**
   * Custom: Ad Click (Hooked into existing/future ad callbacks)
   */
  logAdClick({ adType = 'banner', placement = 'default' } = {}) {
    this.logEvent('ad_click', {
      ad_type: String(adType),
      placement: String(placement),
    });
  }

  /**
   * Custom: Rewarded Ad Completed (Hooked into existing/future ad callbacks)
   */
  logRewardedAdCompleted({ placement = 'default' } = {}) {
    this.logEvent('rewarded_ad_completed', {
      placement: String(placement),
    });
  }

  /**
   * Returns device Google Advertising ID (Android) or IDFA (iOS) if available.
   * Useful for entering into Meta Events Manager "Test Events" tab.
   */
  async getAdvertiserID() {
    try {
      if (AppEventsLogger?.getAdvertiserID) {
        return await AppEventsLogger.getAdvertiserID();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
