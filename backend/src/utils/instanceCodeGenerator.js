import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { InventoryBatch, Product, BatchType } from '../models/index.js';

/**
 * Sanitizes string for use in instance codes by replacing invalid characters with hyphens
 * @param {string} str - The string to sanitize (SKU or batch type name)
 * @returns {string} Sanitized string
 */
const sanitizeForCode = (str) => {
  // Replace spaces and special characters (except hyphens and underscores) with hyphens
  // Remove leading/trailing hyphens and collapse multiple hyphens
  return str
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Generates the next instance code for a product in the format SKU-{BATCH_TYPE}-XXX
 * Scoped per product+branch+batch_type combination to ensure unique sequences per batch type
 * @param {string} productId - The product ID
 * @param {string} branchId - The branch ID (required for scoping)
 * @param {string} batchTypeId - The batch type ID (required for scoping and naming)
 * @param {Object} transaction - Sequelize transaction (optional, will create one if not provided)
 * @returns {Promise<string>} The generated instance code
 */
export const generateNextInstanceCode = async (productId, branchId, batchTypeId, transaction = null) => {
  // Create transaction if not provided
  const shouldCommit = !transaction;
  const txn = transaction || await sequelize.transaction();

  try {
    // Fetch product to get SKU
    const product = await Product.findByPk(productId, { transaction: txn });
    if (!product) {
      throw new Error('Product not found');
    }

    if (!branchId) {
      throw new Error('branch_id is required for instance code generation');
    }

    if (!batchTypeId) {
      throw new Error('batch_type_id is required for instance code generation');
    }

    // Fetch batch type to get name
    const batchType = await BatchType.findByPk(batchTypeId, { transaction: txn });
    if (!batchType) {
      throw new Error('Batch type not found');
    }

    if (!batchType.is_active) {
      throw new Error('Batch type is not active');
    }

    // Sanitize SKU and batch type name for use in instance code
    const sanitizedSku = sanitizeForCode(product.sku);
    const sanitizedBatchType = sanitizeForCode(batchType.name);
    const pattern = `${sanitizedSku}-${sanitizedBatchType}-`;

    // Use advisory lock to prevent concurrent instance code generation
    // Generate lock key from product_id, branch_id, and batch_type_id
    const lockKey = `instance_${productId}_${branchId}_${batchTypeId}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Acquire advisory lock (blocks until available)
    await sequelize.query(`SELECT pg_advisory_xact_lock(${lockKey})`, { transaction: txn });

    // Find existing batches for this product+branch+batch_type combination matching the pattern
    const whereClause = {
      product_id: productId,
      branch_id: branchId,
      batch_type_id: batchTypeId,
      instance_code: {
        [Op.like]: `${pattern}%`
      }
    };

    const batches = await InventoryBatch.findAll({
      where: whereClause,
      attributes: ['instance_code'],
      order: [['instance_code', 'DESC']],
      lock: txn.LOCK.UPDATE,
      transaction: txn
    });

    let maxSequence = 0;

    // Extract sequence numbers from existing codes
    for (const batch of batches) {
      if (batch.instance_code) {
        // Extract the part after the pattern
        const suffix = batch.instance_code.replace(pattern, '');
        const sequence = parseInt(suffix, 10);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    }

    // Generate next sequence number
    const nextSequence = maxSequence + 1;
    // Pad with zeros to 3 digits (e.g. 001, 002, ..., 999, 1000)
    const paddedSequence = String(nextSequence).padStart(3, '0');

    const generatedCode = `${pattern}${paddedSequence}`;

    // Commit transaction if we created it
    if (shouldCommit) {
      await txn.commit();
    }

    return generatedCode;
  } catch (error) {
    // Rollback transaction if we created it
    if (shouldCommit) {
      await txn.rollback();
    }
    throw error;
  }
};
