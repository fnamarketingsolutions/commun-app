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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {
  useFetchSecretaryEmergencyContactsQuery,
  useCreateSecretaryEmergencyContactMutation,
  useDeleteSecretaryEmergencyContactMutation,
} from '../../redux/service/secretaryApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const EMPTY_FORM = {
  title: '',
  name: '',
  phone: '',
  notes: '',
};

// ─── Emergency Contact Card ───────────────────────────────────────────────────
const EmergencyCard = ({ contact, onDelete, isOnline }) => {
  const phoneNumber = contact.phone?.trim();

  const handleCall = () => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Remove "${contact.title}" from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(contact._id),
        },
      ]
    );
  };

  return (
    <View style={styles.contactCard}>
      <View style={styles.cardRow}>
        <View style={styles.cardIconWrap}>
          <Icon name="shield-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.contactTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {contact.title}
          </Text>
          {contact.name ? (
            <Text style={styles.contactName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {contact.name}
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

      <Text style={styles.contactPhone} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {contact.phone || 'No phone'}
      </Text>

      {contact.notes ? (
        <Text style={styles.contactNotes} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {contact.notes}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.callButton, !phoneNumber && styles.callButtonDisabled]}
        onPress={handleCall}
        disabled={!phoneNumber}
        activeOpacity={0.7}
      >
        <Icon
          name="call-outline"
          size={scaleFont(16)}
          color={phoneNumber ? '#EF4444' : COLORS.textMuted}
        />
        <Text
          style={[styles.callButtonText, !phoneNumber && styles.callButtonTextDisabled]}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          Call
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Add Contact Modal (Centered Dialog) ─────────────────────────────────────
const AddContactModal = ({ visible, onClose, onSubmit, isSubmitting }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    
    const phone = form.phone.trim();
    if (!phone) {
      e.phone = 'Phone number is required.';
    } else if (!/^\d+$/.test(phone)) {
      e.phone = 'Only numbers are allowed.';
    } else if (phone.length < 7 || phone.length > 15) {
      e.phone = 'Phone must be between 7 and 15 digits.';
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
                Add Emergency Contact
              </Text>
              <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                This contact will be visible to all community members.
              </Text>

              {/* Title */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g. Fire Station, Security, Ambulance"
                placeholderTextColor={COLORS.textMuted}
                value={form.title}
                onChangeText={v => set('title', v)}
                maxLength={60}
                allowFontScaling={false}
              />
              {errors.title ? (
                <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {errors.title}
                </Text>
              ) : null}

              {/* Contact person name */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Contact Person <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name of person to contact"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => set('name', v)}
                maxLength={80}
                allowFontScaling={false}
              />

              {/* Phone (only digits) */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Emergency phone number"
                placeholderTextColor={COLORS.textMuted}
                value={form.phone}
                onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))}
                keyboardType="phone-pad"
                maxLength={15}
                allowFontScaling={false}
              />
              {errors.phone ? (
                <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {errors.phone}
                </Text>
              ) : null}

              {/* Notes */}
              <Text style={styles.inputLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Notes <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional info, hours, or instructions"
                placeholderTextColor={COLORS.textMuted}
                value={form.notes}
                onChangeText={v => set('notes', v)}
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
                        Add Contact
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
const SecretaryEmergencyContactsScreen = ({ navigation }) => {
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
  } = useFetchSecretaryEmergencyContactsQuery();

  const [createContact, { isLoading: isCreating }] = useCreateSecretaryEmergencyContactMutation();
  const [deleteContact] = useDeleteSecretaryEmergencyContactMutation();

  const contacts = data?.contacts || [];
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

  const handleAddContact = async (form) => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Connect to the internet to add a contact.');
      return;
    }
    try {
      await createContact({
        title: form.title.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      }).unwrap();
      setModalVisible(false);
      Alert.alert('Success', 'Emergency contact added.');
    } catch (err) {
      const msg = err?.data?.message || 'Could not add contact. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!isOnline) {
      Alert.alert('You are offline', 'Connect to the internet to delete a contact.');
      return;
    }
    try {
      await deleteContact(contactId).unwrap();
    } catch (err) {
      const msg = err?.data?.message || 'Could not delete contact. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const Header = () => (
    <>
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
          Emergency Contacts
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (!isOnline) {
              Alert.alert('You are offline', 'Connect to the internet to add a contact.');
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
    </>
  );

  if (needsCommunName && !isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Header />
        <View style={styles.centeredState}>
          <Icon name="warning-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Commun Name Not Set</Text>
          <Text style={styles.stateSubtitle}>
            Ask an admin to set your Commun handle before managing emergency contacts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && contacts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Header />
        <View style={styles.centeredState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !isLoading && contacts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <Header />
        <View style={styles.centeredState}>
          <Icon name="alert-circle-outline" size={scaleFont(40)} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>Failed to load contacts</Text>
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <Header />

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
              <Icon name="shield-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Emergency Contacts
              </Text>
              <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · visible to all members
              </Text>
            </View>
          </View>

          {isFetching && !refreshing && contacts.length > 0 && (
            <View style={styles.fetchingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.fetchingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Updating…
              </Text>
            </View>
          )}

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="shield-outline" size={scaleFont(48)} color={COLORS.border} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No Emergency Contacts
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Tap the + button above to add emergency numbers for your community.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {contacts.map((contact) => (
                <EmergencyCard
                  key={contact._id}
                  contact={contact}
                  onDelete={handleDeleteContact}
                  isOnline={isOnline}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </NetworkAwareView>

      <AddContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddContact}
        isSubmitting={isCreating}
      />
    </SafeAreaView>
  );
};

// ─── Styles (fully aligned with Vendors screen) ─────────────────────────────
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
    backgroundColor: '#ffffff',
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

  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: moderateScale(14, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.03,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 1,
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
  contactTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  contactName: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  deleteButton: {
    padding: moderateScale(4, 0.3),
  },
  contactPhone: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  contactNotes: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(10),
    lineHeight: moderateScale(18, 0.3),
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(6),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(10, 0.3),
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: COLORS.white,
  },
  callButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  callButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: '#EF4444',
  },
  callButtonTextDisabled: {
    color: COLORS.textMuted,
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

  // ── Centered Modal (matches Vendors screen exactly) ──
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
  // ── Buttons: fixed height so Cancel and Add Contact match ──
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
});

export default SecretaryEmergencyContactsScreen;