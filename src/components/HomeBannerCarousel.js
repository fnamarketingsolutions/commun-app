// src/components/HomeBannerCarousel.js

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../theme';
import { moderateScale, scaleWidth, scaleHeight } from '../utils/responsive';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = moderateScale(200, 0.3);
const SLIDE_WIDTH = width - scaleWidth(36); // 18px padding each side

const HomeBannerCarousel = ({ banners = [], isLoading = false, isError = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  // Auto‑scroll every 4 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const onScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <View style={[styles.wrapper, styles.loadingWrapper]}>
        <ActivityIndicator size="small" color={COLORS.gradientStart} />
      </View>
    );
  }

  if (isError || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.slideWrap}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, index) => ({
          length: SLIDE_WIDTH,
          offset: SLIDE_WIDTH * index,
          index,
        })}
      />

      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: width,
    height: BANNER_HEIGHT + scaleHeight(16), // space for dots
    marginBottom: scaleHeight(8),
    paddingHorizontal: scaleWidth(18),
  },
  loadingWrapper: {
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  slideWrap: {
    width: SLIDE_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: moderateScale(20, 0.3),
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(8, 0.3),
    shadowOffset: { width: 0, height: scaleHeight(4) },
    elevation: 3,
    backgroundColor: COLORS.border, // fallback while loading
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(20, 0.3), // match parent
    backgroundColor: COLORS.border,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scaleHeight(8),
    gap: scaleWidth(6),
  },
  dot: {
    borderRadius: moderateScale(4, 0.3),
  },
  dotActive: {
    width: moderateScale(16, 0.3),
    height: moderateScale(6, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  dotInactive: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    backgroundColor: COLORS.border,
  },
});

export default HomeBannerCarousel;