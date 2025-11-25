import express from 'express';
import {
  getSalesReturns,
  getSalesReturnById,
  createSalesReturn,
  approveSalesReturn,
  cancelSalesReturn,
  getReturnsByOrder
} from '../controllers/salesReturnController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/sales-returns - List all sales returns (requires sale_return_view)
router.get('/', requirePermission('sale_return_view'), getSalesReturns);

// GET /api/sales-returns/order/:orderId - Get returns for an order (requires sale_return_view)
router.get('/order/:orderId', requirePermission('sale_return_view'), getReturnsByOrder);

// GET /api/sales-returns/:id - Get sales return by ID (requires sale_return_view)
router.get('/:id', requirePermission('sale_return_view'), getSalesReturnById);

// POST /api/sales-returns - Create sales return (requires sale_return_create)
router.post('/', requirePermission('sale_return_create'), createSalesReturn);

// PUT /api/sales-returns/:id/approve - Approve return (requires sale_return_approve)
router.put('/:id/approve', requirePermission('sale_return_approve'), approveSalesReturn);

// PUT /api/sales-returns/:id/cancel - Cancel return (requires sale_return_create)
router.put('/:id/cancel', requirePermission('sale_return_create'), cancelSalesReturn);

export default router;

