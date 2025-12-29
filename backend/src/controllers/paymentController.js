import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { Payment, Customer, Supplier, User, SalesOrder, PaymentAccount, AccountTransaction, Branch, LedgerEntry, Expense, ExpenseCategory } from '../models/index.js';
import { logActivitySync } from '../middleware/activityLogger.js';
import { createLedgerEntry, calculateAdvanceBalance, recalculateSubsequentBalances } from '../services/ledgerService.js';
import { getLocale, getCurrency } from '../config/locale.js';
import { safeRollback } from '../utils/transactionUtils.js';

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
 * CRITICAL: Uses transaction for data integrity - payment and ledger entry must be atomic
 */
export const createPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      customer_id,
      supplier_id,
      amount,
      method,
      reference_note,
      payment_account_id
    } = req.body;

    // Validation
    if ((!customer_id && !supplier_id) || amount === undefined || !method) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Missing required fields: customer_id OR supplier_id, amount, method'
      });
    }

    // Check permission for supplier payments
    if (supplier_id) {
      const userPermissions = req.user?.permissions || [];
      const isSuperAdmin = req.user?.role_name?.toLowerCase() === 'super admin';
      if (!isSuperAdmin && !userPermissions.includes('supplier_payment')) {
        await safeRollback(transaction);
        return res.status(403).json({
          error: 'You do not have permission to make supplier payments. Contact your administrator to grant the "supplier_payment" permission.'
        });
      }
    }

    if (amount <= 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const validMethods = ['cash', 'transfer', 'pos'];
    if (!validMethods.includes(method)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: `Invalid method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    // Verify contact exists
    let customer = null;
    let supplier = null;

    if (customer_id) {
      customer = await Customer.findByPk(customer_id, { transaction });
      if (!customer) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else if (supplier_id) {
      supplier = await Supplier.findByPk(supplier_id, { transaction });
      if (!supplier) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    // Validate payment account
    let paymentAccount = null;
    try {
      paymentAccount = await loadPaymentAccountForUser(payment_account_id, req, { transaction });
    } catch (accountError) {
      await safeRollback(transaction);
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Resolve Branch ID (Robust Fallback) - do this before creating payment
    let branchId = req.user?.branch_id;
    if (!branchId) {
      // Try to find a default branch or the first available one
      const defaultBranch = await Branch.findOne({ order: [['id', 'ASC']], transaction });
      branchId = defaultBranch?.id;
    }

    // Create payment with pending_confirmation status (within transaction)
    const payment = await Payment.create({
      customer_id: customer_id || null,
      supplier_id: supplier_id || null,
      amount,
      method,
      status: 'pending_confirmation',
      payment_account_id: paymentAccount?.id || null,
      created_by: req.user.id,
      reference_note: reference_note || null
    }, { transaction });

    // Create Ledger Entry (Pending) - within transaction for atomicity
    // This will be visible in the ledger but excluded from balance calculations until confirmed
    await createLedgerEntry(
      payment.customer_id || payment.supplier_id,
      payment.customer_id ? 'customer' : 'supplier',
      {
        transaction_date: payment.created_at,
        transaction_type: 'PAYMENT',
        transaction_id: payment.id,
        description: `Payment ${payment.method} (Pending)`,
        debit_amount: payment.customer_id ? 0 : parseFloat(payment.amount), // Supplier payment is Debit (reduces our payable)
        credit_amount: payment.customer_id ? parseFloat(payment.amount) : 0, // Customer payment is Credit (reduces their receivable)
        branch_id: branchId,
        created_by: req.user.id
      },
      transaction
    );

    // Commit transaction only after all operations succeed
    await transaction.commit();

    // Load with associations (outside transaction for better performance)
    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
      ]
    });

    // Log activity (outside transaction - activity logging is non-critical)
    const contactName = customer ? customer.name : supplier?.name;
    const contactType = customer ? 'customer' : 'supplier';

    await logActivitySync(
      'CREATE',
      'payments',
      `Created payment of ${formatCurrency(amount)} for ${contactType} ${contactName}`,
      req,
      'payment',
      payment.id
    );

    res.status(201).json({
      message: 'Payment logged successfully. Awaiting confirmation.',
      payment: paymentWithDetails
    });
  } catch (error) {
    await transaction.rollback();
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
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if already confirmed
    if (payment.status === 'confirmed') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment is already confirmed' });
    }

    // Check if voided
    if (payment.status === 'voided') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Cannot confirm a voided payment' });
    }

    // Get contact with lock
    let customer = null;
    let supplier = null;

    if (payment.customer_id) {
      customer = await Customer.findByPk(payment.customer_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (!customer) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else if (payment.supplier_id) {
      supplier = await Supplier.findByPk(payment.supplier_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (!supplier) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    let accountId = payment.payment_account_id;
    if (!accountId && overridePaymentAccountId) {
      accountId = overridePaymentAccountId;
    } else if (accountId && overridePaymentAccountId && accountId !== overridePaymentAccountId) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment already linked to a different payment account' });
    }

    if (!accountId) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment account is required to confirm this payment' });
    }

    let paymentAccount;
    try {
      paymentAccount = await loadPaymentAccountForUser(accountId, req, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
    } catch (accountError) {
      await safeRollback(transaction);
      return res.status(accountError.statusCode || 500).json({ error: accountError.message });
    }

    // Update payment status
    payment.status = 'confirmed';
    payment.confirmed_by = req.user.id;
    payment.confirmed_at = new Date();
    payment.payment_account_id = paymentAccount.id;
    await payment.save({ transaction });

    // Update contact ledger balance
    if (customer) {
      // Customer pays us: Balance decreases (Credit)
      customer.ledger_balance = parseFloat(customer.ledger_balance) - parseFloat(payment.amount);
      await customer.save({ transaction });

      // Auto-update payment status for unpaid invoices if customer balance covers them
      // After payment, check if customer has enough credit (negative balance) to cover unpaid invoices
      const updatedBalance = parseFloat(customer.ledger_balance);
      
      // Get all unpaid invoices for this customer, ordered by date (oldest first)
      const unpaidInvoices = await SalesOrder.findAll({
        where: {
          customer_id: customer.id,
          payment_status: { [Op.in]: ['unpaid', 'partial'] },
          order_type: 'invoice'
        },
        order: [['created_at', 'ASC']],
        transaction
      });

      // Process invoices in order, marking as paid if balance covers them
      let remainingCredit = -updatedBalance; // Negative balance = credit available
      for (const invoice of unpaidInvoices) {
        const invoiceAmount = parseFloat(invoice.total_amount);
        
        // Check if we have enough credit to cover this invoice
        if (remainingCredit >= invoiceAmount) {
          invoice.payment_status = 'paid';
          await invoice.save({ transaction });
          remainingCredit -= invoiceAmount;
        } else if (remainingCredit > 0) {
          // Partial payment
          invoice.payment_status = 'partial';
          await invoice.save({ transaction });
          remainingCredit = 0; // No more credit left
          break;
        } else {
          // No more credit, stop processing
          break;
        }
      }
    } else if (supplier) {
      // We pay supplier: Balance decreases (Debit) (if balance is +ve meaning we owe them)
      // Supplier ledger: Positive = We owe them. Negative = They owe us.
      // Payment reduces the amount we owe.
      supplier.ledger_balance = parseFloat(supplier.ledger_balance) - parseFloat(payment.amount);
      await supplier.save({ transaction });
    }

    // Link Ledger Entry
    // Check if an entry already exists (created during createPayment)
    const existingEntry = await LedgerEntry.findOne({
      where: {
        transaction_id: payment.id,
        transaction_type: 'PAYMENT',
        contact_id: payment.customer_id || payment.supplier_id,
        contact_type: payment.customer_id ? 'customer' : 'supplier'
      },
      transaction
    });

    // Get robust branch ID
    // Try recent sale, payment account branch, user branch, or fallback to any branch
    // Try recent sale/purchase, payment account branch, user branch, or fallback
    let relatedTransaction = null;
    if (payment.customer_id) {
      relatedTransaction = await SalesOrder.findOne({
        where: { customer_id: payment.customer_id },
        order: [['created_at', 'DESC']],
        transaction
      });
    } else if (payment.supplier_id) {
      // For suppliers, check recent Purchase
      // We need to import Purchase model to do this, or just skip it.
      // Since Purchase is not imported, let's skip searching for purchase to avoid error
      // and rely on Payment Account or User branch.
    }

    // Get branch ID - prefer explicit sources, avoid fallback to "any branch" for expenses
    let branchId = relatedTransaction?.branch_id || paymentAccount?.branch_id || req.user.branch_id;
    // Use fallback only for ledger entries AND expenses if needed

    // Use fallback only for ledger entries if needed
    if (!branchId) {
      const anyBranch = await Branch.findOne({ transaction });
      branchId = anyBranch?.id;
    }

    if (existingEntry) {
      // Update existing entry
      existingEntry.description = `Payment ${payment.method}`; // Remove (Pending)
      existingEntry.transaction_date = payment.confirmed_at || new Date(); // Update date to confirmation? Or keep creation? usually confirmation
      existingEntry.branch_id = branchId; // Ensure correct branch
      await existingEntry.save({ transaction });

      // Trigger recalculation since we updated the entry and the payment status is now confirmed
      // The service filter check (status != confirmed) will now pass, so it will be included
      await recalculateSubsequentBalances(
        payment.customer_id || payment.supplier_id,
        payment.customer_id ? 'customer' : 'supplier',
        existingEntry.transaction_date,
        branchId,
        transaction
      );
    } else {
      // Create new if missing
      await createLedgerEntry(
        payment.customer_id || payment.supplier_id,
        payment.customer_id ? 'customer' : 'supplier',
        {
          transaction_date: payment.created_at || new Date(),
          transaction_type: 'PAYMENT',
          transaction_id: payment.id,
          description: `Payment ${payment.method}`,
          debit_amount: payment.supplier_id ? parseFloat(payment.amount) : 0, // Supplier = Debit
          credit_amount: payment.customer_id ? parseFloat(payment.amount) : 0, // Customer = Credit
          branch_id: branchId,
          created_by: req.user.id
        },
        transaction
      );
    }

    // Record transaction into payment account
    // Customer payments = deposit (money coming in)
    // Supplier payments = withdrawal (money going out)
    const isSupplierPayment = !!payment.supplier_id;
    const transactionType = isSupplierPayment ? 'withdrawal' : 'deposit';
    const contactName = payment.customer?.name || payment.supplier?.name;
    const contactType = isSupplierPayment ? 'supplier' : 'customer';

    await AccountTransaction.create({
      account_id: paymentAccount.id,
      transaction_type: transactionType,
      amount: parseFloat(payment.amount),
      reference_type: 'payment',
      reference_id: payment.id,
      notes: `${contactType.charAt(0).toUpperCase() + contactType.slice(1)} payment (${payment.method})`,
      user_id: req.user.id
    }, { transaction });

    // Update payment account balance
    if (isSupplierPayment) {
      paymentAccount.current_balance = parseFloat(paymentAccount.current_balance || 0) - parseFloat(payment.amount);
    } else {
      paymentAccount.current_balance = parseFloat(paymentAccount.current_balance || 0) + parseFloat(payment.amount);
    }
    await paymentAccount.save({ transaction });

    // ----------------------------------------------------------------
    // AUTO-CREATE EXPENSE FOR SUPPLIER PAYMENTS
    // ----------------------------------------------------------------
    if (isSupplierPayment) {
      // 1. Find or Create "Supplier Payments" Category (global, no branch restriction)
      const categoryName = 'Supplier Payments';
      let expenseCategory = await ExpenseCategory.findOne({
        where: {
          name: { [Op.iLike]: categoryName } // Case-insensitive search
        },
        transaction
      });

      if (!expenseCategory) {
        expenseCategory = await ExpenseCategory.create({
          name: categoryName
        }, { transaction });
      }

      // 2. Create Expense Record
      // Check if expense already exists for this payment (idempotency)
      // Use branchId (which includes fallbacks) to ensure expense is recorded
      const existingExpense = await Expense.findOne({
        where: {
          description: { [Op.iLike]: `%Payment #${payment.id}%` },
          amount: parseFloat(payment.amount),
          branch_id: branchId
        },
        transaction
      });

      if (!existingExpense) {
        // Ensure we have a branch ID (should be guaranteed by fallback logic above)
        if (branchId) {
          await Expense.create({
            category_id: expenseCategory.id,
            branch_id: branchId,
            user_id: req.user.id,
            amount: parseFloat(payment.amount),
            description: `Supplier Payment #${payment.id} - ${supplier.name} (${payment.method})`,
            expense_date: payment.confirmed_at || new Date()
          }, { transaction });
        }
      }
    }

    // Commit transaction (only after all operations succeed, including ledger entry)
    await transaction.commit();

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'] }
      ]
    });

    // Log activity
    const confContactName = customer ? customer.name : supplier?.name;
    const confContactType = customer ? 'customer' : 'supplier';

    await logActivitySync(
      'CONFIRM',
      'payments',
      `Confirmed payment of ${formatCurrency(payment.amount)} for ${confContactType} ${confContactName}`,
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
 * PUT /api/payments/:id/decline
 * Decline (void) a pending payment
 */
export const declinePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!payment) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending_confirmation') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Only pending payments can be declined' });
    }

    // Void the payment
    payment.status = 'voided';
    await payment.save({ transaction });

    // We don't need to delete the ledger entry because our filter in ledgerService
    // excludes payments where status != 'confirmed'.
    // Optionally we could update the description to say (Declined)
    const entry = await LedgerEntry.findOne({
      where: {
        transaction_id: payment.id,
        transaction_type: 'PAYMENT'
      },
      transaction
    });

    if (entry) {
      entry.description = `${entry.description} (Declined)`;
      await entry.save({ transaction });
    }

    await logActivitySync(
      'DECLINE',
      'payments',
      `Declined payment of ${formatCurrency(payment.amount)}`,
      req,
      'payment',
      payment.id
    );

    await transaction.commit();

    res.json({ message: 'Payment declined successfully', payment });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/payments/:id
 * Delete a payment from the ledger
 * Permission: payment_delete
 * 
 * Rules:
 * - Cannot delete if payment is linked to sales orders that are marked as paid AND still exist in ledger
 * - Deletes payment, ledger entry, recalculates balances, and refreshes sales order payment statuses
 */
