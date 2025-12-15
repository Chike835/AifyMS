import { getLedger, backfillHistoricalLedger, calculateAdvanceBalance } from '../services/ledgerService.js';
import { generateLedgerPDF } from '../services/pdfService.js';
import { Customer, Supplier, LedgerEntry, SalesOrder, Payment } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * GET /api/ledger/customer/:id
 * Get customer ledger entries
 */
export const getCustomerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, branch_id } = req.query;

    // Verify customer exists
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get ledger entries
    const entries = await getLedger(
      id,
      'customer',
      start_date || null,
      end_date || null,
      branch_id || null
    );

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        ledger_balance: customer.ledger_balance
      },
      entries: entries.map(entry => ({
        id: entry.id,
        transaction_date: entry.transaction_date,
        transaction_type: entry.transaction_type,
        transaction_id: entry.transaction_id,
        description: entry.description,
        debit_amount: parseFloat(entry.debit_amount || 0),
        credit_amount: parseFloat(entry.credit_amount || 0),
        running_balance: parseFloat(entry.running_balance || 0),
        branch: entry.branch ? {
          id: entry.branch.id,
          name: entry.branch.name,
          code: entry.branch.code
        } : null,
        created_by: entry.creator ? {
          id: entry.creator.id,
          full_name: entry.creator.full_name
        } : null
      })),
      total_entries: entries.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ledger/supplier/:id
 * Get supplier ledger entries
 */
export const getSupplierLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, branch_id } = req.query;

    // Verify supplier exists
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Get ledger entries
    const entries = await getLedger(
      id,
      'supplier',
      start_date || null,
      end_date || null,
      branch_id || null
    );

    res.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        ledger_balance: supplier.ledger_balance
      },
      entries: entries.map(entry => ({
        id: entry.id,
        transaction_date: entry.transaction_date,
        transaction_type: entry.transaction_type,
        transaction_id: entry.transaction_id,
        description: entry.description,
        debit_amount: parseFloat(entry.debit_amount || 0),
        credit_amount: parseFloat(entry.credit_amount || 0),
        running_balance: parseFloat(entry.running_balance || 0),
        branch: entry.branch ? {
          id: entry.branch.id,
          name: entry.branch.name,
          code: entry.branch.code
        } : null,
        created_by: entry.creator ? {
          id: entry.creator.id,
          full_name: entry.creator.full_name
        } : null
      })),
      total_entries: entries.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ledger/export/:type/:id
 * Export ledger to CSV or PDF
 * @param {string} type - 'customer' or 'supplier'
 * @param {string} id - Contact ID
 * @query {string} format - 'csv' or 'pdf'
 * @query {string} start_date - Optional start date
 * @query {string} end_date - Optional end date
 * @query {string} branch_id - Optional branch filter
 */
