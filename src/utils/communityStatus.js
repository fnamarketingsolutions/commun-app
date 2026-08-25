// utils/communityStatus.js

/**
 * Derives a single source-of-truth approval status for a user's
 * community membership.
 *
 * Returns one of:
 *  - 'none'     -> user has not requested to join any community
 *  - 'pending'   -> join request sent, waiting on secretary approval
 *  - 'approved'  -> secretary approved, full community features unlocked
 *
 * NOTE: mirrors the same rule used elsewhere in the app —
 * accountStatus === 'approved' AND the user is NOT a public member.
 */
export const getCommunityApprovalStatus = (user) => {
  if (!user) return 'none';

  const hasRequestedCommunity = Boolean(user.communityCommunName || user.communityId);
  if (!hasRequestedCommunity) return 'none';

  const isApproved =
    user.accountStatus === 'approved' && user.isPublicMember !== true;

  if (isApproved) return 'approved';

  return 'pending';
};

export const isCommunityApproved = (user) =>
  getCommunityApprovalStatus(user) === 'approved';

export const isCommunityPending = (user) =>
  getCommunityApprovalStatus(user) === 'pending';