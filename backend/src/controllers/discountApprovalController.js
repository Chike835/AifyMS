import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, Product, Customer, Branch, User, Agent, Notification, LedgerEntry, Permission, Role } from '../models/index.js';
import { Op } from 'sequelize';
import { multiply, sum } from '../utils/mathUtils.js';
import { createLedgerEntry } from '../services/ledgerService.js';
import { safeRollback } from '../utils/transactionUtils.js';

/**
 * GET /api/discount-approvals
 * Get sales with discounts (pending, approved, declined)
 */
export const getDiscounts = async (req, res, next) => {
  try {
    const {
      status,
      start_date,
      end_date,
      customer_id,
      branch_id,
      search,
      page = 1,
      limit = 25
    } = req.query;

    const where = {
      discount_status: { [Op.ne]: null } // Only sales with discount status
    };

    // Filter by status
    if (status) {
      where.discount_status = status;
    }

    // Date range filter
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    // Customer filter
    if (customer_id) {
      where.customer_id = customer_id;
    }

    // Branch filter
    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Search by invoice number or customer name
    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.iLike]: `%${search}%` } },
        { '$customer.name$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    let offset = (pageNum - 1) * limitNum;

    if (limitNum < 1) {
      limitNum = null;
      offset = null;
    }

    const { count, rows: sales } = await SalesOrder.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email']
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
        },
        {
          model: User,
          as: 'discountApprover',
          attributes: ['id', 'full_name', 'email'],
          required: false
        },
        {
          model: SalesItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'sale_price']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });

    // Calculate total discount amount
    const totalDiscount = sales.reduce((sum, sale) => {
      let saleDiscount = 0;
      sale.items?.forEach(item => {
        const standardPrice = parseFloat(item.product?.sale_price || 0);
        const sellingPrice = parseFloat(item.unit_price || 0);
        if (sellingPrice < standardPrice) {
          saleDiscount += multiply(item.quantity, standardPrice - sellingPrice);
        }
      });
      return sum + saleDiscount;
    }, 0);

    res.json({
      sales,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: limitNum ? Math.ceil(count / limitNum) : 1
      },
      totalDiscount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/discount-approvals/:id/approve
 * Approve a discount and create ledger entry
 */
export const approveDiscount = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: SalesItem,
          as: 'items',
          include: [
            { model: Product, as: 'product' }
          ]
        }
      ],
      transaction
    });

    if (!salesOrder) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (salesOrder.discount_status !== 'pending') {
      await safeRollback(transaction);
      return res.status(400).json({
        error: `Sale is not pending approval. Current status: ${salesOrder.discount_status || 'none'}`
      });
    }

    // Update discount status
    salesOrder.discount_status = 'approved';
    salesOrder.discount_approved_by = req.user.id;
    salesOrder.discount_approved_at = new Date();

    // Don't auto-queue manufactured items - they need manufacturing approval first
    // Keep production_status as 'na' so it goes through manufacturing approval workflow
    // Only update if it's not a manufactured item (shouldn't happen, but safety check)
    const hasManufacturedItems = salesOrder.items?.some(item => {
      const product = item.product;
      return product && (product.type === 'manufactured' || product.type === 'manufactured_virtual' || product.is_manufactured_virtual);
    });

    if (!hasManufacturedItems && salesOrder.production_status === 'na') {
      // Non-manufactured items can proceed normally
      // (though they typically don't have production_status set)
    }
    // For manufactured items, keep status as 'na' for manufacturing approval

    await salesOrder.save({ transaction });

    // Create ledger entry if customer exists and order is invoice
    if (salesOrder.customer_id && salesOrder.order_type === 'invoice' && salesOrder.total_amount > 0) {
      await createLedgerEntry(
        salesOrder.customer_id,
        'customer',
        {
          transaction_date: salesOrder.created_at || new Date(),
          transaction_type: 'INVOICE',
          transaction_id: salesOrder.id,
          description: `Invoice ${salesOrder.invoice_number} (Approved)`,
          debit_amount: salesOrder.total_amount,
          credit_amount: 0,
          branch_id: salesOrder.branch_id,
          created_by: req.user.id
        },
        transaction
      );
    }

    // Mark related notifications as read
    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          reference_type: 'sale',
          reference_id: salesOrder.id,
          type: 'discount_approval'
        },
        transaction
      }
    );

    await transaction.commit();

    // Fetch updated order
    const updatedOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'discountApprover' },
        {
          model: SalesItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Discount approved successfully',
      sale: updatedOrder
    });
  } catch (error) {
    await safeRollback(transaction);
    next(error);
  }
};

/**
 * PUT /api/discount-approvals/:id/decline
 * Decline a discount and remove from ledger
 */
export const declineDiscount = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' }
      ],
      transaction
    });

    if (!salesOrder) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (salesOrder.discount_status !== 'pending') {
      await safeRollback(transaction);
      return res.status(400).json({
        error: `Sale is not pending approval. Current status: ${salesOrder.discount_status || 'none'}`
      });
    }

    // Delete ledger entry if it exists (shouldn't exist for pending, but check anyway)
    if (salesOrder.customer_id) {
      await LedgerEntry.destroy({
        where: {
          transaction_type: 'INVOICE',
          transaction_id: salesOrder.id,
          contact_id: salesOrder.customer_id
        },
        transaction
      });
    }

    // Update discount status
    salesOrder.discount_status = 'declined';
    salesOrder.discount_approved_by = req.user.id;
    salesOrder.discount_approved_at = new Date();
    salesOrder.discount_declined_reason = reason || null;
    await salesOrder.save({ transaction });

    // Mark related notifications as read
    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          reference_type: 'sale',
          reference_id: salesOrder.id,
          type: 'discount_approval'
        },
        transaction
      }
    );

    await transaction.commit();

    res.json({
      message: 'Discount declined successfully',
      sale: salesOrder
    });
  } catch (error) {
    await safeRollback(transaction);
    next(error);
  }
};

