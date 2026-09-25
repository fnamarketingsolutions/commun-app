// screens/provider/EditServiceScreen.jsx

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchMyProviderProfileQuery,
  useUpdateServiceOfferingMutation,
  useGetS3PresignedUrlMutation,
} from '../../redux/service/providerApi';
import { useFetchActiveCategoriesQuery } from '../../redux/service/adminApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import SvgImage from '../../components/SvgImage';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const MAX_IMAGES = 5;
const MAX_PDFS = 5;

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

// ─── Check if a URL is a real loadable URL ────────────────────────────────────
const isValidUrl = (url) =>
  typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

// ─── Build initial form state from a ServiceOffering document ─────────────────
const buildServiceState = (service) => ({
  servicename: service?.servicename || '',
  category: service?.serviceCategory || '',
  subCategories: service?.subCategories || [],
  keywords: service?.keywords || [],
  bio: service?.description || '',
  experience: service?.experience != null ? String(service.experience) : '',
  existingImages: (service?.portfolioImages || []).filter((img) => img && isValidUrl(img.url)),
  existingPDFs: (service?.portfolioPDFs || []).filter((pdf) => pdf && isValidUrl(pdf.url)),
  images: [],
  imagePreviews: [],
  pdfs: [],
  pdfPreviews: [],
});

// ─── Field component ──────────────────────────────────────────────────────────
const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, editable = true }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
    <View style={[fieldStyles.inputWrap, multiline && { height: moderateScale(120, 0.3), alignItems: 'flex-start' }]}>
      <TextInput
        style={[fieldStyles.input, multiline && { height: moderateScale(100, 0.3), textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType || 'default'}
        multiline={multiline || false}
        numberOfLines={numberOfLines}
        autoCapitalize="none"
        editable={editable}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      />
    </View>
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: moderateScale(18, 0.3) },
  label: {
    fontSize: scaleFont(14),
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
    justifyContent: 'center',
  },
  input: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(13) : scaleHeight(10),
  },
});

