// src/redux/service/serviceOfferingApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { serviceOfferingAxiosBaseQuery } from './serviceOfferingAxiosBaseQuery';

export const serviceOfferingApi = createApi({
  reducerPath: 'serviceOfferingApi',
  baseQuery: serviceOfferingAxiosBaseQuery(),
  tagTypes: ['ServiceOffering', 'CommunityServices'],
  endpoints: (builder) => ({

    // POST /api/service-offering/:id/increment-count
    incrementServiceOfferingCount: builder.mutation({
      query: (serviceId) => ({
        url: `/${serviceId}/increment-count`,
        method: 'POST',
      }),
    }),

    // GET /api/service-offering/community?page=1&limit=50
    fetchCommunityServices: builder.query({
      query: ({ page = 1, limit = 50, category } = {}) => {
        const params = { page, limit };
        if (category) params.category = category;
        return {
          url: '/community',
          method: 'GET',
          params,
        };
      },
      transformResponse: (response) => ({
        services: response?.services || [],
        pagination: response?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 },
        communityCommunName: response?.communityCommunName || null,
        needsCommunity: response?.needsCommunity || false,
      }),
      providesTags: ['CommunityServices'],
    }),

  }),
});

export const {
  useIncrementServiceOfferingCountMutation,
  useFetchCommunityServicesQuery,
  useLazyFetchCommunityServicesQuery, // ← new: used by CategoryServicesScreen
} = serviceOfferingApi;