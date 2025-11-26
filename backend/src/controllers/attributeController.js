import { ProductBrand, ProductColor, ProductGauge } from '../models/index.js';
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
// COLORS
// ============================================

export const getAllColors = async (req, res, next) => {
  try {
    const colors = await ProductColor.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ colors });
  } catch (error) {
    next(error);
  }
};

export const createColor = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Color name is required' });
    }

    const color = await ProductColor.create({ name: name.trim() });
    res.status(201).json({
      message: 'Color created successfully',
      color
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Color name already exists' });
    }
    next(error);
  }
};

export const updateColor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Color name is required' });
    }

    const color = await ProductColor.findByPk(id);
    if (!color) {
      return res.status(404).json({ error: 'Color not found' });
    }

    color.name = name.trim();
    await color.save();

    res.json({
      message: 'Color updated successfully',
      color
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Color name already exists' });
    }
    next(error);
  }
};

export const deleteColor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const color = await ProductColor.findByPk(id);
    if (!color) {
      return res.status(404).json({ error: 'Color not found' });
    }

    const { Product } = await import('../models/index.js');
    const productsUsingColor = await Product.count({
      where: { color_id: id }
    });

    if (productsUsingColor > 0) {
      return res.status(409).json({
        error: `Cannot delete color. ${productsUsingColor} product(s) are using this color.`
      });
    }

    await color.destroy();
    res.json({ message: 'Color deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GAUGES
// ============================================

export const getAllGauges = async (req, res, next) => {
  try {
    const gauges = await ProductGauge.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ gauges });
  } catch (error) {
    next(error);
  }
};

export const createGauge = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Gauge name is required' });
    }

    const gauge = await ProductGauge.create({ name: name.trim() });
    res.status(201).json({
      message: 'Gauge created successfully',
      gauge
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Gauge name already exists' });
    }
    next(error);
  }
};

export const updateGauge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Gauge name is required' });
    }

    const gauge = await ProductGauge.findByPk(id);
    if (!gauge) {
      return res.status(404).json({ error: 'Gauge not found' });
    }

    gauge.name = name.trim();
    await gauge.save();

    res.json({
      message: 'Gauge updated successfully',
      gauge
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Gauge name already exists' });
    }
    next(error);
  }
};

export const deleteGauge = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gauge = await ProductGauge.findByPk(id);
    if (!gauge) {
      return res.status(404).json({ error: 'Gauge not found' });
    }

    const { Product } = await import('../models/index.js');
    const productsUsingGauge = await Product.count({
      where: { gauge_id: id }
    });

    if (productsUsingGauge > 0) {
      return res.status(409).json({
        error: `Cannot delete gauge. ${productsUsingGauge} product(s) are using this gauge.`
      });
    }

    await gauge.destroy();
    res.json({ message: 'Gauge deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET ALL ATTRIBUTES (Combined)
// ============================================

export const getAllAttributes = async (req, res, next) => {
  try {
    const [brands, colors, gauges] = await Promise.all([
      ProductBrand.findAll({ order: [['name', 'ASC']] }),
      ProductColor.findAll({ order: [['name', 'ASC']] }),
      ProductGauge.findAll({ order: [['name', 'ASC']] })
    ]);

    res.json({ brands, colors, gauges });
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

