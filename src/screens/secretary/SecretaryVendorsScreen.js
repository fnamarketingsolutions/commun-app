import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {
  useFetchSecretaryVendorsQuery,
  useFetchVendorCategoriesQuery,
  useCreateSecretaryVendorMutation,
  useDeleteSecretaryVendorMutation,
} from '../../redux/service/secretaryApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  category: '',
  name: '',
  phone: '',
  email: '',
  service: '',
};

// ─── Vendor Card ──────────────────────────────────────────────────────────────
const VendorCard = ({ vendor, onDelete, isOnline }) => {
  const phoneNumber = vendor.phone?.trim();
  const email = vendor.email?.trim();

  const handleDelete = () => {
    Alert.alert(
      'Delete Vendor',
      `Remove "${vendor.name}" from the community directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(vendor._id),
        },
      ]
    );
  };

  const handleCall = () => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to place call.');
    });
  };

  const handleEmail = () => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Unable to open email client.');
    });
  };

  return (
    <View style={styles.vendorCard}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {vendor.category || 'General'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={!isOnline}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Icon
            name="trash-outline"
            size={scaleFont(18)}
            color={!isOnline ? COLORS.textMuted : '#EF4444'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.cardIconWrap}>
          <Icon name="storefront-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.vendorName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {vendor.name}
          </Text>
          {vendor.service ? (
            <Text style={styles.vendorService} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {vendor.service}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.contactDetails}>
        {phoneNumber ? (
          <View style={styles.contactItem}>
            <Icon name="call-outline" size={scaleFont(13)} color={COLORS.textMuted} />
            <Text style={styles.contactText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {phoneNumber}
            </Text>
          </View>
        ) : null}
        {email ? (
          <View style={styles.contactItem}>
            <Icon name="mail-outline" size={scaleFont(13)} color={COLORS.textMuted} />
            <Text style={styles.contactText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {email}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action buttons (Call / Email) */}
      <View style={styles.cardActionsRow}>
        {phoneNumber ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <Icon name="call-outline" size={scaleFont(14)} color={COLORS.gradientStart} />
            <Text style={styles.actionBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Call
            </Text>
          </TouchableOpacity>
        ) : null}

        {email ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleEmail}
            activeOpacity={0.7}
          >
            <Icon name="mail-outline" size={scaleFont(14)} color={COLORS.gradientStart} />
            <Text style={styles.actionBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Email
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

// ─── Add Vendor Modal (Centered Dialog with Category Selector) ───────────────
const AddVendorModal = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  categories = [],
  isLoadingCategories = false,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const query = categorySearch.trim().toLowerCase();
    return categories.filter(c => c.toLowerCase().includes(query));
  }, [categories, categorySearch]);

  const selectCategory = (cat) => {
    set('category', cat);
    setShowCategoryPicker(false);
    setCategorySearch('');
  };

  const validate = () => {
    const e = {};
    if (!form.category.trim()) {
      e.category = 'Please select a category.';
    }

    if (!form.name.trim()) e.name = 'Vendor name is required.';

    const phone = form.phone.trim();
    if (!phone && !form.email.trim()) {
      e.phone = 'Phone or email is required.';
    } else if (phone && !/^\d{10}$/.test(phone)) {
      e.phone = 'Phone must be exactly 10 digits (numbers only).';
    }

    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Please enter a valid email address.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setShowCategoryPicker(false);
    setCategorySearch('');
    setErrors({});
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKAV}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Add Vendor
                </Text>
                <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Select an approved community category for this vendor.
                </Text>

                {/* Category / Type Selector */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Category / Type <Text style={styles.required}>*</Text>
                </Text>

                <TouchableOpacity
                  style={[
                    styles.categorySelectBtn,
                    errors.category && styles.inputError,
                  ]}
                  onPress={() => setShowCategoryPicker(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categorySelectContent}>
                    {isLoadingCategories ? (
                      <View style={styles.pickerLoadingRow}>
                        <ActivityIndicator size="small" color={COLORS.gradientStart} />
                        <Text style={styles.pickerLoadingText}>Fetching categories…</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.categorySelectText,
                          !form.category && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        {form.category || 'Select category'}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-down" size={scaleFont(18)} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {errors.category ? (
                  <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {errors.category}
                  </Text>
                ) : null}

                {/* Vendor Name */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Vendor Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.name}
                  onChangeText={v => set('name', v)}
                  maxLength={80}
                  allowFontScaling={false}
                />
                {errors.name ? (
                  <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {errors.name}
                  </Text>
                ) : null}

                {/* Service description */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Service <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Plumbing & repairs"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.service}
                  onChangeText={v => set('service', v)}
                  maxLength={100}
                  allowFontScaling={false}
                />

                {/* Phone */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Phone <Text style={styles.required}>(phone/email required)</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.phone}
                  onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  allowFontScaling={false}
                />
                {errors.phone ? (
                  <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {errors.phone}
                  </Text>
                ) : null}

                {/* Email */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Email <Text style={styles.optionalLabel}>(phone/email required)</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="e.g. vendor@gmail.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.email}
                  onChangeText={v => set('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                  allowFontScaling={false}
                />
                {errors.email ? (
                  <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {errors.email}
                  </Text>
                ) : null}

                {/* Buttons */}
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalSubmitButton]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={[styles.modalButtonText, styles.submitText]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Create Vendor
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Category Picker Sub-Modal / Bottom Sheet (Admin-approved categories only) */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={styles.pickerSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Select Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={scaleFont(22)} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Search */}
            <View style={styles.pickerSearchWrap}>
              <Icon name="search-outline" size={scaleFont(16)} color={COLORS.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search categories…"
                placeholderTextColor={COLORS.textMuted}
                value={categorySearch}
                onChangeText={setCategorySearch}
                allowFontScaling={false}
              />
              {categorySearch ? (
                <TouchableOpacity onPress={() => setCategorySearch('')}>
                  <Icon name="close-circle" size={scaleFont(16)} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category Options List */}
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.pickerEmptyWrap}>
                  <Text style={styles.pickerEmptyText}>
                    {categorySearch ? 'No matching category.' : 'No categories available.'}
                  </Text>
                  <Text style={styles.pickerEmptySubtext}>
                    Please ask an administrator to configure vendor categories.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = form.category === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                    onPress={() => selectCategory(item)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={scaleFont(18)}
                      color={isSelected ? COLORS.gradientStart : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isSelected && styles.categoryOptionTextSelected,
                      ]}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark" size={scaleFont(18)} color={COLORS.gradientStart} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SecretaryVendorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // 1. Fetch categories from backend (https://api.commun.in/api/secretary/vendors/categories)
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useFetchVendorCategoriesQuery();

  // 2. Fetch secretary vendors
  const {
    data: vendorsData,
    isLoading: isVendorsLoading,
    isFetching,
    refetch: refetchVendors,
    error,
  } = useFetchSecretaryVendorsQuery();

  const [createVendor, { isLoading: isCreating }] = useCreateSecretaryVendorMutation();
  const [deleteVendor] = useDeleteSecretaryVendorMutation();

  const vendors = useMemo(() => vendorsData?.vendors || [], [vendorsData]);
  const apiCategories = useMemo(() => categoriesData?.categories || [], [categoriesData]);
  const needsCommunName = vendorsData?.needsCommunName || categoriesData?.needsCommunName || false;

  // Merge categories from API and vendors (matching Web `SecretaryVendors.jsx`)
  const allCategories = useMemo(() => {
    const fromVendors = (vendors || []).reduce((acc, v) => {
      const key = v.category || '';
      if (key && !acc.includes(key)) acc.push(key);
      return acc;
    }, []);
    const merged = Array.from(new Set([...apiCategories, ...fromVendors])).filter(Boolean);
    merged.sort((a, b) => String(a).localeCompare(String(b)));
    return merged;
  }, [apiCategories, vendors]);

  // Filter vendors based on selected category (matches Web category card click)
  const displayedVendors = useMemo(() => {
    if (!selectedCategory) return vendors;
    return vendors.filter(v => v.category === selectedCategory);
  }, [vendors, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline) {
        refetchVendors();
        refetchCategories();
      }
    }, [isOnline, refetchVendors, refetchCategories])
  );

  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      refetchVendors();
      refetchCategories();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetchVendors, refetchCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchVendors(), refetchCategories()]);
    setRefreshing(false);
  }, [refetchVendors, refetchCategories]);

  const handleAddVendor = async (form) => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Connect to the internet to add a vendor.');
      return;
    }
    try {
      await createVendor({
        category: form.category.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        service: form.service.trim(),
      }).unwrap();

      setModalVisible(false);
      // Auto-select category of newly created vendor
      if (form.category?.trim()) {
        setSelectedCategory(form.category.trim());
      }
      refetchCategories();
      Alert.alert('Success', 'Vendor added to the community directory.');
    } catch (err) {
      const msg = err?.data?.message || 'Could not add vendor. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Connect to the internet to delete a vendor.');
      return;
    }
    try {
      await deleteVendor(vendorId).unwrap();
      refetchCategories();
    } catch (err) {
      const msg = err?.data?.message || 'Could not delete vendor. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  // ─── No commun name set ───────────────────────────────────────────────────
  if (needsCommunName && !isVendorsLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Vendors
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centeredState}>
          <Icon name="warning-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Commun Name Not Set</Text>
          <Text style={styles.stateSubtitle}>
            Ask an admin to set your Commun handle before managing vendors.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isVendorsLoading && vendors.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Vendors
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error && !isVendorsLoading && vendors.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Vendors
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centeredState}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Failed to load vendors</Text>
          <Text style={styles.stateSubtitle}>
            {error?.data?.message || 'Something went wrong. Please try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.7}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main content ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Vendors
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (!isOnline) {
              Alert.alert('You are offline', 'Connect to the internet to add a vendor.');
              return;
            }
            setModalVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="add" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={!isOnline}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + moderateScale(32, 0.3) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Section banner */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="storefront-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Community Vendors
              </Text>
              <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} in your community
              </Text>
            </View>
          </View>

          {/* Category Cards Section (Matches Web categories layout) */}
          <View style={styles.categorySection}>
            <View style={styles.categoryHeaderRow}>
              <Text style={styles.categorySectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Categories
              </Text>
              <Text style={styles.categorySectionSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Tap to filter by category
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {/* "All" Category Pill */}
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === null && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryCardTitle,
                    selectedCategory === null && styles.categoryCardTitleActive,
                  ]}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  All
                </Text>
                <Text
                  style={[
                    styles.categoryCardCount,
                    selectedCategory === null && styles.categoryCardCountActive,
                  ]}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                >
                  {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>

              {/* Dynamic Category Cards */}
              {allCategories.map((cat) => {
                const count = vendors.filter((v) => v.category === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryCard,
                      isActive && styles.categoryCardActive,
                    ]}
                    onPress={() => setSelectedCategory(isActive ? null : cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryCardTitle,
                        isActive && styles.categoryCardTitleActive,
                      ]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {cat}
                    </Text>
                    <Text
                      style={[
                        styles.categoryCardCount,
                        isActive && styles.categoryCardCountActive,
                      ]}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {count} vendor{count !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Vendors Listing Header */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.listSectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {selectedCategory ? `${selectedCategory} Vendors` : 'All Vendors'}
            </Text>
            <Text style={styles.listSectionCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              ({displayedVendors.length})
            </Text>
          </View>

          {isFetching && !refreshing && vendors.length > 0 && (
            <View style={styles.fetchingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.fetchingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Updating…
              </Text>
            </View>
          )}

          {/* Vendors List or Empty State */}
          {displayedVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="storefront-outline" size={scaleFont(44)} color={COLORS.border} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {selectedCategory ? `No ${selectedCategory} Vendors` : 'No Vendors Yet'}
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {selectedCategory
                  ? `There are no vendors listed under "${selectedCategory}". Tap + above to add one.`
                  : 'Tap the + button above to add a vendor for your community.'}
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {displayedVendors.map((vendor) => (
                <VendorCard
                  key={vendor._id}
                  vendor={vendor}
                  onDelete={handleDeleteVendor}
                  isOnline={isOnline}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>

      <AddVendorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddVendor}
        isSubmitting={isCreating}
        categories={allCategories}
        isLoadingCategories={isCategoriesLoading}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  addButton: {
    width: scaleWidth(24),
    alignItems: 'flex-end',
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
  container: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(16),
  },
  sectionIcon: {
    width: moderateScale(40, 0.3),
    height: moderateScale(40, 0.3),
    borderRadius: moderateScale(12, 0.3),
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: { flex: 1 },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },

  // ── Category Filter Section ──
  categorySection: {
    marginBottom: scaleHeight(20),
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: scaleHeight(10),
  },
  categorySectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  categorySectionSubtitle: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },
  categoryScroll: {
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(4),
  },
  categoryCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E9E4EE',
    borderRadius: moderateScale(14, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    minWidth: scaleWidth(90),
    alignItems: 'flex-start',
  },
  categoryCardActive: {
    backgroundColor: COLORS.gradientStart,
    borderColor: COLORS.gradientStart,
    ...SHADOW.card,
    shadowColor: COLORS.gradientStart,
    shadowOpacity: 0.25,
    elevation: 3,
  },
  categoryCardTitle: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  categoryCardTitleActive: {
    color: COLORS.white,
  },
  categoryCardCount: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  categoryCardCountActive: {
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Vendors List Header ──
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    marginBottom: scaleHeight(12),
  },
  listSectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  listSectionCount: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },

  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(12),
  },
  fetchingText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },

  list: {
    gap: scaleHeight(12),
  },

  // ── Vendor Card ──
  vendorCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: '#EFEBF5',
    padding: moderateScale(14, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(8),
  },
  categoryBadge: {
    backgroundColor: COLORS.gradientStart + '15',
    borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(3),
  },
  categoryBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deleteButton: {
    padding: moderateScale(4, 0.3),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(8),
  },
  cardIconWrap: {
    width: moderateScale(38, 0.3),
    height: moderateScale(38, 0.3),
    borderRadius: moderateScale(10, 0.3),
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  vendorName: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  vendorService: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  contactDetails: {
    gap: scaleHeight(4),
    marginTop: scaleHeight(2),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  contactText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
  },

  // ── Card Quick Action Buttons ──
  cardActionsRow: {
    flexDirection: 'row',
    gap: scaleWidth(8),
    marginTop: scaleHeight(12),
    paddingTop: scaleHeight(10),
    borderTopWidth: 1,
    borderTopColor: '#F5F3F8',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(5),
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D8FD',
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(6),
  },
  actionBtnText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.gradientStart,
  },

  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(30),
    gap: scaleHeight(12),
  },
  stateTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },
  retryButton: {
    borderRadius: moderateScale(RADIUS.medium, 0.3),
    overflow: 'hidden',
    minWidth: scaleWidth(100),
    marginTop: scaleHeight(4),
  },
  retryGradient: {
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(24),
    alignItems: 'center',
  },
  retryText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(50),
    gap: scaleHeight(10),
  },
  emptyTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(19, 0.3),
    paddingHorizontal: scaleWidth(20),
  },

  // ── Add Vendor Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKAV: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    padding: scaleWidth(18),
    width: '92%',
    maxWidth: scaleWidth(400),
    maxHeight: '85%',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(20, 0.3),
    elevation: 8,
  },
  modalScrollContent: {
    paddingVertical: scaleHeight(4),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(14),
    textAlign: 'center',
    lineHeight: moderateScale(17, 0.3),
  },
  inputLabel: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  required: {
    color: '#EF4444',
  },
  optionalLabel: {
    fontWeight: FONTS.weightRegular,
    color: COLORS.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(9),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: scaleHeight(10),
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: scaleFont(11),
    color: '#EF4444',
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(8),
  },

  // ── Category Dropdown / Selector Button ──
  categorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(11),
    backgroundColor: '#FAFAFA',
    marginBottom: scaleHeight(10),
  },
  categorySelectContent: {
    flex: 1,
    marginRight: scaleWidth(8),
  },
  categorySelectText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontWeight: FONTS.weightRegular,
  },
  pickerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  pickerLoadingText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleHeight(12),
    gap: scaleWidth(10),
  },
  modalButton: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalSubmitButton: {
    overflow: 'hidden',
    padding: 0,
  },
  submitGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
  },
  submitText: {
    color: COLORS.white,
  },

  // ── Category Picker Sheet / Sub-Modal ──
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(22, 0.3),
    borderTopRightRadius: moderateScale(22, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(18),
    paddingBottom: scaleHeight(32),
    maxHeight: '75%',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16, 0.3),
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
  },
  pickerTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    backgroundColor: '#FAFAFA',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(12),
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
    padding: 0,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3F8',
  },
  categoryOptionSelected: {
    backgroundColor: '#F3F0FF',
    borderRadius: moderateScale(10, 0.3),
  },
  categoryOptionText: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightRegular,
  },
  categoryOptionTextSelected: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightBold,
  },
  pickerEmptyWrap: {
    alignItems: 'center',
    paddingVertical: scaleHeight(24),
  },
  pickerEmptyText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  pickerEmptySubtext: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
    textAlign: 'center',
  },
});

export default SecretaryVendorsScreen;
