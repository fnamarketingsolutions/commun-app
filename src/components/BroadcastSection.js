import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCommunityBroadcastsQuery } from '../redux/service/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import GradientText from './common/GradientText';
import { ROUTES } from '../navigations/routes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const BroadcastSection = () => {
  const navigation = useNavigation();

  // ── Always fetch fresh + re‑fetch every 60s to catch new secretary broadcasts ──
  const { data, isLoading } = useCommunityBroadcastsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 60000,
  });

  // ── Modal state ──
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);

  const broadcasts = data?.data?.broadcasts || [];
  const meta = data?.data || {};
  const hasCommunity = meta.hasCommunity;
  const broadcastEnabled = meta.broadcastEnabled;

  const displayBroadcasts = broadcasts.slice(0, 5);

  const handleSeeAll = () => {
    navigation.navigate(ROUTES.PROVIDER_BROADCAST);
  };

  const handleCardPress = (item) => {
    setSelectedBroadcast(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBroadcast(null);
  };

  // ── Format date ──
  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.gradientStart} />
      </View>
    );
  }

  // No community or broadcast disabled
  if (!hasCommunity || !broadcastEnabled || displayBroadcasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Broadcasts
        </Text>
        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <GradientText
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            style={styles.seeAll}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            See All
          </GradientText>
        </TouchableOpacity>
      </View>

      {displayBroadcasts.map((item) => (
        <TouchableOpacity
          key={item._id}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => handleCardPress(item)}
        >
          <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {item.title}
          </Text>
          <Text style={styles.cardMessage} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {item.message}
          </Text>
        </TouchableOpacity>
      ))}

      {/* ─── Broadcast Detail Modal ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {selectedBroadcast?.title || 'Broadcast'}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close" size={scaleFont(24)} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDate} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {formatDate(selectedBroadcast?.createdAt)}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.modalMessage} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {selectedBroadcast?.message || 'No content'}
              </Text>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(18),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(14),
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(10),
    ...SHADOW.card,
    shadowOpacity: 0.03,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 1,
  },
  cardTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  cardMessage: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
  },

  // ─── Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.xl, 0.3),
    padding: moderateScale(20, 0.3),
    maxHeight: '80%',
    width: '100%',
    ...SHADOW.card,
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16, 0.3),
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
  },
  modalTitle: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginRight: scaleWidth(12),
  },
  closeBtn: {
    padding: moderateScale(4),
  },
  modalDate: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginBottom: scaleHeight(14),
  },
  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
    marginBottom: scaleHeight(14),
  },
  modalMessage: {
    fontSize: scaleFont(15),
    lineHeight: moderateScale(22, 0.3),
    color: COLORS.textSecondary,
  },
});

export default BroadcastSection;