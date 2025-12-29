import { Product, InventoryBatch, SalesOrder, Customer, Branch, Purchase, PurchaseItem, Supplier, PaymentAccount, Recipe } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Convert array of objects to CSV string
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
 * Export products to CSV
 */
export const exportProducts = async (filters = {}) => {
  const where = {};

  if (filters.type) {
    where.type = filters.type;
  }

  const products = await Product.findAll({
    where,
    order: [['sku', 'ASC']]
  });

  const csvData = products.map(p => ({
    sku: p.sku,
    name: p.name,
    type: p.type,
    base_unit: p.base_unit,
    sale_price: p.sale_price,
    cost_price: p.cost_price || '',
    tax_rate: p.tax_rate || 0,
    brand: p.brand || '',
    category: p.category || ''
  }));

  const headers = ['sku', 'name', 'type', 'base_unit', 'sale_price', 'cost_price', 'tax_rate', 'brand', 'category'];
  return arrayToCSV(csvData, headers);
};

/**
 * Export inventory instances to CSV
 */
export const exportInventoryBatches = async (filters = {}) => {
  const where = {};

  if (filters.branch_id) {
    where.branch_id = filters.branch_id;
  }

  if (filters.product_id) {
    where.product_id = filters.product_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const batches = await InventoryBatch.findAll({
    where,
    include: [
      { model: Product, as: 'product' },
      { model: Branch, as: 'branch' }
    ],
    order: [['instance_code', 'ASC']]
  });

  const csvData = batches.map(batch => ({
    instance_code: batch.instance_code || batch.batch_identifier || '',
    batch_type: batch.batch_type,
    product_sku: batch.product?.sku || '',
    product_name: batch.product?.name || '',
    branch_code: batch.branch?.code || '',
    branch_name: batch.branch?.name || '',
    initial_quantity: batch.initial_quantity,
    remaining_quantity: batch.remaining_quantity,
    status: batch.status
  }));

  const headers = ['instance_code', 'batch_type', 'product_sku', 'product_name', 'branch_code', 'branch_name', 'initial_quantity', 'remaining_quantity', 'status'];
  return arrayToCSV(csvData, headers);
};

/**
 * Export sales orders to CSV
 */
export const exportSalesOrders = async (filters = {}) => {
  const where = {};

  if (filters.branch_id) {
    where.branch_id = filters.branch_id;
  }

  if (filters.customer_id) {
    where.customer_id = filters.customer_id;
  }

  if (filters.start_date && filters.end_date) {
    where.created_at = {
      [Op.between]: [new Date(filters.start_date), new Date(filters.end_date)]
    };
  }

  const orders = await SalesOrder.findAll({
    where,
    include: [
      { model: Customer, as: 'customer' },
      { model: Branch, as: 'branch' }
    ],
    order: [['created_at', 'DESC']]
  });

  const csvData = orders.map(order => ({
    invoice_number: order.invoice_number,
    customer_name: order.customer?.name || '',
    branch_code: order.branch?.code || '',
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    production_status: order.production_status,
    created_at: order.created_at
  }));

  const headers = ['invoice_number', 'customer_name', 'branch_code', 'total_amount', 'payment_status', 'production_status', 'created_at'];
  return arrayToCSV(csvData, headers);
};

/**
 * Export customers to CSV
 */
export const exportCustomers = async () => {
  const customers = await Customer.findAll({
    order: [['name', 'ASC']]
  });

  const csvData = customers.map(c => ({
    name: c.name,
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
    ledger_balance: c.ledger_balance || 0
  }));

  const headers = ['name', 'phone', 'email', 'address', 'ledger_balance'];
  return arrayToCSV(csvData, headers);
};

/**
 * Export purchases to CSV (flattened format: one row per purchase item)
 */
export const exportPurchases = async (filters = {}) => {
  const where = {};

  if (filters.branch_id) {
    where.branch_id = filters.branch_id;
  }

  if (filters.supplier_id) {
    where.supplier_id = filters.supplier_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.payment_status) {
    where.payment_status = filters.payment_status;
  }

  if (filters.start_date && filters.end_date) {
    where.created_at = {
      [Op.between]: [new Date(filters.start_date), new Date(filters.end_date)]
    };
  }

  const purchases = await Purchase.findAll({
    where,
    include: [
      { model: Supplier, as: 'supplier' },
      { model: Branch, as: 'branch' },
      {
        model: PurchaseItem,
        as: 'items',
        include: [
          { model: Product, as: 'product' }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Flatten: one row per purchase item
  const csvData = [];
  for (const purchase of purchases) {
    if (purchase.items && purchase.items.length > 0) {
      for (const item of purchase.items) {
        csvData.push({
          purchase_number: purchase.purchase_number,
          supplier_name: purchase.supplier?.name || '',
          branch_code: purchase.branch?.code || '',
          branch_name: purchase.branch?.name || '',
          total_amount: purchase.total_amount,
          payment_status: purchase.payment_status,
          status: purchase.status,
          notes: purchase.notes || '',
          created_at: purchase.created_at,
          product_sku: item.product?.sku || '',
          product_name: item.product?.name || '',
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
          instance_code: item.instance_code || '',
          purchase_unit: item.purchase_unit_id ? 'custom' : '',
          purchased_quantity: item.purchased_quantity || '',
          conversion_factor: item.conversion_factor || 1
        });
      }
    } else {
      // Purchase with no items (shouldn't happen, but handle gracefully)
      csvData.push({
        purchase_number: purchase.purchase_number,
        supplier_name: purchase.supplier?.name || '',
        branch_code: purchase.branch?.code || '',
        branch_name: purchase.branch?.name || '',
        total_amount: purchase.total_amount,
        payment_status: purchase.payment_status,
        status: purchase.status,
        notes: purchase.notes || '',
        created_at: purchase.created_at,
        product_sku: '',
        product_name: '',
        quantity: '',
        unit_cost: '',
        subtotal: '',
        instance_code: '',
        purchase_unit: '',
        purchased_quantity: '',
        conversion_factor: ''
      });
    }
  }

  const headers = [
    'purchase_number', 'supplier_name', 'branch_code', 'branch_name',
    'total_amount', 'payment_status', 'status', 'notes', 'created_at',
    'product_sku', 'product_name', 'quantity', 'unit_cost', 'subtotal',
    'instance_code', 'purchase_unit', 'purchased_quantity', 'conversion_factor'
  ];
  return arrayToCSV(csvData, headers);
};

/**
 * Export payment accounts to CSV
 */
export const exportPaymentAccounts = async (filters = {}) => {
  const where = {};

  // Branch filtering (except for Super Admin - handled in controller via user context)
  if (filters.branch_id) {
    where.branch_id = filters.branch_id;
  }

  const accounts = await PaymentAccount.findAll({
    where,
    include: [
      { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
    ],
    order: [['name', 'ASC']]
  });

  const csvData = accounts.map(account => ({
    name: account.name,
    account_type: account.account_type,
    account_number: account.account_number || '',
    bank_name: account.bank_name || '',
    opening_balance: account.opening_balance || 0,
    current_balance: account.current_balance || 0,
    branch_name: account.branch?.name || '',
    is_active: account.is_active ? 'true' : 'false',
    created_at: account.created_at
  }));

  const headers = ['name', 'account_type', 'account_number', 'bank_name', 'opening_balance', 'current_balance', 'branch_name', 'is_active', 'created_at'];
  return arrayToCSV(csvData, headers);
};

/**
 * Export recipes to CSV
 */
export const exportRecipes = async () => {
  const recipes = await Recipe.findAll({
    include: [
      { 
        model: Product, 
        as: 'virtual_product',
        attributes: ['id', 'sku', 'name']
      },
      { 
        model: Product, 
        as: 'raw_product',
        attributes: ['id', 'sku', 'name']
      }
    ],
    order: [['name', 'ASC']]
  });

  const csvData = recipes.map(recipe => ({
    name: recipe.name,
    virtual_product_sku: recipe.virtual_product?.sku || '',
    virtual_product_name: recipe.virtual_product?.name || '',
    raw_product_sku: recipe.raw_product?.sku || '',
    raw_product_name: recipe.raw_product?.name || '',
    conversion_factor: recipe.conversion_factor,
    wastage_margin: recipe.wastage_margin || 0
  }));

  const headers = ['name', 'virtual_product_sku', 'virtual_product_name', 'raw_product_sku', 'raw_product_name', 'conversion_factor', 'wastage_margin'];
  return arrayToCSV(csvData, headers);
};

