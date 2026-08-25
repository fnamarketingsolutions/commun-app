// screens/auth/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { COLORS, FONTS } from '../../theme';
import { scaleFont, moderateScale, scaleWidth } from '../../utils/responsive';
import { useLazyCheckAuthQuery } from '../../redux/service/api';
import { setUser, clearUser } from '../../redux/slices/authSlice';
import { ROUTES } from '../../navigations/routes';
import { getToken, clearToken } from '../../utils/tokenStorage';

// ─── Import splash screen – but guard against null ────────────────────────
let SplashScreen;
try {
  SplashScreen = require('react-native-splash-screen').default || require('react-native-splash-screen');
} catch {
  SplashScreen = null;
}

const { width, height } = Dimensions.get('window');
const MIN_SPLASH_MS = 1500;

const SplashScreenComponent = ({ navigation }) => {
  const dispatch = useDispatch();
  const [triggerCheckAuth] = useLazyCheckAuthQuery();

  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  const gradientColors = [COLORS.gradientStart, COLORS.gradientEnd];

  useEffect(() => {
    // ─── Safely hide the native splash if the library is available ───
    if (SplashScreen && typeof SplashScreen.hide === 'function') {
      SplashScreen.hide();
    }

    // ─── Animations ──────────────────────────────────────────────────────
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    let isMounted = true;
    const startedAt = Date.now();

    const resolveAuthAndNavigate = async () => {
      let destination = ROUTES.LOGIN;

      try {
        const storedToken = await getToken();

        if (storedToken) {
          try {
            const result = await triggerCheckAuth().unwrap();
            if (result?.user) {
              dispatch(setUser(result.user));
              const user = result.user;
              const status = user.accountStatus || 'approved';

              if (status === 'rejected') {
                await clearToken();
                dispatch(clearUser());
                destination = ROUTES.LOGIN;
              } else {
                destination = ROUTES.TABS;
              }
            } else {
              await clearToken();
              dispatch(clearUser());
            }
          } catch (apiError) {
            await clearToken();
            dispatch(clearUser());
          }
        } else {
          dispatch(clearUser());
        }
      } catch (e) {
        dispatch(clearUser());
      }

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);

      setTimeout(() => {
        if (isMounted) {
          navigation.replace(destination);
        }
      }, remaining);
    };

    resolveAuthAndNavigate();

    return () => {
      isMounted = false;
    };
  }, []);

  const spin = spinValue.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={[styles.blobTopLeft, { backgroundColor: gradientColors[0] }]} />
      <View style={[styles.blobBottomRight, { backgroundColor: gradientColors[1] }]} />

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.loaderArea}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={styles.initText} maxFontSizeMultiplier={1.3}>
          CONNECTING NEIGHBOURHOODS
        </Text>
      </View>
    </View>
  );
};

export default SplashScreenComponent;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobTopLeft: {
    position: 'absolute',
    top: -height * 0.08,
    left: -width * 0.15,
    width:  width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    opacity: 0.45,
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -height * 0.05,
    right:  -width * 0.1,
    width:  width * 0.70,
    height: width * 0.70,
    borderRadius: width * 0.35,
    opacity: 0.45,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.65,
    height: width * 0.65,
  },
  loaderArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: height * 0.10,
    alignItems: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  spinner: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(22, 0.3),
    borderWidth: moderateScale(2.5, 0.3),
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
    marginBottom: moderateScale(16, 0.3),
  },
  initText: {
    fontSize: scaleFont(11),
    letterSpacing: moderateScale(2, 0.2),
    fontWeight: FONTS.weightMedium,
    textAlign: 'center',
    color: COLORS.gradientStart,
  },
});