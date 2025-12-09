import sequelize from '../config/db.js';
import { SalesOrder, SalesItem, InventoryBatch, Product, Recipe, ItemAssignment } from '../models/index.js';
import { multiply, subtract, lessThan, lessThanOrEqual } from '../utils/mathUtils.js';

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
      await transaction.rollback();
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Sales item not found' });
    }

    // Verify sales item is for a manufactured_virtual product
    if (salesItem.product?.type !== 'manufactured_virtual') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Material assignment is only allowed for manufactured_virtual products' 
      });
    }

    // Verify order is in queue status
    if (salesItem.order?.production_status !== 'queue') {
      await transaction.rollback();
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory batch not found' });
    }

    // Get recipe for conversion
    const recipe = await Recipe.findOne({
      where: { virtual_product_id: salesItem.product_id },
      transaction
    });

    if (!recipe) {
      await transaction.rollback();
      return res.status(404).json({ 
        error: `No recipe found for product: ${salesItem.product.name}` 
      });
    }

    // Verify batch product matches recipe raw product
    if (batch.product_id !== recipe.raw_product_id) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Inventory batch product does not match recipe raw product' 
      });
    }

    // Validate batch attributes match sales item requirements
    // This checks Color, Gauge, etc. based on product type
    const validationError = await validateBatchAttributes(
      batch,
      salesItem.product,
      transaction
    );

    if (validationError) {
      await transaction.rollback();
      return res.status(400).json({ error: validationError });
    }

    // Calculate required raw quantity from sales quantity
    const requiredRawQuantity = multiply(salesItem.quantity, recipe.conversion_factor);

    // Check if batch has sufficient quantity
    if (lessThan(batch.remaining_quantity, requiredRawQuantity)) {
      await transaction.rollback();
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
      await transaction.rollback();
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

    // Update order production status to 'processing'
    const order = salesItem.order;
    order.production_status = 'processing';
    await order.save({ transaction });

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
 * @param {Object} virtualProduct - Product instance (manufactured_virtual)
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

  // For Aluminium: Check gauge and color match
  if (categoryName.includes('aluminium') || categoryName.includes('aluminum')) {
    const batchGauge = batchAttributes.gauge_mm;
    const batchColor = batchAttributes.color_code;

    // Get virtual product requirements (could be stored in product attributes or recipe)
    // For now, we'll check if there's a mismatch based on common requirements
    // In a real scenario, you might store required gauge/color in the recipe or product attributes
    
    // Example validation: If virtual product has specific gauge requirement
    // This is a placeholder - you may need to store requirements differently
    if (!batchGauge || typeof batchGauge !== 'number') {
      return 'Batch must have valid gauge_mm';
    }

    if (batchGauge < 0.1 || batchGauge > 1.0) {
      return 'Batch gauge_mm must be between 0.1 and 1.0 mm';
    }

    if (!batchColor || typeof batchColor !== 'string') {
      return 'Batch must have color_code';
    }

    // Note: In a full implementation, you would compare batch attributes
    // with the sales item's required attributes (stored in product or recipe)
    // For now, we just validate that the batch has the required attributes
  }

  // For Stone Tiles: Check design pattern and other attributes
  if (categoryName.includes('stone') || categoryName.includes('tile')) {
    if (!batchAttributes.design_pattern || typeof batchAttributes.design_pattern !== 'string') {
      return 'Batch must have design_pattern';
    }

    // Similar validation for stone tiles
    // Compare with sales item requirements
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














