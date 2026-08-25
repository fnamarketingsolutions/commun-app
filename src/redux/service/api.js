import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';
import apiClient from './apiClient';
import { providerApi } from './providerApi';

// ─────────────────────────────────────────────────────────────────────────────
// apiClient's baseURL is scoped to '/api/user' (see apiClient.js — it mirrors
// the backend's `app.use('/api/user', userRouter)` mount). That's correct for
// every endpoint that genuinely lives inside userRouter (login, update-profile,
// community-broadcasts, etc).
//
// But 'vendors' and 'emergency-contacts' are separate, TOP-LEVEL routers on
// the backend:
//   app.use('/api/vendors', vendorRouter);
//   app.use('/api/emergency-contacts', emergencyContactRouter);
// They are NOT nested under /api/user, so a relative URL from this client can
// never reach them — that was the source of the 404s.
//
// Fix: derive the API root (strip the trailing '/user') once, and use an
// ABSOLUTE url for just these two endpoints. Axios ignores baseURL whenever
// the request url is already absolute, so this reaches the correct top-level
// routes without needing a second axios client or touching apiClient.js.
// ─────────────────────────────────────────────────────────────────────────────
const API_ROOT = (apiClient.defaults.baseURL || '').replace(/\/user\/?$/, '');

// ─────────────────────────────────────────────────────────────────────────────
// All tags whose data is scoped to "whoever is currently logged in". Any of
// these can end up serving stale data from a PREVIOUS user's session if not
// invalidated on login/logout, because most of these queries take no
// arguments — so RTK Query caches them under a single shared key regardless
// of which user made the request.
// ─────────────────────────────────────────────────────────────────────────────
const USER_SCOPED_TAGS = [
  'User',
  'CommunityFeatures',
  'Events',
  'Vendors',
  'EmergencyContacts',
  'Directory',
  'Services',
  'Wishlist',
];

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: USER_SCOPED_TAGS,
  endpoints: (builder) => ({
    // ----- Public endpoints -----
    signupCommunities: builder.query({
      query: () => ({ url: '/signup-communities', method: 'GET' }),
    }),
    register: builder.mutation({
      query: (body) => ({
        url: '/register',
        method: 'POST',
        data: body,
      }),
    }),
    login: builder.mutation({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        data: body,
      }),
      // Invalidate every user-scoped tag on login, not just 'User'. This
      // guarantees a fresh fetch of community features, events, vendors,
      // etc. for the newly logged-in user instead of serving whatever the
      // previous session had cached.
      invalidatesTags: USER_SCOPED_TAGS,
    }),

    // ── Phone OTP — Login ───────────────────────────────────────────────────
    sendLoginOtp: builder.mutation({
      query: (body) => ({
        url: '/login/send-otp',
        method: 'POST',
        data: body,
      }),
    }),
    verifyLoginOtp: builder.mutation({
      query: (body) => ({
        url: '/login/verify-otp',
        method: 'POST',
        data: body,
      }),
      // Same reasoning as `login` above — this is also a login path.
      invalidatesTags: USER_SCOPED_TAGS,
    }),

    // ── Phone OTP — Signup ──────────────────────────────────────────────────
    sendSignupOtp: builder.mutation({
      query: (body) => ({
        url: '/signup/send-otp',
        method: 'POST',
        data: body,
      }),
    }),
    verifySignupOtp: builder.mutation({
      query: (body) => ({
        url: '/signup/verify-otp',
        method: 'POST',
        data: body,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      // Invalidate everything on logout too, so if some other logout path
      // ever forgets to dispatch api.util.resetApiState(), stale data still
      // can't leak into the next session.
      invalidatesTags: USER_SCOPED_TAGS,
    }),
    checkAuth: builder.query({
      query: () => ({
        url: '/check-auth',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),

    // ----- Protected endpoints -----
    communityFeatures: builder.query({
      query: () => ({
        url: '/community-features',
        method: 'GET',
      }),
      // This was missing before — without it, login/logout invalidation of
      // 'CommunityFeatures' had nothing to invalidate, so this query never
      // refetched on user switch.
      providesTags: ['CommunityFeatures'],
    }),
    communityBroadcasts: builder.query({
      query: () => ({
        url: '/community-broadcasts',
        method: 'GET',
      }),
      providesTags: ['Events'],
    }),
    communityEvents: builder.query({
      query: () => ({
        url: '/community-events',
        method: 'GET',
      }),
      providesTags: ['Events'],
    }),
    createCommunityEvent: builder.mutation({
      query: (body) => ({
        url: '/community-events',
        method: 'POST',
        data: body,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
      invalidatesTags: ['Events'],
    }),
    deleteCommunityEvent: builder.mutation({
      query: (eventId) => ({
        url: `/community-events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Events'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: '/update-profile',
        method: 'PUT',
        data: body,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
      invalidatesTags: ['User', 'Services'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(providerApi.util.invalidateTags(['AllProviders']));
        } catch (_) {
          // update failed — nothing to invalidate
        }
      },
    }),
    changePassword: builder.mutation({
      query: (body) => ({
        url: '/change-password',
        method: 'PUT',
        data: body,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({
        url: '/forgot-password',
        method: 'POST',
        data: body,
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, body }) => ({
        url: `/reset-password/${token}`,
        method: 'POST',
        data: body,
      }),
    }),

    getPublicServices: builder.query({
  query: ({ page = 1, limit = 12, category } = {}) => {
    let url = `${API_ROOT}/service-offering?page=${page}&limit=${limit}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return { url, method: 'GET' };
  },
  providesTags: ['Services'],
}),

getCommunityServices: builder.query({
  query: ({ page = 1, limit = 12, category } = {}) => {
    let url = `${API_ROOT}/service-offering/community?page=${page}&limit=${limit}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return { url, method: 'GET' };
  },
  providesTags: ['Services'],
}),

    // ----- Wishlist endpoints -----
    addToWishlist: builder.mutation({
      query: (serviceId) => ({
        url: `/wishlist/${serviceId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Wishlist'],
    }),
    removeFromWishlist: builder.mutation({
      query: (serviceId) => ({
        url: `/wishlist/${serviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),

    // ── Join Community (for public members) ───────────────────────────────
    joinCommunity: builder.mutation({
      query: (body) => ({
        url: '/join-community',
        method: 'POST',
        data: body,
      }),
      // Joining a community changes the user's community-scoped data
      // (features, directory, vendors, etc.), not just their `User` record —
      // invalidate the full set so those screens refetch immediately.
      invalidatesTags: USER_SCOPED_TAGS,
    }),

    // ── Directory / Community endpoints ────────────────────────────────────
    // vendors + emergency-contacts live under TOP-LEVEL routers on the
    // backend (/api/vendors, /api/emergency-contacts), not under /api/user.
    // They use an absolute URL built from API_ROOT so they bypass apiClient's
    // /api/user-scoped baseURL.

    /** Fetch vendors for the user's community */
    communityVendors: builder.query({
      query: () => {
        const url = `${API_ROOT}/vendors/community`;
        return { url, method: 'GET' };
      },
      providesTags: ['Vendors'],
      transformResponse: (response) => {
        return response;
      },
      transformErrorResponse: (error) => {
        return error;
      },
    }),

    /** Fetch emergency contacts for the user's community */
    communityEmergencyContacts: builder.query({
      query: () => {
        const url = `${API_ROOT}/emergency-contacts/community`;
        return { url, method: 'GET' };
      },
      providesTags: ['EmergencyContacts'],
      transformResponse: (response) => {
        return response;
      },
      transformErrorResponse: (error) => {
        return error;
      },
    }),

    /** Fetch directory members for the user's community */
    communityDirectory: builder.query({
      query: () => {
        const url = '/community-directory'; // relative, baseURL is /api/user
        return { url, method: 'GET' };
      },
      providesTags: ['Directory'],
      transformResponse: (response) => {
        return response;
      },
      transformErrorResponse: (error) => {
        return error;
      },
    }),

    // ─── Service endpoints (public & community) ────────────────────────────
    // These also live under top-level routers (/api/service-offering), so we
    // use absolute URLs with API_ROOT.

    /** Fetch public services (no authentication) */
    getPublicServices: builder.query({
      query: ({ page = 1, limit = 12 } = {}) => ({
        url: `${API_ROOT}/service-offering?page=${page}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['Services'],
    }),

    /** Fetch community-scoped services (authenticated) */
    getCommunityServices: builder.query({
      query: ({ page = 1, limit = 12 } = {}) => ({
        url: `${API_ROOT}/service-offering/community?page=${page}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['Services'],
    }),

    /** Fetch top services by clicks (public) */
    getTopServicesByClicks: builder.query({
      query: ({ limit = 6 } = {}) => ({
        url: `${API_ROOT}/service-offering/top-clicked?limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['Services'],
    }),
    // ── FCM Mobile Push ────────────────────────────────────────────────────────
registerMobilePush: builder.mutation({
  query: (body) => ({
    url: `${API_ROOT}/push/mobile/register`,
    method: 'POST',
    data: body,
  }),
}),

unregisterMobilePush: builder.mutation({
  query: (body) => ({
    url: `${API_ROOT}/push/mobile/unregister`,
    method: 'DELETE',
    data: body,
  }),
}),




    /** Fetch a single service by ID (public) */
    getServiceById: builder.query({
      query: (serviceId) => ({
        url: `${API_ROOT}/service-offering/${serviceId}`,
        method: 'GET',
      }),
      providesTags: ['Services'],
    }),
  }),
});

// ─── Exports ────────────────────────────────────────────────────────────────
export const {
  useSignupCommunitiesQuery,
  useRegisterMutation,
  useLoginMutation,
  useSendLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useSendSignupOtpMutation,
  useVerifySignupOtpMutation,
  useLogoutMutation,
  useCheckAuthQuery,
  useLazyCheckAuthQuery,
  useCommunityFeaturesQuery,
  useCommunityBroadcastsQuery,
  useCommunityEventsQuery,
  useCreateCommunityEventMutation,
  useDeleteCommunityEventMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useJoinCommunityMutation,

  // ── Directory exports ──
  useCommunityVendorsQuery,
  useLazyCommunityVendorsQuery,
  useCommunityEmergencyContactsQuery,
  useLazyCommunityEmergencyContactsQuery,
  useCommunityDirectoryQuery,
  useLazyCommunityDirectoryQuery,

  // ── Service exports ──
  useGetPublicServicesQuery,
  useLazyGetPublicServicesQuery,
  useGetCommunityServicesQuery,
  useLazyGetCommunityServicesQuery,
  useGetTopServicesByClicksQuery,
  useLazyGetTopServicesByClicksQuery,
  useGetServiceByIdQuery,
  useLazyGetServiceByIdQuery,
  useRegisterMobilePushMutation,
useUnregisterMobilePushMutation,
} = api;