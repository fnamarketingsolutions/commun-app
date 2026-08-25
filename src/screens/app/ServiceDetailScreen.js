// screens/ServiceDetailScreen.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView as RNModalSafeArea,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';

import { useFetchAllProvidersQuery } from '../../redux/service/providerApi';
import { useIncrementServiceOfferingCountMutation } from '../../redux/service/serviceOfferingApi';
import { useFetchCommunityServicesQuery } from '../../redux/service/serviceOfferingApi';
import { useIncrementProviderProfileCountMutation } from '../../redux/service/providerApi';
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useGetPublicServicesQuery,
} from '../../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ServiceCard } from '../../components/SharedCards';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import ReviewsSection from '../../components/ReviewsSection';
import { getUserCommunityName } from '../../utils/communityHelpers';
import SvgImage from '../../components/SvgImage';

const { width, height } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const BOTTOM_BAR_MAX_FONT_MULTIPLIER = 1.15;
const DEFAULT_BOTTOM_BAR_HEIGHT = moderateScale(78, 0.3);

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = ['About', 'Services', 'Gallery', 'Reviews', 'Location'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatAddress = (user) => {
  if (!user) return '';
  const parts = [user.city, user.state].filter(Boolean);
  return parts.join(', ');
};

const formatMemberSince = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (_) {
    return 'N/A';
  }
};

const buildIncludes = (service) => {
  const includes = [];
  includes.push(`Professional ${service.serviceCategory} service`);
  if (service.experience) {
    includes.push(`${service.experience} year${service.experience !== 1 ? 's' : ''} of experience`);
  }
  if (service.subCategories?.length) {
    includes.push(`Specialized in: ${service.subCategories.join(', ')}`);
  }
  if (service.keywords?.length) {
    includes.push(`Keywords: ${service.keywords.slice(0, 3).join(', ')}${service.keywords.length > 3 ? '...' : ''}`);
  }
  return includes;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : '';
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return '?';
};

// ─── Star Rating ─────────────────────────────────────────────────────────────
const StarRating = ({ rating, size = 14 }) => {
  return (
    <View style={{ flexDirection: 'row', gap: moderateScale(2, 0.3) }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name={star <= Math.round(rating) ? 'star' : 'star-outline'}
          size={scaleFont(size)}
          color={star <= Math.round(rating) ? '#F59E0B' : COLORS.border}
        />
      ))}
    </View>
  );
};

