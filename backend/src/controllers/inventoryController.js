import { InventoryBatch, Product, Branch, BatchType, StockTransfer, StockAdjustment, User, ActivityLog, Category } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * POST /api/inventory/stock-transfer
 * Transfer inventory batch between branches
 */
export const transferBatch = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { inventory_batch_id, to_branch_id, quantity, notes } = req.body;
    const user_id = req.user.id;

    if (!inventory_batch_id || !to_branch_id || !quantity) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: inventory_batch_id, to_branch_id, quantity' 
      });
    }

    // Get the batch
    const batch = await InventoryBatch.findByPk(inventory_batch_id, { transaction });
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Verify destination branch exists
    const toBranch = await Branch.findByPk(to_branch_id, { transaction });
    if (!toBranch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Destination branch not found' });
    }

    // Check if transfer is to same branch
    if (batch.branch_id === to_branch_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot transfer to the same branch' });
    }

    // Check permissions - user must have access to source branch
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== batch.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to transfer from this branch' });
    }

    // Check if sufficient quantity available
    if (parseFloat(quantity) > parseFloat(batch.remaining_quantity)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Insufficient quantity. Available: ${batch.remaining_quantity}, Requested: ${quantity}` 
      });
    }

    const from_branch_id = batch.branch_id;

    // Update batch quantity and branch if transferring entire batch
    if (parseFloat(quantity) === parseFloat(batch.remaining_quantity)) {
      batch.branch_id = to_branch_id;
      await batch.save({ transaction });
    } else {
      // Partial transfer - create new batch at destination
      const newBatch = await InventoryBatch.create({
        product_id: batch.product_id,
        branch_id: to_branch_id,
        category_id: batch.category_id,
        instance_code: batch.grouped ? null : null, // New batch gets new code if needed
        batch_type_id: batch.batch_type_id,
        grouped: batch.grouped,
        batch_identifier: batch.batch_identifier,
        initial_quantity: parseFloat(quantity),
        remaining_quantity: parseFloat(quantity),
        status: 'in_stock',
        attribute_data: batch.attribute_data
      }, { transaction });

      // Reduce source batch quantity
      batch.remaining_quantity = parseFloat(batch.remaining_quantity) - parseFloat(quantity);
      if (batch.remaining_quantity <= 0) {
        batch.status = 'depleted';
      }
      await batch.save({ transaction });
    }

    // Create transfer record
    const transfer = await StockTransfer.create({
      inventory_batch_id,
      from_branch_id,
      to_branch_id,
      user_id,
      notes: notes || null
    }, { transaction });

    // Load with associations
    const transferWithDetails = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: InventoryBatch, as: 'inventory_batch', include: [{ model: Product, as: 'product' }] },
        { model: Branch, as: 'from_branch' },
        { model: Branch, as: 'to_branch' },
        { model: User, as: 'user' }
      ],
      transaction
    });

    await transaction.commit();

    res.status(201).json({
      message: 'Inventory batch transferred successfully',
      transfer: transferWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/transfers
 * Get transfer history
 */
export const getTransfers = async (req, res, next) => {
  try {
    const { branch_id, batch_id } = req.query;
    const where = {};

    if (batch_id) {
      where.inventory_batch_id = batch_id;
    }

    // Check permissions - Branch managers only see transfers involving their branch
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (branch_id && branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'You do not have permission to view transfers for this branch' });
      }
      
      where[Op.or] = [
        { from_branch_id: req.user.branch_id },
        { to_branch_id: req.user.branch_id }
      ];
    } else if (branch_id) {
      where[Op.or] = [
        { from_branch_id: branch_id },
        { to_branch_id: branch_id }
      ];
    }

    const transfers = await StockTransfer.findAll({
      where,
      include: [
        { 
          model: InventoryBatch, 
          as: 'inventory_batch',
          include: [{ model: Product, as: 'product' }]
        },
        { model: Branch, as: 'from_branch' },
        { model: Branch, as: 'to_branch' },
        { model: User, as: 'user' }
      ],
      order: [['transfer_date', 'DESC']]
    });

    res.json({ transfers });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/stock-adjustment
 * Adjust inventory batch quantity
 */
export const adjustStock = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { inventory_batch_id, adjustment_type, quantity, reason } = req.body;
    const user_id = req.user.id;

    if (!inventory_batch_id || !quantity || !reason || !adjustment_type) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: inventory_batch_id, adjustment_type, quantity, reason' 
      });
    }

    if (parseFloat(quantity) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }

    if (!reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Reason is required' });
    }

    if (!['increase', 'decrease'].includes(adjustment_type)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'adjustment_type must be "increase" or "decrease"' });
    }

    // Get the batch
    const batch = await InventoryBatch.findByPk(inventory_batch_id, { transaction });
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Check permissions
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== batch.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to adjust stock in this branch' });
    }

    const old_quantity = parseFloat(batch.remaining_quantity);
    let new_quantity;

    if (adjustment_type === 'increase') {
      new_quantity = old_quantity + parseFloat(quantity);
    } else {
      new_quantity = old_quantity - parseFloat(quantity);
      if (new_quantity < 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Cannot decrease by ${quantity}. Current quantity: ${old_quantity}` 
        });
      }
    }

    // Update batch quantity
    batch.remaining_quantity = new_quantity;
    
    // Update status if depleted
    if (new_quantity === 0) {
      batch.status = 'depleted';
    } else if (batch.status === 'depleted' && new_quantity > 0) {
      batch.status = 'in_stock';
    }

    await batch.save({ transaction });

    // Create adjustment record
    const adjustment = await StockAdjustment.create({
      inventory_batch_id,
      old_quantity,
      new_quantity,
      reason: reason.trim(),
      user_id
    }, { transaction });

    // Load with associations
    const adjustmentWithDetails = await StockAdjustment.findByPk(adjustment.id, {
      include: [
        { 
          model: InventoryBatch, 
          as: 'inventory_batch',
          include: [{ model: Product, as: 'product' }]
        },
        { model: User, as: 'user' }
      ],
      transaction
    });

    await transaction.commit();

    res.status(201).json({
      message: 'Stock adjusted successfully',
      adjustment: adjustmentWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/adjustments
 * Get adjustment history
 */
export const getAdjustments = async (req, res, next) => {
  try {
    const { branch_id, batch_id } = req.query;
    const where = {};

    if (batch_id) {
      where.inventory_batch_id = batch_id;
    }

    const adjustments = await StockAdjustment.findAll({
      where,
      include: [
        { 
          model: InventoryBatch, 
          as: 'inventory_batch',
          include: [
            { model: Product, as: 'product' },
            { model: Branch, as: 'branch' }
          ]
        },
        { model: User, as: 'user' }
      ],
      order: [['adjustment_date', 'DESC']]
    });

    // Filter by branch if needed
    let filteredAdjustments = adjustments;
    
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (branch_id && branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'You do not have permission to view adjustments for this branch' });
      }
      
      filteredAdjustments = adjustments.filter(adj => 
        adj.inventory_batch?.branch_id === req.user.branch_id
      );
    } else if (branch_id) {
      filteredAdjustments = adjustments.filter(adj => 
        adj.inventory_batch?.branch_id === branch_id
      );
    }

    res.json({ adjustments: filteredAdjustments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/batches/labels
 * Generate labels for inventory batches
 */
export const generateLabels = async (req, res, next) => {
  try {
    const { batch_ids, format = 'barcode', size = 'medium' } = req.body;

    if (!batch_ids || !Array.isArray(batch_ids) || batch_ids.length === 0) {
      return res.status(400).json({ 
        error: 'batch_ids array is required and must not be empty' 
      });
    }

    // Fetch batches with product and branch info
    const batches = await InventoryBatch.findAll({
      where: {
        id: { [Op.in]: batch_ids }
      },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'type'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'label_template'] }
      ]
    });

    if (batches.length === 0) {
      return res.status(404).json({ error: 'No batches found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      const invalidBatches = batches.filter(batch => batch.branch_id !== req.user.branch_id);
      if (invalidBatches.length > 0) {
        return res.status(403).json({ 
          error: 'You do not have permission to generate labels for batches from other branches' 
        });
      }
    }

    // Generate label data
    const labels = batches.map(batch => ({
      batch_id: batch.id,
      instance_code: batch.instance_code || batch.batch_identifier || 'N/A',
      product_name: batch.product?.name || 'N/A',
      product_sku: batch.product?.sku || 'N/A',
      remaining_quantity: parseFloat(batch.remaining_quantity),
      branch_name: batch.branch?.name || 'N/A',
      label_template: batch.branch?.label_template || null
    }));

    res.json({
      labels,
      format,
      size,
      count: labels.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/label-template
 * Get branch-specific label template
 */
export const getLabelTemplate = async (req, res, next) => {
  try {
    const branchId = req.user?.branch_id;

    if (!branchId) {
      return res.status(400).json({ error: 'User must be assigned to a branch' });
    }

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json({
      template: branch.label_template || null,
      branch_id: branch.id,
      branch_name: branch.name
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/low-stock
 * Get products/batches below threshold
 */
export const getLowStock = async (req, res, next) => {
  try {
    const { threshold = 10 } = req.query;
    const thresholdValue = parseFloat(threshold);

    const where = {};
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }
    where.status = 'in_stock';
    where.remaining_quantity = { [Op.lte]: thresholdValue };

    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'type'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['remaining_quantity', 'ASC']]
    });

    res.json({ 
      batches,
      threshold: thresholdValue,
      count: batches.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/convert-batch
 * Convert Loose material into specific Coils (Slitting workflow)
 */
export const convertBatch = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { source_batch_id, new_instance_code, weight, attribute_data = {} } = req.body;
    const user_id = req.user.id;

    if (!source_batch_id || !new_instance_code || !weight) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: source_batch_id, new_instance_code, weight' 
      });
    }

    if (parseFloat(weight) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Weight must be greater than 0' });
    }

    // Lock and fetch source batch
    const sourceBatch = await InventoryBatch.findByPk(source_batch_id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'type', 'base_unit'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: BatchType, as: 'batch_type', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'attribute_schema'] }
      ]
    });

    if (!sourceBatch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Source batch not found' });
    }

    // Check permissions
    if (req.user.role_name !== 'Super Admin' && req.user.branch_id !== sourceBatch.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'You do not have permission to convert batches from this branch' });
    }

    // Verify source batch is Loose type
    const looseBatchType = await BatchType.findOne({
      where: { name: 'Loose', is_active: true },
      transaction
    });

    if (!looseBatchType || sourceBatch.batch_type_id !== looseBatchType.id) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Source batch must be of type "Loose" for slitting operation' 
      });
    }

    // Check if sufficient quantity available
    const weightToConvert = parseFloat(weight);
    if (weightToConvert > parseFloat(sourceBatch.remaining_quantity)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Insufficient quantity. Available: ${sourceBatch.remaining_quantity}, Requested: ${weight}` 
      });
    }

    // Check if new instance code already exists
    const existingBatch = await InventoryBatch.findOne({
      where: { instance_code: new_instance_code.trim() },
      transaction
    });

    if (existingBatch) {
      await transaction.rollback();
      return res.status(409).json({ 
        error: `Instance code "${new_instance_code}" already exists` 
      });
    }

    // Find Coil batch type
    const coilBatchType = await BatchType.findOne({
      where: { name: 'Coil', is_active: true },
      transaction
    });

    if (!coilBatchType) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Coil batch type not found. Please create it in Batch Settings.' });
    }

    // Merge attribute data from source batch and provided data
    const mergedAttributeData = {
      ...(sourceBatch.attribute_data || {}),
      ...attribute_data
    };

    // Validate merged attributes against category schema
    const categorySchema = sourceBatch.category?.attribute_schema;
    if (categorySchema && Array.isArray(categorySchema) && categorySchema.length > 0) {
      for (const attr of categorySchema) {
        const value = mergedAttributeData[attr.name];
        if (attr.required && value === undefined) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Required attribute "${attr.name}" is missing`
          });
        }

        if (value !== undefined && attr.type === 'select' && Array.isArray(attr.options)) {
          if (!attr.options.includes(value)) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Invalid value for attribute "${attr.name}". Must be one of: ${attr.options.join(', ')}`
            });
          }
        }
      }
    }

    // Create child batch (Coil)
    const childBatch = await InventoryBatch.create({
      product_id: sourceBatch.product_id,
      branch_id: sourceBatch.branch_id,
      category_id: sourceBatch.category_id,
      instance_code: new_instance_code.trim(),
      batch_type_id: coilBatchType.id,
      grouped: true,
      batch_identifier: new_instance_code.trim(),
      initial_quantity: weightToConvert,
      remaining_quantity: weightToConvert,
      status: 'in_stock',
      attribute_data: mergedAttributeData
    }, { transaction });

    // Deduct weight from source batch
    sourceBatch.remaining_quantity = parseFloat(sourceBatch.remaining_quantity) - weightToConvert;
    if (sourceBatch.remaining_quantity <= 0) {
      sourceBatch.status = 'depleted';
    }
    await sourceBatch.save({ transaction });

    // Log activity
    try {
      await ActivityLog.create({
        user_id,
        action_type: 'CREATE',
        module: 'inventory',
        description: `Slitting: Converted ${weightToConvert} ${sourceBatch.product?.base_unit || ''} from Loose batch to Coil ${new_instance_code}`,
        branch_id: sourceBatch.branch_id,
        reference_type: 'inventory_batch',
        reference_id: childBatch.id
      }, { transaction });
    } catch (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the operation if logging fails
    }

    await transaction.commit();

    // Reload with associations
    const childBatchWithDetails = await InventoryBatch.findByPk(childBatch.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'base_unit'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: BatchType, as: 'batch_type', attributes: ['id', 'name', 'description'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Batch converted successfully (Slitting completed)',
      child_batch: childBatchWithDetails,
      source_batch: {
        id: sourceBatch.id,
        remaining_quantity: sourceBatch.remaining_quantity,
        status: sourceBatch.status
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/inventory/batches/:id/history
 * Get batch movement history (transfers, adjustments)
 */
export const getBatchHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await InventoryBatch.findByPk(id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Branch access check
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      if (batch.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Unauthorized to view this batch' });
      }
    }

    // Get transfers
    const transfers = await StockTransfer.findAll({
      where: {
        inventory_batch_id: id
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] },
        { model: Branch, as: 'to_branch', attributes: ['id', 'name'] },
        { model: Branch, as: 'from_branch', attributes: ['id', 'name'] }
      ],
      order: [['transfer_date', 'DESC']]
    });

    // Get adjustments
    const adjustments = await StockAdjustment.findAll({
      where: { inventory_batch_id: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] }
      ],
      order: [['adjustment_date', 'DESC']]
    });

    res.json({
      batch: {
        id: batch.id,
        instance_code: batch.instance_code || batch.batch_identifier,
        product: batch.product,
        current_quantity: batch.remaining_quantity
      },
      transfers,
      adjustments,
      history: [
        ...transfers.map(t => ({
          type: 'transfer',
          date: t.transfer_date,
          description: `Transferred to ${t.to_branch?.name || 'N/A'}`,
          user: t.user
        })),
        ...adjustments.map(a => ({
          type: 'adjustment',
          date: a.adjustment_date,
          description: `Adjusted from ${a.old_quantity} to ${a.new_quantity}. Reason: ${a.reason || 'N/A'}`,
          user: a.user
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    next(error);
  }
};
