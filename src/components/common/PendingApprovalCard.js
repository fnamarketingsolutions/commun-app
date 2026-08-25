// components/common/PendingApprovalCard.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

import { COLORS, FONTS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const PendingApprovalCard = ({
  title = 'Waiting for Approval',
  message = "Your community secretary is reviewing your request. This section will unlock once you're approved.",
}) => {
  return (
    <View style={styles.wrapper}>
      <LottieView
        source={require('../../assets/animations/CatTyping.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      <Text style={styles.message} maxFontSizeMultiplier={1.3}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white ?? '#ffffff',
    paddingHorizontal: scaleWidth(32),
  },
  lottie: {
    width: moderateScale(220, 0.3),
    height: moderateScale(220, 0.3),
    marginBottom: scaleHeight(8),
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  message: {
    fontSize: scaleFont(13.5),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
});

export default PendingApprovalCard;