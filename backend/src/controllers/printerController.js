import { ReceiptPrinter, Branch } from '../models/index.js';
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
 * GET /api/receipt-printers
 * List all receipt printers
 */
export const getReceiptPrinters = async (req, res, next) => {
  try {
    const { active_only } = req.query;
    const where = applyBranchFilter(req, {});

    if (active_only === 'true') {
      where.is_active = true;
    }

    const printers = await ReceiptPrinter.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
      order: [['is_default', 'DESC'], ['name', 'ASC']]
    });

    res.json({ printers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/receipt-printers/:id
 * Get single printer
 */
export const getReceiptPrinterById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = applyBranchFilter(req, { id });

    const printer = await ReceiptPrinter.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    res.json({ printer });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/receipt-printers
 * Create new printer
 */
export const createReceiptPrinter = async (req, res, next) => {
  try {
    const {
      name,
      printer_type,
      connection_type,
      connection_string,
      paper_width_mm,
      is_default,
      is_active,
      branch_id
    } = req.body;

    if (!name || !printer_type || !connection_type) {
      return res.status(400).json({
        error: 'Missing required fields: name, printer_type, connection_type'
      });
    }

    // Super Admin can create printers for any branch, others for their own branch
    let targetBranchId = branch_id;
    if (req.user?.role_name !== 'Super Admin') {
      targetBranchId = req.user.branch_id;
    }

    // If setting as default, unset other defaults
    if (is_default) {
      const unsetWhere = applyBranchFilter(req, {});
      await ReceiptPrinter.update(
        { is_default: false },
        { where: unsetWhere }
      );
    }

    const printer = await ReceiptPrinter.create({
      name: name.trim(),
      printer_type,
      connection_type,
      connection_string: connection_string?.trim() || null,
      paper_width_mm: paper_width_mm || 80,
      is_default: is_default || false,
      is_active: is_active !== undefined ? is_active : true,
      branch_id: targetBranchId
    });

    const printerWithBranch = await ReceiptPrinter.findByPk(printer.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.status(201).json({
      message: 'Printer created successfully',
      printer: printerWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/receipt-printers/:id
 * Update printer
 */
export const updateReceiptPrinter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      printer_type,
      connection_type,
      connection_string,
      paper_width_mm,
      is_default,
      is_active,
      branch_id
    } = req.body;

    const where = applyBranchFilter(req, { id });
    const printer = await ReceiptPrinter.findOne({ where });

    if (!printer) {
      return res.status(404).json({ error: 'Printer not found or unauthorized' });
    }

    // If setting as default, unset other defaults
    if (is_default && !printer.is_default) {
      const unsetWhere = applyBranchFilter(req, {});
      await ReceiptPrinter.update(
        { is_default: false },
        { where: { ...unsetWhere, id: { [Op.ne]: id } } }
      );
    }

    // Super Admin can change branch, others cannot
    let targetBranchId = printer.branch_id;
    if (req.user?.role_name === 'Super Admin' && branch_id !== undefined) {
      targetBranchId = branch_id;
    }

    // Update fields
    if (name !== undefined) printer.name = name.trim();
    if (printer_type !== undefined) printer.printer_type = printer_type;
    if (connection_type !== undefined) printer.connection_type = connection_type;
    if (connection_string !== undefined) printer.connection_string = connection_string?.trim() || null;
    if (paper_width_mm !== undefined) printer.paper_width_mm = parseInt(paper_width_mm);
    if (is_default !== undefined) printer.is_default = is_default;
    if (is_active !== undefined) printer.is_active = is_active;
    if (targetBranchId !== undefined) printer.branch_id = targetBranchId;

    await printer.save();

    const printerWithBranch = await ReceiptPrinter.findByPk(printer.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.json({
      message: 'Printer updated successfully',
      printer: printerWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/receipt-printers/:id
 * Delete printer
 */
export const deleteReceiptPrinter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = applyBranchFilter(req, { id });
    const printer = await ReceiptPrinter.findOne({ where });

    if (!printer) {
      return res.status(404).json({ error: 'Printer not found or unauthorized' });
    }

    if (printer.is_default) {
      return res.status(400).json({ error: 'Cannot delete default printer. Set another as default first.' });
    }

    await printer.destroy();

    res.json({
      message: 'Printer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/receipt-printers/default
 * Get default printer
 */
export const getDefaultPrinter = async (req, res, next) => {
  try {
    const where = applyBranchFilter(req, { is_default: true });

    let printer = await ReceiptPrinter.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    // If no default found, get any active printer
    if (!printer) {
      const anyWhere = applyBranchFilter(req, { is_active: true });
      printer = await ReceiptPrinter.findOne({
        where: anyWhere,
        include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        order: [['created_at', 'ASC']]
      });
    }

    if (!printer) {
      return res.status(404).json({ error: 'No printer found' });
    }

    res.json({ printer });
  } catch (error) {
    next(error);
  }
};
































