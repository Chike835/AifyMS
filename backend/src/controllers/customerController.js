import { Customer, Branch, SalesOrder, Payment } from '../models/index.js';
import { Op } from 'sequelize';
import { logActivitySync } from '../middleware/activityLogger.js';

/**
 * Get all customers
 * Super Admin sees all customers; others see all (customers are global)
 */
export const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let queryLimit = parseInt(limit);
    let offset = (parseInt(page) - 1) * queryLimit;

    if (queryLimit < 1) {
      queryLimit = null;
      offset = null;
    }

    // Build where clause for search
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: queryLimit,
      offset
    });

    return res.json({
      customers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: queryLimit,
        totalPages: queryLimit ? Math.ceil(count / queryLimit) : 1
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

/**
 * Get a single customer by ID
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: SalesOrder,
          as: 'sales_orders',
          limit: 10,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'invoice_number', 'total_amount', 'payment_status', 'created_at']
        },
        {
          model: Payment,
          as: 'payments',
          limit: 10,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'amount', 'method', 'status', 'created_at']
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

/**
 * Create a new customer
 * Validates unique email/phone
 */
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Check for unique email if provided
    if (email) {
      const existingEmail = await Customer.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: 'A customer with this email already exists' });
      }
    }

    // Check for unique phone if provided
    if (phone) {
      const existingPhone = await Customer.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ error: 'A customer with this phone number already exists' });
      }
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      address: address?.trim() || null,
      ledger_balance: 0
    });

    // Log activity
    await logActivitySync(
      'CREATE',
      'customers',
      `Created customer: ${customer.name}`,
      req,
      'customer',
      customer.id
    );

    return res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    return res.status(500).json({ error: 'Failed to create customer' });
  }
};

/**
 * Update an existing customer
 * Validates unique email/phone (excluding current record)
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Validate required fields
    if (name !== undefined && (!name || name.trim() === '')) {
      return res.status(400).json({ error: 'Customer name cannot be empty' });
    }

    // Check for unique email if provided and changed
    if (email && email !== customer.email) {
      const existingEmail = await Customer.findOne({
        where: {
          email,
          id: { [Op.ne]: id }
        }
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'A customer with this email already exists' });
      }
    }

    // Check for unique phone if provided and changed
    if (phone && phone !== customer.phone) {
      const existingPhone = await Customer.findOne({
        where: {
          phone,
          id: { [Op.ne]: id }
        }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'A customer with this phone number already exists' });
      }
    }

    // Update fields
    await customer.update({
      name: name !== undefined ? name.trim() : customer.name,
      phone: phone !== undefined ? (phone?.trim() || null) : customer.phone,
      email: email !== undefined ? (email?.trim()?.toLowerCase() || null) : customer.email,
      address: address !== undefined ? (address?.trim() || null) : customer.address
    });

    // Log activity
    await logActivitySync(
      'UPDATE',
      'customers',
      `Updated customer: ${customer.name}`,
      req,
      'customer',
      customer.id
    );

    return res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    return res.status(500).json({ error: 'Failed to update customer' });
  }
};

/**
 * Delete a customer
 * Only allows deletion if no sales orders or payments exist
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for existing sales orders
    const salesOrderCount = await SalesOrder.count({ where: { customer_id: id } });
    if (salesOrderCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete customer with existing sales orders',
        details: `Customer has ${salesOrderCount} sales order(s)`
      });
    }

    // Check for existing payments
    const paymentCount = await Payment.count({ where: { customer_id: id } });
    if (paymentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete customer with existing payments',
        details: `Customer has ${paymentCount} payment(s)`
      });
    }

    const customerName = customer.name;
    await customer.destroy();

    // Log activity
    await logActivitySync(
      'DELETE',
      'customers',
      `Deleted customer: ${customerName}`,
      req,
      'customer',
      id
    );

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Failed to delete customer' });
  }
};

/**
 * Get customer ledger/balance history
 */
/**
 * GET /api/customers/:id/orders
 * Get customer order history
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    let queryLimit = parseInt(limit);

    if (queryLimit < 1) {
      queryLimit = null;
    }

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const where = { customer_id: id };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const orders = await SalesOrder.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: queryLimit,
      offset: parseInt(offset)
    });

    return res.json({ orders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({ error: 'Failed to fetch customer orders' });
  }
};

/**
 * GET /api/customers/:id/balance
 * Get customer balance summary
 */
export const getCustomerBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get total sales
    const where = { customer_id: id };
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const totalSales = await SalesOrder.sum('total_amount', { where });
    const totalPayments = await Payment.sum('amount', {
      where: {
        customer_id: id,
        status: 'confirmed'
      }
    });

    return res.json({
      customer_id: id,
      ledger_balance: parseFloat(customer.ledger_balance || 0),
      total_sales: parseFloat(totalSales || 0),
      total_payments: parseFloat(totalPayments || 0),
      outstanding_balance: parseFloat(totalSales || 0) - parseFloat(totalPayments || 0)
    });
  } catch (error) {
    console.error('Error fetching customer balance:', error);
    return res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
};

export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get all sales orders for this customer
    const salesOrders = await SalesOrder.findAll({
      where: { customer_id: id },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'invoice_number', 'total_amount', 'payment_status', 'created_at']
    });

    // Get all payments for this customer
    const payments = await Payment.findAll({
      where: { customer_id: id },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'amount', 'method', 'status', 'reference_note', 'created_at']
    });

    return res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        ledger_balance: customer.ledger_balance
      },
      sales_orders: salesOrders,
      payments: payments
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return res.status(500).json({ error: 'Failed to fetch customer ledger' });
  }
};

