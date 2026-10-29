import { ROUTES } from '../navigations/routes';

/**
 * Resolves a notification (by destination URL, tag, or category)
 * to a React Native route name and params.
 *
 * @param {Object} notification
 * @param {string} [notification.destination] e.g. "/community/events", "/secretary/approvals"
 * @param {string} [notification.tag] e.g. "join-request-xyz", "event-123"
 * @param {string} [notification.category] e.g. "approvals", "events", "communities"
 * @returns {{ routeName: string, params?: Object } | null}
 */
export function resolveNotificationRoute(notification = {}) {
  const { destination = '', tag = '', category = '' } = notification;
  const cleanDestination = String(destination || '').trim();
  const cleanTag = String(tag || '').trim();
  const cleanCategory = String(category || '').trim().toLowerCase();

  // 1. Try URL destination parsing first (matches server web paths)
  if (cleanDestination) {
    // Secretary approvals: /secretary/approvals
    if (cleanDestination.includes('/secretary/approvals') || cleanDestination.includes('/approvals')) {
      return { routeName: ROUTES.APPROVE_PROVIDER };
    }

    // Community Chat: /community/communities/:id/chat
    const chatMatch = cleanDestination.match(/\/communities\/([^/]+)\/chat/i);
    if (chatMatch) {
      return {
        routeName: ROUTES.COMMUNITY_CHAT,
        params: { interestCommunityId: chatMatch[1] },
      };
    }

    // Community Events: /community/events or /events/:id
    const eventMatch = cleanDestination.match(/\/events\/([^/]+)/i);
    if (eventMatch && eventMatch[1] !== 'events') {
      return {
        routeName: ROUTES.PROVIDER_EVENTS,
        params: { eventId: eventMatch[1] },
      };
    }
    if (cleanDestination.includes('/community/events') || cleanDestination.includes('/events')) {
      return { routeName: ROUTES.PROVIDER_EVENTS };
    }

    // Community Broadcast: /community/broadcast or /broadcast/:id
    const broadcastMatch = cleanDestination.match(/\/broadcast\/([^/]+)/i);
    if (broadcastMatch && broadcastMatch[1] !== 'broadcast') {
      return {
        routeName: ROUTES.PROVIDER_BROADCAST,
        params: { broadcastId: broadcastMatch[1] },
      };
    }
    if (cleanDestination.includes('/community/broadcast') || cleanDestination.includes('/broadcast')) {
      return { routeName: ROUTES.PROVIDER_BROADCAST };
    }

    // Pending approval
    if (cleanDestination.includes('/pending-approval')) {
      return { routeName: ROUTES.PENDING };
    }

    // Community services / Home tabs
    if (cleanDestination.includes('/community/services') || cleanDestination.includes('/services')) {
      return { routeName: ROUTES.COMMUNITY_SERVICES };
    }

    // Notifications page
    if (cleanDestination.includes('/notifications')) {
      return { routeName: ROUTES.NOTIFICATIONS };
    }
  }

  // 2. Try push tag matching (backward compatible with useFCM)
  if (cleanTag) {
    const exactMap = {
      approvals: ROUTES.APPROVE_PROVIDER,
      communities: ROUTES.COMMUNITY_CHAT,
      events: ROUTES.PROVIDER_EVENTS,
      broadcast: ROUTES.PROVIDER_BROADCAST,
      registration: ROUTES.COMMUNITY_MEMBERS,
      'registration-approved': ROUTES.TABS,
      'registration-rejected': ROUTES.PENDING,
    };

    if (exactMap[cleanTag]) {
      return { routeName: exactMap[cleanTag] };
    }

    if (cleanTag.startsWith('join-request-')) {
      const handle = cleanTag.slice('join-request-'.length);
      return {
        routeName: ROUTES.APPROVE_PROVIDER,
        params: handle ? { communityHandle: handle } : undefined,
      };
    }

    if (cleanTag.startsWith('event-') && !cleanTag.startsWith('events-')) {
      const eventId = cleanTag.slice('event-'.length);
      return {
        routeName: ROUTES.PROVIDER_EVENTS,
        params: eventId ? { eventId } : undefined,
      };
    }

    if (cleanTag.startsWith('broadcast-')) {
      const broadcastId = cleanTag.slice('broadcast-'.length);
      return {
        routeName: ROUTES.PROVIDER_BROADCAST,
        params: broadcastId ? { broadcastId } : undefined,
      };
    }

    if (cleanTag.startsWith('chat-')) {
      const rest = cleanTag.slice('chat-'.length);
      const lastDash = rest.lastIndexOf('-');
      const interestCommunityId = lastDash > -1 ? rest.slice(0, lastDash) : rest;
      const communityHandle = lastDash > -1 ? rest.slice(lastDash + 1) : undefined;
      return {
        routeName: ROUTES.COMMUNITY_CHAT,
        params: { interestCommunityId, ...(communityHandle ? { communityHandle } : {}) },
      };
    }
  }

  // 3. Fallback to category matching
  switch (cleanCategory) {
    case 'approvals':
      return { routeName: ROUTES.APPROVE_PROVIDER };
    case 'communities':
      return { routeName: ROUTES.COMMUNITY_CHAT };
    case 'events':
      return { routeName: ROUTES.PROVIDER_EVENTS };
    case 'broadcast':
      return { routeName: ROUTES.PROVIDER_BROADCAST };
    case 'registration':
      return { routeName: ROUTES.TABS };
    case 'announcements':
      return { routeName: ROUTES.NOTIFICATIONS };
    default:
      return null;
  }
}
