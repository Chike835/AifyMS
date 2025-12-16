import { Product, PriceHistory, User, InventoryBatch, Branch, Category, Unit, TaxRate, ProductBrand, ProductBusinessLocation, BatchType, CategoryBatchType, ProductVariationAssignment, ProductVariant, ProductVariation, ProductVariationValue, PurchaseItem, Purchase, SalesItem, SalesOrder } from '../models/index.js';
import * as variantService from '../services/variantService.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { VALID_PRODUCT_TYPES } from '../utils/constants.js';
import { safeRollback } from '../utils/transactionUtils.js';

const isSuperAdmin = (req) => req.user?.role_name === 'Super Admin';

const ensureCategoryAccess = async (req, categoryId, transaction) => {
  if (!categoryId) {
    return null;
  }

  const category = await Category.findByPk(categoryId, { transaction });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  // Branch check removed as branch_id is no longer in categories table
  // Categories are now global or managed differently

  return category;
};

/**
 * POST /api/products
 * Create a new product
 */
export const createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      sku,
      name,
      type,
      base_unit,
      unit_id,
      sale_price,
      cost_price,
      cost_price_inc_tax,
      tax_rate,
      tax_rate_id,
      is_taxable,
      selling_price_tax_type,
      profit_margin,
      brand,
      brand_id,
      category,
      category_id,
      sub_category_id,
      weight,
      manage_stock,
      not_for_selling,
      image_url,
      barcode_type,
      alert_quantity,
      reorder_quantity,
      woocommerce_enabled,
      business_location_ids,
      variation_ids // Array of variation IDs for variable products
    } = req.body;

    // Validation
    if (!sku || !name || !type || !base_unit || sale_price === undefined) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Missing required fields: sku, name, type, base_unit, sale_price'
      });
    }

    // Validate product type using shared constants
    if (!VALID_PRODUCT_TYPES.includes(type)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: `Invalid product type. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`
      });
    }

    // Validate selling price tax type if provided
    if (selling_price_tax_type && !['inclusive', 'exclusive'].includes(selling_price_tax_type)) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Invalid selling_price_tax_type. Must be one of: inclusive, exclusive'
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku }, transaction });
    if (existingProduct) {
      await safeRollback(transaction);
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }

    let categoryRecord = null;
    try {
      categoryRecord = await ensureCategoryAccess(req, category_id, transaction);
      if (sub_category_id) {
        await ensureCategoryAccess(req, sub_category_id, transaction);
      }
    } catch (categoryError) {
      await safeRollback(transaction);
      return res.status(categoryError.statusCode || 500).json({ error: categoryError.message });
    }

    // Validate attribute_default_values against category schema if category is provided
    if (categoryRecord) {
      if (categoryRecord.attribute_schema && Array.isArray(categoryRecord.attribute_schema)) {
        const schema = categoryRecord.attribute_schema;
        const providedAttributes = req.body.attribute_default_values || {};

        // Validate each attribute in schema
        for (const attr of schema) {
          if (attr.required && providedAttributes[attr.name] === undefined) {
            await safeRollback(transaction);
            return res.status(400).json({
              error: `Required attribute "${attr.name}" is missing`
            });
          }

          // Validate attribute type and values
          if (providedAttributes[attr.name] !== undefined) {
            if (attr.type === 'select' && attr.options) {
              if (!attr.options.includes(providedAttributes[attr.name])) {
                await safeRollback(transaction);
                return res.status(400).json({
                  error: `Invalid value for attribute "${attr.name}". Must be one of: ${attr.options.join(', ')}`
                });
              }
            }
          }
        }
      }
    }

    // Create product
    const product = await Product.create({
      sku,
      name,
      type,
      base_unit,
      unit_id: unit_id || null,
      sale_price,
      cost_price: cost_price || null,
      cost_price_inc_tax: cost_price_inc_tax || null,
      tax_rate: tax_rate || 0,
      tax_rate_id: tax_rate_id || null,
      is_taxable: is_taxable || false,
      selling_price_tax_type: selling_price_tax_type || 'exclusive',
      profit_margin: profit_margin || 25.00,
      brand: brand || null,
      brand_id: brand_id || null,
      category: category || null,
      category_id: category_id || null,
      sub_category_id: sub_category_id || null,
      weight: weight || null,
      manage_stock: manage_stock !== undefined ? manage_stock : true,
      not_for_selling: not_for_selling || false,
      image_url: image_url || null,
      barcode_type: barcode_type || 'CODE128',
      alert_quantity: alert_quantity || 0,
      reorder_quantity: reorder_quantity || 0,
      woocommerce_enabled: woocommerce_enabled || false,
      is_active: true,
      attribute_default_values: req.body.attribute_default_values || {}
    }, { transaction });

    // Handle business location assignments
    if (business_location_ids && Array.isArray(business_location_ids) && business_location_ids.length > 0) {
      const locationRecords = business_location_ids.map(branchId => ({
        product_id: product.id,
        branch_id: branchId
      }));
      await ProductBusinessLocation.bulkCreate(locationRecords, { transaction });
    }



    // Handle variable product assignments
    if (type === 'variable' && variation_ids && Array.isArray(variation_ids)) {
      const assignmentRecords = variation_ids.map(varId => ({
        product_id: product.id,
        variation_id: varId
      }));
      await ProductVariationAssignment.bulkCreate(assignmentRecords, { transaction });
    }

    await transaction.commit();

    // Reload with associations
    const productWithDetails = await Product.findByPk(product.id, {
      include: [
        { model: Branch, as: 'business_locations', attributes: ['id', 'name', 'code'] },
        { model: ProductBrand, as: 'brandAttribute', attributes: ['id', 'name'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'name', 'abbreviation'] },
        { model: TaxRate, as: 'taxRate', attributes: ['id', 'name', 'rate'] }
      ]
    });

    res.status(201).json({
      message: 'Product created successfully',
      product: productWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/products
 * List all products with advanced filtering, pagination, and stock calculation
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      type,
      search,
      category_id,
      unit_id,
      tax_rate_id,
      brand_id,
      branch_id,
      status, // 'active', 'inactive', 'all'
      not_for_selling,
      page = 1,
      limit = 25,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    // Type filter
    if (type && type !== 'all') {
      where.type = type;
    }

    // Optimized filtering using is_variant_child column
    // This avoids fetching all variant IDs into memory
    // If include_variants is true, include variant children; otherwise exclude them
    const includeVariants = req.query.include_variants === 'true';
    if (!includeVariants) {
      where.is_variant_child = false;
    } else {
      // When including variants, exclude parent variable products
      where[Op.or] = [
        { is_variant_child: true },
        { type: { [Op.ne]: 'variable' } }
      ];
    }

    // Search filter (applied after variant filtering)
    if (search) {
      const searchConditions = [
        { name: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
      
      // If we already have Op.or (from variant filtering), combine with Op.and
      if (where[Op.or]) {
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: searchConditions }
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = searchConditions;
      }
    }

    /* REMOVED: Inefficient subquery logic
    const childProductIds = await ProductVariant.findAll({
      attributes: ['product_id'],
      raw: true
    }).then(items => {
      const ids = items.map(i => i.product_id).filter(id => id !== null);
      return [...new Set(ids)]; // Remove duplicates
    });

    if (childProductIds.length > 0) {
      where.id = { [Op.notIn]: childProductIds };
    }
    */

    // Category filter
    if (category_id) {
      where.category_id = category_id;
    }

    // Unit filter
    if (unit_id) {
      where.unit_id = unit_id;
    }

    // Tax rate filter
    if (tax_rate_id) {
      where.tax_rate_id = tax_rate_id;
    }

    // Brand filter
    if (brand_id) {
      where.brand_id = brand_id;
    }

    // Status filter (active/inactive)
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    // Not for selling filter
    if (not_for_selling === 'true') {
      where.not_for_selling = true;
    } else if (not_for_selling === 'false') {
      where.not_for_selling = false;
    }

    // Build includes
    const includes = [
      { model: ProductBrand, as: 'brandAttribute', attributes: ['id', 'name'] },
      { model: Category, as: 'categoryRef', attributes: ['id', 'name'] },
      { model: Category, as: 'subCategory', attributes: ['id', 'name'] },
      { model: Unit, as: 'unit', attributes: ['id', 'name', 'abbreviation'] },
      { model: TaxRate, as: 'taxRate', attributes: ['id', 'name', 'rate'] },
      { model: Branch, as: 'business_locations', attributes: ['id', 'name', 'code'] }
    ];

    // Business location filter (only include products that have at least one of the specified branches)
    if (branch_id) {
      includes[includes.length - 1].where = { id: branch_id };
      includes[includes.length - 1].required = true;
    }

    // Pagination
    let queryLimit = parseInt(limit);
    let queryOffset = (parseInt(page) - 1) * queryLimit;

    if (queryLimit < 1) {
      queryLimit = null;
      queryOffset = null;
    }

    // Allowed sort columns
    const allowedSortColumns = ['created_at', 'name', 'sku', 'sale_price', 'cost_price', 'type'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: includes,
      order: [[sortColumn, order]],
      limit: queryLimit,
      offset: queryOffset,
      distinct: true
    });

    // CONSISTENCY FIX: Use InventoryBatch (source of truth) instead of potentially stale ProductStockSummary
    // This matches the logic in getProductById for consistency
    const productIds = products.map(p => p.id);

    // Build stock query with branch filter if applicable
    const stockWhere = {
      product_id: { [Op.in]: productIds },
      status: 'in_stock'
    };

    // Check if we are filtering by branch in the main query
    const branchFilter = includes.find(inc => inc.model === Branch && inc.where);
    if (branchFilter) {
      stockWhere.branch_id = branchFilter.where.id;
    }

    const stockData = await InventoryBatch.findAll({
      where: stockWhere,
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_stock']
      ],
      group: ['product_id'],
      raw: true
    });

    // Create a map of product_id -> stock
    const stockMap = {};
    stockData.forEach(s => {
      stockMap[s.product_id] = parseFloat(s.total_stock) || 0;
    });

    // Filter cost_price based on permission and add stock
    const canViewCost = req.user?.permissions?.includes('product_view_cost');
    const productsData = products.map(product => {
      const productData = product.toJSON();
      if (!canViewCost) {
        delete productData.cost_price;
        delete productData.cost_price_inc_tax;
      }
      productData.current_stock = stockMap[product.id] || 0;
      return productData;
    });

    // Calculate totals for the footer
    const totals = {
      total_stock: Object.values(stockMap).reduce((sum, val) => sum + val, 0),
      total_purchase_price: productsData.reduce((sum, p) => sum + (parseFloat(p.cost_price) || 0), 0),
      total_selling_price: productsData.reduce((sum, p) => sum + (parseFloat(p.sale_price) || 0), 0)
    };

    res.json({
      products: productsData,
      totals,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: queryLimit ? Math.ceil(count / queryLimit) : 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Get product by ID
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductBrand, as: 'brandAttribute', attributes: ['id', 'name'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name'] },
        { model: Category, as: 'subCategory', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'name', 'abbreviation'] },
        { model: TaxRate, as: 'taxRate', attributes: ['id', 'name', 'rate'] },
        { model: Branch, as: 'business_locations', attributes: ['id', 'name', 'code'] },
        {
          model: ProductVariant,
          as: 'variants',
          separate: true, // Run as separate query for performance
          order: [['id', 'ASC']],
          include: [
            { model: Product, as: 'child', attributes: ['id', 'sku', 'name', 'sale_price'] }
          ]
        },
        {
          model: ProductVariationAssignment,
          as: 'variation_assignments',
          include: [
            {
              model: ProductVariation,
              as: 'variation',
              include: [
                {
                  model: ProductVariationValue,
                  as: 'values',
                  attributes: ['id', 'value', 'display_order']
                }
              ]
            }
          ]
        }
      ]
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = product.toJSON();
    const canViewCost = req.user?.permissions?.includes('product_view_cost');
    if (!canViewCost) {
      delete productData.cost_price;
      delete productData.cost_price_inc_tax;
    }

    // Ensure variants is always an array (defensive check)
    if (!Array.isArray(productData.variants)) {
      console.log(`[getProductById] Product ${id} variants is not an array (type: ${typeof productData.variants}), defaulting to empty array`);
      productData.variants = [];
    }

    // Get current stock
    const totalStock = await InventoryBatch.sum('remaining_quantity', {
      where: {
        product_id: id,
        status: 'in_stock'
      }
    });
    productData.current_stock = parseFloat(totalStock) || 0;

    // Calculate stock for variant child products
    if (productData.variants && productData.variants.length > 0) {
      const childProductIds = productData.variants
        .filter(v => v.child && v.child.id)
        .map(v => v.child.id);

      if (childProductIds.length > 0) {
        const childStockData = await InventoryBatch.findAll({
          where: {
            product_id: { [Op.in]: childProductIds },
            status: 'in_stock'
          },
          attributes: [
            'product_id',
            [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_stock']
          ],
          group: ['product_id'],
          raw: true
        });

        // Create a map of product_id -> stock
        const childStockMap = {};
        childStockData.forEach(s => {
          childStockMap[s.product_id] = parseFloat(s.total_stock) || 0;
        });

        // Update variant child products with calculated stock
        productData.variants.forEach(variant => {
          if (variant.child && variant.child.id) {
            variant.child.current_stock = childStockMap[variant.child.id] || 0;
          }
        });
      }
    }

    // Debug logging for variants
    console.log(`[getProductById] Product ${id} has ${productData.variants.length} variants`);
    if (productData.variants.length > 0) {
      const variantsWithChild = productData.variants.filter(v => v?.child).length;
      const variantsWithoutChild = productData.variants.length - variantsWithChild;
      console.log(`[getProductById] Variants with child: ${variantsWithChild}, without child: ${variantsWithoutChild}`);
      if (variantsWithoutChild > 0) {
        console.warn(`[getProductById] Warning: ${variantsWithoutChild} variants missing child relationship`);
      }
      // Log first variant structure for debugging
      if (productData.variants[0]) {
        console.log(`[getProductById] First variant structure:`, JSON.stringify({
          id: productData.variants[0].id,
          hasChild: !!productData.variants[0].child,
          childId: productData.variants[0].child?.id,
          childSku: productData.variants[0].child?.sku
        }));
      }
    } else {
      console.log(`[getProductById] Product ${id} has no variants (empty array)`);
    }

    // Debug logging for final response
    console.log(`[getProductById] Sending response for product ${id}. Variant count: ${productData.variants?.length}`);
    res.json({ product: productData });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * Update a product
 */
export const updateProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      type,
      base_unit,
      unit_id,
      sale_price,
      cost_price,
      cost_price_inc_tax,
      tax_rate,
      tax_rate_id,
      is_taxable,
      selling_price_tax_type,
      profit_margin,
      brand,
      brand_id,
      category,
      category_id,
      sub_category_id,
      weight,
      manage_stock,
      not_for_selling,
      image_url,
      barcode_type,
      alert_quantity,
      reorder_quantity,
      woocommerce_enabled,
      is_active,
      business_location_ids,
      variation_ids
    } = req.body;

    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for SKU uniqueness if changing
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ where: { sku }, transaction });
      if (existingProduct) {
        await safeRollback(transaction);
        return res.status(409).json({ error: 'Product with this SKU already exists' });
      }
    }

    // Update fields
    const updateData = {};
    if (sku !== undefined) updateData.sku = sku;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (base_unit !== undefined) updateData.base_unit = base_unit;
    if (unit_id !== undefined) updateData.unit_id = unit_id || null;
    if (sale_price !== undefined) updateData.sale_price = sale_price;
    if (cost_price !== undefined) updateData.cost_price = cost_price || null;
    if (cost_price_inc_tax !== undefined) updateData.cost_price_inc_tax = cost_price_inc_tax || null;
    if (tax_rate !== undefined) updateData.tax_rate = tax_rate || 0;
    if (tax_rate_id !== undefined) updateData.tax_rate_id = tax_rate_id || null;
    if (is_taxable !== undefined) updateData.is_taxable = is_taxable;
    if (selling_price_tax_type !== undefined) updateData.selling_price_tax_type = selling_price_tax_type;
    if (profit_margin !== undefined) updateData.profit_margin = profit_margin;
    if (brand !== undefined) updateData.brand = brand || null;
    if (brand_id !== undefined) updateData.brand_id = brand_id || null;
    if (category !== undefined) updateData.category = category || null;
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (sub_category_id !== undefined) updateData.sub_category_id = sub_category_id || null;
    if (weight !== undefined) updateData.weight = weight || null;
    if (manage_stock !== undefined) updateData.manage_stock = manage_stock;
    if (not_for_selling !== undefined) updateData.not_for_selling = not_for_selling;
    if (image_url !== undefined) updateData.image_url = image_url || null;
    if (barcode_type !== undefined) updateData.barcode_type = barcode_type;
    if (alert_quantity !== undefined) updateData.alert_quantity = alert_quantity || 0;
    if (reorder_quantity !== undefined) updateData.reorder_quantity = reorder_quantity || 0;
    if (woocommerce_enabled !== undefined) updateData.woocommerce_enabled = woocommerce_enabled;
    if (is_active !== undefined) updateData.is_active = is_active;
    const productCategoryId = category_id !== undefined ? category_id : product.category_id;
    let categoryRecord = null;
    try {
      categoryRecord = await ensureCategoryAccess(req, productCategoryId, transaction);
      if (sub_category_id !== undefined && sub_category_id) {
        await ensureCategoryAccess(req, sub_category_id, transaction);
      }
    } catch (categoryError) {
      await safeRollback(transaction);
      return res.status(categoryError.statusCode || 500).json({ error: categoryError.message });
    }
    const incomingAttributeDefaults = req.body.attribute_default_values;
    const effectiveAttributeDefaults = incomingAttributeDefaults !== undefined
      ? incomingAttributeDefaults
      : (product.attribute_default_values || {});

    if (categoryRecord) {
      if (categoryRecord.attribute_schema && Array.isArray(categoryRecord.attribute_schema)) {
        const schema = categoryRecord.attribute_schema;
        const providedAttributes = effectiveAttributeDefaults || {};

        for (const attr of schema) {
          if (attr.required && providedAttributes[attr.name] === undefined) {
            await safeRollback(transaction);
            return res.status(400).json({
              error: `Required attribute "${attr.name}" is missing`
            });
          }

          if (providedAttributes[attr.name] !== undefined) {
            if (attr.type === 'select' && attr.options) {
              if (!attr.options.includes(providedAttributes[attr.name])) {
                await safeRollback(transaction);
                return res.status(400).json({
                  error: `Invalid value for attribute "${attr.name}". Must be one of: ${attr.options.join(', ')}`
                });
              }
            }
          }
        }
      }
    }

    if (incomingAttributeDefaults !== undefined) {
      updateData.attribute_default_values = incomingAttributeDefaults;
    }

    await product.update(updateData, { transaction });

    // Handle business location assignments
    if (business_location_ids !== undefined) {
      // Delete existing
      await ProductBusinessLocation.destroy({
        where: { product_id: id },
        transaction
      });

      // Add new
      if (Array.isArray(business_location_ids) && business_location_ids.length > 0) {
        const locationRecords = business_location_ids.map(branchId => ({
          product_id: id,
          branch_id: branchId
        }));
        await ProductBusinessLocation.bulkCreate(locationRecords, { transaction });
      }
    }



    // Handle variable product assignments
    if (variation_ids !== undefined) {
      // Delete existing
      await ProductVariationAssignment.destroy({
        where: { product_id: id },
        transaction
      });

      // Add new
      if (Array.isArray(variation_ids) && variation_ids.length > 0) {
        const assignmentRecords = variation_ids.map(varId => ({
          product_id: id,
          variation_id: varId
        }));
        await ProductVariationAssignment.bulkCreate(assignmentRecords, { transaction });
      }
    }

    await transaction.commit();

    // Reload with associations
    const updatedProduct = await Product.findByPk(id, {
      include: [
        { model: Branch, as: 'business_locations', attributes: ['id', 'name', 'code'] },
        { model: ProductBrand, as: 'brandAttribute', attributes: ['id', 'name'] },
        { model: Category, as: 'categoryRef', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'name', 'abbreviation'] },
        { model: TaxRate, as: 'taxRate', attributes: ['id', 'name', 'rate'] }
      ]
    });

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Delete a product
 */
