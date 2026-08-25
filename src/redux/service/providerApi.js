// src/redux/service/providerApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { providerAxiosBaseQuery } from './providerAxiosBaseQuery';

export const providerApi = createApi({
  reducerPath: 'providerApi',
  baseQuery: providerAxiosBaseQuery(),
  tagTypes: ['MyProfile', 'DashboardStats', 'AllProviders', 'ProviderDetail'],
  endpoints: (builder) => ({

    // ─── Private: provider's own profile ─────────────────────────────────────

    // GET /api/provider-profile/my-profile
    // Returns: { provider: { _id, user, bio, providerProfileCount, serviceOfferings[] } }
    fetchMyProviderProfile: builder.query({
      query: () => ({ url: '/my-profile', method: 'GET' }),
      transformResponse: (response) => response?.provider || null,
      providesTags: ['MyProfile'],
    }),

    // GET /api/provider-profile/dashboard/stats
    // Returns: { data: { totalBookings, statusCounts, totalServices, averageRating,
    //             totalReviews, profileViews, serviceClicks, serviceClickDetails[],
    //             recentBookings[], upcomingBookings[] } }
    fetchProviderDashboardStats: builder.query({
      query: () => ({ url: '/dashboard/stats', method: 'GET' }),
      transformResponse: (response) => response?.data || null,
      providesTags: ['DashboardStats'],
    }),

    // PUT /api/provider-profile/
    // Body: { bio }
    updateProviderProfile: builder.mutation({
      query: ({ bio }) => ({
        url: '/',
        method: 'PUT',
        data: { bio },
      }),
      transformResponse: (response) => response?.profile || null,
      invalidatesTags: ['MyProfile', { type: 'AllProviders', id: 'LIST' }],
    }),

    // ─── Service offerings (JSON flow, S3 already handled client-side) ────────

    // POST /api/provider-profile/service-json
    // Body: { servicename, serviceCategory, subCategories[], keywords[],
    //         description, experience?, portfolioImages[], portfolioPDFs[] }
    createServiceOffering: builder.mutation({
      query: (body) => ({
        url: '/service-json',
        method: 'POST',
        data: body,
      }),
      transformResponse: (response) => response?.service || null,
      invalidatesTags: ['MyProfile', 'DashboardStats'],
    }),

    // PUT /api/provider-profile/service-json/:serviceId
    // Body: same as create + portfolioImages/PDFs includes retained existing ones
    updateServiceOffering: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/service-json/${serviceId}`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (response) => response?.service || null,
      invalidatesTags: ['MyProfile', 'DashboardStats'],
    }),

    // DELETE /api/provider-profile/service/:serviceId
    deleteServiceOffering: builder.mutation({
      query: (serviceId) => ({
        url: `/service/${serviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MyProfile', 'DashboardStats'],
    }),

    // ─── S3 presign (upload URL for images/PDFs before creating/editing) ──────

    // POST /api/provider-profile/s3-presign
    // Body: { filename, contentType }
    // Returns: { uploadUrl, publicUrl, public_id }
    getS3PresignedUrl: builder.mutation({
      query: ({ filename, contentType }) => ({
        url: '/s3-presign',
        method: 'POST',
        data: { filename, contentType },
      }),
      transformResponse: (response) => ({
        uploadUrl: response?.uploadUrl,
        publicUrl: response?.publicUrl,
        public_id: response?.public_id,
      }),
    }),

    // ─── Public endpoints ─────────────────────────────────────────────────────

    // GET /api/provider-profile/
    // Returns: { providers: ProviderProfile[] } (approved only)
    fetchAllProviders: builder.query({
      query: () => ({ url: '/', method: 'GET' }),
      transformResponse: (response) => response?.providers || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: 'AllProviders', id: p._id })),
              { type: 'AllProviders', id: 'LIST' },
            ]
          : [{ type: 'AllProviders', id: 'LIST' }],
    }),

    // GET /api/provider-profile/top-providers?limit=N
    fetchTopProviders: builder.query({
      query: (limit = 3) => ({
        url: '/top-providers',
        method: 'GET',
        params: { limit },
      }),
      transformResponse: (response) => response?.providers || [],
    }),

    // GET /api/provider-profile/:id
    // Returns: { provider: { ...ProviderProfile, stats: { averageRating, totalReviews } } }
    fetchProviderById: builder.query({
      query: (providerProfileId) => ({
        url: `/${providerProfileId}`,
        method: 'GET',
      }),
      transformResponse: (response) => response?.provider || null,
      providesTags: (result, error, id) => [{ type: 'ProviderDetail', id }],
    }),

    // POST /api/provider-profile/:id/increment-count
    // Increments provider profile view counter (fire-and-forget)
    incrementProviderProfileCount: builder.mutation({
      query: (providerProfileId) => ({
        url: `/${providerProfileId}/increment-count`,
        method: 'POST',
      }),
    }),

  }),
});

export const {
  // Private
  useFetchMyProviderProfileQuery,
  useFetchProviderDashboardStatsQuery,
  useUpdateProviderProfileMutation,
  useCreateServiceOfferingMutation,
  useUpdateServiceOfferingMutation,
  useDeleteServiceOfferingMutation,
  useGetS3PresignedUrlMutation,
  // Public
  useFetchAllProvidersQuery,
  useFetchTopProvidersQuery,
  useFetchProviderByIdQuery,
  useIncrementProviderProfileCountMutation,
} = providerApi;