export const deletePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
      include: [
        { model: Customer, as: 'customer' },
        { model: Supplier, as: 'supplier' }
      ]
    });

    if (!payment) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Get contact with lock
    let customer = null;
    let supplier = null;
    const contactType = payment.customer_id ? 'customer' : 'supplier';
    const contactId = payment.customer_id || payment.supplier_id;

    if (payment.customer_id) {
      customer = await Customer.findByPk(payment.customer_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (!customer) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else if (payment.supplier_id) {
      supplier = await Supplier.findByPk(payment.supplier_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      if (!supplier) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    // For customer payments, check if deletion would break sales order production status
    if (customer) {
      // Find all sales orders for this customer that are marked as produced or delivered
      const producedSalesOrders = await SalesOrder.findAll({
        where: {
          customer_id: customer.id,
          production_status: { [Op.in]: ['produced', 'delivered'] },
          order_type: 'invoice'
        },
        transaction
      });

      // If there are sales orders with production_status of 'produced' or 'delivered', block deletion
      if (producedSalesOrders.length > 0) {
        await safeRollback(transaction);
        const invoiceNumbers = producedSalesOrders
          .map(so => so.invoice_number || so.id)
          .join(', ');
        return res.status(400).json({
          error: `Cannot delete payment. The following invoices have production status of 'produced' or 'delivered': ${invoiceNumbers}. Please cancel those invoices first if you need to delete the payment.`
        });
      }
    }

    // Find the ledger entry for this payment
    const ledgerEntry = await LedgerEntry.findOne({
      where: {
        contact_id: contactId,
        contact_type: contactType,
        transaction_type: 'PAYMENT',
        transaction_id: payment.id
      },
      transaction
    });

    // Store entry details for recalculation before deletion
    let entryDate = null;
    let entryBranchId = null;
    if (ledgerEntry) {
      entryDate = ledgerEntry.transaction_date;
      entryBranchId = ledgerEntry.branch_id;
    }

    // Delete account transaction if payment was confirmed
    if (payment.status === 'confirmed' && payment.payment_account_id) {
      await AccountTransaction.destroy({
        where: {
          payment_id: payment.id
        },
        transaction
      });
    }

    // Delete ledger entry if it exists
    if (ledgerEntry) {
      await ledgerEntry.destroy({ transaction });
    }

    // Delete the payment
    await payment.destroy({ transaction });

    // Recalculate balances if we deleted a ledger entry
    if (ledgerEntry && entryDate) {
      await recalculateSubsequentBalances(
        contactId,
        contactType,
        entryDate,
        entryBranchId,
        transaction
      );
    }

    // Refresh sales order payment statuses for customer payments
    if (customer) {
      const updatedBalance = parseFloat(customer.ledger_balance);
      
      // Get all unpaid invoices for this customer, ordered by date (oldest first)
      const unpaidInvoices = await SalesOrder.findAll({
        where: {
          customer_id: customer.id,
          payment_status: { [Op.in]: ['unpaid', 'partial'] },
          order_type: 'invoice'
        },
        order: [['created_at', 'ASC']],
        transaction
      });

      // Process invoices in order, marking as paid if balance covers them
      let remainingCredit = -updatedBalance; // Negative balance = credit available
      for (const invoice of unpaidInvoices) {
        const invoiceAmount = parseFloat(invoice.total_amount);
        
        // Check if we have enough credit to cover this invoice
        if (remainingCredit >= invoiceAmount) {
          invoice.payment_status = 'paid';
          await invoice.save({ transaction });
          remainingCredit -= invoiceAmount;
        } else if (remainingCredit > 0) {
          // Partial payment
          invoice.payment_status = 'partial';
          await invoice.save({ transaction });
          remainingCredit = 0; // No more credit left
          break;
        } else {
          // No more credit, mark as unpaid
          if (invoice.payment_status !== 'unpaid') {
            invoice.payment_status = 'unpaid';
            await invoice.save({ transaction });
          }
          break;
        }
      }

      // Also check if any previously paid invoices should now be unpaid
      const paidInvoices = await SalesOrder.findAll({
        where: {
          customer_id: customer.id,
          payment_status: 'paid',
          order_type: 'invoice'
        },
        order: [['created_at', 'ASC']],
        transaction
      });

      // Check if we still have enough credit for all paid invoices
      let totalPaidAmount = 0;
      for (const invoice of paidInvoices) {
        totalPaidAmount += parseFloat(invoice.total_amount);
      }

      // If customer balance (negative = credit) is less than total paid amount, mark some as unpaid
      if (-updatedBalance < totalPaidAmount) {
        // Mark invoices as unpaid starting from the newest
        const sortedPaidInvoices = [...paidInvoices].reverse();
        let creditNeeded = totalPaidAmount + updatedBalance; // How much credit we're short

        for (const invoice of sortedPaidInvoices) {
          if (creditNeeded > 0) {
            const invoiceAmount = parseFloat(invoice.total_amount);
            invoice.payment_status = 'unpaid';
            await invoice.save({ transaction });
            creditNeeded -= invoiceAmount;
          } else {
            break;
          }
        }
      }
    }

    await logActivitySync(
      'DELETE',
      'payments',
      `Deleted payment of ${formatCurrency(payment.amount)}`,
      req,
      'payment',
      payment.id
    );

    await transaction.commit();

    res.json({ message: 'Payment deleted successfully' });

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
    let queryLimit = parseInt(limit);
    let queryOffset = parseInt(offset);

    if (queryLimit < 1) {
      queryLimit = null;
      // If limit is removed, offset typically makes no sense or should be 0, but let's keep it safe
      // If offset < 0 it will be invalid in SQL usually
    }
    if (queryOffset < 0) queryOffset = 0;

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
      limit: queryLimit,
      offset: queryOffset
    });

    const total = await Payment.count({ where });

    res.json({
      payments,
      total,
      limit: queryLimit,
      offset: queryOffset
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
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone'], required: false },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email', 'branch_id'] },
        { model: User, as: 'confirmer', attributes: ['id', 'full_name', 'email'], required: false },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'], required: false }
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
        { model: Customer, as: 'customer', required: false },
        { model: Supplier, as: 'supplier', required: false },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email', 'branch_id'] },
        { model: PaymentAccount, as: 'payment_account', attributes: ['id', 'name', 'account_type'], required: false }
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
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if already confirmed
    if (payment.status === 'confirmed') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment is already confirmed' });
    }

    // Get customer with lock
    const customer = await Customer.findByPk(payment.customer_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!customer) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Customer not found' });
    }

    let accountId = payment.payment_account_id;
    if (!accountId && overridePaymentAccountId) {
      accountId = overridePaymentAccountId;
    } else if (accountId && overridePaymentAccountId && accountId !== overridePaymentAccountId) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment already linked to a different payment account' });
    }

    if (!accountId) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Payment account is required to confirm this payment' });
    }

    let paymentAccount;
    try {
      paymentAccount = await loadPaymentAccountForUser(accountId, req, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
    } catch (accountError) {
      await safeRollback(transaction);
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

    // Auto-update payment status for unpaid invoices if customer balance covers them
    // After advance payment, check if customer has enough credit (negative balance) to cover unpaid invoices
    const updatedBalance = parseFloat(customer.ledger_balance);
    
    // Get all unpaid invoices for this customer, ordered by date (oldest first)
    const unpaidInvoices = await SalesOrder.findAll({
      where: {
        customer_id: customer.id,
        payment_status: { [Op.in]: ['unpaid', 'partial'] },
        order_type: 'invoice'
      },
      order: [['created_at', 'ASC']],
      transaction
    });

    // Process invoices in order, marking as paid if balance covers them
    let remainingCredit = -updatedBalance; // Negative balance = credit available
    for (const invoice of unpaidInvoices) {
      const invoiceAmount = parseFloat(invoice.total_amount);
      
      // Check if we have enough credit to cover this invoice
      if (remainingCredit >= invoiceAmount) {
        invoice.payment_status = 'paid';
        await invoice.save({ transaction });
        remainingCredit -= invoiceAmount;
      } else if (remainingCredit > 0) {
        // Partial payment
        invoice.payment_status = 'partial';
        await invoice.save({ transaction });
        remainingCredit = 0; // No more credit left
        break;
      } else {
        // No more credit, stop processing
        break;
      }
    }

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
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Missing required fields: customer_id, refund_amount, method'
      });
    }

    if (refund_amount <= 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Refund amount must be greater than 0' });
    }

    if (withdrawal_fee < 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Withdrawal fee cannot be negative' });
    }

    // Verify customer exists and lock the record
    const customer = await Customer.findByPk(customer_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!customer) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check advance balance AFTER acquiring lock to prevent race conditions
    // Recalculate balance within transaction context to ensure accuracy
    const advanceBalance = await calculateAdvanceBalance(customer_id, transaction);
    const totalRefundAmount = parseFloat(refund_amount) + parseFloat(withdrawal_fee || 0);

    if (totalRefundAmount > advanceBalance) {
      await safeRollback(transaction);
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

