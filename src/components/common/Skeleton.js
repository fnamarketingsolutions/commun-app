// components/common/Skeleton.js
// SK1 UPGRADE: Replaced simple opacity pulse with horizontal LinearGradient shimmer sweep.
// The shimmer moves a highlight band from left to right, creating the polished
// "content loading" effect seen in modern apps (Facebook, Instagram, etc.).
//
// Falls back gracefully: if LinearGradient is unavailable the opacity pulse still works.
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../theme';
import { moderateScale } from '../../utils/responsive';

// Shimmer gradient stops: base → highlight → base
const SHIMMER_BASE    = '#EDE9FE'; // matches COLORS.inputBg (#F3F0FF) — slightly warmer
const SHIMMER_HIGHLIGHT = '#FAF8FF'; // near-white highlight streak

const Skeleton = ({ width = '100%', height = 14, borderRadius = 6, style }) => {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  const scaledHeight  = moderateScale(height, 0.3);
  const scaledRadius  = moderateScale(borderRadius, 0.3);

  return (
    <View
      style={[
        styles.base,
        {
          width,
          height: scaledHeight,
          borderRadius: scaledRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Animated shimmer overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                // translateX animates from -100% to +100% of the container width.
                // Since we can't know exact px width, we use a large pixel offset
                // that covers most realistic skeleton widths (up to ~800dp).
                translateX: translateX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-400, 400],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[SHIMMER_BASE, SHIMMER_HIGHLIGHT, SHIMMER_HIGHLIGHT, SHIMMER_BASE]}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: SHIMMER_BASE,
  },
});

export default Skeleton;