// src/components/AllReviewsModal.js

import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  useGetCommentsByServiceQuery,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddReplyMutation,
  useUpdateReplyMutation,
  useDeleteReplyMutation,
} from '../redux/service/commentApi';
import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

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

const getReplyUser = (comment) => {
  if (typeof comment.replyBy === 'object' && comment.replyBy?.user) {
    return typeof comment.replyBy.user === 'object' ? comment.replyBy.user : null;
  }
  return null;
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

const StarPicker = ({ value, onSelect, size = 22, disabled = false }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => !disabled && onSelect(star === value ? 0 : star)}
        disabled={disabled}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        activeOpacity={0.7}>
        <Icon
          name={star <= value ? 'star' : 'star-outline'}
          size={size}
          color={star <= value ? '#F59E0B' : COLORS.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const StarDisplay = ({ rating, size = 12 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Icon
        key={star}
        name="star"
        size={size}
        color={star <= rating ? '#F59E0B' : COLORS.border}
      />
    ))}
  </View>
);

const Avatar = ({ user, size = 32 }) => {
  const [error, setError] = useState(false);
  const uri = user?.profileImage;
  const dim = {
    width: moderateScale(size, 0.3),
    height: moderateScale(size, 0.3),
    borderRadius: moderateScale(size / 2, 0.3),
  };

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

const AllReviewsModal = ({ visible, serviceId, onClose }) => {
  const user = useSelector((s) => s.auth?.user);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingRating, setEditingRating] = useState(0);

  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  const {
    data: commentsData,
    isLoading,
    isFetching,
  } = useGetCommentsByServiceQuery(serviceId, { skip: !serviceId || !visible });

  const [updateComment, { isLoading: isSavingEdit }] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [addReply, { isLoading: isSubmittingReply }] = useAddReplyMutation();
  const [updateReply, { isLoading: isSavingReply }] = useUpdateReplyMutation();
  const [deleteReply] = useDeleteReplyMutation();

  const comments = commentsData?.comments || [];
  const serviceProvider = commentsData?.serviceProvider;

  const resolvedProviderUserId = useMemo(() => {
    if (serviceProvider?.user) {
      return typeof serviceProvider.user === 'object' ? serviceProvider.user._id : serviceProvider.user;
    }
    return null;
  }, [serviceProvider]);

  const isProvider = Boolean(user && resolvedProviderUserId && user._id === resolvedProviderUserId);

  const onStartEdit = (c) => {
    setEditingId(c._id);
    setEditingText(c.comment || '');
    setEditingRating(c.rating || 0);
  };

  const onSaveEdit = async () => {
    const trimmed = editingText.trim();
    const hasRating = editingRating >= 1 && editingRating <= 5;
    const hasText = trimmed.length > 0;

    if (!hasRating && !hasText) {
      Alert.alert('Rating or Review Required', 'Please select a star rating or write a review comment (or both).');
      return;
    }
    try {
      await updateComment({
        commentId: editingId,
        serviceId,
        comment: trimmed,
        rating: hasRating ? editingRating : undefined,
      }).unwrap();
      setEditingId(null);
      setEditingText('');
      setEditingRating(0);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to update comment');
    }
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    setEditingRating(0);
  };

  const onDelete = (id) => {
    Alert.alert('Delete review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment({ commentId: id, serviceId }).unwrap();
          } catch (err) {
            Alert.alert('Error', err?.data?.message || 'Failed to delete review');
          }
        },
      },
    ]);
  };

  const onAddReply = async (commentId) => {
    const trimmed = replyText.trim();
    if (!trimmed) {
      Alert.alert('Reply required', 'Please write a reply');
      return;
    }
    try {
      await addReply({ commentId, serviceId, reply: trimmed }).unwrap();
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to add reply');
    }
  };

  const onStartEditReply = (c) => {
    setEditingReplyId(c._id);
    setEditingReplyText(c.reply || '');
  };

  const onSaveReply = async (commentId) => {
    const trimmed = editingReplyText.trim();
    if (!trimmed) {
      Alert.alert('Reply required', 'Please write a reply');
      return;
    }
    try {
      await updateReply({ commentId, serviceId, reply: trimmed }).unwrap();
      setEditingReplyId(null);
      setEditingReplyText('');
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to update reply');
    }
  };

  const onCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const onDeleteReply = (commentId) => {
    Alert.alert('Delete reply', 'Are you sure you want to delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReply({ commentId, serviceId }).unwrap();
          } catch (err) {
            Alert.alert('Error', err?.data?.message || 'Failed to delete reply');
          }
        },
      },
    ]);
  };

  const renderItem = useCallback(({ item: c }) => {
    const replyUser = getReplyUser(c);
    const customerId = typeof c.customer === 'object' ? c.customer?._id : c.customer;
    const isOwnReview = Boolean(user && c.customer && customerId && user._id === customerId);
    const isEditingThis = editingId === c._id;
    const isEditingThisReply = editingReplyId === c._id;
    const isReplyingToThis = replyingToId === c._id;

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewHeaderLeft}>
            <Avatar user={c.customer} size={36} />
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewUser}>{getFullName(c.customer) || 'User'}</Text>
              <View style={styles.reviewSubRow}>
                {c.rating ? <StarDisplay rating={c.rating} size={12} /> : null}
                <Text style={styles.reviewDate}>{formatDate(c.createdAt)}</Text>
              </View>
            </View>
          </View>

          {isOwnReview && !isEditingThis && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onStartEdit(c)} activeOpacity={0.7}>
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(c._id)} activeOpacity={0.7}>
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditingThis ? (
          <View style={styles.editBlock}>
            <Text style={styles.formLabel}>Rating (optional if writing a review)</Text>
            <StarPicker value={editingRating} onSelect={setEditingRating} size={22} />
            <TextInput
              style={styles.textArea}
              value={editingText}
              onChangeText={setEditingText}
              placeholder="Write your review (optional if star rating selected)..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onCancelEdit} activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtnSm, isSavingEdit && styles.btnDisabled]}
                onPress={onSaveEdit}
                disabled={isSavingEdit}
                activeOpacity={0.85}>
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          Boolean(c.comment && c.comment.trim()) && (
            <Text style={styles.reviewText}>{c.comment}</Text>
          )
        )}

        {/* Reply block */}
        {c.reply ? (
          <View style={styles.replyBlock}>
            <View style={styles.replyHeader}>
              <View style={styles.replyHeaderLeft}>
                <Avatar user={replyUser} size={28} />
                <View style={styles.replyMeta}>
                  <Text style={styles.replyUser}>{getFullName(replyUser) || 'Provider'}</Text>
                  <Text style={styles.replyDate}>{formatDate(c.replyCreatedAt)}</Text>
                </View>
              </View>
              {isProvider && !isEditingThisReply && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onStartEditReply(c)} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onDeleteReply(c._id)} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditingThisReply ? (
              <View style={styles.editBlock}>
                <TextInput
                  style={styles.textArea}
                  value={editingReplyText}
                  onChangeText={setEditingReplyText}
                  multiline
                  numberOfLines={2}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={onCancelEditReply} activeOpacity={0.7}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtnSm, isSavingReply && styles.btnDisabled]}
                    onPress={() => onSaveReply(c._id)}
                    disabled={isSavingReply}
                    activeOpacity={0.85}>
                    {isSavingReply ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.replyText}>{c.reply}</Text>
            )}
          </View>
        ) : isProvider && !isReplyingToThis ? (
          <TouchableOpacity
            style={styles.replyLink}
            onPress={() => setReplyingToId(c._id)}
            activeOpacity={0.7}>
            <Text style={styles.replyLinkText}>Reply</Text>
          </TouchableOpacity>
        ) : isProvider && isReplyingToThis ? (
          <View style={styles.replyBlock}>
            <TextInput
              style={styles.textArea}
              placeholder="Write your reply..."
              placeholderTextColor={COLORS.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={2}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              autoFocus={true}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setReplyingToId(null);
                  setReplyText('');
                }}
                activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtnSm, isSubmittingReply && styles.btnDisabled]}
                onPress={() => onAddReply(c._id)}
                disabled={isSubmittingReply}
                activeOpacity={0.85}>
                {isSubmittingReply ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  }, [
    user,
    editingId,
    editingReplyId,
    replyingToId,
    isProvider,
    isSavingEdit,
    isSavingReply,
    isSubmittingReply,
    replyText,
    editingReplyText,
    editingText,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>All Reviews {isLoading ? '' : `(${comments.length})`}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={scaleFont(24)} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {isLoading && comments.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.gradientStart} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No reviews yet.</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={21}
            removeClippedSubviews
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            extraData={[editingId, editingReplyId, replyingToId, replyText, editingReplyText, editingText]}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(12),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    position: 'absolute',
    right: scaleWidth(16),
    padding: moderateScale(4),
  },
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(80),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(40),
    gap: scaleHeight(10),
  },
  loadingText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(40),
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },
  reviewCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(14, 0.3),
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(12),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: scaleWidth(8),
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    flex: 1,
  },
  reviewMeta: { flex: 1 },
  reviewUser: {
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
  reviewText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginTop: scaleHeight(10),
  },

  actionRow: { flexDirection: 'row', gap: scaleWidth(6) },
  actionBtn: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(8, 0.3),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(5),
    backgroundColor: COLORS.white,
  },
  actionBtnText: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },

  editBlock: { marginTop: scaleHeight(10), gap: scaleHeight(10) },
  formLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  textArea: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(12, 0.3),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    backgroundColor: COLORS.white,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scaleWidth(8),
  },
  primaryBtnSm: {
    backgroundColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(9),
    minWidth: moderateScale(64, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
  },
  secondaryBtn: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(9),
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
  },
  btnDisabled: { opacity: 0.6 },
  starRow: { flexDirection: 'row', gap: moderateScale(4, 0.3) },

  replyBlock: {
    marginTop: scaleHeight(12),
    marginLeft: scaleWidth(12),
    paddingLeft: scaleWidth(12),
    borderLeftWidth: moderateScale(2, 0.3),
    borderLeftColor: COLORS.gradientStart + '40',
    gap: scaleHeight(8),
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: scaleWidth(8),
  },
  replyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    flex: 1,
  },
  replyMeta: { flex: 1 },
  replyUser: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  replyDate: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
  },
  replyText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(19, 0.3),
  },
  replyLink: {
    marginTop: scaleHeight(10),
    marginLeft: scaleWidth(12),
    alignSelf: 'flex-start',
  },
  replyLinkText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
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
});

export default AllReviewsModal;
