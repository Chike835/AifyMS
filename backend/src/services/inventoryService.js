import { InventoryBatch, Recipe, ItemAssignment } from '../models/index.js';
import { multiply, sum, equals, subtract, lessThan, lessThanOrEqual } from '../utils/mathUtils.js';

/**
 * Inventory Service
 * 
 * Centralized service for handling manufactured_virtual product inventory operations.
 * This service eliminates code duplication across createSale, convertDraftToInvoice, and convertQuotationToInvoice.
 */

/**
 * Calculate required raw material quantity based on sales item quantity and recipe
 * 
 * @param {Object} params - Calculation parameters
 * @param {Object} params.virtualProduct - Product model instance (manufactured_virtual)
 * @param {number|string} params.salesQuantity - Quantity of the virtual product to be sold
 * @param {Object} params.transaction - Sequelize transaction object (optional)
 * @returns {Promise<{success: boolean, requiredQuantity?: number, error?: string, recipe?: Object}>} Result object
 */
export const calculateRequiredRawMaterial = async ({
  virtualProduct,
  salesQuantity,
  transaction = null
}) => {
  try {
    if (!virtualProduct || virtualProduct.type !== 'manufactured_virtual') {
      return {
        success: false,
        error: 'Product must be of type manufactured_virtual'
      };
    }

    if (!salesQuantity || salesQuantity <= 0) {
      return {
        success: false,
        error: 'Sales quantity must be greater than 0'
      };
    }

    // Get recipe for this virtual product
    const recipe = await Recipe.findOne({
      where: { virtual_product_id: virtualProduct.id },
      transaction
    });

    if (!recipe) {
      return {
        success: false,
        error: `No recipe found for product: ${virtualProduct.name}`
      };
    }

    // Calculate required raw quantity
    const requiredQuantity = multiply(salesQuantity, recipe.conversion_factor);

    return {
      success: true,
      requiredQuantity,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        conversion_factor: recipe.conversion_factor,
        wastage_margin: recipe.wastage_margin
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error calculating required raw material'
    };
  }
};

