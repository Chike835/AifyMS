import { ActivityLog } from '../models/index.js';

/**
 * Log activity to activity_logs table
 * @param {string} actionType - LOGIN, CREATE, UPDATE, DELETE, PRINT, CONFIRM, VOID
 * @param {string} module - Module name (e.g., 'sales', 'purchases', 'payments')
 * @param {string} description - Activity description
 * @param {object} req - Express request object
 * @param {string} referenceType - Optional reference type (e.g., 'sales_order', 'payment')
 * @param {string} referenceId - Optional reference ID (UUID)
 */
export const logActivity = async (actionType, module, description, req, referenceType = null, referenceId = null) => {
  try {
    if (!req.user || !req.user.id) {
      // Skip logging if user is not authenticated
      return;
    }

    // Extract IP address
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     null;

    // Extract branch_id from user or request body
    const branchId = req.user.branch_id || req.body.branch_id || null;

    await ActivityLog.create({
      user_id: req.user.id,
      action_type: actionType,
      module: module,
      description: description,
      ip_address: ipAddress,
      branch_id: branchId,
      reference_type: referenceType,
      reference_id: referenceId,
      timestamp: new Date()
    });
  } catch (error) {
    // Don't throw error - logging should not break the application
    console.error('Error logging activity:', error);
  }
};

/**
 * Create middleware wrapper for automatic activity logging
 * @param {string} actionType - LOGIN, CREATE, UPDATE, DELETE, PRINT, CONFIRM, VOID
 * @param {string} module - Module name
 * @param {function} getDescription - Function to generate description from req/res
 * @param {function} getReference - Optional function to get reference_type and reference_id from req/res
 * @returns {function} Express middleware
 */
export const activityLogger = (actionType, module, getDescription, getReference = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Log activity after response is sent
      setImmediate(async () => {
        try {
          const description = typeof getDescription === 'function' 
            ? getDescription(req, data) 
            : getDescription || `${actionType} action in ${module}`;
          
          let referenceType = null;
          let referenceId = null;
          
          if (getReference && typeof getReference === 'function') {
            const ref = getReference(req, data);
            if (ref) {
              referenceType = ref.reference_type || null;
              referenceId = ref.reference_id || null;
            }
          } else {
            // Try to extract from request params or body
            referenceId = req.params.id || req.body.id || null;
            referenceType = module; // Default to module name
          }
          
          await logActivity(actionType, module, description, req, referenceType, referenceId);
        } catch (error) {
          console.error('Error in activity logger middleware:', error);
        }
      });
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Simple activity logger that logs immediately (for synchronous operations)
 * @param {string} actionType - LOGIN, CREATE, UPDATE, DELETE, PRINT, CONFIRM, VOID
 * @param {string} module - Module name
 * @param {string} description - Activity description
 * @param {object} req - Express request object
 * @param {string} referenceType - Optional reference type
 * @param {string} referenceId - Optional reference ID
 */
export const logActivitySync = async (actionType, module, description, req, referenceType = null, referenceId = null) => {
  await logActivity(actionType, module, description, req, referenceType, referenceId);
};






















