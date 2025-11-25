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
  getCashFlowStatement,
  getStockAdjustmentReport,
  getTrendingProducts,
  getItemsReport,
  getProductPurchaseReport,
  getProductSellReport,
  getPurchasePaymentReport,
  getSellPaymentReport,
  getTaxReport,
  getSalesRepresentativeReport,
  getCustomerGroupsReport,
  getRegisterReport,
  getActivityLogReport
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

// Additional Reports
router.get('/stock-adjustment', requirePermission('report_view_stock_value'), getStockAdjustmentReport);
router.get('/trending-products', requirePermission('report_view_sales'), getTrendingProducts);
router.get('/items', requirePermission('report_view_sales'), getItemsReport);
router.get('/product-purchase', requirePermission('report_view_sales'), getProductPurchaseReport);
router.get('/product-sell', requirePermission('report_view_sales'), getProductSellReport);
router.get('/purchase-payment', requirePermission('report_view_financial'), getPurchasePaymentReport);
router.get('/sell-payment', requirePermission('report_view_financial'), getSellPaymentReport);
router.get('/tax', requirePermission('report_view_financial'), getTaxReport);
router.get('/sales-representative', requirePermission('report_view_sales'), getSalesRepresentativeReport);
router.get('/customer-groups', requirePermission('report_view_sales'), getCustomerGroupsReport);
router.get('/register', requirePermission('report_view_register'), getRegisterReport);
router.get('/activity-log', requirePermission('report_view_sales'), getActivityLogReport);

export default router;

