// src/components/SvgImage.js

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { moderateScale, scaleFont } from '../utils/responsive';

const SvgImage = ({ uri, style, onError }) => {
  const [svgXml, setSvgXml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uri) {
      setLoading(false);
      setError(true);
      onError?.();
      return;
    }

    const fetchSvg = async () => {
      try {
        const response = await fetch(uri);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        setSvgXml(xml);
        setLoading(false);
      } catch (err) {
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    fetchSvg();
  }, [uri]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={COLORS.gradientStart} />
      </View>
    );
  }

  if (error || !svgXml) {
    onError?.();
    return null;
  }

  return (
    <View style={style}>
      <SvgXml xml={svgXml} width="100%" height="100%" />
    </View>
  );
};

export default SvgImage;