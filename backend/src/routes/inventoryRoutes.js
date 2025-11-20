import express from 'express';
import { 
  createInventoryInstance, 
  getInventoryInstances, 
  getInventoryInstanceById,
  getAvailableInstances,
  transferInstance,
  getTransfers,
  adjustStock,
  getAdjustments
} from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/inventory/instances - List instances (requires product_view)
router.get('/instances', requirePermission('product_view'), getInventoryInstances);

// GET /api/inventory/instances/available/:productId - Get available instances for POS
router.get('/instances/available/:productId', requirePermission('pos_access'), getAvailableInstances);

// GET /api/inventory/instances/:id - Get instance by ID (requires product_view)
router.get('/instances/:id', requirePermission('product_view'), getInventoryInstanceById);

// POST /api/inventory/instances - Register new coil (requires stock_add_opening)
router.post('/instances', requirePermission('stock_add_opening'), createInventoryInstance);

// POST /api/inventory/transfer - Transfer instance between branches (requires stock_transfer_init)
router.post('/transfer', requirePermission('stock_transfer_init'), transferInstance);

// GET /api/inventory/transfers - Get transfer history (requires product_view)
router.get('/transfers', requirePermission('product_view'), getTransfers);

// POST /api/inventory/adjust - Adjust stock quantity (requires stock_adjust)
router.post('/adjust', requirePermission('stock_adjust'), adjustStock);

// GET /api/inventory/adjustments - Get adjustment history (requires product_view)
router.get('/adjustments', requirePermission('product_view'), getAdjustments);

export default router;

