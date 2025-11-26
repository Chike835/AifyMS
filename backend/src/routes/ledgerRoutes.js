import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getCustomerLedger,
  getSupplierLedger,
  exportLedger,
  triggerBackfill,
  getCustomerLedgerSummary
} from '../controllers/ledgerController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/ledger/backfill
 * Trigger historical ledger backfill (Admin only)
 * Permission: settings_manage (admin-level operation)
 */
router.post('/backfill', requirePermission('settings_manage'), triggerBackfill);

/**
 * GET /api/ledger/customer/:id
 * Get customer ledger entries
 * Permission: payment_view
 */
router.get('/customer/:id', requirePermission('payment_view'), getCustomerLedger);

/**
 * GET /api/ledger/customer/:id/summary
 * Get customer ledger summary
 * Permission: payment_view
 */
router.get('/customer/:id/summary', requirePermission('payment_view'), getCustomerLedgerSummary);

/**
 * GET /api/ledger/supplier/:id
 * Get supplier ledger entries
 * Permission: product_view (suppliers are viewed in product/purchase context)
 */
router.get('/supplier/:id', requirePermission('product_view'), getSupplierLedger);

/**
 * GET /api/ledger/export/:type/:id
 * Export ledger to CSV or PDF
 * Permission: payment_view (for customers) or product_view (for suppliers)
 */
router.get('/export/:type/:id', (req, res, next) => {
  if (req.params.type === 'customer') {
    return requirePermission('payment_view')(req, res, next);
  } else if (req.params.type === 'supplier') {
    return requirePermission('product_view')(req, res, next);
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }
}, exportLedger);

export default router;