// ─── Image Carousel Modal (with SVG support) ───────────────────────────────
const ImageCarouselModal = ({ images, initialIndex, visible, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex || 0);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex || 0,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const goToIndex = (idx) => {
    setCurrentIndex(idx);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const renderItem = ({ item }) => {
    const url = item.url;
    const isSvg = url && url.endsWith('.svg');
    return (
      <View style={carouselStyles.imageWrap}>
        {isSvg ? (
          <SvgImage uri={url} style={carouselStyles.fullImage} />
        ) : (
          <Image source={{ uri: url }} style={carouselStyles.fullImage} resizeMode="contain" />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <RNModalSafeArea style={carouselStyles.modalSafe} edges={['top', 'bottom']}>
        <View style={carouselStyles.modalContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={carouselStyles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Icon name="close" size={scaleFont(28)} color={COLORS.white} />
          </TouchableOpacity>

          <View style={carouselStyles.counter}>
            <Text style={carouselStyles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, idx) => `carousel-${idx}`}
            renderItem={renderItem}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
            }}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />

          {images.length > 1 && (
            <View style={carouselStyles.thumbStripWrap} pointerEvents="box-none">
              <FlatList
                data={images}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, idx) => `carousel-thumb-${idx}`}
                contentContainerStyle={carouselStyles.thumbStripContent}
                renderItem={({ item, index }) => {
                  const url = item.url;
                  const isSvg = url && url.endsWith('.svg');
                  return (
                    <TouchableOpacity
                      onPress={() => goToIndex(index)}
                      activeOpacity={0.8}
                      style={[
                        carouselStyles.thumbItem,
                        currentIndex === index && carouselStyles.thumbItemActive,
                      ]}>
                      {isSvg ? (
                        <SvgImage uri={url} style={carouselStyles.thumbItemImg} />
                      ) : (
                        <Image source={{ uri: url }} style={carouselStyles.thumbItemImg} resizeMode="cover" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </View>
      </RNModalSafeArea>
    </Modal>
  );
};

const carouselStyles = StyleSheet.create({
  modalSafe: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeBtn: {
    position: 'absolute',
    top: moderateScale(40, 0.3),
    right: scaleWidth(20),
    zIndex: 20,
    padding: moderateScale(6, 0.3),
  },
  counter: {
    position: 'absolute',
    top: moderateScale(48, 0.3),
    left: 0,
    right: 0,
    zIndex: 15,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  counterText: {
    fontSize: scaleFont(14),
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FONTS.weightMedium,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(14, 0.3),
  },
  imageWrap: {
    width: width,
    height: height - moderateScale(100, 0.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height - moderateScale(120, 0.3),
  },
  thumbStripWrap: {
    position: 'absolute',
    bottom: moderateScale(24, 0.3),
    left: 0,
    right: 0,
    zIndex: 15,
  },
  thumbStripContent: {
    paddingHorizontal: scaleWidth(16),
    gap: scaleWidth(8),
    alignItems: 'center',
  },
  thumbItem: {
    width: moderateScale(52, 0.3),
    height: moderateScale(40, 0.3),
    borderRadius: moderateScale(8, 0.3),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  thumbItemActive: {
    borderColor: COLORS.white,
  },
  thumbItemImg: {
    width: '100%',
    height: '100%',
  },
});

// ─── Image Gallery with Thumbnails ──────────────────────────────────────────
const ImageGallery = ({ images, serviceName, onImagePress }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const currentImage = images[selectedIndex]?.url;
  const isAbsoluteUrl = currentImage && /^https?:\/\//i.test(currentImage);
  const shouldShowImage = images.length > 0 && currentImage && isAbsoluteUrl && !imgError;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
    setImgError(false);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % images.length);
    setImgError(false);
  };

  if (images.length === 0) {
    return (
      <View style={galleryStyles.heroPlaceholder}>
        <Icon name="image-outline" size={scaleFont(48)} color={COLORS.border} />
        <Text style={galleryStyles.placeholderTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {serviceName || 'No Image'}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={galleryStyles.heroWrap}>
        {shouldShowImage ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(selectedIndex)}
            style={[galleryStyles.heroImg, galleryStyles.heroImgBg]}>
            {currentImage.endsWith('.svg') ? (
              <SvgImage uri={currentImage} style={galleryStyles.heroImg} onError={() => setImgError(true)} />
            ) : (
              <Image
                source={{ uri: currentImage }}
                style={galleryStyles.heroImg}
                onError={() => setImgError(true)}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={[galleryStyles.heroImg, galleryStyles.heroPlaceholder]}>
            <Icon name="image-outline" size={scaleFont(48)} color={COLORS.textMuted} />
            <Text style={galleryStyles.placeholderTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {serviceName || 'No Image'}
            </Text>
            <Text style={galleryStyles.statusText}>
              {currentImage ? 'No Image' : 'No image'}
            </Text>
          </View>
        )}

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[galleryStyles.arrowBtn, { left: scaleWidth(12) }]}
              onPress={handlePrev}
              activeOpacity={0.8}>
              <Icon name="chevron-back" size={scaleFont(20)} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[galleryStyles.arrowBtn, { right: scaleWidth(12) }]}
              onPress={handleNext}
              activeOpacity={0.8}>
              <Icon name="chevron-forward" size={scaleFont(20)} color={COLORS.primary} />
            </TouchableOpacity>
          </>
        )}

        {images.length > 0 && (
          <View style={galleryStyles.countBadge}>
            <Text style={galleryStyles.countText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {images.length} Photo{images.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={galleryStyles.thumbStrip}
          style={{ marginTop: scaleHeight(12), marginBottom: scaleHeight(2) }}
        >
          {images.slice(0, 6).map((img, idx) => {
            const url = img.url;
            const isSvg = url && url.endsWith('.svg');
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedIndex(idx);
                  onImagePress?.(idx);
                }}
                activeOpacity={0.8}
                style={[
                  galleryStyles.thumb,
                  selectedIndex === idx && galleryStyles.thumbActive,
                ]}
              >
                {isSvg ? (
                  <SvgImage uri={url} style={galleryStyles.thumbImg} />
                ) : (
                  <Image source={{ uri: url }} style={galleryStyles.thumbImg} resizeMode="cover" />
                )}
              </TouchableOpacity>
            );
          })}
          {images.length > 6 && (
            <View style={[galleryStyles.thumb, galleryStyles.thumbMore]}>
              <Text style={galleryStyles.thumbMoreText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                +{images.length - 6}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// 16:9 hero image ratio — height derives from screen width instead of a fixed value
const HERO_HEIGHT = width / (16 / 9);
const THUMB_W = moderateScale(72, 0.3);
const THUMB_H = moderateScale(56, 0.3);

const galleryStyles = StyleSheet.create({
  heroWrap: {
    width: width,
    height: HERO_HEIGHT,
    backgroundColor: '#f9f8f9',
  },
  heroImg: {
    width: width,
    height: HERO_HEIGHT,
  },
  heroImgBg: {
    backgroundColor: '#F2F2F8',
  },
  heroPlaceholder: {
    backgroundColor: '#fefdff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(16, 0.3),
  },
  placeholderTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: scaleHeight(8),
  },
  statusText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  arrowBtn: {
    position: 'absolute',
    top: HERO_HEIGHT / 2 - moderateScale(18, 0.3),
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  countBadge: {
    position: 'absolute',
    top: scaleHeight(12),
    right: scaleWidth(12),
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: moderateScale(14, 0.3),
    paddingHorizontal: scaleWidth(11),
    paddingVertical: scaleHeight(5),
  },
  countText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: FONTS.weightBold,
    letterSpacing: 0.2,
  },
  thumbStrip: {
    paddingLeft: scaleWidth(16),
    paddingRight: scaleWidth(8),
    gap: scaleWidth(8),
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: moderateScale(8, 0.3),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  thumbActive: {
    borderColor: COLORS.primary,
    borderWidth: 2.5,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbMore: {
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.border,
  },
  thumbMoreText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const ServiceDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const [descExpanded, setDescExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('About');
  const tabScrollRef = useRef(null);
  const scrollViewRef = useRef(null);

  const [carouselVisible, setCarouselVisible] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [bottomBarHeight, setBottomBarHeight] = useState(DEFAULT_BOTTOM_BAR_HEIGHT);

  const user = useSelector((s) => s.auth?.user);
  const userCommunity = getUserCommunityName(user)?.toLowerCase();

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data: providers = [],
    isLoading: isLoadingProviders,
    isFetching,
    refetch,
  } = useFetchAllProvidersQuery();

  const { data: communityData } = useFetchCommunityServicesQuery({ page: 1, limit: 50 });

  const { data: publicData, isLoading: isLoadingPublic } = useGetPublicServicesQuery({ page: 1, limit: 50 });

  const isLoading = isLoadingProviders || isLoadingPublic;

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetch]);

  const wishlistIds = useSelector((s) => s.wishlist.ids);
  const isWishlisted = wishlistIds.includes(serviceId);

  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  const handleWishlistToggle = async () => {
    if (!serviceId) return;
    try {
      if (isWishlisted) {
        await removeFromWishlist(serviceId).unwrap();
      } else {
        await addToWishlist(serviceId).unwrap();
      }
    } catch (_) {}
  };

  const [incrementServiceOfferingCount] = useIncrementServiceOfferingCountMutation();
  const [incrementProviderProfileCount] = useIncrementProviderProfileCountMutation();

  const { rawService, rawProvider } = useMemo(() => {
    for (const p of providers) {
      const found = (p.serviceOfferings || []).find(s => s._id === serviceId);
      if (found) return { rawService: found, rawProvider: p };
    }

    const communityServices = communityData?.services || [];
    const communityMatch = communityServices.find(s => s._id === serviceId);
    if (communityMatch) {
      return { rawService: communityMatch, rawProvider: communityMatch.provider };
    }

    const publicServices = publicData?.services || [];
    const publicMatch = publicServices.find(s => s._id === serviceId);
    if (publicMatch) {
      return { rawService: publicMatch, rawProvider: publicMatch.provider };
    }

    return { rawService: null, rawProvider: null };
  }, [providers, serviceId, communityData, publicData]);

  const service = useMemo(() => {
    if (!rawService) return null;
    return {
      id: rawService._id,
      title: rawService.servicename,
      images: rawService.portfolioImages || [],
      category: rawService.serviceCategory || '',
      categoryColor: COLORS.primary,
      rating: rawService.averageRating || 0,
      reviewCount: rawService.reviewCount || 0,
      description: rawService.description || '',
      includes: buildIncludes(rawService),
      subCategories: rawService.subCategories || [],
      keywords: rawService.keywords || [],
      portfolioPDFs: rawService.portfolioPDFs || [],
      experience: rawService.experience || 0,
      views: rawService.serviceOfferingCount || 0,
      providerId: rawProvider?._id,
    };
  }, [rawService, rawProvider]);

  const provider = useMemo(() => {
    if (!rawProvider?.user) return null;
    const { user: providerUser } = rawProvider;
    return {
      id: rawProvider._id,
      userId: providerUser._id,
      name: [providerUser.firstName, providerUser.lastName].filter(Boolean).join(' '),
      avatar: providerUser.profileImage,
      bio: rawProvider.bio || '',
      role: 'Provider',
      location: formatAddress(providerUser) || 'Address not provided',
      yearsExp: rawService?.experience || 0,
      projectCount: rawService?.serviceOfferingCount || 0,
      rating: rawService?.averageRating || 0,
      reviewCount: rawService?.reviewCount || 0,
      phoneNumber: providerUser.phoneNumber || '',
      memberSince: providerUser.createdAt,
    };
  }, [rawProvider, rawService]);

  const isOwnService = provider?.userId && user?._id && provider.userId === user._id;

  const similar = useMemo(() => {
    if (!service || !userCommunity) return [];
    const list = [];
    providers.forEach(p => {
      const providerCommunity = getUserCommunityName(p?.user)?.toLowerCase();
      if (providerCommunity !== userCommunity) return;
      (p.serviceOfferings || []).forEach(s => {
        if (s._id !== service.id && s.serviceCategory === service.category) {
          list.push({
            id: s._id,
            title: s.servicename,
            image: s.portfolioImages?.[0]?.url,
            category: s.serviceCategory,
            rating: s.averageRating || 0,
            reviewCount: s.reviewCount || 0,
            price: '',
          });
        }
      });
    });
    return list.slice(0, 10);
  }, [providers, service, userCommunity]);

  const handleContactProvider = async () => {
    if (!service?.id) return;
    incrementServiceOfferingCount(service.id);
    if (provider?.id) {
      incrementProviderProfileCount(provider.id);
    }
    if (provider?.phoneNumber) {
      const cleanPhoneNumber = provider.phoneNumber.replace(/\D/g, '');
      const loggedInUserName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'there';
      const message = `Hi ${provider.name}, this is ${loggedInUserName}! I viewed your profile on Commun and would like to know more about your services. Could you please provide more details?`;
      const encodedMessage = encodeURIComponent(message);
      Linking.openURL(`https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`);
    }
  };

  const handleCallNow = async () => {
    if (!provider?.phoneNumber) return;
    incrementServiceOfferingCount(service.id);
    if (provider?.id) incrementProviderProfileCount(provider.id);
    Linking.openURL(`tel:${provider.phoneNumber}`);
  };

  const renderProviderAvatar = () => {
    if (provider?.avatar && !avatarError) {
      return (
        <Image
          source={{ uri: provider.avatar }}
          style={styles.providerAvatar}
          onError={() => setAvatarError(true)}
        />
      );
    }
    const initials = getInitials(provider?.name || '');
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={[styles.providerAvatar, styles.initialsAvatar]}>
        <Text style={styles.initialsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  const openCarousel = (index) => {
    if (!service?.images?.length) return;
    setCarouselIndex(index);
    setCarouselVisible(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'About':
        return (
          <View style={styles.tabContent}>
            <View style={styles.providerRow}>
              {renderProviderAvatar()}
              <View style={{ flex: 1 }}>
                <Text style={styles.providerCardName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {provider?.name}
                </Text>
                {service?.category ? (
                  <Text style={styles.providerCardRole} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Professional {service.category} service provider
                  </Text>
                ) : null}
                {provider?.bio ? (
                  <Text style={styles.providerBio} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {provider.bio}
                  </Text>
                ) : null}
              </View>
            </View>

            {service?.portfolioPDFs?.length > 0 && (
              <View style={{ marginTop: scaleHeight(20) }}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="document-text-outline" size={scaleFont(18)} color={COLORS.primary} />
                  <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Service Documents
                  </Text>
                </View>
                {service.portfolioPDFs.map((pdf, idx) => {
                  const pdfName = pdf.url.split('/').pop() || `Document ${idx + 1}`;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => Linking.openURL(pdf.url)}
                      style={styles.pdfRow}
                      activeOpacity={0.7}>
                      <View style={styles.pdfIcon}>
                        <Icon name="document-text-outline" size={scaleFont(18)} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pdfName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {pdfName}
                        </Text>
                        <Text style={styles.pdfSub} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Tap to view PDF
                        </Text>
                      </View>
                      <Icon name="arrow-forward" size={scaleFont(16)} color={COLORS.border} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );

      case 'Services':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Our Services
            </Text>
            {service?.subCategories?.length > 0 ? (
              <View style={styles.subCatGrid}>
                {service.subCategories.map((cat) => (
                  <View key={cat} style={styles.subCatCard}>
                    <View style={styles.subCatIcon}>
                      <Icon name="briefcase-outline" size={scaleFont(18)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.subCatName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {cat}
                    </Text>
                    {service.category ? (
                      <Text style={styles.subCatCategory} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {service.category}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No sub-categories listed for this service.
              </Text>
            )}

            {service?.keywords?.length > 0 && (
              <View style={{ marginTop: scaleHeight(20) }}>
                <Text style={[styles.sectionTitle, { marginBottom: scaleHeight(10) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Keywords
                </Text>
                <View style={styles.keywordsWrap}>
                  {service.keywords.map((kw) => (
                    <View key={kw} style={styles.keywordPill}>
                      <Text style={styles.keywordText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {kw}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      case 'Gallery':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Gallery
            </Text>
            {service?.images?.length > 0 ? (
              <View style={styles.galleryGrid}>
                {service.images.map((img, idx) => {
                  const url = img.url;
                  const isSvg = url && url.endsWith('.svg');
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.galleryGridItem}
                      onPress={() => openCarousel(idx)}
                      activeOpacity={0.9}
                    >
                      {isSvg ? (
                        <SvgImage uri={url} style={styles.galleryGridImg} />
                      ) : (
                        <Image source={{ uri: url }} style={styles.galleryGridImg} resizeMode="cover" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.galleryEmpty}>
                <Icon name="images-outline" size={scaleFont(40)} color={COLORS.border} />
                <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No gallery images available
                </Text>
              </View>
            )}
          </View>
        );

      case 'Reviews':
        return (
          <View style={styles.tabContent}>
            <ReviewsSection serviceId={service?.id} providerUserId={provider?.userId} />
          </View>
        );

      case 'Location':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Location
            </Text>
            <View style={styles.locationCard}>
              <Icon name="location-outline" size={scaleFont(18)} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {provider?.location || 'Address not provided'}
                </Text>
                {provider?.location && provider.location !== 'Address not provided' && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.location)}`
                      )
                    }
                    activeOpacity={0.7}>
                    <Text style={styles.viewOnMap} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      View on Map →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const hasData = providers.length > 0;
  const showOfflineBanner = !isOnline && hasData;

  if (isLoading && !hasData) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.errorWrap}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!service && !isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.errorWrap}>
            <Icon name="alert-circle-outline" size={scaleFont(48)} color={COLORS.textMuted} />
            <Text style={styles.errorTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Service not found
            </Text>
            <TouchableOpacity onPress={() => navigation?.goBack()} activeOpacity={0.7}>
              <Text style={styles.errorBack} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Go back
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!service) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.errorWrap}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // ── Scroll to top when service changes ──
  useEffect(() => {
    if (service && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [service]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Service Detail
          </Text>

          <TouchableOpacity
            style={styles.rightButton}
            onPress={handleWishlistToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={scaleFont(22)}
              color={isWishlisted ? COLORS.gradientEnd : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomBarHeight + moderateScale(16, 0.3) }}>

          <ImageGallery images={service.images} serviceName={service.title} onImagePress={openCarousel} />

          <NetworkAwareView isOnline={isOnline} showOfflineBanner={showOfflineBanner}>

            <View style={styles.sheet}>

              <View style={[styles.categoryPill, { backgroundColor: (service.categoryColor || COLORS.primary) + '18' }]}>
                <Icon name="briefcase-outline" size={scaleFont(12)} color={service.categoryColor || COLORS.primary} />
                <Text
                  style={[styles.categoryPillText, { color: service.categoryColor || COLORS.primary }]}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {service.category.charAt(0).toUpperCase() + service.category.slice(1).toLowerCase()}
                </Text>
              </View>

              <Text style={styles.serviceTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {service.title}
              </Text>

              {service.rating > 0 && (
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {service.rating}
                  </Text>
                  <StarRating rating={service.rating} />
                  <TouchableOpacity onPress={() => setActiveTab('Reviews')} activeOpacity={0.7}>
                    <Text style={styles.ratingCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      ({service.reviewCount} Review{service.reviewCount !== 1 ? 's' : ''})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.metaRow}>
                {provider?.location ? (
                  <View style={styles.metaChip}>
                    <Icon name="location-outline" size={scaleFont(13)} color={COLORS.primary} />
                    <Text style={styles.metaChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {provider.location}
                    </Text>
                  </View>
                ) : null}
                {service.experience > 0 && (
                  <View style={styles.metaChip}>
                    <Icon name="time-outline" size={scaleFont(13)} color={COLORS.primary} />
                    <Text style={styles.metaChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {service.experience} yr{service.experience !== 1 ? 's' : ''} exp
                    </Text>
                  </View>
                )}
              </View>

              {service.subCategories.length > 0 && (
                <View style={styles.heroChipsRow}>
                  {service.subCategories.slice(0, 2).map((cat) => (
                    <View key={cat} style={styles.heroChip}>
                      <Icon name="briefcase-outline" size={scaleFont(12)} color={COLORS.primary} />
                      <Text style={styles.heroChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {cat}
                      </Text>
                    </View>
                  ))}
                  {service.experience > 0 && (
                    <View style={styles.heroChip}>
                      <Icon name="time-outline" size={scaleFont(12)} color={COLORS.primary} />
                      <Text style={styles.heroChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {service.experience}+ Yr{service.experience !== 1 ? 's' : ''} Experience
                      </Text>
                    </View>
                  )}
                  {/* ── View count chip – always shown ── */}
                  <View style={styles.heroChip}>
                    <Icon name="eye-outline" size={scaleFont(12)} color={COLORS.primary} />
                    <Text style={styles.heroChipText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {service.views} View{service.views !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              )}

              <Text
                style={styles.description}
                numberOfLines={descExpanded ? undefined : 3}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {service.description}
              </Text>
              <TouchableOpacity
                onPress={() => setDescExpanded(v => !v)}
                activeOpacity={0.7}
                style={styles.readMoreRow}>
                <Text style={styles.readMoreText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {descExpanded ? 'Show Less' : 'Read More'}
                </Text>
                <Icon
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={scaleFont(15)}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {provider && (
                <View style={styles.providerCard}>
                  <View style={styles.providerCardTop}>
                    {renderProviderAvatar()}
                    <View style={styles.providerCardInfo}>
                      <Text style={styles.providerCardName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {provider.name}
                      </Text>
                      <Text style={styles.providerCardRole} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {provider.role}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        navigation?.navigate('ProviderProfile', { providerId: provider.id })
                      }
                      activeOpacity={0.7}>
                      <Text style={styles.viewProfileText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        View Profile
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ─── UPDATED: provider stats with review count ────────── */}
                  <View style={styles.providerStats}>
                    <View style={styles.providerStat}>
                      <Text style={styles.providerStatLabel}>Rating</Text>
                      <View style={styles.providerStatValueWrap}>
                        <Text style={styles.providerStatValue}>{provider.rating.toFixed(1)}</Text>
                        <StarRating rating={provider.rating} size={12} />
                        <Text style={styles.providerStatSubtext}>
                          ({provider.reviewCount})
                        </Text>
                      </View>
                    </View>
                    <View style={styles.providerStatDivider} />
                    <View style={styles.providerStat}>
                      <Text style={styles.providerStatLabel}>Experience</Text>
                      <Text style={styles.providerStatValue}>{provider.yearsExp} Yrs</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Business Information
                </Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Owner</Text>
                  <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {provider?.name || '—'}
                  </Text>
                </View>
                {provider?.memberSince && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Member Since</Text>
                    <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {formatMemberSince(provider.memberSince)}
                    </Text>
                  </View>
                )}
                {service.experience > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Experience</Text>
                    <Text style={styles.infoValue} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {service.experience} year{service.experience !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <ScrollView
                ref={tabScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBar}
                style={styles.tabBarWrap}>
                {TABS.map((tab) => {
                  const label = tab === 'Reviews' && service.reviewCount > 0
                    ? `Reviews (${service.reviewCount})`
                    : tab;
                  const active = activeTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      activeOpacity={0.7}
                      style={[styles.tabItem, active && styles.tabItemActive]}>
                      <Text
                        style={[styles.tabLabel, active && styles.tabLabelActive]}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.tabContentWrap}>
                {renderTabContent()}
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, { marginBottom: scaleHeight(12) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                What's Included
              </Text>
              {service.includes.map((item, idx) => (
                <View key={idx} style={styles.includeRow}>
                  <View style={styles.includeCheck}>
                    <Icon name="checkmark" size={scaleFont(11)} color="#16A34A" />
                  </View>
                  <Text style={styles.includeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {item}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              {similar.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginBottom: moderateScale(14, 0.3) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Similar Services
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.similarRow}>
                    {similar.map(s => (
                      <ServiceCard
                        key={s.id}
                        item={s}
                        onPress={() =>
                          navigation?.navigate('ServiceDetail', { serviceId: s.id })
                        }
                        cardWidth={width * 0.52}
                      />
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </NetworkAwareView>
        </ScrollView>

        {/* ── Bottom action bar ── */}
        <View
          style={[styles.bottomBar, { paddingBottom: insets.bottom + moderateScale(12, 0.3) }]}
          onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}>
          <TouchableOpacity
            style={styles.wishlistBtn}
            activeOpacity={0.7}
            onPress={handleWishlistToggle}>
            <Icon
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={scaleFont(22)}
              color={isWishlisted ? COLORS.gradientEnd : COLORS.textMuted}
              allowFontScaling={false}
            />
          </TouchableOpacity>

          {isOwnService ? (
            <View style={[styles.contactBtnWrap, styles.ownServiceBtn]}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.contactBtn}>
                <Text
                  style={styles.contactBtnText}
                  maxFontSizeMultiplier={BOTTOM_BAR_MAX_FONT_MULTIPLIER}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  Your Service
                </Text>
              </LinearGradient>
            </View>
          ) : provider?.phoneNumber ? (
            <View style={styles.ctaButtons}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.whatsappBtnWrap}
                onPress={handleContactProvider}>
                <View style={styles.whatsappBtn}>
                  <Icon name="logo-whatsapp" size={scaleFont(17)} color="#16A34A" allowFontScaling={false} />
                  <Text
                    style={styles.whatsappBtnText}
                    maxFontSizeMultiplier={BOTTOM_BAR_MAX_FONT_MULTIPLIER}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    WhatsApp
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.contactBtnWrap}
                onPress={handleCallNow}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.contactBtn}>
                  <Icon name="call-outline" size={scaleFont(16)} color="#fff" allowFontScaling={false} />
                  <Text
                    style={styles.contactBtnText}
                    maxFontSizeMultiplier={BOTTOM_BAR_MAX_FONT_MULTIPLIER}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    Call Now
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.contactBtnWrap}
              onPress={handleContactProvider}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.contactBtn}>
                <Text
                  style={styles.contactBtnText}
                  maxFontSizeMultiplier={BOTTOM_BAR_MAX_FONT_MULTIPLIER}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  Contact Provider
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <ImageCarouselModal
          visible={carouselVisible}
          images={service.images}
          initialIndex={carouselIndex}
          onClose={() => setCarouselVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },

  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  errorTitle: {
    fontSize: scaleFont(18),
    color: COLORS.textMuted,
  },
  errorBack: {
    fontSize: scaleFont(15),
    color: COLORS.primary,
    fontWeight: FONTS.weightBold,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    paddingHorizontal: scaleWidth(4),
    paddingVertical: scaleHeight(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButton: {
    paddingHorizontal: scaleWidth(4),
    paddingVertical: scaleHeight(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginHorizontal: scaleWidth(4),
  },

  sheet: {
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(20),
    paddingTop: moderateScale(20, 0.3),
  },

  categoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(5),
    borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(5),
    marginBottom: scaleHeight(10),
  },
  categoryPillText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
  },

  serviceTitle: {
    fontSize: scaleFont(24),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    lineHeight: moderateScale(30, 0.3),
    marginBottom: scaleHeight(10),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6, 0.3),
    marginBottom: scaleHeight(10),
  },
  ratingValue: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  ratingCount: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(14),
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
  },
  metaChipText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },

  heroChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(14),
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(5),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(7),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#fefdff',
    borderWidth: 1,
    borderColor: '#E8E1FF',
  },
  heroChipText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
  },

  description: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
    marginBottom: scaleHeight(4),
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3, 0.3),
    marginTop: scaleHeight(4),
  },
  readMoreText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },

  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginVertical: moderateScale(20, 0.3),
  },

  providerCard: {
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(16, 0.3),
  },
  providerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12, 0.3),
    marginBottom: scaleHeight(14),
  },
  providerAvatar: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(24, 0.3),
    backgroundColor: COLORS.border,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  initialsText: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    textAlign: 'center',
  },
  providerCardInfo: { flex: 1 },
  providerCardName: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  providerCardRole: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  viewProfileText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },
  providerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: moderateScale(14, 0.3),
  },
  providerStat: { flex: 1, alignItems: 'center' },
  providerStatLabel: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(3),
  },
  providerStatValue: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },
  providerStatValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4, 0.3),
  },
  providerStatSubtext: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  providerStatDivider: {
    width: 1,
    height: moderateScale(30, 0.3),
    backgroundColor: COLORS.border,
  },

  infoCard: {
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(16, 0.3),
  },
  infoCardTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(12),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleHeight(6),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoLabel: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: scaleWidth(12),
  },

  tabBarWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: scaleHeight(4),
  },
  tabBar: {
    flexDirection: 'row',
    gap: scaleWidth(2),
  },
  tabItem: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
    whiteSpace: 'nowrap',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weightBold,
  },
  tabContentWrap: {
    marginTop: scaleHeight(16),
  },

  tabContent: {},
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(10),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    marginBottom: scaleHeight(12),
  },
  emptyText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(14),
  },
  providerBio: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginTop: scaleHeight(6),
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
    padding: moderateScale(12, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(12, 0.3),
    marginBottom: scaleHeight(10),
  },
  pdfIcon: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfName: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  pdfSub: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },

  subCatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(10),
  },
  subCatCard: {
    width: (width - scaleWidth(60)) / 2,
    padding: moderateScale(14, 0.3),
    borderRadius: moderateScale(14, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#ffffff',
  },
  subCatIcon: {
    width: moderateScale(38, 0.3),
    height: moderateScale(38, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(10),
  },
  subCatName: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subCatCategory: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
  },
  keywordPill: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(20, 0.3),
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keywordText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: moderateScale(6, 0.3),
  },
  galleryGridItem: {
    width: (width - scaleWidth(45) - moderateScale(10, 0.2)) / 7,
    aspectRatio: 1,
    borderRadius: moderateScale(10, 0.3),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  galleryGridImg: {
    width: '100%',
    height: '100%',
  },
  galleryEmpty: {
    alignItems: 'center',
    paddingVertical: scaleHeight(30),
    gap: scaleHeight(10),
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(10),
    padding: moderateScale(14, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  viewOnMap: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginTop: scaleHeight(6),
  },

  includeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(10),
  },
  includeCheck: {
    width: moderateScale(20, 0.3),
    height: moderateScale(20, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(1, 0.3),
  },
  includeText: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: moderateScale(20, 0.3),
  },

  similarRow: {
    gap: scaleWidth(12),
    paddingRight: scaleWidth(4),
    paddingBottom: scaleHeight(4),
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: moderateScale(14, 0.3),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scaleWidth(6), // reduced from 10
  },
  wishlistBtn: {
    width: moderateScale(46, 0.3),
    height: moderateScale(46, 0.3),
    borderRadius: moderateScale(23, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    flexShrink: 0, // prevent shrinking
  },
  ctaButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: scaleWidth(6), // reduced from 8
  },
  whatsappBtnWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(6),
    paddingVertical: moderateScale(13, 0.3),
    backgroundColor: COLORS.white,
  },
  whatsappBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: '#16A34A',
  },
  contactBtnWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  ownServiceBtn: {
    opacity: 0.7,
    shadowOpacity: 0.05,
  },
  contactBtn: {
    paddingVertical: moderateScale(14, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scaleWidth(6),
  },
  contactBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default ServiceDetailScreen;