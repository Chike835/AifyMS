import { Supplier, Branch, Purchase } from '../models/index.js';
import { Op } from 'sequelize';
import { logActivitySync } from '../middleware/activityLogger.js';

/**
 * Get all suppliers
 * Super Admin sees all; Branch users see only their branch's suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let queryLimit = parseInt(limit);
    let queryOffset = (parseInt(page) - 1) * queryLimit;

    if (queryLimit < 1) {
      queryLimit = null;
      queryOffset = null;
    }

    // Build where clause
    const whereClause = {};

    // Branch filtering for non-Super Admin users
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: queryLimit,
      offset: queryOffset
    });

    return res.json({
      suppliers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: queryLimit,
        totalPages: queryLimit ? Math.ceil(count / queryLimit) : 1
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

/**
 * Get a single supplier by ID
 */
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const supplier = await Supplier.findOne({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    return res.json({ supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier' });
  }
};

/**
 * Create a new supplier
 * Validates unique email/phone within the same branch
 */
export const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, branch_id } = req.body;

    // Sanitize inputs
    const sanitizedName = name?.trim();
    const sanitizedPhone = phone?.trim() || null;
    const sanitizedEmail = email?.trim()?.toLowerCase() || null;
    const sanitizedAddress = address?.trim() || null;

    // Validate required fields
    if (!sanitizedName) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    // Determine branch_id: use provided one or fall back to user's branch
    const supplierBranchId = branch_id || req.user.branch_id;

    // Non-Super Admin users can only create suppliers for their own branch
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      if (supplierBranchId && supplierBranchId !== req.user.branch_id) {
        return res.status(403).json({ error: 'Cannot create supplier for another branch' });
      }
    }

    // Check for unique email within the branch if provided
    if (sanitizedEmail) {
      const emailWhere = { email: sanitizedEmail };
      if (supplierBranchId) {
        emailWhere.branch_id = supplierBranchId;
      }
      const existingEmail = await Supplier.findOne({ where: emailWhere });
      if (existingEmail) {
        return res.status(400).json({ error: 'A supplier with this email already exists in this branch' });
      }
    }

    // Check for unique phone within the branch if provided
    if (sanitizedPhone) {
      const phoneWhere = { phone: sanitizedPhone };
      if (supplierBranchId) {
        phoneWhere.branch_id = supplierBranchId;
      }
      const existingPhone = await Supplier.findOne({ where: phoneWhere });
      if (existingPhone) {
        return res.status(400).json({ error: 'A supplier with this phone number already exists in this branch' });
      }
    }

    const supplier = await Supplier.create({
      name: sanitizedName,
      phone: sanitizedPhone,
      email: sanitizedEmail,
      address: sanitizedAddress,
      branch_id: supplierBranchId || null,
      ledger_balance: 0
    });

    // Fetch supplier with branch info
    const supplierWithBranch = await Supplier.findByPk(supplier.id, {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    // Log activity
    await logActivitySync(
      'CREATE',
      'suppliers',
      `Created supplier: ${supplier.name}`,
      req,
      'supplier',
      supplier.id
    );

    return res.status(201).json({
      message: 'Supplier created successfully',
      supplier: supplierWithBranch
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
};

/**
 * Update an existing supplier
 * Validates unique email/phone (excluding current record)
 */
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, branch_id } = req.body;

    // Sanitize inputs
    // Note: checks for undefined to allow partial updates
    const sanitizedName = name !== undefined ? name?.trim() : undefined;
    const sanitizedPhone = phone !== undefined ? (phone?.trim() || null) : undefined;
    const sanitizedEmail = email !== undefined ? (email?.trim()?.toLowerCase() || null) : undefined;
    const sanitizedAddress = address !== undefined ? (address?.trim() || null) : undefined;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const supplier = await Supplier.findOne({ where: whereClause });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Validate required fields
    if (sanitizedName !== undefined && (!sanitizedName || sanitizedName === '')) {
      return res.status(400).json({ error: 'Supplier name cannot be empty' });
    }

    // Non-Super Admin cannot change branch_id
    if (req.user.role_name !== 'Super Admin' && branch_id && branch_id !== supplier.branch_id) {
      return res.status(403).json({ error: 'Cannot change supplier branch' });
    }

    const targetBranchId = branch_id !== undefined ? branch_id : supplier.branch_id;

    // Check for unique email if provided and changed
    if (sanitizedEmail && sanitizedEmail !== supplier.email) {
      const emailWhere = {
        email: sanitizedEmail,
        id: { [Op.ne]: id }
      };
      if (targetBranchId) {
        emailWhere.branch_id = targetBranchId;
      }
      const existingEmail = await Supplier.findOne({ where: emailWhere });
      if (existingEmail) {
        return res.status(400).json({ error: 'A supplier with this email already exists in this branch' });
      }
    }

    // Check for unique phone if provided and changed
    if (sanitizedPhone && sanitizedPhone !== supplier.phone) {
      const phoneWhere = {
        phone: sanitizedPhone,
        id: { [Op.ne]: id }
      };
      if (targetBranchId) {
        phoneWhere.branch_id = targetBranchId;
      }
      const existingPhone = await Supplier.findOne({ where: phoneWhere });
      if (existingPhone) {
        return res.status(400).json({ error: 'A supplier with this phone number already exists in this branch' });
      }
    }

    // Update fields
    await supplier.update({
      name: sanitizedName !== undefined ? sanitizedName : supplier.name,
      phone: sanitizedPhone !== undefined ? sanitizedPhone : supplier.phone,
      email: sanitizedEmail !== undefined ? sanitizedEmail : supplier.email,
      address: sanitizedAddress !== undefined ? sanitizedAddress : supplier.address,
      branch_id: req.user?.role_name === 'Super Admin' && branch_id !== undefined ? branch_id : supplier.branch_id
    });

    // Fetch updated supplier with branch info
    const updatedSupplier = await Supplier.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    // Log activity
    await logActivitySync(
      'UPDATE',
      'suppliers',
      `Updated supplier: ${updatedSupplier.name}`,
      req,
      'supplier',
      updatedSupplier.id
    );

    return res.json({
      message: 'Supplier updated successfully',
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
};

/**
 * Delete a supplier
 * Note: Future enhancement - check for existing purchase orders before deletion
 */
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const supplier = await Supplier.findOne({ where: whereClause });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Future: Check for existing purchase orders
    // const purchaseOrderCount = await PurchaseOrder.count({ where: { supplier_id: id } });
    // if (purchaseOrderCount > 0) {
    //   return res.status(400).json({
    //     error: 'Cannot delete supplier with existing purchase orders',
    //     details: `Supplier has ${purchaseOrderCount} purchase order(s)`
    //   });
    // }

    const supplierName = supplier.name;
    await supplier.destroy();

    // Log activity
    await logActivitySync(
      'DELETE',
      'suppliers',
      `Deleted supplier: ${supplierName}`,
      req,
      'supplier',
      id
    );

    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

/**
 * Get supplier ledger/balance history
 */
/**
 * GET /api/suppliers/:id/purchases
 * Get supplier purchase history
 */
export const getSupplierPurchases = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    let queryLimit = parseInt(limit);
    if (queryLimit < 1) {
      queryLimit = null;
    }

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const where = { supplier_id: id };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const purchases = await Purchase.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: queryLimit,
      offset: parseInt(offset)
    });

    return res.json({ purchases });
  } catch (error) {
    console.error('Error fetching supplier purchases:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier purchases' });
  }
};

/**
 * GET /api/suppliers/:id/balance
 * Get supplier balance summary
 */
export const getSupplierBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const where = { supplier_id: id };
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const totalPurchases = await Purchase.sum('total_amount', { where });
    const totalPayments = await Purchase.sum('amount_paid', { where });

    return res.json({
      supplier_id: id,
      total_purchases: parseFloat(totalPurchases || 0),
      total_payments: parseFloat(totalPayments || 0),
      outstanding_balance: parseFloat(totalPurchases || 0) - parseFloat(totalPayments || 0)
    });
  } catch (error) {
    console.error('Error fetching supplier balance:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier balance' });
  }
};

export const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const supplier = await Supplier.findOne({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Future: Include purchase orders and payments
    // const purchaseOrders = await PurchaseOrder.findAll({
    //   where: { supplier_id: id },
    //   order: [['created_at', 'DESC']],
    //   attributes: ['id', 'order_number', 'total_amount', 'payment_status', 'created_at']
    // });

    return res.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        ledger_balance: supplier.ledger_balance,
        branch: supplier.branch
      },
      purchase_orders: [], // Placeholder for future implementation
      payments: [] // Placeholder for future implementation
    });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier ledger' });
  }
};
