import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { scaleFont, scaleWidth, scaleHeight, moderateScale } from '../../utils/responsive';
import { ROUTES } from '../../navigations/routes';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import {
  useFetchCommunityLocalBusinessesQuery,
  useFetchMemberBusinessCategoriesQuery,
} from '../../redux/service/localBusinessMemberApi';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

// ─── Business Row Card ──────────────────────────────────────────────────────
const BusinessRow = React.memo(({ business, onPress }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(business)}>
    {business.bannerUrl ? (
      <Image source={{ uri: business.bannerUrl }} style={styles.banner} resizeMode="contain" />
    ) : (
      <View style={[styles.banner, styles.bannerFallback]}>
        <Icon name="image-outline" size={scaleFont(28)} color={COLORS.textMuted} />
      </View>
    )}
    <View style={styles.cardBody}>
      <View style={styles.cardHeaderRow}>
        {business.logoUrl ? (
          <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Icon name="business-outline" size={scaleFont(18)} color={COLORS.gradientStart} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.businessName} numberOfLines={1}>
            {business.businessName}
          </Text>
          <Text style={styles.categoryText} numberOfLines={1}>
            {(business.businessCategories || []).join(' · ')}
          </Text>
          {business.discountActive ? (
            <View style={styles.offerPill}>
              <Icon name="pricetag-outline" size={scaleFont(11)} color="#047857" />
              <Text style={styles.offerPillText}>
                Community Offer · {business.discountPercentage}% Off
              </Text>
            </View>
          ) : (
            <Text style={styles.offerInactiveText}>Offer not active currently</Text>
          )}
        </View>
      </View>
    </View>
  </TouchableOpacity>
));

