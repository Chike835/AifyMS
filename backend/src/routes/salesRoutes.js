import express from 'express';
import { 
  createSale, 
  getSales, 
  getSaleById,
  updateProductionStatus,
  getProductionQueue,
  getShipments,
  markAsDelivered
} from '../controllers/salesController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/sales - List sales (requires sale_view_own or sale_view_all)
router.get('/', requirePermission(['sale_view_own', 'sale_view_all']), getSales);

// GET /api/sales/production-queue - Get production queue (requires production_view_queue)
router.get('/production-queue', requirePermission('production_view_queue'), getProductionQueue);

// GET /api/sales/shipments - Get shipments ready for delivery (requires production_view_queue)
router.get('/shipments', requirePermission('production_view_queue'), getShipments);

// GET /api/sales/:id - Get sale by ID (requires sale_view_own or sale_view_all)
router.get('/:id', requirePermission(['sale_view_own', 'sale_view_all']), getSaleById);

// POST /api/sales - Create sale (requires pos_access)
router.post('/', requirePermission('pos_access'), createSale);

// PUT /api/sales/:id/production-status - Update production status (requires production_update_status)
router.put('/:id/production-status', requirePermission('production_update_status'), updateProductionStatus);

// PUT /api/sales/:id/deliver - Mark order as delivered (requires production_update_status)
router.put('/:id/deliver', requirePermission('production_update_status'), markAsDelivered);

export default router;