export const deleteProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product has inventory batches
    const batchCount = await InventoryBatch.count({
      where: { product_id: id },
      transaction
    });

    if (batchCount > 0) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Cannot delete product with existing inventory batches. Deactivate it instead.'
      });
    }

    // Delete business location associations
    await ProductBusinessLocation.destroy({
      where: { product_id: id },
      transaction
    });

    // Delete the product
    await product.destroy({ transaction });

    await transaction.commit();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * DELETE /api/products/:id/variants/:variantId
 * Delete a specific variant
 */
export const deleteVariant = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id, variantId } = req.params;

    // Check if variant exists
    // ProductVariant links Parent (product_id) to Child (child via some FK, likely internal or child_id?)
    // Based on getProductById include: model: ProductVariant, as: 'variants', include: [{ model: Product, as: 'child' }]
    const variant = await ProductVariant.findByPk(variantId, {
      include: [{ model: Product, as: 'child' }],
      transaction
    });

    if (!variant) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Verify parent product relationship
    // parent_product_id is the parent (variable product), product_id is the child (variant product)
    if (String(variant.parent_product_id) !== String(id)) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Variant does not belong to the specified product' });
    }

    // Check stock of the child product if it exists
    if (variant.child) {
      // Use InventoryBatch to check stock
      const stock = await InventoryBatch.sum('remaining_quantity', {
        where: {
          product_id: variant.child.id,
          status: 'in_stock'
        },
        transaction
      });

      if ((parseFloat(stock) || 0) > 0) {
        await safeRollback(transaction);
        return res.status(400).json({ error: 'Cannot delete variant with existing stock.' });
      }
    }

    // Delete the variant linkage
    await variant.destroy({ transaction });

    // Optionally: could delete the child product here if it's an orphan, 
    // but without strict confirmation, we'll leave it as is or handle it via a cleanup job.
    // The variant link contains the variation info, so deleting it removes the "variant-ness".

    await transaction.commit();
    res.json({ message: 'Variant deleted successfully' });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/products/:id/batches
 * Get inventory batches for a specific product
 */
