import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode } from '@react-native-documents/picker';

import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import { EVENT_TYPE_OPTIONS } from '../utils/eventTypes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const MAX_ATTACHMENTS = 5;
const MAX_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────

const getMaxExpiryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS);
  return d;
};

const formatDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Modal ────────────────────────────────────────────────────────────────

const CreateEventModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  disabledMessage = '',
  heading = 'New event',
  subheading = `Set an expiry date up to ${MAX_DAYS} days from today. Expired events are hidden from members.`,
  submitLabel = 'Create event',
  eventTypeOptions = null, // array of event type keys (e.g. ['communityMeetup', 'workshop'])
  requireEventType = false,
  isOnline = true,
}) => {
  // ── Event type choices ──
  const typeChoices =
    eventTypeOptions && eventTypeOptions.length > 0
      ? EVENT_TYPE_OPTIONS.filter((t) => eventTypeOptions.includes(t.key))
      : EVENT_TYPE_OPTIONS;

  const defaultType = typeChoices[0]?.key || 'communityMeetup';

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [eventType, setEventType] = useState(defaultType);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Reset when modal opens/closes ──
  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setTitle('');
      setDescription('');
      setExpiryDate(new Date());
      setEventType(defaultType);
      setFiles([]);
      setLinks([]);
      setLinkInput('');
    }
  }, [isOpen, defaultType]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddFile = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to add attachments.');
      return;
    }
    const total = files.length + links.length;
    if (total >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_ATTACHMENTS} attachments combined.`);
      return;
    }
    const remaining = MAX_ATTACHMENTS - total;

    Alert.alert(
      'Add attachment',
      'Choose type',
      [
        { text: 'Image / Video', onPress: () => pickImage(remaining) },
        { text: 'PDF', onPress: () => pickDocument(remaining) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const pickImage = (remaining) => {
    launchImageLibrary(
      {
        mediaType: 'mixed',
        selectionLimit: remaining,
        quality: 0.85,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const picked = (response.assets || [])
          .slice(0, remaining)
          .map((asset) => ({
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          }));
        setFiles((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
      },
    );
  };

  const pickDocument = async (remaining) => {
    try {
      const results = await pick({
        type: [types.pdf],
        allowMultiSelection: remaining > 1,
      });
      const docs = (Array.isArray(results) ? results : [results]).slice(0, remaining);
      const picked = docs.map((doc) => ({
        uri: doc.uri,
        name: doc.name || `file_${Date.now()}`,
        type: doc.type || 'application/pdf',
      }));
      setFiles((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
    } catch (e) {
      if (!isErrorWithCode(e) || e.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Could not open file picker.');
      }
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    if (!isOnline) return;
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      Alert.alert('Invalid link', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    const total = files.length + links.length;
    if (total >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_ATTACHMENTS} attachments combined.`);
      return;
    }
    setLinks((prev) => [...prev, trimmed]);
    setLinkInput('');
  };

  const handleRemoveLink = (index) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to create an event.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Please fill in title and description.');
      return;
    }
    if (requireEventType && !eventType) {
      Alert.alert('Missing field', 'Please select an event type.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(expiryDate);
    chosen.setHours(0, 0, 0, 0);
    if (chosen < today) {
      Alert.alert('Invalid date', 'Expiry date cannot be in the past.');
      return;
    }
    if (chosen > getMaxExpiryDate()) {
      Alert.alert('Invalid date', `Expiry date cannot be more than ${MAX_DAYS} days from today.`);
      return;
    }

    const attachmentLinks = links.map((url) => ({ url, label: url }));

    const success = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      expiresAt: expiryDate.toISOString(),
      eventType: eventType || defaultType,
      files,
      attachmentLinks,
    });

    if (success) {
      // Reset and close
      setTitle('');
      setDescription('');
      setExpiryDate(new Date());
      setEventType(defaultType);
      setFiles([]);
      setLinks([]);
      setLinkInput('');
      onClose();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {heading}
              </Text>
              {!!subheading && (
                <Text style={styles.subheading} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {subheading}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={scaleFont(22)} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {disabled && disabledMessage && (
              <View style={styles.disabledBanner}>
                <Text style={styles.disabledText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {disabledMessage}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Event Title *
            </Text>
            <TextInput
              style={[styles.input, !isOnline && styles.inputDisabled]}
              placeholder="e.g. Sunday community meetup"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={isOnline && !disabled}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />

            <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Description *
            </Text>
            <TextInput
              style={[styles.textarea, !isOnline && styles.inputDisabled]}
              placeholder="What is happening, where, and who should join?"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={2000}
              editable={isOnline && !disabled}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
            <Text style={styles.charCounter} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {description.length}/2000
            </Text>

            {/* ── Event Type ── */}
            {typeChoices.length > 0 && (
              <>
                <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Event type {requireEventType ? '*' : ''}
                </Text>
                <View style={styles.selectWrapper}>
                  {typeChoices.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeOption,
                        eventType === type.key && styles.typeOptionActive,
                        (!isOnline || disabled) && styles.optionDisabled,
                      ]}
                      onPress={() => isOnline && !disabled && setEventType(type.key)}
                      disabled={!isOnline || disabled}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          eventType === type.key && styles.typeOptionTextActive,
                        ]}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Expiry Date ── */}
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Expiry date *
            </Text>
            <TouchableOpacity
              style={[styles.datePickerButton, !isOnline && styles.inputDisabled]}
              onPress={() => isOnline && setShowDatePicker(true)}
              activeOpacity={0.7}
              disabled={!isOnline || disabled}
            >
              <Text style={styles.dateText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {formatDateInput(expiryDate)}
              </Text>
              <Icon name="calendar-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={getMaxExpiryDate()}
              />
            )}

            {/* ── Attachments ── */}
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Attachments (optional)
            </Text>
            <Text style={styles.attachHint} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Add images, PDF, or links. Up to {MAX_ATTACHMENTS} total.
            </Text>

            {/* Files */}
            <View style={styles.attachRow}>
              <TouchableOpacity
                style={[styles.attachBtn, (!isOnline || disabled) && styles.attachBtnDisabled]}
                onPress={handleAddFile}
                disabled={!isOnline || disabled || (files.length + links.length >= MAX_ATTACHMENTS)}
              >
                <Icon name="image-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
                <Text style={[styles.attachBtnText, { color: COLORS.gradientStart }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  File
                </Text>
              </TouchableOpacity>
            </View>

            {files.map((file, idx) => (
              <View key={`file-${idx}`} style={styles.fileChip}>
                <Icon name="document-outline" size={scaleFont(14)} color={COLORS.textMuted} />
                <Text style={styles.fileChipText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveFile(idx)} disabled={!isOnline}>
                  <Icon name="close-circle" size={scaleFont(16)} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Links */}
            <View style={styles.linkSection}>
              <Text style={styles.linkLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Links
              </Text>
              {links.map((link, idx) => (
                <View key={`link-${idx}`} style={styles.linkItem}>
                  <Icon name="link-outline" size={scaleFont(14)} color={COLORS.gradientStart} />
                  <Text style={styles.linkText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {link}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveLink(idx)} disabled={!isOnline}>
                    <Icon name="close-circle" size={scaleFont(16)} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.addLinkRow}>
                <TextInput
                  style={[styles.linkInput, !isOnline && styles.inputDisabled]}
                  placeholder="+ Add link (https://...)"
                  placeholderTextColor={COLORS.textMuted}
                  value={linkInput}
                  onChangeText={setLinkInput}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={isOnline && !disabled}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
                <TouchableOpacity
                  style={[styles.addLinkButton, (!isOnline || disabled || !linkInput.trim()) && styles.addLinkDisabled]}
                  onPress={handleAddLink}
                  disabled={!isOnline || disabled || !linkInput.trim() || (files.length + links.length >= MAX_ATTACHMENTS)}
                >
                  <Text style={styles.addLinkButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.attachCounter} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {files.length + links.length}/{MAX_ATTACHMENTS} used
              </Text>
            </View>
          </ScrollView>

          {/* ── Submit ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={!isOnline || disabled || isSubmitting || !title.trim() || !description.trim() || (requireEventType && !eventType)}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.submitBtn,
                (!isOnline || disabled || isSubmitting || !title.trim() || !description.trim() || (requireEventType && !eventType)) &&
                  styles.submitBtnDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isOnline ? submitLabel : 'No Internet'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(24, 0.3),
    borderTopRightRadius: moderateScale(24, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(20),
    paddingBottom: scaleHeight(20),
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(16),
  },
  heading: {
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
    lineHeight: moderateScale(18, 0.3),
  },
  scrollContent: {
    paddingBottom: scaleHeight(8),
  },
  disabledBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(12, 0.3),
    marginBottom: scaleHeight(12),
  },
  disabledText: {
    fontSize: scaleFont(13),
    color: '#92400E',
  },
  fieldLabel: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(8),
    marginTop: scaleHeight(14),
  },
  input: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  inputDisabled: {
    opacity: 0.6,
    color: COLORS.textMuted,
  },
  textarea: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    height: moderateScale(100, 0.3),
  },
  charCounter: {
    textAlign: 'right',
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  selectWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(4),
  },
  typeOption: {
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(14),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: scaleHeight(6),
  },
  typeOptionActive: {
    borderColor: COLORS.gradientStart,
    backgroundColor: COLORS.inputBg,
  },
  typeOptionText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
  },
  dateText: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  attachHint: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(8),
  },
  attachRow: {
    flexDirection: 'row',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(8),
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(14),
    backgroundColor: COLORS.white,
  },
  attachBtnDisabled: {
    opacity: 0.5,
  },
  attachBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(10),
    marginTop: scaleHeight(8),
  },
  fileChipText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: COLORS.textPrimary,
  },
  linkSection: {
    marginTop: scaleHeight(12),
  },
  linkLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(6),
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(6),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  linkText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.primary,
  },
  addLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleHeight(8),
  },
  linkInput: {
    flex: 1,
    borderBottomWidth: moderateScale(1.5, 0.3),
    borderBottomColor: COLORS.gradientStart,
    paddingVertical: scaleHeight(6),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  addLinkButton: {
    marginLeft: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(6),
    backgroundColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  addLinkDisabled: {
    opacity: 0.5,
  },
  addLinkButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  attachCounter: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  submitBtn: {
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(16),
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default CreateEventModal;