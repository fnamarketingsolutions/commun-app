// screens/secretary/EditLocalBusinessScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import LocalBusinessForm from './LocalBusinessForm';
import { validateLocalBusinessForm } from './Validatelocalbusinessform';
import {
  useFetchBusinessCategoriesQuery,
  useFetchSecretaryLocalBusinessByIdQuery,
  useUpdateSecretaryLocalBusinessMutation,
} from '../../redux/service/secretaryApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const toFormValue = (business) => ({
  businessName: business.businessName || '',
  description: business.description || '',
  ownerName: business.ownerName || '',
  contactNumber: business.contactNumber || '',
  email: business.email || '',
  address: business.address || '',
  website: business.website || '',
  businessCategories: business.businessCategories || [],
  discountPercentage:
    business.discountPercentage != null ? String(business.discountPercentage) : '',
  discountedCategories: business.discountedCategories || [],
  nonDiscountedCategories: business.nonDiscountedCategories || [],
  discountStartDate: business.discountStartDate || null,
  discountEndDate: business.discountEndDate || null,
  status: business.status || 'active',   // <-- added
  logo: null,
  logoUrl: business.logoUrl || '',
  bannerUrl: business.bannerUrl || '',
});

const EditLocalBusinessScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { businessId } = route.params;

  const {
    data: business,
    isLoading: isLoadingBusiness,
    error: loadError,
  } = useFetchSecretaryLocalBusinessByIdQuery(businessId);
  const { data: categories = [] } = useFetchBusinessCategoriesQuery();
  const [updateBusiness, { isLoading: submitting }] = useUpdateSecretaryLocalBusinessMutation();

  const [value, setValue] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (business) setValue(toFormValue(business));
  }, [business]);

  const onSubmit = async () => {
    if (!value) return;
    const nextErrors = validateLocalBusinessForm(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await updateBusiness({
        businessId,
        payload: {
          businessName: value.businessName.trim(),
          description: value.description?.trim() || '',
          ownerName: value.ownerName.trim(),
          contactNumber: value.contactNumber.trim(),
          email: value.email.trim().toLowerCase(),
          address: value.address.trim(),
          website: value.website?.trim() || '',
          businessCategories: value.businessCategories,
          discountPercentage: value.discountPercentage,
          discountedCategories: value.discountedCategories,
          nonDiscountedCategories: value.nonDiscountedCategories,
          discountStartDate: value.discountStartDate,
          discountEndDate: value.discountEndDate,
          status: value.status || 'active',   // <-- added (already in value, but explicit)
          ...(value.logo?.uri ? { logo: value.logo } : {}),
          ...(value.banner?.uri ? { banner: value.banner } : {}),
        },
      }).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to update', e?.data?.message || 'Could not update business.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Edit Business
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {isLoadingBusiness || !value ? (
        <View style={styles.centeredState}>
          {loadError ? (
            <>
              <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {loadError?.data?.message || 'Could not load business.'}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}>
                <Text style={styles.retryBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Go Back
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="small" color={COLORS.gradientStart} />
          )}
        </View>
      ) : (
        <View style={[styles.formWrap, { paddingBottom: insets.bottom + scaleHeight(24) }]}>
          <LocalBusinessForm
            value={value}
            onChange={setValue}
            categories={categories}
            errors={errors}
            submitting={submitting}
            onSubmit={onSubmit}
            submitLabel="Save Changes"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(24) },
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    gap: scaleHeight(12),
  },
  errorText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
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
  formWrap: {
    flex: 1,
    paddingTop: scaleHeight(16),
  },
});

export default EditLocalBusinessScreen;