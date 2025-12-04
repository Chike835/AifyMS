import express from 'express';
import {
  assignMaterial,
  getMaterialAssignments
} from '../controllers/productionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/production/assign-material - Assign material to sales item (requires production_update_status)
router.post('/assign-material', requirePermission('production_update_status'), assignMaterial);

// GET /api/production/assignments/:sales_item_id - Get assignments for sales item (requires production_view_queue)
router.get('/assignments/:sales_item_id', requirePermission('production_view_queue'), getMaterialAssignments);

export default router;







