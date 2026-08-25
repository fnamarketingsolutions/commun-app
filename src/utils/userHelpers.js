/**
 * Get the full name of a user object.
 * @param {Object} user - User object (may contain firstName, lastName, name, email)
 * @returns {string} - The best available full name
 */
export const getFullName = (user) => {
  if (!user) return '';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0] || 'User';
  return 'Unknown';
};

/**
 * Get the display name for a user (shorter version).
 * @param {Object} user
 * @returns {string}
 */
export const getDisplayName = (user) => {
  if (!user) return '';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName) return `${firstName} ${lastName ? lastName[0] : ''}`.trim();
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0] || 'User';
  return 'User';
};

/**
 * Check if a user has a specific role.
 * @param {Object} user
 * @param {string} role - e.g., 'provider', 'customer', 'secretary', 'admin'
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  return user.role === role;
};