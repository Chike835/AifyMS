import { Op } from 'sequelize';
import { InventoryBatch, Recipe, ItemAssignment, Product } from '../models/index.js';
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
    if (!virtualProduct) {
      return {
        success: false,
        error: 'Product is required'
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
 * @param {string} params.recipe_id - Optional recipe ID to use (ensures same recipe as frontend)
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 */
export const processManufacturedVirtualItem = async ({
  product,
  quantity,
  itemAssignments,
  salesItem,
  transaction,
  recipe_id = null
}) => {
  // Validate that item_assignments exist
  if (!itemAssignments || !Array.isArray(itemAssignments) || itemAssignments.length === 0) {
    return {
      success: false,
      error: `Manufactured product ${product.name} requires item_assignments array`
    };
  }

  // Get recipe for this virtual product
  // If recipe_id is provided, use that specific recipe (for multi-recipe products)
  // Otherwise, fall back to findOne for backward compatibility
  let recipe;
  if (recipe_id) {
    recipe = await Recipe.findByPk(recipe_id, { transaction });
    if (!recipe) {
      return {
        success: false,
        error: `Recipe with ID ${recipe_id} not found for product ${product.name}`
      };
    }
    // Verify the recipe belongs to this product
    if (recipe.virtual_product_id !== product.id) {
      return {
        success: false,
        error: `Recipe ${recipe_id} does not belong to product ${product.id} (${product.name})`
      };
    }
  } else {
    recipe = await Recipe.findOne({
      where: { virtual_product_id: product.id },
      transaction
    });
  }

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
  try {
    for (const assignment of itemAssignments) {
      const { inventory_batch_id, quantity_deducted } = assignment;

      if (!inventory_batch_id || quantity_deducted === undefined) {
        return {
          success: false,
          error: 'Each assignment must have inventory_batch_id and quantity_deducted'
        };
      }

      // Validate quantity
      const qtyToDeduct = parseFloat(quantity_deducted);
      if (qtyToDeduct <= 0) {
        return {
          success: false,
          error: `Invalid assignment quantity: ${qtyToDeduct}. Must be greater than 0.`
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
        // Fetch product names for detailed error message
        const [batchProduct, rawProduct] = await Promise.all([
          Product.findByPk(inventoryBatch.product_id, { 
            attributes: ['id', 'name', 'sku'],
            transaction 
          }),
          Product.findByPk(recipe.raw_product_id, { 
            attributes: ['id', 'name', 'sku'],
            transaction 
          })
        ]);

        const batchProductName = batchProduct?.name || 'Unknown';
        const rawProductName = rawProduct?.name || 'Unknown';
        const batchProductSku = batchProduct?.sku || 'N/A';
        const rawProductSku = rawProduct?.sku || 'N/A';

        // Enhanced error logging
        console.error('Inventory batch product mismatch:', {
          manufacturedProduct: {
            id: product.id,
            name: product.name,
            sku: product.sku
          },
          inventoryBatch: {
            id: inventoryBatch.id,
            instance_code: inventoryBatch.instance_code,
            batch_identifier: inventoryBatch.batch_identifier,
            product_id: inventoryBatch.product_id,
            product_name: batchProductName,
            product_sku: batchProductSku
          },
          recipe: {
            id: recipe.id,
            raw_product_id: recipe.raw_product_id,
            raw_product_name: rawProductName,
            raw_product_sku: rawProductSku
          },
          salesItemId: salesItem?.id,
          assignment: {
            inventory_batch_id,
            quantity_deducted
          }
        });

        return {
          success: false,
          error: `Inventory batch product mismatch for "${product.name}". The batch "${inventoryBatch.instance_code || inventoryBatch.batch_identifier}" contains "${batchProductName}" (SKU: ${batchProductSku}), but the recipe requires "${rawProductName}" (SKU: ${rawProductSku}). Please re-select the correct materials.`
        };
      }

      // Check sufficient stock
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
  } catch (error) {
    console.error('Error in processManufacturedVirtualItem:', error);
    return {
      success: false,
      error: error.message || 'Error processing manufactured item assignments'
    };
  }
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
  try {
    for (const assignment of itemAssignments) {
      const { inventory_batch_id, quantity_deducted } = assignment;

      // Validate quantity
      const qtyToDeduct = parseFloat(quantity_deducted);
      if (qtyToDeduct <= 0) {
        return {
          success: false,
          error: `Invalid assignment quantity: ${qtyToDeduct}. Must be greater than 0.`
        };
      }

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

      if (lessThan(batch.remaining_quantity, qtyToDeduct)) {
        return {
          success: false,
          error: `Insufficient stock in ${batch.instance_code || batch.batch_identifier}`
        };
      }

      // Deduct inventory using precision math
      batch.remaining_quantity = subtract(batch.remaining_quantity, qtyToDeduct);
      if (lessThanOrEqual(batch.remaining_quantity, 0)) {
        batch.status = 'depleted';
      }
      await batch.save({ transaction });

      // Create item assignment
      await ItemAssignment.create({
        sales_item_id: salesItem.id,
        inventory_batch_id,
        quantity_deducted: qtyToDeduct
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
  } catch (error) {
    console.error('Error in processManufacturedVirtualItemForConversion:', error);
    return {
      success: false,
      error: error.message || 'Error processing manufactured item conversion'
    };
  }
};

/**
 * Process regular product inventory deduction (FIFO)
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.product - Product model instance
 * @param {number|string} params.quantity - Quantity to deduct
 * @param {string} params.branchId - Branch ID to deduct from
 * @param {Object} params.salesItem - SalesItem model instance
 * @param {Object} params.transaction - Sequelize transaction object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const processRegularItem = async ({
  product,
  quantity,
  branchId,
  salesItem,
  transaction
}) => {
  try {
    if (!product || !quantity || !branchId || !salesItem) {
      return { success: false, error: 'Missing required parameters for stock deduction' };
    }

    let remainingToDeduct = parseFloat(quantity);

    // Fetch available batches in FIFO order with LOCK
    const batches = await InventoryBatch.findAll({
      where: {
        product_id: product.id,
        branch_id: branchId,
        status: 'in_stock',
        remaining_quantity: { [Op.gt]: 0 }
      },
      order: [['created_at', 'ASC']],
      lock: transaction.LOCK.UPDATE, // Critical for TOCTOU protection
      transaction
    });

    // Calculate total available
    const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.remaining_quantity), 0);

    if (lessThan(totalAvailable, remainingToDeduct)) {
      return {
        success: false,
        error: `Insufficient stock for ${product.name}. Requested: ${remainingToDeduct}, Available: ${totalAvailable}`
      };
    }

    // Deduct from batches
    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const currentBatchQty = parseFloat(batch.remaining_quantity);
      const deductionAmount = Math.min(currentBatchQty, remainingToDeduct);

      // Update batch
      batch.remaining_quantity = subtract(currentBatchQty, deductionAmount);
      if (lessThanOrEqual(batch.remaining_quantity, 0)) {
        batch.status = 'depleted';
      }
      await batch.save({ transaction });

      // Create assignment reference
      await ItemAssignment.create({
        sales_item_id: salesItem.id,
        inventory_batch_id: batch.id,
        quantity_deducted: deductionAmount
      }, { transaction });

      remainingToDeduct = subtract(remainingToDeduct, deductionAmount);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Process regular item with specific batch assignments
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.product - Product model instance
 * @param {number|string} params.quantity - Quantity to deduct
 * @param {Array} params.itemAssignments - Array of { inventory_batch_id, quantity_deducted }
 * @param {Object} params.salesItem - SalesItem model instance
 * @param {Object} params.transaction - Sequelize transaction object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const processRegularItemWithBatches = async ({
  product,
  quantity,
  itemAssignments,
  salesItem,
  transaction
}) => {
  if (!itemAssignments || !Array.isArray(itemAssignments) || itemAssignments.length === 0) {
    return { success: false, error: 'Assignments array required for manual batch selection' };
  }

  // Calculate total assigned
  const assignedQuantities = itemAssignments.map(a => parseFloat(a.quantity_deducted || 0));
  const totalAssigned = sum(assignedQuantities);

  // Validate total matches quantity
  if (!equals(totalAssigned, parseFloat(quantity))) {
    return {
      success: false,
      error: `Total assigned quantity (${totalAssigned}) does not match sale quantity (${quantity}) for product ${product.name}`
    };
  }

  // Process each assignment
  try {
    for (const assignment of itemAssignments) {
      const { inventory_batch_id, quantity_deducted } = assignment;

      if (!inventory_batch_id || quantity_deducted === undefined) {
        return {
          success: false,
          error: 'Each assignment must have inventory_batch_id and quantity_deducted'
        };
      }

      // Validate quantity
      const qtyToDeduct = parseFloat(quantity_deducted);
      if (qtyToDeduct <= 0) {
        return {
          success: false,
          error: `Invalid assignment quantity: ${qtyToDeduct}. Must be greater than 0.`
        };
      }

      // Get inventory batch with lock
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

      // Verify product match
      if (batch.product_id !== product.id) {
        return {
          success: false,
          error: `Batch ${batch.instance_code} does not belong to product ${product.name}`
        };
      }

      // Check stock
      if (lessThan(batch.remaining_quantity, qtyToDeduct)) {
        return {
          success: false,
          error: `Insufficient stock in ${batch.instance_code}. Available: ${batch.remaining_quantity}, Required: ${qtyToDeduct}`
        };
      }

      // Deduct
      batch.remaining_quantity = subtract(batch.remaining_quantity, qtyToDeduct);
      if (lessThanOrEqual(batch.remaining_quantity, 0)) {
        batch.status = 'depleted';
      }
      await batch.save({ transaction });

      // Create assignment
      await ItemAssignment.create({
        sales_item_id: salesItem.id,
        inventory_batch_id,
        quantity_deducted: qtyToDeduct
      }, { transaction });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in processRegularItemWithBatches:', error);
    return {
      success: false,
      error: error.message || 'Error processing regular item batch assignments'
    };
  }
};

/**
 * Propose automatic raw material assignments for a manufactured_virtual product
 * - Uses recipe to determine required raw product and quantity
 * - Selects batches FIFO (created_at) limited to the recipe's raw product
 * - Does NOT deduct inventory; only returns a proposal for user confirmation
 *
 * @param {Object} params
 * @param {string} params.productId - Virtual/manufactured product id
 * @param {number|string} params.quantity - Quantity of virtual product to produce/sell
 * @param {string|null} params.branchId - Optional branch filter for batches
 * @param {string|null} params.recipe_id - Optional recipe ID to use (ensures same recipe as frontend)
 * @returns {Promise<{success: boolean, error?: string, proposal?: Object}>}
 */
export const proposeManufacturedVirtualAssignment = async ({
  productId,
  quantity,
  branchId = null,
  recipe_id = null
}) => {
  try {
    if (!productId || quantity === undefined) {
      return { success: false, error: 'productId and quantity are required' };
    }

    const parsedQty = parseFloat(quantity);
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      return { success: false, error: 'quantity must be greater than 0' };
    }

    // Fetch recipe - use specific recipe_id if provided, otherwise findOne for backward compatibility
    let recipe;
    if (recipe_id) {
      recipe = await Recipe.findByPk(recipe_id, {
        include: [
          { model: Product, as: 'virtual_product', attributes: ['id', 'name', 'base_unit'] },
          { model: Product, as: 'raw_product', attributes: ['id', 'name', 'base_unit'] }
        ]
      });
      if (!recipe) {
        return { success: false, error: `Recipe with ID ${recipe_id} not found` };
      }
      // Verify the recipe belongs to this product
      if (recipe.virtual_product_id !== productId) {
        return { success: false, error: `Recipe ${recipe_id} does not belong to product ${productId}` };
      }
    } else {
      recipe = await Recipe.findOne({
        where: { virtual_product_id: productId },
        include: [
          { model: Product, as: 'virtual_product', attributes: ['id', 'name', 'base_unit'] },
          { model: Product, as: 'raw_product', attributes: ['id', 'name', 'base_unit'] }
        ]
      });
    }

    if (!recipe) {
      return { success: false, error: 'Recipe not found for this product' };
    }

    const requiredRawQuantity = multiply(parsedQty, recipe.conversion_factor);

    // Fetch eligible batches for the raw product
    const batchWhere = {
      product_id: recipe.raw_product_id,
      status: 'in_stock',
      remaining_quantity: { [Op.gt]: 0 }
    };
    if (branchId) {
      batchWhere.branch_id = branchId;
    }

    const batches = await InventoryBatch.findAll({
      where: batchWhere,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'base_unit'] }],
      order: [['created_at', 'ASC']]
    });

    const totalAvailable = batches.reduce(
      (sumQty, b) => sumQty + parseFloat(b.remaining_quantity || 0),
      0
    );

    if (lessThan(totalAvailable, requiredRawQuantity)) {
      return {
        success: false,
        error: `Insufficient raw material. Required ${requiredRawQuantity}, available ${totalAvailable}`
      };
    }

    // Build FIFO proposal without deduction
    let remainingToCover = requiredRawQuantity;
    const suggestions = [];

    for (const batch of batches) {
      if (remainingToCover <= 0) break;

      const availableQty = parseFloat(batch.remaining_quantity);
      const allocate = Math.min(availableQty, remainingToCover);

      suggestions.push({
        inventory_batch_id: batch.id,
        instance_code: batch.instance_code || batch.batch_identifier,
        available_quantity: availableQty,
        quantity_deducted: allocate,
        product_id: batch.product_id,
        branch_id: batch.branch_id,
        batch_identifier: batch.batch_identifier || null,
        base_unit: batch.product?.base_unit || recipe.raw_product?.base_unit || 'KG'
      });

      remainingToCover = subtract(remainingToCover, allocate);
    }

    return {
      success: true,
      proposal: {
        required_raw_quantity: requiredRawQuantity,
        recipe: {
          id: recipe.id,
          conversion_factor: recipe.conversion_factor,
          raw_product_id: recipe.raw_product_id,
          raw_product_name: recipe.raw_product?.name,
          raw_product_base_unit: recipe.raw_product?.base_unit,
          virtual_product_id: recipe.virtual_product_id,
          virtual_product_name: recipe.virtual_product?.name
        },
        suggestions
      }
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to generate proposal' };
  }
};

export default {
  processManufacturedVirtualItem,
  processManufacturedVirtualItemForConversion,
  calculateRequiredRawMaterial,
  processRegularItem,
  processRegularItemWithBatches,
  proposeManufacturedVirtualAssignment
};
