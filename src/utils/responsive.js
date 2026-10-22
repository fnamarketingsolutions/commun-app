// utils/responsive.js
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;   // design mockup width (e.g., iPhone X)
const BASE_HEIGHT = 812;  // design mockup height

// ── Pure layout scaling (screen size only — NEVER touches font scale) ──
// Use for: padding, margin, border widths/radius, icon sizes, card heights,
// spinner size, image sizes — anything that is NOT text.
const scaleWidth = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const scaleHeight = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

// ── Moderate scaling for layout dimensions ──
// Damped screen-size scaling. Still NO font scale involved — layout boxes
// should not grow just because the user increased system font size.
const moderateScale = (size, factor = 0.5) => {
  const scaled = scaleWidth(size);
  return size + (scaled - size) * factor;
};

// ── Font scaling (the ONLY place PixelRatio.getFontScale() should appear) ──
// Use for: fontSize (and optionally lineHeight).
// Capped so OS accessibility settings (which can go up to 2x–3x) don't
// blow up your UI. Tune MAX_FONT_SCALE per your design tolerance.
const MAX_FONT_SCALE = 1.3;

const scaleFont = (size) => {
  const newSize = scaleWidth(size);
  const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  return newSize * fontScale;
};

export { scaleWidth, scaleHeight, scaleFont, moderateScale, MAX_FONT_SCALE };