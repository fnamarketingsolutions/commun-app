// utils/useLayout.js
// ─── Reactive dimensions hook ──────────────────────────────────────────────────
// Replaces ALL module-level Dimensions.get('window') calls.
// Consumers automatically re-render when:
//   • Screen rotates (landscape ↔ portrait)
//   • Foldable phone unfolds / folds
//   • App enters split-screen mode (Android)
//
// Usage:
//   const { width, height, isTablet, isSmall, CARD_W, GRID_W } = useLayout();

import { useMemo } from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BREAKPOINTS } from './breakpoints';

const BASE_WIDTH  = 375; // iPhone X design base
const BASE_HEIGHT = 812;
const MAX_FONT_SCALE = 1.3;

/**
 * useLayout()
 *
 * Returns reactive layout values that update on orientation/fold/split-screen changes.
 *
 * @returns {{
 *   width: number,
 *   height: number,
 *   isSmall: boolean,
 *   isMedium: boolean,
 *   isLarge: boolean,
 *   isTablet: boolean,
 *   isLandscape: boolean,
 *   insets: import('react-native-safe-area-context').EdgeInsets,
 *   scale: (size: number) => number,
 *   scaleH: (size: number) => number,
 *   moderate: (size: number, factor?: number) => number,
 *   font: (size: number) => number,
 *   CARD_W: number,
 *   GRID_W: number,
 *   BANNER_H: number,
 *   SLIDE_W: number,
 *   HORIZONTAL_PAD: number,
 * }}
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    // ── Device class booleans ───────────────────────────────────────────────
    const isSmall     = width < BREAKPOINTS.SMALL;
    const isTablet    = width >= BREAKPOINTS.TABLET;
    const isLarge     = width >= BREAKPOINTS.LARGE && !isTablet;
    const isMedium    = !isSmall && !isLarge && !isTablet;
    const isLandscape = width > height;

    // ── Scaling helpers (same logic as responsive.js but reactive) ──────────
    const scale     = (size) => (width / BASE_WIDTH) * size;
    const scaleH    = (size) => (height / BASE_HEIGHT) * size;
    const moderate  = (size, factor = 0.5) => {
      const scaled = scale(size);
      return size + (scaled - size) * factor;
    };
    const font = (size) => {
      const newSize  = scale(size);
      const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
      return newSize * fontScale;
    };

    // ── Horizontal padding by device class ─────────────────────────────────
    const HORIZONTAL_PAD = isTablet ? 24 : isLarge ? 20 : isSmall ? 14 : 18;

    // ── Derived layout values used across multiple screens ──────────────────
    // Card width for HomeScreen provider/service cards
    const CARD_W = isTablet
      ? width * 0.35
      : isSmall
      ? width * 0.65
      : width * 0.58;

    // Grid cell width for 2-column grids (ServicesScreen, SharedCards)
    // Accounts for horizontal padding (×2) + gap between columns (12)
    const GRID_W = isTablet
      ? (width - HORIZONTAL_PAD * 2 - 12 * 2) / 3  // 3-col on tablet
      : (width - HORIZONTAL_PAD * 2 - 12) / 2;       // 2-col everywhere else

    // Banner carousel height
    const BANNER_H = isTablet
      ? moderate(260, 0.3)
      : moderate(200, 0.3);

    // Banner slide width (matches HomeBannerCarousel padding: 18px each side)
    const SLIDE_W = width - scale(36);

    return {
      width,
      height,
      isSmall,
      isMedium,
      isLarge,
      isTablet,
      isLandscape,
      insets,
      scale,
      scaleH,
      moderate,
      font,
      CARD_W,
      GRID_W,
      BANNER_H,
      SLIDE_W,
      HORIZONTAL_PAD,
    };
  }, [width, height, insets]);
}

export default useLayout;
