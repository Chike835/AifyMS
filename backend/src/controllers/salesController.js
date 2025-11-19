import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, ItemAssignment, Product, InventoryInstance, Recipe, Customer, Branch, User } from '../models/index.js';
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
      payment_status = 'unpaid'
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

    // Create sales order
    const salesOrder = await SalesOrder.create({
      invoice_number: invoiceNumber,
      customer_id: customer_id || null,
      branch_id: finalBranchId,
      user_id: req.user.id,
      total_amount: totalAmount,
      payment_status,
      production_status: 'na', // Will be updated if manufactured items exist
      is_legacy: false
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
      if (product.type === 'manufactured_virtual') {
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
          const { inventory_instance_id, quantity_deducted } = assignment;

          if (!inventory_instance_id || quantity_deducted === undefined) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: 'Each assignment must have inventory_instance_id and quantity_deducted' 
            });
          }

          // Get inventory instance with lock (FOR UPDATE)
          const inventoryInstance = await InventoryInstance.findByPk(
            inventory_instance_id,
            { 
              lock: transaction.LOCK.UPDATE,
              transaction 
            }
          );

          if (!inventoryInstance) {
            await transaction.rollback();
            return res.status(404).json({ 
              error: `Inventory instance ${inventory_instance_id} not found` 
            });
          }

          // Verify it's the correct raw product
          if (inventoryInstance.product_id !== recipe.raw_product_id) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: `Inventory instance does not match recipe raw product` 
            });
          }

          // Check sufficient stock
          const qtyToDeduct = parseFloat(quantity_deducted);
          if (inventoryInstance.remaining_quantity < qtyToDeduct) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: `Insufficient stock in ${inventoryInstance.instance_code}. Available: ${inventoryInstance.remaining_quantity}, Required: ${qtyToDeduct}` 
            });
          }

          // Deduct from inventory
          inventoryInstance.remaining_quantity -= qtyToDeduct;
          
          // Update status if depleted
          if (inventoryInstance.remaining_quantity <= 0) {
            inventoryInstance.status = 'depleted';
          }

          await inventoryInstance.save({ transaction });

          // Create item assignment record
          await ItemAssignment.create({
            sales_item_id: salesItem.id,
            inventory_instance_id,
            quantity_deducted: qtyToDeduct
          }, { transaction });
        }
      }
    }

    // Update production status if manufactured items exist
    if (hasManufacturedItems) {
      salesOrder.production_status = 'queue';
      await salesOrder.save({ transaction });
    }

    // Commit transaction
    await transaction.commit();

    // Fetch complete order with associations
    const completeOrder = await SalesOrder.findByPk(salesOrder.id, {
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
                  model: InventoryInstance,
                  as: 'inventory_instance',
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
    const { branch_id, customer_id, payment_status, production_status } = req.query;
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
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
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
                  model: InventoryInstance,
                  as: 'inventory_instance',
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
 * Update production status
 */
export const updateProductionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { production_status } = req.body;

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

    order.production_status = production_status;
    await order.save();

    res.json({
      message: 'Production status updated successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