/**
 * Process manufactured virtual item with inventory deductions
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.product - Product model instance
 * @param {number|string} params.quantity - Quantity of the manufactured product
 * @param {Array} params.itemAssignments - Array of { inventory_batch_id, quantity_deducted }
 * @param {Object} params.salesItem - SalesItem model instance (for creating ItemAssignment)
 * @param {Object} params.transaction - Sequelize transaction object
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 */
export const processManufacturedVirtualItem = async ({
  product,
  quantity,
  itemAssignments,
  salesItem,
  transaction
}) => {
  // Validate that item_assignments exist
  if (!itemAssignments || !Array.isArray(itemAssignments) || itemAssignments.length === 0) {
    return {
      success: false,
      error: `Manufactured product ${product.name} requires item_assignments array`
    };
  }

  // Get recipe for this virtual product
  const recipe = await Recipe.findOne({
    where: { virtual_product_id: product.id },
    transaction
  });

  if (!recipe) {
    return {
      success: false,
      error: `No recipe found for manufactured product ${product.name}`
    };
  }

  // Calculate total raw material needed
  const totalRawMaterialNeeded = multiply(quantity, recipe.conversion_factor);

  // Verify total assigned quantity matches requirement
  const assignedQuantities = itemAssignments.map(a => parseFloat(a.quantity_deducted || 0));
  const totalAssigned = sum(assignedQuantities);

  if (!equals(totalAssigned, totalRawMaterialNeeded)) {
    return {
      success: false,
      error: `Total assigned quantity (${totalAssigned}) does not match required (${totalRawMaterialNeeded}) for product ${product.name}`
    };
  }

  // Process each assignment
  for (const assignment of itemAssignments) {
    const { inventory_batch_id, quantity_deducted } = assignment;

    if (!inventory_batch_id || quantity_deducted === undefined) {
      return {
        success: false,
        error: 'Each assignment must have inventory_batch_id and quantity_deducted'
      };
    }

    // Get inventory batch with lock (FOR UPDATE)
    const inventoryBatch = await InventoryBatch.findByPk(
      inventory_batch_id,
      { 
        lock: transaction.LOCK.UPDATE,
        transaction 
      }
    );

    if (!inventoryBatch) {
      return {
        success: false,
        error: `Inventory batch ${inventory_batch_id} not found`
      };
    }

    // Verify it's the correct raw product
    if (inventoryBatch.product_id !== recipe.raw_product_id) {
      return {
        success: false,
        error: `Inventory instance does not match recipe raw product`
      };
    }

    // Check sufficient stock
    const qtyToDeduct = parseFloat(quantity_deducted);
    if (lessThan(inventoryBatch.remaining_quantity, qtyToDeduct)) {
      return {
        success: false,
        error: `Insufficient stock in ${inventoryBatch.instance_code || inventoryBatch.batch_identifier}. Available: ${inventoryBatch.remaining_quantity}, Required: ${qtyToDeduct}`
      };
    }

    // Deduct from inventory using precision math
    inventoryBatch.remaining_quantity = subtract(inventoryBatch.remaining_quantity, qtyToDeduct);
    
    // Update status if depleted
    if (lessThanOrEqual(inventoryBatch.remaining_quantity, 0)) {
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

  return { success: true };
};

/**
 * Process manufactured virtual item for draft/quotation conversion
 * Similar to processManufacturedVirtualItem but works with existing SalesItem
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.salesItem - SalesItem model instance (already exists)
 * @param {Object} params.product - Product model instance
 * @param {number|string} params.quantity - Quantity of the manufactured product
 * @param {Array} params.itemAssignments - Array of { inventory_batch_id, quantity_deducted }
 * @param {Object} params.transaction - Sequelize transaction object
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 */
export const processManufacturedVirtualItemForConversion = async ({
  salesItem,
  product,
  quantity,
  itemAssignments,
  transaction
}) => {
  // Validate that item_assignments exist
  if (!itemAssignments || !Array.isArray(itemAssignments) || itemAssignments.length === 0) {
    return {
      success: false,
      error: `Coil assignments required for manufactured product: ${product.name}`
    };
  }

  // Get recipe
  const recipe = await Recipe.findOne({
    where: { virtual_product_id: product.id },
    transaction
  });

  if (!recipe) {
    return {
      success: false,
      error: `No recipe found for product: ${product.name}`
    };
  }

  // Calculate required quantity
  const requiredQty = multiply(quantity, recipe.conversion_factor);
  const assignedQuantities = itemAssignments.map(a => parseFloat(a.quantity_deducted || 0));
  const totalAssigned = sum(assignedQuantities);

  // Process each assignment
  for (const assignment of itemAssignments) {
    const { inventory_batch_id, quantity_deducted } = assignment;

    // Get and lock inventory instance
    const batch = await InventoryBatch.findByPk(inventory_batch_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!batch) {
      return {
        success: false,
        error: `Inventory batch not found: ${inventory_batch_id}`
      };
    }

    if (lessThan(batch.remaining_quantity, quantity_deducted)) {
      return {
        success: false,
        error: `Insufficient stock in ${batch.instance_code || batch.batch_identifier}`
      };
    }

    // Deduct inventory using precision math
    batch.remaining_quantity = subtract(batch.remaining_quantity, quantity_deducted);
    if (lessThanOrEqual(batch.remaining_quantity, 0)) {
      batch.status = 'depleted';
    }
    await batch.save({ transaction });

    // Create item assignment
    await ItemAssignment.create({
      sales_item_id: salesItem.id,
      inventory_batch_id,
      quantity_deducted
    }, { transaction });
  }

  // Verify total assigned
  if (!equals(totalAssigned, requiredQty)) {
    return {
      success: false,
      error: `Assigned quantity mismatch for ${product.name}`
    };
  }

  return { success: true };
};

export default {
  processManufacturedVirtualItem,
  processManufacturedVirtualItemForConversion,
  calculateRequiredRawMaterial
};





