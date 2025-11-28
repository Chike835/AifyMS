import { ProductVariation, ProductVariationValue } from '../models/index.js';
import { Op } from 'sequelize';
import * as settingsImportExportService from '../services/settingsImportExportService.js';
import XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * GET /api/variations
 * List all product variations with their values
 */
export const getVariations = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const variations = await ProductVariation.findAll({
      where,
      include: [
        {
          model: ProductVariationValue,
          as: 'values',
          order: [['display_order', 'ASC']]
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ variations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/variations/:id
 * Get single variation with values
 */
export const getVariationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const variation = await ProductVariation.findByPk(id, {
      include: [
        {
          model: ProductVariationValue,
          as: 'values',
          order: [['display_order', 'ASC']]
        }
      ]
    });

    if (!variation) {
      return res.status(404).json({ error: 'Variation not found' });
    }

    res.json({ variation });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/variations
 * Create new variation
 */
export const createVariation = async (req, res, next) => {
  try {
    const { name, description, is_active, values } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const variation = await ProductVariation.create({
      name,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true
    });

    // Create values if provided
    if (values && Array.isArray(values) && values.length > 0) {
      const variationValues = values.map((val, index) => ({
        variation_id: variation.id,
        value: val.value || val,
        display_order: val.display_order !== undefined ? val.display_order : index
      }));

      await ProductVariationValue.bulkCreate(variationValues);
    }

    // Fetch with values
    const variationWithValues = await ProductVariation.findByPk(variation.id, {
      include: [
        {
          model: ProductVariationValue,
          as: 'values',
          order: [['display_order', 'ASC']]
        }
      ]
    });

    res.status(201).json({
      message: 'Variation created successfully',
      variation: variationWithValues
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/variations/:id
 * Update variation
 */
export const updateVariation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, values } = req.body;

    const variation = await ProductVariation.findByPk(id);
    if (!variation) {
      return res.status(404).json({ error: 'Variation not found' });
    }

    // Update variation
    await variation.update({
      name: name !== undefined ? name : variation.name,
      description: description !== undefined ? description : variation.description,
      is_active: is_active !== undefined ? is_active : variation.is_active
    });

    // Update values if provided
    if (values && Array.isArray(values)) {
      // Delete existing values
      await ProductVariationValue.destroy({ where: { variation_id: id } });

      // Create new values
      if (values.length > 0) {
        const variationValues = values.map((val, index) => ({
          variation_id: id,
          value: val.value || val,
          display_order: val.display_order !== undefined ? val.display_order : index
        }));

        await ProductVariationValue.bulkCreate(variationValues);
      }
    }

    // Fetch updated variation with values
    const updatedVariation = await ProductVariation.findByPk(id, {
      include: [
        {
          model: ProductVariationValue,
          as: 'values',
          order: [['display_order', 'ASC']]
        }
      ]
    });

    res.json({
      message: 'Variation updated successfully',
      variation: updatedVariation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/variations/:id
 * Delete variation (cascades to values)
 */
export const deleteVariation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const variation = await ProductVariation.findByPk(id);
    if (!variation) {
      return res.status(404).json({ error: 'Variation not found' });
    }

    await variation.destroy();

    res.json({ message: 'Variation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/variations/import
 * Import variations from CSV/Excel file
 */
export const importVariations = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Transform row to handle values
    const transformRow = async (row, rowNum) => {
      const processedRow = {
        name: row.name ? String(row.name).trim() : null,
        description: row.description ? String(row.description).trim() : null,
        is_active: row.is_active !== undefined
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true
      };

      // Store values for later processing
      processedRow._values = row.values 
        ? String(row.values).split(/[,|;]/).map(v => v.trim()).filter(v => v !== '')
        : [];

      return processedRow;
    };

    // Validate row
    const validateRow = (row, rowNum) => {
      if (!row.name || String(row.name).trim() === '') {
        return 'Name is required';
      }
      return null;
    };

    // Handle creation of variation values
    const afterCreate = async (record, row, rowNum) => {
      const values = row.values 
        ? String(row.values).split(/[,|;]/).map(v => v.trim()).filter(v => v !== '')
        : [];
      
      if (values.length > 0) {
        // Verify if values already exist for this variation to avoid duplicates (if updated)
        // For now, we just create new ones as per original logic
        const variationValues = values.map((val, index) => ({
          variation_id: record.id,
          value: val,
          display_order: index
        }));
        await ProductVariationValue.bulkCreate(variationValues);
      }
    };

    const results = await settingsImportExportService.importFromCsv(
      ProductVariation,
      req.file.buffer,
      ['name'],
      {
        requiredFields: ['name'],
        transformRow,
        validateRow,
        afterCreate,
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
 * GET /api/variations/export
 * Export variations to CSV
 */
export const exportVariations = async (req, res, next) => {
  try {
    const variations = await ProductVariation.findAll({
      include: [
        {
          model: ProductVariationValue,
          as: 'values',
          attributes: ['value'],
          order: [['display_order', 'ASC']],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    // Convert to CSV format
    const headers = ['name', 'description', 'values', 'is_active'];
    const csvRows = [headers.join(',')];

    for (const variation of variations) {
      const values = variation.values 
        ? variation.values.map(v => v.value).join(',')
        : '';
      const row = [
        `"${(variation.name || '').replace(/"/g, '""')}"`,
        `"${(variation.description || '').replace(/"/g, '""')}"`,
        `"${values.replace(/"/g, '""')}"`,
        variation.is_active ? 'true' : 'false'
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const filename = `variations_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};







