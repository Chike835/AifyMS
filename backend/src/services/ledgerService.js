import sequelize from '../config/db.js';
import { 
  LedgerEntry, 
  Customer, 
  Supplier, 
  SalesOrder, 
  Purchase, 
  Payment, 
  SalesReturn, 
  PurchaseReturn,
  Branch,
  User
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Calculate running balance for a contact
 * Formula: Sum of all entries (debits - credits) up to transaction_date
 * Note: We start from 0 and sum all entries because ledger_balance already includes all entries.
 * If an OPENING_BALANCE entry exists, it will be included in the sum.
 */
const calculateRunningBalance = async (contactId, contactType, transactionDate, branchId = null) => {
  // Verify contact exists
  let contact;
  if (contactType === 'customer') {
    contact = await Customer.findByPk(contactId);
  } else {
    contact = await Supplier.findByPk(contactId);
  }

  if (!contact) {
    throw new Error(`${contactType} not found`);
  }

  // Get all ledger entries up to this transaction date
  // Note: We do NOT use ledger_balance as starting point because it already includes all entries
  // Starting from 0 and summing all entries ensures we don't double-count
  const where = {
    contact_id: contactId,
    contact_type: contactType,
    transaction_date: {
      [Op.lte]: transactionDate
    }
  };

  if (branchId) {
    where.branch_id = branchId;
  }

  const previousEntries = await LedgerEntry.findAll({
    where,
    order: [['transaction_date', 'ASC'], ['created_at', 'ASC']]
  });

  // Calculate running balance starting from 0
  // All entries (including OPENING_BALANCE if present) are summed
  let runningBalance = 0;
  for (const entry of previousEntries) {
    const debit = parseFloat(entry.debit_amount || 0);
    const credit = parseFloat(entry.credit_amount || 0);
    runningBalance = runningBalance + debit - credit;
  }

  return runningBalance;
};

/**
 * Create a ledger entry
 * @param {string} contactId - Customer or Supplier ID
 * @param {string} contactType - 'customer' or 'supplier'
 * @param {object} transactionData - Transaction details
 * @returns {Promise<LedgerEntry>}
 */
export const createLedgerEntry = async (contactId, contactType, transactionData) => {
  const {
    transaction_date,
    transaction_type,
    transaction_id = null,
    description = null,
    debit_amount = 0,
    credit_amount = 0,
    branch_id,
    created_by
  } = transactionData;

  // Validate debit/credit
  if (parseFloat(debit_amount) > 0 && parseFloat(credit_amount) > 0) {
    throw new Error('Either debit_amount or credit_amount must be zero');
  }
  if (parseFloat(debit_amount) === 0 && parseFloat(credit_amount) === 0) {
    throw new Error('Either debit_amount or credit_amount must be greater than zero');
  }

  // Calculate running balance
  const runningBalance = await calculateRunningBalance(
    contactId,
    contactType,
    transaction_date,
    branch_id
  );

  // Add current transaction to running balance
  const finalBalance = runningBalance + parseFloat(debit_amount) - parseFloat(credit_amount);

  // Create ledger entry
  const ledgerEntry = await LedgerEntry.create({
    contact_id: contactId,
    contact_type: contactType,
    transaction_date,
    transaction_type,
    transaction_id,
    description,
    debit_amount: parseFloat(debit_amount),
    credit_amount: parseFloat(credit_amount),
    running_balance: finalBalance,
    branch_id,
    created_by
  });

  // Update contact's ledger_balance
  if (contactType === 'customer') {
    const customer = await Customer.findByPk(contactId);
    if (customer) {
      customer.ledger_balance = finalBalance;
      await customer.save();
    }
  } else {
    const supplier = await Supplier.findByPk(contactId);
    if (supplier) {
      supplier.ledger_balance = finalBalance;
      await supplier.save();
    }
  }

  return ledgerEntry;
};

/**
 * Get ledger entries for a contact
 * @param {string} contactId - Customer or Supplier ID
 * @param {string} contactType - 'customer' or 'supplier'
 * @param {Date} startDate - Start date filter
 * @param {Date} endDate - End date filter
 * @param {string} branchId - Branch ID filter (optional)
 * @returns {Promise<Array>}
 */
export const getLedger = async (contactId, contactType, startDate = null, endDate = null, branchId = null) => {
  const where = {
    contact_id: contactId,
    contact_type: contactType
  };

  if (startDate || endDate) {
    where.transaction_date = {};
    if (startDate) {
      where.transaction_date[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.transaction_date[Op.lte] = end;
    }
  }

  if (branchId) {
    where.branch_id = branchId;
  }

  const entries = await LedgerEntry.findAll({
    where,
    include: [
      {
        model: contactType === 'customer' ? Customer : Supplier,
        as: contactType,
        attributes: ['id', 'name', 'phone', 'email', 'address', 'ledger_balance']
      },
      {
        model: Branch,
        as: 'branch',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'full_name', 'email']
      }
    ],
    order: [['transaction_date', 'ASC'], ['created_at', 'ASC']]
  });

  return entries;
};

/**
 * Calculate advance balance for a customer
 * Advance balance = Sum of ADVANCE_PAYMENT credits - Sum of REFUND debits
 * @param {string} customerId - Customer ID
 * @returns {Promise<number>} Advance balance amount
 */
export const calculateAdvanceBalance = async (customerId) => {
  // Sum of all ADVANCE_PAYMENT credits
  const advancePayments = await LedgerEntry.sum('credit_amount', {
    where: {
      contact_id: customerId,
      contact_type: 'customer',
      transaction_type: 'ADVANCE_PAYMENT'
    }
  }) || 0;

  // Sum of all REFUND credits (refunds reduce advance balance by decreasing credits)
  // Refunds are credits that decrease what customer owes, which also reduces their advance
  const refunds = await LedgerEntry.sum('credit_amount', {
    where: {
      contact_id: customerId,
      contact_type: 'customer',
      transaction_type: 'REFUND'
    }
  }) || 0;

  const advanceBalance = parseFloat(advancePayments) - parseFloat(refunds);
  return Math.max(0, advanceBalance); // Return 0 if negative
};

/**
 * Backfill historical ledger entries
 * This processes all historical transactions and creates ledger entries
 */
export const backfillHistoricalLedger = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting historical ledger backfill...');

    // 1. Process all historical sales_orders → create INVOICE entries (customer)
    console.log('Processing sales orders...');
    const salesOrders = await SalesOrder.findAll({
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'ASC']],
      transaction
    });

    for (const sale of salesOrders) {
      if (sale.customer_id && sale.total_amount) {
        try {
          await createLedgerEntry(
            sale.customer_id,
            'customer',
            {
              transaction_date: sale.created_at,
              transaction_type: 'INVOICE',
              transaction_id: sale.id,
              description: `Invoice ${sale.invoice_number}`,
              debit_amount: parseFloat(sale.total_amount),
              credit_amount: 0,
              branch_id: sale.branch_id,
              created_by: sale.user_id
            }
          );
        } catch (error) {
          console.error(`Error processing sale ${sale.id}:`, error.message);
        }
      }
    }

    // 2. Process all historical purchases → create INVOICE entries (supplier)
    console.log('Processing purchases...');
    const purchases = await Purchase.findAll({
      include: [
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'ASC']],
      transaction
    });

    for (const purchase of purchases) {
      if (purchase.supplier_id && purchase.total_amount) {
        try {
          await createLedgerEntry(
            purchase.supplier_id,
            'supplier',
            {
              transaction_date: purchase.created_at,
              transaction_type: 'INVOICE',
              transaction_id: purchase.id,
              description: `Purchase ${purchase.purchase_number}`,
              debit_amount: 0,
              credit_amount: parseFloat(purchase.total_amount),
              branch_id: purchase.branch_id,
              created_by: purchase.user_id
            }
          );
        } catch (error) {
          console.error(`Error processing purchase ${purchase.id}:`, error.message);
        }
      }
    }

    // 3. Process all historical payments → create PAYMENT entries (customer)
    console.log('Processing payments...');
    const payments = await Payment.findAll({
      include: [
        { model: Customer, as: 'customer' }
      ],
      where: {
        status: 'confirmed'
      },
      order: [['confirmed_at', 'ASC']],
      transaction
    });

    for (const payment of payments) {
      if (payment.customer_id && payment.amount && payment.confirmed_at) {
        try {
          // Get branch from customer's most recent sale or default
          const recentSale = await SalesOrder.findOne({
            where: { customer_id: payment.customer_id },
            order: [['created_at', 'DESC']],
            transaction
          });

          await createLedgerEntry(
            payment.customer_id,
            'customer',
            {
              transaction_date: payment.confirmed_at,
              transaction_type: 'PAYMENT',
              transaction_id: payment.id,
              description: `Payment ${payment.method}`,
              debit_amount: 0,
              credit_amount: parseFloat(payment.amount),
              branch_id: recentSale?.branch_id || null,
              created_by: payment.confirmed_by || payment.created_by
            }
          );
        } catch (error) {
          console.error(`Error processing payment ${payment.id}:`, error.message);
        }
      }
    }

    // 4. Process all historical sales_returns → create RETURN entries (customer)
    console.log('Processing sales returns...');
    const salesReturns = await SalesReturn.findAll({
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      where: {
        status: 'completed'
      },
      order: [['created_at', 'ASC']],
      transaction
    });

    for (const return_ of salesReturns) {
      if (return_.customer_id && return_.total_amount) {
        try {
          await createLedgerEntry(
            return_.customer_id,
            'customer',
            {
              transaction_date: return_.created_at,
              transaction_type: 'RETURN',
              transaction_id: return_.id,
              description: `Sales Return ${return_.return_number}`,
              debit_amount: 0,
              credit_amount: parseFloat(return_.total_amount),
              branch_id: return_.branch_id,
              created_by: return_.user_id
            }
          );
        } catch (error) {
          console.error(`Error processing sales return ${return_.id}:`, error.message);
        }
      }
    }

    // 5. Process all historical purchase_returns → create RETURN entries (supplier)
    console.log('Processing purchase returns...');
    const purchaseReturns = await PurchaseReturn.findAll({
      include: [
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' }
      ],
      where: {
        status: 'completed'
      },
      order: [['created_at', 'ASC']],
      transaction
    });

    for (const return_ of purchaseReturns) {
      if (return_.supplier_id && return_.total_amount) {
        try {
          await createLedgerEntry(
            return_.supplier_id,
            'supplier',
            {
              transaction_date: return_.created_at,
              transaction_type: 'RETURN',
              transaction_id: return_.id,
              description: `Purchase Return ${return_.return_number}`,
              debit_amount: parseFloat(return_.total_amount),
              credit_amount: 0,
              branch_id: return_.branch_id,
              created_by: return_.user_id
            }
          );
        } catch (error) {
          console.error(`Error processing purchase return ${return_.id}:`, error.message);
        }
      }
    }

    // 6. Create opening balance entries for existing customers/suppliers with non-zero balances
    console.log('Creating opening balance entries...');
    const customers = await Customer.findAll({
      where: {
        ledger_balance: {
          [Op.ne]: 0
        }
      },
      transaction
    });

    for (const customer of customers) {
      const existingEntry = await LedgerEntry.findOne({
        where: {
          contact_id: customer.id,
          contact_type: 'customer',
          transaction_type: 'OPENING_BALANCE'
        },
        transaction
      });

      if (!existingEntry && parseFloat(customer.ledger_balance) !== 0) {
        try {
          // Get earliest transaction date or use customer creation date
          const earliestSale = await SalesOrder.findOne({
            where: { customer_id: customer.id },
            order: [['created_at', 'ASC']],
            transaction
          });

          await createLedgerEntry(
            customer.id,
            'customer',
            {
              transaction_date: earliestSale?.created_at || customer.created_at || new Date(),
              transaction_type: 'OPENING_BALANCE',
              transaction_id: null,
              description: 'Opening Balance',
              debit_amount: parseFloat(customer.ledger_balance) > 0 ? parseFloat(customer.ledger_balance) : 0,
              credit_amount: parseFloat(customer.ledger_balance) < 0 ? Math.abs(parseFloat(customer.ledger_balance)) : 0,
              branch_id: earliestSale?.branch_id || null,
              created_by: customer.id // Use customer ID as placeholder, should be system user
            }
          );
        } catch (error) {
          console.error(`Error creating opening balance for customer ${customer.id}:`, error.message);
        }
      }
    }

    const suppliers = await Supplier.findAll({
      where: {
        ledger_balance: {
          [Op.ne]: 0
        }
      },
      transaction
    });

    for (const supplier of suppliers) {
      const existingEntry = await LedgerEntry.findOne({
        where: {
          contact_id: supplier.id,
          contact_type: 'supplier',
          transaction_type: 'OPENING_BALANCE'
        },
        transaction
      });

      if (!existingEntry && parseFloat(supplier.ledger_balance) !== 0) {
        try {
          const earliestPurchase = await Purchase.findOne({
            where: { supplier_id: supplier.id },
            order: [['created_at', 'ASC']],
            transaction
          });

          await createLedgerEntry(
            supplier.id,
            'supplier',
            {
              transaction_date: earliestPurchase?.created_at || supplier.created_at || new Date(),
              transaction_type: 'OPENING_BALANCE',
              transaction_id: null,
              description: 'Opening Balance',
              debit_amount: parseFloat(supplier.ledger_balance) < 0 ? Math.abs(parseFloat(supplier.ledger_balance)) : 0,
              credit_amount: parseFloat(supplier.ledger_balance) > 0 ? parseFloat(supplier.ledger_balance) : 0,
              branch_id: earliestPurchase?.branch_id || supplier.branch_id || null,
              created_by: supplier.id // Use supplier ID as placeholder, should be system user
            }
          );
        } catch (error) {
          console.error(`Error creating opening balance for supplier ${supplier.id}:`, error.message);
        }
      }
    }

    await transaction.commit();
    console.log('Historical ledger backfill completed successfully!');
    return { success: true, message: 'Backfill completed successfully' };
  } catch (error) {
    await transaction.rollback();
    console.error('Error during backfill:', error);
    throw error;
  }
};

