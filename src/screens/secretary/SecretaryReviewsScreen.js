// screens/secretary/SecretaryReviewsScreen.jsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchSecretaryReviewsQuery,
  useUpdateSecretaryReviewMutation,
  useDeleteSecretaryReviewMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const PAGE_SIZE = 10;

const getFullName = (user) => {
  if (!user) return '';
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.name || '';
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) || '' : '';
  if (first && last) return `${first}${last}`.toUpperCase();
  return (first || '?').toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return '';
  }
};

const Avatar = ({ user, size = 36 }) => {
  const [error, setError] = useState(false);
  const uri = user?.profileImage;
  const dim = { width: moderateScale(size, 0.3), height: moderateScale(size, 0.3), borderRadius: moderateScale(size / 2, 0.3) };

  if (uri && !error) {
    return <Image source={{ uri }} style={[styles.avatarImg, dim]} onError={() => setError(true)} />;
  }
  return (
    <View style={[styles.avatarFallback, dim]}>
      <Text style={[styles.avatarInitials, { fontSize: scaleFont(size * 0.38) }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
        {getInitials(getFullName(user))}
      </Text>
    </View>
  );
};

const StarDisplay = ({ rating, size = 12 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Icon
        key={star}
        name="star"
        size={scaleFont(size)}
        color={star <= rating ? '#F59E0B' : COLORS.border}
      />
    ))}
  </View>
);

// ─── Edit Review Modal (Centered) ──────────────────────────────────────
const EditReviewModal = ({ visible, review, onClose, onSave, isSaving }) => {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (review) {
      setComment(review.comment || '');
      setRating(review.rating || 5);
    }
  }, [review]);

  const handleSave = () => {
    const trimmed = comment.trim();
    if (!trimmed) {
      Alert.alert('Missing info', 'Please write a comment.');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      Alert.alert('Missing info', 'Please select a rating (1-5 stars).');
      return;
    }
    onSave(review._id, trimmed, rating);
  };

  if (!review) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalCenteredSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Review</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={scaleFont(24)} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Rating</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                    <Icon
                      name="star"
                      size={scaleFont(28)}
                      color={star <= rating ? '#F59E0B' : COLORS.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: scaleHeight(16) }]}>Comment</Text>
              <TextInput
                style={styles.modalTextArea}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                placeholder="Write the updated review..."
                placeholderTextColor={COLORS.textMuted}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveGradient}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.modalSaveText}>Save</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────
const SecretaryReviewsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [allReviews, setAllReviews] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // ── Selected review for editing ──
  const [editingReview, setEditingReview] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // ── Query ──
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchSecretaryReviewsQuery({ page, limit: PAGE_SIZE, search }, {
    skip: !isOnline,
  });

  const [updateReview, { isLoading: isUpdating }] = useUpdateSecretaryReviewMutation();
  const [deleteReview, { isLoading: isDeleting }] = useDeleteSecretaryReviewMutation();

  // ── Merge reviews for infinite scroll (de‑duplicate) ──
  useEffect(() => {
    if (data) {
      const newReviews = data.reviews || [];
      if (page === 1) {
        setAllReviews(newReviews);
      } else {
        setAllReviews((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const uniqueNewItems = newReviews.filter((item) => !existingIds.has(item._id));
          return [...prev, ...uniqueNewItems];
        });
      }
      setHasMore(data.pagination?.hasNextPage || false);
    }
  }, [data, page]);

  // ── Search debounce ──
  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  // ── Refresh ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    setPage(1);
    refetch();
  }, [refetch, isOnline]);

  // ── Load more ──
  const loadMore = useCallback(() => {
    if (!isOnline || isFetching || !hasMore) return;
    setPage((p) => p + 1);
  }, [isOnline, isFetching, hasMore]);

  // ── Edit review ──
  const handleEdit = (review) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to edit reviews.');
      return;
    }
    setEditingReview(review);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (commentId, comment, rating) => {
    try {
      await updateReview({ commentId, comment, rating }).unwrap();
      setEditModalVisible(false);
      setEditingReview(null);
      onRefresh();
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to update review.');
    }
  };

  // ── Delete review ──
  const handleDelete = (review) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to delete reviews.');
      return;
    }
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReview(review._id).unwrap();
              onRefresh();
            } catch (err) {
              Alert.alert('Error', err?.data?.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  // ── Render item ──
  const renderItem = useCallback(({ item }) => {
    const reviewer = item.customer;
    const serviceName = item.serviceOffering?.servicename || 'Deleted service';
    const providerName = item.serviceOffering?.provider?.user
      ? getFullName(item.serviceOffering.provider.user)
      : 'Unknown provider';

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Avatar user={reviewer} size={36} />
          <View style={styles.reviewMeta}>
            <Text style={styles.reviewUserName} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {getFullName(reviewer) || 'User'}
            </Text>
            <View style={styles.reviewSubRow}>
              <StarDisplay rating={item.rating || 0} size={12} />
              <Text style={styles.reviewDate} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.reviewComment} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {item.comment}
        </Text>

        <View style={styles.serviceInfo}>
          <Text style={styles.serviceLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Service: <Text style={styles.serviceName}>{serviceName}</Text>
          </Text>
          <Text style={styles.providerLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Provider: <Text style={styles.providerName}>{providerName}</Text>
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
            disabled={!isOnline}>
            <Icon name="pencil-outline" size={scaleFont(16)} color={isOnline ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.actionBtnText, !isOnline && { color: COLORS.textMuted }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
            disabled={!isOnline}>
            <Icon name="trash-outline" size={scaleFont(16)} color={isOnline ? '#EF4444' : COLORS.textMuted} />
            <Text style={[styles.actionBtnText, !isOnline && { color: COLORS.textMuted }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isOnline, handleEdit, handleDelete]);

  // ── Loading state ──
  if (isLoading && page === 1 && allReviews.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Reviews
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (isError && page === 1 && allReviews.length === 0) {
    const msg = error?.data?.message || 'Unable to load reviews.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Reviews
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{msg}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Reviews
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={!isOnline}
        message="You are offline. Reviews are still available."
      >
        <View style={styles.searchWrap}>
          <Icon name="search-outline" size={scaleFont(20)} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by reviewer, service, or comment..."
            placeholderTextColor={COLORS.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
            editable={isOnline}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          />
          {searchInput !== '' && (
            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={scaleFont(20)} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={allReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + moderateScale(20, 0.3) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1 && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoading && allReviews.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="chatbubbles-outline" size={scaleFont(48)} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No reviews found.</Text>
                {searchInput !== '' && (
                  <TouchableOpacity onPress={() => setSearchInput('')}>
                    <Text style={styles.clearSearchText}>Clear search</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              </View>
            ) : null
          }
        />
      </NetworkAwareView>

      <EditReviewModal
        visible={editModalVisible}
        review={editingReview}
        onClose={() => {
          setEditModalVisible(false);
          setEditingReview(null);
        }}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
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
  backButton: { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(24) },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    marginHorizontal: scaleWidth(20),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(12),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(10) : scaleHeight(6),
  },
  searchIcon: { marginRight: scaleWidth(8) },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: COLORS.textPrimary,
    paddingVertical: scaleHeight(4),
  },
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(4),
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(12),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(6, 0.3),
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
  },
  reviewMeta: { flex: 1 },
  reviewUserName: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  reviewSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    marginTop: scaleHeight(2),
  },
  reviewDate: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },
  reviewComment: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginTop: scaleHeight(8),
  },
  serviceInfo: {
    marginTop: scaleHeight(10),
    paddingTop: scaleHeight(8),
    borderTopWidth: moderateScale(1, 0.3),
    borderTopColor: COLORS.border,
  },
  serviceLabel: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  serviceName: {
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  providerLabel: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
    marginTop: scaleHeight(2),
  },
  providerName: {
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scaleWidth(8),
    marginTop: scaleHeight(10),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
  },
  editBtn: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  deleteBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: scaleHeight(60),
    gap: scaleHeight(12),
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: COLORS.textMuted,
    fontWeight: FONTS.weightMedium,
  },
  clearSearchText: {
    fontSize: scaleFont(14),
    color: COLORS.gradientStart,
    fontWeight: FONTS.weightBold,
  },
  footerLoader: {
    paddingVertical: scaleHeight(16),
    alignItems: 'center',
  },
  avatarImg: { backgroundColor: COLORS.border },
  avatarFallback: {
    backgroundColor: COLORS.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
  },
  starRow: {
    flexDirection: 'row',
    gap: moderateScale(4, 0.3),
  },

  // ── Modal styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCenteredSheet: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleHeight(20),
    width: '85%',
    maxWidth: scaleWidth(400),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleHeight(16),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  modalBody: {
    paddingTop: scaleHeight(16),
  },
  modalLabel: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
    marginBottom: scaleHeight(8),
  },
  modalTextArea: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    backgroundColor: COLORS.white,
    minHeight: moderateScale(80, 0.3),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scaleWidth(10),
    marginTop: scaleHeight(20),
  },
  modalCancelBtn: {
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    minWidth: moderateScale(80, 0.3),
  },
  modalSaveGradient: {
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default SecretaryReviewsScreen;