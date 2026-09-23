
import { createApi } from '@reduxjs/toolkit/query/react';
import { bannerAxiosBaseQuery } from './bannerAxiosBaseQuery';

export const bannerApi = createApi({
  reducerPath: 'bannerApi',
  baseQuery: bannerAxiosBaseQuery(),
  tagTypes: ['Banners'],
  endpoints: (builder) => ({
    getActiveBanners: builder.query({
      query: () => ({
        url: '/',
        method: 'GET',
      }),
      transformResponse: (response) => {
        // response: { success: true, banners: [...] }
        return response?.banners || [];
      },
      providesTags: ['Banners'],
    }),
  }),
});

export const { useGetActiveBannersQuery } = bannerApi;