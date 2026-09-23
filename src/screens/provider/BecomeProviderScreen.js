// screens/provider/BecomeProviderScreen.jsx

import React, { useEffect, useState, useRef } from 'react';
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
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isErrorWithCode } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from '../../redux/service/apiClient';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useFetchActiveCategoriesQuery } from '../../redux/service/adminApi';
import { useLazyCheckAuthQuery } from '../../redux/service/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const { width } = Dimensions.get('window');
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Constants ────────────────────────────────────────────────────────────────
const DRAFT_KEY             = 'becomeProviderDraft:v1';
const PROVIDER_BIO_MAX_CHARS = 500;
const MAX_IMAGE_SIZE         = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_SIZE           = 20 * 1024 * 1024; // 20 MB
const EXPERIENCE_MAX_YEARS   = 80;
const MAX_IMAGES_PER_SERVICE = 5;

// ─── YouTube config ───────────────────────────────────────────────────────────
const GUIDE_VIDEO_ID  = '5uqpie3gCr0';
const GUIDE_VIDEO_URL = `https://www.youtube.com/watch?v=${GUIDE_VIDEO_ID}`;
const GUIDE_THUMBNAIL = `https://img.youtube.com/vi/${GUIDE_VIDEO_ID}/hqdefault.jpg`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
};

const fieldStyle = (hasError, isOnline) => ({
  borderWidth: 1,
  borderColor: hasError ? '#EF4444' : COLORS.border,
  borderRadius: RADIUS.md,
  paddingHorizontal: scaleWidth(14),
  paddingVertical: scaleHeight(12),
  fontSize: scaleFont(16),
  color: isOnline ? COLORS.textPrimary : COLORS.textMuted,
  backgroundColor: isOnline ? COLORS.white : COLORS.inputBg,
});

// ─── Safe base-URL resolver ───────────────────────────────────────────────────
const resolveProviderUrl = () => {
  try {
    const base = apiClient?.defaults?.baseURL || '';
    if (base) {
      const url = new URL(base);
      return `${url.protocol}//${url.host}/api/provider-profile/become-provider-multi`;
    }
  } catch {
    // fall through
  }
  return '/api/provider-profile/become-provider-multi';
};

