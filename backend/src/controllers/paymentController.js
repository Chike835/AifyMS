import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { Payment, Customer, User, SalesOrder, PaymentAccount, AccountTransaction } from '../models/index.js';
import { logActivitySync } from '../middleware/activityLogger.js';
import { createLedgerEntry, calculateAdvanceBalance } from '../services/ledgerService.js';
import { getLocale, getCurrency } from '../config/locale.js';

/**
 * Helper function to format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: getCurrency()
  }).format(amount || 0);
};

const loadPaymentAccountForUser = async (accountId, req, options = {}) => {
  if (!accountId) {
    const error = new Error('Payment account is required');
    error.statusCode = 400;
    throw error;
  }

  const paymentAccount = await PaymentAccount.findByPk(accountId, {
    transaction: options.transaction,
    lock: options.lock
  });

  if (!paymentAccount) {
    const error = new Error('Payment account not found');
    error.statusCode = 404;
    throw error;
  }

  if (req.user?.role_name !== 'Super Admin') {
    const userBranchId = req.user?.branch_id;
    if (paymentAccount.branch_id && userBranchId && paymentAccount.branch_id !== userBranchId) {
      const error = new Error('You do not have access to this payment account');
      error.statusCode = 403;
      throw error;
    }
  }

  return paymentAccount;
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
      reference_note,
      payment_account_id
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

    // Validate payment account
    let paymentAccount = null;
    try {
      paymentAccount = await loadPaymentAccountForUser(payment_account_id, req);
    } catch (accountError) {
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Create payment with pending_confirmation status
    const payment = await Payment.create({
      customer_id,
      amount,
      method,
      status: 'pending_confirmation',
      payment_account_id: paymentAccount?.id || null,
      created_by: req.user.id,
      reference_note: reference_note || null
    });

    // Load with associations
    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
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
    const { payment_account_id: overridePaymentAccountId } = req.body || {};

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

    let accountId = payment.payment_account_id;
    if (!accountId && overridePaymentAccountId) {
      accountId = overridePaymentAccountId;
    } else if (accountId && overridePaymentAccountId && accountId !== overridePaymentAccountId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment already linked to a different payment account' });
    }

    if (!accountId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment account is required to confirm this payment' });
    }

    let paymentAccount;
    try {
      paymentAccount = await loadPaymentAccountForUser(accountId, req, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
    } catch (accountError) {
      await transaction.rollback();
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Update payment status
    payment.status = 'confirmed';
    payment.confirmed_by = req.user.id;
    payment.confirmed_at = new Date();
    payment.payment_account_id = paymentAccount.id;
    await payment.save({ transaction });

    // Update customer ledger balance (increment - customer owes less)
    customer.ledger_balance = parseFloat(customer.ledger_balance) - parseFloat(payment.amount);
    await customer.save({ transaction });

    // Create ledger entry (within transaction - must succeed or entire payment rolls back)
    // Get branch from customer's most recent sale or use user's branch
    const recentSale = await SalesOrder.findOne({
      where: { customer_id: payment.customer_id },
      order: [['created_at', 'DESC']],
      transaction
    });
    const branchId = recentSale?.branch_id || paymentAccount?.branch_id || req.user.branch_id;

    await createLedgerEntry(
      payment.customer_id,
      'customer',
      {
        transaction_date: payment.created_at || new Date(),
        transaction_type: 'PAYMENT',
        transaction_id: payment.id,
        description: `Payment ${payment.method}`,
        debit_amount: 0,
        credit_amount: parseFloat(payment.amount),
        branch_id: branchId,
        created_by: req.user.id
      },
      transaction
    );

    // Record deposit into payment account
    await AccountTransaction.create({
      account_id: paymentAccount.id,
      transaction_type: 'deposit',
      amount: parseFloat(payment.amount),
      reference_type: 'payment',
      reference_id: payment.id,
      notes: `Customer payment (${payment.method})`,
      user_id: req.user.id
    }, { transaction });

    paymentAccount.current_balance = parseFloat(paymentAccount.current_balance || 0) + parseFloat(payment.amount);
    await paymentAccount.save({ transaction });

    // Commit transaction (only after all operations succeed, including ledger entry)
    await transaction.commit();

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
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
    // Payments don't have branch_id, so filter by creator's branch_id
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      // Get all user IDs from the same branch
      const branchUsers = await User.findAll({
        where: { branch_id: req.user.branch_id },
        attributes: ['id']
      });
      where.created_by = {
        [Op.in]: branchUsers.map(u => u.id)
      };
    } else if (branch_id) {
      const branchUsers = await User.findAll({
        where: { branch_id: branch_id },
        attributes: ['id']
      });
      where.created_by = {
        [Op.in]: branchUsers.map(u => u.id)
      };
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email', 'branch_id'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
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
    // Payments don't have branch_id, so filter by creator's branch_id
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      // Get all user IDs from the same branch
      const branchUsers = await User.findAll({
        where: { branch_id: req.user.branch_id },
        attributes: ['id']
      });
      where.created_by = {
        [Op.in]: branchUsers.map(u => u.id)
      };
    } else if (branch_id) {
      const branchUsers = await User.findAll({
        where: { branch_id: branch_id },
        attributes: ['id']
      });
      where.created_by = {
        [Op.in]: branchUsers.map(u => u.id)
      };
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email', 'branch_id'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
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
    // Payments don't have branch_id, so filter by creator's branch_id
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      // Get all user IDs from the same branch
      const branchUsers = await User.findAll({
        where: { branch_id: req.user.branch_id },
        attributes: ['id']
      });
      where.created_by = {
        [Op.in]: branchUsers.map(u => u.id)
      };
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email', 'branch_id'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/advance
 * Create an advance payment (payment without invoice linkage)
 * Uses maker-checker workflow: creates payment with pending_confirmation status
 */
