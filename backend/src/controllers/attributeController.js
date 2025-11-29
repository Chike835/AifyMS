import { ProductBrand } from '../models/index.js';
import * as settingsImportExportService from '../services/settingsImportExportService.js';

// ============================================
// BRANDS
// ============================================

export const getAllBrands = async (req, res, next) => {
  try {
    const brands = await ProductBrand.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ brands });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const brand = await ProductBrand.create({ name: name.trim() });
    res.status(201).json({
      message: 'Brand created successfully',
      brand
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Brand name already exists' });
    }
    next(error);
  }
};

export const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const brand = await ProductBrand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    brand.name = name.trim();
    await brand.save();

    res.json({
      message: 'Brand updated successfully',
      brand
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Brand name already exists' });
    }
    next(error);
  }
};

export const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;

    const brand = await ProductBrand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Check if any products are using this brand
    const { Product } = await import('../models/index.js');
    const productsUsingBrand = await Product.count({
      where: { brand_id: id }
    });

    if (productsUsingBrand > 0) {
      return res.status(409).json({
        error: `Cannot delete brand. ${productsUsingBrand} product(s) are using this brand.`
      });
    }

    await brand.destroy();
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET ALL ATTRIBUTES (Combined)
// ============================================

export const getAllAttributes = async (req, res, next) => {
  try {
    const brands = await ProductBrand.findAll({ order: [['name', 'ASC']] });

    res.json({ brands });
  } catch (error) {
    next(error);
  }
};

// ============================================
// BRAND IMPORT/EXPORT
// ============================================

/**
 * POST /api/attributes/brands/import
 * Import brands from CSV/Excel file
 */
export const importBrands = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Transform row
    const transformRow = async (row, rowNum) => {
      return {
        name: row.name ? String(row.name).trim() : null
      };
    };

    // Validate row
    const validateRow = (row, rowNum) => {
      if (!row.name || String(row.name).trim() === '') {
        return 'Name is required';
      }
      return null;
    };

    const results = await settingsImportExportService.importFromCsv(
      ProductBrand,
      req.file.buffer,
      ['name'],
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
 * GET /api/attributes/brands/export
 * Export brands to CSV
 */
export const exportBrands = async (req, res, next) => {
  try {
    const csvContent = await settingsImportExportService.exportToCsv(
      ProductBrand,
      ['name'],
      {},
      {
        order: [['name', 'ASC']]
      }
    );

    const filename = `brands_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

