// hooks/useFCM.js

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  deleteToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import { useSelector, useDispatch } from 'react-redux';
import { request, check, RESULTS } from 'react-native-permissions';
import {
  useRegisterMobilePushMutation,
  useUnregisterMobilePushMutation,
} from '../redux/service/api';
import { addNotification } from '../redux/slices/notificationSlice';
import { ROUTES } from '../navigations/routes';
import { api } from '../redux/service/api';
import { resolveNotificationRoute } from '../utils/notificationNavigation';

const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';

// ─── Route mapping ──────────────────────────────────────────────────────────
// Returns { routeName, params } or null if the tag doesn't map to a screen.
const getRouteFromTag = (tag) => {
  if (!tag) return null;

  const exactMap = {
    approvals: ROUTES.APPROVE_PROVIDER,
    communities: ROUTES.COMMUNITY_MANAGEMENT,
    events: ROUTES.PROVIDER_EVENTS,
    broadcast: ROUTES.PROVIDER_BROADCAST,
    registration: ROUTES.COMMUNITY_MEMBERS,
    'registration-approved': ROUTES.TABS,
    'registration-rejected': ROUTES.PENDING,
  };

  if (exactMap[tag]) {
    return { routeName: exactMap[tag], params: undefined };
  }

  if (tag.startsWith('join-request-')) {
    const handle = tag.slice('join-request-'.length);
    return { routeName: ROUTES.APPROVE_PROVIDER, params: handle ? { communityHandle: handle } : undefined };
  }

  // ── Event notification: backend sends `event-{eventId}` ──────────────
  if (tag.startsWith('event-') && !tag.startsWith('events-')) {
    const eventId = tag.slice('event-'.length);
    return { routeName: ROUTES.PROVIDER_EVENTS, params: eventId ? { eventId } : undefined };
  }


  if (tag.startsWith('broadcast-')) {
    const broadcastId = tag.slice('broadcast-'.length);
    return { routeName: ROUTES.PROVIDER_BROADCAST, params: broadcastId ? { broadcastId } : undefined };
  }

  // Backend sends `chat-{interestCommunityId}-{handle}`
  if (tag.startsWith('chat-')) {
    const rest = tag.slice('chat-'.length);
    const lastDash = rest.lastIndexOf('-');
    const interestCommunityId = lastDash > -1 ? rest.slice(0, lastDash) : rest;
    const communityHandle = lastDash > -1 ? rest.slice(lastDash + 1) : undefined;
    return {
      routeName: ROUTES.COMMUNITY_CHAT,
      params: { interestCommunityId, ...(communityHandle ? { communityHandle } : {}) },
    };
  }

  return null;
};

// ─── Build notification object ─────────────────────────────────────────────
function buildNotification(remoteMessage) {
  const title = remoteMessage.notification?.title
    || remoteMessage.data?.title
    || 'Commun';

  const body = remoteMessage.notification?.body
    || remoteMessage.data?.body
    || '';

  const tag = remoteMessage.data?.tag || '';

  return {
    id: remoteMessage.messageId || String(Date.now()),
    title,
    body,
    tag,
    receivedAt: new Date().toISOString(),
    isRead: false,
  };
}

// ─── Permission ─────────────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (Platform.OS !== 'android') return false;

  const androidVersion = parseInt(Platform.Version, 10);
  if (androidVersion < 33) return true;

  const status = await check(POST_NOTIFICATIONS);
  if (status === RESULTS.GRANTED) return true;
  if (status === RESULTS.BLOCKED || status === RESULTS.UNAVAILABLE) return false;

  const result = await request(POST_NOTIFICATIONS);
  return result === RESULTS.GRANTED;
}

