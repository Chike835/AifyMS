import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, ItemAssignment, Product, InventoryBatch, Recipe, Customer, Branch, User, Agent, AgentCommission } from '../models/index.js';
import { Op } from 'sequelize';
import { multiply, add, subtract, sum, equals, lessThan, lessThanOrEqual, greaterThan, percentage } from '../utils/mathUtils.js';
import { processManufacturedVirtualItem, processManufacturedVirtualItemForConversion } from '../services/inventoryService.js';
import { createLedgerEntry } from '../services/ledgerService.js';

/**
 * Generate unique invoice number with transaction lock to prevent race conditions
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<string>} Unique invoice number
 */
const generateInvoiceNumber = async (transaction) => {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Use advisory lock to prevent concurrent invoice number generation
  // PostgreSQL advisory locks are automatically released when transaction ends
  const lockKey = `invoice_${dateStr}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Acquire advisory lock (blocks until available)
  await sequelize.query(`SELECT pg_advisory_xact_lock(${lockKey})`, { transaction });
  
  // Find the last invoice for today with lock
  const lastOrder = await SalesOrder.findOne({
    where: {
      invoice_number: {
        [Op.like]: `${prefix}-${dateStr}-%`
      }
    },
    order: [['invoice_number', 'DESC']],
    lock: transaction.LOCK.UPDATE,
    transaction
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

    // Generate invoice number (within transaction for locking)
    const invoiceNumber = await generateInvoiceNumber(transaction);

    // Calculate total amount using precision math
    const itemSubtotals = items.map(item => 
      multiply(item.quantity, item.unit_price)
    );
    const totalAmount = sum(itemSubtotals);

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

    // Track if any manufactured items exist and if any had assignments
    let hasManufacturedItems = false;
    let hasAssignments = false;

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

      const subtotal = multiply(quantity, unit_price);

      // Create sales item
      const salesItem = await SalesItem.create({
        order_id: salesOrder.id,
        product_id,
        quantity,
        unit_price,
        subtotal
      }, { transaction });

      // Handle manufactured_virtual products - CRITICAL LOGIC
      // For Roofing Manufacturing ERP: Allow creating invoices without immediate inventory deduction
      // Materials will be assigned later via /api/production/assign-material endpoint
      if (product.type === 'manufactured_virtual') {
        hasManufacturedItems = true;

        // Only process inventory deduction if item_assignments are provided
        // This allows creating invoices in 'queue' status without immediate deduction
        if (shouldDeductInventory && item_assignments && Array.isArray(item_assignments) && item_assignments.length > 0) {
          hasAssignments = true;
          
          // Use centralized inventory service
          const result = await processManufacturedVirtualItem({
            product,
            quantity,
            itemAssignments: item_assignments,
            salesItem,
            transaction
          });

          if (!result.success) {
            await transaction.rollback();
            return res.status(400).json({ error: result.error });
          }
        }
        // If no item_assignments provided, order will be in 'queue' status
        // Materials can be assigned later via /api/production/assign-material
      }
    }

    // Update production status if manufactured items exist
    // Status will be 'queue' if no assignments provided, or 'processing' if assignments were provided
    if (hasManufacturedItems) {
      salesOrder.production_status = hasAssignments ? 'processing' : 'queue';
      await salesOrder.save({ transaction });
    }

    // Create agent commission if agent is assigned (only for actual invoices)
    if (agent && shouldDeductInventory && agent.commission_rate > 0) {
      const commissionAmount = percentage(totalAmount, agent.commission_rate);
      
      await AgentCommission.create({
        agent_id: agent.id,
        sales_order_id: salesOrder.id,
        commission_amount: commissionAmount,
        commission_rate: agent.commission_rate,
        order_amount: totalAmount,
        payment_status: 'pending'
      }, { transaction });
    }

    // Create ledger entry for invoices (not drafts or quotations) - INSIDE transaction for ACID compliance
    if (order_type === 'invoice' && customer_id && totalAmount > 0) {
      await createLedgerEntry(
        customer_id,
        'customer',
        {
          transaction_date: salesOrder.created_at || new Date(),
          transaction_type: 'INVOICE',
          transaction_id: salesOrder.id,
          description: `Invoice ${invoiceNumber}`,
          debit_amount: totalAmount,
          credit_amount: 0,
          branch_id: finalBranchId,
          created_by: req.user.id
        },
        transaction
      );
    }

    // Commit transaction (only after all operations succeed, including ledger entry)
    await transaction.commit();

    // Fetch complete order with associations
    const completeOrder = await SalesOrder.findByPk(salesOrder.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
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

    // Get existing items
    const existingItems = await SalesItem.findAll({
      where: { order_id: id },
      transaction
    });

    // Calculate new total using precision math
    const itemSubtotals = items.map(item => 
      multiply(item.quantity, item.unit_price)
    );
    const totalAmount = sum(itemSubtotals);

    // Update draft
    draft.customer_id = customer_id || null;
    draft.total_amount = totalAmount;
    await draft.save({ transaction });

    // Update or create items efficiently
    // Match existing items by product_id and update, or create new ones
    const existingItemsMap = new Map(existingItems.map(item => [item.product_id, item]));
    const newItemProductIds = new Set(items.map(item => item.product_id));

    // Delete items that are no longer in the new items list
    const itemsToDelete = existingItems.filter(item => !newItemProductIds.has(item.product_id));
    if (itemsToDelete.length > 0) {
      await SalesItem.destroy({
        where: {
          id: { [Op.in]: itemsToDelete.map(item => item.id) }
        },
        transaction
      });
    }

    // Update existing items or create new ones
    for (const item of items) {
      const subtotal = multiply(item.quantity, item.unit_price);
      const existingItem = existingItemsMap.get(item.product_id);

      if (existingItem) {
        // Update existing item
        existingItem.quantity = item.quantity;
        existingItem.unit_price = item.unit_price;
        existingItem.subtotal = subtotal;
        await existingItem.save({ transaction });
      } else {
        // Create new item
        await SalesItem.create({
          order_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal
        }, { transaction });
      }
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
        
        // Use centralized inventory service
        const result = await processManufacturedVirtualItemForConversion({
          salesItem: item,
          product: item.product,
          quantity: item.quantity,
          itemAssignments,
          transaction
        });

        if (!result.success) {
          await transaction.rollback();
          return res.status(400).json({ error: result.error });
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
        
        // Use centralized inventory service
        const result = await processManufacturedVirtualItemForConversion({
          salesItem: item,
          product: item.product,
          quantity: item.quantity,
          itemAssignments,
          transaction
        });

        if (!result.success) {
          await transaction.rollback();
          return res.status(400).json({ error: result.error });
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
                // Reverse the inventory deduction using precision math
                batch.remaining_quantity = add(batch.remaining_quantity, assignment.quantity_deducted);
                if (batch.status === 'depleted' && greaterThan(batch.remaining_quantity, 0)) {
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

