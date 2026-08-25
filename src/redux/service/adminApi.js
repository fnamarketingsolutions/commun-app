// src/redux/service/adminApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { adminAxiosBaseQuery } from './adminAxiosBaseQuery';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: adminAxiosBaseQuery(),
  tagTypes: ['Categories'],
  endpoints: (builder) => ({

    // GET /api/admin/categories/active
    // Returns active categories with their subCategories[] and keywords[]
    // Used by CreateServiceScreen and EditServiceScreen to build the
    // category → subCategory → keyword selection UI.
    fetchActiveCategories: builder.query({
      query: () => ({ url: '/', method: 'GET' }),
      transformResponse: (response) => {
        // Response shape: { success, categories: [{ name, subCategories[], keywords[] }] }
        const raw = response?.categories || response?.data?.categories || [];
        // Build the RULES map the screens expect:
        // { [categoryName]: { subCategories: string[], keywords: string[] } }
        const rules = {};
        raw.forEach((c) => {
          rules[c.name] = {
            subCategories: c.subCategories || [],
            keywords: c.keywords || [],
          };
        });
        return { categories: raw, rules };
      },
      providesTags: ['Categories'],
    }),

  }),
});

export const {
  useFetchActiveCategoriesQuery,
} = adminApi;