// ─── Custom Category Selector Overlay ──────────────────────────────────────
const CategorySelectOverlay = ({ visible, categories, selectedCategory, onSelect, onClose, insets }) => {
  if (!visible) return null;

  const allOption = { name: '', label: 'All' };
  const allCategories = [allOption, ...categories.map((c) => ({ name: c.name, label: c.name }))];

  return (
    <View style={styles.overlayContainer}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlayBackdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.overlayContent, { paddingBottom: scaleHeight(20) + (insets?.bottom || 0) }]}>
        <Text style={styles.modalTitle}>Select Category</Text>
        <FlatList
          data={allCategories}
          keyExtractor={(item) => item.name || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.modalItem,
                selectedCategory === item.name && styles.modalItemActive,
              ]}
              onPress={() => {
                onSelect(item.name);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.modalItemText,
                  selectedCategory === item.name && styles.modalItemTextActive,
                ]}
              >
                {item.label}
              </Text>
              {selectedCategory === item.name && (
                <Icon name="checkmark" size={scaleFont(18)} color={COLORS.gradientStart} />
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
        />
        <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
          <Text style={styles.modalCloseText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────
const AllLocalBusinessesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const queryArgs = useMemo(
    () => ({ search: debouncedSearch, category }),
    [debouncedSearch, category]
  );

  const { data, isLoading, isFetching, refetch, error } =
    useFetchCommunityLocalBusinessesQuery(queryArgs);
  const { data: categories = [] } = useFetchMemberBusinessCategoriesQuery();

  const businesses = data?.businesses || [];
  const needsCommunity = data?.needsCommunity || false;

  const onCardPress = useCallback(
    (business) => {
      navigation.navigate(ROUTES.LOCAL_BUSINESS_DETAIL, { businessId: business._id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => <BusinessRow business={item} onPress={onCardPress} />,
    [onCardPress]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const selectedCategoryLabel = useMemo(() => {
    if (category === '') return 'All';
    const found = categories.find((c) => c.name === category);
    return found ? found.name : 'All';
  }, [category, categories]);

  const handleSelectCategory = useCallback((catName) => {
    setCategory(catName);
  }, []);

  const handleCategoryPress = useCallback(() => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change categories.');
      return;
    }
    setModalVisible(true);
  }, [isOnline]);

  return (
    <View style={styles.rootWrap}>
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
            Local Businesses
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerDivider} />

        {/* Search row – kept outside NetworkAwareView to avoid clipping */}
        <View style={styles.searchRowWrap}>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Icon
                name="search-outline"
                size={scaleFont(16)}
                color={COLORS.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search businesses…"
                placeholderTextColor={COLORS.textMuted}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                editable={isOnline}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={scaleFont(16)} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.categorySelector}
              onPress={handleCategoryPress}
            >
              <Text style={styles.categorySelectorText} numberOfLines={1}>
                {selectedCategoryLabel}
              </Text>
              <Icon name="chevron-down" size={scaleFont(16)} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <NetworkAwareView isOnline={isOnline} showOfflineBanner={!isOnline}>
          <View style={[styles.container, { paddingBottom: insets.bottom + moderateScale(16, 0.3) }]}>
            {needsCommunity && (
              <View style={styles.needsCommunityBanner}>
                <Icon name="information-circle-outline" size={scaleFont(18)} color="#92400E" />
                <Text style={styles.needsCommunityText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Join a community to browse local business offers.
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={scaleFont(16)} color="#B91C1C" />
                <Text style={styles.errorBannerText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {error?.data?.message || 'Failed to load businesses.'}
                </Text>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.centerFill}>
                <ActivityIndicator size="small" color={COLORS.primary} />
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
                    enabled={isOnline}
                    tintColor={COLORS.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Icon name="business-outline" size={scaleFont(40)} color={COLORS.border} />
                    <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {needsCommunity
                        ? 'Join a community to browse local business offers.'
                        : 'No participating businesses right now.'}
                    </Text>
                  </View>
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews
                updateCellsBatchingPeriod={50}
              />
            )}
          </View>
        </NetworkAwareView>
      </SafeAreaView>

      {/* ─── Custom Overlay (rendered above everything) ─── */}
      <CategorySelectOverlay
        visible={modalVisible}
        categories={categories}
        selectedCategory={category}
        onSelect={handleSelectCategory}
        onClose={() => setModalVisible(false)}
        insets={insets}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootWrap: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
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
  searchRowWrap: {
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(4),
  },
  container: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    marginBottom: scaleHeight(12),
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
  },
  searchIcon: { marginRight: scaleWidth(6) },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: scaleHeight(4),
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.white,
    minWidth: scaleWidth(80),
    justifyContent: 'center',
  },
  categorySelectorText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 1000,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(RADIUS.lg, 0.3),
    borderTopRightRadius: moderateScale(RADIUS.lg, 0.3),
    paddingTop: scaleHeight(20),
    paddingHorizontal: scaleWidth(20),
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scaleHeight(12),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(4),
  },
  modalItemActive: {},
  modalItemText: {
    fontSize: scaleFont(16),
    color: COLORS.textPrimary,
  },
  modalItemTextActive: {
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  modalCloseButton: {
    marginTop: scaleHeight(12),
    paddingVertical: scaleHeight(12),
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCloseText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  needsCommunityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(12, 0.3),
    marginBottom: scaleHeight(12),
  },
  needsCommunityText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#92400E',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(12, 0.3),
    marginBottom: scaleHeight(12),
  },
  errorBannerText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#B91C1C',
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingBottom: scaleHeight(16),
    gap: scaleHeight(12),
  },
  card: {
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
    backgroundColor: '#F2F2F8',
  },
  bannerFallback: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: moderateScale(12, 0.3) },
  cardHeaderRow: { flexDirection: 'row', gap: scaleWidth(10) },
  logo: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
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
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  categoryText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  offerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(3),
    marginTop: scaleHeight(6),
  },
  offerPillText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: '#047857',
  },
  offerInactiveText: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    marginTop: scaleHeight(6),
  },
  emptyWrap: {
    padding: scaleHeight(40),
    alignItems: 'center',
    gap: scaleHeight(12),
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },
});

export default AllLocalBusinessesScreen;