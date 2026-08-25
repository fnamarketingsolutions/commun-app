import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  markAllAsRead,
  markAsRead,             // <-- NEW action
  removeNotification,
  clearAllNotifications,
} from '../../redux/slices/notificationSlice';
import { COLORS, FONTS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const { width } = Dimensions.get('window');

// ─── Time / Date helpers ──────────────────────────────────────────────────
function formatTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function getDateLabel(isoString) {
  if (!isoString) return 'Unknown';
  const now = new Date();
  const date = new Date(isoString);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Group notifications by date ──────────────────────────────────────────
function groupByDate(notifications) {
  const groups = {};
  notifications.forEach((item) => {
    const label = getDateLabel(item.receivedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return groups;
}

// ─── Custom Swipeable Notification Item ──────────────────────────────────
const SwipeableNotificationItem = ({ item, onPress, onRemove }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isSwiped, setIsSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = -80;
        if (gestureState.dx < threshold) {
          Animated.spring(pan, {
            toValue: { x: -80, y: 0 },
            useNativeDriver: false,
            bounciness: 5,
          }).start();
          setIsSwiped(true);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            bounciness: 10,
          }).start();
          setIsSwiped(false);
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(pan, {
      toValue: { x: -width, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      onRemove(item.id);
    });
  };

  const handlePress = () => {
    if (isSwiped) {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        bounciness: 10,
      }).start();
      setIsSwiped(false);
    } else {
      onPress(item);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[
          styles.itemWrapper,
          { transform: [{ translateX: pan.x }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.item, !item.isRead && styles.itemUnread]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.itemIconWrap}>
            <Icon name="notifications-outline" size={scaleFont(20)} color={COLORS.gradientStart} />
          </View>
          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {item.title}
            </Text>
            {item.body ? (
              <Text style={styles.itemBody} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                {item.body}
              </Text>
            ) : null}
            <Text style={styles.itemTime} maxFontSizeMultiplier={1.3}>
              {formatTime(item.receivedAt)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} activeOpacity={0.8}>
        <Icon name="trash-outline" size={scaleFont(22)} color={COLORS.white} />
        <Text style={styles.deleteActionText} maxFontSizeMultiplier={1.3}>
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Section header ──────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText} maxFontSizeMultiplier={1.3}>
      {title}
    </Text>
  </View>
);

// ─── Empty state ──────────────────────────────────────────────────────────
const EmptyState = ({ searchQuery }) => (
  <View style={styles.emptyWrap}>
    <Icon name="notifications-off-outline" size={moderateScale(56, 0.3)} color={COLORS.textMuted} />
    <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.3}>
      {searchQuery ? 'No matching notifications' : 'No notifications yet'}
    </Text>
    <Text style={styles.emptySubtitle} maxFontSizeMultiplier={1.3}>
      {searchQuery ? 'Try a different keyword' : "You're all caught up!"}
    </Text>
  </View>
);

// ─── Modal ────────────────────────────────────────────────────────────────
const NotificationModal = ({ visible, item, onClose }) => {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.3}>
              {item.title}
            </Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={scaleFont(24)} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalBody} maxFontSizeMultiplier={1.3}>
              {item.body || 'No additional details.'}
            </Text>
            <Text style={styles.modalTime} maxFontSizeMultiplier={1.3}>
              {formatTime(item.receivedAt)}
            </Text>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────
const NotificationScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.items);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Logging ──
  useEffect(() => {
  }, [notifications]);

  // ── We no longer mark all as read on focus ──
  // ── Instead, unread items stay bold until tapped ──

  // ── Filter by search ──
  const filtered = useMemo(() => {
    let result = notifications;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.body?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notifications, searchQuery]);

  // ── Group by date ──
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Handlers ──
  const handleRemove = useCallback((id) => {
    dispatch(removeNotification(id));
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    dispatch(clearAllNotifications());
  }, [dispatch]);

  // ── Mark as read and open modal ──
  const handleItemPress = useCallback((item) => {
    // Mark as read immediately
    if (!item.isRead) {
      dispatch(markAsRead(item.id));
    }
    setSelectedNotification(item);
    setModalVisible(true);
  }, [dispatch]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedNotification(null);
  }, []);

  // ── Render sections ──
  const renderSection = useCallback(({ item }) => {
    const { title, data } = item;
    if (!title || !data || data.length === 0) return null;
    return (
      <View>
        <SectionHeader title={title} />
        {data.map((notif) => (
          <SwipeableNotificationItem
            key={notif.id}
            item={notif}
            onPress={handleItemPress}
            onRemove={handleRemove}
          />
        ))}
      </View>
    );
  }, [handleItemPress, handleRemove]);

  const sections = useMemo(() => {
    return Object.keys(grouped).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [grouped]);

  // ── Render ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={scaleFont(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          Notifications
        </Text>

        {notifications.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
            <Text style={styles.clearBtnText} maxFontSizeMultiplier={1.3}>
              Clear all
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.clearBtnPlaceholder} />
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={scaleFont(18)} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          maxFontSizeMultiplier={1.3}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={scaleFont(18)} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.title}
        ListEmptyComponent={<EmptyState searchQuery={searchQuery} />}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal */}
      <NotificationModal visible={modalVisible} item={selectedNotification} onClose={closeModal} />
    </SafeAreaView>
  );
};

// ─── Styles (unchanged) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  backBtn: {
    width: moderateScale(36, 0.3),
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  clearBtn: {
    width: moderateScale(64, 0.3),
    alignItems: 'flex-end',
  },
  clearBtnPlaceholder: {
    width: moderateScale(64, 0.3),
  },
  clearBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  searchIcon: {
    marginRight: scaleWidth(8),
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    paddingVertical: scaleHeight(6),
  },

  listContent: {
    paddingBottom: scaleHeight(16),
  },
  emptyContainer: {
    flex: 1,
  },

  sectionHeader: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    backgroundColor: COLORS.white,
  },
  sectionHeaderText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: moderateScale(0.3, 0.1),
  },

  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  itemWrapper: {
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    backgroundColor: COLORS.white,
  },
  itemUnread: {
    backgroundColor: '#F5F3FF',
  },
  itemIconWrap: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
    marginTop: scaleHeight(2),
  },
  itemContent: {
    flex: 1,
    marginRight: scaleWidth(8),
  },
  itemTitle: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    marginBottom: scaleHeight(2),
  },
  itemTitleUnread: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightBold,
  },
  itemBody: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textMuted,
    lineHeight: scaleFont(19),
    marginBottom: scaleHeight(4),
  },
  itemTime: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },

  deleteAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: moderateScale(80, 0.3),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteActionText: {
    color: COLORS.white,
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    marginTop: scaleHeight(2),
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scaleHeight(120),
    gap: scaleHeight(12),
  },
  emptyTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20, 0.3),
    padding: moderateScale(24, 0.3),
    width: width * 0.9,
    maxHeight: '70%',
    ...SHADOW.card,
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(20, 0.3),
    elevation: 10,
  },
  modalHandle: {
    width: scaleWidth(40),
    height: moderateScale(4, 0.3),
    backgroundColor: COLORS.border,
    borderRadius: moderateScale(2, 0.3),
    alignSelf: 'center',
    marginBottom: scaleHeight(12),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(12),
  },
  modalCloseBtn: {
    padding: moderateScale(4, 0.3),
  },
  modalBody: {
    fontSize: scaleFont(15),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(22, 0.3),
    marginBottom: scaleHeight(12),
  },
  modalTime: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    textAlign: 'right',
  },
});

export default NotificationScreen;