// Waits (with retries) for navigationRef to be ready before navigating,
// instead of relying on a single fixed delay that can fire too early.
function navigateWhenReady(navigationRef, routeName, params, attempts = 10, intervalMs = 300) {
  const tryNavigate = (remaining) => {
    if (navigationRef?.current?.isReady?.()) {
      navigationRef.current.navigate(routeName, params);
      return;
    }
    if (remaining <= 0) return;
    setTimeout(() => tryNavigate(remaining - 1), intervalMs);
  };
  tryNavigate(attempts);
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useFCM(navigationRef) {
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const dispatch = useDispatch();
  const [registerMobilePush] = useRegisterMobilePushMutation();
  const [unregisterMobilePush] = useUnregisterMobilePushMutation();

  const tokenRef = useRef(null);
  const unsubscribersRef = useRef([]);

  // ── Navigate on notification tap ──────────────────────────────────────
  const handleNotificationPress = useCallback((remoteMessage) => {
    if (!remoteMessage) return;
    const data = remoteMessage.data || {};
    const route = resolveNotificationRoute({
      destination: data.url || data.destination || data.link,
      tag: data.tag,
      category: data.category,
    }) || getRouteFromTag(data.tag);
    if (!route) return;
    navigateWhenReady(navigationRef, route.routeName, route.params);
  }, [navigationRef]);

  // ── Main effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const messaging = getMessaging();
    let isActive = true;
    let timerHandle = null;

    // ── Teardown ──────────────────────────────────────────────────────────
    const teardown = () => {
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub(); } catch (_) { }
      });
      unsubscribersRef.current = [];
    };

    // ── Setup ─────────────────────────────────────────────────────────────
    const setup = async () => {
      if (!isActive) return;

      // 1. Permission
      const granted = await requestNotificationPermission();
      if (!granted) return;
      if (!isActive) return;

      // 2. Get token
      let token;
      try {
        token = await getToken(messaging);
      } catch (_) {
        return;
      }
      if (!token) return;
      if (!isActive) return;

      // 3. Register to backend
      try {
        await registerMobilePush({
          token,
          platform: Platform.OS,
          appId: Platform.OS === 'ios' ? 'in.rakita.commun' : 'in.commun.app',
          deviceId: '',
        }).unwrap();
        tokenRef.current = token;
      } catch (_) {
        return;
      }
      if (!isActive) return;

      // 4. Token refresh listener
      const tokenRefreshUnsub = onTokenRefresh(messaging, async (newToken) => {
        const oldToken = tokenRef.current;
        if (oldToken) {
          try { await unregisterMobilePush({ token: oldToken }).unwrap(); } catch (_) { }
        }
        try {
          await registerMobilePush({
            token: newToken,
            platform: Platform.OS,
            appId: Platform.OS === 'ios' ? 'in.rakita.commun' : 'in.commun.app',
            deviceId: '',
          }).unwrap();
          tokenRef.current = newToken;
        } catch (_) { }
      });
      unsubscribersRef.current.push(tokenRefreshUnsub);

      // 5. Foreground message listener
      const foregroundUnsub = onMessage(messaging, (remoteMessage) => {
        const notification = buildNotification(remoteMessage);
        dispatch(addNotification(notification));
      });
      unsubscribersRef.current.push(foregroundUnsub);

      // 6. Background tap listener
      const bgTapUnsub = onNotificationOpenedApp(messaging, (remoteMessage) => {
        const notification = buildNotification(remoteMessage);
        dispatch(addNotification(notification));
        handleNotificationPress(remoteMessage);
      });
      unsubscribersRef.current.push(bgTapUnsub);

      // 7. Killed state tap
      try {
        const initialMessage = await getInitialNotification(messaging);
        if (initialMessage && isActive) {
          const notification = buildNotification(initialMessage);
          dispatch(addNotification(notification));
          handleNotificationPress(initialMessage);
        }
      } catch (_) { }
    };

    timerHandle = setTimeout(() => {
      setup().catch(() => { });
    }, 1500);

    return () => {
      isActive = false;
      if (timerHandle) clearTimeout(timerHandle);
      try {
        teardown();
      } catch (_) { }
    };
  }, [isLoggedIn, handleNotificationPress, registerMobilePush, unregisterMobilePush, dispatch]);
}