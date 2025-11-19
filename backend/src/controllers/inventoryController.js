import { InventoryInstance, Product, Branch } from '../models/index.js';
import { Op } from 'sequelize';

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

