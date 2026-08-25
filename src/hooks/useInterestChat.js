// hooks/useInterestChat.js
import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Config from 'react-native-config';
import { getToken } from '../utils/tokenStorage';

const getSocketUrl = () => {
  const raw = Config.SOCKET_URL || Config.API_BASE_URL || 'http://localhost:3000';
  // Remove /api/user or /api suffix
  return raw.replace(/\/api(\/user)?\/?$/, '');
};

export function useInterestChat(interestCommunityId, enabled = true) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [connected, setConnected] = useState(false);
  const typingTimeoutRef = useRef(null);

  const emitTyping = useCallback(
    (isTyping) => {
      if (!socketRef.current || !interestCommunityId) return;
      socketRef.current.emit('typing', { interestCommunityId, isTyping });
    },
    [interestCommunityId]
  );

  const sendMessage = useCallback(
    (text, replyToId = null) => {
      if (!socketRef.current || !interestCommunityId) return;
      socketRef.current.emit('send_message', { interestCommunityId, text, replyToId });
    },
    [interestCommunityId]
  );

  const editMessage = useCallback(
    (messageId, text) => {
      if (!socketRef.current || !interestCommunityId) return;
      socketRef.current.emit('edit_message', { interestCommunityId, messageId, text });
    },
    [interestCommunityId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      if (!socketRef.current || !interestCommunityId) return;
      socketRef.current.emit('delete_message', { interestCommunityId, messageId });
    },
    [interestCommunityId]
  );

  const handleTypingInput = useCallback(() => {
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
  }, [emitTyping]);

  useEffect(() => {
    if (!enabled || !interestCommunityId) return undefined;

    let socket = null;
    let isMounted = true;

    const init = async () => {
      try {
        const token = await getToken();
        if (!isMounted) return;

        const socketUrl = getSocketUrl();

        socket = io(socketUrl, {
          transports: ['polling'],
          extraHeaders: {
            Cookie: `jwt=${token}`,
          },
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // ── Connect / Reconnect ──────────────────────────────────────────────
        socket.on('connect', () => {
          if (isMounted) {
            setConnected(true);
            socket.emit('join_interest_room', { interestCommunityId });
          }
        });

        socket.on('reconnect', () => {
          if (isMounted) {
            socket.emit('join_interest_room', { interestCommunityId });
          }
        });

        socket.on('disconnect', () => {
          if (isMounted) setConnected(false);
        });

        // ── Incoming events ──────────────────────────────────────────────────
        socket.on('new_message', (msg) => {
          if (isMounted) setMessages((prev) => [...prev, msg]);
        });

        socket.on('message_edited', ({ messageId, text, editedAt }) => {
          if (isMounted) {
            setMessages((prev) =>
              prev.map((m) =>
                String(m._id) === String(messageId)
                  ? { ...m, text, editedAt: editedAt || new Date() }
                  : m
              )
            );
          }
        });

        socket.on('message_deleted', ({ messageId, deletedAt }) => {
          if (isMounted) {
            setMessages((prev) =>
              prev.map((m) =>
                String(m._id) === String(messageId)
                  ? { ...m, text: '', deletedAt: deletedAt || new Date() }
                  : m
              )
            );
          }
        });

        socket.on('presence_update', ({ users }) => {
          if (isMounted) setOnlineUsers(users || []);
        });

        socket.on('user_typing', ({ userId, name, isTyping }) => {
          if (isMounted) {
            setTypingUsers((prev) => {
              const next = { ...prev };
              if (isTyping) next[userId] = name;
              else delete next[userId];
              return next;
            });
          }
        });

        socket.on('connect_error', (err) => {
          console.warn('Socket error:', err.message);
        });

      } catch (err) {
        console.error('Socket init error:', err);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave_interest_room');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [interestCommunityId, enabled]);

  return {
    messages,
    setMessages,
    onlineUsers,
    typingUsers,
    connected,
    sendMessage,
    editMessage,
    deleteMessage,
    handleTypingInput,
  };
}