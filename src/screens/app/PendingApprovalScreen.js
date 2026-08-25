// screens/app/PendingApprovalScreen.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useLogoutMutation } from '../../redux/service/api';
import { clearUser } from '../../redux/slices/authSlice';
import { clearToken } from '../../utils/tokenStorage';
import { COLORS, FONTS, RADIUS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const PendingApprovalScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutMutation().unwrap();
            } catch (_) {
              // Even if server call fails, clear locally
            } finally {
              await clearToken();
              dispatch(clearUser());
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Icon name="hourglass-outline" size={scaleFont(80)} color={COLORS.gradientStart} />

        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.subtitle}>
          Your account is under review by a secretary. You will get access once approved.
        </Text>

        {user?.communityCommunName && (
          <Text style={styles.communityText}>
            Community: @{user.communityCommunName}
          </Text>
        )}

        <TouchableOpacity
          style={styles.homeButtonWrap}
          onPress={handleGoHome}
          activeOpacity={0.85}
          disabled={isLoggingOut}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.homeButton}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.75}>
          {isLoggingOut ? (
            <ActivityIndicator color={COLORS.textPrimary} size="small" />
          ) : (
            <Text style={styles.logoutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: scaleHeight(16),
  },
  subtitle: {
    fontSize: scaleFont(16),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: scaleHeight(12),
    lineHeight: scaleHeight(24),
  },
  communityText: {
    fontSize: scaleFont(14),
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: scaleHeight(24),
  },
  homeButtonWrap: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: scaleHeight(16),
  },
  homeButton: {
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: COLORS.white,
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
  },
  logoutButton: {
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    minWidth: scaleWidth(120),
    alignItems: 'center',
  },
  logoutText: {
    fontSize: scaleFont(14),
    color: COLORS.gradientStart, // 👈 changed to match app icon theme
  },
});

export default PendingApprovalScreen;