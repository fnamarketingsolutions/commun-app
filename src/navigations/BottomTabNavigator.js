import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Keyboard, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { label: 'Home', active: 'home', inactive: 'home-outline' },
  Community: { label: 'Community', active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Services: { label: 'Service', active: 'briefcase', inactive: 'briefcase-outline' },
  Directory: { label: 'Directory', active: 'library', inactive: 'library-outline' },
  Profile: { label: 'Profile', active: 'person', inactive: 'person-outline' },
};

const ACCESSIBILITY_STATE_SELECTED = { selected: true };
const ACCESSIBILITY_STATE_UNSELECTED = {};

// A11 FIX: Static values kept ONLY for the exported TAB_BAR_CONTENT_HEIGHT / useTabBarHeight().
// These don't need to be reactive since the physical bar height rarely changes
// (it's based on device class, not orientation).
const { width: SCREEN_WIDTH_INITIAL } = Dimensions.get('window');
const IS_SMALL_DEVICE_INITIAL = SCREEN_WIDTH_INITIAL < 360;
const IS_TABLET_INITIAL       = SCREEN_WIDTH_INITIAL >= 768;
// ICON_SIZE and LABEL_SIZE are now computed INSIDE TabBarButton using useWindowDimensions.
// This makes them reactive to orientation / split-screen changes.

const BAR_MIN_HEIGHT = 56;
const BAR_TOP_PADDING = SPACING.xs;

export const TAB_BAR_CONTENT_HEIGHT = BAR_MIN_HEIGHT + BAR_TOP_PADDING;

export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  // Include the extra 4px bottom offset so scroll views know the true height
  return BAR_MIN_HEIGHT + BAR_TOP_PADDING + insets.bottom + 4;
}

const INACTIVE_ICON_COLOR = COLORS.textMuted;
const ACTIVE_ICON_COLOR = COLORS.gradientStart;

const SPRING_CONFIG = { damping: 12, stiffness: 180 };

// ── Keyboard show/hide event names differ per platform ─────────────────────
const KEYBOARD_SHOW_EVENT = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
const KEYBOARD_HIDE_EVENT = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

const TabBarButton = React.memo(function TabBarButton({
  routeName,
  isFocused,
  onPress,
  onLongPress,
}) {
  // A11 FIX: Reactive device class — recalculates on orientation/split-screen
  const { width: tabWidth } = useWindowDimensions();
  const isSmallTab  = tabWidth < 360;
  const isTabletTab = tabWidth >= 768;
  const ICON_SIZE   = isTabletTab ? 24 : isSmallTab ? 20 : 22;
  const LABEL_SIZE  = isTabletTab ? 12 : isSmallTab ? 10 : 11;

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon = TAB_ICONS[routeName];
  const accessibilityState = isFocused
    ? ACCESSIBILITY_STATE_SELECTED
    : ACCESSIBILITY_STATE_UNSELECTED;

  return (
    <Animated.View style={[styles.tabButton, animatedStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        style={styles.touchableFill}
      >
        <Icon
          name={isFocused ? icon.active : icon.inactive}
          size={ICON_SIZE}
          color={isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
        />
        <Text
          style={[
            styles.label,
            isFocused && styles.labelFocused,
            { fontSize: LABEL_SIZE },
          ]}
        >
          {icon.label}
        </Text>
        {isFocused && <View style={styles.activeUnderline} />}
      </TouchableOpacity>
    </Animated.View>
  );
});

const TabBarRoute = React.memo(function TabBarRoute({
  route,
  isFocused,
  navigation,
}) {
  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [navigation, route.key, route.name, isFocused]);

  const onLongPress = useCallback(() => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  }, [navigation, route.key]);

  return (
    <TabBarButton
      routeName={route.name}
      isFocused={isFocused}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
});

const CustomTabBar = React.memo(function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(KEYBOARD_SHOW_EVENT, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(KEYBOARD_HIDE_EVENT, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) return null;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route, index) => (
        <TabBarRoute
          key={route.key}
          route={route}
          isFocused={state.index === index}
          navigation={navigation}
        />
      ))}
    </View>
  );
});

const renderTabBar = (props) => <CustomTabBar {...props} />;

function BottomTabNavigator({ Home, Community, Services, Directory, Profile }) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: false }}
      tabBar={renderTabBar}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Community" component={Community} />
      <Tab.Screen name="Services" component={Services} />
      <Tab.Screen name="Directory" component={Directory} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: BAR_TOP_PADDING,
    minHeight: BAR_MIN_HEIGHT,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
    paddingHorizontal: SPACING.xs,
  },
  touchableFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelFocused: {
    color: COLORS.gradientStart,
    fontWeight: '600',
  },
  activeUnderline: {
    marginTop: 2,
    width: 14,
    height: 2.5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gradientStart,
  },
});

export default React.memo(BottomTabNavigator);