import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const TYPE_CONFIG = {
  error: {
    icon: 'alert-circle',
    iconColor: '#EF4444',
    iconBg: '#FEE2E2',
    iconRing: '#FECACA',
    gradient: ['#EF4444', '#DC2626'],
    defaultTitle: 'Notice',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    iconBg: '#D1FAE5',
    iconRing: '#A7F3D0',
    gradient: ['#10B981', '#059669'],
    defaultTitle: 'Success',
  },
  warning: {
    icon: 'warning',
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
    iconRing: '#FDE68A',
    gradient: ['#F59E0B', '#D97706'],
    defaultTitle: 'Warning',
  },
  info: {
    icon: 'information-circle',
    iconColor: COLORS.primary,
    iconBg: '#EDE9FE',
    iconRing: '#DDD6FE',
    gradient: [COLORS.gradientStart, COLORS.gradientEnd],
    defaultTitle: 'Information',
  },
};

/**
 * CustomAlertModal
 * Professional, modern rounded alert popup modal with smooth spring animation and theme styling.
 */
export const CustomAlertModal = ({
  visible = false,
  onClose,
  type = 'error',
  title,
  message,
  primaryButtonText = 'OK',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  isLoading = false,
  closeOnBackdrop = true,
  children,
}) => {
  const scaleAnim   = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  // AM1: Reactive width for tablet-safe modal card sizing
  const { width: windowWidth } = useWindowDimensions();
  const modalMaxWidth = Math.min(windowWidth * 0.85, 400);

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.error;
  const resolvedTitle = title || config.defaultTitle;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.82);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    if (closeOnBackdrop && onClose && !isLoading) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  maxWidth: modalMaxWidth,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Icon Badge */}
              <View style={[styles.iconRing, { borderColor: config.iconRing }]}>
                <View style={[styles.iconBadge, { backgroundColor: config.iconBg }]}>
                  <Icon name={config.icon} size={scaleFont(30)} color={config.iconColor} />
                </View>
              </View>

              {/* Title */}
              {!!resolvedTitle && (
                <Text
                  style={styles.title}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {resolvedTitle}
                </Text>
              )}

              {/* Message */}
              {!!message && (
                <Text
                  style={styles.message}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {message}
                </Text>
              )}

              {/* Optional Custom Content */}
              {children}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {!!secondaryButtonText && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleSecondaryPress}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={styles.secondaryButtonText}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {secondaryButtonText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButtonWrap,
                    !secondaryButtonText && { width: '100%' },
                  ]}
                  onPress={handlePrimaryPress}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={config.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text
                        style={styles.primaryButtonText}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        {primaryButtonText}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  modalCard: {
    width: '100%',
    maxWidth: moderateScale(340, 0.3),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(28, 0.3),
    paddingTop: moderateScale(26, 0.3),
    paddingBottom: moderateScale(22, 0.3),
    paddingHorizontal: moderateScale(22, 0.3),
    alignItems: 'center',
    ...SHADOW.card,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: moderateScale(24, 0.3),
    elevation: 16,
    borderWidth: moderateScale(1, 0.3),
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  iconRing: {
    width: moderateScale(68, 0.3),
    height: moderateScale(68, 0.3),
    borderRadius: moderateScale(34, 0.3),
    borderWidth: moderateScale(3, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(14),
  },
  iconBadge: {
    width: moderateScale(54, 0.3),
    height: moderateScale(54, 0.3),
    borderRadius: moderateScale(27, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(8),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  message: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(20),
    paddingHorizontal: scaleWidth(4),
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: moderateScale(10, 0.3),
  },
  secondaryButton: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: '#F3F4F6',
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(12),
  },
  secondaryButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  primaryButtonWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    overflow: 'hidden',
    ...SHADOW.button,
    shadowOpacity: 0.25,
    elevation: 4,
  },
  primaryGradient: {
    height: moderateScale(48, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(14),
  },
  primaryButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
  },
});

export default CustomAlertModal;
