import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getSalesSummary,
  getPurchaseSummary,
  getInventoryValue,
  getExpenseSummary,
  getCustomerSummary,
  getPaymentSummary,
  getProfitLoss,
  getBalanceSheet,
  getTrialBalance,
  getCashFlowStatement
} from '../controllers/reportController.js';

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

// Sales reports
router.get('/sales', requirePermission('report_view_sales'), getSalesSummary);

// Purchase reports
router.get('/purchases', requirePermission('report_view_sales'), getPurchaseSummary);

// Inventory/Stock reports
router.get('/inventory', requirePermission('report_view_stock_value'), getInventoryValue);

// Expense reports
router.get('/expenses', requirePermission('report_view_financial'), getExpenseSummary);

// Customer reports
router.get('/customers', requirePermission('report_view_sales'), getCustomerSummary);

// Payment reports
router.get('/payments', requirePermission('report_view_financial'), getPaymentSummary);

// Profit & Loss report
router.get('/profit-loss', requirePermission('report_view_financial'), getProfitLoss);

// Financial Statements
router.get('/balance-sheet', requirePermission('report_view_financial'), getBalanceSheet);
router.get('/trial-balance', requirePermission('report_view_financial'), getTrialBalance);
router.get('/cash-flow', requirePermission('report_view_financial'), getCashFlowStatement);

export default router;

