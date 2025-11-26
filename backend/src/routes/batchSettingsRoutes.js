import express from 'express';
import {
  getAllTypes,
  createType,
  updateType,
  deleteType,
  getTypesByCategory,
  assignTypeToCategory,
  removeTypeFromCategory,
  getCategoryAssignments
} from '../controllers/BatchSettingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Batch Type CRUD (requires admin_access)
router.get('/types', requirePermission('admin_access'), getAllTypes);
router.post('/types', requirePermission('admin_access'), createType);
router.put('/types/:id', requirePermission('admin_access'), updateType);
router.delete('/types/:id', requirePermission('admin_access'), deleteType);

// Get types by category (public for product creation, but authenticated)
router.get('/types/category/:categoryId', getTypesByCategory);

// Category-Batch Type Assignment Management (requires admin_access)
router.get('/assignments', requirePermission('admin_access'), getCategoryAssignments);
router.post('/assignments', requirePermission('admin_access'), assignTypeToCategory);
router.delete('/assignments', requirePermission('admin_access'), removeTypeFromCategory);

export default router;