export const addAdvance = async (req, res, next) => {
  try {
    const {
      customer_id,
      amount,
      method,
      reference_note,
      payment_account_id
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

    let paymentAccount = null;
    try {
      paymentAccount = await loadPaymentAccountForUser(payment_account_id, req);
    } catch (accountError) {
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Create payment with pending_confirmation status
    const payment = await Payment.create({
      customer_id,
      amount,
      method,
      status: 'pending_confirmation',
      payment_account_id: paymentAccount?.id || null,
      created_by: req.user.id,
      reference_note: reference_note || null
    });

    // Load with associations
    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
      ]
    });

    // Log activity
    await logActivitySync(
      'CREATE',
      'payments',
      `Created advance payment of ${formatCurrency(amount)} for customer ${customer.name}`,
      req,
      'payment',
      payment.id
    );

    res.status(201).json({
      message: 'Advance payment logged successfully. Awaiting confirmation.',
      payment: paymentWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payments/:id/confirm-advance
 * Confirm advance payment and create ledger entry with ADVANCE_PAYMENT type
 */
export const confirmAdvancePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { payment_account_id: overridePaymentAccountId } = req.body || {};

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

    // Get customer with lock
    const customer = await Customer.findByPk(payment.customer_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }

    let accountId = payment.payment_account_id;
    if (!accountId && overridePaymentAccountId) {
      accountId = overridePaymentAccountId;
    } else if (accountId && overridePaymentAccountId && accountId !== overridePaymentAccountId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment already linked to a different payment account' });
    }

    if (!accountId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment account is required to confirm this payment' });
    }

    let paymentAccount;
    try {
      paymentAccount = await loadPaymentAccountForUser(accountId, req, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
    } catch (accountError) {
      await transaction.rollback();
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Update payment status
    payment.status = 'confirmed';
    payment.confirmed_by = req.user.id;
    payment.confirmed_at = new Date();
    payment.payment_account_id = paymentAccount.id;
    await payment.save({ transaction });

    // Update customer ledger balance (decrease - customer paid advance)
    customer.ledger_balance = parseFloat(customer.ledger_balance) - parseFloat(payment.amount);
    await customer.save({ transaction });

    // Create ledger entry with ADVANCE_PAYMENT type (within transaction - must succeed or entire payment rolls back)
    const recentSale = await SalesOrder.findOne({
      where: { customer_id: payment.customer_id },
      order: [['created_at', 'DESC']],
      transaction
    });
    const branchId = recentSale?.branch_id || paymentAccount?.branch_id || req.user.branch_id;

    await createLedgerEntry(
      payment.customer_id,
      'customer',
      {
        transaction_date: payment.created_at || new Date(),
        transaction_type: 'ADVANCE_PAYMENT',
        transaction_id: payment.id,
        description: `Advance Payment ${payment.method}`,
        debit_amount: 0,
        credit_amount: parseFloat(payment.amount),
        branch_id: branchId,
        created_by: req.user.id
      },
      transaction
    );

    await AccountTransaction.create({
      account_id: paymentAccount.id,
      transaction_type: 'deposit',
      amount: parseFloat(payment.amount),
      reference_type: 'advance_payment',
      reference_id: payment.id,
      notes: `Advance payment (${payment.method})`,
      user_id: req.user.id
    }, { transaction });

    paymentAccount.current_balance = parseFloat(paymentAccount.current_balance || 0) + parseFloat(payment.amount);
    await paymentAccount.save({ transaction });

    // Commit transaction (only after all operations succeed, including ledger entry)
    await transaction.commit();

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
      ]
    });

    // Log activity
    await logActivitySync(
      'CONFIRM',
      'payments',
      `Confirmed advance payment of ${formatCurrency(payment.amount)} for customer ${customer.name}`,
      req,
      'payment',
      payment.id
    );

    res.json({
      message: 'Advance payment confirmed and ledger updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/payments/refund
 * Process refund of advance balance with withdrawal fee
 * Creates two ledger entries: REFUND and REFUND_FEE
 */
export const processRefund = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      customer_id,
      refund_amount,
      withdrawal_fee = 0,
      method,
      reference_note,
      payment_account_id
    } = req.body;

    // Validation
    if (!customer_id || refund_amount === undefined || !method) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Missing required fields: customer_id, refund_amount, method'
      });
    }

    if (refund_amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Refund amount must be greater than 0' });
    }

    if (withdrawal_fee < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Withdrawal fee cannot be negative' });
    }

    // Verify customer exists and lock the record
    const customer = await Customer.findByPk(customer_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check advance balance AFTER acquiring lock to prevent race conditions
    // Recalculate balance within transaction context to ensure accuracy
    const advanceBalance = await calculateAdvanceBalance(customer_id, transaction);
    const totalRefundAmount = parseFloat(refund_amount) + parseFloat(withdrawal_fee || 0);

    if (totalRefundAmount > advanceBalance) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Insufficient advance balance. Available: ${formatCurrency(advanceBalance)}, Requested: ${formatCurrency(totalRefundAmount)}`
      });
    }

    // Update customer ledger balance
    // Refund DECREASES what customer owes (credit to customer), fee INCREASES debt
    // For negative balances (advance), adding refund_amount reduces the advance
    customer.ledger_balance = parseFloat(customer.ledger_balance) + parseFloat(refund_amount) + parseFloat(withdrawal_fee || 0);
    await customer.save({ transaction });

    // Create payment account transaction (withdrawal) if payment_account_id provided
    if (payment_account_id) {
      const paymentAccount = await PaymentAccount.findByPk(payment_account_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (paymentAccount) {
        // Record withdrawal from payment account
        await AccountTransaction.create({
          account_id: payment_account_id,
          transaction_type: 'withdrawal',
          amount: parseFloat(refund_amount),
          reference_type: 'customer_refund',
          reference_id: customer_id,
          notes: `Refund to ${customer.name}${reference_note ? ` - ${reference_note}` : ''}`,
          user_id: req.user.id
        }, { transaction });

        // Update payment account balance
        paymentAccount.current_balance = parseFloat(paymentAccount.current_balance || 0) - parseFloat(refund_amount);
        await paymentAccount.save({ transaction });
      }
    }

    // Create ledger entries (within transaction - must succeed or entire refund rolls back)
    const recentSale = await SalesOrder.findOne({
      where: { customer_id: customer_id },
      order: [['created_at', 'DESC']],
      transaction
    });
    const branchId = recentSale?.branch_id || req.user.branch_id;

    // Create Ledger Entry 1: REFUND - Credit Customer (decreases what they owe), Debit Cash (payout)
    const refundEntry = await createLedgerEntry(
      customer_id,
      'customer',
      {
        transaction_date: new Date(),
        transaction_type: 'REFUND',
        transaction_id: null,
        description: `Refund ${method}${reference_note ? ` - ${reference_note}` : ''}`,
        debit_amount: 0,
        credit_amount: parseFloat(refund_amount),
        branch_id: branchId,
        created_by: req.user.id
      },
      transaction
    );

    // Create Ledger Entry 2: REFUND_FEE - Debit Customer, Credit Revenue
    let feeEntry = null;
    if (parseFloat(withdrawal_fee || 0) > 0) {
      feeEntry = await createLedgerEntry(
        customer_id,
        'customer',
        {
          transaction_date: new Date(),
          transaction_type: 'REFUND_FEE',
          transaction_id: null,
          description: `Withdrawal Fee${reference_note ? ` - ${reference_note}` : ''}`,
          debit_amount: parseFloat(withdrawal_fee),
          credit_amount: 0,
          branch_id: branchId,
          created_by: req.user.id
        },
        transaction
      );
    }

    // Commit transaction (only after all operations succeed, including ledger entries)
    await transaction.commit();

    // Log activity (outside transaction - activity logging is non-critical)
    await logActivitySync(
      'CREATE',
      'payments',
      `Processed refund of ${formatCurrency(refund_amount)}${withdrawal_fee > 0 ? ` with fee of ${formatCurrency(withdrawal_fee)}` : ''} for customer ${customer.name}`,
      req,
      'payment',
      null
    );

    res.json({
      message: 'Refund processed successfully',
      refund_entry: refundEntry,
      fee_entry: feeEntry,
      total_refunded: parseFloat(refund_amount),
      fee_charged: parseFloat(withdrawal_fee || 0),
      net_refund: parseFloat(refund_amount) - parseFloat(withdrawal_fee || 0)
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

