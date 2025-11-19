import sequelize from '../config/db.js';
import { Payment, Customer, User } from '../models/index.js';

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
 * List payments
 */
export const getPayments = async (req, res, next) => {
  try {
    const { customer_id, status } = req.query;
    const where = {};

    if (customer_id) {
      where.customer_id = customer_id;
    }

    if (status) {
      where.status = status;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
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
    const payments = await Payment.findAll({
      where: { status: 'pending_confirmation' },
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

