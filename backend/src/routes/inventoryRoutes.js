import express from 'express';
import {
  transferBatch,
  getTransfers,
  adjustStock,
  getAdjustments,
  generateLabels,
  getLabelTemplate,
  getLowStock,
  getBatchHistory,
  convertBatch
} from '../controllers/inventoryController.js';
import {
  createBatch,
  getBatches,
  getInstances,
  getBatchById,
  updateBatch,
  deleteBatch,
  getAvailableBatches,
  suggestInstanceCode
} from '../controllers/inventoryBatchController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Batch CRUD Routes
// GET /api/inventory/batches - List batches (requires batch_view or product_view)
router.get('/batches', requirePermission('batch_view', 'product_view'), getBatches);

// GET /api/inventory/instances - List instances (same as batches, alias for frontend consistency)
router.get('/instances', requirePermission('batch_view', 'product_view'), getInstances);

// POST /api/inventory/instances - Create new instance (alias for batches)
router.post('/instances', requirePermission('batch_create', 'stock_add_opening'), createBatch);

// GET /api/inventory/batches/available/:productId - Get available batches for POS
router.get('/batches/available/:productId', requirePermission('pos_access'), getAvailableBatches);

// GET /api/inventory/batches/suggest-code - Suggest instance code (requires batch_create or stock_add_opening)
router.get('/batches/suggest-code', requirePermission('batch_create', 'stock_add_opening'), suggestInstanceCode);

// GET /api/inventory/batches/:id - Get batch by ID (requires batch_view or product_view)
router.get('/batches/:id', requirePermission('batch_view', 'product_view'), getBatchById);

// POST /api/inventory/batches - Create new batch (requires batch_create or stock_add_opening)
router.post('/batches', requirePermission('batch_create', 'stock_add_opening'), createBatch);

// PUT /api/inventory/batches/:id - Update batch (requires batch_edit or stock_adjust)
router.put('/batches/:id', requirePermission('batch_edit', 'stock_adjust'), updateBatch);

// DELETE /api/inventory/batches/:id - Delete batch (requires batch_delete)
router.delete('/batches/:id', requirePermission('batch_delete'), deleteBatch);

// POST /api/inventory/stock-transfer - Transfer batch between branches (requires stock_transfer_init)
router.post('/stock-transfer', requirePermission('stock_transfer_init'), transferBatch);

// GET /api/inventory/transfers - Get transfer history (requires product_view)
router.get('/transfers', requirePermission('product_view'), getTransfers);

// POST /api/inventory/stock-adjustment - Adjust stock quantity (requires stock_adjust)
router.post('/stock-adjustment', requirePermission('stock_adjust'), adjustStock);

// GET /api/inventory/adjustments - Get adjustment history (requires product_view)
router.get('/adjustments', requirePermission('product_view'), getAdjustments);

// POST /api/inventory/batches/labels - Generate labels (requires stock_add_opening)
router.post('/batches/labels', requirePermission('stock_add_opening'), generateLabels);

// GET /api/inventory/label-template - Get label template (requires product_view)
router.get('/label-template', requirePermission('product_view'), getLabelTemplate);

// GET /api/inventory/low-stock - Get low stock items (requires product_view)
router.get('/low-stock', requirePermission('product_view'), getLowStock);

// GET /api/inventory/batches/:id/history - Get batch history (requires product_view)
router.get('/batches/:id/history', requirePermission('product_view'), getBatchHistory);

// POST /api/inventory/convert-batch - Convert Loose to Coil (Slitting) (requires batch_create)
router.post('/convert-batch', requirePermission('batch_create'), convertBatch);

export default router;

