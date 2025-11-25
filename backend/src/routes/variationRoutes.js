import express from 'express';
import {
  getVariations,
  getVariationById,
  createVariation,
  updateVariation,
  deleteVariation
} from '../controllers/variationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/variations - List variations (requires product_view)
router.get('/', requirePermission('product_view'), getVariations);

// POST /api/variations - Create variation (requires product_add)
router.post('/', requirePermission('product_add'), createVariation);

// GET /api/variations/:id - Get variation by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getVariationById);

// PUT /api/variations/:id - Update variation (requires product_edit)
router.put('/:id', requirePermission('product_edit'), updateVariation);

// DELETE /api/variations/:id - Delete variation (requires product_delete)
router.delete('/:id', requirePermission('product_delete'), deleteVariation);

export default router;





