import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount
} from '../controllers/discountController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List discounts (requires discount_view)
router.get('/', requirePermission('discount_view'), getDiscounts);

// Get single discount (requires discount_view)
router.get('/:id', requirePermission('discount_view'), getDiscountById);

// Create discount (requires discount_manage)
router.post('/', requirePermission('discount_manage'), createDiscount);

// Update discount (requires discount_manage)
router.put('/:id', requirePermission('discount_manage'), updateDiscount);

// Delete discount (requires discount_manage)
router.delete('/:id', requirePermission('discount_manage'), deleteDiscount);

export default router;
















