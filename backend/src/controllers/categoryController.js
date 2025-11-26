import { Category } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * GET /api/categories
 * List all categories (hierarchical)
 */
export const getCategories = async (req, res, next) => {
  try {
    const { is_active, parent_id } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    if (parent_id !== undefined) {
      where.parent_id = parent_id === 'null' ? null : parent_id;
    }

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'is_active']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/categories/:id
 * Get single category with parent and children
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'is_active']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/categories
 * Create new category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, parent_id, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate parent_id if provided
    if (parent_id) {
      const parent = await Category.findByPk(parent_id);
      if (!parent) {
        return res.status(404).json({ error: 'Parent category not found' });
      }
    }

    const category = await Category.create({
      name,
      parent_id: parent_id || null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/categories/:id
 * Update category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description, is_active } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent circular reference (category cannot be its own parent)
    if (parent_id === id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    // Validate parent_id if provided
    if (parent_id) {
      const parent = await Category.findByPk(parent_id);
      if (!parent) {
        return res.status(404).json({ error: 'Parent category not found' });
      }
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      parent_id: parent_id !== undefined ? (parent_id || null) : category.parent_id,
      description: description !== undefined ? description : category.description,
      is_active: is_active !== undefined ? is_active : category.is_active
    });

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/categories/:id
 * Delete category
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const childrenCount = await Category.count({ where: { parent_id: id } });
    if (childrenCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that has subcategories. Please delete or move subcategories first.' 
      });
    }

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};







