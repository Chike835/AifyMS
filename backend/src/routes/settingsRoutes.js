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

// Get settings (authenticated users can view)
router.get('/', authenticate, getSettings);

// Update single setting (requires permission)
router.put('/:key', authenticate, requirePermission('settings_manage'), updateSetting);

// Bulk update settings (requires permission)
router.put('/', authenticate, requirePermission('settings_manage'), bulkUpdateSettings);

// Test print (requires permission)
router.post('/test-print', authenticate, requirePermission('settings_manage'), testPrint);

export default router;


