import { BatchType, Category, CategoryBatchType, InventoryBatch, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * GET /api/settings/batches/types
 * Get all batch types (active only by default)
 */
export const getAllTypes = async (req, res, next) => {
  try {
    const { include_inactive = 'false' } = req.query;
    const where = {};

    if (include_inactive !== 'true') {
      where.is_active = true;
    }

    const batchTypes = await BatchType.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ batch_types: batchTypes });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/batches/types
 * Create a new batch type
 */
export const createType = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Batch type name is required' });
    }

    // Check if name already exists
    const existing = await BatchType.findOne({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(409).json({ error: 'Batch type with this name already exists' });
    }

    const batchType = await BatchType.create({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: req.user.id,
      is_active: true
    });

    // Load with creator
    const batchTypeWithCreator = await BatchType.findByPk(batchType.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Batch type created successfully',
      batch_type: batchTypeWithCreator
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings/batches/types/:id
 * Update a batch type
 */
export const updateType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const batchType = await BatchType.findByPk(id);
    if (!batchType) {
      return res.status(404).json({ error: 'Batch type not found' });
    }

    // Check name uniqueness if changing
    if (name && name.trim() !== batchType.name) {
      const existing = await BatchType.findOne({
        where: { name: name.trim(), id: { [Op.ne]: id } }
      });

      if (existing) {
        return res.status(409).json({ error: 'Batch type with this name already exists' });
      }
      batchType.name = name.trim();
    }

    if (description !== undefined) {
      batchType.description = description?.trim() || null;
    }

    if (is_active !== undefined) {
      // Prevent deactivating if used in active batches
      if (is_active === false) {
        const activeBatches = await InventoryBatch.count({
          where: { batch_type_id: id, status: 'in_stock' }
        });

        if (activeBatches > 0) {
          return res.status(400).json({
            error: `Cannot deactivate batch type: ${activeBatches} active inventory batch(es) are using it`
          });
        }
      }
      batchType.is_active = is_active;
    }

    await batchType.save();

    // Reload with creator
    const updatedBatchType = await BatchType.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Batch type updated successfully',
      batch_type: updatedBatchType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/settings/batches/types/:id
 * Delete a batch type (soft delete if used, hard delete if not)
 */
export const deleteType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batchType = await BatchType.findByPk(id);
    if (!batchType) {
      return res.status(404).json({ error: 'Batch type not found' });
    }

    // Check if used in any inventory batches
    const batchesCount = await InventoryBatch.count({
      where: { batch_type_id: id }
    });

    if (batchesCount > 0) {
      // Soft delete: set is_active = false
      batchType.is_active = false;
      await batchType.save();
      return res.json({
        message: 'Batch type deactivated (soft delete) because it is in use',
        batch_type: batchType
      });
    }

    // Hard delete: remove from category assignments first
    await CategoryBatchType.destroy({
      where: { batch_type_id: id }
    });

    // Then delete the batch type
    await batchType.destroy();

    res.json({
      message: 'Batch type deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/settings/batches/types/category/:categoryId
 * Get valid batch types for a specific category
 * Used by "Add Product" page to filter dropdown options
 */
export const getTypesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get batch types assigned to this category
    const batchTypes = await BatchType.findAll({
      include: [
        {
          model: Category,
          as: 'categories',
          where: { id: categoryId },
          attributes: [],
          through: { attributes: [] }
        }
      ],
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    res.json({ batch_types: batchTypes });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/batches/assignments
 * Assign a batch type to a category
 */
export const assignTypeToCategory = async (req, res, next) => {
  try {
    const { category_id, batch_type_id } = req.body;

    if (!category_id || !batch_type_id) {
      return res.status(400).json({ error: 'category_id and batch_type_id are required' });
    }

    // Verify category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Verify batch type exists and is active
    const batchType = await BatchType.findByPk(batch_type_id);
    if (!batchType) {
      return res.status(404).json({ error: 'Batch type not found' });
    }

    if (!batchType.is_active) {
      return res.status(400).json({ error: 'Cannot assign inactive batch type to category' });
    }

    // Check if assignment already exists
    const existing = await CategoryBatchType.findOne({
      where: { category_id, batch_type_id }
    });

    if (existing) {
      return res.status(409).json({ error: 'This batch type is already assigned to this category' });
    }

    // Create assignment
    await CategoryBatchType.create({
      category_id,
      batch_type_id
    });

    res.status(201).json({
      message: 'Batch type assigned to category successfully',
      assignment: {
        category_id,
        batch_type_id,
        category: category.name,
        batch_type: batchType.name
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/settings/batches/assignments
 * Remove a batch type from a category
 * Query params: category_id, batch_type_id
 */
export const removeTypeFromCategory = async (req, res, next) => {
  try {
    const { category_id, batch_type_id } = req.query;

    if (!category_id || !batch_type_id) {
      return res.status(400).json({ error: 'category_id and batch_type_id query parameters are required' });
    }

    const assignment = await CategoryBatchType.findOne({
      where: { category_id, batch_type_id }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if any inventory batches are using this batch type for this category
    const batchesCount = await InventoryBatch.count({
      where: {
        category_id,
        batch_type_id
      }
    });

    if (batchesCount > 0) {
      return res.status(400).json({
        error: `Cannot remove assignment: ${batchesCount} inventory batch(es) are using this batch type for this category`
      });
    }

    await assignment.destroy();

    res.json({
      message: 'Batch type removed from category successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/settings/batches/assignments
 * Get all category-batch type assignments
 * Optional query param: category_id (filter by category)
 */
export const getCategoryAssignments = async (req, res, next) => {
  try {
    const { category_id } = req.query;
    const where = {};

    if (category_id) {
      where.category_id = category_id;
    }

    const assignments = await CategoryBatchType.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: BatchType,
          as: 'batch_type',
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['category_id', 'ASC'], ['batch_type_id', 'ASC']]
    });

    // Group by category for easier frontend consumption
    const grouped = {};
    assignments.forEach(assignment => {
      const catId = assignment.category_id;
      if (!grouped[catId]) {
        grouped[catId] = {
          category: assignment.category,
          batch_types: []
        };
      }
      grouped[catId].batch_types.push(assignment.batch_type);
    });

    res.json({
      assignments: Object.values(grouped),
      raw_assignments: assignments
    });
  } catch (error) {
    next(error);
  }
};


