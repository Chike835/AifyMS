import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getReceiptPrinters,
  getReceiptPrinterById,
  createReceiptPrinter,
  updateReceiptPrinter,
  deleteReceiptPrinter,
  getDefaultPrinter
} from '../controllers/printerController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get default printer (all authenticated users can view)
router.get('/default', getDefaultPrinter);

// List printers (requires sale_view_all)
router.get('/', requirePermission('sale_view_all'), getReceiptPrinters);

// Get single printer (requires sale_view_all)
router.get('/:id', requirePermission('sale_view_all'), getReceiptPrinterById);

// Create printer (requires sale_edit_price)
router.post('/', requirePermission('sale_edit_price'), createReceiptPrinter);

// Update printer (requires sale_edit_price)
router.put('/:id', requirePermission('sale_edit_price'), updateReceiptPrinter);

// Delete printer (requires sale_edit_price)
router.delete('/:id', requirePermission('sale_edit_price'), deleteReceiptPrinter);

export default router;

























