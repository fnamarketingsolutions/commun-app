import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { scaleFont, scaleWidth, scaleHeight, moderateScale } from '../../utils/responsive';
import { useFetchCommunityLocalBusinessByIdQuery } from '../../redux/service/localBusinessMemberApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import CustomQuillViewer from '../../components/CustomQuillViewer';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const ContactAction = React.memo(({ icon, label, disabled, onPress }) => (
  <TouchableOpacity
    style={[styles.contactAction, disabled && styles.contactActionDisabled]}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={scaleFont(16)} color={disabled ? COLORS.textMuted : COLORS.gradientStart} />
    <Text style={[styles.contactActionText, disabled && styles.contactActionTextDisabled]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const EligibilityRow = React.memo(({ item }) => (
  <View style={[styles.eligibilityRow, item.eligible && styles.eligibilityRowActive]}>
    <View style={styles.eligibilityLeft}>
      <Icon
        name={item.eligible ? 'checkmark-circle' : 'close-circle'}
        size={scaleFont(16)}
        color={item.eligible ? '#059669' : '#DC2626'}
      />
      <Text style={styles.eligibilityName}>{item.name}</Text>
    </View>
    <Text style={[styles.eligibilityLabel, item.eligible && styles.eligibilityLabelActive]}>
      {item.label}
    </Text>
  </View>
));

const LocalBusinessDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();

  const { businessId } = route.params || {};

  const { data: business, isLoading, error } = useFetchCommunityLocalBusinessByIdQuery(businessId);

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const openUrl = useCallback((url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }, []);

  const onCall = () => business?.contactNumber && openUrl(`tel:${business.contactNumber}`);
  const onEmail = () => business?.email && openUrl(`mailto:${business.email}`);
  const onLocation = () =>
    business?.address &&
    openUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`);
  const onWebsite = () => business?.website && openUrl(business.website);

  const toggleDescription = () => {
    setDescriptionExpanded((prev) => !prev);
  };

  const handleTruncationChange = (truncated) => {
    setIsTruncated(truncated);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Business Detail
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centerFill}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Business Detail
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.centerFill}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {error?.data?.message || 'Business not found.'}
          </Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back" size={scaleFont(16)} color={COLORS.gradientStart} />
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOfferActive = business.discountActive;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {business.businessName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView isOnline={isOnline} showOfflineBanner={!isOnline}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero Card ─── */}
          <View style={styles.heroCard}>
            {business.bannerUrl ? (
              <Image source={{ uri: business.bannerUrl }} style={styles.banner} resizeMode="contain" />
            ) : (
              <View style={[styles.banner, styles.bannerFallback]}>
                <Icon name="image-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              </View>
            )}

            <View style={styles.heroBody}>
              <View style={styles.heroHeaderRow}>
                {business.logoUrl ? (
                  <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <View style={[styles.logo, styles.logoFallback]}>
                    <Icon name="business-outline" size={scaleFont(22)} color={COLORS.gradientStart} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.businessName}>{business.businessName}</Text>
                  <Text style={styles.categoryText}>
                    {(business.businessCategories || []).join(' · ')}
                  </Text>
                  <View style={styles.offerStatusRow}>
                    <View style={[styles.offerPill, isOfferActive ? styles.offerPillActive : styles.offerPillInactive]}>
                      <Text style={[styles.offerPillText, isOfferActive ? styles.offerPillTextActive : styles.offerPillTextInactive]}>
                        {isOfferActive ? `${business.discountPercentage}% Off` : 'Offer Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ─── Description with auto-height ─── */}
              {business.description ? (
                <View style={styles.descriptionWrapper}>
                  <CustomQuillViewer
                    content={business.description}
                    collapsed={!descriptionExpanded}
                    collapsedHeight={moderateScale(80, 0.3)}
                    onTruncationChange={handleTruncationChange}
                  />
                  {isTruncated && (
                    <TouchableOpacity
                      onPress={toggleDescription}
                      style={styles.readMoreButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.readMoreText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {descriptionExpanded ? 'Read less' : 'Read more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          {/* ─── Discount Eligibility ─── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discount Eligibility</Text>
            <Text style={styles.cardSubtitle}>
              Valid {formatDate(business.discountStartDate)} – {formatDate(business.discountEndDate)}
            </Text>

            <View style={{ marginTop: scaleHeight(12), gap: scaleHeight(8) }}>
              {(business.offerEligibility || []).map((item) => (
                <EligibilityRow key={`${item.name}-${item.eligible}`} item={item} />
              ))}
              {!business.offerEligibility?.length ? (
                <Text style={styles.emptyText}>No service eligibility configured.</Text>
              ) : null}
            </View>
          </View>

          {/* ─── Contact & Location ─── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact & Location</Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Owner</Text>
                <Text style={styles.infoValue}>{business.ownerName || '—'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{business.contactNumber || '—'}</Text>
              </View>
              <View style={[styles.infoBox, { width: '100%' }]}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{business.address || '—'}</Text>
              </View>
            </View>

            <View style={styles.contactActionsRow}>
              <ContactAction icon="call-outline" label="Call" disabled={!business.contactNumber} onPress={onCall} />
              <ContactAction icon="mail-outline" label="Email" disabled={!business.email} onPress={onEmail} />
              <ContactAction icon="location-outline" label="Location" disabled={!business.address} onPress={onLocation} />
              {business.website ? (
                <ContactAction icon="globe-outline" label="Website" onPress={onWebsite} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </NetworkAwareView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
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
  content: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    gap: scaleHeight(16),
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleHeight(12),
    paddingHorizontal: scaleWidth(30),
  },
  errorText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.inputBg,
  },
  backLinkText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  heroCard: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  banner: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.inputBg,
  },
  bannerFallback: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    padding: moderateScale(16, 0.3),
  },
  heroHeaderRow: {
    flexDirection: 'row',
    gap: scaleWidth(12),
  },
  logo: {
    width: moderateScale(52, 0.3),
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  logoFallback: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  categoryText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  offerStatusRow: { marginTop: scaleHeight(6) },
  offerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: 1,
  },
  offerPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  offerPillInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  offerPillText: { fontSize: scaleFont(11), fontWeight: FONTS.weightBold },
  offerPillTextActive: { color: '#047857' },
  offerPillTextInactive: { color: '#DC2626' },
  descriptionWrapper: {
    width: '100%',
    marginTop: moderateScale(8, 0.3),
  },
  readMoreButton: {
    marginTop: scaleHeight(8),
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
    fontSize: scaleFont(13),
  },
  card: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: COLORS.card,
    padding: moderateScale(16, 0.3),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
  },
  eligibilityRowActive: {
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
  },
  eligibilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    flexShrink: 1,
  },
  eligibilityName: {
    fontSize: scaleFont(13),
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  eligibilityLabel: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  eligibilityLabelActive: { color: '#047857' },
  emptyText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: scaleHeight(8),
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginTop: scaleHeight(10),
  },
  infoBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
  },
  infoLabel: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: moderateScale(0.3, 0.1),
  },
  infoValue: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    marginTop: scaleHeight(2),
  },
  contactActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
    marginTop: scaleHeight(12),
  },
  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    backgroundColor: COLORS.white,
  },
  contactActionDisabled: { opacity: 0.5 },
  contactActionText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  contactActionTextDisabled: {
    color: COLORS.textMuted,
  },
});

export default LocalBusinessDetailScreen;