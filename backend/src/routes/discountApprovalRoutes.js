import express from 'express';
import { getDiscounts, approveDiscount, declineDiscount, updateDiscountSale, restoreDeclinedSale } from '../controllers/discountApprovalController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/discount-approvals - Get sales with discounts
router.get('/', requirePermission('sale_discount_approve'), getDiscounts);

// PUT /api/discount-approvals/:id/approve - Approve discount
router.put('/:id/approve', requirePermission('sale_discount_approve'), approveDiscount);

// PUT /api/discount-approvals/:id/decline - Decline discount
router.put('/:id/decline', requirePermission('sale_discount_approve'), declineDiscount);

// PUT /api/discount-approvals/:id/update - Update discounted sale
router.put('/:id/update', requirePermission('sale_discount_approve'), updateDiscountSale);

// PUT /api/discount-approvals/:id/restore - Restore declined sale
router.put('/:id/restore', requirePermission('sale_discount_approve'), restoreDeclinedSale);

export default router;
