import { Op, fn, col, literal } from 'sequelize';
import {
  SalesOrder,
  SalesItem,
  Payment,
  Product,
  Customer,
  InventoryBatch,
  Purchase,
  Expense,
  Branch,
  User
} from '../models/index.js';

/**
 * GET /api/dashboard/stats
 * Get summary statistics for dashboard
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const where = {};
    const orderWhere = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
      orderWhere.branch_id = req.user.branch_id;
    }

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await SalesOrder.sum('total_amount', {
      where: {
        ...orderWhere,
        created_at: {
          [Op.between]: [today, tomorrow]
        }
      }
    }) || 0;

    // Pending payments
    const pendingPayments = await Payment.count({
      where: {
        ...where,
        status: 'pending_confirmation'
      }
    });

    // Items in production queue
    const productionQueueCount = await SalesOrder.count({
      where: {
        ...orderWhere,
        production_status: 'queue'
      }
    });

    // Low stock alerts (instances with remaining_quantity < 10% of initial_quantity)
    const lowStockBatches = await InventoryBatch.findAll({
      where: {
        ...where,
        status: 'in_stock'
      },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }
      ]
    });

    const lowStockCount = lowStockBatches.filter(batch => {
      const remaining = parseFloat(batch.remaining_quantity);
      const initial = parseFloat(batch.initial_quantity);
      return remaining > 0 && (remaining / initial) < 0.1;
    }).length;

    res.json({
      today_sales: parseFloat(todaySales),
      pending_payments: pendingPayments,
      items_in_production: productionQueueCount,
      low_stock_count: lowStockCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/sales-chart
 * Get sales data for chart (last 7/30/90 days)
 */
export const getSalesChart = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const daysInt = parseInt(days);
    if (![7, 30, 90].includes(daysInt)) {
      return res.status(400).json({ error: 'Days must be 7, 30, or 90' });
    }

    const where = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

    where.created_at = {
      [Op.between]: [startDate, endDate]
    };

    // Daily sales data
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
      period_days: daysInt,
      daily_data: dailySales.map(day => ({
        date: day.date,
        amount: parseFloat(day.amount || 0),
        count: parseInt(day.count || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/top-products
 * Get best selling products
 */
export const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const where = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Get top products by revenue
    const topProducts = await SalesItem.findAll({
      attributes: [
        'product_id',
        [fn('SUM', col('SalesItem.quantity')), 'total_quantity'],
        [fn('SUM', col('SalesItem.subtotal')), 'total_revenue']
      ],
      include: [
        {
          model: SalesOrder,
          as: 'order',
          attributes: [],
          where
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'sale_price']
        }
      ],
      group: ['SalesItem.product_id', 'product.id'],
      order: [[literal('total_revenue'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      products: topProducts.map(item => ({
        product: item.product,
        total_quantity: parseFloat(item.getDataValue('total_quantity')),
        total_revenue: parseFloat(item.getDataValue('total_revenue'))
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/top-customers
 * Get highest spending customers
 */
export const getTopCustomers = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const where = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Get top customers by revenue
    const topCustomers = await SalesOrder.findAll({
      attributes: [
        'customer_id',
        [fn('SUM', col('total_amount')), 'total_revenue'],
        [fn('COUNT', col('SalesOrder.id')), 'order_count']
      ],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ],
      where: {
        ...where,
        customer_id: { [Op.ne]: null }
      },
      group: ['SalesOrder.customer_id', 'customer.id'],
      order: [[literal('total_revenue'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      customers: topCustomers.map(item => ({
        customer: item.customer,
        total_revenue: parseFloat(item.getDataValue('total_revenue')),
        order_count: parseInt(item.getDataValue('order_count'))
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/recent-activity
 * Get recent sales, payments, purchases
 */
export const getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const where = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Recent sales
    const recentSales = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.ceil(parseInt(limit) / 3)
    });

    // Recent payments
    const paymentWhere = {};
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      paymentWhere.branch_id = req.user.branch_id;
    }

    const recentPayments = await Payment.findAll({
      where: paymentWhere,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.ceil(parseInt(limit) / 3)
    });

    // Recent purchases
    const purchaseWhere = {};
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      purchaseWhere.branch_id = req.user.branch_id;
    }

    const recentPurchases = await Purchase.findAll({
      where: purchaseWhere,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.ceil(parseInt(limit) / 3)
    });

    // Combine and sort by date
    const activities = [
      ...recentSales.map(sale => ({
        type: 'sale',
        id: sale.id,
        description: `Sale ${sale.invoice_number} to ${sale.customer?.name || 'Walk-in'}`,
        amount: sale.total_amount,
        date: sale.created_at,
        branch: sale.branch?.name
      })),
      ...recentPayments.map(payment => ({
        type: 'payment',
        id: payment.id,
        description: `Payment from ${payment.customer?.name || 'N/A'}`,
        amount: payment.amount,
        date: payment.created_at,
        status: payment.status
      })),
      ...recentPurchases.map(purchase => ({
        type: 'purchase',
        id: purchase.id,
        description: `Purchase ${purchase.purchase_number}`,
        amount: purchase.total_amount,
        date: purchase.created_at,
        branch: purchase.branch?.name
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, parseInt(limit));

    res.json({ activities });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/alerts
 * Get low stock alerts and pending actions
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const where = { status: 'in_stock' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Get all in-stock instances
    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'type'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ]
    });

    // Filter for low stock (less than 10% remaining)
    const lowStockItems = batches
      .filter(batch => {
        const remaining = parseFloat(batch.remaining_quantity);
        const initial = parseFloat(batch.initial_quantity);
        return remaining > 0 && (remaining / initial) < 0.1;
      })
      .map(instance => ({
        instance_id: instance.id,
        instance_code: instance.instance_code,
        product: instance.product,
        remaining_quantity: parseFloat(instance.remaining_quantity),
        initial_quantity: parseFloat(instance.initial_quantity),
        percentage_remaining: (parseFloat(instance.remaining_quantity) / parseFloat(instance.initial_quantity)) * 100,
        branch: instance.branch
      }))
      .sort((a, b) => a.percentage_remaining - b.percentage_remaining)
      .slice(0, 10);

    res.json({ low_stock_items: lowStockItems });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/pending-actions
 * Get items requiring attention (unconfirmed payments, queue items)
 */
export const getPendingActions = async (req, res, next) => {
  try {
    const where = {};
    const orderWhere = { order_type: 'invoice' };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
      orderWhere.branch_id = req.user.branch_id;
    }

    // Unconfirmed payments
    const unconfirmedPayments = await Payment.findAll({
      where: {
        ...where,
        status: 'pending_confirmation'
      },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'ASC']],
      limit: 10
    });

    // Production queue items
    const queueItems = await SalesOrder.findAll({
      where: {
        ...orderWhere,
        production_status: 'queue'
      },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'ASC']],
      limit: 10
    });

    res.json({
      unconfirmed_payments: unconfirmedPayments.map(payment => ({
        id: payment.id,
        customer: payment.customer?.name || 'N/A',
        amount: payment.amount,
        method: payment.method,
        created_by: payment.creator?.full_name || 'N/A',
        created_at: payment.created_at
      })),
      queue_items: queueItems.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number,
        customer: order.customer?.name || 'Walk-in',
        total_amount: order.total_amount,
        branch: order.branch?.name || 'N/A',
        created_at: order.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};







