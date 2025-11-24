import { Supplier, Branch } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all suppliers
 * Super Admin sees all; Branch users see only their branch's suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {};

    // Branch filtering for non-Super Admin users
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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
      limit: parseInt(limit),
      offset
    });

    return res.json({
      suppliers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
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
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    // Determine branch_id: use provided one or fall back to user's branch
    const supplierBranchId = branch_id || req.user.branch_id;

    // Non-Super Admin users can only create suppliers for their own branch
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
      if (supplierBranchId && supplierBranchId !== req.user.branch_id) {
        return res.status(403).json({ error: 'Cannot create supplier for another branch' });
      }
    }

    // Check for unique email within the branch if provided
    if (email) {
      const emailWhere = { email };
      if (supplierBranchId) {
        emailWhere.branch_id = supplierBranchId;
      }
      const existingEmail = await Supplier.findOne({ where: emailWhere });
      if (existingEmail) {
        return res.status(400).json({ error: 'A supplier with this email already exists in this branch' });
      }
    }

    // Check for unique phone within the branch if provided
    if (phone) {
      const phoneWhere = { phone };
      if (supplierBranchId) {
        phoneWhere.branch_id = supplierBranchId;
      }
      const existingPhone = await Supplier.findOne({ where: phoneWhere });
      if (existingPhone) {
        return res.status(400).json({ error: 'A supplier with this phone number already exists in this branch' });
      }
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      address: address?.trim() || null,
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

    return res.status(201).json({
      message: 'Supplier created successfully',
      supplier: supplierWithBranch
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.name === 'SequelizeValidationError') {
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

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
      whereClause.branch_id = req.user.branch_id;
    }

    const supplier = await Supplier.findOne({ where: whereClause });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Validate required fields
    if (name !== undefined && (!name || name.trim() === '')) {
      return res.status(400).json({ error: 'Supplier name cannot be empty' });
    }

    // Non-Super Admin cannot change branch_id
    if (req.user.role_name !== 'Super Admin' && branch_id && branch_id !== supplier.branch_id) {
      return res.status(403).json({ error: 'Cannot change supplier branch' });
    }

    const targetBranchId = branch_id !== undefined ? branch_id : supplier.branch_id;

    // Check for unique email if provided and changed
    if (email && email !== supplier.email) {
      const emailWhere = {
        email,
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
    if (phone && phone !== supplier.phone) {
      const phoneWhere = {
        phone,
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
      name: name !== undefined ? name.trim() : supplier.name,
      phone: phone !== undefined ? (phone?.trim() || null) : supplier.phone,
      email: email !== undefined ? (email?.trim()?.toLowerCase() || null) : supplier.email,
      address: address !== undefined ? (address?.trim() || null) : supplier.address,
      branch_id: req.user.role_name === 'Super Admin' && branch_id !== undefined ? branch_id : supplier.branch_id
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

    return res.json({
      message: 'Supplier updated successfully',
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error.name === 'SequelizeValidationError') {
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
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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

    await supplier.destroy();

    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

/**
 * Get supplier ledger/balance history
 */
export const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with branch filter
    const whereClause = { id };
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id) {
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

