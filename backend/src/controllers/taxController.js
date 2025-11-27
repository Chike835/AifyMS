import { TaxRate, Product } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * GET /api/tax-rates
 * List all tax rates
 */
export const getTaxRates = async (req, res, next) => {
  try {
    const { active_only } = req.query;
    const where = {};

    if (active_only === 'true') {
      where.is_active = true;
    }

    const taxRates = await TaxRate.findAll({
      where,
      order: [['is_default', 'DESC'], ['name', 'ASC']]
    });

    res.json({ tax_rates: taxRates });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tax-rates/:id
 * Get single tax rate
 */
export const getTaxRateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const taxRate = await TaxRate.findByPk(id);

    if (!taxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    res.json({ tax_rate: taxRate });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tax-rates
 * Create new tax rate
 */
export const createTaxRate = async (req, res, next) => {
  try {
    const { name, rate, is_compound, is_default, is_active } = req.body;

    // Validation
    if (!name || rate === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, rate' 
      });
    }

    if (rate < 0 || rate > 100) {
      return res.status(400).json({ 
        error: 'Rate must be between 0 and 100' 
      });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await TaxRate.update(
        { is_default: false },
        { where: { is_default: true } }
      );
    }

    const taxRate = await TaxRate.create({
      name: name.trim(),
      rate: parseFloat(rate),
      is_compound: is_compound || false,
      is_default: is_default || false,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      message: 'Tax rate created successfully',
      tax_rate: taxRate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tax-rates/:id
 * Update tax rate
 */
export const updateTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, rate, is_compound, is_default, is_active } = req.body;

    const taxRate = await TaxRate.findByPk(id);

    if (!taxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    // Validation
    if (rate !== undefined && (rate < 0 || rate > 100)) {
      return res.status(400).json({ 
        error: 'Rate must be between 0 and 100' 
      });
    }

    // If setting as default, unset other defaults
    if (is_default && !taxRate.is_default) {
      await TaxRate.update(
        { is_default: false },
        { where: { is_default: true, id: { [Op.ne]: id } } }
      );
    }

    // Update fields
    if (name !== undefined) taxRate.name = name.trim();
    if (rate !== undefined) taxRate.rate = parseFloat(rate);
    if (is_compound !== undefined) taxRate.is_compound = is_compound;
    if (is_default !== undefined) taxRate.is_default = is_default;
    if (is_active !== undefined) taxRate.is_active = is_active;

    await taxRate.save();

    res.json({
      message: 'Tax rate updated successfully',
      tax_rate: taxRate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tax-rates/:id
 * Delete tax rate (soft delete by setting is_active = false)
 */
export const deleteTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const taxRate = await TaxRate.findByPk(id);

    if (!taxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    // Check if it's the default tax rate
    if (taxRate.is_default) {
      return res.status(400).json({ 
        error: 'Cannot delete the default tax rate. Set another as default first.' 
      });
    }

    // Check if any products are using this tax rate
    const productCount = await Product.count({
      where: { tax_rate_id: id }
    });

    if (productCount > 0) {
      // Soft delete by setting is_active = false
      taxRate.is_active = false;
      await taxRate.save();
      
      return res.json({
        message: 'Tax rate deactivated (products are still using it)',
        tax_rate: taxRate
      });
    }

    // Hard delete if no products are using it
    await taxRate.destroy();

    res.json({
      message: 'Tax rate deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};









