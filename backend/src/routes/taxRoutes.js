import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate
} from '../controllers/taxController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List tax rates (all authenticated users can view)
router.get('/', getTaxRates);

// Get single tax rate
router.get('/:id', getTaxRateById);

// Create tax rate (requires permission)
router.post('/', requirePermission('settings_manage'), createTaxRate);

// Update tax rate (requires permission)
router.put('/:id', requirePermission('settings_manage'), updateTaxRate);

// Delete tax rate (requires permission)
router.delete('/:id', requirePermission('settings_manage'), deleteTaxRate);

export default router;


