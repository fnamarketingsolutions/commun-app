// theme.js — Single source of truth for all design tokens
// Import this in every screen to guarantee consistency
import { Platform } from 'react-native';

export const COLORS = {
  primary: '#7C3AED',          // purple (updated)
  primaryLight: '#A855F7',
  gradientStart: '#73469B',          // deep purple → pink gradient (buttons) (updated)
  gradientEnd: '#D5599E',          // brighter pink/magenta (updated)
  background: '#F5F3FF',          // light lavender background (updated slightly)
  card: '#FFFFFF',
  inputBg: '#F3F0FF',
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  link: '#7C3AED',          // matched to new primary
  border: '#E5E7EB',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

// ─── LOGO ──────────────────────────────────────────────────────────────────
export const LOGO = {
  size: 64,
  containerSize: 80,
  borderRadius: 20,
};

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────────
export const FONTS = {
  brandName: 28,
  tagline: 11,
  heading: 26,
  body: 14,
  label: 13,
  input: 14,
  button: 16,
  link: 14,
  small: 12,

  weightBold: '700',
  weightSemiBold: '600',
  weightMedium: '500',
  weightRegular: '400',

  // Platform-specific font family — System font is the most reliable choice
  // for both platforms. Override with a custom font name once assets are bundled.
  family: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

// ─── LINE HEIGHTS ──────────────────────────────────────────────────────────
// Use these alongside FONTS.* to ensure consistent vertical rhythm.
// Values are in dp (not scaled) — apply scaleFont() if you need them scaled.
export const LINE_HEIGHTS = {
  small:   16,
  body:    20,
  label:   18,
  heading: 34,
  caption: 14,
};

// ─── GLOBAL FONT SCALE CAP ─────────────────────────────────────────────────
// Apply as maxFontSizeMultiplier on all <Text> components to prevent
// OS accessibility font size settings from breaking layouts.
// Import this instead of re-declaring 1.3 in every screen.
export const MAX_FONT_SCALE = 1.3;

// ─── SPACING ───────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── RADIUS ────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// ─── SHADOW FACTORIES ──────────────────────────────────────────────────────
// Platform-split shadow helpers.
// On Android, elevation is the ONLY reliable shadow mechanism.
// Colored shadowColor on Android only works on API 28+ and is unreliable.
// On iOS, all shadow properties work as expected.

/**
 * createCardShadow(color?)
 * Returns a platform-appropriate card shadow style object.
 * @param {string} [color='#7C3AED'] - Shadow color (iOS only)
 * @param {number} [elevation=6]     - Android elevation
 */
export const createCardShadow = (color = '#7C3AED', elevation = 6) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation,
    },
  });

/**
 * createButtonShadow(color?)
 * Returns a platform-appropriate button shadow style object.
 * @param {string} [color='#000000'] - Shadow color (iOS only)
 * @param {number} [elevation=8]     - Android elevation
 */
export const createButtonShadow = (color = '#000000', elevation = 8) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation,
    },
  });

// ─── SHADOWS ───────────────────────────────────────────────────────────────
// Legacy shadow objects (kept for backward compatibility).
// Prefer createCardShadow() / createButtonShadow() in new code.
export const SHADOW = {
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  button: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 8,
    },
    default: {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
};