import { Discount, Branch } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Helper to apply branch filtering
 */
const applyBranchFilter = (req, where) => {
  if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
    where.branch_id = req.user.branch_id;
  }
  return where;
};

/**
 * GET /api/discounts
 * List all discounts
 */
export const getDiscounts = async (req, res, next) => {
  try {
    const { active_only, valid_now } = req.query;
    const where = applyBranchFilter(req, {});

    if (active_only === 'true') {
      where.is_active = true;
    }

    if (valid_now === 'true') {
      const today = new Date().toISOString().split('T')[0];
      where[Op.or] = [
        { valid_from: null },
        { valid_from: { [Op.lte]: today } }
      ];
      where[Op.and] = [
        {
          [Op.or]: [
            { valid_until: null },
            { valid_until: { [Op.gte]: today } }
          ]
        }
      ];
    }

    const discounts = await Discount.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ discounts });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/discounts/:id
 * Get single discount
 */
export const getDiscountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = applyBranchFilter(req, { id });

    const discount = await Discount.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json({ discount });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/discounts
 * Create new discount
 */
export const createDiscount = async (req, res, next) => {
  try {
    const {
      name,
      discount_type,
      value,
      min_purchase_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      is_active,
      branch_id
    } = req.body;

    if (!name || !discount_type || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, discount_type, value'
      });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        error: 'discount_type must be "percentage" or "fixed"'
      });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'value must be greater than or equal to 0' });
    }

    if (discount_type === 'percentage' && value > 100) {
      return res.status(400).json({ error: 'Percentage value cannot exceed 100' });
    }

    // Super Admin can create discounts for any branch, others for their own branch
    let targetBranchId = branch_id;
    if (req.user?.role_name !== 'Super Admin') {
      targetBranchId = req.user.branch_id;
    }

    const discount = await Discount.create({
      name: name.trim(),
      discount_type,
      value: parseFloat(value),
      min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : 0,
      max_discount_amount: max_discount_amount ? parseFloat(max_discount_amount) : null,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      is_active: is_active !== undefined ? is_active : true,
      branch_id: targetBranchId
    });

    const discountWithBranch = await Discount.findByPk(discount.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.status(201).json({
      message: 'Discount created successfully',
      discount: discountWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/discounts/:id
 * Update discount
 */
export const updateDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      discount_type,
      value,
      min_purchase_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      is_active,
      branch_id
    } = req.body;

    const where = applyBranchFilter(req, { id });
    const discount = await Discount.findOne({ where });

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found or unauthorized' });
    }

    // Validation
    if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        error: 'discount_type must be "percentage" or "fixed"'
      });
    }

    if (value !== undefined && value < 0) {
      return res.status(400).json({ error: 'value must be greater than or equal to 0' });
    }

    if (discount_type === 'percentage' && value !== undefined && value > 100) {
      return res.status(400).json({ error: 'Percentage value cannot exceed 100' });
    }

    // Super Admin can change branch, others cannot
    let targetBranchId = discount.branch_id;
    if (req.user?.role_name === 'Super Admin' && branch_id !== undefined) {
      targetBranchId = branch_id;
    }

    // Update fields
    if (name !== undefined) discount.name = name.trim();
    if (discount_type !== undefined) discount.discount_type = discount_type;
    if (value !== undefined) discount.value = parseFloat(value);
    if (min_purchase_amount !== undefined) discount.min_purchase_amount = parseFloat(min_purchase_amount);
    if (max_discount_amount !== undefined) discount.max_discount_amount = max_discount_amount ? parseFloat(max_discount_amount) : null;
    if (valid_from !== undefined) discount.valid_from = valid_from || null;
    if (valid_until !== undefined) discount.valid_until = valid_until || null;
    if (is_active !== undefined) discount.is_active = is_active;
    if (targetBranchId !== undefined) discount.branch_id = targetBranchId;

    await discount.save();

    const discountWithBranch = await Discount.findByPk(discount.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.json({
      message: 'Discount updated successfully',
      discount: discountWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/discounts/:id
 * Delete discount
 */
export const deleteDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = applyBranchFilter(req, { id });
    const discount = await Discount.findOne({ where });

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found or unauthorized' });
    }

    await discount.destroy();

    res.json({
      message: 'Discount deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};


























