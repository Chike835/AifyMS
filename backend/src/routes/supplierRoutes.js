import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger
} from '../controllers/supplierController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/suppliers
 * List all suppliers (branch-filtered for non-Super Admin)
 * Permission: product_view (suppliers are viewed in inventory/purchase context)
 */
router.get('/', requirePermission('product_view'), getSuppliers);

/**
 * GET /api/suppliers/:id
 * Get single supplier details
 * Permission: product_view
 */
router.get('/:id', requirePermission('product_view'), getSupplierById);

/**
 * GET /api/suppliers/:id/ledger
 * Get supplier ledger/balance history
 * Permission: product_view
 */
router.get('/:id/ledger', requirePermission('product_view'), getSupplierLedger);

/**
 * POST /api/suppliers
 * Create a new supplier
 * Permission: product_add (ability to add products implies supplier creation)
 */
router.post('/', requirePermission('product_add'), createSupplier);

/**
 * PUT /api/suppliers/:id
 * Update an existing supplier
 * Permission: product_edit
 */
router.put('/:id', requirePermission('product_edit'), updateSupplier);

/**
 * DELETE /api/suppliers/:id
 * Delete a supplier
 * Permission: product_delete (higher privilege for deletion)
 */
router.delete('/:id', requirePermission('product_delete'), deleteSupplier);

export default router;

