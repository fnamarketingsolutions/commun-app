// screens/secretary/CreateEventScreen.jsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pick, types, isErrorWithCode } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';

import { COLORS, FONTS, RADIUS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useCreateCommunityEventMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { EVENT_TYPE_OPTIONS } from '../../utils/eventTypes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const MAX_DESCRIPTION = 2000;
const MAX_FILES = 5;
const MAX_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMaxExpiryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS);
  return d;
};

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Converts a picked file to the shape createCommunityEvent expects:
// { uri, name, type }
const toAttachment = (file) => ({
  uri: file.uri,
  name: file.name || 'attachment',
  type: file.type || 'application/octet-stream',
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const CreateEventScreen = () => {
  const navigation = useNavigation();

  // ─── Network status ──
  const { isOnline } = useNetworkStatus();

  // ─── API ───
  const [createCommunityEvent, { isLoading: isSubmitting }] = useCreateCommunityEventMutation();

  // ─── Form state ───
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]?.key || 'communityMeetup');

  // files: array of { uri, name, type, displaySize }
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');

  // ─── Total attachment count (files + links) ───
  const totalAttachments = files.length + links.length;

  // ─── File picking ─────────────────────────────────────────────────────────

  const handleAddFile = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to add attachments.');
      return;
    }
    if (totalAttachments >= MAX_FILES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_FILES} attachments (files + links combined).`);
      return;
    }

    const remaining = MAX_FILES - totalAttachments;

    Alert.alert(
      'Add attachment',
      'Choose type',
      [
        {
          text: 'Image from library',
          onPress: () => pickImage(remaining),
        },
        {
          text: 'PDF / Video file',
          onPress: () => pickDocument(remaining),
        },
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

        const picked = (response.assets || []).slice(0, remaining).map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          displaySize: asset.fileSize
            ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB`
            : '',
        }));

        setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
      },
    );
  };

  const pickDocument = async (remaining) => {
    try {
      const results = await pick({
        type: [types.pdf, types.video],
        allowMultiSelection: remaining > 1,
      });

      const picked = (Array.isArray(results) ? results : [results])
        .slice(0, remaining)
        .map((doc) => ({
          uri: doc.uri,
          name: doc.name || `file_${Date.now()}`,
          type: doc.type || 'application/octet-stream',
          displaySize: doc.size
            ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
            : '',
        }));

      setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    } catch (e) {
      if (!isErrorWithCode(e) || e.code !== 'OPERATION_CANCELED') {
        Alert.alert('Unable to open file picker', 'Please try again.');
      }
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Links ────────────────────────────────────────────────────────────────

  const handleAddLink = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to add links.');
      return;
    }
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      Alert.alert('Invalid link', 'Links must start with http:// or https://');
      return;
    }
    if (totalAttachments >= MAX_FILES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_FILES} attachments (files + links combined).`);
      return;
    }
    setLinks((prev) => [...prev, trimmed]);
    setLinkInput('');
  };

  const handleRemoveLink = (index) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Date picker ──────────────────────────────────────────────────────────

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to create an event.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing field', 'Please enter a title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing field', 'Please enter a description.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosenDay = new Date(expiryDate);
    chosenDay.setHours(0, 0, 0, 0);
    if (chosenDay < today) {
      Alert.alert('Invalid date', 'Expiry date cannot be in the past.');
      return;
    }
    if (chosenDay > getMaxExpiryDate()) {
      Alert.alert('Invalid date', `Expiry date cannot be more than ${MAX_DAYS} days from today.`);
      return;
    }

    const attachmentLinks = links.map((url) => ({ url, label: url }));

    try {
      await createCommunityEvent({
        title: title.trim(),
        description: description.trim(),
        expiresAt: expiryDate.toISOString(),
        eventType: eventType, // <-- added
        files: files.map(toAttachment),
        attachmentLinks,
      }).unwrap();

      navigation.goBack();
    } catch (e) {
      const msg =
        e?.data?.message ||
        'Could not create the event. Please check your connection and try again.';
      Alert.alert('Unable to create event', msg);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Event
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. Please connect to the internet to create an event."
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            New event
          </Text>
          <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Set an expiry date up to 30 days from today. Expired events are hidden from members.
          </Text>

          {/* ── Title ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              TITLE *
            </Text>
            <TextInput
              style={[styles.input, !isOnline && { opacity: 0.6, color: COLORS.textMuted }]}
              placeholder="e.g. Sunday community meetup"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={isOnline}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
          </View>

          {/* ── Description ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              DESCRIPTION *
            </Text>
            <View style={[styles.textAreaWrapper, !isOnline && { opacity: 0.6 }]}>
              <TextInput
                style={[styles.textArea, !isOnline && { color: COLORS.textMuted }]}
                placeholder="What is happening, where, and who should join?"
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={MAX_DESCRIPTION}
                editable={isOnline}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              />
              <Text style={[styles.charCounter, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {description.length}/{MAX_DESCRIPTION}
              </Text>
            </View>
          </View>

          {/* ── Event Type ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              EVENT TYPE *
            </Text>
            <View style={styles.typeOptionsRow}>
              {EVENT_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeOption,
                    eventType === type.key && styles.typeOptionActive,
                    !isOnline && styles.typeOptionDisabled,
                  ]}
                  onPress={() => isOnline && setEventType(type.key)}
                  disabled={!isOnline}
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
          </View>

          {/* ── Expiry Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              EXPIRY DATE *
            </Text>
            <TouchableOpacity
              style={[styles.datePickerButton, !isOnline && { opacity: 0.6 }]}
              onPress={() => isOnline && setShowDatePicker(true)}
              activeOpacity={0.7}
              disabled={!isOnline}
            >
              <Text style={[styles.dateText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {formatDate(expiryDate)}
              </Text>
              <Icon name="calendar-outline" size={scaleFont(20)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
            </TouchableOpacity>
            {showDatePicker && isOnline && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={getMaxExpiryDate()}
              />
            )}
          </View>

          {/* ── Attachments ── */}
          <View style={styles.attachmentsSection}>
            <Text style={[styles.label, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Attachments (optional)
            </Text>
            <Text style={[styles.hint, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Add images, PDF, video files, or links. Up to 5 total.
            </Text>

            {/* Files */}
            <View style={styles.subSection}>
              <Text style={[styles.subLabel, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                FILES
              </Text>
              <TouchableOpacity
                style={[styles.chooseFilesButton, !isOnline && { opacity: 0.5 }]}
                onPress={handleAddFile}
                activeOpacity={0.7}
                disabled={!isOnline || totalAttachments >= MAX_FILES}
              >
                <Text style={[styles.chooseFilesText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Choose Files
                </Text>
              </TouchableOpacity>
              {files.length === 0 ? (
                <Text style={[styles.noFileText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No file chosen
                </Text>
              ) : (
                files.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Icon name="document-text-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                    <Text style={[styles.fileName, !isOnline && { color: COLORS.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {file.name}{file.displaySize ? ` (${file.displaySize})` : ''}
                    </Text>
                    <TouchableOpacity
                      onPress={() => isOnline && handleRemoveFile(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={!isOnline}
                    >
                      <Icon name="close-circle" size={scaleFont(20)} color={isOnline ? '#EF4444' : COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <Text style={[styles.fileCounter, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {totalAttachments}/{MAX_FILES}
              </Text>
            </View>

            {/* Links */}
            <View style={styles.subSection}>
              <Text style={[styles.subLabel, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                LINKS
              </Text>
              {links.length === 0 ? (
                <Text style={[styles.noLinkText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No links added.
                </Text>
              ) : (
                links.map((link, index) => (
                  <View key={index} style={styles.linkItem}>
                    <Icon name="link-outline" size={scaleFont(18)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                    <Text style={[styles.linkText, !isOnline && { color: COLORS.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {link}
                    </Text>
                    <TouchableOpacity
                      onPress={() => isOnline && handleRemoveLink(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={!isOnline}
                    >
                      <Icon name="close-circle" size={scaleFont(20)} color={isOnline ? '#EF4444' : COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={styles.addLinkRow}>
                <TextInput
                  style={[styles.linkInput, !isOnline && { opacity: 0.6, color: COLORS.textMuted, borderBottomColor: COLORS.textMuted }]}
                  placeholder="+ Add link"
                  placeholderTextColor={isOnline ? COLORS.gradientStart : COLORS.textMuted}
                  value={linkInput}
                  onChangeText={setLinkInput}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
                <TouchableOpacity
                  onPress={handleAddLink}
                  activeOpacity={0.7}
                  style={[styles.addLinkButton, !isOnline && { opacity: 0.5 }]}
                  disabled={!isOnline || totalAttachments >= MAX_FILES}
                >
                  <Text style={[styles.addLinkButtonText, !isOnline && { color: COLORS.border }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </NetworkAwareView>

      {/* ── Bottom Actions ── */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.cancelButton, !isOnline && { opacity: 0.5 }]}
          onPress={() => navigation.goBack()}
          disabled={!isOnline || isSubmitting}
        >
          <Text style={[styles.cancelButtonText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCreate}
          disabled={!isOnline || isSubmitting}
          style={[styles.createButtonWrapper, (!isOnline || isSubmitting) && { opacity: 0.6 }]}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButton}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.createButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Create event' : 'No Internet'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles – updated icon colors ───────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(100),
  },
  // ── Header (fixed, outside ScrollView) ──
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
  // ── Subtitle & Hint ──
  pageSubtitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  hint: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    lineHeight: moderateScale(18, 0.3),
    marginBottom: scaleHeight(20),
  },
  // ── Form Fields ──
  fieldGroup: {
    marginBottom: scaleHeight(18),
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(6),
  },
  input: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    borderBottomWidth: moderateScale(1.5, 0.3),
    borderBottomColor: COLORS.border,
    paddingVertical: scaleHeight(8),
    paddingHorizontal: 0,
  },
  textAreaWrapper: {
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(12, 0.3),
    minHeight: moderateScale(120, 0.3),
    backgroundColor: COLORS.inputBg,
  },
  textArea: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: moderateScale(90, 0.3),
  },
  charCounter: {
    textAlign: 'right',
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  // ── Event Type ──
  typeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginTop: scaleHeight(4),
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
  typeOptionDisabled: {
    opacity: 0.5,
  },
  typeOptionText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
  },
  // ── Date Picker ──
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.inputBg,
  },
  dateText: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
  },
  // ── Attachments ──
  attachmentsSection: {
    marginTop: scaleHeight(8),
  },
  subSection: {
    marginTop: scaleHeight(16),
  },
  subLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(6),
  },
  chooseFilesButton: {
    alignSelf: 'flex-start',
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.inputBg,
    marginBottom: scaleHeight(6),
  },
  chooseFilesText: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  noFileText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(4),
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(6),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  fileName: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    marginLeft: scaleWidth(8),
  },
  fileCounter: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  noLinkText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(6),
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(6),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  linkText: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.primary,
    marginLeft: scaleWidth(8),
  },
  addLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleHeight(8),
  },
  linkInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.primary,
    borderBottomWidth: moderateScale(1.5, 0.3),
    borderBottomColor: COLORS.primary,
    paddingVertical: scaleHeight(6),
    paddingHorizontal: 0,
  },
  addLinkButton: {
    marginLeft: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(6),
    backgroundColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  addLinkButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  // ── Bottom Actions ──
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(16),
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  cancelButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  createButtonWrapper: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  createButton: {
    height: moderateScale(52, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default CreateEventScreen;
