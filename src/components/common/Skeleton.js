// components/common/Skeleton.jsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';
import { moderateScale } from '../../utils/responsive';

/**
 * Skeleton
 * A single shimmering placeholder block. Compose several of these to build
 * a skeleton layout that mirrors the shape of the real content.
 */
const Skeleton = ({ width = '100%', height = 14, borderRadius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height: moderateScale(height, 0.3),
          borderRadius: moderateScale(borderRadius, 0.3),
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.inputBg,
  },
});

export default Skeleton;