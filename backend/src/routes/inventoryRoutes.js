import express from 'express';
import { 
  createInventoryInstance, 
  getInventoryInstances, 
  getInventoryInstanceById,
  getAvailableInstances 
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

export default router;

