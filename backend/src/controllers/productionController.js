import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, InventoryBatch, Product, Recipe, ItemAssignment } from '../models/index.js';
import { multiply, subtract, lessThan, lessThanOrEqual } from '../utils/mathUtils.js';
import { safeRollback } from '../utils/transactionUtils.js';
import { proposeManufacturedVirtualAssignment } from '../services/inventoryService.js';

/**
 * POST /api/production/assign-material
 * Assign raw material (coil/pallet) to a sales item
 * Validates batch attributes match sales item requirements and deducts inventory
 */
export const assignMaterial = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { sales_item_id, inventory_batch_id } = req.body;

    // Validation
    if (!sales_item_id || !inventory_batch_id) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'sales_item_id and inventory_batch_id are required'
      });
    }

    // Get sales item with product and order
    const salesItem = await SalesItem.findByPk(sales_item_id, {
      include: [
        { model: Product, as: 'product' },
        { model: SalesOrder, as: 'order' }
      ],
      transaction
    });

    if (!salesItem) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Sales item not found' });
    }

    // Verify sales item has a recipe (check if product has a recipe)
    const recipe = await Recipe.findOne({
      where: { virtual_product_id: salesItem.product_id },
      transaction
    });
    if (!recipe) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Material assignment is only allowed for products with recipes'
      });
    }

    // Verify order is in queue status
    if (salesItem.order?.production_status !== 'queue') {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Order must be in queue status to assign materials'
      });
    }

    // Get inventory batch with product
    const batch = await InventoryBatch.findByPk(inventory_batch_id, {
      include: [{ model: Product, as: 'product' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!batch) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Recipe already fetched and validated above

    // Verify batch product matches recipe raw product
    if (batch.product_id !== recipe.raw_product_id) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Inventory batch product does not match recipe raw product'
      });
    }

    // Validate batch attributes match sales item requirements
    // (Uses product variations for attribute matching)
    const validationError = await validateBatchAttributes(
      batch,
      salesItem.product,
      transaction
    );

    if (validationError) {
      await safeRollback(transaction);
      return res.status(400).json({ error: validationError });
    }

    // Calculate required raw quantity from sales quantity
    const requiredRawQuantity = multiply(salesItem.quantity, recipe.conversion_factor);

    // Check if batch has sufficient quantity
    if (lessThan(batch.remaining_quantity, requiredRawQuantity)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: `Insufficient stock in batch ${batch.instance_code || batch.batch_identifier}. Available: ${batch.remaining_quantity}, Required: ${requiredRawQuantity}`
      });
    }

    // Check if assignment already exists for this sales item
    const existingAssignment = await ItemAssignment.findOne({
      where: { sales_item_id },
      transaction
    });

    if (existingAssignment) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Material already assigned to this sales item. Use update endpoint to modify.'
      });
    }

    // Deduct inventory
    batch.remaining_quantity = subtract(batch.remaining_quantity, requiredRawQuantity);
    if (lessThanOrEqual(batch.remaining_quantity, 0)) {
      batch.status = 'depleted';
    }
    await batch.save({ transaction });

    // Create item assignment
    const assignment = await ItemAssignment.create({
      sales_item_id,
      inventory_batch_id,
      quantity_deducted: requiredRawQuantity
    }, { transaction });

    // Order remains in 'queue' status until marked as 'produced'

    await transaction.commit();

    // Fetch complete assignment with associations
    const completeAssignment = await ItemAssignment.findByPk(assignment.id, {
      include: [
        { model: SalesItem, as: 'sales_item', include: [{ model: Product, as: 'product' }] },
        {
          model: InventoryBatch,
          as: 'inventory_batch',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      message: 'Material assigned successfully',
      assignment: completeAssignment
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Validate that batch attributes match sales item requirements
 * @param {Object} batch - InventoryBatch instance
 * @param {Object} virtualProduct - Product instance (with recipe)
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<string|null>} Error message or null if valid
 */
async function validateBatchAttributes(batch, virtualProduct, transaction) {
  const batchAttributes = batch.attribute_data || {};
  const batchProduct = batch.product;

  // Get category to determine material type
  const Category = sequelize.models.Category;
  if (!Category) {
    return 'Category model not available';
  }

  const category = await Category.findByPk(batchProduct?.category_id, { transaction });
  const categoryName = category?.name?.toLowerCase() || '';

  // NOTE: Gauge and color validation REMOVED - feature deprecated in favor of variations system
  // Material assignments now rely on product variations for attribute matching

  // For Stone Tiles: Check design pattern and other attributes if needed
  if (categoryName.includes('stone') || categoryName.includes('tile')) {
    if (!batchAttributes.design_pattern || typeof batchAttributes.design_pattern !== 'string') {
      return 'Batch must have design_pattern';
    }
  }

  return null; // No validation errors
}

/**
 * GET /api/production/assignments/:sales_item_id
 * Get material assignments for a sales item
 */
export const getMaterialAssignments = async (req, res, next) => {
  try {
    const { sales_item_id } = req.params;

    const assignments = await ItemAssignment.findAll({
      where: { sales_item_id },
      include: [
        {
          model: InventoryBatch,
          as: 'inventory_batch',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: SalesItem,
          as: 'sales_item',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    res.json({ assignments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/production/assign-material/proposal
 * Generate automatic batch proposal for a sales item or ad-hoc virtual product quantity.
 * Uses recipe raw product, filters eligible batches (status in_stock), does not deduct stock.
 */
export const proposeMaterialAssignment = async (req, res, next) => {
  try {
    const { sales_item_id, product_id, quantity, branch_id } = req.body || {};

    // Derive context either from sales item or direct payload
    let virtualProductId = product_id || null;
    let finalQuantity = quantity;
    let finalBranchId = branch_id || null;

    if (sales_item_id) {
      const salesItem = await SalesItem.findByPk(sales_item_id, {
        include: [
          { model: Product, as: 'product' },
          { model: SalesOrder, as: 'order' }
        ]
      });

      if (!salesItem) {
        return res.status(404).json({ error: 'Sales item not found' });
      }

      virtualProductId = salesItem.product_id;
      finalQuantity = salesItem.quantity;
      finalBranchId = finalBranchId || salesItem.order?.branch_id || null;
    }

    if (!virtualProductId || finalQuantity === undefined) {
      return res.status(400).json({
        error: 'Provide sales_item_id or product_id with quantity'
      });
    }

    const proposalResult = await proposeManufacturedVirtualAssignment({
      productId: virtualProductId,
      quantity: finalQuantity,
      branchId: finalBranchId,
      recipe_id: req.body.recipe_id || null // Pass recipe_id if provided to ensure same recipe is used
    });

    if (!proposalResult.success) {
      return res.status(400).json({ error: proposalResult.error });
    }

    return res.json({ proposal: proposalResult.proposal });
  } catch (error) {
    next(error);
  }
};

















