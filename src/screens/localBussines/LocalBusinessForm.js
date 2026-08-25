// screens/secretary/LocalBusinessForm.jsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomQuillEditor from '../../components/CustomQuillEditor';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const BOTTOM_TAB_HEIGHT = moderateScale(70, 0.3);

const formatDate = (value) => {
  if (!value) return 'Select date';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'Select date';
  return d.toLocaleDateString();
};

const Field = React.memo(({ label, children, error }) => (
  <View style={styles.field}>
    <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{label}</Text>
    {children}
    {error ? (
      <Text style={styles.fieldError} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{error}</Text>
    ) : null}
  </View>
));

const ImagePickerBox = React.memo(({ label, uri, onPick, height = 90 }) => (
  <TouchableOpacity style={[styles.imageBox, { height }]} onPress={onPick} activeOpacity={0.8}>
    {uri ? (
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <View style={styles.imageBoxPlaceholder}>
        <Ionicons name="image-outline" size={scaleFont(22)} color={COLORS.textSecondary} />
        <Text style={styles.imageBoxLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>{label}</Text>
      </View>
    )}
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.imageEditBadge}>
      <Ionicons name="camera" size={scaleFont(14)} color={COLORS.white} />
    </LinearGradient>
  </TouchableOpacity>
));

const MultiChip = React.memo(({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.multiChip, selected && styles.multiChipActive]}
    onPress={onPress}
    activeOpacity={0.8}>
    {selected ? (
      <Ionicons name="checkmark" size={scaleFont(13)} color={COLORS.white} style={{ marginRight: scaleWidth(4) }} />
    ) : null}
    <Text
      style={[styles.multiChipText, selected && styles.multiChipTextActive]}
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
  </TouchableOpacity>
));

const ChoiceButton = React.memo(({ label, selected, tone = 'default', onPress }) => (
  <TouchableOpacity
    style={[
      styles.choiceBtn,
      selected && tone === 'positive' && styles.choiceBtnPositive,
      selected && tone === 'negative' && styles.choiceBtnNegative,
    ]}
    onPress={onPress}
    activeOpacity={0.85}>
    <Text
      style={[
        styles.choiceBtnText,
        selected && tone === 'positive' && styles.choiceBtnTextPositive,
        selected && tone === 'negative' && styles.choiceBtnTextNegative,
      ]}
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
      {label}
    </Text>
  </TouchableOpacity>
));

