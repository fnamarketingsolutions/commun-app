// navigations/routes.js
// Single source of truth for all route names.

export const ROUTES = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  SPLASH:           'Splash',
  ONBOARDING:       'Onboarding',
  LOGIN:            'Login',
  REGISTER:         'Register',
  FORGOT_PASSWORD:  'ForgotPassword',

  // ── Main tabs ─────────────────────────────────────────────────────────────
  TABS:             'Tabs',
  HOME:             'Home',
  SERVICES:         'Services',
  PROVIDERS:        'Providers',
  PROFILE:          'Profile',

  // ── Services ──────────────────────────────────────────────────────────────
  SERVICE_DETAIL:    'ServiceDetail',
  ALL_SERVICES:      'AllServices',
  CATEGORIES:        'Category',
  CATEGORY_SERVICES: 'CategoryServices',

  // ── Providers ─────────────────────────────────────────────────────────────
  PROVIDER_DETAIL:       'ProviderProfile',
  ALL_PROVIDERS_LIST:    'AllProviders',
  PROVIDER_ALL_SERVICES: 'ProviderAllServices',
  BECOME_PROVIDER:       'BecomeProvider',

  // ── Profile / Account ─────────────────────────────────────────────────────
  SETTINGS:       'Settings',
  PROFILE_INFO:   'ProfileInfo',
  EDIT_PROFILE:   'EditProfile',
  EDIT_PASSWORD:  'Security',
  SAVED_SERVICES: 'SavedServices',
  PENDING:        'PendingApproval',

  // ── Provider Hub ──────────────────────────────────────────────────────────
  PROVIDER_DASHBOARD_HUB: 'ProviderHub',
  PROVIDER_DASHBOARD:     'ProviderDashboard',
  MANAGE_SERVICE:         'ManageServices',
  ADD_SERVICE:            'AddService',
  EDIT_SERVICE:           'EditService',
  EDIT_PROVIDER_PROFILE:  'UpdateProviderProfile',
  PROVIDER_BROADCAST:     'ProviderBroadcast',
  PROVIDER_EVENTS:        'ProviderEvents',

  // ── Secretary ─────────────────────────────────────────────────────────────
  COMMUNITY_MANAGEMENT:      'CommunityManagementScreen',
  COMMUNITY_MEMBERS:         'CommunityMembers',
  APPROVE_PROVIDER:          'ApproveProviders',
  BROADCAST:                 'BroadcastMessage',
  COMMUNITY_EVENT:           'CommunityEvents',
  COMMUNITY_DASHBORAD:       'CommunityDashboard',
  PENDING_PROVIDER_REQUESTS: 'ProviderRequestDetail',
  MEMBER_DETAIL:             'MemberDetail',
  ADD_EVENT:                 'CreateEventScreen',
  ALL_BROADCAST:             'AllBroadcastsScreen',
  SECRETARY_SERVICES:        'SecretaryServices',
  SECRETARY_REVIEWS:         'SecretaryReviews',

  // ── NEW: Secretary Hub Directory ──────────────────────────────────────────
  SECRETARY_VENDORS:            'SecretaryVendors',
  SECRETARY_EMERGENCY_CONTACTS: 'SecretaryEmergencyContacts',

  // ── Extra / Info ──────────────────────────────────────────────────────────
  ABOUT:                'about',
  CONTACT:              'Contact',
  FAQ:                  'FAQ',
  PRIVACY:              'privacy',
  COMMUNITY_GUIDELINES: 'Communityguidelines',
  TERMS_OF_SERVICE:     'TermsOfService',

  // ── Chat ──────────────────────────────────────────────────────────────────
  COMMUNITY_CHAT: 'CommunityChat',
  CHAT_ROOM:      'ChatRoom',

  // ── Community services ────────────────────────────────────────────────────
  COMMUNITY_SERVICES: 'CommunityServices',

  // ── Directory Hub ─────────────────────────────────────────────────────────
  DIRECTORY_HUB: 'DirectoryHub',

  LOCATION_PERMISSION: 'LocationPermission',

  LEADERBOARD: 'LeaderboardScreen',

  EMERGENCYCONTACTS: 'EmergencyContacts',
  VENDORS:           'Vendors',
  MEMBERS:           'Members',

  DIRECTORY_SCREEN: 'DirectoryScreen',

  COMMUNITY_HUB: 'CommunityHub',
  NOTIFICATIONS: 'Notifications',


    SECRETARY_LOCAL_BUSINESSES:    'SecretaryLocalBusinesses',
  SECRETARY_LOCAL_BUSINESS_ADD:  'AddLocalBusiness',
  SECRETARY_LOCAL_BUSINESS_EDIT: 'EditLocalBusiness',


  LOCAL_BUSINESS_DETAIL:'LocalBusinessDetailScreen',
  ALL_LOCAL_BUSINESSES:'AllLocalBusinessesScreen'

};