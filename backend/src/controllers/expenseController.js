import { ExpenseCategory, Expense, Branch, User } from '../models/index.js';
import { Op } from 'sequelize';

// ============================================
// EXPENSE CATEGORY CONTROLLERS
// ============================================

/**
 * Create a new expense category (branch-scoped)
 * Permission: expense_category_manage
 */
export const createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const { branch_id, role_name } = req.user;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Use user's branch_id unless Super Admin specifies another
    let targetBranchId = branch_id;
    if (role_name === 'Super Admin' && req.body.branch_id) {
      targetBranchId = req.body.branch_id;
    }

    if (!targetBranchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Check for duplicate category name within the branch
    const existingCategory = await ExpenseCategory.findOne({
      where: {
        name: name.trim(),
        branch_id: targetBranchId
      }
    });

    if (existingCategory) {
      return res.status(409).json({ error: 'A category with this name already exists in this branch' });
    }

    const category = await ExpenseCategory.create({
      name: name.trim(),
      branch_id: targetBranchId
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating expense category:', error);
    res.status(500).json({ error: error.message || 'Failed to create expense category' });
  }
};

/**
 * Get all expense categories (branch-filtered)
 * Permission: expense_view
 */
export const getExpenseCategories = async (req, res) => {
  try {
    const { branch_id, role_name } = req.user;

    let whereClause = {};
    if (role_name !== 'Super Admin') {
      whereClause.branch_id = branch_id;
    } else if (req.query.branch_id) {
      whereClause.branch_id = req.query.branch_id;
    }

    const categories = await ExpenseCategory.findAll({
      where: whereClause,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      order: [['name', 'ASC']]
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch expense categories' });
  }
};

/**
 * Update an expense category
 * Permission: expense_category_manage
 */
export const updateExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { branch_id, role_name } = req.user;

    const category = await ExpenseCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check branch access
    if (role_name !== 'Super Admin' && category.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this category' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check for duplicate name (excluding current category)
    const duplicate = await ExpenseCategory.findOne({
      where: {
        id: { [Op.ne]: id },
        name: name.trim(),
        branch_id: category.branch_id
      }
    });

    if (duplicate) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }

    await category.update({ name: name.trim() });
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating expense category:', error);
    res.status(500).json({ error: error.message || 'Failed to update expense category' });
  }
};

/**
 * Delete an expense category
 * Permission: expense_category_manage
 */
export const deleteExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const category = await ExpenseCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check branch access
    if (role_name !== 'Super Admin' && category.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this category' });
    }

    // Check if category has expenses
    const expenseCount = await Expense.count({ where: { category_id: id } });
    if (expenseCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${expenseCount} associated expenses. Remove expenses first.` 
      });
    }

    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    res.status(500).json({ error: error.message || 'Failed to delete expense category' });
  }
};

// ============================================
// EXPENSE CONTROLLERS
// ============================================

/**
 * Create a new expense (branch-scoped)
 * Permission: expense_manage
 */
export const createExpense = async (req, res) => {
  try {
    const { category_id, amount, description, expense_date } = req.body;
    const { id: user_id, branch_id, role_name } = req.user;

    // Validate required fields
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Verify category exists and belongs to user's branch
    const category = await ExpenseCategory.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ error: 'Expense category not found' });
    }

    // Non-Super Admin can only create expenses for their branch
    let targetBranchId = branch_id;
    if (role_name === 'Super Admin' && req.body.branch_id) {
      targetBranchId = req.body.branch_id;
    }

    if (!targetBranchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Category must belong to the target branch
    if (category.branch_id !== targetBranchId) {
      return res.status(400).json({ error: 'Category does not belong to this branch' });
    }

    const expense = await Expense.create({
      category_id,
      branch_id: targetBranchId,
      user_id,
      amount: parseFloat(amount),
      description: description?.trim() || null,
      expense_date: expense_date || new Date()
    });

    // Fetch with associations for response
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });

    res.status(201).json(createdExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: error.message || 'Failed to create expense' });
  }
};

/**
 * Get all expenses (branch-filtered for non-Super Admin)
 * Permission: expense_view
 */
export const getExpenses = async (req, res) => {
  try {
    const { branch_id, role_name } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      category_id, 
      start_date, 
      end_date,
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

    // Filter by category
    if (category_id) {
      whereClause.category_id = category_id;
    }

    // Filter by date range
    if (start_date && end_date) {
      whereClause.expense_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    } else if (start_date) {
      whereClause.expense_date = {
        [Op.gte]: new Date(start_date)
      };
    } else if (end_date) {
      whereClause.expense_date = {
        [Op.lte]: new Date(end_date)
      };
    }

    // Search in description
    if (search) {
      whereClause.description = {
        [Op.iLike]: `%${search}%`
      };
    }

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calculate totals
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    res.status(200).json({
      total_count: count,
      total_pages: Math.ceil(count / parseInt(limit)),
      current_page: parseInt(page),
      total_amount: totalAmount.toFixed(2),
      expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch expenses' });
  }
};

/**
 * Get expense by ID
 * Permission: expense_view
 */
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const expense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && expense.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this expense' });
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch expense' });
  }
};

/**
 * Update an expense
 * Permission: expense_manage
 */
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, amount, description, expense_date } = req.body;
    const { branch_id, role_name } = req.user;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && expense.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this expense' });
    }

    // Validate category if being changed
    if (category_id && category_id !== expense.category_id) {
      const category = await ExpenseCategory.findByPk(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Expense category not found' });
      }
      if (category.branch_id !== expense.branch_id) {
        return res.status(400).json({ error: 'Category does not belong to this branch' });
      }
    }

    // Validate amount if being changed
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    await expense.update({
      category_id: category_id || expense.category_id,
      amount: amount ? parseFloat(amount) : expense.amount,
      description: description !== undefined ? (description?.trim() || null) : expense.description,
      expense_date: expense_date || expense.expense_date
    });

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ]
    });

    res.status(200).json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: error.message || 'Failed to update expense' });
  }
};

/**
 * Delete an expense
 * Permission: expense_manage
 */
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Branch access check
    if (role_name !== 'Super Admin' && expense.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this expense' });
    }

    await expense.destroy();
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: error.message || 'Failed to delete expense' });
  }
};

/**
 * Get expense summary (totals by category, by date range)
 * Permission: expense_view
 */
export const getExpenseSummary = async (req, res) => {
  try {
    const { branch_id, role_name } = req.user;
    const { start_date, end_date } = req.query;

    let whereClause = {};
    if (role_name !== 'Super Admin') {
      whereClause.branch_id = branch_id;
    } else if (req.query.branch_id) {
      whereClause.branch_id = req.query.branch_id;
    }

    if (start_date && end_date) {
      whereClause.expense_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'amount', 'category_id', 'expense_date']
    });

    // Group by category
    const categoryTotals = {};
    let grandTotal = 0;

    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      const amount = parseFloat(exp.amount);
      
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { count: 0, total: 0 };
      }
      categoryTotals[catName].count++;
      categoryTotals[catName].total += amount;
      grandTotal += amount;
    });

    res.status(200).json({
      total_expenses: expenses.length,
      grand_total: grandTotal.toFixed(2),
      by_category: Object.entries(categoryTotals).map(([name, data]) => ({
        category: name,
        count: data.count,
        total: data.total.toFixed(2),
        percentage: ((data.total / grandTotal) * 100).toFixed(1)
      }))
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch expense summary' });
  }
};

