import { Category } from '../models/index.js';
import { Op } from 'sequelize';
import * as settingsImportExportService from '../services/settingsImportExportService.js';

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

/**
 * POST /api/categories/import
 * Import categories from CSV/Excel file
 */
export const importCategories = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Transform row to handle parent_id lookup by name
    const transformRow = async (row, rowNum) => {
      const processedRow = {
        name: row.name ? String(row.name).trim() : null,
        description: row.description ? String(row.description).trim() : null,
        is_active: row.is_active !== undefined 
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true,
        parent_id: null
      };

      // Handle parent_id - can be UUID or parent category name
      if (row.parent_id && String(row.parent_id).trim() !== '') {
        const parentValue = String(row.parent_id).trim();
        
        // Check if it's a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(parentValue)) {
          // It's a UUID, validate it exists
          const parent = await Category.findByPk(parentValue);
          if (!parent) {
            throw new Error(`Parent category with ID "${parentValue}" not found`);
          }
          processedRow.parent_id = parentValue;
        } else {
          // It's a name, look it up
          // Prefer top-level categories (parent_id IS NULL) to avoid ambiguity
          // If multiple categories have the same name, prefer the one without a parent
          let parent = await Category.findOne({ 
            where: { 
              name: parentValue,
              parent_id: null  // Prefer top-level categories
            } 
          });
          
          // If no top-level category found, try any category with that name
          if (!parent) {
            const allMatches = await Category.findAll({ 
              where: { name: parentValue },
              attributes: ['id', 'name', 'parent_id']
            });
            
            if (allMatches.length === 0) {
              throw new Error(`Parent category with name "${parentValue}" not found`);
            } else if (allMatches.length === 1) {
              parent = allMatches[0];
            } else {
              // Multiple categories with same name - require UUID for disambiguation
              throw new Error(
                `Multiple categories found with name "${parentValue}". ` +
                `Please use the category UUID instead. Found IDs: ${allMatches.map(c => c.id).join(', ')}`
              );
            }
          }
          
          processedRow.parent_id = parent.id;
        }
      }

      return processedRow;
    };

    // Validate row
    const validateRow = (row, rowNum) => {
      if (!row.name || String(row.name).trim() === '') {
        return 'Name is required';
      }
      return null;
    };

    const results = await settingsImportExportService.importFromCsv(
      Category,
      req.file.buffer,
      ['name'], // Unique on name (though parent_id can make same name valid)
      {
        requiredFields: ['name'],
        transformRow,
        validateRow,
        updateOnDuplicate: false
      }
    );

    res.json({
      message: 'Import completed',
      results: {
        ...results,
        total: results.created + results.updated + results.skipped
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/categories/export
 * Export categories to CSV
 */
export const exportCategories = async (req, res, next) => {
  try {
    const csvContent = await settingsImportExportService.exportToCsv(
      Category,
      ['name', 'parent_id', 'description', 'is_active'],
      {},
      {
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        transformRow: (row, record) => {
          // Include parent name if available
          return {
            name: row.name,
            parent_name: record.parent ? record.parent.name : '',
            parent_id: row.parent_id || '',
            description: row.description || '',
            is_active: row.is_active ? 'true' : 'false'
          };
        },
        order: [['name', 'ASC']]
      }
    );

    const filename = `categories_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};







