// screens/secretary/AddLocalBusinessScreen.jsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LocalBusinessForm from './LocalBusinessForm';
import { validateLocalBusinessForm } from './Validatelocalbusinessform';
import {
  useFetchBusinessCategoriesQuery,
  useCreateSecretaryLocalBusinessMutation,
} from '../../redux/service/secretaryApi';
import { COLORS, FONTS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const initialValue = {
  businessName: '',
  description: '',
  ownerName: '',
  contactNumber: '',
  email: '',
  address: '',
  website: '',
  businessCategories: [],
  hasDiscount: null,
  discountPercentage: '',
  discountedCategories: [],
  nonDiscountedCategories: [],
  discountStartDate: null,
  discountEndDate: null,
  logo: null,
  banner: null,
  status: 'active',   // <-- added
};

const AddLocalBusinessScreen = ({ navigation }) => {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState({});

  const { data: categories = [] } = useFetchBusinessCategoriesQuery();
  const [createBusiness, { isLoading: submitting }] = useCreateSecretaryLocalBusinessMutation();

  const onSubmit = async () => {
    const nextErrors = validateLocalBusinessForm(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await createBusiness({
        businessName: value.businessName.trim(),
        description: value.description?.trim() || '',
        ownerName: value.ownerName.trim(),
        contactNumber: value.contactNumber.trim(),
        email: value.email?.trim() ? value.email.trim().toLowerCase() : '',
        address: value.address.trim(),
        website: value.website?.trim() || '',
        businessCategories: value.businessCategories,
        hasDiscount: value.hasDiscount,
        discountPercentage: value.hasDiscount ? value.discountPercentage : 0,
        discountedCategories: value.hasDiscount ? value.discountedCategories : [],
        nonDiscountedCategories: value.hasDiscount ? value.nonDiscountedCategories : [],
        discountStartDate: value.hasDiscount ? value.discountStartDate : '',
        discountEndDate: value.hasDiscount ? value.discountEndDate : '',
        status: value.status || 'active',   // <-- added
        logo: value.logo,
        banner: value.banner,
      }).unwrap();

      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to create', e?.data?.message || 'Could not create business.');
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
          Add Business
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <LocalBusinessForm
        value={value}
        onChange={setValue}
        categories={categories}
        errors={errors}
        submitting={submitting}
        onSubmit={onSubmit}
        submitLabel="Create Business"
      />
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
});

export default AddLocalBusinessScreen;