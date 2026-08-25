// src/components/ReviewsSection.jsx

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  useGetCommentsByServiceQuery,
  useCanReviewServiceQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddReplyMutation,
  useUpdateReplyMutation,
  useDeleteReplyMutation,
} from '../redux/service/commentApi';
import { COLORS, FONTS, RADIUS } from '../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../utils/responsive';
import AllReviewsModal from './AllReviewsModal';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const INITIAL_REVIEWS_SHOWN = 3;

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

const StarPicker = ({ value, onSelect, size = 24, disabled = false }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => !disabled && onSelect(star)}
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

const Avatar = ({ user, size = 40 }) => {
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

const ReviewsSection = ({ serviceId, providerUserId }) => {
  const user = useSelector((s) => s.auth?.user);

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingRating, setEditingRating] = useState(0);

  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  const {
    data: commentsData,
    isLoading: isLoadingComments,
  } = useGetCommentsByServiceQuery(serviceId, { skip: !serviceId });

  const { data: canReviewData } = useCanReviewServiceQuery(serviceId, {
    skip: !serviceId || !user,
  });

  const [createComment, { isLoading: isSubmitting }] = useCreateCommentMutation();
  const [updateComment, { isLoading: isSavingEdit }] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [addReply, { isLoading: isSubmittingReply }] = useAddReplyMutation();
  const [updateReply, { isLoading: isSavingReply }] = useUpdateReplyMutation();
  const [deleteReply] = useDeleteReplyMutation();

  const comments = commentsData?.comments || [];
  const serviceProvider = commentsData?.serviceProvider;
  const canReview = canReviewData?.canReview;

  const displayedComments = comments.slice(0, INITIAL_REVIEWS_SHOWN);
  const hasMoreReviews = comments.length > INITIAL_REVIEWS_SHOWN;

  const hasUserReviewed = useMemo(() => {
    if (!user) return false;
    return comments.some((c) => {
      const customerId = typeof c.customer === 'object' ? c.customer?._id : c.customer;
      return customerId === user._id;
    });
  }, [comments, user]);

  const resolvedProviderUserId = useMemo(() => {
    if (providerUserId) return providerUserId;
    if (serviceProvider?.user) {
      return typeof serviceProvider.user === 'object' ? serviceProvider.user._id : serviceProvider.user;
    }
    return null;
  }, [providerUserId, serviceProvider]);

  const isProvider = Boolean(user && resolvedProviderUserId && user._id === resolvedProviderUserId);

  const onSubmit = async () => {
    const trimmed = text.trim();
    if (!rating || rating < 1 || rating > 5) {
      Alert.alert('Rating required', 'Please select a rating (1-5 stars)');
      return;
    }
    if (!trimmed) {
      Alert.alert('Review required', 'Please write a review comment');
      return;
    }
    try {
      await createComment({ serviceId, comment: trimmed, rating }).unwrap();
      setText('');
      setRating(0);
      setShowReviewForm(false);
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to submit review');
    }
  };

  const onStartEdit = (c) => {
    setEditingId(c._id);
    setEditingText(c.comment);
    setEditingRating(c.rating || 0);
  };

  const onSaveEdit = async () => {
    const trimmed = editingText.trim();
    if (!editingRating || editingRating < 1 || editingRating > 5) {
      Alert.alert('Rating required', 'Please select a rating (1-5 stars)');
      return;
    }
    if (!trimmed) {
      Alert.alert('Review required', 'Please write a review comment');
      return;
    }
    try {
      await updateComment({
        commentId: editingId,
        serviceId,
        comment: trimmed,
        rating: editingRating,
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

  if (!serviceId) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: scaleHeight(20) }}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {hasMoreReviews && (
            <TouchableOpacity onPress={() => setShowAllReviews(true)} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All ({comments.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Write review entry point */}
        <View style={styles.writeReviewBlock}>
          {user ? (
            hasUserReviewed ? (
              <Text style={styles.helperText}>You have already reviewed this service.</Text>
            ) : canReview === false ? (
              <Text style={styles.helperText}>You can review only after you book this service.</Text>
            ) : !showReviewForm ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                onPress={() => setShowReviewForm(true)}>
                <Text style={styles.primaryBtnText}>Write Review</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Rating</Text>
                <StarPicker value={rating} onSelect={setRating} />
                <TextInput
                  style={styles.textArea}
                  placeholder="Write your review..."
                  placeholderTextColor={COLORS.textMuted}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={3}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowReviewForm(false);
                      setText('');
                      setRating(0);
                    }}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtnSm, isSubmitting && styles.btnDisabled]}
                    activeOpacity={0.85}
                    onPress={onSubmit}
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            <Text style={styles.helperText}>Please login to post a review.</Text>
          )}
        </View>

        {/* Loading */}
        {isLoadingComments && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.gradientStart} />
            <Text style={styles.helperText}>Loading comments...</Text>
          </View>
        )}

        {/* Empty state */}
        {!isLoadingComments && comments.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.helperText}>No comments yet. Be the first!</Text>
          </View>
        )}

        {/* Display first 3 reviews */}
        {displayedComments.map((c) => {
          const replyUser = getReplyUser(c);
          const customerId = typeof c.customer === 'object' ? c.customer?._id : c.customer;
          const isOwnReview = Boolean(user && c.customer && customerId && user._id === customerId);
          const isEditingThis = editingId === c._id;
          const isEditingThisReply = editingReplyId === c._id;
          const isReplyingToThis = replyingToId === c._id;

          return (
            <View key={c._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderLeft}>
                  <Avatar user={c.customer} size={40} />
                  <View style={styles.reviewHeaderMeta}>
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
                  <Text style={styles.formLabel}>Rating</Text>
                  <StarPicker value={editingRating} onSelect={setEditingRating} size={22} />
                  <TextInput
                    style={styles.textArea}
                    value={editingText}
                    onChangeText={setEditingText}
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
                <Text style={styles.reviewText}>{c.comment}</Text>
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
        })}

        <AllReviewsModal
          visible={showAllReviews}
          serviceId={serviceId}
          onClose={() => setShowAllReviews(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(12),
  },
  viewAllText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.gradientStart,
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  helperText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
  },
  writeReviewBlock: {
    marginBottom: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    marginBottom: scaleHeight(12),
  },
  emptyBox: {
    borderWidth: moderateScale(1, 0.3),
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: moderateScale(14, 0.3),
    paddingVertical: moderateScale(24, 0.3),
    alignItems: 'center',
    marginBottom: scaleHeight(12),
  },
  starRow: { flexDirection: 'row', gap: moderateScale(4, 0.3) },

  primaryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gradientStart,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(11),
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

  formCard: { gap: scaleHeight(10) },
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

  reviewCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(14, 0.3),
    padding: moderateScale(14, 0.3),
    marginBottom: scaleHeight(10),
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
  reviewHeaderMeta: { flex: 1 },
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

export default ReviewsSection;