import sequelize from '../config/db.js';
import { 
  Purchase, 
  PurchaseItem, 
  Product, 
  Supplier, 
  Branch, 
  User, 
  InventoryInstance 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Generate a unique purchase number
 */
const generatePurchaseNumber = async () => {
  const today = new Date();
  const datePrefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // Find the latest purchase number for today
  const latestPurchase = await Purchase.findOne({
    where: {
      purchase_number: {
        [Op.like]: `${datePrefix}%`
      }
    },
    order: [['purchase_number', 'DESC']]
  });

  let sequence = 1;
  if (latestPurchase) {
    const lastSequence = parseInt(latestPurchase.purchase_number.slice(-4), 10);
    sequence = lastSequence + 1;
  }

  return `${datePrefix}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Get all purchases
 * Super Admin sees all; Branch users see only their branch's purchases
 */
export const getPurchases = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {};

    // Branch filtering for non-Super Admin users
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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
      limit: parseInt(limit),
      offset
    });

    return res.json({
      purchases,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

/**
 * Get a single purchase by ID with items
 */
export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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
              model: InventoryInstance,
              as: 'inventory_instance',
              attributes: ['id', 'instance_code', 'initial_quantity', 'remaining_quantity', 'status']
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
    return res.status(500).json({ error: 'Failed to fetch purchase' });
  }
};

/**
 * Create a new purchase with items
 * CRITICAL: For raw_tracked products, automatically creates inventory instances
 * Uses database transaction for atomicity - rolls back on any failure
 */
export const createPurchase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplier_id, items, notes } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Determine branch_id
    const branch_id = req.user.branch_id;
    if (!branch_id && req.user.role_name !== 'Super Admin') {
      await transaction.rollback();
      return res.status(400).json({ error: 'User must belong to a branch to create purchases' });
    }

    // For Super Admin without branch, require branch_id in request
    const purchaseBranchId = branch_id || req.body.branch_id;
    if (!purchaseBranchId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Validate supplier if provided
    if (supplier_id) {
      const supplier = await Supplier.findByPk(supplier_id, { transaction });
      if (!supplier) {
        await transaction.rollback();
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

    // Validate items
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Product not found: ${item.product_id}` 
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Invalid quantity for product ${product.name}` 
        });
      }

      if (item.unit_cost === undefined || item.unit_cost < 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Invalid unit cost for product ${product.name}` 
        });
      }

      // CRITICAL: For raw_tracked products, instance_code is REQUIRED
      if (product.type === 'raw_tracked') {
        if (!item.instance_code || item.instance_code.trim() === '') {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Instance code is required for raw_tracked product: ${product.name}` 
          });
        }

        // Check if instance_code already exists
        const existingInstance = await InventoryInstance.findOne({
          where: { instance_code: item.instance_code.trim() },
          transaction
        });

        if (existingInstance) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Instance code "${item.instance_code}" already exists. Each coil/pallet must have a unique code.` 
          });
        }
      }
    }

    // Generate purchase number
    const purchase_number = await generatePurchaseNumber();

    // Calculate total amount
    let total_amount = 0;
    for (const item of items) {
      total_amount += parseFloat(item.quantity) * parseFloat(item.unit_cost);
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

    // Create purchase items and inventory instances for raw_tracked products
    const createdItems = [];
    const createdInstances = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_cost);

      let inventoryInstanceId = null;

      // For raw_tracked products, create inventory instance
      if (product.type === 'raw_tracked') {
        const inventoryInstance = await InventoryInstance.create({
          product_id: item.product_id,
          branch_id: purchaseBranchId,
          instance_code: item.instance_code.trim(),
          initial_quantity: parseFloat(item.quantity),
          remaining_quantity: parseFloat(item.quantity),
          status: 'in_stock'
        }, { transaction });

        inventoryInstanceId = inventoryInstance.id;
        createdInstances.push(inventoryInstance);
      }

      // Create purchase item
      const purchaseItem = await PurchaseItem.create({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: parseFloat(item.quantity),
        unit_cost: parseFloat(item.unit_cost),
        subtotal,
        instance_code: item.instance_code?.trim() || null,
        inventory_instance_id: inventoryInstanceId
      }, { transaction });

      createdItems.push(purchaseItem);
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
              model: InventoryInstance,
              as: 'inventory_instance',
              attributes: ['id', 'instance_code', 'initial_quantity', 'status']
            }
          ]
        }
      ]
    });

    return res.status(201).json({
      message: 'Purchase created successfully',
      purchase: completePurchase,
      inventory_instances_created: createdInstances.length
    });

  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    console.error('Error creating purchase:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: error.errors?.[0]?.message || 'Validation error' 
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'Duplicate entry detected. Please check instance codes.' 
      });
    }
    
    return res.status(500).json({ error: 'Failed to create purchase' });
  }
};

/**
 * Update purchase status
 */
export const updatePurchaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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
    return res.status(500).json({ error: 'Failed to update purchase' });
  }
};

/**
 * Delete a purchase (only draft or cancelled)
 */
export const deletePurchase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Only allow deletion of draft or cancelled purchases
    if (!['draft', 'cancelled'].includes(purchase.status)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Only draft or cancelled purchases can be deleted' 
      });
    }

    // Check if any inventory instances from this purchase have been used
    for (const item of purchase.items) {
      if (item.inventory_instance_id) {
        const instance = await InventoryInstance.findByPk(item.inventory_instance_id, { transaction });
        if (instance && instance.remaining_quantity < instance.initial_quantity) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Cannot delete: Inventory instance ${instance.instance_code} has been partially used` 
          });
        }
        // Delete the inventory instance
        if (instance) {
          await instance.destroy({ transaction });
        }
      }
    }

    // Delete the purchase (items will cascade)
    await purchase.destroy({ transaction });

    await transaction.commit();

    return res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting purchase:', error);
    return res.status(500).json({ error: 'Failed to delete purchase' });
  }
};

