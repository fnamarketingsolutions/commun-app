// screens/provider/ProviderHubScreen.jsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ── Panels ──────────────────────────────────────────────────────────────────
const PANELS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    desc: 'Overview & stats',
    icon: 'add-circle-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.PROVIDER_DASHBOARD,
  },
  {
    id: 'manage',
    label: 'Manage Services',
    desc: 'Edit your offerings',
    icon: 'briefcase-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.MANAGE_SERVICE,
  },
  {
    id: 'profile',
    label: 'Update Profile',
    desc: 'Refine your identity',
    icon: 'person-outline',
    iconBg: COLORS.gradientStart + '15',
    iconColor: COLORS.gradientStart,
    route: ROUTES.EDIT_PROVIDER_PROFILE,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const ProviderHubScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState(null);

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ── Simple refresh logic (no feature toggle fetch needed) ──
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    setRefreshing(true);
    // Simulate a refresh (or you can trigger any needed refetch here)
    setTimeout(() => setRefreshing(false), 500);
  }, [isOnline]);

  const handlePress = (panel) => {
    setActiveId(panel.id);
    setTimeout(() => {
      navigation?.navigate(panel.route);
      setActiveId(null);
    }, 150);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { paddingBottom: insets.bottom || moderateScale(16, 0.3) }]}>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider Hub
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={!isOnline}
          message="You are offline. The hub features are still available."
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.gradientStart}
              />
            }
          >
            <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Manage your services, profile, and business activity.
            </Text>

            {PANELS.map((panel) => {
              const isActive = activeId === panel.id;
              const disabled = !isOnline;

              return (
                <TouchableOpacity
                  key={panel.id}
                  style={[
                    styles.card,
                    disabled && { opacity: 0.5 },
                    isActive && styles.cardActive,
                  ]}
                  activeOpacity={disabled ? 1 : 0.7}
                  onPress={() => handlePress(panel)}
                  disabled={disabled}
                >
                  <View style={[styles.iconCircle, { backgroundColor: panel.white }]}>
                    <Icon
                      name={panel.icon}
                      size={scaleFont(24)}
                      color={disabled ? COLORS.textMuted : panel.iconColor}
                    />
                  </View>

                  <View style={styles.cardTextContainer}>
                    <Text
                      style={[styles.cardTitle, disabled && { color: COLORS.textMuted }]}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {panel.label}
                    </Text>
                    <Text
                      style={[styles.cardDescription, disabled && { color: COLORS.textMuted }]}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {panel.desc}
                    </Text>
                  </View>

                  <Icon
                    name="chevron-forward"
                    size={scaleFont(20)}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </NetworkAwareView>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles (unchanged) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
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
  cardActive: {
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.gradientStart,
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

export default ProviderHubScreen;