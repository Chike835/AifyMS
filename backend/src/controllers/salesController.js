import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, ItemAssignment, Product, InventoryBatch, Recipe, Customer, Branch, User, Agent, AgentCommission } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async () => {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Find the last invoice for today
  const lastOrder = await SalesOrder.findOne({
    where: {
      invoice_number: {
        [Op.like]: `${prefix}-${dateStr}-%`
      }
    },
    order: [['invoice_number', 'DESC']]
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.invoice_number.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
};

/**
 * POST /api/sales
 * Create a new sale/invoice with transaction support
 * CRITICAL: Handles manufactured_virtual products with coil assignment
 */
export const createSale = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      customer_id,
      branch_id,
      items, // Array of { product_id, quantity, unit_price, item_assignments? }
      payment_status = 'unpaid',
      order_type = 'invoice',
      valid_until,
      quotation_notes,
      agent_id
    } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Items array is required and cannot be empty' });
    }

    // Use user's branch if not provided (for branch managers)
    const finalBranchId = branch_id || req.user.branch_id;
    if (!finalBranchId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'branch_id is required' });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      totalAmount += subtotal;
    }

    // Determine if inventory should be deducted (only for actual invoices)
    const shouldDeductInventory = order_type === 'invoice';

    // Validate agent if provided
    let agent = null;
    if (agent_id) {
      agent = await Agent.findByPk(agent_id, { transaction });
      if (!agent) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Agent not found' });
      }
      if (!agent.is_active) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Agent is not active' });
      }
      // Branch check for non-Super Admin
      if (req.user?.role_name !== 'Super Admin' && agent.branch_id !== finalBranchId) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Agent does not belong to this branch' });
      }
    }

    // Create sales order
    const salesOrder = await SalesOrder.create({
      invoice_number: invoiceNumber,
      customer_id: customer_id || null,
      branch_id: finalBranchId,
      user_id: req.user.id,
      agent_id: agent_id || null,
      total_amount: totalAmount,
      payment_status,
      production_status: 'na', // Will be updated if manufactured items exist
      is_legacy: false,
      order_type,
      valid_until: order_type === 'quotation' ? valid_until : null,
      quotation_notes: order_type === 'quotation' ? quotation_notes : null
    }, { transaction });

    // Track if any manufactured items exist
    let hasManufacturedItems = false;

    // Process each item
    for (const item of items) {
      const { product_id, quantity, unit_price, item_assignments } = item;

      // Validate item
      if (!product_id || quantity === undefined || unit_price === undefined) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Each item must have product_id, quantity, and unit_price' 
        });
      }

      // Get product to check type
      const product = await Product.findByPk(product_id, { transaction });
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ error: `Product ${product_id} not found` });
      }

      const subtotal = parseFloat(quantity) * parseFloat(unit_price);

      // Create sales item
      const salesItem = await SalesItem.create({
        order_id: salesOrder.id,
        product_id,
        quantity,
        unit_price,
        subtotal
      }, { transaction });

      // Handle manufactured_virtual products - CRITICAL LOGIC
      // Only process inventory deduction for actual invoices (not drafts/quotations)
      if (product.type === 'manufactured_virtual' && shouldDeductInventory) {
        hasManufacturedItems = true;

        // Validate that item_assignments exist
        if (!item_assignments || !Array.isArray(item_assignments) || item_assignments.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Manufactured product ${product.name} requires item_assignments array` 
          });
        }

        // Get recipe for this virtual product
        const recipe = await Recipe.findOne({
          where: { virtual_product_id: product_id },
          transaction
        });

        if (!recipe) {
          await transaction.rollback();
          return res.status(404).json({ 
            error: `No recipe found for manufactured product ${product.name}` 
          });
        }

        // Calculate total raw material needed
        const totalRawMaterialNeeded = parseFloat(quantity) * parseFloat(recipe.conversion_factor);

        // Verify total assigned quantity matches requirement
        let totalAssigned = 0;
        for (const assignment of item_assignments) {
          totalAssigned += parseFloat(assignment.quantity_deducted || 0);
        }

        if (Math.abs(totalAssigned - totalRawMaterialNeeded) > 0.001) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Total assigned quantity (${totalAssigned}) does not match required (${totalRawMaterialNeeded}) for product ${product.name}` 
          });
        }

        // Process each assignment
        for (const assignment of item_assignments) {
          const { inventory_batch_id, quantity_deducted } = assignment;

          if (!inventory_batch_id || quantity_deducted === undefined) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: 'Each assignment must have inventory_batch_id and quantity_deducted' 
            });
          }

          // Get inventory batch with lock (FOR UPDATE)
          const inventoryBatch = await InventoryBatch.findByPk(
            inventory_batch_id,
            { 
              lock: transaction.LOCK.UPDATE,
              transaction 
            }
          );

          if (!inventoryInstance) {
            await transaction.rollback();
            return res.status(404).json({ 
              error: `Inventory batch ${inventory_batch_id} not found` 
            });
          }

          // Verify it's the correct raw product
          if (inventoryBatch.product_id !== recipe.raw_product_id) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: `Inventory instance does not match recipe raw product` 
            });
          }

          // Check sufficient stock
          const qtyToDeduct = parseFloat(quantity_deducted);
          if (inventoryBatch.remaining_quantity < qtyToDeduct) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: `Insufficient stock in ${inventoryBatch.instance_code || inventoryBatch.batch_identifier}. Available: ${inventoryBatch.remaining_quantity}, Required: ${qtyToDeduct}` 
            });
          }

          // Deduct from inventory
          inventoryBatch.remaining_quantity -= qtyToDeduct;
          
          // Update status if depleted
          if (inventoryBatch.remaining_quantity <= 0) {
            inventoryBatch.status = 'depleted';
          }

          await inventoryBatch.save({ transaction });

          // Create item assignment record
          await ItemAssignment.create({
            sales_item_id: salesItem.id,
            inventory_batch_id,
            quantity_deducted: qtyToDeduct
          }, { transaction });
        }
      } else if (product.type === 'manufactured_virtual' && !shouldDeductInventory) {
        // For drafts/quotations, just mark that it has manufactured items (for display purposes)
        hasManufacturedItems = true;
      }
    }

    // Update production status if manufactured items exist (only for actual invoices)
    if (hasManufacturedItems && shouldDeductInventory) {
      salesOrder.production_status = 'queue';
      await salesOrder.save({ transaction });
    }

    // Create agent commission if agent is assigned (only for actual invoices)
    if (agent && shouldDeductInventory && agent.commission_rate > 0) {
      const commissionAmount = (total_amount * parseFloat(agent.commission_rate)) / 100;
      
      await AgentCommission.create({
        agent_id: agent.id,
        sales_order_id: salesOrder.id,
        commission_amount: commissionAmount,
        commission_rate: agent.commission_rate,
        order_amount: total_amount,
        payment_status: 'pending'
      }, { transaction });
    }

    // Commit transaction
    await transaction.commit();

    // Fetch complete order with associations
    const completeOrder = await SalesOrder.findByPk(salesOrder.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'commission_rate'] },
        { model: Agent, as: 'agent', attributes: ['id', 'name', 'commission_rate'] },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [
                {
                  model: InventoryBatch,
                  as: 'inventory_batch',
                  include: [{ model: Product, as: 'product' }]
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json({
      message: 'Sale created successfully',
      order: completeOrder
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/sales
 * List sales orders
 */
export const getSales = async (req, res, next) => {
  try {
    const { branch_id, customer_id, payment_status, production_status, order_type, start_date, end_date } = req.query;
    const where = {};

    // Apply filters
    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      // Branch managers only see their branch
      where.branch_id = req.user.branch_id;
    }

    if (customer_id) {
      where.customer_id = customer_id;
    }

    if (payment_status) {
      where.payment_status = payment_status;
    }

    if (production_status) {
      where.production_status = production_status;
    }

    if (order_type) {
      where.order_type = order_type;
    }

    // Date range filter
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    // Check permissions for view scope
    const canViewAll = req.user?.permissions?.includes('sale_view_all');
    if (!canViewAll && req.user?.permissions?.includes('sale_view_own')) {
      where.user_id = req.user.id;
    }

    const orders = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 500 // Increased limit for POS list
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales/:id
 * Get sales order by ID
 */
export const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [
                {
                  model: InventoryBatch,
                  as: 'inventory_batch',
                  include: [{ model: Product, as: 'product' }]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sales/:id/production-status
 * Update production status (with worker name for 'produced' status)
 */
export const updateProductionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { production_status, worker_name } = req.body;

    const validStatuses = ['queue', 'produced', 'delivered', 'na'];
    if (!validStatuses.includes(production_status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const order = await SalesOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // Validate worker_name is provided when moving to 'produced'
    if (production_status === 'produced' && (!worker_name || worker_name.trim() === '')) {
      return res.status(400).json({ 
        error: 'worker_name is required when setting status to "produced"' 
      });
    }

    // Only allow status transitions: queue -> produced -> delivered
    if (order.production_status === 'na' && production_status !== 'queue') {
      return res.status(400).json({ 
        error: 'Cannot set production status. Order has no manufactured items.' 
      });
    }

    if (order.production_status === 'queue' && production_status === 'delivered') {
      return res.status(400).json({ 
        error: 'Cannot skip "produced" status. Order must be produced first.' 
      });
    }

    order.production_status = production_status;
    
    // Store worker name in a note field or use dispatcher_name field temporarily
    // For now, we'll use dispatcher_name to store worker name when produced
    if (production_status === 'produced' && worker_name) {
      // We can add a worker_name field later, for now use dispatcher_name as temporary storage
      // This will be overwritten when order is delivered
      order.dispatcher_name = worker_name;
    }

    await order.save();

    // Fetch complete order
    const completeOrder = await SalesOrder.findByPk(order.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Production status updated successfully',
      order: completeOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales/production-queue
 * Get orders in production queue (status = 'queue')
 */
export const getProductionQueue = async (req, res, next) => {
  try {
    const where = {
      production_status: 'queue'
    };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const orders = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [
                {
                  model: InventoryBatch,
                  as: 'inventory_batch',
                  include: [{ model: Product, as: 'product' }]
                }
              ]
            }
          ]
        }
      ],
      order: [['created_at', 'ASC']] // Oldest first
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales/shipments
 * Get orders ready for shipment (status = 'produced')
 */
export const getShipments = async (req, res, next) => {
  try {
    const where = {
      production_status: 'produced'
    };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const orders = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sales/:id/deliver
 * Mark order as delivered (with dispatcher info)
 */
export const markAsDelivered = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dispatcher_name, vehicle_plate, delivery_signature } = req.body;

    if (!dispatcher_name || dispatcher_name.trim() === '') {
      return res.status(400).json({ 
        error: 'dispatcher_name is required' 
      });
    }

    const order = await SalesOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    if (order.production_status !== 'produced') {
      return res.status(400).json({ 
        error: 'Order must be in "produced" status before it can be delivered' 
      });
    }

    order.production_status = 'delivered';
    order.dispatcher_name = dispatcher_name.trim();
    order.vehicle_plate = vehicle_plate ? vehicle_plate.trim() : null;
    order.delivery_signature = delivery_signature || null;

    await order.save();

    // Fetch complete order
    const completeOrder = await SalesOrder.findByPk(order.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Order marked as delivered successfully',
      order: completeOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales/drafts
 * Get all draft orders
 */
export const getDrafts = async (req, res, next) => {
  try {
    const where = {
      order_type: 'draft'
    };

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Permission-based filtering
    const canViewAll = req.user?.permissions?.includes('sale_view_all');
    if (!canViewAll && req.user?.permissions?.includes('sale_view_own')) {
      where.user_id = req.user.id;
    }

    const drafts = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ drafts });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sales/drafts/:id
 * Update an existing draft
 */
export const updateDraft = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { customer_id, items } = req.body;

    // Find the draft
    const draft = await SalesOrder.findByPk(id, { transaction });
    
    if (!draft) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.order_type !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only drafts can be updated' });
    }

    // Delete existing items
    await SalesItem.destroy({
      where: { order_id: id },
      transaction
    });

    // Calculate new total
    let totalAmount = 0;
    for (const item of items) {
      const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      totalAmount += subtotal;
    }

    // Update draft
    draft.customer_id = customer_id || null;
    draft.total_amount = totalAmount;
    await draft.save({ transaction });

    // Create new items
    for (const item of items) {
      const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      await SalesItem.create({
        order_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal
      }, { transaction });
    }

    await transaction.commit();

    // Fetch updated draft
    const updatedDraft = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({
      message: 'Draft updated successfully',
      draft: updatedDraft
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/sales/drafts/:id/convert
 * Convert a draft to an invoice
 */
export const convertDraftToInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { item_assignments } = req.body; // For manufactured products

    // Find the draft with items
    const draft = await SalesOrder.findByPk(id, {
      include: [
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      transaction
    });

    if (!draft) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.order_type !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only drafts can be converted to invoices' });
    }

    // Check for manufactured products and process inventory
    let hasManufacturedItems = false;
    
    for (const item of draft.items) {
      if (item.product?.type === 'manufactured_virtual') {
        hasManufacturedItems = true;
        
        // Find assignments for this item
        const itemAssignments = item_assignments?.[item.id];
        if (!itemAssignments || itemAssignments.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Coil assignments required for manufactured product: ${item.product.name}`
          });
        }

        // Get recipe
        const recipe = await Recipe.findOne({
          where: { virtual_product_id: item.product_id },
          transaction
        });

        if (!recipe) {
          await transaction.rollback();
          return res.status(404).json({
            error: `No recipe found for product: ${item.product.name}`
          });
        }

        // Calculate required quantity
        const requiredQty = parseFloat(item.quantity) * parseFloat(recipe.conversion_factor);
        let totalAssigned = 0;

        // Process each assignment
        for (const assignment of itemAssignments) {
          const { inventory_batch_id, quantity_deducted } = assignment;
          totalAssigned += parseFloat(quantity_deducted);

          // Get and lock inventory instance
          const batch = await InventoryBatch.findByPk(inventory_batch_id, {
            lock: transaction.LOCK.UPDATE,
            transaction
          });

          if (!batch) {
            await transaction.rollback();
            return res.status(404).json({
              error: `Inventory batch not found: ${inventory_batch_id}`
            });
          }

          if (batch.remaining_quantity < quantity_deducted) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Insufficient stock in ${batch.instance_code || batch.batch_identifier}`
            });
          }

          // Deduct inventory
          batch.remaining_quantity -= quantity_deducted;
          if (batch.remaining_quantity <= 0) {
            batch.status = 'depleted';
          }
          await batch.save({ transaction });

          // Create item assignment
          await ItemAssignment.create({
            sales_item_id: item.id,
            inventory_batch_id,
            quantity_deducted
          }, { transaction });
        }

        // Verify total assigned
        if (Math.abs(totalAssigned - requiredQty) > 0.001) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Assigned quantity mismatch for ${item.product.name}`
          });
        }
      }
    }

    // Update order type to invoice
    draft.order_type = 'invoice';
    if (hasManufacturedItems) {
      draft.production_status = 'queue';
    }
    await draft.save({ transaction });

    await transaction.commit();

    // Fetch converted order
    const convertedOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [{ model: InventoryBatch, as: 'inventory_batch' }]
            }
          ]
        }
      ]
    });

    res.json({
      message: 'Draft converted to invoice successfully',
      order: convertedOrder
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/sales/drafts/:id
 * Delete a draft order
 */
export const deleteDraft = async (req, res, next) => {
  try {
    const { id } = req.params;

    const draft = await SalesOrder.findByPk(id);

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.order_type !== 'draft') {
      return res.status(400).json({ error: 'Only drafts can be deleted' });
    }

    // Delete items first (cascade should handle this, but being explicit)
    await SalesItem.destroy({ where: { order_id: id } });
    
    // Delete draft
    await draft.destroy();

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sales/quotations
 * Get all quotations
 */
export const getQuotations = async (req, res, next) => {
  try {
    const { status } = req.query; // 'active', 'expired', or 'all'
    const where = {
      order_type: 'quotation'
    };

    // Filter by expiry status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (status === 'active') {
      where.valid_until = {
        [Op.gte]: today
      };
    } else if (status === 'expired') {
      where.valid_until = {
        [Op.lt]: today
      };
    }

    // Branch filtering
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Permission-based filtering
    const canViewAll = req.user?.permissions?.includes('sale_view_all');
    if (!canViewAll && req.user?.permissions?.includes('sale_view_own')) {
      where.user_id = req.user.id;
    }

    const quotations = await SalesOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Add status field to each quotation
    const quotationsWithStatus = quotations.map(q => {
      const qData = q.toJSON();
      const validUntil = q.valid_until ? new Date(q.valid_until) : null;
      qData.is_expired = validUntil ? validUntil < today : false;
      return qData;
    });

    res.json({ quotations: quotationsWithStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sales/quotations/:id/convert
 * Convert a quotation to an invoice
 */
export const convertQuotationToInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { item_assignments } = req.body;

    // Find the quotation with items
    const quotation = await SalesOrder.findByPk(id, {
      include: [
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      transaction
    });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (quotation.order_type !== 'quotation') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only quotations can be converted' });
    }

    // Check if quotation is expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (quotation.valid_until && new Date(quotation.valid_until) < today) {
      await transaction.rollback();
      return res.status(400).json({ error: 'This quotation has expired' });
    }

    // Process manufactured products
    let hasManufacturedItems = false;
    
    for (const item of quotation.items) {
      if (item.product?.type === 'manufactured_virtual') {
        hasManufacturedItems = true;
        
        const itemAssignments = item_assignments?.[item.id];
        if (!itemAssignments || itemAssignments.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Coil assignments required for manufactured product: ${item.product.name}`
          });
        }

        // Get recipe
        const recipe = await Recipe.findOne({
          where: { virtual_product_id: item.product_id },
          transaction
        });

        if (!recipe) {
          await transaction.rollback();
          return res.status(404).json({
            error: `No recipe found for product: ${item.product.name}`
          });
        }

        // Calculate required quantity
        const requiredQty = parseFloat(item.quantity) * parseFloat(recipe.conversion_factor);
        let totalAssigned = 0;

        // Process each assignment
        for (const assignment of itemAssignments) {
          const { inventory_batch_id, quantity_deducted } = assignment;
          totalAssigned += parseFloat(quantity_deducted);

          // Get and lock inventory instance
          const batch = await InventoryBatch.findByPk(inventory_batch_id, {
            lock: transaction.LOCK.UPDATE,
            transaction
          });

          if (!batch) {
            await transaction.rollback();
            return res.status(404).json({
              error: `Inventory batch not found: ${inventory_batch_id}`
            });
          }

          if (batch.remaining_quantity < quantity_deducted) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Insufficient stock in ${batch.instance_code || batch.batch_identifier}`
            });
          }

          // Deduct inventory
          batch.remaining_quantity -= quantity_deducted;
          if (batch.remaining_quantity <= 0) {
            batch.status = 'depleted';
          }
          await batch.save({ transaction });

          // Create item assignment
          await ItemAssignment.create({
            sales_item_id: item.id,
            inventory_batch_id,
            quantity_deducted
          }, { transaction });
        }

        // Verify total assigned
        if (Math.abs(totalAssigned - requiredQty) > 0.001) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Assigned quantity mismatch for ${item.product.name}`
          });
        }
      }
    }

    // Update order type to invoice
    quotation.order_type = 'invoice';
    quotation.valid_until = null; // Clear quotation-specific fields
    quotation.quotation_notes = null;
    if (hasManufacturedItems) {
      quotation.production_status = 'queue';
    }
    await quotation.save({ transaction });

    await transaction.commit();

    // Fetch converted order
    const convertedOrder = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [{ model: InventoryBatch, as: 'inventory_batch' }]
            }
          ]
        }
      ]
    });

    res.json({
      message: 'Quotation converted to invoice successfully',
      order: convertedOrder
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/sales/quotations/:id
 * Delete a quotation
 */
export const deleteQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await SalesOrder.findByPk(id);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (quotation.order_type !== 'quotation') {
      return res.status(400).json({ error: 'Only quotations can be deleted' });
    }

    // Delete items first
    await SalesItem.destroy({ where: { order_id: id } });
    
    // Delete quotation
    await quotation.destroy();

    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sales/:id
 * Update sales order (only for drafts)
 */
export const updateSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await SalesOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // Only allow updates to drafts
    if (order.order_type !== 'draft') {
      return res.status(400).json({ error: 'Only draft orders can be updated. Use the drafts endpoint instead.' });
    }

    // Redirect to updateDraft for consistency
    return updateDraft(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/sales/:id
 * Cancel/void a sales order
 */
export const cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' },
            {
              model: ItemAssignment,
              as: 'assignments',
              include: [
                {
                  model: InventoryBatch,
                  as: 'inventory_batch'
                }
              ]
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // Only allow cancellation of unpaid orders
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid order' });
    }

    // If order was invoiced and has inventory deductions, reverse them
    if (order.order_type === 'invoice' && order.items) {
      const transaction = await sequelize.transaction();
      try {
        for (const item of order.items) {
          if (item.assignments && item.assignments.length > 0) {
            for (const assignment of item.assignments) {
              const batch = await InventoryBatch.findByPk(
                assignment.inventory_batch_id,
                { transaction }
              );
              
              if (batch) {
                // Reverse the inventory deduction
                batch.remaining_quantity += parseFloat(assignment.quantity_deducted);
                if (batch.status === 'depleted' && batch.remaining_quantity > 0) {
                  batch.status = 'in_stock';
                }
                await batch.save({ transaction });
              }
            }
          }
        }

        // Mark order as cancelled (we can add a cancelled status or just delete)
        // For now, we'll add a cancelled flag or just delete if it's a draft/quotation
        if (order.order_type === 'draft' || order.order_type === 'quotation') {
          await SalesItem.destroy({ where: { order_id: id }, transaction });
          await order.destroy({ transaction });
        } else {
          // For invoices, we might want to keep a record, but mark as cancelled
          // For now, we'll just delete
          await SalesItem.destroy({ where: { order_id: id }, transaction });
          await order.destroy({ transaction });
        }

        await transaction.commit();
        res.json({ message: 'Sales order cancelled successfully' });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      // For drafts/quotations or orders without inventory, just delete
      await SalesItem.destroy({ where: { order_id: id } });
      await order.destroy();
      res.json({ message: 'Sales order cancelled successfully' });
    }
  } catch (error) {
    next(error);
  }
};

