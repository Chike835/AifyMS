import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary
} from '../controllers/expenseController.js';

const router = express.Router();

// ============================================
// EXPENSE CATEGORY ROUTES
// ============================================

// GET /expenses/categories - List all expense categories
router.get('/categories', authenticate, requirePermission('expense_view'), getExpenseCategories);

// POST /expenses/categories - Create a new expense category
router.post('/categories', authenticate, requirePermission('expense_category_manage'), createExpenseCategory);

// PUT /expenses/categories/:id - Update an expense category
router.put('/categories/:id', authenticate, requirePermission('expense_category_manage'), updateExpenseCategory);

// DELETE /expenses/categories/:id - Delete an expense category
router.delete('/categories/:id', authenticate, requirePermission('expense_category_manage'), deleteExpenseCategory);

// ============================================
// EXPENSE ROUTES
// ============================================

// GET /expenses/summary - Get expense summary (totals by category)
router.get('/summary', authenticate, requirePermission('expense_view'), getExpenseSummary);

// GET /expenses - List all expenses (with filters)
router.get('/', authenticate, requirePermission('expense_view'), getExpenses);

// GET /expenses/:id - Get expense by ID
router.get('/:id', authenticate, requirePermission('expense_view'), getExpenseById);

// POST /expenses - Create a new expense
router.post('/', authenticate, requirePermission('expense_manage'), createExpense);

// PUT /expenses/:id - Update an expense
router.put('/:id', authenticate, requirePermission('expense_manage'), updateExpense);

// DELETE /expenses/:id - Delete an expense
router.delete('/:id', authenticate, requirePermission('expense_manage'), deleteExpense);

export default router;

