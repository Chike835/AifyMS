import { InventoryBatch, Product, Branch, Category, BatchType, CategoryBatchType, SalesItem, ItemAssignment, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const isSuperAdmin = (req) => req.user?.role_name === 'Super Admin';

const buildCategoryAccessError = (req, category, branchId) => {
  if (!category) {
    return { status: 404, message: 'Category not found' };
  }
  if (category.branch_id && branchId && category.branch_id !== branchId) {
    return { status: 400, message: 'Category is not available for the selected branch' };
  }
  if (category.branch_id && !isSuperAdmin(req) && req.user?.branch_id !== category.branch_id) {
    return { status: 403, message: 'You do not have access to this category' };
  }
  return null;
};

/**
 * POST /api/inventory/batches
 * Create a new inventory batch
 */
export const createBatch = async (req, res, next) => {
  try {
    const {
      product_id,
      branch_id,
      category_id,
      instance_code,
      batch_type_id,
      grouped = true,
      batch_identifier,
      initial_quantity,
      attribute_data = {}
    } = req.body;

    // Validation
    if (!product_id || !branch_id || initial_quantity === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: product_id, branch_id, initial_quantity' 
      });
    }

    if (initial_quantity <= 0) {
      return res.status(400).json({ error: 'initial_quantity must be greater than 0' });
    }

    // If grouped, instance_code is required
    if (grouped && !instance_code) {
      return res.status(400).json({ 
        error: 'instance_code is required when grouped is true' 
      });
    }

    // Verify product exists and is of type raw_tracked
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.type !== 'raw_tracked') {
      return res.status(400).json({ 
        error: 'Only raw_tracked products can have inventory batches' 
      });
    }

    // Verify branch exists
    const branch = await Branch.findByPk(branch_id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Verify category if provided
    let categoryRecord = null;
    if (category_id) {
      categoryRecord = await Category.findByPk(category_id);
      const categoryAccessError = buildCategoryAccessError(req, categoryRecord, branch_id);
      if (categoryAccessError) {
        return res.status(categoryAccessError.status).json({ error: categoryAccessError.message });
      }

      if (categoryRecord.attribute_schema && Array.isArray(categoryRecord.attribute_schema)) {
        const requiredAttrs = categoryRecord.attribute_schema.filter(attr => attr.required);
        for (const attr of requiredAttrs) {
          if (!attribute_data[attr.name]) {
            return res.status(400).json({
              error: `Required attribute '${attr.name}' is missing`
            });
          }
        }
      }
    }

    // Verify batch_type_id if provided, or get default from category
    let finalBatchTypeId = batch_type_id;
    if (!finalBatchTypeId && category_id) {
      // Get first assigned batch type for this category
      const category = await Category.findByPk(category_id, {
        include: [{
          model: BatchType,
          as: 'batch_types',
          where: { is_active: true },
          limit: 1,
          required: false
        }]
      });
      const categoryAccessError = buildCategoryAccessError(req, category, branch_id);
      if (categoryAccessError) {
        return res.status(categoryAccessError.status).json({ error: categoryAccessError.message });
      }
      if (category?.batch_types?.length > 0) {
        finalBatchTypeId = category.batch_types[0].id;
      }
    }

    if (!finalBatchTypeId) {
      return res.status(400).json({ 
        error: 'batch_type_id is required. Assign batch types to the category first.' 
      });
    }

    // Verify batch type exists and is active
    const batchType = await BatchType.findByPk(finalBatchTypeId);
    if (!batchType) {
      return res.status(404).json({ error: 'Batch type not found' });
    }
    if (!batchType.is_active) {
      return res.status(400).json({ error: 'Batch type is inactive' });
    }

    // Validate batch type is assigned to category (if category provided)
    if (category_id) {
      const assignment = await CategoryBatchType.findOne({
        where: { category_id, batch_type_id: finalBatchTypeId }
      });
      if (!assignment) {
        return res.status(400).json({ 
          error: `Batch type "${batchType.name}" is not assigned to this category. Please assign it in Batch Settings first.` 
        });
      }
    }

    // Check if instance_code already exists (if grouped)
    if (grouped && instance_code) {
      const existingBatch = await InventoryBatch.findOne({ 
        where: { instance_code } 
      });
      if (existingBatch) {
        return res.status(409).json({ error: 'Instance code already exists' });
      }
    }

    // Create inventory batch
    const batch = await InventoryBatch.create({
      product_id,
      branch_id,
      category_id: category_id || null,
      instance_code: grouped ? instance_code : null,
      batch_type_id: finalBatchTypeId,
      grouped,
      batch_identifier: batch_identifier || (grouped ? instance_code : null),
      initial_quantity,
      remaining_quantity: initial_quantity,
      status: 'in_stock',
      attribute_data
    });

    // Load with associations
    const batchWithDetails = await InventoryBatch.findByPk(batch.id, {
      include: [
        { model: Product, as: 'product' },
        { model: Branch, as: 'branch' },
        { model: Category, as: 'category' },
        { model: BatchType, as: 'batch_type' }
      ]
    });

    res.status(201).json({
      message: 'Inventory batch created successfully',
      batch: batchWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/batches
 * List inventory batches with filtering
 */
export const getBatches = async (req, res, next) => {
  try {
    const { product_id, branch_id, status, batch_type_id, category_id } = req.query;
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

    if (batch_type_id) {
      where.batch_type_id = batch_type_id;
    }

    if (category_id) {
      where.category_id = category_id;
    }

    const batches = await InventoryBatch.findAll({
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
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'unit_type', 'attribute_schema']
        },
        {
          model: BatchType,
          as: 'batch_type',
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ batches });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/batches/:id
 * Get inventory batch by ID
 */
export const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await InventoryBatch.findByPk(id, {
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
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'unit_type', 'attribute_schema']
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Branch access check
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      if (batch.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Unauthorized to view this batch' });
      }
    }

    res.json({ batch });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/inventory/batches/:id
 * Update inventory batch
 */
export const updateBatch = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      category_id,
      instance_code,
      batch_type_id,
      grouped,
      batch_identifier,
      attribute_data,
      status
    } = req.body;

    // Get the batch
    const batch = await InventoryBatch.findByPk(id, { transaction });
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Check permissions - user must have access to batch's branch
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== batch.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to update this batch' });
    }

    // Anti-Theft Check: Prevent updating if it would affect linked sales
    // Note: We allow updates to non-critical fields, but prevent quantity changes through this endpoint
    // Quantity changes should go through stock adjustment endpoint

    // Update fields
    if (category_id !== undefined) {
      if (category_id) {
        const category = await Category.findByPk(category_id, { transaction });
        const categoryAccessError = buildCategoryAccessError(req, category, batch.branch_id);
        if (categoryAccessError) {
          await transaction.rollback();
          return res.status(categoryAccessError.status).json({ error: categoryAccessError.message });
        }
      }
      batch.category_id = category_id;
    }

    if (instance_code !== undefined && batch.grouped) {
      // Check uniqueness if changing instance_code
      if (instance_code !== batch.instance_code) {
        const existingBatch = await InventoryBatch.findOne({
          where: { instance_code },
          transaction
        });
        if (existingBatch) {
          await transaction.rollback();
          return res.status(409).json({ error: 'Instance code already exists' });
        }
      }
      batch.instance_code = instance_code;
    }

    if (batch_type_id !== undefined) {
      // Verify batch type exists and is active
      const batchType = await BatchType.findByPk(batch_type_id);
      if (!batchType) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Batch type not found' });
      }
      if (!batchType.is_active) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cannot assign inactive batch type' });
      }

      // Validate batch type is assigned to category (if category exists)
      if (batch.category_id) {
        const assignment = await CategoryBatchType.findOne({
          where: { category_id: batch.category_id, batch_type_id },
          transaction
        });
        if (!assignment) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Batch type "${batchType.name}" is not assigned to this category. Please assign it in Batch Settings first.` 
          });
        }
      }

      batch.batch_type_id = batch_type_id;
    }

    if (grouped !== undefined) {
      batch.grouped = grouped;
      // If ungrouping, clear instance_code
      if (!grouped) {
        batch.instance_code = null;
      } else if (!batch.instance_code) {
        await transaction.rollback();
        return res.status(400).json({ error: 'instance_code is required when grouped is true' });
      }
    }

    if (batch_identifier !== undefined) {
      batch.batch_identifier = batch_identifier;
    }

    if (attribute_data !== undefined) {
      // Validate against category schema if category exists
      if (batch.category_id) {
        const category = await Category.findByPk(batch.category_id, { transaction });
        const categoryAccessError = buildCategoryAccessError(req, category, batch.branch_id);
        if (categoryAccessError) {
          await transaction.rollback();
          return res.status(categoryAccessError.status).json({ error: categoryAccessError.message });
        }
        if (category?.attribute_schema && Array.isArray(category.attribute_schema)) {
          const requiredAttrs = category.attribute_schema.filter(attr => attr.required);
          for (const attr of requiredAttrs) {
            if (!attribute_data[attr.name]) {
              await transaction.rollback();
              return res.status(400).json({ 
                error: `Required attribute '${attr.name}' is missing` 
              });
            }
          }
        }
      }
      batch.attribute_data = attribute_data;
    }

    if (status !== undefined) {
      batch.status = status;
    }

    await batch.save({ transaction });
    await transaction.commit();

    // Reload with associations
    const updatedBatch = await InventoryBatch.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: Branch, as: 'branch' },
        { model: Category, as: 'category' },
        { model: BatchType, as: 'batch_type' }
      ]
    });

    res.json({
      message: 'Inventory batch updated successfully',
      batch: updatedBatch
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/inventory/batches/:id
 * Delete inventory batch (with anti-theft checks)
 */
export const deleteBatch = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    // Get the batch
    const batch = await InventoryBatch.findByPk(id, { transaction });
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Check permissions
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== batch.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to delete this batch' });
    }

    // ANTI-THEFT CHECK: Prevent deletion if linked to SalesItems
    const linkedSalesItems = await SalesItem.count({
      where: { inventory_batch_id: id },
      transaction
    });
    
    if (linkedSalesItems > 0) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: 'Cannot delete batch: Linked to sales transactions. This prevents theft tracking. Archive the batch instead by setting status to "scrapped".' 
      });
    }

    // Check if batch has any ItemAssignments
    const linkedAssignments = await ItemAssignment.count({
      where: { inventory_batch_id: id },
      transaction
    });
    
    if (linkedAssignments > 0) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: 'Cannot delete batch: Has historical assignments. Archive the batch instead by setting status to "scrapped".' 
      });
    }

    // Safe to delete
    await batch.destroy({ transaction });
    await transaction.commit();

    res.json({
      message: 'Inventory batch deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/batches/available/:productId
 * Get available inventory batches for a specific product
 * Used in POS for batch selection
 */
export const getAvailableBatches = async (req, res, next) => {
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

    const batches = await InventoryBatch.findAll({
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
        },
        {
          model: BatchType,
          as: 'batch_type',
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['instance_code', 'ASC']]
    });

    res.json({ batches });
  } catch (error) {
    next(error);
  }
};