// ─── YouTube Video Card ───────────────────────────────────────────────────────
const YoutubeVideoCard = () => {
  const handleOpen = () => {
    Linking.openURL(GUIDE_VIDEO_URL).catch(() => {
      Alert.alert('Error', 'Could not open the video. Please try again.');
    });
  };

  return (
    <TouchableOpacity
      style={videoStyles.card}
      onPress={handleOpen}
      activeOpacity={0.88}>

      {/* Thumbnail container */}
      <View style={videoStyles.thumbnailWrapper}>

        {/* Layer 1 — thumbnail image */}
        <Image
          source={{ uri: GUIDE_THUMBNAIL }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Layer 2 — dark gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 3 — play button, perfectly centered */}
        <View style={videoStyles.playOverlay}>
          <View style={videoStyles.playCircle}>
            <Icon
              name="play"
              size={scaleFont(22)}
              color="#fff"
              style={{ marginLeft: moderateScale(3, 0.3) }}
            />
          </View>
        </View>

        {/* Layer 4 — YouTube badge top-right */}
        <View style={videoStyles.ytBadge}>
          <MaterialIcon name="youtube" size={scaleFont(14)} color="#FF0000" />
          <Text
            style={videoStyles.ytBadgeText}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            YouTube
          </Text>
        </View>

      </View>

      {/* Bottom label row */}
      <View style={videoStyles.labelRow}>
        <View style={videoStyles.labelLeft}>
          <Text
            style={videoStyles.labelTitle}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            How to register as a provider
          </Text>
          <Text
            style={videoStyles.labelSub}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Tap to watch on YouTube
          </Text>
        </View>
        <View style={videoStyles.openBtn}>
          <Icon name="open-outline" size={scaleFont(16)} color={COLORS.gradientStart} />
        </View>
      </View>

    </TouchableOpacity>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BecomeProviderScreen = ({ navigation }) => {
  const insets        = useSafeAreaInsets();
  const { user }      = useSelector((state) => state.auth);
  const isMounted     = useRef(true);

  const [triggerCheckAuth] = useLazyCheckAuthQuery();
  const { isOnline }       = useNetworkStatus();

  const isPublicMember = user?.isPublicMember ?? false;

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // ── Categories ────────────────────────────────────────────────────────────
  const { data: categoriesData, isLoading: categoriesLoading } =
    useFetchActiveCategoriesQuery();
  const rules = categoriesData?.rules || {};

  // ── Form state ────────────────────────────────────────────────────────────
  const [providerBio,    setProviderBio]    = useState('');
  const [services,       setServices]       = useState([
    {
      id: Date.now(),
      servicename:   '',
      category:      '',
      subCategories: [],
      keywords:      [],
      images:        [],
      pdfs:          [],
      bio:           '',
      experience:    '',
    },
  ]);
  const [errors,         setErrors]         = useState({});
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [categoryPicker, setCategoryPicker] = useState({ visible: false, serviceId: null });

  // ── Draft restore ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;

        if (typeof parsed.providerBio === 'string') setProviderBio(parsed.providerBio);

        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          setServices(
            parsed.services.map((s) => ({
              id:            s?.id            || Date.now() + Math.random(),
              servicename:   s?.servicename   || '',
              category:      s?.category      || '',
              subCategories: Array.isArray(s?.subCategories) ? s.subCategories : [],
              keywords:      Array.isArray(s?.keywords)      ? s.keywords      : [],
              images: [],
              pdfs:   [],
              bio:           s?.bio           || '',
              experience:    s?.experience    ?? '',
            }))
          );
        }
      } catch {
        // ignore corrupted draft
      }
    };
    loadDraft();
  }, []);

  // ── Auto-save draft ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            providerBio: providerBio || '',
            services: services.map((s) => ({
              id:            s.id,
              servicename:   s.servicename   || '',
              category:      s.category      || '',
              subCategories: Array.isArray(s.subCategories) ? s.subCategories : [],
              keywords:      Array.isArray(s.keywords)      ? s.keywords      : [],
              bio:           s.bio           || '',
              experience:    s.experience    ?? '',
            })),
            savedAt: Date.now(),
          })
        );
      } catch {
        // ignore quota / blocked storage
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [providerBio, services]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearError = (key) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCategoryChange = (serviceId, category) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, category, subCategories: [], keywords: [] } : s
      )
    );
    clearError(`service-${serviceId}-category`);
  };

  const handleSubCategoryToggle = (serviceId, subCat) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const isSelected = s.subCategories.includes(subCat);
        return {
          ...s,
          subCategories: isSelected
            ? s.subCategories.filter((sc) => sc !== subCat)
            : [...s.subCategories, subCat],
        };
      })
    );
    clearError(`service-${serviceId}-subCategories`);
  };

  const handleKeywordToggle = (serviceId, keyword) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const isSelected = s.keywords.includes(keyword);
        return {
          ...s,
          keywords: isSelected
            ? s.keywords.filter((k) => k !== keyword)
            : [...s.keywords, keyword],
        };
      })
    );
    clearError(`service-${serviceId}-keywords`);
  };

  const handleInputChange = (serviceId, field, value) => {
    if (field === 'experience') {
      const raw = String(value ?? '').trim();
      if (raw === '') {
        setServices((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, experience: '' } : s))
        );
        clearError(`service-${serviceId}-experience`);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrors((prev) => ({
          ...prev,
          [`service-${serviceId}-experience`]: 'Experience must be a number (0 or more).',
        }));
        return;
      }
      if (parsed > EXPERIENCE_MAX_YEARS) {
        setErrors((prev) => ({
          ...prev,
          [`service-${serviceId}-experience`]: `Experience cannot exceed ${EXPERIENCE_MAX_YEARS} years.`,
        }));
        return;
      }
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId ? { ...s, experience: String(Math.floor(parsed)) } : s
        )
      );
      clearError(`service-${serviceId}-experience`);
      return;
    }

    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, [field]: value } : s))
    );
    clearError(`service-${serviceId}-${field}`);
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const handleImageUpload = (serviceId) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to upload images.');
      return;
    }
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: MAX_IMAGES_PER_SERVICE, quality: 0.8 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          if (isMounted.current)
            Alert.alert('Error', response.errorMessage || 'Failed to pick images');
          return;
        }
        const validAssets = (response.assets || []).filter((asset) => {
          const size = asset.fileSize || 0;
          if (size > MAX_IMAGE_SIZE) {
            if (isMounted.current)
              Alert.alert('File too large', `${asset.fileName} is ${formatBytes(size)} (max 10MB).`);
            return false;
          }
          return true;
        });
        if (!validAssets.length) return;

        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  images: [
                    ...s.images,
                    ...validAssets.map((a) => ({
                      uri:      a.uri,
                      fileName: a.fileName || 'image.jpg',
                      type:     a.type     || 'image/jpeg',
                      size:     a.fileSize || 0,
                    })),
                  ].slice(0, MAX_IMAGES_PER_SERVICE),
                }
              : s
          )
        );
        clearError(`service-${serviceId}-images`);
      }
    );
  };

  const handleRemoveImage = (serviceId, index) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, images: s.images.filter((_, i) => i !== index) } : s
      )
    );
  };

  // ── PDF picker ────────────────────────────────────────────────────────────
  const handlePDFUpload = async (serviceId) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to upload PDFs.');
      return;
    }
    try {
      const results = await pick({ type: [types.pdf], allowMultiSelection: false, mode: 'import' });
      const file    = Array.isArray(results) ? results[0] : results;
      if (!file) return;

      const size = file.size || 0;
      if (size > MAX_PDF_SIZE) {
        Alert.alert('File too large', `${file.name || 'PDF'} is ${formatBytes(size)} (max 20MB).`);
        return;
      }
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId
            ? {
                ...s,
                pdfs: [
                  ...s.pdfs,
                  { uri: file.uri, fileName: file.name || 'document.pdf', size },
                ],
              }
            : s
        )
      );
      clearError(`service-${serviceId}-pdfs`);
    } catch (err) {
      if (!isErrorWithCode(err) || err.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', 'Could not open PDF picker. Please try again.');
      }
    }
  };

  const handleRemovePDF = (serviceId, index) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, pdfs: s.pdfs.filter((_, i) => i !== index) } : s
      )
    );
  };

  // ── Add / Remove service ──────────────────────────────────────────────────
  const addNewService = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to add a service.');
      return;
    }
    setServices((prev) => [
      ...prev,
      {
        id:            Date.now(),
        servicename:   '',
        category:      '',
        subCategories: [],
        keywords:      [],
        images:        [],
        pdfs:          [],
        bio:           '',
        experience:    '',
      },
    ]);
  };

  const removeService = (serviceId) => {
    if (services.length <= 1) return;
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`service-${serviceId}`)) delete newErrors[key];
    });
    setErrors(newErrors);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    let hasErrors   = false;

    if (!providerBio.trim()) {
      newErrors['providerBio'] = 'Provider bio is required.';
      hasErrors = true;
    } else if (providerBio.length > PROVIDER_BIO_MAX_CHARS) {
      newErrors['providerBio'] = `Provider bio cannot exceed ${PROVIDER_BIO_MAX_CHARS} characters.`;
      hasErrors = true;
    }

    services.forEach((service) => {
      const sid = service.id;

      if (!service.servicename?.trim()) {
        newErrors[`service-${sid}-servicename`] = 'Service name is required.';
        hasErrors = true;
      }
      if (!service.category) {
        newErrors[`service-${sid}-category`] = 'Please select a category.';
        hasErrors = true;
      }
      if (
        service.category &&
        rules[service.category]?.subCategories?.length > 0 &&
        service.subCategories.length === 0
      ) {
        newErrors[`service-${sid}-subCategories`] = 'Please select at least one sub-category.';
        hasErrors = true;
      }
      if (
        service.category &&
        rules[service.category]?.keywords?.length > 0 &&
        service.keywords.length === 0
      ) {
        newErrors[`service-${sid}-keywords`] = 'Please select at least one keyword.';
        hasErrors = true;
      }
      if (!service.bio?.trim()) {
        newErrors[`service-${sid}-bio`] = 'Service description is required.';
        hasErrors = true;
      }
      if (service.experience !== '') {
        const exp = Number(service.experience);
        if (!Number.isFinite(exp) || exp < 0) {
          newErrors[`service-${sid}-experience`] = 'Experience must be a number (0 or more).';
          hasErrors = true;
        } else if (exp > EXPERIENCE_MAX_YEARS) {
          newErrors[`service-${sid}-experience`] = `Experience cannot exceed ${EXPERIENCE_MAX_YEARS} years.`;
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to submit your application.');
      return;
    }
    if (!validateForm()) {
      if (isMounted.current)
        Alert.alert('Validation Error', 'Please correct the errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('providerBio', providerBio);
      formData.append(
        'services',
        JSON.stringify(
          services.map((s) => ({
            servicename:   s.servicename   || '',
            category:      s.category      || '',
            subCategories: s.subCategories || [],
            keywords:      s.keywords      || [],
            bio:           s.bio           || '',
            experience:    s.experience    ?? '',
          }))
        )
      );

      services.forEach((service, index) => {
        (service.images || []).forEach((image) => {
          if (!image?.uri) return;
          formData.append(`service_${index}_images`, {
            uri:  image.uri,
            name: image.fileName || 'image.jpg',
            type: image.type     || 'image/jpeg',
          });
        });
        (service.pdfs || []).forEach((pdf) => {
          if (!pdf?.uri) return;
          formData.append(`service_${index}_pdfs`, {
            uri:  pdf.uri,
            name: pdf.fileName || 'document.pdf',
            type: 'application/pdf',
          });
        });
      });

      const response = await apiClient.post(resolveProviderUrl(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const data = response?.data;

      if (data?.success) {
        try { await AsyncStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

        if (isMounted.current) {
          setServices([{
            id: Date.now(), servicename: '', category: '', subCategories: [],
            keywords: [], images: [], pdfs: [], bio: '', experience: '',
          }]);
          setProviderBio('');
          setErrors({});
          setIsSubmitting(false);
        }

        try {
          await triggerCheckAuth(undefined, false).unwrap();
        } catch { /* ignore */ }

        if (isMounted.current) {
          if (isPublicMember) {
            Alert.alert(
              'Provider Activated!',
              data?.message || 'You are now a provider. Your services are live!',
              [{ text: 'Go to Dashboard', onPress: () => isMounted.current && navigation.replace('ProviderHub') }]
            );
          } else {
            const pending = data?.pendingApproval !== false;
            Alert.alert(
              'Application Submitted',
              data?.message || 'Your provider application has been submitted and is pending review.',
              [{
                text: 'OK',
                onPress: () => {
                  if (!isMounted.current) return;
                  try {
                    pending ? navigation.replace('PendingApproval') : navigation.popToTop();
                  } catch { navigation.goBack(); }
                },
              }]
            );
          }
        }
      } else {
        if (isMounted.current) {
          setIsSubmitting(false);
          Alert.alert('Submission Failed', data?.message || 'Something went wrong. Please try again.');
        }
      }
    } catch (error) {
      if (!isMounted.current) return;
      setIsSubmitting(false);

      let message = 'Failed to submit. Please try again.';
      if (error?.response) {
        const { status } = error.response;
        const serverMsg  = error.response.data?.message;
        if (status === 401 || status === 403) message = 'Your session has expired. Please log in again.';
        else if (status === 409) message = serverMsg || 'You already have a pending provider application.';
        else if (status >= 500) message = 'Server error. Please try again later.';
        else message = serverMsg || 'Unable to submit request. Please try again.';
      } else if (error?.request) {
        message = 'No response from server. Please check your internet connection and try again.';
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Error', message);
    }
  };

  // ── Service card ──────────────────────────────────────────────────────────
  const renderServiceCard = (service, index) => {
    const sid           = service.id;
    const categoryRules = service.category ? rules[service.category] : null;

    return (
      <View key={sid} style={styles.serviceCard}>
        {services.length > 1 && (
          <TouchableOpacity
            style={styles.removeServiceBtn}
            onPress={() => removeService(sid)}
            disabled={!isOnline}>
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.serviceHeader}>
          <View style={styles.serviceIndex}>
            <Text style={styles.serviceIndexText}>{index + 1}</Text>
          </View>
          <Text style={styles.serviceTitle}>Service</Text>
        </View>

        {/* Service Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Service Name *</Text>
          <TextInput
            style={fieldStyle(errors[`service-${sid}-servicename`], isOnline)}
            value={service.servicename}
            onChangeText={(text) => handleInputChange(sid, 'servicename', text)}
            placeholder="Enter a name for your service"
            placeholderTextColor={COLORS.textMuted}
            editable={isOnline}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          />
          {errors[`service-${sid}-servicename`] && (
            <Text style={styles.errorText}>{errors[`service-${sid}-servicename`]}</Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select Category *</Text>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors[`service-${sid}-category`] && styles.pickerError,
                !isOnline && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (!isOnline) { Alert.alert('No Internet', 'Please connect to select a category.'); return; }
                if (!Object.keys(rules).length) { Alert.alert('Not ready', 'Categories are still loading. Please wait.'); return; }
                setCategoryPicker({ visible: true, serviceId: sid });
              }}
              disabled={!isOnline}
              activeOpacity={0.7}>
              <Text
                style={{ color: service.category ? COLORS.textPrimary : COLORS.textMuted, fontSize: scaleFont(16) }}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {service.category || 'Choose a category'}
              </Text>
              <MaterialIcon name="chevron-down" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          {errors[`service-${sid}-category`] && (
            <Text style={styles.errorText}>{errors[`service-${sid}-category`]}</Text>
          )}
        </View>

        {/* Sub-categories */}
        {service.category && categoryRules?.subCategories?.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Select Sub-Categories *</Text>
            <View style={styles.chipContainer}>
              {categoryRules.subCategories.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, service.subCategories.includes(sub) && styles.chipSelected, !isOnline && { opacity: 0.5 }]}
                  onPress={() => handleSubCategoryToggle(sid, sub)}
                  disabled={!isOnline}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.chipText, service.subCategories.includes(sub) && styles.chipTextSelected]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors[`service-${sid}-subCategories`] && (
              <Text style={styles.errorText}>{errors[`service-${sid}-subCategories`]}</Text>
            )}
          </View>
        )}

        {/* Keywords */}
        {service.category && categoryRules?.keywords?.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Select Keywords / Specializations *</Text>
            <View style={styles.chipContainer}>
              {categoryRules.keywords.map((kw) => (
                <TouchableOpacity
                  key={kw}
                  style={[styles.chip, service.keywords.includes(kw) && styles.chipSelected, !isOnline && { opacity: 0.5 }]}
                  onPress={() => handleKeywordToggle(sid, kw)}
                  disabled={!isOnline}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.chipText, service.keywords.includes(kw) && styles.chipTextSelected]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {kw}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors[`service-${sid}-keywords`] && (
              <Text style={styles.errorText}>{errors[`service-${sid}-keywords`]}</Text>
            )}
          </View>
        )}

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Service Description *</Text>
          <TextInput
            style={[fieldStyle(errors[`service-${sid}-bio`], isOnline), { minHeight: 80, textAlignVertical: 'top' }]}
            value={service.bio}
            onChangeText={(text) => handleInputChange(sid, 'bio', text)}
            placeholder="Describe your service..."
            multiline
            numberOfLines={4}
            placeholderTextColor={COLORS.textMuted}
            editable={isOnline}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          />
          {errors[`service-${sid}-bio`] && (
            <Text style={styles.errorText}>{errors[`service-${sid}-bio`]}</Text>
          )}
        </View>

        {/* Experience */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Experience (in years) (optional)</Text>
          <TextInput
            style={fieldStyle(errors[`service-${sid}-experience`], isOnline)}
            value={service.experience}
            onChangeText={(text) => handleInputChange(sid, 'experience', text)}
            placeholder="e.g., 5"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
            editable={isOnline}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          />
          {errors[`service-${sid}-experience`] && (
            <Text style={styles.errorText}>{errors[`service-${sid}-experience`]}</Text>
          )}
        </View>

        {/* Image Upload */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Upload Work Images (optional)</Text>
          <Text style={styles.helperText}>Max {MAX_IMAGES_PER_SERVICE} images, up to 10MB each (PNG/JPG/JPEG)</Text>
          <TouchableOpacity
            style={[styles.uploadButton, !isOnline && { opacity: 0.5 }]}
            onPress={() => handleImageUpload(sid)}
            disabled={!isOnline}
            activeOpacity={0.7}>
            <MaterialIcon name="cloud-upload" size={32} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
            <Text
              style={[styles.uploadButtonText, !isOnline && { color: COLORS.textMuted }]}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Tap to select images
            </Text>
          </TouchableOpacity>
          {service.images.length > 0 && (
            <View style={styles.previewGrid}>
              {service.images.map((img, idx) => (
                <View key={idx} style={styles.previewItem}>
                  <Image source={{ uri: img.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePreviewBtn}
                    onPress={() => handleRemoveImage(sid, idx)}
                    disabled={!isOnline}>
                    <Icon name="close-circle" size={24} color={isOnline ? '#EF4444' : COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* PDF Upload */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Upload PDF (optional)</Text>
          <Text style={styles.helperText}>Max 1 file, up to 20MB (PDF)</Text>
          <TouchableOpacity
            style={[styles.uploadButton, !isOnline && { opacity: 0.5 }]}
            onPress={() => handlePDFUpload(sid)}
            disabled={!isOnline}
            activeOpacity={0.7}>
            <MaterialIcon name="file-pdf-box" size={32} color={isOnline ? '#EF4444' : COLORS.textMuted} />
            <Text
              style={[styles.uploadButtonText, !isOnline && { color: COLORS.textMuted }]}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Tap to select PDF
            </Text>
          </TouchableOpacity>
          {service.pdfs.map((pdf, idx) => (
            <View key={idx} style={styles.pdfPreview}>
              <MaterialIcon name="file-pdf" size={24} color={isOnline ? '#EF4444' : COLORS.textMuted} />
              <Text style={styles.pdfName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {pdf.fileName}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemovePDF(sid, idx)}
                disabled={!isOnline}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Category picker modal ─────────────────────────────────────────────────
  const renderCategoryPickerModal = () => (
    <Modal
      visible={categoryPicker.visible}
      transparent
      animationType="slide"
      onRequestClose={() => setCategoryPicker({ visible: false, serviceId: null })}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setCategoryPicker({ visible: false, serviceId: null })}>
        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Choose Category
          </Text>
          <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Select a category for this service
          </Text>
          <FlatList
            data={Object.keys(rules)}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            renderItem={({ item }) => {
              const isSelected = services.find((s) => s.id === categoryPicker.serviceId)?.category === item;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                  onPress={() => {
                    handleCategoryChange(categoryPicker.serviceId, item);
                    setCategoryPicker({ visible: false, serviceId: null });
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {item}
                  </Text>
                  {isSelected && (
                    <Icon name="checkmark-circle" size={scaleFont(20)} color={COLORS.gradientStart} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.modalCancelBtn}
            onPress={() => setCategoryPicker({ visible: false, serviceId: null })}
            activeOpacity={0.7}>
            <Text style={styles.modalCancelText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Cancel
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Become a Provider
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
          message="You are offline. Please connect to submit your application.">
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + moderateScale(70, 0.3) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Intro */}
            <View style={styles.introContainer}>
              <Text style={styles.introTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isPublicMember ? 'Become a Provider – No Approval Needed' : 'Share your skills with neighbours'}
              </Text>
              <Text style={styles.introText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isPublicMember
                  ? 'As a public member, you can become a provider immediately. Fill in the details below and your services will be live instantly.'
                  : 'Fill in the details below to apply as a provider. Your application will be reviewed by a secretary.'}
              </Text>
            </View>

            {/* ── YouTube guide video ───────────────────────────────────── */}
            <YoutubeVideoCard />

            {/* Provider Bio */}
            <View style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                About You
              </Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Provider Bio *
                </Text>
                <TextInput
                  style={[fieldStyle(errors['providerBio'], isOnline), { minHeight: 100, textAlignVertical: 'top' }]}
                  value={providerBio}
                  onChangeText={(text) => {
                    setProviderBio(text.length <= PROVIDER_BIO_MAX_CHARS ? text : text.slice(0, PROVIDER_BIO_MAX_CHARS));
                    if (errors['providerBio']) setErrors((prev) => ({ ...prev, providerBio: null }));
                  }}
                  placeholder="Tell us about yourself and your background..."
                  multiline
                  numberOfLines={4}
                  maxLength={PROVIDER_BIO_MAX_CHARS}
                  placeholderTextColor={COLORS.textMuted}
                  editable={isOnline}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
                <Text style={styles.charCount} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {providerBio.length}/{PROVIDER_BIO_MAX_CHARS}
                </Text>
                {errors['providerBio'] && (
                  <Text style={styles.errorText}>{errors['providerBio']}</Text>
                )}
              </View>
            </View>

            {/* Services */}
            {services.map(renderServiceCard)}

            {/* Add Another Service */}
            <TouchableOpacity
              style={[styles.addServiceBtn, !isOnline && { opacity: 0.5 }]}
              onPress={addNewService}
              activeOpacity={0.7}
              disabled={!isOnline}>
              <Icon name="add-circle-outline" size={24} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
              <Text
                style={[styles.addServiceBtnText, !isOnline && { color: COLORS.textMuted }]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Add Another Service
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitWrap, (!isOnline || isSubmitting) && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting || !isOnline}
              activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {isOnline ? 'Submit Registration' : 'No Internet'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </NetworkAwareView>
      </KeyboardAvoidingView>

      {renderCategoryPickerModal()}
    </SafeAreaView>
  );
};

// ─── Styles (improved text layout) ──────────────────────────────────────────
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
  backButton:    { width: scaleWidth(24) },
  headerSpacer:  { width: scaleWidth(24) },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  introContainer: {
    marginBottom: scaleHeight(24),  // increased spacing
  },
  introTitle: {
    fontSize: scaleFont(20),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  introText: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
  },
  card: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(22),   // increased
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: moderateScale(20, 0.3), // increased padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 3,
  },
  cardTitle: {
    fontSize: scaleFont(18),         // larger
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(14),    // more spacing
  },
  fieldGroup:  {
    marginBottom: scaleHeight(20),   // increased
  },
  label: {
    fontSize: scaleFont(15),         // slightly larger
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(6),
  },
  errorText: {
    color: '#EF4444',
    fontSize: scaleFont(13),
    marginTop: scaleHeight(4),
  },
  charCount: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: scaleHeight(4),
  },
  serviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3), // more padding
    marginBottom: scaleHeight(18),   // increased
    ...SHADOW.card,
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeServiceBtn: {
    position: 'absolute',
    top: moderateScale(8, 0.3),
    right: moderateScale(8, 0.3),
    backgroundColor: COLORS.textPrimary,
    borderRadius: moderateScale(16, 0.3),
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(18),   // more spacing
  },
  serviceIndex: {
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(16, 0.3),
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  serviceIndexText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
  },
  serviceTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
  },
  pickerError: { borderColor: '#EF4444' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8, 0.3),
  },
  chip: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(8),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:         { fontSize: scaleFont(13), color: COLORS.textPrimary },
  chipTextSelected: { color: '#fff' },
  uploadButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: scaleHeight(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  uploadButtonText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
  },
  helperText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(8),
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10, 0.3),
    marginTop: scaleHeight(12),
  },
  previewItem: {
    position: 'relative',
    width: (width - moderateScale(40, 0.3) - moderateScale(20, 0.3)) / 3,
    aspectRatio: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  removePreviewBtn: {
    position: 'absolute',
    top: -moderateScale(6, 0.3),
    right: -moderateScale(6, 0.3),
    backgroundColor: 'white',
    borderRadius: moderateScale(12, 0.3),
  },
  pdfPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: scaleHeight(10),
    borderRadius: RADIUS.md,
    marginTop: scaleHeight(8),
    gap: moderateScale(8, 0.3),
  },
  pdfName: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    marginBottom: scaleHeight(18),
    gap: moderateScale(8, 0.3),
  },
  addServiceBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
  },
  submitWrap: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(35),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  submitBtn: {
    paddingVertical: scaleHeight(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(20, 0.3),
    borderTopRightRadius: moderateScale(20, 0.3),
    paddingTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleHeight(32),
    maxHeight: '75%',
  },
  modalHandle: {
    width: scaleWidth(40),
    height: moderateScale(4, 0.3),
    backgroundColor: COLORS.border,
    borderRadius: moderateScale(2, 0.3),
    alignSelf: 'center',
    marginBottom: scaleHeight(16),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  modalSubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(16),
  },
  modalSeparator: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(4),
  },
  modalItemSelected: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(10),
  },
  modalItemText: {
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalItemTextSelected: {
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
  },
  modalCancelBtn: {
    marginTop: scaleHeight(16),
    paddingVertical: scaleHeight(14),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
});

// ─── YouTube card styles ──────────────────────────────────────────────────────
const videoStyles = StyleSheet.create({
  card: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    overflow: 'hidden',
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    ...SHADOW.card,
    shadowOpacity: 0.08,
    elevation: 3,
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0f0f0f',
    // No flexbox here — all children are absoluteFill or absolute
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  }, playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
 playCircle: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(26, 0.3),
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  ytBadge: {
    position: 'absolute',
    top: scaleHeight(8),
    right: scaleWidth(10),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: moderateScale(20, 0.3),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(3),
    gap: moderateScale(4, 0.3),
  },
  ytBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: '#0f0f0f',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    gap: moderateScale(10, 0.3),
  },
  labelLeft: { flex: 1 },
  labelTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  labelSub: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  openBtn: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export default BecomeProviderScreen;