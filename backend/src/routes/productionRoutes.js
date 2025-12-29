import express from 'express';
import {
  assignMaterial,
  getMaterialAssignments,
  proposeMaterialAssignment
} from '../controllers/productionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/production/assign-material - Assign material to sales item (requires production_update_status)
router.post('/assign-material', requirePermission('production_update_status'), assignMaterial);

// POST /api/production/assign-material/proposal - Generate proposal (requires production_update_status)
router.post('/assign-material/proposal', requirePermission('production_update_status'), proposeMaterialAssignment);

// GET /api/production/assignments/:sales_item_id - Get assignments for sales item (requires production_view_queue)
router.get('/assignments/:sales_item_id', requirePermission('production_view_queue'), getMaterialAssignments);

export default router;























