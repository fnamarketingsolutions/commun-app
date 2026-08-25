import { createApi } from '@reduxjs/toolkit/query/react';
import { commentAxiosBaseQuery } from './commentAxiosBaseQuery';

export const commentApi = createApi({
  reducerPath: 'commentApi',
  baseQuery: commentAxiosBaseQuery(),
  tagTypes: ['Comments', 'CanReview', 'TopServices', 'TopCategories'],
  endpoints: (builder) => ({

    // GET /api/comments/get-comments/:serviceId
    // Public — returns { comments, serviceProvider }
    getCommentsByService: builder.query({
      query: (serviceId) => ({
        url: `/get-comments/${serviceId}`,
        method: 'GET',
      }),
      providesTags: (result, error, serviceId) => [{ type: 'Comments', id: serviceId }],
    }),

    // GET /api/comments/can-review/:serviceId
    // Private (customer) — returns { canReview: boolean }
    canReviewService: builder.query({
      query: (serviceId) => ({
        url: `/can-review/${serviceId}`,
        method: 'GET',
      }),
      providesTags: (result, error, serviceId) => [{ type: 'CanReview', id: serviceId }],
    }),

    // POST /api/comments/create-comment/:serviceId
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

    // PUT /api/comments/update-comment/:commentId
    updateComment: builder.mutation({
      // arg: { commentId, serviceId, comment, rating }
      // serviceId is required client-side only, to invalidate the right cache entry
      query: ({ commentId, comment, rating }) => ({
        url: `/update-comment/${commentId}`,
        method: 'PUT',
        data: { comment, rating },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),

    // DELETE /api/comments/delete/:commentId
    deleteComment: builder.mutation({
      // arg: { commentId, serviceId }
      query: ({ commentId }) => ({
        url: `/delete/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }, { type: 'CanReview', id: serviceId }],
    }),

    // POST /api/comments/reply/:commentId
    addReply: builder.mutation({
      // arg: { commentId, serviceId, reply }
      query: ({ commentId, reply }) => ({
        url: `/reply/${commentId}`,
        method: 'POST',
        data: { reply },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),

    // PUT /api/comments/reply/:commentId
    updateReply: builder.mutation({
      // arg: { commentId, serviceId, reply }
      query: ({ commentId, reply }) => ({
        url: `/reply/${commentId}`,
        method: 'PUT',
        data: { reply },
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),

    // DELETE /api/comments/reply/:commentId
    deleteReply: builder.mutation({
      // arg: { commentId, serviceId }
      query: ({ commentId }) => ({
        url: `/reply/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { serviceId }) =>
        error ? [] : [{ type: 'Comments', id: serviceId }],
    }),

    // GET /api/comments/top-services?limit=6
    getTopServices: builder.query({
      query: (limit) => ({
        url: '/top-services',
        method: 'GET',
        params: limit ? { limit } : undefined,
      }),
      providesTags: ['TopServices'],
    }),

    // GET /api/comments/top-categories?limit=6
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