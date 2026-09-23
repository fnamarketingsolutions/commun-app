import { createApi } from '@reduxjs/toolkit/query/react';
import { commentAxiosBaseQuery } from './commentAxiosBaseQuery';

export const commentApi = createApi({
  reducerPath: 'commentApi',
  baseQuery: commentAxiosBaseQuery(),
  tagTypes: ['Comments', 'CanReview', 'TopServices', 'TopCategories'],
  endpoints: (builder) => ({


    getCommentsByService: builder.query({
      query: (serviceId) => ({
        url: `/get-comments/${serviceId}`,
        method: 'GET',
      }),
      providesTags: (result, error, serviceId) => [{ type: 'Comments', id: serviceId }],
    }),


    canReviewService: builder.query({
      query: (serviceId) => ({
        url: `/can-review/${serviceId}`,
        method: 'GET',
      }),
      providesTags: (result, error, serviceId) => [{ type: 'CanReview', id: serviceId }],
    }),


    createComment: builder.mutation({
      // arg: { serviceId, comment, rating }
      query: ({ serviceId, comment, rating }) => ({
        url: `/create-comment/${serviceId}`,
        method: 'POST',
        data: { comment, rating },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }, { type: 'CanReview', id: serviceId }],
    }),


    updateComment: builder.mutation({

      query: ({ commentId, comment, rating }) => ({
        url: `/update-comment/${commentId}`,
        method: 'PUT',
        data: { comment, rating },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),


    deleteComment: builder.mutation({

      query: ({ commentId }) => ({
        url: `/delete/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }, { type: 'CanReview', id: serviceId }],
    }),


    addReply: builder.mutation({

      query: ({ commentId, reply }) => ({
        url: `/reply/${commentId}`,
        method: 'POST',
        data: { reply },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),


    updateReply: builder.mutation({

      query: ({ commentId, reply }) => ({
        url: `/reply/${commentId}`,
        method: 'PUT',
        data: { reply },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),


    deleteReply: builder.mutation({

      query: ({ commentId }) => ({
        url: `/reply/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),


    getTopServices: builder.query({
      query: (limit) => ({
        url: '/top-services',
        method: 'GET',
        params: limit ? { limit } : undefined,
      }),
      providesTags: ['TopServices'],
    }),


    getTopCategories: builder.query({
      query: (limit) => ({
        url: '/top-categories',
        method: 'GET',
        params: limit ? { limit } : undefined,
      }),
      providesTags: ['TopCategories'],
    }),

  }),
});

export const {
  useGetCommentsByServiceQuery,
  useLazyGetCommentsByServiceQuery,
  useCanReviewServiceQuery,
  useLazyCanReviewServiceQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddReplyMutation,
  useUpdateReplyMutation,
  useDeleteReplyMutation,
  useGetTopServicesQuery,
  useGetTopCategoriesQuery,
} = commentApi;