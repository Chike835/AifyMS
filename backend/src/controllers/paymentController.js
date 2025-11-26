import sequelize from '../config/db.js';
import { Payment, Customer, User, SalesOrder } from '../models/index.js';
import { logActivitySync } from '../middleware/activityLogger.js';
import { createLedgerEntry } from '../services/ledgerService.js';

/**
 * Helper function to format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount || 0);
};

/**
 * POST /api/payments
 * Create a payment with status 'pending_confirmation'
 */
export const createPayment = async (req, res, next) => {
  try {
    const {
      customer_id,
      amount,
      method,
      reference_note
    } = req.body;

    // Validation
    if (!customer_id || amount === undefined || !method) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_id, amount, method' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const validMethods = ['cash', 'transfer', 'pos'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ 
        error: `Invalid method. Must be one of: ${validMethods.join(', ')}` 
      });
    }

    // Verify customer exists
    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create payment with pending_confirmation status
    const payment = await Payment.create({
      customer_id,
      amount,
      method,
      status: 'pending_confirmation',
      created_by: req.user.id,
      reference_note: reference_note || null
    });

    // Load with associations
    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    // Log activity
    await logActivitySync(
      'CREATE',
      'payments',
      `Created payment of ${formatCurrency(amount)} for customer ${customer.name}`,
      req,
      'payment',
      payment.id
    );

    res.status(201).json({
      message: 'Payment logged successfully. Awaiting confirmation.',
      payment: paymentWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payments/:id/confirm
 * Confirm payment and update customer ledger (Maker-Checker workflow)
 * CRITICAL: Uses transaction for data integrity
 */
export const confirmPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Get payment with lock
    const payment = await Payment.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if already confirmed
    if (payment.status === 'confirmed') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment is already confirmed' });
    }

    // Check if voided
    if (payment.status === 'voided') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot confirm a voided payment' });
    }

    // Get customer with lock
    const customer = await Customer.findByPk(payment.customer_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update payment status
    payment.status = 'confirmed';
    payment.confirmed_by = req.user.id;
    payment.confirmed_at = new Date();
    await payment.save({ transaction });

    // Update customer ledger balance (increment - customer owes less)
    customer.ledger_balance = parseFloat(customer.ledger_balance) - parseFloat(payment.amount);
    await customer.save({ transaction });

    // Create ledger entry
    try {
      // Get branch from customer's most recent sale or use user's branch
      const recentSale = await SalesOrder.findOne({
        where: { customer_id: payment.customer_id },
        order: [['created_at', 'DESC']],
        transaction
      });

      await createLedgerEntry(
        payment.customer_id,
        'customer',
        {
          transaction_date: new Date(),
          transaction_type: 'PAYMENT',
          transaction_id: payment.id,
          description: `Payment ${payment.method}`,
          debit_amount: 0,
          credit_amount: parseFloat(payment.amount),
          branch_id: recentSale?.branch_id || req.user.branch_id,
          created_by: req.user.id
        }
      );
    } catch (ledgerError) {
      console.error('Error creating ledger entry:', ledgerError);
      // Don't fail the payment confirmation if ledger entry fails
    }

    // Commit transaction
    await transaction.commit();

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    // Log activity
    await logActivitySync(
      'CONFIRM',
      'payments',
      `Confirmed payment of ${formatCurrency(payment.amount)} for customer ${customer.name}`,
      req,
      'payment',
      payment.id
    );

    res.json({
      message: 'Payment confirmed and ledger updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/payments
 * List payments with filtering and pagination
 */
export const getPayments = async (req, res, next) => {
  try {
    const { customer_id, status, branch_id, limit = 100, offset = 0 } = req.query;
    const where = {};

    if (customer_id) {
      where.customer_id = customer_id;
    }

    if (status) {
      where.status = status;
    }

    // Apply branch filter if user is not Super Admin
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Payment.count({ where });

    res.json({ 
      payments,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/recent
 * Get recent payments (last 50) with status indicators
 */
export const getRecentPayments = async (req, res, next) => {
  try {
    const { customer_id, status, branch_id } = req.query;
    const where = {};

    if (customer_id) {
      where.customer_id = customer_id;
    }

    if (status) {
      where.status = status;
    }

    // Apply branch filter if user is not Super Admin
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/pending
 * List pending payments (for approval queue)
 */
export const getPendingPayments = async (req, res, next) => {
  try {
    const where = { status: 'pending_confirmation' };

    // Apply branch filter if user is not Super Admin
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      where.branch_id = req.user.branch_id;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

