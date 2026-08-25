// screens/provider/AddServiceScreen.jsx

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode } from '@react-native-documents/picker';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useCreateServiceOfferingMutation,
  useGetS3PresignedUrlMutation,
} from '../../redux/service/providerApi';
import { useFetchActiveCategoriesQuery } from '../../redux/service/adminApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const MAX_IMAGES = 5;
const MAX_PDFS = 3;
const BOTTOM_TAB_HEIGHT = moderateScale(70, 0.3);

// ─── S3 direct upload helper ──────────────────────────────────────────────────
const uploadToS3 = async (uploadUrl, fileUri, contentType) => {
  const res = await fetch(fileUri);
  const blob = await res.blob();
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
const AddServiceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // ── Network status ──
  const { isOnline } = useNetworkStatus();

  // ── RTK Query ──────────────────────────────────────────────────────────────
  const {
    data: categoriesData,
    isLoading: isLoadingCats,
  } = useFetchActiveCategoriesQuery();

  const [createService, { isLoading: isSubmitting }] = useCreateServiceOfferingMutation();
  const [getPresignedUrl] = useGetS3PresignedUrlMutation();

  // ── rules map ──────────────────────────────────────────────────────────────
  const rules = useMemo(() => categoriesData?.rules ?? {}, [categoriesData]);
  const categoryList = useMemo(() => Object.keys(rules), [rules]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [pdfPreviews, setPdfPreviews] = useState([]);

  const [servicename, setServicename] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subCategories, setSubCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [description, setDescription] = useState('');
  const [experience, setExperience] = useState('');

  // ── Debounce ref for publish ──────────────────────────────────────────────
  const isPublishing = useRef(false);

  // ── Category change ──────────────────────────────────────────────────────
  const handleCategoryChange = useCallback((cat) => {
    setSelectedCategory(cat);
    setSubCategories([]);
    setKeywords([]);
  }, []);

  // ── Toggle chips ─────────────────────────────────────────────────────────
  const handleToggle = useCallback((setter, current, value) => {
    setter((prev) => {
      const exists = prev.includes(value);
      return exists ? prev.filter((i) => i !== value) : [...prev, value];
    });
  }, []);

  // ── Photo picker ─────────────────────────────────────────────────────────
  const handleAddPhoto = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to upload images.');
      return;
    }
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: MAX_IMAGES - images.length,
      });
      if (result.didCancel || !result.assets?.length) return;

      const newAssets = result.assets.slice(0, MAX_IMAGES - images.length);
      setImages((prev) => [...prev, ...newAssets]);
      setImagePreviews((prev) => [...prev, ...newAssets.map((a) => a.uri)]);
    } catch {
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  }, [images.length, isOnline]);

  const removePhoto = useCallback((idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── PDF picker ──────────────────────────────────────────────────────────
  const handleAddPDF = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to upload PDFs.');
      return;
    }
    if (pdfs.length >= MAX_PDFS) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_PDFS} PDFs.`);
      return;
    }
    try {
      const results = await pick({
        type: [types.pdf],
        allowMultiSelection: true,
        mode: 'import',
      });
      const files = Array.isArray(results) ? results : [results];
      const newFiles = files.slice(0, MAX_PDFS - pdfs.length);
      setPdfs((prev) => [...prev, ...newFiles]);
      setPdfPreviews((prev) => [
        ...prev,
        ...newFiles.map((f) => ({ name: f.name || 'document.pdf', uri: f.uri })),
      ]);
    } catch (e) {
      if (!isErrorWithCode(e) || e.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Could not open PDF picker. Please try again.');
      }
    }
  }, [pdfs.length, isOnline]);

  const removePDF = useCallback((idx) => {
    setPdfs((prev) => prev.filter((_, i) => i !== idx));
    setPdfPreviews((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to publish your service.');
      return false;
    }
    if (!servicename.trim()) {
      Alert.alert('Missing Info', 'Service name is required.');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Info', 'Please select a category.');
      return false;
    }
    if (
      selectedCategory &&
      (rules[selectedCategory]?.subCategories?.length || 0) > 0 &&
      subCategories.length === 0
    ) {
      Alert.alert('Missing Info', 'Pick at least one sub-category.');
      return false;
    }
    if (
      selectedCategory &&
      (rules[selectedCategory]?.keywords?.length || 0) > 0 &&
      keywords.length === 0
    ) {
      Alert.alert('Missing Info', 'Select at least one keyword.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Description is required.');
      return false;
    }
    return true;
  };

  // ── Publish (debounced) ─────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (isPublishing.current) return;
    if (!validate()) return;

    isPublishing.current = true;

    try {
      // 1. Upload images to S3 (if any)
      const portfolioImages = [];
      for (const asset of images) {
        const presigned = await getPresignedUrl({
          filename: asset.fileName || 'photo.jpg',
          contentType: asset.type || 'image/jpeg',
        }).unwrap();

        await uploadToS3(presigned.uploadUrl, asset.uri, asset.type || 'image/jpeg');

        portfolioImages.push({ url: presigned.publicUrl, public_id: presigned.public_id });
      }

      // 2. Upload PDFs to S3 (if any)
      const portfolioPDFs = [];
      for (const pdf of pdfs) {
        const presigned = await getPresignedUrl({
          filename: pdf.name || 'document.pdf',
          contentType: pdf.type || 'application/pdf',
        }).unwrap();

        await uploadToS3(presigned.uploadUrl, pdf.uri, pdf.type || 'application/pdf');

        portfolioPDFs.push({ url: presigned.publicUrl, public_id: presigned.public_id });
      }

      // 3. POST /api/provider-profile/service-json
      await createService({
        servicename,
        serviceCategory: selectedCategory,
        subCategories,
        keywords,
        description,
        experience: experience !== '' ? Number(experience) : undefined,
        portfolioImages,
        portfolioPDFs,
      }).unwrap();

      Alert.alert(
        'Service Published! 🚀',
        'Your service is now live. If you didn’t upload an image, the system generated a cover with your service name.',
        [{ text: 'OK', onPress: () => navigation?.navigate('ManageServices') }]
      );
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Unable to publish service. Please try again.');
    } finally {
      isPublishing.current = false;
    }
  }, [
    images,
    pdfs,
    getPresignedUrl,
    createService,
    servicename,
    selectedCategory,
    subCategories,
    keywords,
    description,
    experience,
    navigation,
  ]);

  const PHOTO_SIZE = (width - moderateScale(40, 0.3) - moderateScale(10, 0.3)) / 2;

  // ── Dynamic padding to avoid bottom tab / gesture bar ──
  const bottomPadding = insets.bottom + BOTTOM_TAB_HEIGHT + scaleHeight(16);
  const scrollContentPadding = {
    paddingBottom: bottomPadding + scaleHeight(80), // extra for the fixed button
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Add Service
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={!isOnline}
          message="You are offline. Please connect to the internet to create a service."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              scrollContentPadding,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── Service Photos ─────────────────────────────────────── */}
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Service Photos
            </Text>
            <View style={styles.photoGrid}>
              {imagePreviews.length < MAX_IMAGES && (
                <TouchableOpacity
                  style={[styles.addPhotoBox, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                  disabled={!isOnline}
                >
                  <MaterialIcon
                    name="camera-plus-outline"
                    size={scaleFont(28)}
                    color={isOnline ? COLORS.gradientStart : COLORS.textMuted}
                  />
                  <Text style={[styles.addPhotoText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Add Image
                  </Text>
                </TouchableOpacity>
              )}

              {imagePreviews.map((uri, idx) => (
                <View key={idx} style={[styles.photoWrap, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}>
                  <Image
                    source={{ uri }}
                    style={[styles.photoImg, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(idx)}>
                    <Icon name="close-circle" size={scaleFont(20)} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={styles.photoHint} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Upload up to {MAX_IMAGES} photos (optional). If you skip, we’ll generate a cover with your service name.
            </Text>

            {/* ── Service Info Card ──────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Service Title *
              </Text>
              <View style={[styles.inputWrap, !isOnline && styles.inputWrapDisabled]}>
                <TextInput
                  style={[styles.textInput, !isOnline && styles.inputDisabled]}
                  value={servicename}
                  onChangeText={setServicename}
                  placeholder="e.g. Professional Dog Walking"
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="done"
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
              </View>

              {/* ── Category pills ─────────────────────────────────── */}
              <Text
                style={[styles.fieldLabel, { marginTop: moderateScale(18, 0.3) }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Category *
              </Text>
              {isLoadingCats ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: scaleHeight(8) }} />
              ) : (
                <View style={styles.categoriesWrap}>
                  {categoryList.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        selectedCategory === cat && styles.categoryPillActive,
                        !isOnline && styles.categoryPillDisabled,
                      ]}
                      onPress={() => handleCategoryChange(cat)}
                      activeOpacity={0.8}
                      disabled={!isOnline}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          selectedCategory === cat && styles.categoryPillTextActive,
                          !isOnline && { color: COLORS.textMuted },
                        ]}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── Sub-categories ──────────────────────────────────── */}
            {selectedCategory && (rules[selectedCategory]?.subCategories?.length || 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Sub-categories *
                </Text>
                <View style={styles.chipRow}>
                  {rules[selectedCategory].subCategories.map((sub) => {
                    const selected = subCategories.includes(sub);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                          !isOnline && styles.chipDisabled,
                        ]}
                        onPress={() => handleToggle(setSubCategories, subCategories, sub)}
                        activeOpacity={0.7}
                        disabled={!isOnline}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                            !isOnline && { color: COLORS.textMuted },
                          ]}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Keywords ──────────────────────────────────────────── */}
            {selectedCategory && (rules[selectedCategory]?.keywords?.length || 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Keywords *
                </Text>
                <View style={styles.chipRow}>
                  {rules[selectedCategory].keywords.map((kw) => {
                    const selected = keywords.includes(kw);
                    return (
                      <TouchableOpacity
                        key={kw}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                          !isOnline && styles.chipDisabled,
                        ]}
                        onPress={() => handleToggle(setKeywords, keywords, kw)}
                        activeOpacity={0.7}
                        disabled={!isOnline}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                            !isOnline && { color: COLORS.textMuted },
                          ]}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {kw}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Description ──────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Description *
              </Text>
              <View style={[styles.textAreaWrap, !isOnline && styles.inputWrapDisabled]}>
                <TextInput
                  style={[styles.textArea, !isOnline && styles.inputDisabled]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell your customers what you offer..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
              </View>
            </View>

            {/* ── Experience ───────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Experience (years) <Text style={{ color: COLORS.textMuted, fontWeight: 'normal' }}>(optional)</Text>
              </Text>
              <View style={[styles.inputWrap, !isOnline && styles.inputWrapDisabled]}>
                <TextInput
                  style={[styles.textInput, !isOnline && styles.inputDisabled]}
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="e.g. 5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
              </View>
            </View>

            {/* ── PDF Upload (fixed icon) ───────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                PDF Documents <Text style={{ color: COLORS.textMuted, fontWeight: 'normal' }}>(optional)</Text>
              </Text>
              <TouchableOpacity
                style={[styles.uploadPdfBtn, !isOnline && styles.uploadPdfBtnDisabled]}
                onPress={handleAddPDF}
                disabled={!isOnline || pdfs.length >= MAX_PDFS}
                activeOpacity={0.7}
              >
                <MaterialIcon
                  name="file-pdf-box"
                  size={scaleFont(22)}
                  color={isOnline ? '#EF4444' : COLORS.textMuted}
                />
                <Text style={[styles.uploadPdfText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {pdfs.length >= MAX_PDFS ? 'PDF limit reached' : 'Add PDF'}
                </Text>
              </TouchableOpacity>

              {pdfPreviews.length > 0 && (
                <View style={styles.pdfList}>
                  {pdfPreviews.map((pdf, idx) => (
                    <View key={idx} style={styles.pdfItem}>
                      <MaterialIcon name="file-pdf-outline" size={scaleFont(18)} color="#EF4444" />
                      <Text style={styles.pdfName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {pdf.name}
                      </Text>
                      <TouchableOpacity onPress={() => removePDF(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

      {/* ── Publish Button (fixed at bottom) ────────────────────────────────── */}
      <View style={[styles.publishWrap, { paddingBottom: insets.bottom + scaleHeight(10) }]}>
        <TouchableOpacity
          onPress={handlePublish}
          activeOpacity={0.85}
          disabled={isSubmitting || !isOnline}
          style={styles.publishBtnWrap}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.publishBtn, (!isOnline || isSubmitting) && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.publishBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isOnline ? 'Publish Service' : 'No Internet'}
                </Text>
                {isOnline && (
                  <Text style={styles.rocketEmoji} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    🚀
                  </Text>
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles (unchanged except bottom padding) ──────────────────────────────
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
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    // paddingBottom is now dynamic
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(12),
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10, 0.3),
    marginBottom: scaleHeight(8),
  },
  addPhotoBox: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.textMuted,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    gap: moderateScale(8, 0.3),
  },
  addPhotoText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  photoWrap: {
    position: 'relative',
  },
  photoImg: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.border,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: moderateScale(8, 0.3),
    right: moderateScale(8, 0.3),
  },
  photoHint: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(18),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(18, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
  },
  fieldLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(8),
  },
  inputWrap: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    minHeight: moderateScale(48, 0.3),
    justifyContent: 'center',
  },
  inputWrapDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  textInput: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(12) : scaleHeight(8),
  },
  inputDisabled: {
    color: COLORS.textMuted,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10, 0.3),
  },
  categoryPill: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(9),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  categoryPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  categoryPillDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.white,
  },
  categoryPillText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  categoryPillTextActive: {
    color: COLORS.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8, 0.3),
  },
  chip: {
    paddingHorizontal: moderateScale(14, 0.3),
    paddingVertical: moderateScale(7, 0.3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightMedium,
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: FONTS.weightSemiBold,
  },
  textAreaWrap: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    padding: moderateScale(14, 0.3),
    minHeight: moderateScale(110, 0.3),
  },
  textArea: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    minHeight: moderateScale(80, 0.3),
    textAlignVertical: 'top',
    lineHeight: moderateScale(20, 0.3),
  },
  uploadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(12),
    gap: scaleWidth(8),
    backgroundColor: COLORS.white,
  },
  uploadPdfBtnDisabled: {
    opacity: 0.5,
  },
  uploadPdfText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  pdfList: {
    marginTop: scaleHeight(10),
    gap: scaleHeight(8),
  },
  pdfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
    gap: scaleWidth(8),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  pdfName: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
  },
  bottomPad: {
    height: scaleHeight(12),
  },
  publishWrap: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(14),
    backgroundColor: COLORS.white,
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
    // paddingBottom is now dynamic
  },
  publishBtnWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  publishBtn: {
    paddingVertical: moderateScale(17, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8, 0.3),
  },
  publishBtnText: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  rocketEmoji: {
    fontSize: scaleFont(17),
  },
});

export default AddServiceScreen;