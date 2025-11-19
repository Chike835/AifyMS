/**
 * Middleware factory to check if user has required permission
 * Must be used after authenticate middleware
 * 
 * @param {string|string[]} requiredPermission - Permission slug(s) required
 * @param {object} options - Options for permission check
 * @param {boolean} options.requireAll - If true, user must have ALL permissions (default: false, requires ANY)
 * @returns {Function} Express middleware function
 */
export const requirePermission = (requiredPermission, options = {}) => {
  const { requireAll = false } = options;
  const permissions = Array.isArray(requiredPermission) 
    ? requiredPermission 
    : [requiredPermission];

  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin bypass (has all permissions)
    if (req.user.role_name === 'Super Admin') {
      return next();
    }

    // Check permissions
    const userPermissions = req.user.permissions || [];

    if (requireAll) {
      // User must have ALL required permissions
      const hasAll = permissions.every(perm => userPermissions.includes(perm));
      if (!hasAll) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          missing: permissions.filter(perm => !userPermissions.includes(perm))
        });
      }
    } else {
      // User must have AT LEAST ONE of the required permissions
      const hasAny = permissions.some(perm => userPermissions.includes(perm));
      if (!hasAny) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions
        });
      }
    }

    next();
  };
};

/**
 * Middleware to check if user belongs to a specific branch
 * Useful for branch-scoped operations
 */
export const requireBranchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super Admin can access all branches
  if (req.user.role_name === 'Super Admin') {
    return next();
  }

  // Branch Manager can only access their own branch
  const requestedBranchId = req.params.branchId || req.body.branch_id || req.query.branch_id;
  
  if (requestedBranchId && req.user.branch_id !== requestedBranchId) {
    return res.status(403).json({ error: 'Access denied to this branch' });
  }

  next();
};

/**
 * Middleware to check if user has global view access
 * Used for endpoints that show data across all branches
 */
export const requireGlobalAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check for global view permission
  if (req.user.role_name === 'Super Admin' || 
      req.user.permissions.includes('user_view_global')) {
    return next();
  }

  return res.status(403).json({ error: 'Global access required' });
};

