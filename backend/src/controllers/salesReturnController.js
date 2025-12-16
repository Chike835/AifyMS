import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { safeRollback } from '../utils/transactionUtils.js';
import {
  SalesReturn,
  SalesReturnItem,
  SalesOrder,
  SalesItem,
  Customer,
  Product,
  Branch,
  User,
  InventoryBatch,
  ItemAssignment,
  Recipe
} from '../models/index.js';
import { add, greaterThan } from '../utils/mathUtils.js';

/**
 * Generate a unique return number
 */
const generateReturnNumber = async () => {
  const today = new Date();
  const prefix = `RET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastReturn = await SalesReturn.findOne({
    where: {
      return_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['created_at', 'DESC']]
  });

  let sequence = 1;
  if (lastReturn) {
    const lastNum = parseInt(lastReturn.return_number.split('-').pop(), 10);
    sequence = lastNum + 1;
  }

  return `${prefix}-${String(sequence).padStart(5, '0')}`;
};

/**
 * GET /api/sales-returns
 * List all sales returns
 */
export const getSalesReturns = async (req, res, next) => {
  try {
    const { status, customer_id } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (customer_id) {
      where.customer_id = customer_id;
    }

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const returns = await SalesReturn.findAll({
      where,
      include: [
        { model: SalesOrder, as: 'sales_order' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: SalesReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ returns });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales-returns/:id
 * Get sales return by ID
 */
export const getSalesReturnById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const salesReturn = await SalesReturn.findByPk(id, {
      include: [
        { 
          model: SalesOrder, 
          as: 'sales_order',
          include: [{ model: Customer, as: 'customer' }]
        },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: SalesReturnItem,
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            { 
              model: SalesItem, 
              as: 'original_item',
              include: [{ model: Product, as: 'product' }]
            }
          ]
        }
      ]
    });

    if (!salesReturn) {
      return res.status(404).json({ error: 'Sales return not found' });
    }

    res.json({ salesReturn });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sales-returns
 * Create a new sales return
 */
export const createSalesReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      sales_order_id,
      items, // Array of { sales_item_id, quantity }
      reason,
      refund_method
    } = req.body;

    // Validation
    if (!sales_order_id) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'sales_order_id is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'items array is required' });
    }

    if (!reason || !reason.trim()) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'reason is required' });
    }

    // Get the sales order
    const salesOrder = await SalesOrder.findByPk(sales_order_id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: SalesItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ],
      transaction
    });

    if (!salesOrder) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // Generate return number
    const returnNumber = await generateReturnNumber();

    // Create sales return
    const salesReturn = await SalesReturn.create({
      return_number: returnNumber,
      sales_order_id,
      customer_id: salesOrder.customer_id,
      branch_id: salesOrder.branch_id,
      user_id: req.user.id,
      reason: reason.trim(),
      refund_method: refund_method || 'credit',
      status: 'pending',
      total_amount: 0
    }, { transaction });

    // Process return items
    let totalAmount = 0;

    for (const item of items) {
      const { sales_item_id, quantity } = item;

      // Find the original sales item
      const originalItem = salesOrder.items.find(i => i.id === sales_item_id);
      if (!originalItem) {
        await safeRollback(transaction);
        return res.status(404).json({ error: `Sales item ${sales_item_id} not found in order` });
      }

      // Validate quantity
      if (quantity <= 0 || quantity > parseFloat(originalItem.quantity)) {
        await safeRollback(transaction);
        return res.status(400).json({ 
          error: `Invalid return quantity for ${originalItem.product?.name}. Max: ${originalItem.quantity}` 
        });
      }

      const subtotal = parseFloat(quantity) * parseFloat(originalItem.unit_price);
      totalAmount += subtotal;

      // Create return item
      await SalesReturnItem.create({
        sales_return_id: salesReturn.id,
        sales_item_id,
        product_id: originalItem.product_id,
        quantity,
        unit_price: originalItem.unit_price,
        subtotal
      }, { transaction });
    }

    // Update total amount
    salesReturn.total_amount = totalAmount;
    await salesReturn.save({ transaction });

    await transaction.commit();

    // Fetch complete return
    const completeReturn = await SalesReturn.findByPk(salesReturn.id, {
      include: [
        { model: SalesOrder, as: 'sales_order' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: SalesReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      message: 'Sales return created successfully',
      salesReturn: completeReturn
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/sales-returns/:id/approve
 * Approve a sales return
 */
export const approveSalesReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const salesReturn = await SalesReturn.findByPk(id, {
      include: [
        { 
          model: SalesReturnItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            { 
              model: SalesItem, 
              as: 'original_item',
              include: [
                {
                  model: ItemAssignment,
                  as: 'assignments',
                  include: [{ model: InventoryBatch, as: 'inventory_batch' }]
                }
              ]
            }
          ]
        },
        { model: Customer, as: 'customer' }
      ],
      transaction
    });

    if (!salesReturn) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sales return not found' });
    }

    if (salesReturn.status !== 'pending') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Only pending returns can be approved' });
    }

    // Process inventory restoration for products with inventory batches or recipes
    for (const item of salesReturn.items) {
      // Check if product has inventory batches or a recipe
      const hasBatches = await InventoryBatch.findOne({
        where: { product_id: item.product_id }
      });
      const hasRecipe = await Recipe.findOne({
        where: { virtual_product_id: item.product_id }
      });

      if (hasBatches || hasRecipe) {
        // For manufactured products, restore to the original coils
        const assignments = item.original_item?.assignments || [];
        
        // Calculate proportion to restore for each assignment
        const originalQty = parseFloat(item.original_item?.quantity || 0);
        const returnQty = parseFloat(item.quantity);
        const ratio = originalQty > 0 ? returnQty / originalQty : 0;

        for (const assignment of assignments) {
          const restoreQty = parseFloat(assignment.quantity_deducted) * ratio;
          
          if (assignment.inventory_batch) {
            const batch = await InventoryBatch.findByPk(
              assignment.inventory_batch.id,
              { lock: transaction.LOCK.UPDATE, transaction }
            );

            if (batch) {
              // Restore inventory using precision math
              batch.remaining_quantity = add(
                parseFloat(batch.remaining_quantity || 0), 
                restoreQty
              );
              
              // Restore status if batch was depleted
              if (batch.status === 'depleted' && greaterThan(batch.remaining_quantity, 0)) {
                batch.status = 'in_stock';
              }
              
              await batch.save({ transaction });
            }
          }
        }
      }
    }

    // Update customer ledger balance for all refunds
    // All refunds reduce what the customer owes us, regardless of refund method
    if (salesReturn.customer) {
      const customer = await Customer.findByPk(salesReturn.customer.id, { 
        lock: transaction.LOCK.UPDATE, 
        transaction 
      });
      if (customer) {
        // Reduce the balance owed (or add credit)
        customer.ledger_balance = parseFloat(customer.ledger_balance || 0) - parseFloat(salesReturn.total_amount);
        await customer.save({ transaction });
      }
    }

    // Update return status
    salesReturn.status = 'approved';
    salesReturn.approved_by = req.user.id;
    salesReturn.approved_at = new Date();
    await salesReturn.save({ transaction });

    await transaction.commit();

    // Create ledger entry for all approved sales returns
    // All refunds reduce what the customer owes us, regardless of refund method (credit, cash, POS)
    if (salesReturn.customer_id && salesReturn.total_amount > 0) {
      try {
        const { createLedgerEntry } = await import('../services/ledgerService.js');
        await createLedgerEntry(
          salesReturn.customer_id,
          'customer',
          {
            transaction_date: salesReturn.approved_at || new Date(),
            transaction_type: 'RETURN',
            transaction_id: salesReturn.id,
            description: `Sales Return ${salesReturn.return_number} (${salesReturn.refund_method})`,
            debit_amount: 0,
            credit_amount: salesReturn.total_amount,
            branch_id: salesReturn.branch_id,
            created_by: req.user.id
          }
        );
      } catch (ledgerError) {
        console.error('Error creating ledger entry for sales return:', ledgerError);
        // Don't fail the return if ledger entry fails
      }
    }

    // Fetch updated return
    const updatedReturn = await SalesReturn.findByPk(id, {
      include: [
        { model: SalesOrder, as: 'sales_order' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: SalesReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Sales return approved successfully',
      salesReturn: updatedReturn
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/sales-returns/:id/cancel
 * Cancel a sales return
 */
export const cancelSalesReturn = async (req, res, next) => {
  try {
    const { id } = req.params;

    const salesReturn = await SalesReturn.findByPk(id);

    if (!salesReturn) {
      return res.status(404).json({ error: 'Sales return not found' });
    }

    if (salesReturn.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending returns can be cancelled' });
    }

    salesReturn.status = 'cancelled';
    await salesReturn.save();

    res.json({
      message: 'Sales return cancelled successfully',
      salesReturn
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales-returns/order/:orderId
 * Get returns for a specific sales order
 */
export const getReturnsByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const returns = await SalesReturn.findAll({
      where: { sales_order_id: orderId },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: SalesReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ returns });
  } catch (error) {
    next(error);
  }
};

