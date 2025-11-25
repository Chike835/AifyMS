import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  printInvoice,
  printDeliveryNote,
  printLabels
} from '../controllers/printController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Print invoice (requires sale_view_all)
router.get('/invoice/:orderId', requirePermission('sale_view_all'), printInvoice);

// Print delivery note (requires sale_view_all)
router.get('/delivery-note/:orderId', requirePermission('sale_view_all'), printDeliveryNote);

// Print labels (requires product_view)
router.post('/labels', requirePermission('product_view'), printLabels);

export default router;


