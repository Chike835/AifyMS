import sequelize from '../config/db.js';
import {
  Purchase,
  PurchaseItem,
  Product,
  Supplier,
  Branch,
  User,
  InventoryBatch,
  Unit
} from '../models/index.js';
import { Op } from 'sequelize';
import { safeRollback } from '../utils/transactionUtils.js';

/**
 * Generate a unique purchase number with transaction lock to prevent race conditions
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<string>} Unique purchase number
 */
const generatePurchaseNumber = async (transaction) => {
  const prefix = 'PO';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Use advisory lock to prevent concurrent purchase number generation
  // PostgreSQL advisory locks are automatically released when transaction ends
  const lockKey = `purchase_${dateStr}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Acquire advisory lock (blocks until available)
  await sequelize.query(`SELECT pg_advisory_xact_lock(${lockKey})`, { transaction });

  // Find the last purchase for today with lock
  const latestPurchase = await Purchase.findOne({
    where: {
      purchase_number: {
        [Op.like]: `${prefix}-${dateStr}-%`
      }
    },
    order: [['purchase_number', 'DESC']],
    lock: transaction.LOCK.UPDATE,
    transaction
  });

  let sequence = 1;
  if (latestPurchase) {
    const lastSequence = parseInt(latestPurchase.purchase_number.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Get all purchases
 * Super Admin sees all; Branch users see only their branch's purchases
 */
export const getPurchases = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let queryLimit = parseInt(limit);
    let offset = (parseInt(page) - 1) * queryLimit;

    if (queryLimit < 1) {
      queryLimit = null;
      offset = null;
    }

    // Build where clause
    const whereClause = {};

    // Branch filtering for non-Super Admin users
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: purchases } = await Purchase.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: queryLimit,
      offset
    });

    return res.json({
      purchases,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: queryLimit,
        totalPages: queryLimit ? Math.ceil(count / queryLimit) : 1
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    next(error);
  }
};

/**
 * Get a single purchase by ID with items
 */
export const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const purchase = await Purchase.findOne({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone', 'email', 'address']
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
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name', 'type', 'base_unit']
            },
            {
              model: InventoryBatch,
              as: 'inventory_batch',
              attributes: ['id', 'instance_code', 'initial_quantity', 'remaining_quantity', 'status']
            },
            {
              model: Unit,
              as: 'purchase_unit',
              attributes: ['id', 'name', 'abbreviation']
            }
          ]
        }
      ]
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    return res.json({ purchase });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    next(error);
  }
};

/**
 * Create a new purchase with items
 * CRITICAL: For raw_tracked products, automatically creates inventory instances
 * Uses database transaction for atomicity - rolls back on any failure
 */
export const createPurchase = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplier_id, items, notes } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Determine branch_id
    const branch_id = req.user?.branch_id;
    if (!branch_id && req.user?.role_name !== 'Super Admin') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'User must belong to a branch to create purchases' });
    }

    // For Super Admin without branch, require branch_id in request
    const purchaseBranchId = branch_id || req.body.branch_id;
    if (!purchaseBranchId) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Validate supplier if provided
    if (supplier_id) {
      const supplier = await Supplier.findByPk(supplier_id, { transaction });
      if (!supplier) {
        await safeRollback(transaction);
        return res.status(400).json({ error: 'Supplier not found' });
      }
    }

    // Fetch all products for items to validate types
    const productIds = items.map(item => item.product_id);
    const products = await Product.findAll({
      where: { id: productIds },
      transaction
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate items and handle unit conversion
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: `Product not found: ${item.product_id}`
        });
      }

      // Handle unit conversion if purchase_unit_id is provided
      let baseQuantity = parseFloat(item.quantity);
      let conversionFactor = 1;
      let purchaseUnitId = null;
      let purchasedQuantity = null;

      if (item.purchase_unit_id) {
        // Fetch the purchase unit to get conversion factor
        const purchaseUnit = await Unit.findByPk(item.purchase_unit_id, { transaction });
        if (!purchaseUnit) {
          await safeRollback(transaction);
          return res.status(400).json({
            error: `Purchase unit not found: ${item.purchase_unit_id}`
          });
        }

        // Get the product's base unit
        const baseUnit = await Unit.findOne({
          where: { id: product.unit_id },
          transaction
        });

        if (!baseUnit) {
          await safeRollback(transaction);
          return res.status(400).json({
            error: `Product base unit not found for product: ${product.name}`
          });
        }

        // If purchase unit is different from base unit, calculate conversion
        if (purchaseUnit.id !== baseUnit.id) {
          // Find conversion path: purchase_unit -> base_unit
          // If purchase_unit has base_unit_id pointing to product's base unit
          if (purchaseUnit.base_unit_id === baseUnit.id) {
            conversionFactor = parseFloat(purchaseUnit.conversion_factor) || 1;
          } else if (purchaseUnit.is_base_unit) {
            // Purchase unit is a base unit, need reverse conversion
            const derivedUnit = await Unit.findOne({
              where: { base_unit_id: purchaseUnit.id, id: baseUnit.id },
              transaction
            });
            if (derivedUnit) {
              conversionFactor = 1 / (parseFloat(derivedUnit.conversion_factor) || 1);
            }
          } else {
            // Try to find a path through base_unit_id chain
            let currentUnit = purchaseUnit;
            conversionFactor = 1;
            while (currentUnit && currentUnit.base_unit_id !== baseUnit.id) {
              conversionFactor *= parseFloat(currentUnit.conversion_factor) || 1;
              if (currentUnit.base_unit_id) {
                currentUnit = await Unit.findByPk(currentUnit.base_unit_id, { transaction });
              } else {
                break;
              }
            }
            if (currentUnit && currentUnit.base_unit_id === baseUnit.id) {
              conversionFactor *= parseFloat(currentUnit.conversion_factor) || 1;
            }
          }

          purchasedQuantity = parseFloat(item.purchased_quantity || item.quantity);
          baseQuantity = purchasedQuantity * conversionFactor;
          purchaseUnitId = purchaseUnit.id;
        } else {
          // Same unit, no conversion needed
          purchasedQuantity = parseFloat(item.quantity);
          baseQuantity = purchasedQuantity;
        }
      } else {
        // No purchase unit specified, use quantity as-is
        baseQuantity = parseFloat(item.quantity);
      }

      if (!baseQuantity || baseQuantity <= 0) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: `Invalid quantity for product ${product.name}`
        });
      }

      if (item.unit_cost === undefined || item.unit_cost < 0) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: `Invalid unit cost for product ${product.name}`
        });
      }

      // CRITICAL: For raw_tracked products, instance_code is REQUIRED
      if (product.type === 'raw_tracked') {
        if (!item.instance_code || item.instance_code.trim() === '') {
          await safeRollback(transaction);
          return res.status(400).json({
            error: `Instance code is required for raw_tracked product: ${product.name}`
          });
        }

        // Check if instance_code already exists
        const existingBatch = await InventoryBatch.findOne({
          where: { instance_code: item.instance_code.trim() },
          transaction
        });

        if (existingBatch) {
          await safeRollback(transaction);
          return res.status(400).json({
            error: `Instance code "${item.instance_code}" already exists. Each coil/pallet must have a unique code.`
          });
        }
      }

      // Store calculated values in item for later use
      item._baseQuantity = baseQuantity;
      item._conversionFactor = conversionFactor;
      item._purchaseUnitId = purchaseUnitId;
      item._purchasedQuantity = purchasedQuantity;
    }

    // Generate purchase number
    const purchase_number = await generatePurchaseNumber(transaction);

    // Calculate total amount (using purchased_quantity if available, otherwise quantity)
    let total_amount = 0;
    for (const item of items) {
      const qty = item._purchasedQuantity || parseFloat(item.quantity);
      total_amount += qty * parseFloat(item.unit_cost);
    }

    // Create the purchase
    const purchase = await Purchase.create({
      purchase_number,
      supplier_id: supplier_id || null,
      branch_id: purchaseBranchId,
      user_id: req.user.id,
      total_amount,
      payment_status: 'unpaid',
      status: 'confirmed',
      notes: notes?.trim() || null
    }, { transaction });

    // Create purchase items and inventory batches for raw_tracked products
    const createdItems = [];
    const createdBatches = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      const baseQuantity = item._baseQuantity || parseFloat(item.quantity);
      const purchasedQty = item._purchasedQuantity || parseFloat(item.quantity);
      const subtotal = purchasedQty * parseFloat(item.unit_cost);

      let inventoryBatchId = null;

      // For raw_tracked products, create inventory batch (using base quantity)
      if (product.type === 'raw_tracked') {
        const inventoryBatch = await InventoryBatch.create({
          product_id: item.product_id,
          branch_id: purchaseBranchId,
          instance_code: item.instance_code.trim(),
          initial_quantity: baseQuantity,
          remaining_quantity: baseQuantity,
          status: 'in_stock'
        }, { transaction });

        inventoryBatchId = inventoryBatch.id;
        createdBatches.push(inventoryBatch);
      }

      // Create purchase item (store both purchased and base quantities)
      const purchaseItem = await PurchaseItem.create({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: baseQuantity, // Base unit quantity (stored in inventory)
        unit_cost: parseFloat(item.unit_cost),
        subtotal,
        instance_code: item.instance_code?.trim() || null,
        inventory_batch_id: inventoryBatchId,
        purchase_unit_id: item._purchaseUnitId || null,
        purchased_quantity: item._purchaseUnitId ? purchasedQty : null,
        conversion_factor: item._conversionFactor || 1
      }, { transaction });

      createdItems.push(purchaseItem);
    }

    // Create ledger entry for confirmed purchases with supplier BEFORE committing
    // This ensures ACID compliance - if ledger entry fails, entire purchase is rolled back
    if (purchase.status === 'confirmed' && supplier_id && total_amount > 0) {
      const { createLedgerEntry } = await import('../services/ledgerService.js');
      await createLedgerEntry(
        supplier_id,
        'supplier',
        {
          transaction_date: purchase.created_at || new Date(),
          transaction_type: 'INVOICE',
          transaction_id: purchase.id,
          description: `Purchase ${purchase_number}`,
          debit_amount: 0,
          credit_amount: total_amount,
          branch_id: purchaseBranchId,
          created_by: req.user.id
        },
        transaction
      );
    }

    // Commit transaction - all operations succeeded
    await transaction.commit();

    // Fetch the complete purchase with all relations
    const completePurchase = await Purchase.findByPk(purchase.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name']
        },
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name', 'type', 'base_unit']
            },
            {
              model: InventoryBatch,
              as: 'inventory_batch',
              attributes: ['id', 'instance_code', 'initial_quantity', 'status']
            },
            {
              model: Unit,
              as: 'purchase_unit',
              attributes: ['id', 'name', 'abbreviation']
            }
          ]
        }
      ]
    });

    return res.status(201).json({
      message: 'Purchase created successfully',
      purchase: completePurchase,
      inventory_batches_created: createdBatches.length
    });

  } catch (error) {
    // Rollback transaction on any error
    try {
      await safeRollback(transaction);
    } catch (rbError) {
      // Ignore rollback errors if transaction is already finished
    }
    console.error('Error creating purchase:', error);

    // Let Express error middleware handle Sequelize errors
    next(error);
  }
};

/**
 * Update purchase status
 */
export const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const purchase = await Purchase.findOne({ where: whereClause });
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Update allowed fields
    const updates = {};
    if (status && ['draft', 'confirmed', 'received', 'cancelled'].includes(status)) {
      updates.status = status;
    }
    if (payment_status && ['unpaid', 'partial', 'paid'].includes(payment_status)) {
      updates.payment_status = payment_status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await purchase.update(updates);

    return res.json({
      message: 'Purchase updated successfully',
      purchase
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    next(error);
  }
};

/**
 * Delete a purchase (only draft or cancelled)
 */
export const deletePurchase = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const purchase = await Purchase.findOne({
      where: whereClause,
      include: [
        {
          model: PurchaseItem,
          as: 'items'
        }
      ],
      transaction
    });

    if (!purchase) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Only allow deletion of draft or cancelled purchases
    if (!['draft', 'cancelled'].includes(purchase.status)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Only draft or cancelled purchases can be deleted'
      });
    }

    // Check if any inventory batches from this purchase have been used
    for (const item of purchase.items) {
      if (item.inventory_batch_id) {
        const batch = await InventoryBatch.findByPk(item.inventory_batch_id, { transaction });
        if (batch && batch.remaining_quantity < batch.initial_quantity) {
          await safeRollback(transaction);
          return res.status(400).json({
            error: `Cannot delete: Inventory batch ${batch.instance_code || batch.batch_identifier} has been partially used`
          });
        }
        // Delete the inventory batch
        if (batch) {
          await batch.destroy({ transaction });
        }
      }
    }

    // Delete the purchase (items will cascade)
    await purchase.destroy({ transaction });

    await transaction.commit();

    return res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    await safeRollback(transaction);
    console.error('Error deleting purchase:', error);
    next(error);
  }
};

