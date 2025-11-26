import { Warranty, Product } from '../models/index.js';
import { Op } from 'sequelize';
import * as settingsImportExportService from '../services/settingsImportExportService.js';

/**
 * GET /api/warranties
 * List all warranties
 */
export const getWarranties = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const warranties = await Warranty.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ warranties });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/warranties/:id
 * Get single warranty with product count
 */
export const getWarrantyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const warranty = await Warranty.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'sku', 'name']
        }
      ]
    });

    if (!warranty) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    res.json({ warranty });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/warranties
 * Create new warranty
 */
export const createWarranty = async (req, res, next) => {
  try {
    const { name, duration_months, description, is_active } = req.body;

    if (!name || duration_months === undefined) {
      return res.status(400).json({ error: 'Name and duration_months are required' });
    }

    if (duration_months < 0) {
      return res.status(400).json({ error: 'Duration must be a positive number' });
    }

    const warranty = await Warranty.create({
      name,
      duration_months,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      message: 'Warranty created successfully',
      warranty
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/warranties/:id
 * Update warranty
 */
export const updateWarranty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, duration_months, description, is_active } = req.body;

    const warranty = await Warranty.findByPk(id);
    if (!warranty) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    if (duration_months !== undefined && duration_months < 0) {
      return res.status(400).json({ error: 'Duration must be a positive number' });
    }

    await warranty.update({
      name: name !== undefined ? name : warranty.name,
      duration_months: duration_months !== undefined ? duration_months : warranty.duration_months,
      description: description !== undefined ? description : warranty.description,
      is_active: is_active !== undefined ? is_active : warranty.is_active
    });

    res.json({
      message: 'Warranty updated successfully',
      warranty
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/warranties/:id
 * Delete warranty
 */
export const deleteWarranty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const warranty = await Warranty.findByPk(id);
    if (!warranty) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    // Check if warranty is used by any products
    const productsCount = await Product.count({ where: { warranty_id: id } });
    if (productsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete warranty that is assigned to ${productsCount} product(s). Please remove warranty from products first.` 
      });
    }

    await warranty.destroy();

    res.json({ message: 'Warranty deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/warranties/import
 * Import warranties from CSV/Excel file
 */
export const importWarranties = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Transform row
    const transformRow = async (row, rowNum) => {
      const processedRow = {
        name: row.name ? String(row.name).trim() : null,
        duration_months: row.duration_months !== undefined && row.duration_months !== ''
          ? parseInt(row.duration_months, 10)
          : null,
        description: row.description ? String(row.description).trim() : null,
        is_active: row.is_active !== undefined
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true
      };

      return processedRow;
    };

    // Validate row
    const validateRow = (row, rowNum) => {
      if (!row.name || String(row.name).trim() === '') {
        return 'Name is required';
      }
      if (row.duration_months === undefined || row.duration_months === '') {
        return 'Duration (duration_months) is required';
      }
      const duration = parseInt(row.duration_months, 10);
      if (isNaN(duration) || duration < 0) {
        return 'Duration must be a non-negative integer';
      }
      return null;
    };

    const results = await settingsImportExportService.importFromCsv(
      Warranty,
      req.file.buffer,
      ['name'],
      {
        requiredFields: ['name', 'duration_months'],
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
 * GET /api/warranties/export
 * Export warranties to CSV
 */
export const exportWarranties = async (req, res, next) => {
  try {
    const csvContent = await settingsImportExportService.exportToCsv(
      Warranty,
      ['name', 'duration_months', 'description', 'is_active'],
      {},
      {
        order: [['name', 'ASC']]
      }
    );

    const filename = `warranties_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};







