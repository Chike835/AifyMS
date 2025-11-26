import { Unit } from '../models/index.js';
import { Op } from 'sequelize';

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







