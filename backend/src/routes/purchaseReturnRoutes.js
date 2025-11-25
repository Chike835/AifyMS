import express from 'express';
import {
  getPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  approvePurchaseReturn,
  cancelPurchaseReturn
} from '../controllers/purchaseReturnController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/purchase-returns - List all purchase returns (requires purchase_return_view)
router.get('/', requirePermission('purchase_return_view'), getPurchaseReturns);

// GET /api/purchase-returns/:id - Get purchase return by ID (requires purchase_return_view)
router.get('/:id', requirePermission('purchase_return_view'), getPurchaseReturnById);

// POST /api/purchase-returns - Create purchase return (requires purchase_return_create)
router.post('/', requirePermission('purchase_return_create'), createPurchaseReturn);

// PUT /api/purchase-returns/:id/approve - Approve return (requires purchase_return_approve)
router.put('/:id/approve', requirePermission('purchase_return_approve'), approvePurchaseReturn);

// PUT /api/purchase-returns/:id/cancel - Cancel return (requires purchase_return_create)
router.put('/:id/cancel', requirePermission('purchase_return_create'), cancelPurchaseReturn);

export default router;

