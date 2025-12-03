import { Category, Branch } from '../models/index.js';
import { Op } from 'sequelize';
import * as settingsImportExportService from '../services/settingsImportExportService.js';

const isSuperAdmin = (req) => req.user?.role_name === 'Super Admin';

const shouldIncludeGlobal = (flag) => flag !== 'false';

const buildCategoryBranchWhere = (req, options = {}) => {
  const includeGlobalOverride = options.includeGlobal;
  const branchIdOverride = options.branchId;
  const includeGlobal = typeof includeGlobalOverride === 'boolean'
    ? includeGlobalOverride
    : shouldIncludeGlobal(req.query?.include_global ?? 'true');
  const requestedBranchId = branchIdOverride ?? req.query?.branch_id ?? null;

  if (isSuperAdmin(req)) {
    if (!requestedBranchId) {
      return includeGlobal ? {} : { branch_id: null };
    }
    if (includeGlobal) {
      return {
        [Op.or]: [
          { branch_id: requestedBranchId },
          { branch_id: null }
        ]
      };
    }
    return { branch_id: requestedBranchId };
  }

  const userBranchId = req.user?.branch_id;
  if (!userBranchId) {
    return { branch_id: null };
  }

  if (includeGlobal) {
    return {
      [Op.or]: [
        { branch_id: userBranchId },
        { branch_id: null }
      ]
    };
  }

  return { branch_id: userBranchId };
};

const canAccessCategory = (req, category) => {
  if (!category) return false;
  if (isSuperAdmin(req)) return true;
  if (!category.branch_id) return true;
  return category.branch_id === req.user?.branch_id;
};

const validateParentCategory = (req, parent, targetBranchId) => {
  if (!parent) {
    return { status: 404, message: 'Parent category not found' };
  }
  if (!canAccessCategory(req, parent)) {
    return { status: 403, message: 'You do not have access to the selected parent category' };
  }
  if (parent.branch_id && targetBranchId && parent.branch_id !== targetBranchId) {
    return { status: 400, message: 'Parent category must belong to the same branch' };
  }
  if (!targetBranchId && parent.branch_id) {
    return { status: 400, message: 'Global categories cannot have branch-specific parents' };
  }
  return null;
};