export const getProductBatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, branch_id } = req.query;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const where = { product_id: id };

    if (status) {
      where.status = status;
    }

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: BatchType, as: 'batch_type', attributes: ['id', 'name', 'description'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate totals
    const totalStock = batches.reduce((sum, b) => sum + parseFloat(b.remaining_quantity || 0), 0);
    const inStockCount = batches.filter(b => b.status === 'in_stock').length;

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        base_unit: product.base_unit
      },
      batches,
      summary: {
        total_batches: batches.length,
        in_stock_batches: inStockCount,
        total_stock: totalStock
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products/:id/batches
 * Add a new inventory batch for a product
 */
export const addProductBatch = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      branch_id,
      category_id,
      instance_code,
      batch_type_id,
      grouped = true,
      batch_identifier,
      initial_quantity,
      attribute_data = {}
    } = req.body;

    // Validate product
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Product type validation removed - any product type can have inventory batches

    // Validation
    if (!branch_id || initial_quantity === undefined) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'Missing required fields: branch_id, initial_quantity'
      });
    }

    if (initial_quantity < 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'initial_quantity cannot be negative' });
    }

    // If grouped, instance_code is required
    if (grouped && !instance_code) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'instance_code is required when grouped is true'
      });
    }

    // Verify branch exists
    const branch = await Branch.findByPk(branch_id, { transaction });
    if (!branch) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Verify batch_type_id
    if (!batch_type_id) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'batch_type_id is required' });
    }

    const batchType = await BatchType.findByPk(batch_type_id, { transaction });
    if (!batchType || !batchType.is_active) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Invalid or inactive batch type' });
    }

    // Check if instance_code already exists (if grouped)
    if (grouped && instance_code) {
      const existingBatch = await InventoryBatch.findOne({
        where: { instance_code },
        transaction
      });
      if (existingBatch) {
        await safeRollback(transaction);
        return res.status(409).json({ error: 'Instance code already exists' });
      }
    }

    // Create inventory batch
    const batch = await InventoryBatch.create({
      product_id: id,
      branch_id,
      category_id: category_id || product.category_id || null,
      instance_code: grouped ? instance_code : null,
      batch_type_id,
      grouped,
      batch_identifier: batch_identifier || (grouped ? instance_code : null),
      initial_quantity,
      remaining_quantity: initial_quantity,
      status: 'in_stock',
      attribute_data
    }, { transaction });

    await transaction.commit();

    // Reload with associations
    const batchWithDetails = await InventoryBatch.findByPk(batch.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'base_unit'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: BatchType, as: 'batch_type', attributes: ['id', 'name', 'description'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Inventory batch created successfully',
      batch: batchWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/products/:id/batches/defaults
 * Create default batches for a product (all category-assigned batch types with 0 balance)
 */
export const createDefaultBatches = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { branch_id } = req.body; // Optional branch_id, will use first branch if not provided

    // Validate product
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Product type validation removed - any product type can have inventory batches

    // Get branch (use provided or first available)
    let branch = null;
    if (branch_id) {
      branch = await Branch.findByPk(branch_id, { transaction });
      if (!branch) {
        await safeRollback(transaction);
        return res.status(404).json({ error: 'Branch not found' });
      }
    } else {
      branch = await Branch.findOne({ 
        where: { is_active: true },
        order: [['name', 'ASC']],
        transaction 
      });
      if (!branch) {
        await safeRollback(transaction);
        return res.status(400).json({ error: 'No active branch found. Please specify a branch_id.' });
      }
    }

    // Get batch types assigned to product's category
    let batchTypes = [];
    if (product.category_id) {
      const category = await Category.findByPk(product.category_id, {
        include: [{
          model: BatchType,
          as: 'batch_types',
          where: { is_active: true },
          required: false
        }],
        transaction
      });

      if (category && category.batch_types && category.batch_types.length > 0) {
        batchTypes = category.batch_types;
      }
    }

    // If no category-assigned batch types, use global default
    if (batchTypes.length === 0) {
      const defaultBatchType = await BatchType.findOne({
        where: { is_default: true, is_active: true },
        transaction
      });
      if (defaultBatchType) {
        batchTypes = [defaultBatchType];
      } else {
        // Fallback to first active batch type
        const firstBatchType = await BatchType.findOne({
          where: { is_active: true },
          order: [['name', 'ASC']],
          transaction
        });
        if (firstBatchType) {
          batchTypes = [firstBatchType];
        }
      }
    }

    if (batchTypes.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({
        error: 'No batch types available. Please assign batch types to the category or set a global default.'
      });
    }

    // Create batches for all batch types with 0 balance
    const createdBatches = [];
    for (const batchType of batchTypes) {
      // Verify batch type is assigned to category (if category provided)
      if (product.category_id) {
        const assignment = await CategoryBatchType.findOne({
          where: { 
            category_id: product.category_id, 
            batch_type_id: batchType.id 
          },
          transaction
        });
        // Skip if not assigned (unless it's the global default)
        if (!assignment && !batchType.is_default) {
          continue;
        }
      }

      try {
        const batch = await InventoryBatch.create({
          product_id: id,
          branch_id: branch.id,
          category_id: product.category_id || null,
          instance_code: null, // No instance code for default batches
          batch_type_id: batchType.id,
          grouped: false,
          batch_identifier: null,
          initial_quantity: 0,
          remaining_quantity: 0,
          status: 'in_stock',
          attribute_data: {}
        }, { transaction });

        createdBatches.push(batch);
      } catch (err) {
        // Log error but continue with other batch types
        console.error(`Failed to create batch for type ${batchType.name}:`, err);
      }
    }

    await transaction.commit();

    // Reload batches with associations
    const batchesWithDetails = await InventoryBatch.findAll({
      where: { id: { [Op.in]: createdBatches.map(b => b.id) } },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'base_unit'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: BatchType, as: 'batch_type', attributes: ['id', 'name', 'description'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: `Created ${createdBatches.length} default batch(es) with 0 balance`,
      batches: batchesWithDetails,
      count: createdBatches.length
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/products/:id/price
 * Update product prices with history tracking
 */
export const updateProductPrice = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { sale_price, cost_price, reason } = req.body;

    // Find product
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate at least one price is being updated
    if (sale_price === undefined && cost_price === undefined) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'At least one price (sale_price or cost_price) must be provided' });
    }

    // Store old prices
    const oldSalePrice = product.sale_price;
    const oldCostPrice = product.cost_price;

    // Check if anything actually changed
    const saleChanged = sale_price !== undefined && parseFloat(sale_price) !== parseFloat(oldSalePrice || 0);
    const costChanged = cost_price !== undefined && parseFloat(cost_price) !== parseFloat(oldCostPrice || 0);

    if (!saleChanged && !costChanged) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'No price changes detected' });
    }

    // Create price history record
    await PriceHistory.create({
      product_id: id,
      old_sale_price: saleChanged ? oldSalePrice : null,
      new_sale_price: saleChanged ? sale_price : null,
      old_cost_price: costChanged ? oldCostPrice : null,
      new_cost_price: costChanged ? cost_price : null,
      user_id: req.user.id,
      reason: reason || null
    }, { transaction });

    // Update product prices
    if (saleChanged) {
      product.sale_price = sale_price;
    }
    if (costChanged) {
      product.cost_price = cost_price;
    }
    product.updated_at = new Date();
    await product.save({ transaction });

    await transaction.commit();

    res.json({
      message: 'Product prices updated successfully',
      product: product.toJSON()
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/products/:id/price-history
 * Get price history for a product
 */
export const getProductPriceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify product exists
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const history = await PriceHistory.findAll({
      where: { product_id: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        current_sale_price: product.sale_price,
        current_cost_price: product.cost_price
      },
      history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/bulk-price-update
 * Bulk update prices for multiple products
 */
export const bulkUpdatePrices = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { updates, reason } = req.body;
    // updates: [{ product_id, sale_price?, cost_price? }]

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'updates array is required' });
    }

    const results = [];

    for (const update of updates) {
      const { product_id, sale_price, cost_price } = update;

      const product = await Product.findByPk(product_id, { transaction });
      if (!product) {
        results.push({ product_id, success: false, error: 'Product not found' });
        continue;
      }

      const oldSalePrice = product.sale_price;
      const oldCostPrice = product.cost_price;

      const saleChanged = sale_price !== undefined && parseFloat(sale_price) !== parseFloat(oldSalePrice || 0);
      const costChanged = cost_price !== undefined && parseFloat(cost_price) !== parseFloat(oldCostPrice || 0);

      if (!saleChanged && !costChanged) {
        results.push({ product_id, success: false, error: 'No price changes' });
        continue;
      }

      // Create history record
      await PriceHistory.create({
        product_id,
        old_sale_price: saleChanged ? oldSalePrice : null,
        new_sale_price: saleChanged ? sale_price : null,
        old_cost_price: costChanged ? oldCostPrice : null,
        new_cost_price: costChanged ? cost_price : null,
        user_id: req.user.id,
        reason: reason || 'Bulk price update'
      }, { transaction });

      // Update product
      if (saleChanged) product.sale_price = sale_price;
      if (costChanged) product.cost_price = cost_price;
      product.updated_at = new Date();
      await product.save({ transaction });

      results.push({ product_id, success: true, name: product.name });
    }

    await transaction.commit();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      message: `${successful} product(s) updated, ${failed} failed`,
      results
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/products/:id/stock
 * Get product stock across branches
 */
export const getProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Product type validation removed - stock tracking available for all products

    const where = { product_id: id };
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    // Get aggregated totals by branch using SQL
    const branchAggregates = await InventoryBatch.findAll({
      where,
      attributes: [
        'branch_id',
        [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_quantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'batch_count']
      ],
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      group: ['branch_id', 'branch.id', 'branch.name', 'branch.code'],
      raw: false
    });

    // Calculate grand total using SQL aggregation
    const grandTotalResult = await InventoryBatch.findOne({
      where,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'grand_total']
      ],
      raw: true
    });

    const grandTotal = parseFloat(grandTotalResult?.grand_total || 0);

    // Format branch totals
    const branchTotals = branchAggregates.map(agg => ({
      branch: agg.branch,
      total_quantity: parseFloat(agg.get('total_quantity') || 0),
      batch_count: parseInt(agg.get('batch_count') || 0)
    }));

    // Only fetch full batch details if explicitly requested or for small datasets
    // This prevents overwhelming the response with thousands of rows
    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      order: [['branch_id', 'ASC'], ['instance_code', 'ASC']],
      limit: 100 // Limit to prevent memory issues
    });

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        type: product.type
      },
      branch_totals: branchTotals,
      grand_total: grandTotal,
      batches,
      _note: batches.length === 100 ? 'Batch list limited to 100 items. Use /products/:id/batches for full list.' : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id/sales
 * Get product sales history
 */
