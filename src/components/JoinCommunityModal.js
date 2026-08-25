// components/JoinCommunityModal.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import {
  useSignupCommunitiesQuery,
  useJoinCommunityMutation,
} from '../redux/service/api';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

export const JoinCommunityModal = ({ visible, onClose, onSuccess, isOnline }) => {
  const [selectedCommunName, setSelectedCommunName] = useState('');
  const { data: communitiesData, isLoading: communitiesLoading } = useSignupCommunitiesQuery();
  const communities = communitiesData?.data?.communities || [];
  const [joinCommunity, { isLoading: isJoining }] = useJoinCommunityMutation();

  useEffect(() => {
    if (visible) setSelectedCommunName('');
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect and try again.');
      return;
    }
    if (!selectedCommunName) {
      Alert.alert('Select Community', 'Please select a community to join.');
      return;
    }
    try {
      const result = await joinCommunity({ communityCommunName: selectedCommunName }).unwrap();
      Alert.alert(
        'Request Submitted',
        result?.message || 'Your join request has been sent to the secretary for approval.',
        [{ text: 'OK', onPress: onSuccess }],
      );
      onClose();
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Could not submit request. Please try again.');
    }
  }, [selectedCommunName, joinCommunity, isOnline, onClose, onSuccess]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Join a Community
              </Text>
              <Text style={styles.modalSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Select a community. A secretary will review your request.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.modalCloseBtn}>
              <Icon name="close" size={scaleFont(20)} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.communityList} showsVerticalScrollIndicator={false}>
            {communitiesLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.gradientStart} />
                <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Loading communities…
                </Text>
              </View>
            )}
            {!communitiesLoading && communities.length === 0 && (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No communities available.
                </Text>
              </View>
            )}
            {communities.map((item) => {
              const isSelected = item.communName === selectedCommunName;
              return (
                <TouchableOpacity
                  key={item.communName}
                  style={[styles.communityItem, isSelected && styles.communityItemSelected]}
                  onPress={() => setSelectedCommunName(item.communName)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.communityRadio, isSelected && styles.communityRadioSelected]}>
                    {isSelected && <View style={styles.communityRadioDot} />}
                  </View>
                  <Text
                    style={[styles.communityItemText, isSelected && styles.communityItemTextSelected]}
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Icon name="checkmark" size={scaleFont(16)} color={COLORS.gradientStart} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalCancelText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isJoining || !selectedCommunName || !isOnline}
              style={[styles.modalSubmitBtnWrap, (!selectedCommunName || !isOnline) && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalSubmitBtn}
              >
                {isJoining ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    Submit Request
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleWidth(20),
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(6) },
    shadowOpacity: 0.18,
    shadowRadius: moderateScale(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(20, 0.3),
    paddingBottom: moderateScale(12, 0.3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
    marginTop: scaleHeight(3),
    maxWidth: '90%',
  },
  modalCloseBtn: {
    padding: moderateScale(4),
  },
  communityList: {
    maxHeight: moderateScale(280),
    paddingHorizontal: moderateScale(16, 0.3),
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    padding: moderateScale(20, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12, 0.3),
    paddingVertical: scaleHeight(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  communityItemSelected: {
    backgroundColor: '#F5F3FF',
    marginHorizontal: -moderateScale(16, 0.3),
    paddingHorizontal: moderateScale(16, 0.3),
  },
  communityRadio: {
    width: moderateScale(18, 0.3),
    height: moderateScale(18, 0.3),
    borderRadius: moderateScale(9, 0.3),
    borderWidth: moderateScale(2, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  communityRadioSelected: {
    borderColor: COLORS.gradientStart,
  },
  communityRadioDot: {
    width: moderateScale(8, 0.3),
    height: moderateScale(8, 0.3),
    borderRadius: moderateScale(4, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  communityItemText: {
    flex: 1,
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightMedium,
  },
  communityItemTextSelected: {
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightSemiBold,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: moderateScale(10, 0.3),
    padding: moderateScale(16, 0.3),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(12, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  modalSubmitBtnWrap: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    overflow: 'hidden',
  },
  modalSubmitBtn: {
    paddingVertical: moderateScale(12, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default JoinCommunityModal;