export const exportLedger = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { format = 'csv', start_date, end_date, branch_id } = req.query;

    if (type !== 'customer' && type !== 'supplier') {
      return res.status(400).json({ error: 'Invalid type. Must be customer or supplier' });
    }

    // Verify contact exists
    const Contact = type === 'customer' ? Customer : Supplier;
    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({ error: `${type} not found` });
    }

    // Get ledger entries
    const entries = await getLedger(
      id,
      type,
      start_date || null,
      end_date || null,
      branch_id || null
    );

    if (format === 'csv') {
      // Convert to CSV
      const csvData = entries.map(entry => ({
        date: entry.transaction_date.toISOString().split('T')[0],
        type: entry.transaction_type,
        description: entry.description || '',
        debit: parseFloat(entry.debit_amount || 0).toFixed(2),
        credit: parseFloat(entry.credit_amount || 0).toFixed(2),
        balance: parseFloat(entry.running_balance || 0).toFixed(2),
        branch: entry.branch?.name || ''
      }));

      const headers = ['date', 'type', 'description', 'debit', 'credit', 'balance', 'branch'];
      const csv = arrayToCSV(csvData, headers);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_ledger_${id}.csv"`);
      res.send(csv);
    } else if (format === 'pdf') {
      // Generate PDF using the pdfService
      const pdfBuffer = await generateLedgerPDF(contact, type, entries, {
        startDate: start_date,
        endDate: end_date
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_ledger_${contact.name || id}.pdf"`);
      res.send(pdfBuffer);
    } else {
      return res.status(400).json({ error: 'Invalid format. Must be csv or pdf' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to convert array to CSV
 */
const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape commas and quotes in values
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * GET /api/ledger/customer/:id/summary
 * Get customer ledger summary with opening balance, total invoiced, total paid, advance balance, and balance due
 */
export const getCustomerLedgerSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get opening balance (sum of OPENING_BALANCE transactions)
    const openingBalanceEntries = await LedgerEntry.findAll({
      where: {
        contact_id: id,
        contact_type: 'customer',
        transaction_type: 'OPENING_BALANCE'
      }
    });
    const openingBalance = openingBalanceEntries.reduce((sum, entry) => {
      return sum + parseFloat(entry.debit_amount || 0) - parseFloat(entry.credit_amount || 0);
    }, 0);

    // Get total invoiced (sum of INVOICE debit_amount)
    const totalInvoiced = await LedgerEntry.sum('debit_amount', {
      where: {
        contact_id: id,
        contact_type: 'customer',
        transaction_type: 'INVOICE'
      }
    }) || 0;

    // Get total paid (sum of confirmed PAYMENT and ADVANCE_PAYMENT ledger entries)
    // Filter out pending payments by joining with Payment model
    const paymentEntries = await LedgerEntry.findAll({
      where: {
        contact_id: id,
        contact_type: 'customer',
        transaction_type: {
          [Op.in]: ['PAYMENT', 'ADVANCE_PAYMENT']
        }
      },
      include: [
        {
          model: Payment,
          as: 'payment',
          required: false,
          attributes: ['status']
        }
      ]
    });

    // Sum only confirmed payments and all advance payments (advance payments are created only when confirmed)
    const totalPaid = paymentEntries.reduce((sum, entry) => {
      // For PAYMENT entries, only count if confirmed
      if (entry.transaction_type === 'PAYMENT') {
        if (entry.payment?.status === 'confirmed') {
          return sum + parseFloat(entry.credit_amount || 0);
        }
        return sum;
      }
      // For ADVANCE_PAYMENT entries, always count (they're created only when confirmed)
      if (entry.transaction_type === 'ADVANCE_PAYMENT') {
        return sum + parseFloat(entry.credit_amount || 0);
      }
      return sum;
    }, 0);

    // Calculate advance balance using the dedicated helper (accounts for ADVANCE_PAYMENT and REFUND)
    const advanceBalance = await calculateAdvanceBalance(id);

    // Calculate summary values
    const totalInvoicedNum = parseFloat(totalInvoiced);
    const totalPaidNum = parseFloat(totalPaid);
    const advanceBalanceNum = parseFloat(advanceBalance);

    // Balance Due = max(0, Total Invoiced + Opening Balance - Total Paid)
    // This represents outstanding amount the customer owes
    const balanceDue = Math.max(0, totalInvoicedNum + parseFloat(openingBalance) - totalPaidNum);

    res.json({
      opening_balance: parseFloat(openingBalance),
      total_invoiced: totalInvoicedNum,
      total_paid: totalPaidNum,
      advance_balance: advanceBalanceNum, // Use the calculated value from ADVANCE_PAYMENT/REFUND entries
      balance_due: balanceDue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ledger/backfill
 * Trigger historical ledger backfill (Admin only)
 */
export const triggerBackfill = async (req, res, next) => {
  try {
    // This should be protected by admin permission middleware
    const result = await backfillHistoricalLedger();
    res.json({
      message: 'Backfill completed successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

