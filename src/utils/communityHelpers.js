// utils/communityHelpers.js

/**
 * Extracts the community name from a user object.
 * Handles multiple possible field names from the backend.
 *
 * Field origins:
 * - communityCommunName / communityName / community.* → set on a MEMBER
 *   when they join an existing community by name.
 * - communName → set on a SECRETARY, representing the community they
 *   own/manage. Secretaries don't "join" a community the way members do,
 *   so their community lives under this separate field and was previously
 *   not checked here at all — causing getUserCommunityName() to always
 *   return null for secretaries, even when they clearly belong to (and run)
 *   a community.
 */
export const getUserCommunityName = (user) => {
  if (!user) return null;

  const name =
    user.communityCommunName ||
    user.communityName ||
    user.community?.name ||
    user.community?.communName ||
    user.community?.communityName ||
    user.communName; // ← secretary's own community name

  // '__other__' means no real community → treat as null
  return (name && name !== '__other__') ? String(name).trim() : null;
};

/**
 * Determines if a user's community request is still pending approval.
 * Adjust logic based on your actual status fields.
 */
export const isCommunityPending = (user) => {
  if (!user) return false;
  // Example: check accountStatus or communityStatus
  return user.accountStatus === 'pending' || user.communityStatus === 'pending';
};