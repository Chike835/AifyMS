import express from 'express';
import {
  getWarranties,
  getWarrantyById,
  createWarranty,
  updateWarranty,
  deleteWarranty
} from '../controllers/warrantyController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/warranties - List warranties (requires product_view)
router.get('/', requirePermission('product_view'), getWarranties);

// POST /api/warranties - Create warranty (requires product_add)
router.post('/', requirePermission('product_add'), createWarranty);

// GET /api/warranties/:id - Get warranty by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getWarrantyById);

// PUT /api/warranties/:id - Update warranty (requires product_edit)
router.put('/:id', requirePermission('product_edit'), updateWarranty);

// DELETE /api/warranties/:id - Delete warranty (requires product_delete)
router.delete('/:id', requirePermission('product_delete'), deleteWarranty);

export default router;





