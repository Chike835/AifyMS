import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getPayrollRecords,
  getPayrollById,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  getEmployeesForPayroll,
  calculatePayroll
} from '../controllers/payrollController.js';

const router = express.Router();

// ============================================
// PAYROLL ROUTES
// ============================================

// GET /payroll/employees - Get employees for payroll dropdown
router.get('/employees', authenticate, requirePermission('payroll_view'), getEmployeesForPayroll);

// GET /payroll - List all payroll records (with filters)
router.get('/', authenticate, requirePermission('payroll_view'), getPayrollRecords);

// GET /payroll/:id - Get payroll record by ID
router.get('/:id', authenticate, requirePermission('payroll_view'), getPayrollById);

// POST /payroll/calculate - Auto-calculate payroll (must come before generic POST /)
router.post('/calculate', authenticate, requirePermission('payroll_manage'), calculatePayroll);

// POST /payroll - Create a new payroll record
router.post('/', authenticate, requirePermission('payroll_manage'), createPayrollRecord);

// PUT /payroll/:id - Update a payroll record
router.put('/:id', authenticate, requirePermission('payroll_manage'), updatePayrollRecord);

// DELETE /payroll/:id - Delete a payroll record
router.delete('/:id', authenticate, requirePermission('payroll_manage'), deletePayrollRecord);

export default router;

