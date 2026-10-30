// src/redux/service/secretaryApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { secretaryAxiosBaseQuery } from './secretaryAxiosBaseQuery';

const buildLocalBusinessFormData = (payload = {}) => {
  const formData = new FormData();
  const {
    logo,
    banner,
    businessCategories,
    discountedCategories,
    nonDiscountedCategories,
    ...rest
  } = payload;

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
  });

  if (businessCategories !== undefined) {
    formData.append('businessCategories', JSON.stringify(businessCategories || []));
  }
  if (discountedCategories !== undefined) {
    formData.append('discountedCategories', JSON.stringify(discountedCategories || []));
  }
  if (nonDiscountedCategories !== undefined) {
    formData.append('nonDiscountedCategories', JSON.stringify(nonDiscountedCategories || []));
  }

  if (logo?.uri) {
    formData.append('logo', {
      uri: logo.uri,
      type: logo.type || 'image/jpeg',
      name: logo.fileName || `logo_${Date.now()}.jpg`,
    });
  }
  if (banner?.uri) {
    formData.append('banner', {
      uri: banner.uri,
      type: banner.type || 'image/jpeg',
      name: banner.fileName || `banner_${Date.now()}.jpg`,
    });
  }

  return formData;
};

export const secretaryApi = createApi({
  reducerPath: 'secretaryApi',
  baseQuery: secretaryAxiosBaseQuery(),
  tagTypes: [
    'PendingUsers',
    'Members',
    'FeatureToggles',
    'EventToggles',          // ← new
    'SecretaryEvents',
    'Broadcasts',
    'CategoryToggles',
    'SecretaryVendors',
    'VendorCategories',
    'SecretaryEmergencyContacts',
    'SecretaryReviews',
    'BusinessCategories',
    'SecretaryLocalBusinesses',
  ],
  endpoints: (builder) => ({

    // ----- Registrations -----
    fetchPendingRegistrations: builder.query({
      query: () => ({ url: '/registrations/pending', method: 'GET' }),
      transformResponse: (response) => response?.data?.users || [],
      providesTags: ['PendingUsers'],
    }),
    approveUserRegistration: builder.mutation({
      query: (userId) => ({
        url: `/registrations/${userId}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['PendingUsers', 'Members'],
    }),
    rejectUserRegistration: builder.mutation({
      query: (userId) => ({
        url: `/registrations/${userId}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: ['PendingUsers', 'Members'],
    }),

    // ----- Members -----
    fetchCommunityMembers: builder.query({
      query: ({ page = 1, limit = 20, search = '' } = {}) => ({
        url: '/members',
        method: 'GET',
        params: { page, limit, ...(search ? { search } : {}) },
      }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          users: data.users || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
          pagination: data.pagination || null,
        };
      },
      serializeQueryArgs: ({ queryArgs }) => {
        return { search: queryArgs?.search || '' };
      },
      merge: (currentCache, newData, { arg }) => {
        if ((arg?.page || 1) === 1) {
          currentCache.users = newData.users;
        } else {
          const existingIds = new Set(currentCache.users.map((u) => u._id));
          const toAppend = newData.users.filter((u) => !existingIds.has(u._id));
          currentCache.users.push(...toAppend);
        }
        currentCache.pagination = newData.pagination;
        currentCache.needsCommunName = newData.needsCommunName;
        currentCache.communityCommunName = newData.communityCommunName;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.page !== previousArg?.page || currentArg?.search !== previousArg?.search;
      },
      providesTags: ['Members'],
    }),

    fetchSecretaryMemberById: builder.query({
      query: (userId) => ({ url: `/members/${userId}`, method: 'GET' }),
      transformResponse: (response) => response?.data?.user || null,
      providesTags: (result, error, userId) => [{ type: 'Members', id: userId }],
    }),

    updateCommunityMemberStatus: builder.mutation({
      query: ({ userId, accountStatus }) => ({
        url: `/members/${userId}/status`,
        method: 'PATCH',
        data: { accountStatus },
      }),
      invalidatesTags: ['Members', 'PendingUsers'],
    }),

    // ----- Feature toggles -----
    fetchFeatureToggles: builder.query({
      query: () => ({ url: '/features/toggles', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          toggles: data.toggles || {},
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['FeatureToggles'],
    }),
    updateFeatureToggle: builder.mutation({
      query: ({ key, enabled }) => ({
        url: '/features/toggles',
        method: 'PATCH',
        data: { key, enabled },
      }),
      transformResponse: (response) => response?.data?.toggles || {},
      invalidatesTags: ['FeatureToggles'],
    }),

    // ----- Event Type Toggles -----
    fetchEventToggles: builder.query({
      query: () => ({ url: '/events/toggles', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        // Expected shape: { toggles: { communityMeetup: true, workshop: false, ... } }
        return data.toggles || {};
      },
      providesTags: ['EventToggles'],
    }),
    updateEventToggle: builder.mutation({
      query: ({ key, enabled }) => ({
        url: '/events/toggles',
        method: 'PATCH',
        data: { key, enabled },
      }),
      // Optimistic update — mirrors updateCategoryToggle pattern
      async onQueryStarted({ key, enabled }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          secretaryApi.util.updateQueryData('fetchEventToggles', undefined, (draft) => {
            draft[key] = enabled;
          })
        );
        try {
          await queryFulfilled;
        } catch (_) {
          patchResult.undo();
        }
      },
      invalidatesTags: ['EventToggles'],
    }),

    // ----- Community Events -----
    fetchCommunityEvents: builder.query({
      query: () => ({ url: '/events', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          events: data.events || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['SecretaryEvents'],
    }),
    createCommunityEvent: builder.mutation({
      query: ({ title, description, expiresAt, files = [], attachmentLinks = [] }) => {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('expiresAt', expiresAt);

        files.forEach((file) => {
          formData.append('attachments', {
            uri: file.uri,
            name: file.name || 'attachment',
            type: file.type || 'application/octet-stream',
          });
        });

        if (attachmentLinks.length > 0) {
          formData.append('attachmentLinks', JSON.stringify(attachmentLinks));
        }

        return {
          url: '/events',
          method: 'POST',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        };
      },
      transformResponse: (response) => response?.data?.event,
      invalidatesTags: ['SecretaryEvents'],
    }),
    deleteCommunityEvent: builder.mutation({
      query: (eventId) => ({
        url: `/events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SecretaryEvents'],
    }),

    // ----- Broadcasts -----
    fetchBroadcasts: builder.query({
      query: () => ({ url: '/broadcasts', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          broadcasts: data.broadcasts || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['Broadcasts'],
    }),
    createBroadcast: builder.mutation({
      query: ({ title, message }) => ({
        url: '/broadcasts',
        method: 'POST',
        data: { title, message },
      }),
      transformResponse: (response) => response?.data?.broadcast,
      invalidatesTags: ['Broadcasts'],
    }),
    deleteBroadcast: builder.mutation({
      query: (broadcastId) => ({
        url: `/broadcasts/${broadcastId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Broadcasts'],
    }),

    // ----- Service Category Toggles -----
    fetchCategoryToggles: builder.query({
      query: () => ({ url: '/services/toggles', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          categories: data.categories || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['CategoryToggles'],
    }),
    updateCategoryToggle: builder.mutation({
      query: ({ categoryName, enabled }) => ({
        url: '/services/toggles',
        method: 'PATCH',
        data: { categoryName, enabled },
      }),
      async onQueryStarted({ categoryName, enabled }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          secretaryApi.util.updateQueryData('fetchCategoryToggles', undefined, (draft) => {
            const target = draft.categories?.find((c) => c.name === categoryName);
            if (target) target.enabled = enabled;
          })
        );
        try {
          await queryFulfilled;
        } catch (_) {
          patchResult.undo();
        }
      },
      invalidatesTags: ['CategoryToggles'],
    }),

    // ─── Vendors ──────────────────────────────────────────────────────────
    fetchVendorCategories: builder.query({
      query: () => ({ url: '/vendors/categories', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          categories: data.categories || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['VendorCategories'],
    }),
    fetchSecretaryVendors: builder.query({
      query: (arg) => {
        const params = {};
        if (typeof arg === 'string') {
          if (arg.trim()) params.search = arg.trim();
        } else if (arg && typeof arg === 'object') {
          if (arg.category) params.category = arg.category;
          if (arg.search && arg.search.trim()) params.search = arg.search.trim();
        }
        return {
          url: '/vendors',
          method: 'GET',
          params: Object.keys(params).length ? params : undefined,
        };
      },
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          vendors: data.vendors || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['SecretaryVendors'],
    }),
    createSecretaryVendor: builder.mutation({
      query: ({ category, name, phone, email, service }) => ({
        url: '/vendors',
        method: 'POST',
        data: { category, name, phone, email, service },
      }),
      transformResponse: (response) => response?.data?.vendor,
      invalidatesTags: ['SecretaryVendors', 'VendorCategories'],
    }),
    deleteSecretaryVendor: builder.mutation({
      query: (vendorId) => ({
        url: `/vendors/${vendorId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SecretaryVendors', 'VendorCategories'],
    }),

    // ─── Emergency Contacts ───────────────────────────────────────────────
    fetchSecretaryEmergencyContacts: builder.query({
      query: () => ({ url: '/emergency-contacts', method: 'GET' }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          contacts: data.contacts || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: ['SecretaryEmergencyContacts'],
    }),
    createSecretaryEmergencyContact: builder.mutation({
      query: ({ title, name, phone, notes }) => ({
        url: '/emergency-contacts',
        method: 'POST',
        data: { title, name, phone, notes },
      }),
      transformResponse: (response) => response?.data?.contact,
      invalidatesTags: ['SecretaryEmergencyContacts'],
    }),
    deleteSecretaryEmergencyContact: builder.mutation({
      query: (contactId) => ({
        url: `/emergency-contacts/${contactId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SecretaryEmergencyContacts'],
    }),

    // ── Member count for dashboard ──
    fetchCommunityMembersCount: builder.query({
      query: () => ({ url: '/members', method: 'GET', params: { page: 1, limit: 1 } }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return data.pagination?.totalMembers ?? (data.users?.length || 0);
      },
      providesTags: ['Members'],
    }),

    // ─── Secretary Reviews ────────────────────────────────────────────────
    fetchSecretaryReviews: builder.query({
      query: ({ page = 1, limit = 10, search = '' } = {}) => ({
        url: '/reviews',
        method: 'GET',
        params: { page, limit, search: search || undefined },
      }),
      transformResponse: (response) => {
        return {
          reviews: response?.reviews || [],
          pagination: response?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalReviews: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit: 10,
          },
          communityCommunName: response?.communityCommunName || null,
          needsCommunName: response?.needsCommunName || false,
        };
      },
      providesTags: ['SecretaryReviews'],
    }),
    updateSecretaryReview: builder.mutation({
      query: ({ commentId, comment, rating }) => ({
        url: `/reviews/${commentId}`,
        method: 'PUT',
        data: { comment, rating },
      }),
      invalidatesTags: ['SecretaryReviews'],
    }),
    deleteSecretaryReview: builder.mutation({
      query: (commentId) => ({
        url: `/reviews/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SecretaryReviews'],
    }),

    // ─── Local Businesses (master categories) ──────────────────────────────
    fetchBusinessCategories: builder.query({
      query: () => ({ url: '/local-businesses/categories', method: 'GET' }),
      transformResponse: (response) => response?.data?.categories || [],
      providesTags: ['BusinessCategories'],
      keepUnusedDataFor: 3600, // rarely changes — safe to cache long
    }),

    // ─── Secretary Local Businesses ─────────────────────────────────────────
    fetchSecretaryLocalBusinesses: builder.query({
      query: ({ search = '', category = '', status = '' } = {}) => ({
        url: '/local-businesses',
        method: 'GET',
        params: {
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
          ...(status ? { status } : {}),
        },
      }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          businesses: data.businesses || [],
          needsCommunName: Boolean(data.needsCommunName),
          communityCommunName: data.communityCommunName || null,
        };
      },
      providesTags: (result) =>
        result?.businesses?.length
          ? [
              ...result.businesses.map((b) => ({ type: 'SecretaryLocalBusinesses', id: b._id })),
              'SecretaryLocalBusinesses',
            ]
          : ['SecretaryLocalBusinesses'],
    }),

    fetchSecretaryLocalBusinessById: builder.query({
      query: (businessId) => ({ url: `/local-businesses/${businessId}`, method: 'GET' }),
      transformResponse: (response) => response?.data?.business || null,
      providesTags: (result, error, businessId) => [
        { type: 'SecretaryLocalBusinesses', id: businessId },
      ],
    }),

    createSecretaryLocalBusiness: builder.mutation({
      query: (payload) => {
        const formData = buildLocalBusinessFormData(payload);
        return {
          url: '/local-businesses',
          method: 'POST',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        };
      },
      transformResponse: (response) => response?.data?.business,
      invalidatesTags: ['SecretaryLocalBusinesses'],
    }),

    updateSecretaryLocalBusiness: builder.mutation({
      query: ({ businessId, payload }) => {
        // Plain JSON when no new logo/banner — backend passes through non-multipart
        // requests untouched, so we skip FormData overhead unless images changed.
        if (!payload?.logo?.uri && !payload?.banner?.uri) {
          return {
            url: `/local-businesses/${businessId}`,
            method: 'PUT',
            data: payload,
          };
        }
        const formData = buildLocalBusinessFormData(payload);
        return {
          url: `/local-businesses/${businessId}`,
          method: 'PUT',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        };
      },
      transformResponse: (response) => response?.data?.business,
      invalidatesTags: (result, error, { businessId }) => [
        { type: 'SecretaryLocalBusinesses', id: businessId },
        'SecretaryLocalBusinesses',
      ],
    }),

    updateSecretaryLocalBusinessStatus: builder.mutation({
      query: ({ businessId, status }) => ({
        url: `/local-businesses/${businessId}/status`,
        method: 'PATCH',
        data: { status },
      }),
      // Optimistic flip — mirrors updateCategoryToggle/updateEventToggle pattern.
      // Patches every cached list variant (different search/category/status filters).
      async onQueryStarted({ businessId, status }, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const cacheKeys = secretaryApi.util.selectCachedArgsForQuery(
          getState(),
          'fetchSecretaryLocalBusinesses'
        );

        cacheKeys.forEach((args) => {
          patches.push(
            dispatch(
              secretaryApi.util.updateQueryData('fetchSecretaryLocalBusinesses', args, (draft) => {
                const target = draft.businesses?.find((b) => b._id === businessId);
                if (target) target.status = status;
              })
            )
          );
        });

        try {
          await queryFulfilled;
        } catch (_) {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { businessId }) => [
        { type: 'SecretaryLocalBusinesses', id: businessId },
      ],
    }),

    deleteSecretaryLocalBusiness: builder.mutation({
      query: (businessId) => ({
        url: `/local-businesses/${businessId}`,
        method: 'DELETE',
      }),
      // Optimistic removal from every cached list variant
      async onQueryStarted(businessId, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const cacheKeys = secretaryApi.util.selectCachedArgsForQuery(
          getState(),
          'fetchSecretaryLocalBusinesses'
        );

        cacheKeys.forEach((args) => {
          patches.push(
            dispatch(
              secretaryApi.util.updateQueryData('fetchSecretaryLocalBusinesses', args, (draft) => {
                draft.businesses = draft.businesses?.filter((b) => b._id !== businessId) || [];
              })
            )
          );
        });

        try {
          await queryFulfilled;
        } catch (_) {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: ['SecretaryLocalBusinesses'],
    }),

  }),
});

export const {
  useFetchPendingRegistrationsQuery,
  useApproveUserRegistrationMutation,
  useRejectUserRegistrationMutation,
  useFetchCommunityMembersQuery,
  useFetchSecretaryMemberByIdQuery,
  useUpdateCommunityMemberStatusMutation,
  useFetchFeatureTogglesQuery,
  useUpdateFeatureToggleMutation,
  useFetchEventTogglesQuery,           // ← new
  useUpdateEventToggleMutation,        // ← new
  useFetchCommunityEventsQuery,
  useCreateCommunityEventMutation,
  useDeleteCommunityEventMutation,
  useFetchBroadcastsQuery,
  useCreateBroadcastMutation,
  useDeleteBroadcastMutation,
  useFetchCategoryTogglesQuery,
  useUpdateCategoryToggleMutation,
  useFetchCommunityMembersCountQuery,

  // ── Vendors ──
  useFetchVendorCategoriesQuery,
  useFetchSecretaryVendorsQuery,
  useCreateSecretaryVendorMutation,
  useDeleteSecretaryVendorMutation,

  // ── Emergency Contacts ──
  useFetchSecretaryEmergencyContactsQuery,
  useCreateSecretaryEmergencyContactMutation,
  useDeleteSecretaryEmergencyContactMutation,

  // ── Reviews ──
  useFetchSecretaryReviewsQuery,
  useUpdateSecretaryReviewMutation,
  useDeleteSecretaryReviewMutation,

  // ── Local Businesses ──
  useFetchBusinessCategoriesQuery,
  useFetchSecretaryLocalBusinessesQuery,
  useFetchSecretaryLocalBusinessByIdQuery,
  useCreateSecretaryLocalBusinessMutation,
  useUpdateSecretaryLocalBusinessMutation,
  useUpdateSecretaryLocalBusinessStatusMutation,
  useDeleteSecretaryLocalBusinessMutation,

} = secretaryApi;