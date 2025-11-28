import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getDashboardStats,
  getSalesChart,
  getTopProducts,
  getTopCustomers,
  getRecentActivity,
  getLowStockAlerts,
  getPendingActions
} from '../controllers/dashboardController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Sales chart data
router.get('/sales-chart', getSalesChart);

// Top products
router.get('/top-products', getTopProducts);

// Top customers
router.get('/top-customers', getTopCustomers);

// Recent activity
router.get('/recent-activity', getRecentActivity);

// Low stock alerts
router.get('/alerts', getLowStockAlerts);

// Pending actions
router.get('/pending-actions', getPendingActions);

export default router;










