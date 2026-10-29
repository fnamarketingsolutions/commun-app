import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  markAllAsRead,
  markAsRead,
} from '../../redux/slices/notificationSlice';
import {
  useGetInboxNotificationsQuery,
  useGetInboxCountsQuery,
  useMarkNotificationReadMutation,
  useMarkInboxReadMutation,
} from '../../redux/service/api';
import { resolveNotificationRoute } from '../../utils/notificationNavigation';
import { COLORS, FONTS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'communities', label: 'Communities' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'events', label: 'Events' },
  { key: 'registration', label: 'Registration' },
  { key: 'announcements', label: 'Announcements' },
];

const categoryLabels = {
  approvals: 'Approvals',
  communities: 'Communities',
  broadcast: 'Broadcast',
  events: 'Events',
  registration: 'Registration',
  announcements: 'Announcement',
};

// ─── Time / Date helpers ──────────────────────────────────────────────────
function formatFullDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}, ${timeStr}`;
}

function getDateLabel(isoString) {
  if (!isoString) return 'Recent';
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

// ─── Notification Item ────────────────────────────────────────────────────
const NotificationItem = ({ item, onPress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryLabel = categoryLabels[item.category] || (item.category ? item.category.toUpperCase() : null);
  const bodyText = String(item.body || '').trim();
  const isLongText = bodyText.length > 85;

  return (
    <View style={styles.itemWrapper}>
      <TouchableOpacity
        style={[styles.itemCard, !item.isRead && styles.itemCardUnread]}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        {/* Header Row: Unread Dot + Title + Category Pill */}
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.unreadDot,
              !item.isRead ? styles.unreadDotActive : styles.unreadDotInactive,
            ]}
          />
          <Text
            style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {item.title}
          </Text>
          {categoryLabel ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText} maxFontSizeMultiplier={1}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Message Body with See More / See Less */}
        {bodyText ? (
          <View style={styles.bodyWrap}>
            <Text
              style={styles.itemBody}
              numberOfLines={isExpanded ? undefined : 2}
              maxFontSizeMultiplier={1.3}
            >
              {bodyText}
            </Text>
            {isLongText && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  setIsExpanded((prev) => !prev);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.seeMoreBtn}
              >
                <Text style={styles.seeMoreText}>
                  {isExpanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Footer Row: Timestamp + Action Chevron */}
        <View style={styles.cardFooterRow}>
          <Text style={styles.itemTime} maxFontSizeMultiplier={1.3}>
            {formatFullDate(item.receivedAt)}
          </Text>

          {item.destination ? (
            <View style={styles.actionChip}>
              <Text style={styles.actionChipText}>Open</Text>
              <Icon name="arrow-forward" size={scaleFont(12)} color={COLORS.gradientStart} />
            </View>
          ) : null}
        </View>
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
const EmptyState = ({ searchQuery, selectedCategory }) => (
  <View style={styles.emptyWrap}>
    <Icon name="notifications-off-outline" size={moderateScale(56, 0.3)} color={COLORS.textMuted} />
    <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.3}>
      {searchQuery ? 'No matching notifications' : "You're all caught up!"}
    </Text>
    <Text style={styles.emptySubtitle} maxFontSizeMultiplier={1.3}>
      {searchQuery
        ? 'Try a different keyword.'
        : selectedCategory
        ? `No ${categoryLabels[selectedCategory] || selectedCategory} notifications found.`
        : 'New announcements and community updates will appear here.'}
    </Text>
  </View>
);

// ─── Detail Modal (Fallback when item has no route) ───────────────────────
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
            {item.category ? (
              <View style={[styles.categoryPill, { alignSelf: 'flex-start', marginBottom: scaleHeight(8) }]}>
                <Text style={styles.categoryPillText}>{categoryLabels[item.category] || item.category}</Text>
              </View>
            ) : null}
            <Text style={styles.modalBody} maxFontSizeMultiplier={1.3}>
              {item.body || 'No additional details.'}
            </Text>
            <Text style={styles.modalTime} maxFontSizeMultiplier={1.3}>
              {formatFullDate(item.receivedAt)}
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
  const { width } = useWindowDimensions();

  // Redux local fallback items
  const localNotifications = useSelector((state) => state.notifications.items);

  // Category state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [serverItems, setServerItems] = useState([]);

  // Server API Queries & Mutations
  const {
    data: inboxData,
    isLoading,
    isFetching,
    refetch,
  } = useGetInboxNotificationsQuery({ page, limit: 20, category: selectedCategory });

  const { data: countsData } = useGetInboxCountsQuery();
  const [markNotificationReadMutation] = useMarkNotificationReadMutation();
  const [markInboxReadMutation] = useMarkInboxReadMutation();

  const unreadCounts = countsData?.data?.counts || {};
  const hasNextPage = Boolean(inboxData?.data?.pagination?.hasNextPage);

  // Sync server notifications into accumulated list
  useEffect(() => {
    if (inboxData?.data?.notifications) {
      const formatted = inboxData.data.notifications.map((item) => ({
        id: item._id,
        _id: item._id,
        title: item.title,
        body: item.message,
        category: item.category,
        destination: item.destination,
        isRead: Boolean(item.readAt),
        receivedAt: item.createdAt,
      }));

      setServerItems((prev) => {
        if (page === 1) return formatted;
        const existingIds = new Set(prev.map((n) => n.id));
        const newOnes = formatted.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newOnes];
      });
    }
  }, [inboxData, page]);

  // Combined notifications (Server + local Redux)
  const combinedNotifications = useMemo(() => {
    if (serverItems.length > 0) {
      return serverItems;
    }
    if (selectedCategory) {
      return localNotifications.filter((n) => n.category === selectedCategory);
    }
    return localNotifications;
  }, [serverItems, localNotifications, selectedCategory]);

  // Filter by search
  const filtered = useMemo(() => {
    let result = combinedNotifications;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.body?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [combinedNotifications, searchQuery]);

  // Group by date
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const sections = useMemo(() => {
    return Object.keys(grouped).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [grouped]);

  // Handlers
  const handleCategorySelect = (key) => {
    if (key === selectedCategory) return;
    setSelectedCategory(key);
    setPage(1);
    setServerItems([]);
  };

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [hasNextPage, isFetching]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markInboxReadMutation(selectedCategory || undefined).unwrap();
    } catch (_) {}
    dispatch(markAllAsRead());
    setServerItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }, [markInboxReadMutation, selectedCategory, dispatch]);

  const handleItemPress = useCallback(async (item) => {
    // 1. Mark as read on server & local Redux
    if (!item.isRead) {
      try {
        if (item._id) {
          await markNotificationReadMutation(item._id).unwrap();
        }
      } catch (_) {}
      dispatch(markAsRead(item.id));
      setServerItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    // 2. Resolve destination route
    const route = resolveNotificationRoute(item);
    if (route && route.routeName) {
      navigation.navigate(route.routeName, route.params);
    } else {
      setSelectedNotification(item);
      setModalVisible(true);
    }
  }, [markNotificationReadMutation, dispatch, navigation]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedNotification(null);
  }, []);

  const renderSection = useCallback(({ item }) => {
    const { title, data } = item;
    if (!title || !data || data.length === 0) return null;
    return (
      <View>
        <SectionHeader title={title} />
        {data.map((notif) => (
          <NotificationItem
            key={notif.id}
            item={notif}
            onPress={handleItemPress}
          />
        ))}
      </View>
    );
  }, [handleItemPress]);

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

        <TouchableOpacity style={styles.clearBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
          <Text style={styles.clearBtnText} maxFontSizeMultiplier={1.3}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const count = cat.key ? unreadCounts[cat.key] || 0 : 0;
            return (
              <TouchableOpacity
                key={cat.key || 'all'}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => handleCategorySelect(cat.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                  maxFontSizeMultiplier={1.2}
                >
                  {cat.label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.chipBadge, isSelected && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextActive]}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.gradientStart} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : (
            <EmptyState searchQuery={searchQuery} selectedCategory={selectedCategory} />
          )
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={handleRefresh}
            colors={[COLORS.gradientStart]}
            tintColor={COLORS.gradientStart}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetching && page > 1 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.gradientStart} />
            </View>
          ) : null
        }
      />

      {/* Modal */}
      <NotificationModal visible={modalVisible} item={selectedNotification} onClose={closeModal} />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    alignItems: 'flex-end',
  },
  clearBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },

  categoriesWrapper: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  categoriesContent: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    gap: scaleWidth(8),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(20, 0.3),
    backgroundColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: COLORS.gradientStart,
  },
  categoryChipText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
  },
  chipBadge: {
    backgroundColor: COLORS.gradientStart,
    borderRadius: moderateScale(10, 0.3),
    paddingHorizontal: scaleWidth(5),
    paddingVertical: scaleHeight(1),
    marginLeft: scaleWidth(6),
  },
  chipBadgeActive: {
    backgroundColor: COLORS.white,
  },
  chipBadgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  chipBadgeTextActive: {
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
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    paddingVertical: scaleHeight(4),
  },

  listContent: {
    paddingHorizontal: scaleWidth(12),
    paddingTop: scaleHeight(8),
    paddingBottom: scaleHeight(32),
  },
  emptyContainer: {
    flex: 1,
  },

  sectionHeader: {
    paddingHorizontal: scaleWidth(4),
    paddingVertical: scaleHeight(8),
    marginTop: scaleHeight(4),
  },
  sectionHeaderText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: moderateScale(0.3, 0.1),
  },

  itemWrapper: {
    marginBottom: scaleHeight(10),
  },

  // ── Card Design matching Web Screenshot ──
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.card,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardUnread: {
    backgroundColor: '#FAF5FF', // Subtle light purple tint
    borderColor: '#E9D5FF',     // Purple 200 border
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(6),
  },
  unreadDot: {
    width: moderateScale(8, 0.3),
    height: moderateScale(8, 0.3),
    borderRadius: moderateScale(4, 0.3),
    marginRight: scaleWidth(8),
  },
  unreadDotActive: {
    backgroundColor: COLORS.gradientStart,
  },
  unreadDotInactive: {
    backgroundColor: 'transparent',
  },
  itemTitle: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(8),
  },
  itemTitleUnread: {
    fontWeight: FONTS.weightBold,
  },

  categoryPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: scaleWidth(7),
    paddingVertical: scaleHeight(2),
    borderRadius: moderateScale(6, 0.3),
  },
  categoryPillText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
    textTransform: 'uppercase',
  },

  bodyWrap: {
    marginBottom: scaleHeight(6),
    paddingLeft: scaleWidth(16),
  },
  itemBody: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightRegular,
    color: '#4B5563', // Slate 600
    lineHeight: scaleFont(19),
  },
  seeMoreBtn: {
    marginTop: scaleHeight(4),
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },

  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: scaleWidth(16),
    marginTop: scaleHeight(4),
  },
  itemTime: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(3),
  },
  actionChipText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scaleHeight(100),
    gap: scaleHeight(10),
    paddingHorizontal: scaleWidth(24),
  },
  emptyTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: scaleFont(19),
  },

  loadingWrap: {
    paddingTop: scaleHeight(80),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleHeight(12),
  },
  loadingText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },
  footerLoader: {
    paddingVertical: scaleHeight(16),
    alignItems: 'center',
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
    padding: moderateScale(22, 0.3),
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
    marginBottom: scaleHeight(10),
  },
  modalTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scaleWidth(12),
  },
  modalCloseBtn: {
    padding: moderateScale(4, 0.3),
  },
  modalBody: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(12),
  },
  modalTime: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    textAlign: 'right',
  },
});

export default NotificationScreen;
