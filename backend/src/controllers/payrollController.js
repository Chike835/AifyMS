import { PayrollRecord, Branch, User } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all payroll records (branch-filtered for non-Super Admin)
 * Permission: payroll_view
 */
export const getPayrollRecords = async (req, res) => {
  try {
    const { branch_id, role_name } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      user_id,
      month,
      year,
      search 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause with branch filtering
    let whereClause = {};
    if (role_name !== 'Super Admin') {
      whereClause.branch_id = branch_id;
    } else if (req.query.branch_id) {
      whereClause.branch_id = req.query.branch_id;
    }

    // Filter by employee
    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Filter by month/year
    if (month) {
      whereClause.month = parseInt(month);
    }
    if (year) {
      whereClause.year = parseInt(year);
    }

    const { count, rows: payrollRecords } = await PayrollRecord.findAndCountAll({
      where: whereClause,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'employee', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['year', 'DESC'], ['month', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calculate totals
    const totalGrossPay = payrollRecords.reduce((sum, rec) => sum + parseFloat(rec.gross_pay || 0), 0);
    const totalDeductions = payrollRecords.reduce((sum, rec) => sum + parseFloat(rec.deductions || 0), 0);
    const totalNetPay = payrollRecords.reduce((sum, rec) => sum + parseFloat(rec.net_pay || 0), 0);

    res.status(200).json({
      total_count: count,
      total_pages: Math.ceil(count / parseInt(limit)),
      current_page: parseInt(page),
      totals: {
        gross_pay: totalGrossPay.toFixed(2),
        deductions: totalDeductions.toFixed(2),
        net_pay: totalNetPay.toFixed(2)
      },
      payroll_records: payrollRecords
    });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payroll records' });
  }
};

/**
 * Get payroll record by ID
 * Permission: payroll_view
 */
export const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const payrollRecord = await PayrollRecord.findByPk(id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'employee', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    if (!payrollRecord) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && payrollRecord.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this payroll record' });
    }

    res.status(200).json(payrollRecord);
  } catch (error) {
    console.error('Error fetching payroll record:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payroll record' });
  }
};

/**
 * Create a new payroll record (branch-scoped)
 * Permission: payroll_manage
 */
export const createPayrollRecord = async (req, res) => {
  try {
    const { user_id, month, year, gross_pay, deductions, notes } = req.body;
    const { branch_id: creatorBranchId, role_name } = req.user;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'Employee (user_id) is required' });
    }
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) is required' });
    }
    if (!year || year < 2000) {
      return res.status(400).json({ error: 'Valid year is required' });
    }

    // Verify user exists
    const employee = await User.findByPk(user_id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine branch_id from employee or request
    let targetBranchId = employee.branch_id;
    if (role_name === 'Super Admin' && req.body.branch_id) {
      targetBranchId = req.body.branch_id;
    }

    if (!targetBranchId) {
      return res.status(400).json({ error: 'Branch ID is required for payroll record' });
    }

    // Non-Super Admin can only create payroll for their branch
    if (role_name !== 'Super Admin' && targetBranchId !== creatorBranchId) {
      return res.status(403).json({ error: 'Cannot create payroll for employees in other branches' });
    }

    // Check for duplicate (same user, month, year)
    const existingRecord = await PayrollRecord.findOne({
      where: { user_id, month, year }
    });
    if (existingRecord) {
      return res.status(409).json({ 
        error: `Payroll record for this employee already exists for ${month}/${year}` 
      });
    }

    // Calculate net pay
    const grossPayAmount = parseFloat(gross_pay) || 0;
    const deductionsAmount = parseFloat(deductions) || 0;
    const netPayAmount = grossPayAmount - deductionsAmount;

    if (netPayAmount < 0) {
      return res.status(400).json({ error: 'Deductions cannot exceed gross pay' });
    }

    const payrollRecord = await PayrollRecord.create({
      user_id,
      branch_id: targetBranchId,
      month: parseInt(month),
      year: parseInt(year),
      gross_pay: grossPayAmount,
      deductions: deductionsAmount,
      net_pay: netPayAmount,
      notes: notes?.trim() || null
    });

    // Fetch with associations for response
    const createdRecord = await PayrollRecord.findByPk(payrollRecord.id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'employee', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    res.status(201).json(createdRecord);
  } catch (error) {
    console.error('Error creating payroll record:', error);
    res.status(500).json({ error: error.message || 'Failed to create payroll record' });
  }
};

/**
 * Update a payroll record
 * Permission: payroll_manage
 */
export const updatePayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { gross_pay, deductions, notes } = req.body;
    const { branch_id, role_name } = req.user;

    const payrollRecord = await PayrollRecord.findByPk(id);
    if (!payrollRecord) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && payrollRecord.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this payroll record' });
    }

    // Calculate net pay if gross_pay or deductions changed
    let grossPayAmount = gross_pay !== undefined ? parseFloat(gross_pay) : parseFloat(payrollRecord.gross_pay);
    let deductionsAmount = deductions !== undefined ? parseFloat(deductions) : parseFloat(payrollRecord.deductions);
    let netPayAmount = grossPayAmount - deductionsAmount;

    if (netPayAmount < 0) {
      return res.status(400).json({ error: 'Deductions cannot exceed gross pay' });
    }

    await payrollRecord.update({
      gross_pay: grossPayAmount,
      deductions: deductionsAmount,
      net_pay: netPayAmount,
      notes: notes !== undefined ? (notes?.trim() || null) : payrollRecord.notes
    });

    // Fetch updated record with associations
    const updatedRecord = await PayrollRecord.findByPk(id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'employee', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating payroll record:', error);
    res.status(500).json({ error: error.message || 'Failed to update payroll record' });
  }
};

/**
 * Delete a payroll record
 * Permission: payroll_manage
 */
export const deletePayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const payrollRecord = await PayrollRecord.findByPk(id);
    if (!payrollRecord) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && payrollRecord.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this payroll record' });
    }

    await payrollRecord.destroy();
    res.status(200).json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll record:', error);
    res.status(500).json({ error: error.message || 'Failed to delete payroll record' });
  }
};

/**
 * Get employees for payroll dropdown (users in branch)
 * Permission: payroll_view
 */
export const getEmployeesForPayroll = async (req, res) => {
  try {
    const { branch_id, role_name } = req.user;

    let whereClause = { is_active: true };
    if (role_name !== 'Super Admin') {
      whereClause.branch_id = branch_id;
    } else if (req.query.branch_id) {
      whereClause.branch_id = req.query.branch_id;
    }

    const employees = await User.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'email'],
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['full_name', 'ASC']]
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch employees' });
  }
};

