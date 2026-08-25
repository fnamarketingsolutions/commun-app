// theme.js — Single source of truth for all design tokens
// Import this in every screen to guarantee consistency

export const COLORS = {
  primary:       '#7C3AED',          // purple (updated)
  primaryLight:  '#A855F7',
  gradientStart: '#73469B',          // deep purple → pink gradient (buttons) (updated)
  gradientEnd:   '#D5599E',          // brighter pink/magenta (updated)
  background:    '#F5F3FF',          // light lavender background (updated slightly)
  card:          '#FFFFFF',
  inputBg:       '#F3F0FF',
  textPrimary:   '#111111',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  link:          '#7C3AED',          // matched to new primary
  border:        '#E5E7EB',
  white:         '#FFFFFF',
  error:         '#EF4444',
  success:       '#10B981',
};

// ─── LOGO ──────────────────────────────────────────────────────────────────
export const LOGO = {
  size:          64,
  containerSize: 80,
  borderRadius:  20,
};

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────────
export const FONTS = {
  brandName:   28,
  tagline:     11,
  heading:     26,
  body:        14,
  label:       13,
  input:       14,
  button:      16,
  link:        14,
  small:       12,

  weightBold:    '700',
  weightSemiBold:'600',
  weightMedium:  '500',
  weightRegular: '400',

  family: undefined,
};

// ─── SPACING ───────────────────────────────────────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── RADIUS ────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

// ─── SHADOWS ───────────────────────────────────────────────────────────────
export const SHADOW = {
  card: {
    shadowColor:   '#7C3AED',        // updated to match new primary
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius:  16,
    elevation:     6,
  },
  button: {
    shadowColor:   '#EC4899',        // updated to match new gradientEnd
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     8,
  },
};