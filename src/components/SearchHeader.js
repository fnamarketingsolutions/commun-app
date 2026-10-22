import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import analyticsService from '../services/AnalyticsService';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const SearchHeader = ({
  searchQuery,
  setSearchQuery,
  placeholder = 'Search...',
  showFilter = true,
  categories = [],
  selectedCategories = [],
  onCategoriesChange = () => {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [draftSelected, setDraftSelected] = useState(selectedCategories);

  const allItems = useMemo(() => {
    return [
      { id: '__all__', label: 'All' },
      ...categories,
    ];
  }, [categories]);

  const openModal = () => {
    setDraftSelected(selectedCategories);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const toggleDraft = (id) => {
    if (id === '__all__') {
      // Toggle "All": if currently selected, deselect all; else select All
      if (draftSelected.includes('__all__')) {
        setDraftSelected([]);
      } else {
        setDraftSelected(['__all__']);
      }
      return;
    }

    // If All is currently selected, replace with this category
    if (draftSelected.includes('__all__')) {
      setDraftSelected([id]);
      return;
    }

    // Otherwise toggle normally
    setDraftSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const applySelection = () => {
    onCategoriesChange(draftSelected);
    setModalVisible(false);
  };

  const clearSelection = () => {
    setDraftSelected([]);
    onCategoriesChange([]);
    setModalVisible(false);
  };

  const activeCount = selectedCategories.length;

  const isChecked = (id) => {
    if (id === '__all__') return draftSelected.includes('__all__');
    return draftSelected.includes(id);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={scaleFont(18)} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchQuery?.trim()) {
                analyticsService.logSearch({
                  searchString: searchQuery.trim(),
                  contentType: 'service_or_provider',
                });
              }
            }}
          />
          {searchQuery?.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {showFilter && (
          <TouchableOpacity style={styles.filterButtonWrap} onPress={openModal} activeOpacity={0.85}>
            {activeCount > 0 ? (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterButtonActive}
              >
                <Icon name="options-outline" size={scaleFont(18)} color={COLORS.white} />
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {activeCount}
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.filterButtonInactive}>
                <Icon name="options-outline" size={scaleFont(18)} color={COLORS.textPrimary} />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Filter by Category
                </Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close" size={scaleFont(22)} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={allItems}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const checked = isChecked(item.id);
                  return (
                    <TouchableOpacity style={styles.optionRow} onPress={() => toggleDraft(item.id)} activeOpacity={0.7}>
                      <Text style={styles.optionLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                        {item.label}
                      </Text>
                      {checked ? (
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.checkboxOn}
                        >
                          <Icon name="checkmark" size={scaleFont(14)} color={COLORS.white} />
                        </LinearGradient>
                      ) : (
                        <View style={styles.checkboxOff} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={clearSelection} activeOpacity={0.8}>
                  <Text style={styles.clearButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Clear
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={applySelection} activeOpacity={0.85} style={styles.applyButtonWrap}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      Apply {draftSelected.length > 0 ? `(${draftSelected.length})` : ''}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(12),
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    paddingHorizontal: scaleWidth(14),
    height: moderateScale(44, 0.3),
  },
  searchIcon: {
    marginRight: scaleWidth(8),
  },
  input: {
    flex: 1,
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    padding: 0,
  },
  filterButtonWrap: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
  },
  filterButtonActive: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(RADIUS.full, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.button,
    shadowOpacity: 0.15,
  },
  filterButtonInactive: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(RADIUS.full, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  countBadge: {
    position: 'absolute',
    top: -moderateScale(4, 0.3),
    right: -moderateScale(4, 0.3),
    minWidth: moderateScale(16, 0.3),
    height: moderateScale(16, 0.3),
    borderRadius: moderateScale(8, 0.3),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.gradientStart,
  },
  countBadgeText: {
    fontSize: scaleFont(9),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(24, 0.3),
    borderTopRightRadius: moderateScale(24, 0.3),
    maxHeight: '75%',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
  },
  modalTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  modalList: {
    maxHeight: scaleHeight(360),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(12),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  optionLabel: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  checkboxOn: {
    width: moderateScale(22, 0.3),
    height: moderateScale(22, 0.3),
    borderRadius: moderateScale(6, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOff: {
    width: moderateScale(22, 0.3),
    height: moderateScale(22, 0.3),
    borderRadius: moderateScale(6, 0.3),
    borderWidth: moderateScale(1.5, 0.3),
    borderColor: COLORS.border,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
    paddingVertical: scaleHeight(16),
  },
  clearButton: {
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(16),
  },
  clearButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  applyButtonWrap: {
    flex: 1,
  },
  applyButton: {
    borderRadius: moderateScale(RADIUS.full, 0.3),
    paddingVertical: scaleHeight(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default SearchHeader;