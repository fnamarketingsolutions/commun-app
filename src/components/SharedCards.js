// components/SharedCards.jsx

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import SvgImage from './SvgImage';

const { width } = Dimensions.get('window');

const PURPLE = COLORS.gradientStart;
const PINK   = COLORS.gradientEnd;
const GOLD   = '#F5A623';
const GREY   = '#D1D5DB';
const TEXT   = '#1A1A2E';
const MUTED  = '#888';
const WHITE  = '#FFFFFF';

// ─────────────────────────────────────────────────────────────────────────────
// STAR RATING COMPONENT – 5 stars with half-star support
// ─────────────────────────────────────────────────────────────────────────────
const StarRating = ({ rating, size = 12 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(2, 0.2) }}>
      {[...Array(fullStars)].map((_, i) => (
        <Icon key={`full-${i}`} name="star" size={scaleFont(size)} color={GOLD} />
      ))}
      {hasHalfStar && (
        <Icon name="star-half" size={scaleFont(size)} color={GOLD} />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Icon key={`empty-${i}`} name="star-outline" size={scaleFont(size)} color={GREY} />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a valid image URL – allows relative URLs (for SVG) */
const getServiceImageUrl = (item) => {
  if (item?.portfolioImages?.length > 0) {
    const url = item.portfolioImages[0]?.url;
    if (url && url !== '/CommuN-logo.png') return url;
  }
  if (item?.image) return item.image;
  return null;
};

const getServiceTitle    = (item) => item?.servicename    || item?.title    || '';
const getServiceCategory = (item) => item?.serviceCategory || item?.category || '';
const getServiceDescription = (item) => item?.description || item?.bio || '';

// ─── Fallback gradient for images ──────────────────────────────────────────
const GRADIENT_PAIRS = [
  [PURPLE, PINK],
  ['#3B82F6', '#8B5CF6'],
  ['#10B981', '#3B82F6'],
  ['#8B5CF6', '#EC4899'],
];
const PROVIDER_GRADIENT_PAIRS = [
  [PURPLE, PINK],
  ['#3B82F6', '#8B5CF6'],
  ['#10B981', '#3B82F6'],
  ['#F59E0B', '#EF4444'],
  ['#8B5CF6', '#EC4899'],
];
const pickGradient = (str = '', pairs = GRADIENT_PAIRS) =>
  pairs[(str?.charCodeAt(0) || 0) % pairs.length];

// ─── Get initials helper ──────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return '?';
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENT: renders image if valid, else placeholder with title
// ─────────────────────────────────────────────────────────────────────────────
const CoverImage = ({ url, style, gradient, iconSize = 32, title = null }) => {
  const [error, setError] = useState(false);
  const isSvg = url && /\.svg$/i.test(url);
  const showImage = url && !error;

  return showImage ? (
    <View style={[style, { width: '100%', height: '100%', backgroundColor: '#F2F2F8' }]}>
      {isSvg ? (
        <SvgImage uri={url} style={{ width: '100%', height: '100%' }} onError={() => setError(true)} />
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          onError={() => setError(true)}
        />
      )}
    </View>
  ) : (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[style, { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: moderateScale(12, 0.3) }]}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <Icon name="image-outline" size={scaleFont(iconSize)} color="rgba(255,255,255,0.7)" />
      {title ? (
        <Text style={styles.placeholderTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : null}
    </LinearGradient>
  );
};

// ─── Avatar with fallback initials on brand gradient ─────────────────────────
const ProviderAvatar = ({ uri, name, size = 40, style }) => {
  const [error, setError] = useState(false);
  const avatarSize = moderateScale(size, 0.3);
  const fontSize = scaleFont(size * 0.4);

  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={[style, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        onError={() => setError(true)}
      />
    );
  }

  const initials = getInitials(name);
  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        style,
        styles.initialsAvatar,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
      ]}>
      <Text style={[styles.initialsText, { fontSize }]} maxFontSizeMultiplier={1.3}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICE CARD – horizontal featured
// ─────────────────────────────────────────────────────────────────────────────
export const ServiceCard = ({
  item,
  onPress,
  cardWidth,
  showHeart = false,
  provider,
  isWishlisted = false,
  onWishlistToggle,
  toggleDisabled = false,
}) => {
  const cWidth = cardWidth || width * 0.58;
  const [localLiked, setLocalLiked] = useState(false);

  const liked = isWishlisted !== undefined ? isWishlisted : localLiked;
  const handleHeart = onWishlistToggle || (() => setLocalLiked(!localLiked));

  const title       = getServiceTitle(item);
  const category    = getServiceCategory(item);
  const imageUrl    = getServiceImageUrl(item);
  const description = getServiceDescription(item);
  const gradient    = pickGradient(title || category);
  const rating      = item?.rating ?? item?.averageRating ?? 0;
  const reviewCount = item?.reviewCount ?? item?.totalReviews ?? 0;

  const formattedRating = rating > 0 ? rating.toFixed(1) : '0.0';
  const shortDesc = description ? description.slice(0, 70) + (description.length > 70 ? '...' : '') : '';

  return (
    <TouchableOpacity style={[styles.serviceCard, { width: cWidth }]} activeOpacity={0.88} onPress={onPress}>

      {/* Cover */}
      <View style={styles.serviceCardImgWrap}>
        <CoverImage url={imageUrl} style={styles.fill} gradient={gradient} iconSize={32} title={title} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />
      </View>

      {/* Category badge */}
      {!!category && (
        <LinearGradient colors={[PURPLE, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.serviceCardBadge}>
          <Text style={styles.serviceCardBadgeText}>{category}</Text>
        </LinearGradient>
      )}

      {showHeart && (
        <TouchableOpacity
          style={[styles.serviceCardHeart, toggleDisabled && styles.gridHeartBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={e => { e.stopPropagation(); if (!toggleDisabled) handleHeart(); }}
          disabled={toggleDisabled}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={scaleFont(16)}
            color={liked ? PINK : (toggleDisabled ? '#CCC' : '#666')}
          />
        </TouchableOpacity>
      )}

      <View style={styles.serviceCardBody}>
        <Text style={styles.serviceCardTitle} numberOfLines={1}>{title}</Text>
        {shortDesc ? (
          <Text style={styles.serviceCardDesc} numberOfLines={2}>{shortDesc}</Text>
        ) : null}
        {provider && (
          <View style={styles.serviceCardProviderRow}>
            <ProviderAvatar
              uri={provider.avatar}
              name={provider.name}
              size={22}
              style={styles.serviceCardProviderAvatar}
            />
            <Text style={styles.serviceCardProviderName} numberOfLines={1}>{provider.name}</Text>
          </View>
        )}
        {/* 5-star rating */}
        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={12} />
          <Text style={styles.ratingText}>
            {formattedRating} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
        <View style={styles.serviceCardFooter}>
          <LinearGradient colors={[PURPLE, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.arrowBtn}>
            <Icon name="arrow-forward" size={scaleFont(16)} color={WHITE} />
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SERVICE ROW CARD
// ─────────────────────────────────────────────────────────────────────────────
export const ServiceRowCard = ({
  item,
  onPress,
  showHeart = true,
  provider,
  isWishlisted = false,
  onWishlistToggle,
  toggleDisabled = false,
}) => {
  const [localLiked, setLocalLiked] = useState(false);

  const liked = isWishlisted !== undefined ? isWishlisted : localLiked;
  const handleHeart = onWishlistToggle || (() => setLocalLiked(!localLiked));

  const title       = getServiceTitle(item);
  const category    = getServiceCategory(item);
  const imageUrl    = getServiceImageUrl(item);
  const gradient    = pickGradient(title || category);
  const rating      = item?.rating ?? item?.averageRating ?? 0;
  const reviewCount = item?.reviewCount ?? item?.totalReviews ?? 0;
  const description = item?.description || '';
  const price       = item?.price ?? null;

  const formattedRating = rating > 0 ? rating.toFixed(1) : '0.0';

  return (
    <TouchableOpacity style={styles.rowCard} activeOpacity={0.88} onPress={onPress}>

      {/* Thumbnail */}
      <View style={styles.rowCardImageWrap}>
        <CoverImage url={imageUrl} style={styles.fill} gradient={gradient} iconSize={22} title={title} />
      </View>

      <View style={styles.rowCardContent}>
        <Text style={[styles.rowCardCategory, { color: item?.categoryColor || PURPLE }]}>{category}</Text>
        <Text style={styles.rowCardTitle} numberOfLines={1}>{title}</Text>
        {provider?.name ? (
          <Text style={styles.rowCardProvider} numberOfLines={1}>
            {provider.name}
          </Text>
        ) : null}
        <Text style={styles.rowCardDesc} numberOfLines={1}>{description}</Text>
        <View style={styles.rowCardFooter}>
          {price != null && <Text style={styles.rowCardPrice}>{price}</Text>}
          {/* 5-star rating */}
          <View style={styles.ratingRow}>
            <StarRating rating={rating} size={10} />
            <Text style={styles.ratingText}>
              {formattedRating} ({reviewCount})
            </Text>
          </View>
        </View>
      </View>

      {showHeart && (
        <TouchableOpacity
          style={[styles.heartBtn, toggleDisabled && styles.gridHeartBtnDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={e => { e.stopPropagation(); if (!toggleDisabled) handleHeart(); }}
          disabled={toggleDisabled}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={scaleFont(18)}
            color={liked ? PINK : (toggleDisabled ? '#CCC' : MUTED)}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. SERVICE GRID CARD
// ─────────────────────────────────────────────────────────────────────────────
export const ServiceGridCard = ({
  item,
  provider,
  onPress,
  cardWidth,
  isWishlisted,
  onWishlistToggle,
  toggleDisabled = false,
}) => {
  const [localLiked, setLocalLiked] = useState(false);

  const liked        = isWishlisted !== undefined ? isWishlisted : localLiked;
  const handleHeart  = onWishlistToggle || (() => setLocalLiked(v => !v));

  const title       = getServiceTitle(item);
  const category    = getServiceCategory(item);
  const imageUrl    = getServiceImageUrl(item);
  const description = getServiceDescription(item);
  const gradient    = pickGradient(title || category);
  const rating      = item?.rating ?? item?.averageRating ?? 0;
  const reviewCount = item?.reviewCount ?? item?.totalReviews ?? 0;

  const formattedRating = rating > 0 ? rating.toFixed(1) : '0.0';
  const shortDesc = description ? description.slice(0, 60) + (description.length > 60 ? '...' : '') : '';

  return (
    <TouchableOpacity style={[styles.gridCard, { width: cardWidth }]} activeOpacity={0.88} onPress={onPress}>

      {/* Cover */}
      <View style={styles.gridCardImgWrap}>
        <CoverImage url={imageUrl} style={styles.fill} gradient={gradient} iconSize={28} title={title} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.22)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.gridHeartBtn, toggleDisabled && styles.gridHeartBtnDisabled]}
          onPress={e => { e.stopPropagation(); if (!toggleDisabled) handleHeart(); }}
          disabled={toggleDisabled}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={scaleFont(16)}
            color={liked ? PINK : (toggleDisabled ? '#CCC' : '#666')}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.gridCardContent}>
        <Text style={[styles.gridCardCategory, { color: item?.categoryColor || PURPLE }]}>{category}</Text>
        <Text style={styles.gridCardTitle} numberOfLines={1}>{title}</Text>
        {shortDesc ? (
          <Text style={styles.gridCardDesc} numberOfLines={2}>{shortDesc}</Text>
        ) : null}
        {provider && (
          <View style={styles.gridProviderRow}>
            <ProviderAvatar
              uri={provider.avatar}
              name={provider.name}
              size={20}
              style={styles.gridProviderAvatar}
            />
            <Text style={styles.gridProviderName} numberOfLines={1}>{provider.name}</Text>
          </View>
        )}
        {/* 5-star rating */}
        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={11} />
          <Text style={styles.ratingText}>
            {formattedRating} ({reviewCount})
          </Text>
        </View>
        <View style={styles.gridCardActionRow}>
          <LinearGradient colors={[PURPLE, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gridGradientBtn}>
            <Text style={styles.gridGradientBtnText}>View</Text>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROVIDER FEATURED CARD
// ─────────────────────────────────────────────────────────────────────────────
export const ProviderFeaturedCard = ({ provider, onPress, cardWidth }) => {
  const cWidth = cardWidth || width * 0.62;

  const gradient = pickGradient(provider?.name, PROVIDER_GRADIENT_PAIRS);
  const coverUrl = provider?.coverImage || null;
  const rating   = provider?.rating ?? 0;
  const name     = provider?.name || 'Provider';

  return (
    <TouchableOpacity style={[styles.provFeatCard, { width: cWidth }]} activeOpacity={0.88} onPress={onPress}>

      {/* Cover */}
      <View style={styles.provFeatCoverWrap}>
        <CoverImage url={coverUrl} style={styles.fill} gradient={gradient} iconSize={36} title={name} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.provFeatInfo}>
        <View style={styles.provFeatAvatarWrap}>
          <ProviderAvatar
            uri={provider?.avatar}
            name={provider?.name}
            size={40}
            style={styles.provFeatAvatar}
          />
        </View>
        <View style={styles.provFeatNameWrap}>
          <Text style={styles.provFeatName} numberOfLines={1}>{provider?.name}</Text>
          <Text style={styles.provFeatRole} numberOfLines={1}>{provider?.role}</Text>
        </View>
        {rating > 0 && (
          <View style={styles.ratingPill}>
            <Icon name="star" size={scaleFont(12)} color={GOLD} />
            <Text style={styles.ratingPillText}>{rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROVIDER GRID CARD
// ─────────────────────────────────────────────────────────────────────────────
export const ProviderGridCard = ({ provider, onPress, cardWidth }) => {
  const gradient = pickGradient(provider?.name, PROVIDER_GRADIENT_PAIRS);
  const coverUrl = provider?.coverImage || null;
  const rating   = provider?.rating ?? 0;
  const name     = provider?.name || 'Provider';

  return (
    <TouchableOpacity style={[styles.provGridCard, { width: cardWidth }]} activeOpacity={0.88} onPress={onPress}>

      {/* Cover */}
      <View style={styles.provGridCoverWrap}>
        <CoverImage url={coverUrl} style={styles.fill} gradient={gradient} iconSize={28} title={name} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
        {rating > 0 && (
          <View style={styles.coverRatingPill}>
            <Icon name="star" size={scaleFont(9)} color={GOLD} />
            <Text style={styles.coverRatingText}>{rating}</Text>
          </View>
        )}
      </View>

      <View style={styles.provGridAvatarWrap}>
        <ProviderAvatar
          uri={provider?.avatar}
          name={provider?.name}
          size={44}
          style={styles.provGridAvatar}
        />
      </View>

      <View style={styles.provGridInfo}>
        <Text style={styles.provGridName} numberOfLines={1}>{provider?.name}</Text>
        <Text style={styles.provGridRole} numberOfLines={1}>{provider?.role}</Text>

        {provider?.location ? (
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={scaleFont(11)} color="#999" />
            <Text style={styles.locationText} numberOfLines={1}>{provider.location}</Text>
          </View>
        ) : null}

        {provider?.skills?.length > 0 && (
          <View style={styles.skillsRow}>
            {provider.skills.slice(0, 2).map(skill => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillPillText} numberOfLines={1}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <LinearGradient colors={[PURPLE, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnWrap}>
          <Text style={styles.gradientBtnText}>View Profile</Text>
          <Icon name="arrow-forward" size={scaleFont(12)} color={WHITE} style={{ marginLeft: scaleWidth(4) }} />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROVIDER AVATAR CARD – unchanged
// ─────────────────────────────────────────────────────────────────────────────
export const ProviderAvatarCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.avatarCard} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.avatarCardWrap}>
      <ProviderAvatar
        uri={item?.avatar}
        name={item?.name}
        size={68}
        style={styles.avatarCardImg}
      />
      {item.rating >= 4.9 && <View style={styles.onlineDot} />}
    </View>
    <Text style={styles.avatarCardName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
    <View style={styles.ratingRow}>
      <Icon name="star" size={scaleFont(10)} color={GOLD} />
      <Text style={styles.ratingText}>{item.rating}</Text>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Utility ───────────────────────────────────────────────────────────────
  fill: { width: '100%', height: '100%' },

  // ── Gradient fallback decoration circles ──────────────────────────────────
  decorCircle1: {
    position: 'absolute',
    width: moderateScale(70, 0.3),
    height: moderateScale(70, 0.3),
    borderRadius: moderateScale(35, 0.3),
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -scaleHeight(10),
    right: scaleWidth(10),
  },
  decorCircle2: {
    position: 'absolute',
    width: moderateScale(45, 0.3),
    height: moderateScale(45, 0.3),
    borderRadius: moderateScale(22, 0.3),
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: scaleHeight(4),
    right: scaleWidth(40),
  },

  // ── Placeholder text inside CoverImage ────────────────────────────────────
  placeholderTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginTop: scaleHeight(6),
    maxWidth: '80%',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(5) },
  ratingText: { fontSize: scaleFont(11), color: MUTED, fontWeight: '500' },

  // ── Fallback avatar styles ───────────────────────────────────────────────
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  initialsText: {
    color: WHITE,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── ServiceCard ───────────────────────────────────────────────────────────
  serviceCard: {
    backgroundColor: WHITE,
    borderRadius: moderateScale(20, 0.3),
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: scaleHeight(4) }, shadowOpacity: 0.1, shadowRadius: moderateScale(12, 0.3) },
      android: { elevation: 5 },
    }),
  },
  // 16:9 image ratio (was fixed height: scaleHeight(150))
  serviceCardImgWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  serviceCardBadge: {
    position: 'absolute',
    top: scaleHeight(12),
    right: scaleWidth(12),
    borderRadius: moderateScale(14, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(5),
  },
  serviceCardBadgeText: { fontSize: scaleFont(11), fontWeight: '700', color: WHITE },
  serviceCardHeart: {
    position: 'absolute',
    top: scaleHeight(12),
    left: scaleWidth(12),
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridHeartBtnDisabled: { opacity: 0.5 },
  serviceCardBody: { padding: moderateScale(14, 0.3) },
  serviceCardTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: TEXT,
    marginBottom: scaleHeight(4),
  },
  serviceCardDesc: {
    fontSize: scaleFont(12),
    color: MUTED,
    lineHeight: moderateScale(16, 0.3),
    marginBottom: scaleHeight(6),
  },
  serviceCardProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    marginBottom: scaleHeight(4),
  },
  serviceCardProviderAvatar: {
    width: moderateScale(22, 0.3),
    height: moderateScale(22, 0.3),
    borderRadius: moderateScale(11, 0.3),
    backgroundColor: '#EEE',
    overflow: 'hidden',
  },
  serviceCardProviderName: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    color: TEXT,
    flex: 1,
  },
  serviceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: scaleHeight(6),
  },
  arrowBtn: {
    width: moderateScale(34, 0.3),
    height: moderateScale(34, 0.3),
    borderRadius: moderateScale(14, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── ServiceRowCard ────────────────────────────────────────────────────────
  rowCard: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: moderateScale(16, 0.3),
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(12),
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: scaleHeight(2) }, shadowOpacity: 0.06, shadowRadius: moderateScale(8, 0.3) },
      android: { elevation: 2 },
    }),
  },
  // Left as a fixed square thumbnail (compact row layout) — not changed to 16:9
  rowCardImageWrap: {
    width: moderateScale(70, 0.3),
    height: moderateScale(70, 0.3),
    borderRadius: moderateScale(14, 0.3),
    marginRight: scaleWidth(14),
    overflow: 'hidden',
  },
  rowCardContent: { flex: 1 },
  rowCardCategory: { fontSize: scaleFont(10), fontWeight: '700', letterSpacing: 0.8, marginBottom: scaleHeight(4) },
  rowCardTitle: { fontSize: scaleFont(15), fontWeight: '700', color: TEXT, marginBottom: scaleHeight(2) },
  rowCardProvider: { fontSize: scaleFont(13), color: COLORS.textSecondary, fontWeight: FONTS.weightMedium, marginBottom: scaleHeight(2) },
  rowCardDesc: { fontSize: scaleFont(12), color: MUTED, marginBottom: scaleHeight(8) },
  rowCardFooter: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(12) },
  rowCardPrice: { fontSize: scaleFont(15), fontWeight: '800', color: PURPLE },
  heartBtn: { padding: moderateScale(4, 0.3), marginLeft: scaleWidth(8) },

  // ── ServiceGridCard ──────────────────────────────────────────────────────
  gridCard: {
    backgroundColor: WHITE,
    borderRadius: moderateScale(18, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(16),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: scaleHeight(2) }, shadowOpacity: 0.08, shadowRadius: moderateScale(8, 0.3) },
      android: { elevation: 3 },
    }),
  },
  // 16:9 image ratio (was fixed height: scaleHeight(140))
  gridCardImgWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  gridHeartBtn: {
    position: 'absolute', top: scaleHeight(10), right: scaleWidth(10),
    width: moderateScale(32, 0.3), height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  gridHeartBtnDisabled: {
    backgroundColor: 'rgba(200,200,200,0.6)',
  },
  gridCardContent: { paddingHorizontal: scaleWidth(14), paddingVertical: scaleHeight(12) },
  gridCardCategory: { fontSize: scaleFont(10), fontWeight: '700', letterSpacing: 0.5, marginBottom: scaleHeight(6) },
  gridCardTitle: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: TEXT,
    marginBottom: scaleHeight(5),
  },
  gridCardDesc: {
    fontSize: scaleFont(11),
    color: MUTED,
    lineHeight: moderateScale(15, 0.3),
    marginBottom: scaleHeight(8),
  },
  gridProviderRow: {
    flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8),
    marginBottom: scaleHeight(8),
  },
  gridProviderAvatar: {
    width: moderateScale(22, 0.3), height: moderateScale(22, 0.3),
    borderRadius: moderateScale(11, 0.3), backgroundColor: '#EEE',
    overflow: 'hidden',
  },
  gridProviderName: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    color: TEXT,
    flex: 1,
  },
  gridCardActionRow: { marginTop: scaleHeight(10), alignItems: 'flex-start' },
  gridGradientBtn: {
    paddingHorizontal: scaleWidth(16), paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(14, 0.3), overflow: 'hidden', alignSelf: 'flex-start',
  },
  gridGradientBtnText: { fontSize: scaleFont(11), fontWeight: '700', color: WHITE },

  // ── ProviderFeaturedCard ──────────────────────────────────────────────────
  provFeatCard: {
    borderRadius: moderateScale(20, 0.3),
    backgroundColor: WHITE,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: scaleHeight(4) }, shadowOpacity: 0.1, shadowRadius: moderateScale(12, 0.3) },
      android: { elevation: 5 },
    }),
  },
  // 16:9 image ratio (was fixed height: scaleHeight(140))
  provFeatCoverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  provFeatInfo: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(12), gap: scaleWidth(10),
  },
  provFeatAvatarWrap: { position: 'relative' },
  provFeatAvatar: {
    width: moderateScale(40, 0.3), height: moderateScale(40, 0.3),
    borderRadius: moderateScale(20, 0.3), borderWidth: 2, borderColor: WHITE, overflow: 'hidden',
  },
  provFeatNameWrap: { flex: 1 },
  provFeatName: { fontSize: scaleFont(15), fontWeight: '700', color: TEXT },
  provFeatRole: { fontSize: scaleFont(12), color: MUTED, marginTop: scaleHeight(2) },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: scaleWidth(3),
    backgroundColor: '#FEF9EC', borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(8), paddingVertical: scaleHeight(4),
  },
  ratingPillText: { fontSize: scaleFont(12), fontWeight: '700', color: '#B45309' },

  // ── ProviderGridCard ──────────────────────────────────────────────────────
  provGridCard: {
    backgroundColor: WHITE,
    borderRadius: moderateScale(18, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(14),
    ...Platform.select({
      ios: { shadowColor: PURPLE, shadowOffset: { width: 0, height: scaleHeight(4) }, shadowOpacity: 0.1, shadowRadius: moderateScale(12, 0.3) },
      android: { elevation: 4 },
    }),
  },
  // Left as a short banner cover (not the primary content image) — not changed to 16:9
  provGridCoverWrap: {
    width: '100%',
    height: scaleHeight(90),
    overflow: 'hidden',
  },
  coverRatingPill: {
    position: 'absolute', top: scaleHeight(8), right: scaleWidth(8),
    flexDirection: 'row', alignItems: 'center', gap: scaleWidth(2),
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(3),
  },
  coverRatingText: { fontSize: scaleFont(9), fontWeight: '700', color: WHITE },
  provGridAvatarWrap: {
    position: 'absolute', top: scaleHeight(58), left: scaleWidth(12), zIndex: 2,
  },
  provGridAvatar: {
    width: moderateScale(44, 0.3), height: moderateScale(44, 0.3),
    borderRadius: moderateScale(22, 0.3),
    borderWidth: moderateScale(2.5, 0.3), borderColor: WHITE,
    backgroundColor: '#EEE',
    overflow: 'hidden',
  },
  provGridInfo: {
    paddingHorizontal: scaleWidth(12),
    paddingTop: scaleHeight(26),
    paddingBottom: scaleHeight(12),
  },
  provGridName: { fontSize: scaleFont(14), fontWeight: '700', color: TEXT, marginBottom: scaleHeight(1) },
  provGridRole: { fontSize: scaleFont(11), color: '#777', fontWeight: '500', marginBottom: scaleHeight(4) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(3), marginBottom: scaleHeight(6) },
  locationText: { fontSize: scaleFont(10), color: '#AAA', flex: 1 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleWidth(5), marginBottom: scaleHeight(10) },
  skillPill: {
    backgroundColor: '#F0EEFF', borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(8), paddingVertical: scaleHeight(3),
  },
  skillPillText: { fontSize: scaleFont(9), color: PURPLE, fontWeight: '600' },
  gradientBtnWrap: {
    borderRadius: moderateScale(RADIUS.full, 0.3), overflow: 'hidden',
    paddingVertical: scaleHeight(9), flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', marginTop: scaleHeight(2),
  },
  gradientBtnText: { fontSize: scaleFont(12), fontWeight: '700', color: WHITE },

  // ── ProviderAvatarCard ────────────────────────────────────────────────────
  avatarCard: { alignItems: 'center', width: moderateScale(72, 0.3) },
  avatarCardWrap: { position: 'relative', marginBottom: scaleHeight(8) },
  avatarCardImg: {
    width: moderateScale(68, 0.3), height: moderateScale(68, 0.3),
    borderRadius: moderateScale(34, 0.3), borderWidth: 2, borderColor: WHITE,
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute', bottom: scaleHeight(4), right: scaleWidth(4),
    width: moderateScale(14, 0.3), height: moderateScale(14, 0.3),
    borderRadius: moderateScale(7, 0.3), backgroundColor: '#10B981',
    borderWidth: 2, borderColor: WHITE,
  },
  avatarCardName: { fontSize: scaleFont(12), fontWeight: '600', color: TEXT, textAlign: 'center' },
});

export default {
  ServiceCard,
  ServiceRowCard,
  ServiceGridCard,
  ProviderFeaturedCard,
  ProviderGridCard,
  ProviderAvatarCard,
};