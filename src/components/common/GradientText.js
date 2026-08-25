import React from 'react';
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

  const fontSize = style?.fontSize || 14;
  const fontWeight = style?.fontWeight || '600';
  const fontFamily = style?.fontFamily || undefined;
  const letterSpacing = style?.letterSpacing || 0;

  // Estimate width based on text length
  const textWidth = String(children).length * (fontSize * 0.55) + 8;

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Svg width={textWidth} height={fontSize * 1.4}>
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
          y={fontSize * 1.05} // adjust baseline alignment
          {...props}
        >
          {children}
        </SvgText>
      </Svg>
    </View>
  );
};

export default GradientText;