import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchaseStatus,
  deletePurchase
} from '../controllers/purchaseController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/purchases
 * List all purchases (branch-filtered for non-Super Admin)
 * Permission: product_view (purchases are viewed in inventory context)
 */
router.get('/', requirePermission('product_view'), getPurchases);

/**
 * GET /api/purchases/:id
 * Get single purchase with items
 * Permission: product_view
 */
router.get('/:id', requirePermission('product_view'), getPurchaseById);

/**
 * POST /api/purchases
 * Create a new purchase (with automatic inventory instance creation if instance_code provided)
 * Permission: stock_add_opening (ability to add opening stock implies purchase creation)
 */
router.post('/', requirePermission('stock_add_opening'), createPurchase);

/**
 * PUT /api/purchases/:id/status
 * Update purchase status (confirmed, received, cancelled)
 * Permission: stock_add_opening
 */
router.put('/:id/status', requirePermission('stock_add_opening'), updatePurchaseStatus);

/**
 * DELETE /api/purchases/:id
 * Delete a purchase (only draft or cancelled)
 * Permission: product_delete (higher privilege for deletion)
 */
router.delete('/:id', requirePermission('product_delete'), deletePurchase);

export default router;

