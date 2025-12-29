import express from 'express';
import {
  createPayment,
  confirmPayment,
  getPayments,
  getPendingPayments,
  getRecentPayments,
  addAdvance,
  confirmAdvancePayment,
  processRefund,
  declinePayment,
  deletePayment
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/payments - List payments (requires payment_view)
router.get('/', requirePermission('payment_view'), getPayments);

// GET /api/payments/recent - Get recent payments (requires payment_view)
router.get('/recent', requirePermission('payment_view'), getRecentPayments);

// GET /api/payments/pending - List pending payments (requires payment_confirm)
router.get('/pending', requirePermission('payment_confirm'), getPendingPayments);

// POST /api/payments - Create payment (requires payment_receive)
router.post('/', requirePermission('payment_receive'), createPayment);

// PUT /api/payments/:id/confirm - Confirm payment (requires payment_confirm)
router.put('/:id/confirm', requirePermission('payment_confirm'), confirmPayment);

// PUT /api/payments/:id/decline - Decline payment (requires payment_confirm)
router.put('/:id/decline', requirePermission('payment_confirm'), declinePayment);

// PUT /api/payments/:id/confirm-advance - Confirm advance payment (requires payment_confirm)
router.put('/:id/confirm-advance', requirePermission('payment_confirm'), confirmAdvancePayment);

// DELETE /api/payments/:id - Delete payment (requires payment_delete)
// Note: This must come after more specific :id routes to avoid route conflicts
router.delete('/:id', requirePermission('payment_delete'), deletePayment);

// POST /api/payments/advance - Create advance payment (requires payment_receive)
router.post('/advance', requirePermission('payment_receive'), addAdvance);

// POST /api/payments/refund - Process refund (requires payment_confirm)
router.post('/refund', requirePermission('payment_confirm'), processRefund);

export default router;

