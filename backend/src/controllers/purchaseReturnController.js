import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { safeRollback } from '../utils/transactionUtils.js';
import {
  PurchaseReturn,
  PurchaseReturnItem,
  Purchase,
  PurchaseItem,
  Supplier,
  Product,
  Branch,
  User,
  InventoryBatch
} from '../models/index.js';

/**
 * Generate a unique return number
 */
const generateReturnNumber = async () => {
  const today = new Date();
  const prefix = `PRET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastReturn = await PurchaseReturn.findOne({
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
 * GET /api/purchase-returns
 * List all purchase returns
 */
export const getPurchaseReturns = async (req, res, next) => {
  try {
    const { status, supplier_id } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (supplier_id) {
      where.supplier_id = supplier_id;
    }

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const returns = await PurchaseReturn.findAll({
      where,
      include: [
        { model: Purchase, as: 'purchase' },
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: PurchaseReturnItem,
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
 * GET /api/purchase-returns/:id
 * Get purchase return by ID
 */
export const getPurchaseReturnById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseReturn = await PurchaseReturn.findByPk(id, {
      include: [
        { 
          model: Purchase, 
          as: 'purchase',
          include: [{ model: Supplier, as: 'supplier' }]
        },
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: PurchaseReturnItem,
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            { model: InventoryBatch, as: 'inventory_batch' }
          ]
        }
      ]
    });

    if (!purchaseReturn) {
      return res.status(404).json({ error: 'Purchase return not found' });
    }

    res.json({ purchaseReturn });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/purchase-returns
 * Create a new purchase return
 */
export const createPurchaseReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      purchase_id,
      items, // Array of { purchase_item_id, quantity, inventory_batch_id? }
      reason
    } = req.body;

    // Validation
    if (!purchase_id) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'purchase_id is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'items array is required' });
    }

    if (!reason || !reason.trim()) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'reason is required' });
    }

    // Get the purchase
    const purchase = await Purchase.findByPk(purchase_id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { 
          model: PurchaseItem, 
          as: 'items', 
          include: [
            { model: Product, as: 'product' },
            { model: InventoryBatch, as: 'inventory_batch' }
          ] 
        }
      ],
      transaction
    });

    if (!purchase) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Generate return number
    const returnNumber = await generateReturnNumber();

    // Create purchase return
    const purchaseReturn = await PurchaseReturn.create({
      return_number: returnNumber,
      purchase_id,
      supplier_id: purchase.supplier_id,
      branch_id: purchase.branch_id,
      user_id: req.user.id,
      reason: reason.trim(),
      status: 'pending',
      total_amount: 0
    }, { transaction });

    // Process return items
    let totalAmount = 0;

    for (const item of items) {
      const { purchase_item_id, quantity, inventory_batch_id } = item;

      // Find the original purchase item
      const originalItem = purchase.items.find(i => i.id === purchase_item_id);
      if (!originalItem) {
        await safeRollback(transaction);
        return res.status(404).json({ error: `Purchase item ${purchase_item_id} not found in order` });
      }

      // Validate quantity
      if (quantity <= 0 || quantity > parseFloat(originalItem.quantity)) {
        await safeRollback(transaction);
        return res.status(400).json({ 
          error: `Invalid return quantity for ${originalItem.product?.name}. Max: ${originalItem.quantity}` 
        });
      }

      const subtotal = parseFloat(quantity) * parseFloat(originalItem.unit_cost);
      totalAmount += subtotal;

      // Create return item
      await PurchaseReturnItem.create({
        purchase_return_id: purchaseReturn.id,
        purchase_item_id,
        product_id: originalItem.product_id,
        quantity,
        unit_cost: originalItem.unit_cost,
        subtotal,
        inventory_batch_id: inventory_batch_id || originalItem.inventory_batch_id
      }, { transaction });
    }

    // Update total amount
    purchaseReturn.total_amount = totalAmount;
    await purchaseReturn.save({ transaction });

    await transaction.commit();

    // Fetch complete return
    const completeReturn = await PurchaseReturn.findByPk(purchaseReturn.id, {
      include: [
        { model: Purchase, as: 'purchase' },
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        {
          model: PurchaseReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      message: 'Purchase return created successfully',
      purchaseReturn: completeReturn
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/purchase-returns/:id/approve
 * Approve a purchase return
 */
export const approvePurchaseReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const purchaseReturn = await PurchaseReturn.findByPk(id, {
      include: [
        { 
          model: PurchaseReturnItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            { model: InventoryBatch, as: 'inventory_batch' }
          ]
        },
        { model: Supplier, as: 'supplier' }
      ],
      transaction
    });

    if (!purchaseReturn) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Purchase return not found' });
    }

    if (purchaseReturn.status !== 'pending') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Only pending returns can be approved' });
    }

    // Process inventory deduction for returned items
    for (const item of purchaseReturn.items) {
      if (item.inventory_batch) {
        const batch = await InventoryBatch.findByPk(
          item.inventory_batch.id,
          { lock: transaction.LOCK.UPDATE, transaction }
        );

        if (instance) {
          // Deduct the returned quantity from inventory
          instance.remaining_quantity = Math.max(0, parseFloat(instance.remaining_quantity) - parseFloat(item.quantity));
          if (instance.remaining_quantity <= 0) {
            instance.status = 'depleted';
          }
          await instance.save({ transaction });
        }
      }
    }

    // Update supplier ledger
    if (purchaseReturn.supplier) {
      const supplier = await Supplier.findByPk(purchaseReturn.supplier.id, { 
        lock: transaction.LOCK.UPDATE, 
        transaction 
      });
      if (supplier) {
        // Reduce the balance owed to supplier
        supplier.ledger_balance = parseFloat(supplier.ledger_balance || 0) - parseFloat(purchaseReturn.total_amount);
        await supplier.save({ transaction });
      }
    }

    // Update return status
    purchaseReturn.status = 'approved';
    purchaseReturn.approved_by = req.user.id;
    purchaseReturn.approved_at = new Date();
    await purchaseReturn.save({ transaction });

    await transaction.commit();

    // Create ledger entry for approved purchase returns
    if (purchaseReturn.supplier_id && purchaseReturn.total_amount > 0) {
      try {
        const { createLedgerEntry } = await import('../services/ledgerService.js');
        await createLedgerEntry(
          purchaseReturn.supplier_id,
          'supplier',
          {
            transaction_date: purchaseReturn.approved_at || new Date(),
            transaction_type: 'RETURN',
            transaction_id: purchaseReturn.id,
            description: `Purchase Return ${purchaseReturn.return_number}`,
            debit_amount: purchaseReturn.total_amount,
            credit_amount: 0,
            branch_id: purchaseReturn.branch_id,
            created_by: req.user.id
          }
        );
      } catch (ledgerError) {
        console.error('Error creating ledger entry for purchase return:', ledgerError);
        // Don't fail the return if ledger entry fails
      }
    }

    // Fetch updated return
    const updatedReturn = await PurchaseReturn.findByPk(id, {
      include: [
        { model: Purchase, as: 'purchase' },
        { model: Supplier, as: 'supplier' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] },
        {
          model: PurchaseReturnItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Purchase return approved successfully',
      purchaseReturn: updatedReturn
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/purchase-returns/:id/cancel
 * Cancel a purchase return
 */
export const cancelPurchaseReturn = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseReturn = await PurchaseReturn.findByPk(id);

    if (!purchaseReturn) {
      return res.status(404).json({ error: 'Purchase return not found' });
    }

    if (purchaseReturn.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending returns can be cancelled' });
    }

    purchaseReturn.status = 'cancelled';
    await purchaseReturn.save();

    res.json({
      message: 'Purchase return cancelled successfully',
      purchaseReturn
    });
  } catch (error) {
    next(error);
  }
};