/**
 * PUT /api/discount-approvals/:id/update
 * Update prices/items in a discounted sale
 */
export const updateDiscountSale = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Items array is required' });
    }

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        {
          model: SalesItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      transaction
    });

    if (!salesOrder) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (!['pending', 'declined'].includes(salesOrder.discount_status)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Can only update sales with pending or declined discount status'
      });
    }

    // Delete existing items
    await SalesItem.destroy({
      where: { order_id: salesOrder.id },
      transaction
    });

    // Recalculate total and check for discounts
    let totalAmount = 0;
    let hasDiscount = false;

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) {
        await safeRollback(transaction);
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      const standardPrice = parseFloat(product.sale_price || 0);
      const sellingPrice = parseFloat(item.unit_price || 0);

      if (sellingPrice < standardPrice) {
        hasDiscount = true;
      }

      const subtotal = multiply(item.quantity, item.unit_price);
      totalAmount += subtotal;

      await SalesItem.create({
        order_id: salesOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal
      }, { transaction });
    }

    // Update order total and discount status
    salesOrder.total_amount = totalAmount;
    
    // If no discount remains, remove discount status
    if (!hasDiscount) {
      salesOrder.discount_status = null;
      salesOrder.discount_approved_by = null;
      salesOrder.discount_approved_at = null;
      salesOrder.discount_declined_reason = null;
    } else if (salesOrder.discount_status === 'declined') {
      // If updating a declined sale, reset to pending
      salesOrder.discount_status = 'pending';
      salesOrder.discount_approved_by = null;
      salesOrder.discount_approved_at = null;
      salesOrder.discount_declined_reason = null;
    }

    await salesOrder.save({ transaction });

    await transaction.commit();

    // Fetch updated order
    const updatedOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: SalesItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Sale updated successfully',
      sale: updatedOrder
    });
  } catch (error) {
    await safeRollback(transaction);
    next(error);
  }
};

/**
 * PUT /api/discount-approvals/:id/restore
 * Restore a declined sale after price correction
 */
export const restoreDeclinedSale = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Items array is required' });
    }

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      transaction
    });

    if (!salesOrder) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (salesOrder.discount_status !== 'declined') {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Can only restore declined sales'
      });
    }

    // Delete existing items
    await SalesItem.destroy({
      where: { order_id: salesOrder.id },
      transaction
    });

    // Recalculate total
    let totalAmount = 0;
    let hasDiscount = false;

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) {
        await safeRollback(transaction);
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      const standardPrice = parseFloat(product.sale_price || 0);
      const sellingPrice = parseFloat(item.unit_price || 0);

      if (sellingPrice < standardPrice) {
        hasDiscount = true;
      }

      const subtotal = multiply(item.quantity, item.unit_price);
      totalAmount += subtotal;

      await SalesItem.create({
        order_id: salesOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal
      }, { transaction });
    }

    // Update order
    salesOrder.total_amount = totalAmount;
    
    if (hasDiscount) {
      salesOrder.discount_status = 'pending';
    } else {
      salesOrder.discount_status = null;
    }
    
    salesOrder.discount_approved_by = null;
    salesOrder.discount_approved_at = null;
    salesOrder.discount_declined_reason = null;

    await salesOrder.save({ transaction });

    // Create ledger entry if customer exists and order is invoice
    if (salesOrder.customer_id && salesOrder.order_type === 'invoice' && totalAmount > 0 && !hasDiscount) {
      await createLedgerEntry(
        salesOrder.customer_id,
        'customer',
        {
          transaction_date: salesOrder.created_at || new Date(),
          transaction_type: 'INVOICE',
          transaction_id: salesOrder.id,
          description: `Invoice ${salesOrder.invoice_number} (Restored)`,
          debit_amount: totalAmount,
          credit_amount: 0,
          branch_id: salesOrder.branch_id,
          created_by: req.user.id
        },
        transaction
      );
    }

    // If discount exists, create notifications for approvers
    if (hasDiscount) {
      const discountApprovalPermission = await Permission.findOne({
        where: { slug: 'sale_discount_approve' },
        transaction
      });

      if (discountApprovalPermission) {
        const rolesWithPermission = await Role.findAll({
          include: [
            {
              model: Permission,
              as: 'permissions',
              where: { id: discountApprovalPermission.id },
              attributes: []
            }
          ],
          transaction
        });

        const roleIds = rolesWithPermission.map(r => r.id);

        const approvers = await User.findAll({
          where: {
            is_active: true,
            [Op.or]: [
              { role_id: { [Op.in]: roleIds } },
              { '$role.name$': 'Super Admin' }
            ]
          },
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id'],
          transaction
        });

        const notificationPromises = approvers.map(approver =>
          Notification.create({
            user_id: approver.id,
            type: 'discount_approval',
            title: 'Discount Approval Required',
            message: `Sale ${salesOrder.invoice_number} has been restored and requires discount approval.`,
            reference_type: 'sale',
            reference_id: salesOrder.id
          }, { transaction })
        );

        await Promise.all(notificationPromises);
      }
    }

    await transaction.commit();

    // Fetch updated order
    const updatedOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: SalesItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Sale restored successfully',
      sale: updatedOrder
    });
  } catch (error) {
    await safeRollback(transaction);
    next(error);
  }
};
