import express from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  updateProductionStatus,
  getProductionQueue,
  getShipments,
  markAsDelivered,
  getDrafts,
  updateDraft,
  convertDraftToInvoice,
  deleteDraft,
  getQuotations,
  convertQuotationToInvoice,
  deleteQuotation,
  updateSale,
  cancelSale,
  getManufacturingApprovals,
  approveManufacturing,
  rejectManufacturing
} from '../controllers/salesController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/sales - List sales (requires sale_view_own or sale_view_all)
router.get('/', requirePermission(['sale_view_own', 'sale_view_all']), getSales);

// GET /api/sales/drafts - List draft orders (requires draft_manage)
router.get('/drafts', requirePermission('draft_manage'), getDrafts);

// GET /api/sales/quotations - List quotations (requires quote_manage)
router.get('/quotations', requirePermission('quote_manage'), getQuotations);

// GET /api/sales/production-queue - Get production queue (requires production_view_queue)
router.get('/production-queue', requirePermission('production_view_queue'), getProductionQueue);

// GET /api/sales/shipments - Get shipments ready for delivery (requires production_view_queue)
router.get('/shipments', requirePermission('production_view_queue'), getShipments);

// GET /api/sales/:id - Get sale by ID (requires sale_view_own or sale_view_all)
router.get('/:id', requirePermission(['sale_view_own', 'sale_view_all']), getSaleById);

// POST /api/sales - Create sale (requires pos_access)
router.post('/', requirePermission('pos_access'), createSale);

// PUT /api/sales/drafts/:id - Update draft (requires draft_manage)
router.put('/drafts/:id', requirePermission('draft_manage'), updateDraft);

// POST /api/sales/drafts/:id/convert - Convert draft to invoice (requires draft_manage)
router.post('/drafts/:id/convert', requirePermission('draft_manage'), convertDraftToInvoice);

// DELETE /api/sales/drafts/:id - Delete draft (requires draft_manage)
router.delete('/drafts/:id', requirePermission('draft_manage'), deleteDraft);

// POST /api/sales/quotations/:id/convert - Convert quotation to invoice (requires quote_manage)
router.post('/quotations/:id/convert', requirePermission('quote_manage'), convertQuotationToInvoice);

// DELETE /api/sales/quotations/:id - Delete quotation (requires quote_manage)
router.delete('/quotations/:id', requirePermission('quote_manage'), deleteQuotation);

// PUT /api/sales/:id/production-status - Update production status (requires production_update_status)
router.put('/:id/production-status', requirePermission('production_update_status'), updateProductionStatus);

// PUT /api/sales/:id/deliver - Mark order as delivered (requires production_update_status)
router.put('/:id/deliver', requirePermission('production_update_status'), markAsDelivered);

// PUT /api/sales/:id - Update sales order (only for drafts, requires draft_manage)
router.put('/:id', requirePermission('draft_manage'), updateSale);

// DELETE /api/sales/:id - Cancel/void sales order (requires sale_edit_price)
router.delete('/:id', requirePermission('sale_edit_price'), cancelSale);

// GET /api/sales/manufacturing-approvals - Get sales pending manufacturing approval (requires production_update_status)
router.get('/manufacturing-approvals', requirePermission('production_update_status'), getManufacturingApprovals);

// PUT /api/sales/:id/approve-manufacturing - Approve sale for production (requires production_update_status)
router.put('/:id/approve-manufacturing', requirePermission('production_update_status'), approveManufacturing);

// PUT /api/sales/:id/reject-manufacturing - Reject sale for production (requires production_update_status)
router.put('/:id/reject-manufacturing', requirePermission('production_update_status'), rejectManufacturing);

export default router;

