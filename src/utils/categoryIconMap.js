// utils/categoryIconMap.js
//
// Backend stores Lucide icon names (see ALLOWED_CATEGORY_ICONS in the
// server's utils/categoryIcons.js). The app renders icons via
// react-native-vector-icons/Ionicons, so this maps each allowed Lucide
// name to its closest Ionicons equivalent. Keep this in sync with the
// backend's ALLOWED_CATEGORY_ICONS list — if a new icon name is added
// there, add its mapping here too, or it will fall back to FALLBACK_ICON.

export const FALLBACK_ICON = 'grid-outline';

export const LUCIDE_TO_IONICONS = {
  Layers: 'layers-outline',
  GraduationCap: 'school-outline',
  Music: 'musical-notes-outline',
  PersonStanding: 'body-outline',
  Dumbbell: 'barbell-outline',
  ChefHat: 'restaurant-outline',
  Cake: 'ice-cream-outline',
  Camera: 'camera-outline',
  Laptop: 'laptop-outline',
  Briefcase: 'briefcase-outline',
  TrendingUp: 'trending-up-outline',
  ShoppingCart: 'cart-outline',
  Home: 'home-outline',
  Shirt: 'shirt-outline',
  Scale: 'scale-outline',
  Stethoscope: 'medkit-outline',
  Palette: 'color-palette-outline',
  Sofa: 'bed-outline',
  HardHat: 'construct-outline',
  Building2: 'business-outline',
  PartyPopper: 'megaphone-outline',
  Gift: 'gift-outline',
  Sparkles: 'sparkles-outline',
  BookOpen: 'book-outline',
  Utensils: 'restaurant-outline',
  Wrench: 'hammer-outline',
  Mic: 'mic-outline',
  Video: 'videocam-outline',
  Globe: 'globe-outline',
  Users: 'people-outline',
  Heart: 'heart-outline',
  Scissors: 'cut-outline',
  Flower2: 'flower-outline',
  Hammer: 'hammer-outline',
  Paintbrush: 'brush-outline',
  Leaf: 'leaf-outline',
  Zap: 'flash-outline',
  Car: 'car-outline',
  Baby: 'body-outline',
  Dog: 'paw-outline',
};

export const getIoniconName = (lucideIconName) =>
  LUCIDE_TO_IONICONS[lucideIconName] || FALLBACK_ICON;

// Rotating gradient pairs used for icon tiles across the app (mirrors the
// website's category card gradients).
export const ICON_GRADIENTS = [
  ['#3B82F6', '#06B6D4'], // blue -> cyan
  ['#A855F7', '#D946EF'], // purple -> fuchsia
  ['#EC4899', '#F43F5E'], // pink -> rose
  ['#6366F1', '#A855F7'], // indigo -> purple
  ['#10B981', '#14B8A6'], // emerald -> teal
  ['#F97316', '#F59E0B'], // orange -> amber
];

// Hashes a key (category name/id) to a stable index so the same category
// always gets the same gradient, regardless of list position or re-renders.
const hashString = (key) => {
  const str = String(key || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getIconGradient = (key) =>
  ICON_GRADIENTS[hashString(key) % ICON_GRADIENTS.length];


// Soft, muted background tints — hashed per category name so each tile
// gets a distinct-looking but stable color (not re-randomized on every
// render/scroll).
const ICON_BG_PALETTE = [
  '#F3E8FF', // lavender
  '#FCE7F3', // pink
  '#DBEAFE', // blue
  '#D1FAE5', // mint
  '#FEF3C7', // amber
  '#FFE4E6', // rose
  '#E0F2FE', // sky
  '#EDE9FE', // violet
  '#FFEDD5', // orange
  '#CCFBF1', // teal
];

export const getIconBgColor = (key) => {
  const str = String(key || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ICON_BG_PALETTE.length;
  return ICON_BG_PALETTE[index];
};