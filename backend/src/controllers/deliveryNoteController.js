import { DeliveryNoteTemplate, Branch } from '../models/index.js';
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
 * GET /api/delivery-notes/templates
 * List all delivery note templates
 */
export const getTemplates = async (req, res, next) => {
  try {
    const where = applyBranchFilter(req, {});

    const templates = await DeliveryNoteTemplate.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
      order: [['is_default', 'DESC'], ['name', 'ASC']]
    });

    res.json({ templates });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-notes/templates/:id
 * Get single template
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = applyBranchFilter(req, { id });

    const template = await DeliveryNoteTemplate.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/delivery-notes/templates
 * Create new template
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { name, template_content, is_default, branch_id } = req.body;

    if (!name || !template_content) {
      return res.status(400).json({
        error: 'Missing required fields: name, template_content'
      });
    }

    // Super Admin can create templates for any branch, others for their own branch
    let targetBranchId = branch_id;
    if (req.user?.role_name !== 'Super Admin') {
      targetBranchId = req.user.branch_id;
    }

    // If setting as default, unset other defaults
    if (is_default) {
      const unsetWhere = applyBranchFilter(req, {});
      await DeliveryNoteTemplate.update(
        { is_default: false },
        { where: unsetWhere }
      );
    }

    const template = await DeliveryNoteTemplate.create({
      name: name.trim(),
      template_content: template_content.trim(),
      is_default: is_default || false,
      branch_id: targetBranchId
    });

    const templateWithBranch = await DeliveryNoteTemplate.findByPk(template.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.status(201).json({
      message: 'Template created successfully',
      template: templateWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/delivery-notes/templates/:id
 * Update template
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, template_content, is_default, branch_id } = req.body;

    const where = applyBranchFilter(req, { id });
    const template = await DeliveryNoteTemplate.findOne({ where });

    if (!template) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    // If setting as default, unset other defaults
    if (is_default && !template.is_default) {
      const unsetWhere = applyBranchFilter(req, {});
      await DeliveryNoteTemplate.update(
        { is_default: false },
        { where: { ...unsetWhere, id: { [Op.ne]: id } } }
      );
    }

    // Super Admin can change branch, others cannot
    let targetBranchId = template.branch_id;
    if (req.user?.role_name === 'Super Admin' && branch_id !== undefined) {
      targetBranchId = branch_id;
    }

    // Update fields
    if (name !== undefined) template.name = name.trim();
    if (template_content !== undefined) template.template_content = template_content.trim();
    if (is_default !== undefined) template.is_default = is_default;
    if (targetBranchId !== undefined) template.branch_id = targetBranchId;

    await template.save();

    const templateWithBranch = await DeliveryNoteTemplate.findByPk(template.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.json({
      message: 'Template updated successfully',
      template: templateWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/delivery-notes/templates/:id
 * Delete template
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = applyBranchFilter(req, { id });
    const template = await DeliveryNoteTemplate.findOne({ where });

    if (!template) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    if (template.is_default) {
      return res.status(400).json({ error: 'Cannot delete default template. Set another as default first.' });
    }

    await template.destroy();

    res.json({
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-notes/templates/default
 * Get default template
 */
export const getDefaultTemplate = async (req, res, next) => {
  try {
    const where = applyBranchFilter(req, { is_default: true });

    let template = await DeliveryNoteTemplate.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    // If no default found, get any template
    if (!template) {
      const anyWhere = applyBranchFilter(req, {});
      template = await DeliveryNoteTemplate.findOne({
        where: anyWhere,
        include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        order: [['created_at', 'ASC']]
      });
    }

    if (!template) {
      return res.status(404).json({ error: 'No template found' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
};





























