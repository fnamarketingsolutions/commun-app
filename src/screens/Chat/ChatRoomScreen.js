// screens/chat/ChatRoomScreen.js
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';

import { useInterestChat } from '../../hooks/useInterestChat';
import {
  useGetMembersQuery,
  useGetMessagesQuery,
  useLeaveCommunityMutation,
} from '../../redux/service/interestCommunityApi';
import { COLORS, FONTS, RADIUS } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { getFullName } from '../../utils/userHelpers';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

const ChatRoomScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { interestCommunityId, communityName: passedCommunityName } = route.params || {};
  const user = useSelector((state) => state.auth.user);

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef(null);
  const [showMembers, setShowMembers] = useState(true);

  // ── Socket hook ──
  const {
    messages,
    setMessages,
    onlineUsers,
    typingUsers,
    connected,
    sendMessage,
    editMessage,
    deleteMessage,
    handleTypingInput,
  } = useInterestChat(interestCommunityId, true);

  // ── Safe delete wrapper ──
  const safeDeleteMessage = useCallback((msgId) => {
    if (typeof deleteMessage === 'function') {
      deleteMessage(msgId);
    } else {
      Alert.alert('Not available', 'Delete functionality is not implemented in this version.');
    }
  }, [deleteMessage]);

  // ── Leave community – using the real mutation ──
  const [leaveCommunity, { isLoading: isLeaving }] = useLeaveCommunityMutation();

  // ── Fetch members ──
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useGetMembersQuery(
    interestCommunityId,
    { skip: !interestCommunityId }
  );
  const members = membersData?.members || [];
  const communityName = passedCommunityName || membersData?.communityName || 'Community Chat';

  // ── Fetch initial messages ──
  const {
    data: initialMessages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    { id: interestCommunityId, limit: 50 },
    { skip: !interestCommunityId }
  );

  // ── Restore messages from query ──
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  // ── Refetch on socket reconnect ──
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (connected && !prevConnected.current) {
      refetchMessages();
      refetchMembers();
    }
    prevConnected.current = connected;
  }, [connected, refetchMessages, refetchMembers]);

  // ── Visible messages ──
  const visibleMessages = useMemo(() => {
    return messages.filter((m) => !m.deletedAt);
  }, [messages]);

  // ── Helpers ──
  const isOnline = (userId) =>
    onlineUsers.some((u) => String(u.userId) === String(userId));

  const getAuthorName = (msg) => {
    if (!msg?.author) return 'Unknown';
    const mine = String(msg.author._id) === String(user?._id);
    return mine ? 'You' : getFullName(msg.author);
  };

  const onlineCount = onlineUsers.filter((u) => String(u.userId) !== String(user?._id)).length;

  // ── Actions ──
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (editing) {
      editMessage(editing._id, text);
      setEditing(null);
      setReplyTo(null);
    } else {
      sendMessage(text, replyTo?._id || null);
      setReplyTo(null);
    }
    setInput('');
  };

  const handleDelete = (msgId) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => safeDeleteMessage(msgId),
      },
    ]);
  };

  // ── Leave community ──
  const handleLeave = () => {
    const label = communityName || 'this community';
    Alert.alert(
      `Leave ${label}?`,
      'You can join again anytime from the Community Chat list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunity(interestCommunityId).unwrap();
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err?.data?.message || 'Could not leave community.');
            }
          },
        },
      ]
    );
  };

  // ─── Render member chip ──
  const renderMemberChip = (m) => {
    const mine = String(m._id) === String(user?._id);
    const online = isOnline(m._id);
    const typing = typingUsers[m._id] && !mine;
    return (
      <View
        key={m._id}
        style={[
          styles.memberChip,
          online ? styles.memberChipOnline : styles.memberChipOffline,
        ]}
      >
        {online && <View style={styles.onlineDotSmall} />}
        <Text style={styles.memberChipName} numberOfLines={1}>
          {mine ? 'You' : getFullName(m)}
        </Text>
        {typing && <Text style={styles.memberChipTyping}>typing…</Text>}
        {online && !typing && !mine && (
          <Text style={styles.memberChipOnlineLabel}>online</Text>
        )}
      </View>
    );
  };

  // ─── Bubble Content ──
  const BubbleContent = ({ msg, mine, isDeleted, replyPreview }) => (
    <>
      <View style={styles.msgHeader}>
        <Text style={[styles.authorName, mine && styles.authorNameMine]}>
          {getAuthorName(msg)}
          {!mine && isOnline(msg.author?._id) && (
            <Text style={styles.onlineDot}> ●</Text>
          )}
        </Text>
        <View style={styles.msgActions}>
          {!isDeleted && (
            <>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(msg);
                  setEditing(null);
                  setInput('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name="return-up-back-outline"
                  size={scaleFont(14)}
                  color={mine ? '#fff' : COLORS.gradientStart}
                />
              </TouchableOpacity>
              {mine && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditing(msg);
                      setReplyTo(null);
                      setInput(msg.text);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon
                      name="pencil-outline"
                      size={scaleFont(14)}
                      color={mine ? '#fff' : COLORS.gradientStart}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(msg._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon
                      name="trash-outline"
                      size={scaleFont(14)}
                      color={mine ? '#fff' : COLORS.gradientStart}
                    />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {replyPreview && (
        <View
          style={[
            styles.replyPreview,
            mine ? styles.replyPreviewMine : styles.replyPreviewOther,
          ]}
        >
          <Text style={[styles.replyAuthor, mine && { color: '#fff' }]}>
            {replyPreview.name}
          </Text>
          <Text style={[styles.replyText, mine && { color: 'rgba(255,255,255,0.8)' }]}>
            {replyPreview.text}
          </Text>
        </View>
      )}

      {isDeleted ? (
        <Text style={styles.deletedText}>This message was deleted</Text>
      ) : (
        <Text style={[styles.msgText, mine && styles.msgTextMine]}>{msg.text}</Text>
      )}

      <Text
        style={[
          styles.timestamp,
          mine ? styles.timestampMine : styles.timestampOther,
        ]}
      >
        {new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {msg.editedAt && !isDeleted ? ' (edited)' : ''}
      </Text>
    </>
  );

  // ─── Render Item ──
  const renderItem = ({ item: msg }) => {
    const mine = String(msg.author?._id) === String(user?._id);
    const isDeleted = Boolean(msg.deletedAt);
    const replyPreview = msg.replyTo
      ? {
          name: getFullName(msg.replyTo.author),
          text: msg.replyTo.deletedAt ? 'Message deleted' : msg.replyTo.text,
        }
      : null;

    return (
      <View style={[styles.msgWrapper, mine ? styles.msgWrapperMine : styles.msgWrapperOther]}>
        {mine ? (
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleMineGradient]}
          >
            <BubbleContent
              msg={msg}
              mine={mine}
              isDeleted={isDeleted}
              replyPreview={replyPreview}
            />
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleOther]}>
            <BubbleContent
              msg={msg}
              mine={mine}
              isDeleted={isDeleted}
              replyPreview={replyPreview}
            />
          </View>
        )}
      </View>
    );
  };

  // ── Typing indicator ──
  const otherTyping = Object.entries(typingUsers).filter(
    ([userId]) => String(userId) !== String(user?._id)
  );
  const typingText =
    otherTyping.length === 1
      ? `${otherTyping[0][1]} is typing…`
      : otherTyping.length > 1
      ? `${otherTyping.length} people are typing…`
      : '';

  // ── Auto‑scroll to bottom ──
  useEffect(() => {
    if (flatListRef.current && visibleMessages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [visibleMessages]);

  const isLoading = membersLoading || messagesLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + moderateScale(12, 0.3) },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Icon name="arrow-back" size={scaleFont(28)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {communityName || 'Community Chat'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {members.length} members · {onlineCount} online
              {connected ? '' : ' (connecting…)'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLeave} disabled={isLeaving} style={styles.leaveBtn}>
            <Icon name="log-out-outline" size={scaleFont(22)} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* ── Members List ── */}
        {members.length > 0 && (
          <View style={styles.membersWrap}>
            <TouchableOpacity
              onPress={() => setShowMembers(!showMembers)}
              style={styles.membersToggle}
            >
              <Text style={styles.membersToggleText}>
                {showMembers ? 'Hide' : 'Show'} members ({members.length})
              </Text>
              <Icon
                name={showMembers ? 'chevron-up' : 'chevron-down'}
                size={scaleFont(16)}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            {showMembers && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.membersScroll}
                style={styles.membersScrollView}
              >
                {members.map((m) => renderMemberChip(m))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={visibleMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {typingText ? (
          <Text style={styles.typingIndicator}>{typingText}</Text>
        ) : null}

        {/* ── Reply/Edit Bar ── */}
        {(replyTo || editing) && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <Text style={[styles.replyBarLabel, { color: COLORS.gradientStart }]}>
                {editing ? 'Editing' : `Replying to ${getAuthorName(replyTo)}`}
              </Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {editing
                  ? editing.text
                  : replyTo?.deletedAt
                  ? 'Message deleted'
                  : replyTo?.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyTo(null);
                setEditing(null);
                setInput('');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={scaleFont(20)} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom + moderateScale(8, 0.3) },
          ]}
        >
          <View style={styles.inputWrapper}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.inputGradientBorder,
                inputFocused && styles.inputGradientBorderFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  handleTypingInput();
                }}
                placeholder="Type a message…"
                placeholderTextColor={COLORS.textMuted}
                maxLength={2000}
                multiline
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                selectionColor={COLORS.gradientStart}
              />
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtnWrap,
              (!input.trim() || !connected) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || !connected}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtn}
            >
              <Icon name="send" size={scaleFont(18)} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles (unchanged) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  keyboardAvoiding: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleHeight(12),
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scaleWidth(8),
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: scaleFont(11),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  leaveBtn: {
    padding: moderateScale(4, 0.3),
  },

  divider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },

  membersWrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(16),
  },
  membersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(4),
  },
  membersToggleText: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
  membersScrollView: { flexGrow: 0 },
  membersScroll: {
    paddingVertical: scaleHeight(6),
    gap: scaleWidth(8),
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(RADIUS.full, 0.3),
    borderWidth: moderateScale(1, 0.3),
    marginRight: scaleWidth(6),
  },
  memberChipOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  memberChipOffline: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  onlineDotSmall: {
    width: moderateScale(6, 0.3),
    height: moderateScale(6, 0.3),
    borderRadius: moderateScale(3, 0.3),
    backgroundColor: '#10B981',
    marginRight: scaleWidth(4),
  },
  memberChipName: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textPrimary,
    maxWidth: scaleWidth(80),
  },
  memberChipTyping: {
    fontSize: scaleFont(10),
    fontStyle: 'italic',
    color: COLORS.gradientStart,
    marginLeft: scaleWidth(4),
  },
  memberChipOnlineLabel: {
    fontSize: scaleFont(9),
    color: '#10B981',
    marginLeft: scaleWidth(4),
    fontWeight: FONTS.weightMedium,
  },

  flatListContent: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: scaleHeight(40),
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
  },

  msgWrapper: { marginVertical: scaleHeight(4) },
  msgWrapperMine: { alignItems: 'flex-end' },
  msgWrapperOther: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    padding: scaleWidth(12),
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  bubbleMineGradient: {
    borderWidth: 0,
    padding: scaleWidth(12),
  },
  bubbleOther: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(4),
  },
  authorName: {
    fontSize: scaleFont(12),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  authorNameMine: {
    color: COLORS.white,
  },
  onlineDot: {
    fontSize: scaleFont(10),
    color: '#10B981',
  },
  msgActions: {
    flexDirection: 'row',
    gap: scaleWidth(8),
  },

  replyPreview: {
    padding: scaleWidth(8),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    marginBottom: scaleHeight(4),
    borderLeftWidth: moderateScale(3, 0.3),
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: '#fff',
  },
  replyPreviewOther: {
    backgroundColor: '#f3f0ff',
    borderLeftColor: COLORS.gradientStart,
  },
  replyAuthor: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
    color: COLORS.gradientStart,
  },
  replyText: {
    fontSize: scaleFont(12),
    color: COLORS.textSecondary,
  },

  msgText: {
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
  },
  msgTextMine: {
    color: COLORS.white,
  },
  deletedText: {
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },

  timestamp: {
    fontSize: scaleFont(10),
    marginTop: scaleHeight(4),
  },
  timestampMine: { color: 'rgba(255,255,255,0.7)' },
  timestampOther: { color: COLORS.textMuted },

  typingIndicator: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(4),
    fontSize: scaleFont(12),
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderTopWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
  },
  replyBarContent: { flex: 1 },
  replyBarLabel: {
    fontSize: scaleFont(11),
    fontWeight: FONTS.weightBold,
  },
  replyBarText: {
    fontSize: scaleFont(13),
    color: COLORS.textSecondary,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingTop: scaleHeight(8),
    borderTopWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  inputGradientBorder: {
    padding: moderateScale(1.5, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  inputGradientBorderFocused: {
    padding: moderateScale(2, 0.3),
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md - 1, 0.3),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    fontSize: scaleFont(14),
    color: COLORS.textPrimary,
    minHeight: scaleHeight(40),
    maxHeight: scaleHeight(100),
  },

  sendBtnWrap: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(22, 0.3),
    overflow: 'hidden',
    marginLeft: scaleWidth(8),
  },
  sendBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});

export default ChatRoomScreen;