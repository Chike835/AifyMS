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
  transferBetweenAccounts
} from '../controllers/paymentAccountController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List all payment accounts
router.get('/', requirePermission('payment_account_view'), getPaymentAccounts);

// Get single payment account
router.get('/:id', requirePermission('payment_account_view'), getPaymentAccountById);

// Create new payment account
router.post('/', requirePermission('payment_account_manage'), createPaymentAccount);

// Update payment account
router.put('/:id', requirePermission('payment_account_manage'), updatePaymentAccount);

// Get account transactions
router.get('/:id/transactions', requirePermission('payment_account_view'), getAccountTransactions);

// Record deposit
router.post('/:id/deposit', requirePermission('payment_account_manage'), recordDeposit);

// Record withdrawal
router.post('/:id/withdrawal', requirePermission('payment_account_manage'), recordWithdrawal);

// Transfer between accounts
router.post('/transfer', requirePermission('payment_account_manage'), transferBetweenAccounts);

export default router;


