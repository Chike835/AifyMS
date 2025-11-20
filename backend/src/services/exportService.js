import { Product, InventoryInstance, SalesOrder, Customer, Branch } from '../models/index.js';
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
export const exportInventoryInstances = async (filters = {}) => {
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

  const instances = await InventoryInstance.findAll({
    where,
    include: [
      { model: Product, as: 'product' },
      { model: Branch, as: 'branch' }
    ],
    order: [['instance_code', 'ASC']]
  });

  const csvData = instances.map(inst => ({
    instance_code: inst.instance_code,
    product_sku: inst.product?.sku || '',
    product_name: inst.product?.name || '',
    branch_code: inst.branch?.code || '',
    branch_name: inst.branch?.name || '',
    initial_quantity: inst.initial_quantity,
    remaining_quantity: inst.remaining_quantity,
    status: inst.status
  }));

  const headers = ['instance_code', 'product_sku', 'product_name', 'branch_code', 'branch_name', 'initial_quantity', 'remaining_quantity', 'status'];
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

