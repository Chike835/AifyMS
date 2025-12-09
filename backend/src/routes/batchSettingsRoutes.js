import express from 'express';
import {
  getAllTypes,
  createType,
  updateType,
  deleteType,
  getTypesByCategory,
  assignTypeToCategory,
  removeTypeFromCategory,
  getCategoryAssignments,
  setDefaultBatchType,
  getDefaultBatchType
} from '../controllers/BatchSettingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Default batch type (must be before :id route to avoid conflict)
router.get('/types/default', requirePermission('product_view'), getDefaultBatchType);
router.put('/types/:id/set-default', requirePermission('settings_manage'), setDefaultBatchType);

// Batch Type CRUD (requires settings_manage)
router.get('/types', requirePermission('settings_manage'), getAllTypes);
router.post('/types', requirePermission('settings_manage'), createType);
router.put('/types/:id', requirePermission('settings_manage'), updateType);
router.delete('/types/:id', requirePermission('settings_manage'), deleteType);

// Get types by category (used during product creation - requires view permission)
router.get('/types/category/:categoryId', requirePermission('product_view'), getTypesByCategory);

// Category-Batch Type Assignment Management (requires settings_manage)
router.get('/assignments', requirePermission('settings_manage'), getCategoryAssignments);
router.post('/assignments', requirePermission('settings_manage'), assignTypeToCategory);
router.delete('/assignments', requirePermission('settings_manage'), removeTypeFromCategory);

export default router;


