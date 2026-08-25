// screens/secretary/SecretaryLocalBusinessesScreen.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useFetchBusinessCategoriesQuery,
  useFetchSecretaryLocalBusinessesQuery,
  useUpdateSecretaryLocalBusinessStatusMutation,
  useDeleteSecretaryLocalBusinessMutation,
} from '../../redux/service/secretaryApi';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const StatusBadge = React.memo(({ status }) => (
  <View style={[styles.badge, status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
    <Text
      style={[styles.badgeText, status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Text>
  </View>
));

const BusinessCard = React.memo(
  ({ business, onEdit, onToggleStatus, onDelete, isStatusUpdating, isDeleting }) => {
    return (
      <View style={styles.card}>
        {/* ── Banner: shows business name whether or not an image exists ── */}
        <View style={styles.bannerWrap}>
          {business.bannerUrl ? (
            <>
              <Image source={{ uri: business.bannerUrl }} style={styles.banner} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.bannerOverlay}>
                <Text style={styles.bannerName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {business.businessName}
                </Text>
              </LinearGradient>
            </>
          ) : (
            <View style={[styles.banner, styles.bannerFallback]}>
              <Ionicons name="business" size={scaleFont(26)} color={COLORS.gradientStart} />
              <Text style={styles.bannerFallbackName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {business.businessName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Ionicons name="business" size={scaleFont(20)} color={COLORS.gradientStart} />
              </View>
            )}
            <View style={styles.cardHeaderText}>
              <View style={styles.nameRow}>
                <Text style={styles.businessName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {business.businessName}
                </Text>
                <StatusBadge status={business.status} />
              </View>
              <Text style={styles.metaText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {(business.businessCategories || []).join(' · ')} · {business.discountPercentage}% off
              </Text>
              <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Offer: {formatDate(business.discountStartDate)} – {formatDate(business.discountEndDate)}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(business)} activeOpacity={0.7}>
              <Ionicons name="pencil" size={scaleFont(15)} color={COLORS.textPrimary} />
              <Text style={styles.actionBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              disabled={isStatusUpdating}
              onPress={() => onToggleStatus(business)}
              activeOpacity={0.7}>
              {isStatusUpdating ? (
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              ) : (
                <Ionicons name="power" size={scaleFont(15)} color={COLORS.textPrimary} />
              )}
              <Text style={styles.actionBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {business.status === 'active' ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              disabled={isDeleting}
              onPress={() => onDelete(business)}
              activeOpacity={0.7}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Ionicons name="trash" size={scaleFont(15)} color={COLORS.error} />
              )}
              <Text style={styles.deleteBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
);

const SecretaryLocalBusinessesScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const queryArgs = useMemo(
    () => ({ search: debouncedSearch, category, status }),
    [debouncedSearch, category, status]
  );

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useFetchSecretaryLocalBusinessesQuery(queryArgs);

  const { data: categories = [] } = useFetchBusinessCategoriesQuery();

  const [updateStatus] = useUpdateSecretaryLocalBusinessStatusMutation();
  const [deleteBusiness] = useDeleteSecretaryLocalBusinessMutation();

  const businesses = data?.businesses || [];
  const currentStatusLabel = STATUS_OPTIONS.find(o => o.value === status)?.label || 'All';

  const onEdit = useCallback(
    (business) => {
      navigation.navigate('EditLocalBusiness', { businessId: business._id });
    },
    [navigation]
  );

  const onToggleStatus = useCallback(
    async (business) => {
      const next = business.status === 'active' ? 'inactive' : 'active';
      setStatusUpdatingId(business._id);
      try {
        await updateStatus({ businessId: business._id, status: next }).unwrap();
      } catch (e) {
        Alert.alert('Error', e?.data?.message || 'Could not update status.');
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [updateStatus]
  );

  const onDelete = useCallback(
    (business) => {
      Alert.alert(
        'Delete business',
        'Delete this business listing? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(business._id);
              try {
                await deleteBusiness(business._id).unwrap();
              } catch (e) {
                Alert.alert('Error', e?.data?.message || 'Could not delete business.');
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [deleteBusiness]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <BusinessCard
        business={item}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        isStatusUpdating={statusUpdatingId === item._id}
        isDeleting={deletingId === item._id}
      />
    ),
    [onEdit, onToggleStatus, onDelete, statusUpdatingId, deletingId]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header: back button (left) · title (center-left) · add icon (right) ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="business" size={scaleFont(18)} color={COLORS.gradientStart} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Business List
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Onboard local businesses and manage community discount offers.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('AddLocalBusiness')}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.addIconWrap}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addIconGrad}>
              <Ionicons name="add" size={scaleFont(20)} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerDivider} />

      {data?.needsCommunName ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnBannerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Set your Commun name on your profile before managing businesses.
          </Text>
        </View>
      ) : null}

      {/* ── Filters: search → category chips → status dropdown (bottom of section) ── */}
      <View style={styles.filtersCard}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={scaleFont(16)} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Name, owner, phone, email…"
            placeholderTextColor={COLORS.textMuted}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ name: '', label: 'All categories' }, ...categories.map((c) => ({ name: c.name, label: c.name }))]}
          keyExtractor={(item) => item.name || 'all'}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, category === item.name && styles.chipActive]}
              onPress={() => setCategory(item.name)}
              activeOpacity={0.8}>
              <Text
                style={[styles.chipText, category === item.name && styles.chipTextActive]}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* ── Status dropdown: bottom of the filter/category section, sits above the list ── */}
        <View style={styles.statusDropdownWrap}>
          <TouchableOpacity
            style={styles.statusDropdownTrigger}
            onPress={() => setStatusMenuOpen((v) => !v)}
            activeOpacity={0.8}>
            <Ionicons name="filter-outline" size={scaleFont(15)} color={COLORS.textSecondary} />
            <Text style={styles.statusDropdownLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {currentStatusLabel}
            </Text>
            <Ionicons
              name={statusMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={scaleFont(16)}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {statusMenuOpen && (
            <View style={styles.statusDropdownMenu}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value || 'all'}
                  style={styles.statusDropdownItem}
                  onPress={() => {
                    setStatus(opt.value);
                    setStatusMenuOpen(false);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.statusDropdownItemText,
                      status === opt.value && styles.statusDropdownItemTextActive,
                    ]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {opt.label}
                  </Text>
                  {status === opt.value && (
                    <Ionicons name="checkmark" size={scaleFont(16)} color={COLORS.gradientStart} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Tap-outside catcher to close the dropdown */}
      {statusMenuOpen && (
        <Pressable style={styles.dismissOverlay} onPress={() => setStatusMenuOpen(false)} />
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {error?.data?.message || 'Failed to load businesses.'}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No businesses yet. Add the first local business to start offering community discounts.
              </Text>
            </View>
          }
          // Performance: businesses lists are typically small per community,
          // but keep these tuned in case a community grows large.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(14),
    backgroundColor: COLORS.white,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: scaleWidth(24), marginRight: scaleWidth(8) },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(8),
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scaleFont(11),
    color: COLORS.textSecondary,
    marginTop: scaleHeight(2),
  },
  addIconWrap: { marginLeft: scaleWidth(8) },
  addIconGrad: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.button,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  warnBanner: {
    marginHorizontal: scaleWidth(16),
    marginTop: scaleHeight(12),
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: moderateScale(1, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(10, 0.3),
  },
  warnBannerText: { color: '#92400E', fontSize: scaleFont(13) },
  filtersCard: {
    marginHorizontal: scaleWidth(16),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(8),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    padding: moderateScale(10, 0.3),
    ...SHADOW.card,
    zIndex: 20,
  },
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: scaleWidth(12), zIndex: 1 },
  searchInput: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(10),
    paddingLeft: scaleWidth(36),
    paddingRight: scaleWidth(12),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  chipsRow: { gap: scaleWidth(8), paddingVertical: scaleHeight(10) },
  chip: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(7),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    backgroundColor: COLORS.inputBg,
  },
  chipActive: { backgroundColor: COLORS.gradientStart },
  chipText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  chipTextActive: { color: COLORS.white },
  statusDropdownWrap: {
    marginTop: scaleHeight(4),
    zIndex: 30,
  },
  statusDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scaleWidth(6),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.inputBg,
  },
  statusDropdownLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: moderateScale(42, 0.3),
    left: 0,
    minWidth: moderateScale(140, 0.3),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingVertical: scaleHeight(4),
    ...SHADOW.card,
    zIndex: 40,
    elevation: 10,
  },
  statusDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
  },
  statusDropdownItemText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  statusDropdownItemTextActive: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightBold,
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  errorBanner: {
    marginHorizontal: scaleWidth(16),
    marginBottom: scaleHeight(8),
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: moderateScale(1, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(10, 0.3),
  },
  errorBannerText: { color: COLORS.error, fontSize: scaleFont(13) },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleHeight(32),
    gap: scaleHeight(8),
  },
  card: {
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: COLORS.white,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: scaleHeight(8),
    ...SHADOW.card,
  },
  bannerWrap: { position: 'relative' },
  banner: { width: '100%', height: moderateScale(100, 0.3) },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: scaleWidth(10),
    paddingTop: scaleHeight(20),
    paddingBottom: scaleHeight(8),
  },
  bannerName: {
    color: COLORS.white,
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
  },
  bannerFallback: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerFallbackName: {
    marginTop: scaleHeight(4),
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  cardBody: { padding: moderateScale(10, 0.3) },
  cardHeaderRow: { flexDirection: 'row', gap: scaleWidth(8) },
  logo: {
    width: moderateScale(48, 0.3),
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  logoFallback: { backgroundColor: COLORS.inputBg, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8), flexWrap: 'wrap' },
  businessName: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  metaText: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
    marginTop: scaleHeight(2),
  },
  badge: {
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(3),
    borderRadius: moderateScale(RADIUS.full, 0.3),
  },
  badgeActive: { backgroundColor: '#ECFDF5', borderWidth: moderateScale(1, 0.3), borderColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#FEF2F2', borderWidth: moderateScale(1, 0.3), borderColor: '#FECACA' },
  badgeText: { fontSize: scaleFont(11), fontWeight: FONTS.weightSemiBold },
  badgeTextActive: { color: '#047857' },
  badgeTextInactive: { color: COLORS.error },
  actionsRow: {
    flexDirection: 'row',
    gap: scaleWidth(8),
    marginTop: scaleHeight(10),
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(5),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
  },
  actionBtnText: { fontSize: scaleFont(12), fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(5),
    borderWidth: moderateScale(1, 0.3),
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
  },
  deleteBtnText: { fontSize: scaleFont(12), fontWeight: FONTS.weightSemiBold, color: COLORS.error },
  emptyWrap: { padding: moderateScale(24, 0.3), alignItems: 'center' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: scaleFont(13) },
});

export default SecretaryLocalBusinessesScreen;