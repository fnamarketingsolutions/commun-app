// src/redux/service/localBusinessMemberApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';
import apiClient from './apiClient';

const API_ROOT = (apiClient.defaults.baseURL || '').replace(/\/user\/?$/, '');

export const localBusinessMemberApi = createApi({
  reducerPath: 'localBusinessMemberApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['MemberBusinessCategories', 'CommunityLocalBusinesses'],
  endpoints: (builder) => ({
    fetchMemberBusinessCategories: builder.query({
      query: () => ({
        url: `${API_ROOT}/local-businesses/categories`,
        method: 'GET',
      }),
      transformResponse: (response) => response?.data?.categories || [],
      providesTags: ['MemberBusinessCategories'],
      keepUnusedDataFor: 3600,
    }),

    fetchCommunityLocalBusinesses: builder.query({
      query: ({ search = '', category = '' } = {}) => ({
        url: `${API_ROOT}/local-businesses/community`,
        method: 'GET',
        params: {
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
        },
      }),
      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          businesses: data.businesses || [],
          communityCommunName: data.communityCommunName || null,
          needsCommunity: Boolean(data.needsCommunity),
          asOf: data.asOf || null,
        };
      },
      providesTags: (result) =>
        result?.businesses?.length
          ? [
              ...result.businesses.map((b) => ({ type: 'CommunityLocalBusinesses', id: b._id })),
              'CommunityLocalBusinesses',
            ]
          : ['CommunityLocalBusinesses'],
    }),

    fetchCommunityLocalBusinessById: builder.query({
      query: (businessId) => ({
        url: `${API_ROOT}/local-businesses/community/${businessId}`,
        method: 'GET',
      }),
      transformResponse: (response) => response?.data?.business || null,
      providesTags: (result, error, businessId) => [
        { type: 'CommunityLocalBusinesses', id: businessId },
      ],
    }),
  }),
});

export const {
  useFetchMemberBusinessCategoriesQuery,
  useLazyFetchMemberBusinessCategoriesQuery,
  useFetchCommunityLocalBusinessesQuery,
  useLazyFetchCommunityLocalBusinessesQuery,   // ✅ now exported
  useFetchCommunityLocalBusinessByIdQuery,
  useLazyFetchCommunityLocalBusinessByIdQuery,
} = localBusinessMemberApi;