// ─── ImageItem — proper component so useState is legal ───────────────────────
const ImageItem = ({ item, index, serviceName, isOnline, onRemove }) => {
  const [imgError, setImgError] = useState(false);
  const url = item.url;
  const isSvg = url && url.endsWith('.svg');

  return (
    <View style={styles.mediaItem}>
      {!imgError ? (
        isSvg ? (
          <SvgImage uri={url} style={styles.mediaThumb} onError={() => setImgError(true)} />
        ) : (
          <Image
            source={{ uri: url }}
            style={styles.mediaThumb}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        )
      ) : (
        <View style={[styles.mediaThumb, styles.placeholderItem]}>
          <Icon name="image-outline" size={scaleFont(24)} color={COLORS.textMuted} />
          <Text
            style={styles.placeholderText}
            numberOfLines={2}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {serviceName || 'Service'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.removeMediaBtn}
        onPress={() => onRemove(index)}
        activeOpacity={0.7}
        disabled={!isOnline}>
        <Icon name="close-circle" size={scaleFont(20)} color={isOnline ? '#EF4444' : COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const EditServiceScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const serviceId = route?.params?.serviceId;

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data: providerProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
    isFetching: isFetchingProfile,
  } = useFetchMyProviderProfileQuery();

  const {
    data: categoriesData,
    isLoading: isLoadingCats,
    refetch: refetchCats,
    isFetching: isFetchingCats,
  } = useFetchActiveCategoriesQuery();

  const [updateService, { isLoading: isUpdating }] = useUpdateServiceOfferingMutation();
  const [getPresignedUrl] = useGetS3PresignedUrlMutation();

  const targetService = useMemo(
    () => providerProfile?.serviceOfferings?.find((s) => s._id === serviceId) ?? null,
    [providerProfile, serviceId],
  );

  const rules = useMemo(() => categoriesData?.rules ?? {}, [categoriesData]);

  const [form, setForm] = useState(null);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);

  useEffect(() => {
    if (targetService) {
      setForm(buildServiceState(targetService));
    }
  }, [targetService]);

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  const refetchAll = useCallback(() => {
    refetchProfile();
    refetchCats();
    lastFetchTime.current = Date.now();
  }, [refetchProfile, refetchCats]);

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAll();
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAll();
  }, [refetchAll, isOnline]);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCategoryChange = useCallback((cat) => {
    setForm((prev) => ({ ...prev, category: cat, subCategories: [], keywords: [] }));
    setShowCatPicker(false);
  }, []);

  const handleToggle = useCallback((key, value) => {
    setForm((prev) => {
      const list = prev[key] || [];
      const exists = list.includes(value);
      return { ...prev, [key]: exists ? list.filter((i) => i !== value) : [...list, value] };
    });
  }, []);

  const uploadFiles = async (files, existingKey, fileType) => {
    const uploaded = [];
    for (const asset of files) {
      try {
        const presigned = await getPresignedUrl({
          filename: asset.fileName || 'file',
          contentType: asset.type || (fileType === 'image' ? 'image/jpeg' : 'application/pdf'),
        }).unwrap();

        await uploadToS3(presigned.uploadUrl, asset.uri, asset.type || 'image/jpeg');

        uploaded.push({
          url: presigned.publicUrl,
          public_id: presigned.public_id,
        });
      } catch (err) {
        Alert.alert('Upload Failed', `Could not upload ${asset.fileName || 'file'}. Please try again.`);
        throw err;
      }
    }
    return uploaded;
  };

  const handleAddImages = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to upload images.');
      return;
    }
    const currentCount = (form?.existingImages || []).length;
    if (currentCount >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: MAX_IMAGES - currentCount, quality: 0.8 },
      async (response) => {
        if (response.didCancel || !response.assets?.length) return;
        setIsUploadingImg(true);
        try {
          const uploaded = await uploadFiles(response.assets, 'existingImages', 'image');
          setForm((prev) => ({
            ...prev,
            existingImages: [...prev.existingImages, ...uploaded],
          }));
        } catch (_) { }
        finally {
          setIsUploadingImg(false);
        }
      }
    );
  }, [form, getPresignedUrl, isOnline]);

  const handleAddPDFs = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to upload PDFs.');
      return;
    }
    const currentCount = (form?.existingPDFs || []).length;
    if (currentCount >= MAX_PDFS) {
      Alert.alert('Limit Reached', `You can upload up to ${MAX_PDFS} PDFs.`);
      return;
    }

    launchImageLibrary(
      { mediaType: 'mixed', selectionLimit: MAX_PDFS - currentCount },
      async (response) => {
        if (response.didCancel || !response.assets?.length) return;
        const pdfAssets = response.assets.filter(
          (asset) => asset.type === 'application/pdf' || asset.fileName?.toLowerCase().endsWith('.pdf')
        );
        if (pdfAssets.length === 0) {
          Alert.alert('Invalid File', 'Please select PDF files only.');
          return;
        }
        if (pdfAssets.length + currentCount > MAX_PDFS) {
          Alert.alert('Limit Reached', `You can upload up to ${MAX_PDFS} PDFs.`);
          return;
        }

        setIsUploadingPDF(true);
        try {
          const uploaded = await uploadFiles(pdfAssets, 'existingPDFs', 'pdf');
          setForm((prev) => ({
            ...prev,
            existingPDFs: [...prev.existingPDFs, ...uploaded],
          }));
        } catch (_) { }
        finally {
          setIsUploadingPDF(false);
        }
      }
    );
  }, [form, getPresignedUrl, isOnline]);

  const removeImage = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
    }));
  }, []);

  const removePDF = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      existingPDFs: prev.existingPDFs.filter((_, i) => i !== index),
    }));
  }, []);

  const validate = () => {
    if (!form?.servicename?.trim()) {
      Alert.alert('Error', 'Service name is required.');
      return false;
    }
    if (!form?.category) {
      Alert.alert('Error', 'Please select a category.');
      return false;
    }
    if (
      form.category &&
      (rules[form.category]?.subCategories?.length || 0) > 0 &&
      form.subCategories.length === 0
    ) {
      Alert.alert('Error', 'Pick at least one sub-category.');
      return false;
    }
    if (
      form.category &&
      (rules[form.category]?.keywords?.length || 0) > 0 &&
      form.keywords.length === 0
    ) {
      Alert.alert('Error', 'Select at least one keyword.');
      return false;
    }
    if (!form?.bio?.trim()) {
      Alert.alert('Error', 'Description is required.');
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to update the service.');
      return;
    }
    if (!form || !validate()) return;

    try {
      await updateService({
        serviceId,
        servicename: form.servicename,
        serviceCategory: form.category,
        subCategories: form.subCategories,
        keywords: form.keywords,
        description: form.bio,
        experience: form.experience !== '' ? form.experience : undefined,
        portfolioImages: form.existingImages,
        portfolioPDFs: form.existingPDFs,
      }).unwrap();

      Alert.alert('Success', 'Service updated successfully!', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Unable to update service. Please try again.');
    }
  };

  // ─── FlatList render callbacks ────────────────────────────────────────────
  const renderImageItem = useCallback(({ item, index }) => (
    <ImageItem
      item={item}
      index={index}
      serviceName={form?.servicename}
      isOnline={isOnline}
      onRemove={removeImage}
    />
  ), [form?.servicename, isOnline, removeImage]);

  const renderPDFItem = useCallback(({ item, index }) => (
    <View style={styles.mediaItem}>
      <View style={[styles.mediaThumb, styles.pdfThumb]}>
        <Icon name="document-text-outline" size={scaleFont(28)} color={COLORS.gradientStart} />
      </View>
      <TouchableOpacity
        style={styles.removeMediaBtn}
        onPress={() => removePDF(index)}
        activeOpacity={0.7}
        disabled={!isOnline}>
        <Icon name="close-circle" size={scaleFont(20)} color={isOnline ? '#EF4444' : COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  ), [isOnline, removePDF]);

  const hasData = !!form || !!targetService;
  const showOfflineBanner = !isOnline && hasData;

  const isLoading = (isLoadingProfile || isLoadingCats) && !form;
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Edit Service
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading service details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoadingProfile && !targetService) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Edit Service
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Service not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Edit Service
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

        <NetworkAwareView
          isOnline={isOnline}
          showOfflineBanner={showOfflineBanner}
          message="You are offline. Please connect to the internet to make changes."
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: insets.bottom + moderateScale(100, 0.3),
                paddingTop: scaleHeight(16),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={(isFetchingProfile || isFetchingCats) && isOnline}
                onRefresh={onRefresh}
                enabled={isOnline}
                tintColor={COLORS.gradientStart}
              />
            }
          >

            {/* ── Service Name ── */}
            <Field
              label="Service Title"
              value={form?.servicename || ''}
              onChangeText={(v) => updateField('servicename', v)}
              placeholder="Enter service title"
              editable={isOnline}
            />

            {/* ── Category ── */}
            <View style={{ marginBottom: moderateScale(18, 0.3) }}>
              <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Category
              </Text>
              <TouchableOpacity
                style={[styles.pickerBtn, !isOnline && { opacity: 0.5 }]}
                onPress={() => isOnline && setShowCatPicker((v) => !v)}
                activeOpacity={0.8}
                disabled={!isOnline}>
                <Text
                  style={styles.pickerBtnText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {form?.category || 'Select…'}
                </Text>
                <Icon
                  name={showCatPicker ? 'chevron-up' : 'chevron-down'}
                  size={scaleFont(16)}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={styles.dropdown}>
                  {Object.keys(rules).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.dropdownItem}
                      onPress={() => handleCategoryChange(cat)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          cat === form?.category && { color: COLORS.gradientStart, fontWeight: FONTS.weightBold },
                        ]}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── Sub-categories ── */}
            {form?.category && (rules[form.category]?.subCategories?.length || 0) > 0 && (
              <View style={{ marginBottom: moderateScale(18, 0.3) }}>
                <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Sub-categories
                </Text>
                <View style={styles.chipRow}>
                  {rules[form.category].subCategories.map((sub) => {
                    const selected = form.subCategories.includes(sub);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                          !isOnline && { opacity: 0.5 },
                        ]}
                        onPress={() => isOnline && handleToggle('subCategories', sub)}
                        activeOpacity={0.7}
                        disabled={!isOnline}>
                        <Text
                          style={[styles.chipText, selected && styles.chipTextSelected]}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Keywords ── */}
            {form?.category && (rules[form.category]?.keywords?.length || 0) > 0 && (
              <View style={{ marginBottom: moderateScale(18, 0.3) }}>
                <Text style={fieldStyles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Keywords
                </Text>
                <View style={styles.chipRow}>
                  {rules[form.category].keywords.map((kw) => {
                    const selected = form.keywords.includes(kw);
                    return (
                      <TouchableOpacity
                        key={kw}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                          !isOnline && { opacity: 0.5 },
                        ]}
                        onPress={() => isOnline && handleToggle('keywords', kw)}
                        activeOpacity={0.7}
                        disabled={!isOnline}>
                        <Text
                          style={[styles.chipText, selected && styles.chipTextSelected]}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {kw}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Description ── */}
            <Field
              label="Service Description"
              value={form?.bio || ''}
              onChangeText={(v) => updateField('bio', v)}
              placeholder="Describe your service in detail..."
              multiline
              numberOfLines={5}
              editable={isOnline}
            />

            {/* ── Experience ── */}
            <Field
              label="Experience (years)"
              value={form?.experience || ''}
              onChangeText={(v) => updateField('experience', v)}
              placeholder="e.g. 3"
              keyboardType="numeric"
              editable={isOnline}
            />

            {/* ── Images Section ── */}
            <View style={styles.mediaSection}>
              <Text style={styles.mediaSectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Service Images ({form?.existingImages?.length || 0}/{MAX_IMAGES})
              </Text>
              <FlatList
                horizontal
                data={form?.existingImages || []}
                renderItem={renderImageItem}
                keyExtractor={(_, index) => `img-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaList}
                ListFooterComponent={
                  (form?.existingImages?.length || 0) < MAX_IMAGES ? (
                    <TouchableOpacity
                      style={[styles.addMediaBtn, !isOnline && { opacity: 0.5 }]}
                      onPress={handleAddImages}
                      activeOpacity={0.7}
                      disabled={isUploadingImg || !isOnline}>
                      {isUploadingImg ? (
                        <ActivityIndicator size="small" color={COLORS.gradientStart} />
                      ) : (
                        <>
                          <Icon name="add-circle-outline" size={scaleFont(24)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                          <Text style={[styles.addMediaText, !isOnline && { color: COLORS.textMuted }]}>
                            Add Image
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>

            {/* ── PDFs Section ── */}
            <View style={styles.mediaSection}>
              <Text style={styles.mediaSectionTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Service PDFs ({form?.existingPDFs?.length || 0}/{MAX_PDFS})
              </Text>
              <FlatList
                horizontal
                data={form?.existingPDFs || []}
                renderItem={renderPDFItem}
                keyExtractor={(_, index) => `pdf-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaList}
                ListFooterComponent={
                  (form?.existingPDFs?.length || 0) < MAX_PDFS ? (
                    <TouchableOpacity
                      style={[styles.addMediaBtn, !isOnline && { opacity: 0.5 }]}
                      onPress={handleAddPDFs}
                      activeOpacity={0.7}
                      disabled={isUploadingPDF || !isOnline}>
                      {isUploadingPDF ? (
                        <ActivityIndicator size="small" color={COLORS.gradientStart} />
                      ) : (
                        <>
                          <Icon name="add-circle-outline" size={scaleFont(24)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
                          <Text style={[styles.addMediaText, !isOnline && { color: COLORS.textMuted }]}>
                            Add PDF
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>

          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, moderateScale(14, 0.3)) }]}>
        <TouchableOpacity
          onPress={handleUpdate}
          activeOpacity={0.85}
          disabled={isUpdating || !isOnline}
          style={styles.updateWrap}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.updateBtn, (isUpdating || !isOnline) && { opacity: 0.6 }]}>
            {isUpdating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.updateBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {isOnline ? 'Update Service' : 'No Internet'}
                </Text>
                {isOnline && (
                  <Icon
                    name="checkmark-circle-outline"
                    size={scaleFont(20)}
                    color={COLORS.white}
                    style={{ marginLeft: moderateScale(8, 0.3) }}
                  />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(13) : scaleHeight(12),
  },
  pickerBtnText: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(6),
  },
  dropdown: {
    position: 'absolute',
    top: moderateScale(80, 0.3),
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    zIndex: 100,
    ...SHADOW.card,
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
  },
  dropdownItemText: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.gradientStart,
    borderColor: COLORS.gradientStart,
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
  mediaSection: {
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(20),
  },
  mediaSectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(10),
  },
  mediaList: {
    gap: scaleWidth(10),
  },
  mediaItem: {
    position: 'relative',
    width: moderateScale(80, 0.3),
    height: moderateScale(80, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  placeholderItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: moderateScale(4, 0.3),
  },
  placeholderText: {
    fontSize: scaleFont(10),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scaleHeight(2),
  },
  pdfThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: -moderateScale(4, 0.3),
    right: -moderateScale(4, 0.3),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12, 0.3),
  },
  addMediaBtn: {
    width: moderateScale(80, 0.3),
    height: moderateScale(80, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  addMediaText: {
    fontSize: scaleFont(11),
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightMedium,
    marginTop: scaleHeight(2),
  },
  bottomBar: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  updateWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    shadowColor: COLORS.gradientStart,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  updateBtn: {
    flexDirection: 'row',
    paddingVertical: moderateScale(17, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default EditServiceScreen;