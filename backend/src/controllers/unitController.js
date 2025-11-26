import { Unit } from '../models/index.js';
import { Op } from 'sequelize';
import * as settingsImportExportService from '../services/settingsImportExportService.js';

/**
 * GET /api/units
 * List all units
 */
export const getUnits = async (req, res, next) => {
  try {
    const { is_active, is_base_unit } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    if (is_base_unit !== undefined) {
      where.is_base_unit = is_base_unit === 'true';
    }

    const units = await Unit.findAll({
      where,
      include: [
        {
          model: Unit,
          as: 'base_unit',
          attributes: ['id', 'name', 'abbreviation']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ units });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/units/:id
 * Get single unit
 */
export const getUnitById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findByPk(id, {
      include: [
        {
          model: Unit,
          as: 'base_unit',
          attributes: ['id', 'name', 'abbreviation']
        },
        {
          model: Unit,
          as: 'derived_units',
          attributes: ['id', 'name', 'abbreviation', 'conversion_factor']
        }
      ]
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json({ unit });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/units
 * Create new unit
 */
export const createUnit = async (req, res, next) => {
  try {
    const { name, abbreviation, base_unit_id, conversion_factor, is_base_unit, is_active } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({ error: 'Name and abbreviation are required' });
    }

    // Check if name or abbreviation already exists
    const existing = await Unit.findOne({
      where: {
        [Op.or]: [
          { name },
          { abbreviation }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Unit with this name or abbreviation already exists' });
    }

    const unit = await Unit.create({
      name,
      abbreviation,
      base_unit_id: base_unit_id || null,
      conversion_factor: conversion_factor || 1,
      is_base_unit: is_base_unit || false,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      message: 'Unit created successfully',
      unit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/units/:id
 * Update unit
 */
export const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, base_unit_id, conversion_factor, is_base_unit, is_active } = req.body;

    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Check for duplicate name/abbreviation (excluding current unit)
    if (name || abbreviation) {
      const existing = await Unit.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            name ? { name } : {},
            abbreviation ? { abbreviation } : {}
          ]
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'Unit with this name or abbreviation already exists' });
      }
    }

    await unit.update({
      name: name !== undefined ? name : unit.name,
      abbreviation: abbreviation !== undefined ? abbreviation : unit.abbreviation,
      base_unit_id: base_unit_id !== undefined ? base_unit_id : unit.base_unit_id,
      conversion_factor: conversion_factor !== undefined ? conversion_factor : unit.conversion_factor,
      is_base_unit: is_base_unit !== undefined ? is_base_unit : unit.is_base_unit,
      is_active: is_active !== undefined ? is_active : unit.is_active
    });

    res.json({
      message: 'Unit updated successfully',
      unit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/units/:id
 * Delete unit
 */
export const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Check if unit is used as base_unit
    const derivedUnits = await Unit.count({ where: { base_unit_id: id } });
    if (derivedUnits > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete unit that is used as base unit for other units' 
      });
    }

    await unit.destroy();

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/units/import
 * Import units from CSV/Excel file
 */
export const importUnits = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Transform row to handle base_unit_id lookup by name
    const transformRow = async (row, rowNum) => {
      const processedRow = {
        name: row.name ? String(row.name).trim() : null,
        abbreviation: row.abbreviation ? String(row.abbreviation).trim() : null,
        conversion_factor: row.conversion_factor 
          ? parseFloat(row.conversion_factor) 
          : 1,
        is_base_unit: row.is_base_unit !== undefined
          ? (String(row.is_base_unit).toLowerCase() === 'true' || row.is_base_unit === '1' || row.is_base_unit === 1)
          : false,
        is_active: row.is_active !== undefined
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true,
        base_unit_id: null
      };

      // Handle base_unit_id - can be UUID or base unit name
      if (!processedRow.is_base_unit && row.base_unit_id && String(row.base_unit_id).trim() !== '') {
        const baseUnitValue = String(row.base_unit_id).trim();
        
        // Check if it's a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(baseUnitValue)) {
          // It's a UUID, validate it exists
          const baseUnit = await Unit.findByPk(baseUnitValue);
          if (!baseUnit) {
            throw new Error(`Base unit with ID "${baseUnitValue}" not found`);
          }
          processedRow.base_unit_id = baseUnitValue;
        } else {
          // It's a name, look it up
          const baseUnit = await Unit.findOne({ 
            where: { name: baseUnitValue } 
          });
          if (!baseUnit) {
            throw new Error(`Base unit with name "${baseUnitValue}" not found`);
          }
          processedRow.base_unit_id = baseUnit.id;
        }
      }

      // If is_base_unit is true, set base_unit_id to null
      if (processedRow.is_base_unit) {
        processedRow.base_unit_id = null;
      }

      return processedRow;
    };

    // Validate row
    const validateRow = (row, rowNum) => {
      if (!row.name || String(row.name).trim() === '') {
        return 'Name is required';
      }
      if (!row.abbreviation || String(row.abbreviation).trim() === '') {
        return 'Abbreviation is required';
      }
      if (row.conversion_factor !== undefined && row.conversion_factor !== '') {
        const factor = parseFloat(row.conversion_factor);
        if (isNaN(factor) || factor <= 0) {
          return 'Conversion factor must be a positive number';
        }
      }
      return null;
    };

    // Custom duplicate check for units (check both name and abbreviation)
    const results = await settingsImportExportService.importFromCsv(
      Unit,
      req.file.buffer,
      ['name', 'abbreviation'], // Check both fields for uniqueness
      {
        requiredFields: ['name', 'abbreviation'],
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
 * GET /api/units/export
 * Export units to CSV
 */
export const exportUnits = async (req, res, next) => {
  try {
    const csvContent = await settingsImportExportService.exportToCsv(
      Unit,
      ['name', 'abbreviation', 'base_unit_id', 'conversion_factor', 'is_base_unit', 'is_active'],
      {},
      {
        include: [
          {
            model: Unit,
            as: 'base_unit',
            attributes: ['id', 'name', 'abbreviation'],
            required: false
          }
        ],
        transformRow: (row, record) => {
          return {
            name: row.name,
            abbreviation: row.abbreviation,
            base_unit_name: record.base_unit ? record.base_unit.name : '',
            base_unit_id: row.base_unit_id || '',
            conversion_factor: row.conversion_factor || '1',
            is_base_unit: row.is_base_unit ? 'true' : 'false',
            is_active: row.is_active ? 'true' : 'false'
          };
        },
        order: [['name', 'ASC']]
      }
    );

    const filename = `units_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};







