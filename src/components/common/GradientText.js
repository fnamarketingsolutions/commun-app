// components/common/GradientText.js
// GT1 FIX: Replaced crude text-length * fontSize width estimation with
// onLayout measurement. Previously: `length * (fontSize * 0.55) + 8`
// This breaks with wide characters, emojis, ligatures, and non-Latin scripts.
// New approach: measure the actual rendered text size and use that for the SVG.
import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { LinearGradient as SvgGradient, Text as SvgText, Defs, Stop } from 'react-native-svg';

const GradientText = ({ colors, children, style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <Text style={[style, { color: colors?.[0] || '#73469B' }]} {...props}>
        {children}
      </Text>
    );
  }

  const fontSize     = style?.fontSize || 14;
  const fontWeight   = style?.fontWeight || '600';
  const fontFamily   = style?.fontFamily || undefined;
  const letterSpacing = style?.letterSpacing || 0;

  // GT1 FIX: Use onLayout to get the real rendered dimensions.
  // We render an invisible Text clone to measure, then draw the SVG on top.
  const [measuredWidth, setMeasuredWidth] = useState(null);

  const handleLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setMeasuredWidth(width);
  };

  // Add safety padding (+12px width, 1.6x height) so letters with descenders/curves like 'p', 'g', 'y' are never clipped
  const svgWidth = (measuredWidth ? Math.ceil(measuredWidth) + 12 : String(children).length * (fontSize * 0.7) + 24);
  const svgHeight = Math.ceil(fontSize * 1.6);

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {/* Invisible measuring clone — same text, same style, opacity 0 */}
      <Text
        onLayout={handleLayout}
        style={[
          style,
          {
            position: 'absolute',
            opacity: 0,
            fontSize,
            fontWeight,
            fontFamily,
            letterSpacing,
          },
        ]}
      >
        {children}
      </Text>

      {/* Gradient SVG rendered at measured width */}
      <Svg width={svgWidth} height={svgHeight}>
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors?.[0] || '#73469B'} />
            <Stop offset="1" stopColor={colors?.[1] || '#D5599E'} />
          </SvgGradient>
        </Defs>
        <SvgText
          fill="url(#grad)"
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily={fontFamily}
          letterSpacing={letterSpacing}
          x={0}
          y={fontSize * 1.05} // baseline alignment
          {...props}
        >
          {children}
        </SvgText>
      </Svg>
    </View>
  );
};

export default GradientText;