import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {
  useFetchSecretaryVendorsQuery,
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

  return (
    <View style={styles.vendorCard}>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {vendor.category}
        </Text>
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

      <View style={styles.contactRow}>
        {vendor.phone ? (
          <View style={styles.contactItem}>
            <Icon name="call-outline" size={scaleFont(13)} color={COLORS.textMuted} />
            <Text style={styles.contactText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {vendor.phone}
            </Text>
          </View>
        ) : null}
        {vendor.email ? (
          <View style={styles.contactItem}>
            <Icon name="mail-outline" size={scaleFont(13)} color={COLORS.textMuted} />
            <Text style={styles.contactText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {vendor.email}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ─── Add Vendor Modal (Centered Dialog) ──────────────────────────────────────
const AddVendorModal = ({ visible, onClose, onSubmit, isSubmitting }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.category.trim()) e.category = 'Category is required.';
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
    setErrors({});
    onClose();
  };

  return (
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
                This vendor will be visible to all community members.
              </Text>

              {/* Category */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.category && styles.inputError]}
                placeholder="e.g. Plumber, Electrician, Grocery"
                placeholderTextColor={COLORS.textMuted}
                value={form.category}
                onChangeText={v => set('category', v)}
                maxLength={60}
                allowFontScaling={false}
              />
              {errors.category ? (
                <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {errors.category}
                </Text>
              ) : null}

              {/* Name */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Vendor Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Full name or business name"
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

              {/* Phone */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Phone <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="10-digit mobile number"
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
                Email <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="vendor@email.com"
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

              {/* Service description */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Service Description <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of what they offer"
                placeholderTextColor={COLORS.textMuted}
                value={form.service}
                onChangeText={v => set('service', v)}
                multiline
                numberOfLines={2}
                maxLength={200}
                textAlignVertical="top"
                allowFontScaling={false}
              />

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
                        Add Vendor
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
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SecretaryVendorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useFetchSecretaryVendorsQuery();

  const [createVendor, { isLoading: isCreating }] = useCreateSecretaryVendorMutation();
  const [deleteVendor] = useDeleteSecretaryVendorMutation();

  const vendors = data?.vendors || [];
  const needsCommunName = data?.needsCommunName || false;

  useFocusEffect(
    useCallback(() => {
      if (isOnline) refetch();
    }, [isOnline, refetch])
  );

  const wasOfflineRef = useRef(!isOnline);
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) refetch();
    wasOfflineRef.current = !isOnline;
  }, [isOnline, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
    } catch (err) {
      const msg = err?.data?.message || 'Could not delete vendor. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  // ─── No commun name set ───────────────────────────────────────────────────
  if (needsCommunName && !isLoading) {
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
  if (isLoading && vendors.length === 0) {
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
  if (error && !isLoading && vendors.length === 0) {
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
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
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

          {isFetching && !refreshing && vendors.length > 0 && (
            <View style={styles.fetchingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.fetchingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Updating…
              </Text>
            </View>
          )}

          {vendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="storefront-outline" size={scaleFont(48)} color={COLORS.border} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No Vendors Yet
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Tap the + button above to add a vendor for your community.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {vendors.map((vendor) => (
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

  vendorCard: {
    backgroundColor: '#ffff',
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(14, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.03,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gradientStart + '15',
    borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(3),
    marginBottom: scaleHeight(10),
  },
  categoryBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(8),
  },
  cardIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
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
  deleteButton: {
    padding: moderateScale(4, 0.3),
  },
  contactRow: {
    gap: scaleHeight(4),
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
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(10),
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20, 0.3),
  },

  // ── Centered Modal Styles ──
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
    padding: scaleWidth(16),
    width: '92%',
    maxWidth: scaleWidth(400),
    maxHeight: '80%',
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
    marginBottom: scaleHeight(12),
    textAlign: 'center',
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
    paddingVertical: scaleHeight(8),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: scaleHeight(8),
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: moderateScale(60, 0.3),
    paddingTop: scaleHeight(8),
  },
  errorText: {
    fontSize: scaleFont(11),
    color: '#EF4444',
    marginTop: -scaleHeight(6),
    marginBottom: scaleHeight(6),
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleHeight(12),
    gap: scaleWidth(10),
  },
  // ── FIX: Cancel and Add Vendor now share the same fixed height (48) so
  // neither the plain Cancel button nor the gradient-wrapped Add Vendor
  // button can grow taller than the other. Previously modalButton added
  // paddingVertical AND submitGradient added its own paddingVertical on
  // top of that — only the submit button got double-padded, making it
  // visibly taller/wider-looking than Cancel. ──
  modalButton: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3), // ← now using theme's RADIUS.md
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
});

export default SecretaryVendorsScreen;