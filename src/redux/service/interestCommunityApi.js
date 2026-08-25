// redux/service/interestCommunityApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { rootAxiosBaseQuery } from './rootAxiosBaseQuery';

export const interestCommunityApi = createApi({
  reducerPath: 'interestCommunityApi',
  baseQuery: rootAxiosBaseQuery(),
  tagTypes: ['Communities', 'Members', 'Messages'],
  endpoints: (builder) => ({
    // GET /api/interest-communities
    fetchInterestCommunities: builder.query({
      query: () => ({ url: '/api/interest-communities', method: 'GET' }),
      transformResponse: (response) => response?.data?.communities || [],
      providesTags: ['Communities'],
    }),

    // POST /api/interest-communities/:id/join
    joinCommunity: builder.mutation({
      query: (id) => ({ url: `/api/interest-communities/${id}/join`, method: 'POST' }),
      // Optimistically flip `joined` on the cached list the instant the
      // request succeeds, instead of waiting on a background refetch that
      // may not resolve before the screen unmounts.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          interestCommunityApi.util.updateQueryData(
            'fetchInterestCommunities',
            undefined,
            (draft) => {
              // Normalize both sides to string before comparing — mismatched
              // ObjectId vs string types here caused find() to silently
              // return undefined, so the patch never applied and left
              // corrupted/incomplete entries in the cache.
              const community = draft.find((c) => String(c._id) === String(id));
              if (community) {
                community.joined = true;
                community.memberCount = (community.memberCount || 0) + 1;
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          // Server rejected the join — roll back the optimistic patch so the
          // UI doesn't show "Open Chat" for a community the user never
          // actually joined.
          patchResult.undo();
        }
      },
    }),

    // POST /api/interest-communities/:id/leave
    leaveCommunity: builder.mutation({
      query: (id) => ({ url: `/api/interest-communities/${id}/leave`, method: 'POST' }),
      // Mirror the same optimistic pattern for leave, for the same reason.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          interestCommunityApi.util.updateQueryData(
            'fetchInterestCommunities',
            undefined,
            (draft) => {
              const community = draft.find((c) => String(c._id) === String(id));
              if (community) {
                community.joined = false;
                community.memberCount = Math.max(0, (community.memberCount || 1) - 1);
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // GET /api/interest-communities/:id/members
    getMembers: builder.query({
      query: (id) => ({ url: `/api/interest-communities/${id}/members`, method: 'GET' }),
      transformResponse: (response) => ({
        members: response?.data?.members || [],
        communName: response?.data?.communName,
        communLabel: response?.data?.communLabel,
      }),
      providesTags: (result, error, id) => [{ type: 'Members', id }],
    }),

    // GET /api/interest-communities/:id/messages?limit=50
    getMessages: builder.query({
      query: ({ id, limit = 50 }) => ({
        url: `/api/interest-communities/${id}/messages`,
        method: 'GET',
        params: { limit },
      }),
      transformResponse: (response) => response?.data?.messages || [],
      providesTags: (result, error, { id }) => [{ type: 'Messages', id }],
    }),
  }),
});

export const {
  useFetchInterestCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useGetMembersQuery,
  useGetMessagesQuery,
} = interestCommunityApi;