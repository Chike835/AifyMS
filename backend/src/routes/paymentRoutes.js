import express from 'express';
import { 
  createPayment, 
  confirmPayment, 
  getPayments,
  getPendingPayments 
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/payments - List payments (requires payment_view)
router.get('/', requirePermission('payment_view'), getPayments);

// GET /api/payments/pending - List pending payments (requires payment_confirm)
router.get('/pending', requirePermission('payment_confirm'), getPendingPayments);

// POST /api/payments - Create payment (requires payment_receive)
router.post('/', requirePermission('payment_receive'), createPayment);

// PUT /api/payments/:id/confirm - Confirm payment (requires payment_confirm)
router.put('/:id/confirm', requirePermission('payment_confirm'), confirmPayment);

export default router;

