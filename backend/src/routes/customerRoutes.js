import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  getCustomerOrders,
  getCustomerBalance
} from '../controllers/customerController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/customers
 * List all customers
 * Permission: payment_view (customers are viewed in payment/sales context)
 */
router.get('/', requirePermission('payment_view'), getCustomers);

/**
 * GET /api/customers/:id
 * Get single customer details
 * Permission: payment_view
 */
router.get('/:id', requirePermission('payment_view'), getCustomerById);

/**
 * GET /api/customers/:id/ledger
 * Get customer ledger/balance history
 * Permission: payment_view
 */
router.get('/:id/ledger', requirePermission('payment_view'), getCustomerLedger);

/**
 * GET /api/customers/:id/orders
 * Get customer order history
 * Permission: payment_view
 */
router.get('/:id/orders', requirePermission('payment_view'), getCustomerOrders);

/**
 * GET /api/customers/:id/balance
 * Get customer balance summary
 * Permission: payment_view
 */
router.get('/:id/balance', requirePermission('payment_view'), getCustomerBalance);

/**
 * POST /api/customers
 * Create a new customer
 * Permission: payment_receive (ability to log payments implies customer creation)
 */
router.post('/', requirePermission('payment_receive'), createCustomer);

/**
 * PUT /api/customers/:id
 * Update an existing customer
 * Permission: payment_receive
 */
router.put('/:id', requirePermission('payment_receive'), updateCustomer);

/**
 * DELETE /api/customers/:id
 * Delete a customer
 * Permission: payment_confirm (higher privilege for deletion)
 */
router.delete('/:id', requirePermission('payment_confirm'), deleteCustomer);

export default router;

