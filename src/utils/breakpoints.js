// utils/breakpoints.js
// ─── Single source of truth for device-class breakpoints ──────────────────────
// Import this wherever you need to make decisions based on screen size.
// Pair with useLayout() hook for reactive values.

export const BREAKPOINTS = {
  SMALL:  360,   // Very small phones (older Android)
  LARGE:  414,   // Large phones (iPhone Plus / Pro Max)
  TABLET: 768,   // Tablets / foldables in unfolded state
};

/**
 * Returns one of: 'small' | 'standard' | 'large' | 'tablet'
 * @param {number} width - Current window width in dp
 */
export const getDeviceClass = (width) => {
  if (width >= BREAKPOINTS.TABLET) return 'tablet';
  if (width >= BREAKPOINTS.LARGE)  return 'large';
  if (width < BREAKPOINTS.SMALL)   return 'small';
  return 'standard';
};

/**
 * Returns the number of grid columns for the current width.
 * @param {number} width   - Current window width in dp
 * @param {number} base    - Default column count (usually 2)
 */
export const getColumns = (width, base = 2) => {
  if (width >= BREAKPOINTS.TABLET) return base + 2;
  return base;
};

/**
 * Returns the recommended horizontal screen padding for the current width.
 * @param {number} width - Current window width in dp
 */
export const getPadding = (width) => {
  if (width >= BREAKPOINTS.TABLET) return 24;
  if (width >= BREAKPOINTS.LARGE)  return 20;
  if (width < BREAKPOINTS.SMALL)   return 14;
  return 18;
};

/**
 * Convenience boolean checkers — pass the current window width.
 */
export const isSmallDevice  = (width) => width < BREAKPOINTS.SMALL;
export const isTabletDevice = (width) => width >= BREAKPOINTS.TABLET;
export const isLargePhone   = (width) => width >= BREAKPOINTS.LARGE && width < BREAKPOINTS.TABLET;
