/**
 * Authorization Helpers
 * Utility functions for permission-based access control
 * 
 * DESIGN NOTE: These helpers replace hardcoded role name checks (e.g., 'Super Admin')
 * with permission-based logic for better flexibility and maintainability.
 */

/**
 * Check if user has global branch access (can operate across all branches)
 * This replaces hardcoded `req.user?.role_name === 'Super Admin'` checks
 * 
 * @param {Object} user - The user object from req.user
 * @returns {boolean} True if user can access all branches
 */
export const hasGlobalBranchAccess = (user) => {
    if (!user) return false;

    // Check for the explicit global access permission
    if (user.permissions?.includes('branch_access_all')) {
        return true;
    }

    // Fallback: Legacy check for Super Admin role name
    // TODO: Remove this fallback after all Super Admin roles have 'branch_access_all' permission
    if (user.role_name === 'Super Admin') {
        return true;
    }

    return false;
};

/**
 * Get the effective branch ID for a request
 * Returns the user's branch if they don't have global access
 * 
 * @param {Object} user - The user object from req.user
 * @param {string|null} requestedBranchId - The branch_id requested (from query/body)
 * @returns {string|null} The effective branch ID to use
 */
export const getEffectiveBranchId = (user, requestedBranchId = null) => {
    if (!user) return requestedBranchId;

    // If user has global access, allow any branch
    if (hasGlobalBranchAccess(user)) {
        return requestedBranchId || user.branch_id;
    }

    // Non-global users must use their own branch
    return user.branch_id;
};

/**
 * Validate that a user can operate on a specific branch
 * 
 * @param {Object} user - The user object from req.user
 * @param {string} targetBranchId - The branch ID being accessed
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export const validateBranchAccess = (user, targetBranchId) => {
    if (!user) {
        return { valid: false, error: 'User not authenticated' };
    }

    // Global access users can access any branch
    if (hasGlobalBranchAccess(user)) {
        return { valid: true };
    }

    // Non-global users can only access their own branch
    if (!user.branch_id) {
        return { valid: false, error: 'User has no branch assigned' };
    }

    if (targetBranchId && targetBranchId !== user.branch_id) {
        return { valid: false, error: 'You can only access your own branch' };
    }

    return { valid: true };
};

/**
 * Build a branch filter for Sequelize queries
 * Automatically applies branch restriction for non-global users
 * 
 * @param {Object} user - The user object from req.user
 * @param {string} branchIdField - The field name for branch_id in the where clause
 * @returns {Object} Where clause fragment for branch filtering
 */
export const buildBranchFilter = (user, branchIdField = 'branch_id') => {
    if (!user) return {};

    // Global access users see all branches (no filter)
    if (hasGlobalBranchAccess(user)) {
        return {};
    }

    // Non-global users only see their branch
    if (user.branch_id) {
        return { [branchIdField]: user.branch_id };
    }

    return {};
};
