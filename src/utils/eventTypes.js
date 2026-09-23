// utils/eventTypes.js

export const DEFAULT_EVENT_TYPE = 'communitySocial';

export const EVENT_TYPE_OPTIONS = [
  {
    key: 'communitySocial',
    label: 'Community & Social',
    description: 'Get-togethers, celebrations, meetups, neighbourhood gatherings etc…',
  },
  {
    key: 'sportsFitness',
    label: 'Sports & Fitness',
    description: 'Cricket, football, yoga, fitness sessions, tournaments, walks etc…',
  },
  {
    key: 'workshopsClasses',
    label: 'Workshops & Classes',
    description: 'Skill classes, hobby classes, cooking, art, music, dance, etc.',
  },
  {
    key: 'kidsFamily',
    label: 'Kids & Family',
    description: "Children's activities, family events, camps, storytelling, playdates etc…",
  },
  {
    key: 'foodLifestyle',
    label: 'Food & Lifestyle',
    description: 'Food pop-ups, tastings, wellness, fashion, lifestyle events etc…',
  },
  {
    key: 'exhibitionsPopups',
    label: 'Exhibitions & Pop-ups',
    description: 'Flea markets, exhibitions, home-business pop-ups, product showcases etc…',
  },
  {
    key: 'entertainmentCulture',
    label: 'Entertainment & Culture',
    description: 'Music, movies, performances, cultural programmes, open mics etc…',
  },
  {
    key: 'businessProfessional',
    label: 'Business & Professional',
    description: 'Networking, consultations, seminars, talks, professional sessions etc…',
  },
  {
    key: 'festivalsCelebrations',
    label: 'Festivals & Celebrations',
    description:
      'Diwali, Holi, Independence Day, community celebrations, religious/cultural occasions etc…',
  },
  {
    key: 'communityInitiatives',
    label: 'Community Initiatives',
    description:
      'Clean-up drives, tree plantation, blood donation, charity, awareness campaigns etc…',
  },
  {
    key: 'rwaNotices',
    label: 'RWA / Community Notices',
    description:
      'Meetings, maintenance-related activities, resident meetings, important community programmes etc…',
  },
  {
    key: 'other',
    label: 'Other',
    description: "Anything that doesn't fit the above categories in event types",
  },
];

export const EVENT_TYPE_LABELS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(({ key, label }) => [key, label])
);

export const EVENT_TYPE_DESCRIPTIONS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(({ key, description }) => [key, description])
);

const LEGACY_EVENT_TYPE_MAP = {
  communityMeetup: 'communitySocial',
  sports: 'sportsFitness',
  workshop: 'workshopsClasses',
  marketDay: 'exhibitionsPopups',
  fundraiser: 'communityInitiatives',
};

/**
 * Resolve a legacy event type key to the current key.
 */
export const resolveEventType = (eventType) => {
  const key = String(eventType || DEFAULT_EVENT_TYPE).trim();
  return LEGACY_EVENT_TYPE_MAP[key] || key;
};

/**
 * Get the label for a given event type key.
 * Returns the label or the key itself if not found.
 */
export const getEventTypeLabel = (eventType) => {
  const resolved = resolveEventType(eventType);
  return EVENT_TYPE_LABELS[resolved] || EVENT_TYPE_LABELS[DEFAULT_EVENT_TYPE];
};

/**
 * Get the full option object for a given event type key.
 * Returns the option object or the first option if not found.
 */
export const getEventTypeOption = (eventType) => {
  const resolved = resolveEventType(eventType);
  return EVENT_TYPE_OPTIONS.find(({ key }) => key === resolved) || EVENT_TYPE_OPTIONS[0];
};

/**
 * Get all event type keys as an array.
 */
export const getEventTypeKeys = () => EVENT_TYPE_OPTIONS.map(({ key }) => key);

/**
 * Check if a given key is a valid event type.
 */
export const isValidEventType = (eventType) =>
  EVENT_TYPE_OPTIONS.some(({ key }) => key === resolveEventType(eventType));

/**
 * Get the description for a given event type key.
 */
export const getEventTypeDescription = (eventType) => {
  const resolved = resolveEventType(eventType);
  return EVENT_TYPE_DESCRIPTIONS[resolved] || '';
};

/**
 * Hardcoded community events list (empty - real events loaded from backend)
 */
export const HARDCODED_COMMUNITY_EVENTS = [];