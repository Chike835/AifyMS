import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getSettings,
  updateSetting,
  bulkUpdateSettings,
  testPrint
} from '../controllers/settingsController.js';

const router = express.Router();

const settingsManageMiddleware = requirePermission('settings_manage');
const SAFE_SETTINGS_CATEGORIES = new Set(['manufacturing']);

const ensureSettingsAccess = (req, res, next) => {
  const requestedCategory = req.query?.category;
  if (requestedCategory && SAFE_SETTINGS_CATEGORIES.has(requestedCategory)) {
    return next();
  }
  return settingsManageMiddleware(req, res, next);
};

// Get settings (authenticated users can view manufacturing data; other categories require settings_manage)
router.get('/', authenticate, ensureSettingsAccess, getSettings);

// Update single setting (requires permission)
router.put('/:key', authenticate, requirePermission('settings_manage'), updateSetting);

// Bulk update settings (requires permission)
router.put('/', authenticate, requirePermission('settings_manage'), bulkUpdateSettings);

// Test print (requires permission)
router.post('/test-print', authenticate, requirePermission('settings_manage'), testPrint);

export default router;


