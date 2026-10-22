import React from 'react';
import { StyleSheet, View } from 'react-native';
import NativeLinearGradient from 'react-native-linear-gradient/index.js';

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
];

const hasRadius = (style) => {
  const flat = StyleSheet.flatten(style) || {};
  return RADIUS_KEYS.some((key) => Number(flat[key]) > 0);
};

// iOS draws this gradient on the view's own layer and clips the children to
// that layer. Keep the gradient as a background so text, inputs, and icons
// keep their real height on every phone size.
const SafeLinearGradient = React.forwardRef(
  ({ children, style, pointerEvents, ...rest }, ref) => {
    if (React.Children.count(children) === 0) {
      return (
        <NativeLinearGradient
          ref={ref}
          pointerEvents={pointerEvents}
          style={style}
          {...rest}
        />
      );
    }

    return (
      <View
        ref={ref}
        pointerEvents={pointerEvents}
        style={[style, hasRadius(style) ? { overflow: 'hidden' } : null]}
      >
        <NativeLinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          {...rest}
        />
        {children}
      </View>
    );
  },
);

SafeLinearGradient.displayName = 'LinearGradient';

export default SafeLinearGradient;
