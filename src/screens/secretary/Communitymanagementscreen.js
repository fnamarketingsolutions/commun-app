// screens/secretary/CommunityManagementScreen.jsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { ROUTES } from '../../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ── Only the core items remain ──────────────────────────────────────────────
const MENU_ITEMS = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'View high-level community metrics and insights.',
    iconLib: 'material',
    iconName: 'view-grid-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    screen: 'CommunityDashboard',
  },
  {
    key: 'approveProviders',
    title: 'Approve Providers',
    description: 'Review provider requests from residents.',
    iconLib: 'material',
    iconName: 'shield-check-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    screen: 'ApproveProviders',
  },
  {
    key: 'services',
    title: 'Services',
    description: 'Choose which service categories members can browse.',
    iconLib: 'material',
    iconName: 'toggle-switch-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    screen: 'SecretaryServices',
  },
  {
    key: 'memberDirectory',
    title: 'Member Directory',
    description: 'View and manage community members.',
    iconLib: 'ionicon',
    iconName: 'people-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    screen: 'CommunityMembers',
  },
  {
  key: 'reviews',
  title: 'Reviews',
  description: 'View and manage community reviews.',
  iconLib: 'ionicon',
  iconName: 'chatbubbles-outline',
  iconBg: COLORS.gradientStart + '15',
  iconColor: COLORS.gradientStart,
  screen: ROUTES.SECRETARY_REVIEWS,
},
];

const CommunityManagementScreen = () => {
  const navigation = useNavigation();
  const { isOnline } = useNetworkStatus();

  const handleItemPress = (screen) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to access this feature.');
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Community Management
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. Please connect to the internet to access management features."
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Manage providers, members, and service categories for your community.
          </Text>

          {MENU_ITEMS.map((item) => {
            const disabled = !isOnline;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.card, disabled && { opacity: 0.5 }]}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => handleItemPress(item.screen)}
                disabled={disabled}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.white }]}>
                  {item.iconLib === 'material' ? (
                    <MaterialIcon
                      name={item.iconName}
                      size={scaleFont(24)}
                      color={disabled ? COLORS.textMuted : item.iconColor}
                    />
                  ) : (
                    <Icon
                      name={item.iconName}
                      size={scaleFont(24)}
                      color={disabled ? COLORS.textMuted : item.iconColor}
                    />
                  )}
                </View>

                <View style={styles.cardTextContainer}>
                  <Text
                    style={[styles.cardTitle, disabled && { color: COLORS.textMuted }]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.cardDescription, disabled && { color: COLORS.textMuted }]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    {item.description}
                  </Text>
                </View>

                <Icon name="chevron-forward" size={scaleFont(20)} color={COLORS.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: scaleWidth(24),
  },
  headerSpacer: {
    width: scaleWidth(24),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(32),
  },
  subtitle: {
    fontSize: scaleFont(16),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(24, 0.3),
    marginBottom: scaleHeight(24),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  iconCircle: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(26, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(16),
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  cardTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  cardDescription: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    lineHeight: moderateScale(19, 0.3),
  },
});

export default CommunityManagementScreen;