import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../config/db.js';
import {
  SalesOrder,
  SalesItem,
  Purchase,
  PurchaseItem,
  Product,
  Customer,
  Supplier,
  Payment,
  Expense,
  ExpenseCategory,
  InventoryInstance,
  Branch,
  User,
  PaymentAccount,
  AccountTransaction
} from '../models/index.js';

/**
 * GET /api/reports/sales-summary
 * Get sales summary report
 */
export const getSalesSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const where = {
      order_type: 'invoice'
    };

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    // Branch filtering
    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Total sales
    const totalSales = await SalesOrder.sum('total_amount', { where }) || 0;

    // Sales count
    const salesCount = await SalesOrder.count({ where });

    // Paid/Unpaid breakdown
    const paidSales = await SalesOrder.sum('total_amount', { 
      where: { ...where, payment_status: 'paid' } 
    }) || 0;
    const unpaidSales = await SalesOrder.sum('total_amount', { 
      where: { ...where, payment_status: 'unpaid' } 
    }) || 0;
    const partialSales = await SalesOrder.sum('total_amount', { 
      where: { ...where, payment_status: 'partial' } 
    }) || 0;

    // Top selling products
    const topProducts = await SalesItem.findAll({
      attributes: [
        'product_id',
        [fn('SUM', col('quantity')), 'total_quantity'],
        [fn('SUM', col('subtotal')), 'total_revenue']
      ],
      include: [
        { 
          model: SalesOrder, 
          as: 'order', 
          attributes: [],
          where 
        },
        { model: Product, as: 'product', attributes: ['name', 'sku'] }
      ],
      group: ['SalesItem.product_id', 'product.id'],
      order: [[literal('total_revenue'), 'DESC']],
      limit: 10
    });

    // Daily sales trend
    const dailySales = await SalesOrder.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('total_amount')), 'amount'],
        [fn('COUNT', col('id')), 'count']
      ],
      where,
      group: [fn('DATE', col('created_at'))],
      order: [[literal('date'), 'ASC']],
      raw: true
    });

    res.json({
      summary: {
        total_sales: parseFloat(totalSales),
        sales_count: salesCount,
        average_order_value: salesCount > 0 ? parseFloat(totalSales) / salesCount : 0,
        paid: parseFloat(paidSales),
        unpaid: parseFloat(unpaidSales),
        partial: parseFloat(partialSales)
      },
      top_products: topProducts.map(tp => ({
        product: tp.product,
        total_quantity: parseFloat(tp.getDataValue('total_quantity')),
        total_revenue: parseFloat(tp.getDataValue('total_revenue'))
      })),
      daily_trend: dailySales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/purchase-summary
 * Get purchase summary report
 */
export const getPurchaseSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Total purchases
    const totalPurchases = await Purchase.sum('total_amount', { where }) || 0;
    const purchaseCount = await Purchase.count({ where });

    // By status
    const byStatus = await Purchase.findAll({
      attributes: [
        'status',
        [fn('SUM', col('total_amount')), 'amount'],
        [fn('COUNT', col('id')), 'count']
      ],
      where,
      group: ['status'],
      raw: true
    });

    // Top suppliers
    const topSuppliers = await Purchase.findAll({
      attributes: [
        'supplier_id',
        [fn('SUM', col('total_amount')), 'total_amount'],
        [fn('COUNT', col('id')), 'order_count']
      ],
      include: [
        { model: Supplier, as: 'supplier', attributes: ['name'] }
      ],
      where: { ...where, supplier_id: { [Op.ne]: null } },
      group: ['Purchase.supplier_id', 'supplier.id'],
      order: [[literal('total_amount'), 'DESC']],
      limit: 10
    });

    res.json({
      summary: {
        total_purchases: parseFloat(totalPurchases),
        purchase_count: purchaseCount,
        average_order_value: purchaseCount > 0 ? parseFloat(totalPurchases) / purchaseCount : 0
      },
      by_status: byStatus,
      top_suppliers: topSuppliers.map(ts => ({
        supplier: ts.supplier,
        total_amount: parseFloat(ts.getDataValue('total_amount')),
        order_count: parseInt(ts.getDataValue('order_count'))
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/inventory-value
 * Get inventory value report
 */
export const getInventoryValue = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const where = {
      status: 'in_stock'
    };

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Get inventory instances with product info
    const instances = await InventoryInstance.findAll({
      where,
      include: [
        { 
          model: Product, 
          as: 'product', 
          attributes: ['name', 'sku', 'cost_price', 'sale_price', 'type']
        },
        { model: Branch, as: 'branch', attributes: ['name'] }
      ]
    });

    // Calculate values
    let totalCostValue = 0;
    let totalSaleValue = 0;
    const byProduct = {};

    for (const instance of instances) {
      const qty = parseFloat(instance.remaining_quantity);
      const costPrice = parseFloat(instance.product?.cost_price || 0);
      const salePrice = parseFloat(instance.product?.sale_price || 0);
      
      const costValue = qty * costPrice;
      const saleValue = qty * salePrice;
      
      totalCostValue += costValue;
      totalSaleValue += saleValue;

      const productId = instance.product_id;
      if (!byProduct[productId]) {
        byProduct[productId] = {
          product: instance.product,
          total_quantity: 0,
          cost_value: 0,
          sale_value: 0,
          instance_count: 0
        };
      }
      byProduct[productId].total_quantity += qty;
      byProduct[productId].cost_value += costValue;
      byProduct[productId].sale_value += saleValue;
      byProduct[productId].instance_count += 1;
    }

    const productValues = Object.values(byProduct).sort((a, b) => b.cost_value - a.cost_value);

    res.json({
      summary: {
        total_cost_value: totalCostValue,
        total_sale_value: totalSaleValue,
        potential_profit: totalSaleValue - totalCostValue,
        total_instances: instances.length
      },
      by_product: productValues.slice(0, 20)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/expense-summary
 * Get expense summary report
 */
export const getExpenseSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.expense_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Total expenses
    const totalExpenses = await Expense.sum('amount', { where }) || 0;
    const expenseCount = await Expense.count({ where });

    // By category
    const byCategory = await Expense.findAll({
      attributes: [
        'category_id',
        [fn('SUM', col('amount')), 'total_amount'],
        [fn('COUNT', col('Expense.id')), 'count']
      ],
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['name'] }
      ],
      where,
      group: ['Expense.category_id', 'category.id'],
      order: [[literal('total_amount'), 'DESC']]
    });

    // Daily trend
    const dailyExpenses = await Expense.findAll({
      attributes: [
        [col('expense_date'), 'date'],
        [fn('SUM', col('amount')), 'amount']
      ],
      where,
      group: ['expense_date'],
      order: [[col('expense_date'), 'ASC']],
      raw: true
    });

    res.json({
      summary: {
        total_expenses: parseFloat(totalExpenses),
        expense_count: expenseCount,
        average_expense: expenseCount > 0 ? parseFloat(totalExpenses) / expenseCount : 0
      },
      by_category: byCategory.map(bc => ({
        category: bc.category,
        total_amount: parseFloat(bc.getDataValue('total_amount')),
        count: parseInt(bc.getDataValue('count'))
      })),
      daily_trend: dailyExpenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/customer-summary
 * Get customer summary report
 */
export const getCustomerSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const orderWhere = {
      order_type: 'invoice'
    };

    if (start_date && end_date) {
      orderWhere.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    if (branch_id) {
      orderWhere.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      orderWhere.branch_id = req.user.branch_id;
    }

    // Top customers by revenue
    const topCustomers = await SalesOrder.findAll({
      attributes: [
        'customer_id',
        [fn('SUM', col('total_amount')), 'total_revenue'],
        [fn('COUNT', col('id')), 'order_count']
      ],
      include: [
        { model: Customer, as: 'customer', attributes: ['name', 'phone', 'ledger_balance'] }
      ],
      where: { ...orderWhere, customer_id: { [Op.ne]: null } },
      group: ['SalesOrder.customer_id', 'customer.id'],
      order: [[literal('total_revenue'), 'DESC']],
      limit: 20
    });

    // Customers with outstanding balances
    const customersWithBalance = await Customer.findAll({
      where: {
        ledger_balance: { [Op.gt]: 0 }
      },
      order: [['ledger_balance', 'DESC']],
      limit: 20
    });

    const totalOutstanding = await Customer.sum('ledger_balance', {
      where: { ledger_balance: { [Op.gt]: 0 } }
    }) || 0;

    res.json({
      top_customers: topCustomers.map(tc => ({
        customer: tc.customer,
        total_revenue: parseFloat(tc.getDataValue('total_revenue')),
        order_count: parseInt(tc.getDataValue('order_count'))
      })),
      outstanding: {
        total: parseFloat(totalOutstanding),
        customers: customersWithBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/payment-summary
 * Get payment summary report
 */
export const getPaymentSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    // Total payments
    const confirmedPayments = await Payment.sum('amount', { 
      where: { ...where, status: 'confirmed' } 
    }) || 0;

    const pendingPayments = await Payment.sum('amount', { 
      where: { ...where, status: 'pending_confirmation' } 
    }) || 0;

    // By method
    const byMethod = await Payment.findAll({
      attributes: [
        'method',
        [fn('SUM', col('amount')), 'total_amount'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: { ...where, status: 'confirmed' },
      group: ['method'],
      raw: true
    });

    // Daily trend
    const dailyPayments = await Payment.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('amount')), 'amount']
      ],
      where: { ...where, status: 'confirmed' },
      group: [fn('DATE', col('created_at'))],
      order: [[literal('date'), 'ASC']],
      raw: true
    });

    res.json({
      summary: {
        confirmed: parseFloat(confirmedPayments),
        pending: parseFloat(pendingPayments),
        total: parseFloat(confirmedPayments) + parseFloat(pendingPayments)
      },
      by_method: byMethod,
      daily_trend: dailyPayments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/profit-loss
 * Get profit and loss report
 */
export const getProfitLoss = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const where = {};
    const orderWhere = { order_type: 'invoice' };

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
      orderWhere.created_at = where.created_at;
    }

    if (branch_id) {
      where.branch_id = branch_id;
      orderWhere.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
      orderWhere.branch_id = req.user.branch_id;
    }

    // Revenue (Sales)
    const totalRevenue = await SalesOrder.sum('total_amount', { where: orderWhere }) || 0;

    // Cost of Goods Sold (simplified - using purchases)
    const cogs = await Purchase.sum('total_amount', { 
      where: { ...where, status: { [Op.ne]: 'cancelled' } } 
    }) || 0;

    // Operating Expenses
    const expenseWhere = {};
    if (start_date && end_date) {
      expenseWhere.expense_date = { [Op.between]: [start_date, end_date] };
    }
    if (where.branch_id) {
      expenseWhere.branch_id = where.branch_id;
    }
    const totalExpenses = await Expense.sum('amount', { where: expenseWhere }) || 0;

    // Calculations
    const grossProfit = parseFloat(totalRevenue) - parseFloat(cogs);
    const netProfit = grossProfit - parseFloat(totalExpenses);
    const grossMargin = totalRevenue > 0 ? (grossProfit / parseFloat(totalRevenue)) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / parseFloat(totalRevenue)) * 100 : 0;

    res.json({
      revenue: parseFloat(totalRevenue),
      cost_of_goods_sold: parseFloat(cogs),
      gross_profit: grossProfit,
      gross_margin: grossMargin,
      operating_expenses: parseFloat(totalExpenses),
      net_profit: netProfit,
      net_margin: netMargin
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/balance-sheet
 * Get balance sheet (Assets, Liabilities, Equity)
 */
export const getBalanceSheet = async (req, res, next) => {
  try {
    const { as_of_date, branch_id } = req.query;
    const where = {};
    const orderWhere = { order_type: 'invoice' };

    if (as_of_date) {
      const asOf = new Date(as_of_date + 'T23:59:59');
      where.created_at = { [Op.lte]: asOf };
      orderWhere.created_at = { [Op.lte]: asOf };
    }

    if (branch_id) {
      where.branch_id = branch_id;
      orderWhere.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
      orderWhere.branch_id = req.user.branch_id;
    }

    // ASSETS
    // Current Assets
    // - Cash (from payment accounts)
    const cashAccounts = await PaymentAccount.sum('current_balance', {
      where: { ...where, account_type: 'cash', is_active: true }
    }) || 0;

    // - Bank Accounts
    const bankAccounts = await PaymentAccount.sum('current_balance', {
      where: { ...where, account_type: 'bank', is_active: true }
    }) || 0;

    // - Accounts Receivable (unpaid sales)
    const accountsReceivable = await SalesOrder.sum('total_amount', {
      where: { ...orderWhere, payment_status: { [Op.in]: ['unpaid', 'partial'] } }
    }) || 0;

    // - Inventory Value (at cost)
    const inventoryValue = await InventoryInstance.findAll({
      where: { ...where, status: 'in_stock' },
      include: [{ model: Product, as: 'product', attributes: ['cost_price'] }]
    });
    let totalInventoryValue = 0;
    for (const instance of inventoryValue) {
      totalInventoryValue += parseFloat(instance.remaining_quantity) * parseFloat(instance.product?.cost_price || 0);
    }

    // Fixed Assets (simplified - could add fixed assets table later)
    const fixedAssets = 0; // Placeholder

    const totalAssets = parseFloat(cashAccounts) + parseFloat(bankAccounts) + 
                       parseFloat(accountsReceivable) + totalInventoryValue + fixedAssets;

    // LIABILITIES
    // Current Liabilities
    // - Accounts Payable (unpaid purchases)
    const accountsPayable = await Purchase.sum('total_amount', {
      where: { ...where, status: { [Op.in]: ['pending', 'received'] } }
    }) || 0;

    // - Supplier Balances
    const supplierBalances = await Supplier.sum('ledger_balance', {
      where: { ledger_balance: { [Op.gt]: 0 } }
    }) || 0;

    const totalLiabilities = parseFloat(accountsPayable) + parseFloat(supplierBalances);

    // EQUITY
    // - Retained Earnings (simplified - calculate net profit directly)
    const revenue = await SalesOrder.sum('total_amount', { where: orderWhere }) || 0;
    const cogs = await Purchase.sum('total_amount', { 
      where: { ...where, status: { [Op.ne]: 'cancelled' } } 
    }) || 0;
    const expenseWhere = {};
    if (as_of_date) {
      const asOf = new Date(as_of_date + 'T23:59:59');
      expenseWhere.expense_date = { [Op.lte]: asOf };
    }
    if (where.branch_id) {
      expenseWhere.branch_id = where.branch_id;
    }
    const expenses = await Expense.sum('amount', { where: expenseWhere }) || 0;
    const retainedEarnings = parseFloat(revenue) - parseFloat(cogs) - parseFloat(expenses);

    // - Capital (opening balances of payment accounts)
    const openingBalances = await PaymentAccount.sum('opening_balance', {
      where: { ...where, is_active: true }
    }) || 0;

    const totalEquity = parseFloat(retainedEarnings) + parseFloat(openingBalances);

    res.json({
      as_of_date: as_of_date || new Date().toISOString().split('T')[0],
      assets: {
        current_assets: {
          cash: parseFloat(cashAccounts),
          bank: parseFloat(bankAccounts),
          accounts_receivable: parseFloat(accountsReceivable),
          inventory: totalInventoryValue,
          total: parseFloat(cashAccounts) + parseFloat(bankAccounts) + 
                 parseFloat(accountsReceivable) + totalInventoryValue
        },
        fixed_assets: fixedAssets,
        total: totalAssets
      },
      liabilities: {
        current_liabilities: {
          accounts_payable: parseFloat(accountsPayable),
          supplier_balances: parseFloat(supplierBalances),
          total: totalLiabilities
        },
        total: totalLiabilities
      },
      equity: {
        retained_earnings: parseFloat(retainedEarnings),
        capital: parseFloat(openingBalances),
        total: totalEquity
      },
      total_liabilities_and_equity: totalLiabilities + totalEquity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/trial-balance
 * Get trial balance (Debit/Credit summary)
 */
export const getTrialBalance = async (req, res, next) => {
  try {
    const { as_of_date, branch_id } = req.query;
    const where = {};
    const orderWhere = { order_type: 'invoice' };

    if (as_of_date) {
      const asOf = new Date(as_of_date + 'T23:59:59');
      where.created_at = { [Op.lte]: asOf };
      orderWhere.created_at = { [Op.lte]: asOf };
    }

    if (branch_id) {
      where.branch_id = branch_id;
      orderWhere.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
      orderWhere.branch_id = req.user.branch_id;
    }

    // Debits (Assets, Expenses)
    const cashDebit = await PaymentAccount.sum('current_balance', {
      where: { ...where, account_type: { [Op.in]: ['cash', 'bank'] }, is_active: true }
    }) || 0;

    const inventoryDebit = await InventoryInstance.findAll({
      where: { ...where, status: 'in_stock' },
      include: [{ model: Product, as: 'product', attributes: ['cost_price'] }]
    });
    let inventoryDebitTotal = 0;
    for (const instance of inventoryDebit) {
      inventoryDebitTotal += parseFloat(instance.remaining_quantity) * parseFloat(instance.product?.cost_price || 0);
    }

    const accountsReceivableDebit = await SalesOrder.sum('total_amount', {
      where: { ...orderWhere, payment_status: { [Op.in]: ['unpaid', 'partial'] } }
    }) || 0;

    const expenseDebit = await Expense.sum('amount', {
      where: { ...where }
    }) || 0;

    const totalDebits = parseFloat(cashDebit) + inventoryDebitTotal + 
                       parseFloat(accountsReceivableDebit) + parseFloat(expenseDebit);

    // Credits (Liabilities, Revenue, Equity)
    const accountsPayableCredit = await Purchase.sum('total_amount', {
      where: { ...where, status: { [Op.in]: ['pending', 'received'] } }
    }) || 0;

    const supplierCredit = await Supplier.sum('ledger_balance', {
      where: { ledger_balance: { [Op.gt]: 0 } }
    }) || 0;

    const revenueCredit = await SalesOrder.sum('total_amount', { where: orderWhere }) || 0;

    const openingBalanceCredit = await PaymentAccount.sum('opening_balance', {
      where: { ...where, is_active: true }
    }) || 0;

    const totalCredits = parseFloat(accountsPayableCredit) + parseFloat(supplierCredit) + 
                        parseFloat(revenueCredit) + parseFloat(openingBalanceCredit);

    res.json({
      as_of_date: as_of_date || new Date().toISOString().split('T')[0],
      debits: [
        { account: 'Cash & Bank', amount: parseFloat(cashDebit) },
        { account: 'Inventory', amount: inventoryDebitTotal },
        { account: 'Accounts Receivable', amount: parseFloat(accountsReceivableDebit) },
        { account: 'Expenses', amount: parseFloat(expenseDebit) }
      ],
      credits: [
        { account: 'Accounts Payable', amount: parseFloat(accountsPayableCredit) },
        { account: 'Supplier Balances', amount: parseFloat(supplierCredit) },
        { account: 'Revenue', amount: parseFloat(revenueCredit) },
        { account: 'Opening Capital', amount: parseFloat(openingBalanceCredit) }
      ],
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: totalDebits - totalCredits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/cash-flow
 * Get cash flow statement (Operating, Investing, Financing)
 */
export const getCashFlowStatement = async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // OPERATING ACTIVITIES
    // Cash from sales (confirmed payments)
    const cashFromSales = await Payment.sum('amount', {
      where: { ...where, status: 'confirmed', method: 'cash' }
    }) || 0;

    // Cash from transfers
    const cashFromTransfers = await Payment.sum('amount', {
      where: { ...where, status: 'confirmed', method: 'transfer' }
    }) || 0;

    // Cash paid for expenses
    const cashPaidExpenses = await Expense.sum('amount', {
      where: { ...where }
    }) || 0;

    // Cash paid for purchases
    const cashPaidPurchases = await Purchase.sum('total_amount', {
      where: { ...where, status: { [Op.ne]: 'cancelled' } }
    }) || 0;

    const operatingCashFlow = parseFloat(cashFromSales) + parseFloat(cashFromTransfers) - 
                             parseFloat(cashPaidExpenses) - parseFloat(cashPaidPurchases);

    // INVESTING ACTIVITIES (simplified - could add fixed assets later)
    const investingCashFlow = 0;

    // FINANCING ACTIVITIES (simplified - could add loans, capital contributions later)
    const financingCashFlow = 0;

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    res.json({
      period: {
        start_date: start_date || null,
        end_date: end_date || null
      },
      operating_activities: {
        cash_from_sales: parseFloat(cashFromSales),
        cash_from_transfers: parseFloat(cashFromTransfers),
        cash_paid_expenses: -parseFloat(cashPaidExpenses),
        cash_paid_purchases: -parseFloat(cashPaidPurchases),
        net_cash_flow: operatingCashFlow
      },
      investing_activities: {
        net_cash_flow: investingCashFlow
      },
      financing_activities: {
        net_cash_flow: financingCashFlow
      },
      net_increase_in_cash: netCashFlow
    });
  } catch (error) {
    next(error);
  }
};