export const getProductSales = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, limit = 50 } = req.query;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { SalesItem, SalesOrder, Customer } = await import('../models/index.js');

    const where = { product_id: id };

    // Date filtering
    if (start_date || end_date) {
      where['$order.created_at$'] = {};
      if (start_date) where['$order.created_at$'][Op.gte] = new Date(start_date);
      if (end_date) where['$order.created_at$'][Op.lte] = new Date(end_date);
    }

    // Branch filtering
    const orderWhere = {};
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      orderWhere.branch_id = req.user.branch_id;
    }

    let queryLimit = parseInt(limit);
    if (queryLimit < 1) {
      queryLimit = null;
    }

    const salesItems = await SalesItem.findAll({
      where,
      include: [
        {
          model: SalesOrder,
          as: 'order',
          where: orderWhere,
          include: [
            { model: Customer, as: 'customer', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [[{ model: SalesOrder, as: 'order' }, 'created_at', 'DESC']],
      limit: queryLimit
    });

    // Calculate totals
    const totalQuantity = salesItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
    const totalRevenue = salesItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      sales_items: salesItems,
      summary: {
        total_quantity_sold: totalQuantity,
        total_revenue: totalRevenue,
        average_price: totalQuantity > 0 ? totalRevenue / totalQuantity : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products/:id/generate-variants
 * Generate variants for a variable product
 */
export const generateVariants = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { variation_ids, variation_configs, allowed_sku_suffixes } = req.body;

    console.log('[generateVariants] Request received:', {
      productId: id,
      variationIds: variation_ids,
      variationConfigsCount: variation_configs?.length,
      dryRun: req.query.dry_run
    });

    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await safeRollback(transaction);
      console.error('[generateVariants] Product not found:', id);
      return res.status(404).json({ error: `Product with ID ${id} not found` });
    }

    if (product.type !== 'variable') {
      await safeRollback(transaction);
      console.error('[generateVariants] Product is not variable type:', { productId: id, productType: product.type });
      return res.status(400).json({ 
        error: `Product is not a variable product. Current type: ${product.type}`,
        productId: id,
        productType: product.type
      });
    }

    // Validate variation_configs if provided
    if (variation_configs && Array.isArray(variation_configs)) {
      const invalidConfigs = [];
      for (const config of variation_configs) {
        if (!config.variationId) {
          invalidConfigs.push({ config, reason: 'Missing variationId' });
        } else if (!config.valueIds || !Array.isArray(config.valueIds) || config.valueIds.length === 0) {
          invalidConfigs.push({ 
            config, 
            reason: `No valueIds provided or valueIds is empty for variationId: ${config.variationId}` 
          });
        }
      }

      if (invalidConfigs.length > 0) {
        await safeRollback(transaction);
        console.error('[generateVariants] Invalid variation configs:', invalidConfigs);
        return res.status(400).json({ 
          error: 'Invalid variation configurations provided',
          details: invalidConfigs.map(ic => ({
            variationId: ic.config.variationId,
            reason: ic.reason
          }))
        });
      }
    }

    let targetVariationIds = variation_ids;

    // If configs are provided, derive IDs from them if variation_ids not explicitly passed
    if (!targetVariationIds && variation_configs && Array.isArray(variation_configs)) {
      targetVariationIds = variation_configs.map(c => c.variationId);
    }

    if (!targetVariationIds) {
      const assignments = await ProductVariationAssignment.findAll({
        where: { product_id: id },
        transaction
      });
      targetVariationIds = assignments.map(a => a.variation_id);
    }

    if (!targetVariationIds || targetVariationIds.length === 0) {
      await safeRollback(transaction);
      console.error('[generateVariants] No variations assigned to product:', id);
      return res.status(400).json({ 
        error: 'No variations assigned to this product. Please assign variations before generating variants.',
        productId: id
      });
    }

    const dryRun = req.query.dry_run === 'true';

    console.log('[generateVariants] Calling variantService.generateVariants:', {
      productId: id,
      targetVariationIds,
      variationConfigsCount: variation_configs?.length,
      dryRun
    });

    const variants = await variantService.generateVariants(id, targetVariationIds, {
      transaction,
      variationConfigs: variation_configs,
      dryRun,
      allowedSkuSuffixes: allowed_sku_suffixes
    });

    await transaction.commit();

    console.log('[generateVariants] Successfully generated variants:', variants.length);

    res.json({
      message: `Successfully generated ${variants.length} variants`,
      variants
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[generateVariants] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      productId: req.params.id
    });
    next(error);
  }
};

/**
 * GET /api/products/:id/variant-ledger
 * Get ledger (purchases, sales, batches) for a specific variant product
 */
export const getVariantLedger = async (req, res, next) => {
  try {
    const { id } = req.params; // This is the child product ID (the variant)

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 1. Fetch Purchases
    const purchases = await PurchaseItem.findAll({
      where: { product_id: id },
      include: [
        {
          model: Purchase,
          as: 'purchase',
          attributes: ['id', 'purchase_number', 'created_at', 'status']
        },
        {
          model: InventoryBatch,
          as: 'inventory_batch',
          attributes: ['id', 'instance_code', 'batch_identifier'],
          required: false
        }
      ],
      order: [[{ model: Purchase, as: 'purchase' }, 'created_at', 'DESC']]
    });

    // 2. Fetch Sales
    const sales = await SalesItem.findAll({
      where: { product_id: id },
      include: [
        {
          model: SalesOrder,
          as: 'order',
          attributes: ['id', 'invoice_number', 'created_at', 'status']
        }
      ],
      order: [[{ model: SalesOrder, as: 'order' }, 'created_at', 'DESC']]
    });

    // 3. Fetch Batches (Inventory)
    const batches = await InventoryBatch.findAll({
      where: { product_id: id },
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Transform and unify data
    const ledger = [];

    // Process Purchases
    let totalCost = 0;
    purchases.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.unit_cost) || 0;
      const subtotal = parseFloat(item.subtotal) || (quantity * cost);

      if (item.purchase?.status === 'received') { // Only count received for valid cost calculation? Or all? Let's show all but maybe mark status
        totalCost += subtotal;
      }

      ledger.push({
        id: `PUR-${item.id}`,
        type: 'purchase',
        date: item.purchase?.created_at || item.created_at,
        reference: item.purchase?.purchase_number || 'N/A',
        reference_id: item.purchase?.id,
        quantity: quantity,
        unit_amount: cost,
        total_amount: subtotal,
        status: item.purchase?.status || 'confirmed',
        batch: item.inventory_batch ? {
          id: item.inventory_batch.id,
          instance_code: item.inventory_batch.instance_code,
          batch_identifier: item.inventory_batch.batch_identifier
        } : null,
        details: item.inventory_batch ? `Batch: ${item.inventory_batch.instance_code || item.inventory_batch.batch_identifier || 'N/A'}` : 'Purchased'
      });
    });

    // Process Sales
    let totalRevenue = 0;
    sales.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const subtotal = parseFloat(item.subtotal) || (quantity * price);

      if (item.order?.status !== 'cancelled') {
        totalRevenue += subtotal;
      }

      ledger.push({
        id: `SALE-${item.id}`,
        type: 'sale',
        date: item.order?.created_at || item.created_at,
        reference: item.order?.invoice_number || 'N/A',
        reference_id: item.order?.id,
        quantity: quantity, // Sold quantity
        unit_amount: price,
        total_amount: subtotal,
        status: item.order?.status || 'completed',
        batch: item.inventory_batch ? {
          id: item.inventory_batch.id,
          instance_code: item.inventory_batch.instance_code,
          batch_identifier: item.inventory_batch.batch_identifier
        } : null,
        details: item.inventory_batch ? `Batch: ${item.inventory_batch.instance_code || item.inventory_batch.batch_identifier || 'N/A'}` : 'Sold'
      });
    });

    // Batches - largely for info, but could be added as events if they are adjustments
    // For now, we'll return batches as a separate list or just integrate opening stocks?
    // Let's add them as 'adjustment' or similar if they are not from purchase?
    // Or just strictly follow the user request: "view a list ledger style of when the material was used or bought"

    // Sort ledger by date descending
    ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary
    const totalSold = sales.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const totalBought = purchases.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const profit = totalRevenue - totalCost; // simplistic, assumes FIFO/LIFO matching not strictly required for this view, just raw totals

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      ledger,
      batches, // Return raw batches as requested for "matches attached to variations"
      summary: {
        total_bought: totalBought,
        total_sold: totalSold,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        net_profit: profit
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id/instance-codes
 * Get instance codes used for a product (variant)
 */
export const getProductInstanceCodes = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find all batches for this product with non-null instance_code
    const batches = await InventoryBatch.findAll({
      where: {
        product_id: id,
        instance_code: { [Op.ne]: null }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('instance_code')), 'instance_code'], 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Extract codes
    const codes = batches.map(b => b.instance_code).filter(c => c);

    res.json({ codes });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products/:id/variants/bulk-delete
 * Delete multiple variants at once
 */
export const bulkDeleteVariants = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { variantIds } = req.body;

    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'No variant IDs provided' });
    }

    // Check strict parent-child ownership
    const variants = await ProductVariant.findAll({
      where: {
        id: variantIds,
        parent_product_id: id
      },
      include: [{ model: Product, as: 'child' }],
      transaction
    });

    if (variants.length !== variantIds.length) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Some variants were not found or do not belong to this product' });
    }

    // Check stock for ALL variants before deleting any
    const childProductIds = variants.map(v => v.child?.id).filter(Boolean);

    if (childProductIds.length > 0) {
      // Check stock
      const stockCounts = await InventoryBatch.findAll({
        attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_stock']],
        where: {
          product_id: childProductIds,
          status: 'in_stock'
        },
        group: ['product_id'],
        raw: true,
        transaction
      });

      const variantsWithStock = stockCounts.filter(s => parseFloat(s.total_stock) > 0);
      if (variantsWithStock.length > 0) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: `Cannot delete variants because some have existing stock (${variantsWithStock.length} variants impacted).`
        });
      }
    }

    // Delete variants
    await ProductVariant.destroy({
      where: {
        id: variantIds
      },
      transaction
    });

    await transaction.commit();
    res.json({ message: `Successfully deleted ${variantIds.length} variants` });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
