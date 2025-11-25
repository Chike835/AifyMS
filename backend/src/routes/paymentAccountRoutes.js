import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getPaymentAccounts,
  getPaymentAccountById,
  createPaymentAccount,
  updatePaymentAccount,
  getAccountTransactions,
  recordDeposit,
  recordWithdrawal,
  transferBetweenAccounts,
  getAccountReport
} from '../controllers/paymentAccountController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List all payment accounts
router.get('/', requirePermission('payment_account_view'), getPaymentAccounts);

// Create new payment account
router.post('/', requirePermission('payment_account_manage'), createPaymentAccount);

// Transfer between accounts (must come before /:id routes)
router.post('/transfer', requirePermission('payment_account_manage'), transferBetweenAccounts);

// Get account transactions (must come before /:id route)
router.get('/:id/transactions', requirePermission('payment_account_view'), getAccountTransactions);

// Record deposit (must come before /:id route)
router.post('/:id/deposit', requirePermission('payment_account_manage'), recordDeposit);

// Record withdrawal (must come before /:id route)
router.post('/:id/withdrawal', requirePermission('payment_account_manage'), recordWithdrawal);

// Get account report (must come before /:id route)
router.get('/:id/report', requirePermission('payment_account_view'), getAccountReport);

// Get single payment account (must be last to avoid matching nested routes)
router.get('/:id', requirePermission('payment_account_view'), getPaymentAccountById);

// Update payment account
router.put('/:id', requirePermission('payment_account_manage'), updatePaymentAccount);

export default router;