const LocalBusinessForm = ({
  value,
  onChange,
  categories = [],
  errors = {},
  submitting = false,
  onSubmit,
  submitLabel = 'Save',
}) => {
  const insets = useSafeAreaInsets();
  const [datePickerField, setDatePickerField] = useState(null);

  const set = useCallback(
    (key, val) => onChange({ ...value, [key]: val }),
    [value, onChange]
  );

  const selectedCategoryDefs = useMemo(
    () => categories.filter((c) => (value.businessCategories || []).includes(c.name)),
    [categories, value.businessCategories]
  );

  const availableSubServices = useMemo(() => {
    const set = new Set();
    selectedCategoryDefs.forEach((c) => (c.subCategories || []).forEach((s) => set.add(s)));
    return Array.from(set);
  }, [selectedCategoryDefs]);

  const selectCategory = useCallback(
    (name) => {
      const isSelected = (value.businessCategories || [])[0] === name;
      const next = isSelected ? [] : [name];

      const nextAllowed = new Set(
        categories
          .filter((c) => next.includes(c.name))
          .flatMap((c) => c.subCategories || [])
      );
      onChange({
        ...value,
        businessCategories: next,
        discountedCategories: (value.discountedCategories || []).filter((s) => nextAllowed.has(s)),
        nonDiscountedCategories: (value.nonDiscountedCategories || []).filter((s) => nextAllowed.has(s)),
      });
    },
    [value, onChange, categories]
  );

  const toggleSubService = useCallback(
    (name, listKey, otherKey) => {
      const current = value[listKey] || [];
      const otherList = value[otherKey] || [];
      const isSelected = current.includes(name);
      onChange({
        ...value,
        [listKey]: isSelected ? current.filter((s) => s !== name) : [...current, name],
        [otherKey]: otherList.filter((s) => s !== name),
      });
    },
    [value, onChange]
  );

  const setHasDiscount = useCallback(
    (next) => {
      if (next === false) {
        onChange({
          ...value,
          hasDiscount: false,
          discountPercentage: '',
          discountedCategories: [],
          nonDiscountedCategories: [],
          discountStartDate: null,
          discountEndDate: null,
        });
      } else {
        onChange({ ...value, hasDiscount: true });
      }
    },
    [value, onChange]
  );

  const pickImage = useCallback(
    (key) => {
      launchImageLibrary(
        { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
        (response) => {
          if (response.didCancel || response.errorCode) return;
          const asset = response.assets?.[0];
          if (!asset?.uri) return;
          set(key, {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            fileName: asset.fileName || `${key}_${Date.now()}.jpg`,
          });
        }
      );
    },
    [set]
  );

  const onDateChange = useCallback(
    (event, selectedDate) => {
      const field = datePickerField;
      setDatePickerField(Platform.OS === 'ios' ? datePickerField : null);
      if (event.type === 'dismissed' || !selectedDate || !field) return;
      set(field, selectedDate.toISOString());
      if (Platform.OS === 'ios') setDatePickerField(null);
    },
    [datePickerField, set]
  );

  // ── Dynamic bottom padding ──
  const bottomPadding = insets.bottom + BOTTOM_TAB_HEIGHT + scaleHeight(16);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.imagesRow}>
        <ImagePickerBox
          label="Logo"
          uri={value.logo?.uri || value.logoUrl}
          onPick={() => pickImage('logo')}
        />
        <View style={{ width: scaleWidth(10) }} />
        <ImagePickerBox
          label="Banner"
          uri={value.banner?.uri || value.bannerUrl}
          onPick={() => pickImage('banner')}
        />
      </View>

      <Field label="Business name" error={errors.businessName}>
        <TextInput
          style={styles.input}
          value={value.businessName}
          onChangeText={(t) => set('businessName', t)}
          placeholder="e.g. Sunrise Salon"
          placeholderTextColor={COLORS.textMuted}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
      </Field>

      {/* ─── Rich Text Description ─── */}
      <Field label="Description" error={errors.description}>
        <CustomQuillEditor
          value={value.description}
          onChange={(html) => set('description', html)}
          error={!!errors.description}
        />
      </Field>

      <View style={styles.row2}>
        <View style={styles.col}>
          <Field label="Owner name" error={errors.ownerName}>
            <TextInput
              style={styles.input}
              value={value.ownerName}
              onChangeText={(t) => set('ownerName', t)}
              placeholder="Owner name"
              placeholderTextColor={COLORS.textMuted}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
          </Field>
        </View>
        <View style={styles.col}>
          <Field label="Contact number" error={errors.contactNumber}>
            <TextInput
              style={styles.input}
              value={value.contactNumber}
              onChangeText={(t) => set('contactNumber', t)}
              placeholder="Phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
          </Field>
        </View>
      </View>

      <Field label="Email (optional)" error={errors.email}>
        <TextInput
          style={styles.input}
          value={value.email}
          onChangeText={(t) => set('email', t)}
          placeholder="business@email.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
      </Field>

      <Field label="Address" error={errors.address}>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={value.address}
          onChangeText={(t) => set('address', t)}
          placeholder="Full address"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
      </Field>

      <Field label="Website (optional)" error={errors.website}>
        <TextInput
          style={styles.input}
          value={value.website}
          onChangeText={(t) => set('website', t)}
          placeholder="https://example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="url"
          autoCapitalize="none"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        />
      </Field>

      {/* ─── Status selector ─── */}
      <Field label="Status" error={errors.status}>
        <View style={styles.choiceRow}>
          <ChoiceButton
            label="Active"
            tone="positive"
            selected={value.status === 'active'}
            onPress={() => set('status', 'active')}
          />
          <ChoiceButton
            label="Inactive"
            tone="negative"
            selected={value.status === 'inactive'}
            onPress={() => set('status', 'inactive')}
          />
        </View>
      </Field>

      <Field label="Business category" error={errors.businessCategories}>
        <View style={styles.chipsWrap}>
          {categories.map((c) => (
            <MultiChip
              key={c.name}
              label={c.name}
              selected={(value.businessCategories || [])[0] === c.name}
              onPress={() => selectCategory(c.name)}
            />
          ))}
        </View>
      </Field>

      <Field label="Does this business offer a discount?" error={errors.hasDiscount}>
        <View style={styles.choiceRow}>
          <ChoiceButton
            label="Yes"
            tone="positive"
            selected={value.hasDiscount === true}
            onPress={() => setHasDiscount(true)}
          />
          <ChoiceButton
            label="No"
            tone="negative"
            selected={value.hasDiscount === false}
            onPress={() => setHasDiscount(false)}
          />
        </View>
      </Field>

      {value.hasDiscount === true ? (
        <>
          <Field label="Discount percentage" error={errors.discountPercentage}>
            <TextInput
              style={styles.input}
              value={value.discountPercentage != null ? String(value.discountPercentage) : ''}
              onChangeText={(t) => set('discountPercentage', t.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 15"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
          </Field>

          <View style={styles.row2}>
            <View style={styles.col}>
              <Field label="Discount start date" error={errors.discountStartDate}>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setDatePickerField('discountStartDate')}
                  activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                  <Text style={styles.dateInputText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {formatDate(value.discountStartDate)}
                  </Text>
                </TouchableOpacity>
              </Field>
            </View>
            <View style={styles.col}>
              <Field label="Discount end date" error={errors.discountEndDate}>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setDatePickerField('discountEndDate')}
                  activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={scaleFont(16)} color={COLORS.textSecondary} />
                  <Text style={styles.dateInputText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {formatDate(value.discountEndDate)}
                  </Text>
                </TouchableOpacity>
              </Field>
            </View>
          </View>

          {datePickerField ? (
            <DateTimePicker
              value={value[datePickerField] ? new Date(value[datePickerField]) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
            />
          ) : null}

          {availableSubServices.length > 0 ? (
            <>
              <Field label="Discounted services">
                <View style={styles.chipsWrap}>
                  {availableSubServices.map((s) => (
                    <MultiChip
                      key={`disc-${s}`}
                      label={s}
                      selected={(value.discountedCategories || []).includes(s)}
                      onPress={() => toggleSubService(s, 'discountedCategories', 'nonDiscountedCategories')}
                    />
                  ))}
                </View>
              </Field>

              <Field label="Non-discounted services">
                <View style={styles.chipsWrap}>
                  {availableSubServices.map((s) => (
                    <MultiChip
                      key={`nondisc-${s}`}
                      label={s}
                      selected={(value.nonDiscountedCategories || []).includes(s)}
                      onPress={() => toggleSubService(s, 'nonDiscountedCategories', 'discountedCategories')}
                    />
                  ))}
                </View>
              </Field>
            </>
          ) : (
            <Text style={styles.helperText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Select a business category to configure discounted services.
            </Text>
          )}
        </>
      ) : value.hasDiscount === false ? (
        <Text style={styles.helperText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          No discount for this business. You can save the listing directly.
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={submitting}
        activeOpacity={0.85}
        style={styles.submitBtnWrap}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {submitLabel}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: {
    padding: scaleWidth(16),
    // paddingBottom is now dynamic
  },
  imagesRow: { flexDirection: 'row', marginBottom: scaleHeight(16) },
  imageBox: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.textPrimary,
  },
  imageBoxPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scaleHeight(4) },
  imageBoxLabel: { fontSize: scaleFont(11), color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  imageEditBadge: {
    position: 'absolute',
    right: scaleWidth(6),
    bottom: scaleHeight(6),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    width: moderateScale(22, 0.3),
    height: moderateScale(22, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { marginBottom: scaleHeight(14) },
  label: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(6),
  },
  input: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.textPrimary,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: { textAlignVertical: 'top', minHeight: moderateScale(70, 0.3) },
  fieldError: { fontSize: scaleFont(11), color: COLORS.error, marginTop: scaleHeight(4) },
  helperText: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(14),
  },
  row2: { flexDirection: 'row', gap: scaleWidth(10) },
  col: { flex: 1 },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.textPrimary,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    backgroundColor: COLORS.white,
  },
  dateInputText: { fontSize: scaleFont(13), color: COLORS.textPrimary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleWidth(8) },
  multiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(7),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    backgroundColor: COLORS.inputBg,
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  multiChipActive: { backgroundColor: COLORS.gradientStart, borderColor: COLORS.gradientStart },
  multiChipText: { fontSize: scaleFont(12), fontWeight: FONTS.weightSemiBold, color: COLORS.textSecondary },
  multiChipTextActive: { color: COLORS.white },
  choiceRow: { flexDirection: 'row', gap: scaleWidth(10) },
  choiceBtn: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  choiceBtnPositive: { borderColor: COLORS.success, backgroundColor: '#ECFDF5' },
  choiceBtnNegative: { borderColor: COLORS.error, backgroundColor: '#FEF2F2' },
  choiceBtnText: { fontSize: scaleFont(14), fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary },
  choiceBtnTextPositive: { color: '#047857' },
  choiceBtnTextNegative: { color: COLORS.error },
  submitBtnWrap: {
    marginTop: scaleHeight(16),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    ...SHADOW.button,
  },
  submitBtn: {
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.white, fontWeight: FONTS.weightBold, fontSize: scaleFont(15) },
});

export default LocalBusinessForm;