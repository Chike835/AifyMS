import { InventoryInstance, Product, Branch, StockTransfer, StockAdjustment, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * POST /api/inventory/instances
 * Register a new coil/pallet (Create InventoryInstance)
 */
export const createInventoryInstance = async (req, res, next) => {
  try {
    const {
      product_id,
      branch_id,
      instance_code,
      initial_quantity
    } = req.body;

    // Validation
    if (!product_id || !branch_id || !instance_code || initial_quantity === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: product_id, branch_id, instance_code, initial_quantity' 
      });
    }

    if (initial_quantity <= 0) {
      return res.status(400).json({ error: 'initial_quantity must be greater than 0' });
    }

    // Verify product exists and is of type raw_tracked
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.type !== 'raw_tracked') {
      return res.status(400).json({ 
        error: 'Only raw_tracked products can have inventory instances' 
      });
    }

    // Verify branch exists
    const branch = await Branch.findByPk(branch_id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Check if instance_code already exists
    const existingInstance = await InventoryInstance.findOne({ 
      where: { instance_code } 
    });
    if (existingInstance) {
      return res.status(409).json({ error: 'Instance code already exists' });
    }

    // Create inventory instance
    const instance = await InventoryInstance.create({
      product_id,
      branch_id,
      instance_code,
      initial_quantity,
      remaining_quantity: initial_quantity,
      status: 'in_stock'
    });

    // Load with associations
    const instanceWithDetails = await InventoryInstance.findByPk(instance.id, {
      include: [
        { model: Product, as: 'product' },
        { model: Branch, as: 'branch' }
      ]
    });

    res.status(201).json({
      message: 'Inventory instance created successfully',
      instance: instanceWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/instances
 * List inventory instances with filtering
 */
export const getInventoryInstances = async (req, res, next) => {
  try {
    const { product_id, branch_id, status } = req.query;
    const where = {};

    // Apply filters
    if (product_id) {
      where.product_id = product_id;
    }

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      // Branch managers only see their branch
      where.branch_id = req.user.branch_id;
    }

    if (status) {
      where.status = status;
    }

    const instances = await InventoryInstance.findAll({
      where,
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        },
        { 
          model: Branch, 
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ instances });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/instances/:id
 * Get inventory instance by ID
 */
export const getInventoryInstanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const instance = await InventoryInstance.findByPk(id, {
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        },
        { 
          model: Branch, 
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!instance) {
      return res.status(404).json({ error: 'Inventory instance not found' });
    }

    res.json({ instance });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/instances/available/:productId
 * Get available inventory instances for a specific product
 * Used in POS for coil selection
 */
export const getAvailableInstances = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { branch_id } = req.query;

    const where = {
      product_id: productId,
      status: 'in_stock',
      remaining_quantity: { [Op.gt]: 0 }
    };

    // Filter by branch if provided, or use user's branch
    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const instances = await InventoryInstance.findAll({
      where,
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'sku', 'name', 'base_unit']
        },
        { 
          model: Branch, 
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['instance_code', 'ASC']]
    });

    res.json({ instances });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/transfer
 * Transfer inventory instance between branches
 */
export const transferInstance = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { instance_id, to_branch_id, notes } = req.body;
    const user_id = req.user.id;

    if (!instance_id || !to_branch_id) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: instance_id, to_branch_id' 
      });
    }

    // Get the instance
    const instance = await InventoryInstance.findByPk(instance_id, { transaction });
    if (!instance) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory instance not found' });
    }

    // Verify destination branch exists
    const toBranch = await Branch.findByPk(to_branch_id, { transaction });
    if (!toBranch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Destination branch not found' });
    }

    // Check if transfer is to same branch
    if (instance.branch_id === to_branch_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot transfer to the same branch' });
    }

    // Check permissions - user must have access to source branch
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== instance.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to transfer from this branch' });
    }

    const from_branch_id = instance.branch_id;

    // Update instance branch
    instance.branch_id = to_branch_id;
    await instance.save({ transaction });

    // Create transfer record
    const transfer = await StockTransfer.create({
      inventory_instance_id: instance_id,
      from_branch_id,
      to_branch_id,
      user_id,
      notes: notes || null
    }, { transaction });

    // Load with associations
    const transferWithDetails = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: InventoryInstance, as: 'inventory_instance', include: [{ model: Product, as: 'product' }] },
        { model: Branch, as: 'from_branch' },
        { model: Branch, as: 'to_branch' },
        { model: User, as: 'user' }
      ],
      transaction
    });

    await transaction.commit();

    res.status(201).json({
      message: 'Inventory instance transferred successfully',
      transfer: transferWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/transfers
 * Get transfer history
 */
export const getTransfers = async (req, res, next) => {
  try {
    const { branch_id, instance_id } = req.query;
    const where = {};

    if (instance_id) {
      where.inventory_instance_id = instance_id;
    }

    // Check permissions - Branch managers only see transfers involving their branch
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (branch_id && branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'You do not have permission to view transfers for this branch' });
      }
      
      where[Op.or] = [
        { from_branch_id: req.user.branch_id },
        { to_branch_id: req.user.branch_id }
      ];
    } else if (branch_id) {
      where[Op.or] = [
        { from_branch_id: branch_id },
        { to_branch_id: branch_id }
      ];
    }

    const transfers = await StockTransfer.findAll({
      where,
      include: [
        { 
          model: InventoryInstance, 
          as: 'inventory_instance',
          include: [{ model: Product, as: 'product' }]
        },
        { model: Branch, as: 'from_branch' },
        { model: Branch, as: 'to_branch' },
        { model: User, as: 'user' }
      ],
      order: [['transfer_date', 'DESC']]
    });

    res.json({ transfers });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/adjust
 * Adjust inventory instance quantity
 */
export const adjustStock = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { instance_id, new_quantity, reason } = req.body;
    const user_id = req.user.id;

    if (!instance_id || new_quantity === undefined || !reason) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: instance_id, new_quantity, reason' 
      });
    }

    if (new_quantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'new_quantity cannot be negative' });
    }

    if (!reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get the instance
    const instance = await InventoryInstance.findByPk(instance_id, { transaction });
    if (!instance) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory instance not found' });
    }

    // Check permissions
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== instance.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to adjust stock in this branch' });
    }

    const old_quantity = instance.remaining_quantity;

    // Update instance quantity
    instance.remaining_quantity = new_quantity;
    
    // Update status if depleted
    if (new_quantity === 0) {
      instance.status = 'depleted';
    } else if (instance.status === 'depleted' && new_quantity > 0) {
      instance.status = 'in_stock';
    }

    await instance.save({ transaction });

    // Create adjustment record
    const adjustment = await StockAdjustment.create({
      inventory_instance_id: instance_id,
      old_quantity,
      new_quantity,
      reason: reason.trim(),
      user_id
    }, { transaction });

    // Load with associations
    const adjustmentWithDetails = await StockAdjustment.findByPk(adjustment.id, {
      include: [
        { 
          model: InventoryInstance, 
          as: 'inventory_instance',
          include: [{ model: Product, as: 'product' }]
        },
        { model: User, as: 'user' }
      ],
      transaction
    });

    await transaction.commit();

    res.status(201).json({
      message: 'Stock adjusted successfully',
      adjustment: adjustmentWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/adjustments
 * Get adjustment history
 */
export const getAdjustments = async (req, res, next) => {
  try {
    const { branch_id, instance_id } = req.query;
    const where = {};

    if (instance_id) {
      where.inventory_instance_id = instance_id;
    }

    const adjustments = await StockAdjustment.findAll({
      where,
      include: [
        { 
          model: InventoryInstance, 
          as: 'inventory_instance',
          include: [
            { model: Product, as: 'product' },
            { model: Branch, as: 'branch' }
          ]
        },
        { model: User, as: 'user' }
      ],
      order: [['adjustment_date', 'DESC']]
    });

    // Filter by branch if needed
    let filteredAdjustments = adjustments;
    
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (branch_id && branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'You do not have permission to view adjustments for this branch' });
      }
      
      filteredAdjustments = adjustments.filter(adj => 
        adj.inventory_instance?.branch_id === req.user.branch_id
      );
    } else if (branch_id) {
      filteredAdjustments = adjustments.filter(adj => 
        adj.inventory_instance?.branch_id === branch_id
      );
    }

    res.json({ adjustments: filteredAdjustments });
  } catch (error) {
    next(error);
  }
};