const resolveTargetBranch = async (req, requestedBranchId) => {
  if (isSuperAdmin(req)) {
    if (!requestedBranchId || requestedBranchId === 'null') {
      return { branchId: null };
    }
    const branch = await Branch.findByPk(requestedBranchId);
    if (!branch) {
      return { error: 'Specified branch not found' };
    }
    return { branchId: requestedBranchId };
  }

  if (!req.user?.branch_id) {
    return { error: 'User is not assigned to a branch' };
  }

  return { branchId: req.user.branch_id };
};

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

    const branchWhere = buildCategoryBranchWhere(req);
    if (branchWhere && Object.keys(branchWhere).length > 0) {
      Object.assign(where, branchWhere);
    }

    const includeBranchWhere = buildCategoryBranchWhere(req);
    const includeWhere = includeBranchWhere && Object.keys(includeBranchWhere).length > 0
      ? includeBranchWhere
      : undefined;

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'branch_id'],
          where: includeWhere,
          required: false
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'is_active', 'branch_id'],
          where: includeWhere,
          required: false
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

    const includeBranchWhere = buildCategoryBranchWhere(req);
    const includeWhere = includeBranchWhere && Object.keys(includeBranchWhere).length > 0
      ? includeBranchWhere
      : undefined;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'branch_id'],
          where: includeWhere,
          required: false
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'is_active', 'branch_id'],
          where: includeWhere,
          required: false
        }
      ]
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (!canAccessCategory(req, category)) {
      return res.status(403).json({ error: 'You do not have access to this category' });
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
    const { name, parent_id, description, is_active, branch_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { branchId: targetBranchId, error: branchError } = await resolveTargetBranch(req, branch_id);
    if (branchError) {
      return res.status(400).json({ error: branchError });
    }
    if (!isSuperAdmin(req) && !targetBranchId) {
      return res.status(400).json({ error: 'Branch ID is required for this action' });
    }

    // Validate parent_id if provided
    if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
      const parent = await Category.findByPk(parent_id);
      const parentValidationError = validateParentCategory(req, parent, targetBranchId);
      if (parentValidationError) {
        return res.status(parentValidationError.status).json({ error: parentValidationError.message });
      }
    }

    const category = await Category.create({
      name,
      parent_id: parent_id || null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true,
      branch_id: targetBranchId
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
    const { name, parent_id, description, is_active, branch_id } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (!canAccessCategory(req, category)) {
      return res.status(403).json({ error: 'You do not have permission to modify this category' });
    }

    if (!isSuperAdmin(req) && !category.branch_id) {
      return res.status(403).json({ error: 'Only Super Admin can modify global categories' });
    }

    // Prevent circular reference (category cannot be its own parent)
    if (parent_id === id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    // Validate parent_id if provided
    let targetBranchId = category.branch_id;
    if (isSuperAdmin(req) && branch_id !== undefined) {
      if (!branch_id || branch_id === 'null') {
        targetBranchId = null;
      } else {
        const branch = await Branch.findByPk(branch_id);
        if (!branch) {
          return res.status(404).json({ error: 'Specified branch not found' });
        }
        targetBranchId = branch_id;
      }
    }

    if (!isSuperAdmin(req) && !targetBranchId) {
      return res.status(403).json({ error: 'You cannot assign this category to a different branch' });
    }

    if (parent_id) {
      const parent = await Category.findByPk(parent_id);
      const parentValidationError = validateParentCategory(req, parent, targetBranchId);
      if (parentValidationError) {
        return res.status(parentValidationError.status).json({ error: parentValidationError.message });
      }
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      parent_id: parent_id !== undefined ? (parent_id || null) : category.parent_id,
      description: description !== undefined ? description : category.description,
      is_active: is_active !== undefined ? is_active : category.is_active,
      branch_id: targetBranchId
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

    if (!canAccessCategory(req, category)) {
      return res.status(403).json({ error: 'You do not have permission to delete this category' });
    }

    if (!isSuperAdmin(req) && !category.branch_id) {
      return res.status(403).json({ error: 'Only Super Admin can delete global categories' });
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

    const { branchId: targetBranchId, error: branchError } = await resolveTargetBranch(req, req.body?.branch_id);
    if (branchError) {
      return res.status(400).json({ error: branchError });
    }
    if (!isSuperAdmin(req) && !targetBranchId) {
      return res.status(400).json({ error: 'Branch ID is required for this action' });
    }

    // Transform row to handle parent_id lookup by name
    const transformRow = async (row, rowNum) => {
      const processedRow = {
        name: row.name ? String(row.name).trim() : null,
        description: row.description ? String(row.description).trim() : null,
        is_active: row.is_active !== undefined 
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true,
        parent_id: null,
        branch_id: targetBranchId
      };

      // Handle parent_id - can be UUID or parent category name
      if (row.parent_id && String(row.parent_id).trim() !== '') {
        const parentValue = String(row.parent_id).trim();
        
        // Check if it's a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(parentValue)) {
          const parent = await Category.findByPk(parentValue);
          const validation = validateParentCategory(req, parent, targetBranchId);
          if (validation) {
            throw new Error(validation.message);
          }
          processedRow.parent_id = parentValue;
        } else {
          const branchConditions = targetBranchId
            ? [{ branch_id: targetBranchId }, { branch_id: null }]
            : [{ branch_id: null }];

          const parentMatches = await Category.findAll({
            where: {
              name: parentValue,
              [Op.or]: branchConditions
            },
            attributes: ['id', 'name', 'branch_id', 'parent_id']
          });

          if (parentMatches.length === 0) {
            throw new Error(`Parent category with name "${parentValue}" not found`);
          }

          if (parentMatches.length > 1) {
            const branchSpecific = parentMatches.find(cat => cat.branch_id === targetBranchId);
            const globalParent = parentMatches.find(cat => cat.branch_id === null);
            const resolvedParent = branchSpecific || globalParent;

            if (!resolvedParent) {
              throw new Error(
                `Multiple categories found with name "${parentValue}". Please use the category UUID instead.`
              );
            }

            const validation = validateParentCategory(req, resolvedParent, targetBranchId);
            if (validation) {
              throw new Error(validation.message);
            }
            processedRow.parent_id = resolvedParent.id;
          } else {
            const [parent] = parentMatches;
            const validation = validateParentCategory(req, parent, targetBranchId);
            if (validation) {
              throw new Error(validation.message);
            }
            processedRow.parent_id = parent.id;
          }
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
      ['name', 'branch_id'],
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
    const exportWhere = buildCategoryBranchWhere(req, {
      includeGlobal: shouldIncludeGlobal(req.query?.include_global ?? 'true'),
      branchId: req.query?.branch_id ?? (isSuperAdmin(req) ? null : req.user?.branch_id)
    });
    const whereClause = exportWhere && Object.keys(exportWhere).length > 0 ? exportWhere : {};

    const csvContent = await settingsImportExportService.exportToCsv(
      Category,
      ['name', 'parent_id', 'description', 'is_active'],
      whereClause,
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
            is_active: row.is_active ? 'true' : 'false',
            branch_id: row.branch_id || ''
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







