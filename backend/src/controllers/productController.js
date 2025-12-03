import { Product, PriceHistory, User, InventoryBatch, Branch, Category, Unit, TaxRate, ProductBrand, ProductBusinessLocation, BatchType } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

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
      business_location_ids
    } = req.body;

    // Validation
    if (!sku || !name || !type || !base_unit || sale_price === undefined) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: sku, name, type, base_unit, sale_price' 
      });
    }

    // Validate product type
    const validTypes = ['standard', 'compound', 'raw_tracked', 'manufactured_virtual'];
    if (!validTypes.includes(type)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Invalid product type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate selling price tax type if provided
    if (selling_price_tax_type && !['inclusive', 'exclusive'].includes(selling_price_tax_type)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid selling_price_tax_type. Must be one of: inclusive, exclusive'
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku }, transaction });
    if (existingProduct) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }

    // Validate attribute_default_values against category schema if provided
    if (category_id && req.body.attribute_default_values) {
      const category = await Category.findByPk(category_id, { transaction });
      if (category && category.attribute_schema && Array.isArray(category.attribute_schema)) {
        const schema = category.attribute_schema;
        const providedAttributes = req.body.attribute_default_values || {};
        
        // Validate each attribute in schema
        for (const attr of schema) {
          if (attr.required && providedAttributes[attr.name] === undefined) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: `Required attribute "${attr.name}" is missing` 
            });
          }
          
          // Validate attribute type and values
          if (providedAttributes[attr.name] !== undefined) {
            if (attr.type === 'select' && attr.options) {
              if (!attr.options.includes(providedAttributes[attr.name])) {
                await transaction.rollback();
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

    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }

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
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Allowed sort columns
    const allowedSortColumns = ['created_at', 'name', 'sku', 'sale_price', 'cost_price', 'type'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: includes,
      order: [[sortColumn, order]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate stock for each product from inventory_batches
    const productIds = products.map(p => p.id);
    
    // Get stock aggregation
    const stockData = await InventoryBatch.findAll({
      where: {
        product_id: { [Op.in]: productIds },
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
        total_pages: Math.ceil(count / parseInt(limit))
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
        { model: Branch, as: 'business_locations', attributes: ['id', 'name', 'code'] }
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

    // Get current stock
    const stockData = await InventoryBatch.findOne({
      where: {
        product_id: id,
        status: 'in_stock'
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_stock']
      ],
      raw: true
    });
    productData.current_stock = parseFloat(stockData?.total_stock) || 0;

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
      business_location_ids
    } = req.body;

    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for SKU uniqueness if changing
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ where: { sku }, transaction });
      if (existingProduct) {
        await transaction.rollback();
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
    if (req.body.attribute_default_values !== undefined) {
      // Validate attribute_default_values against category schema if category_id exists
      const productCategoryId = category_id !== undefined ? category_id : product.category_id;
      if (productCategoryId) {
        const category = await Category.findByPk(productCategoryId, { transaction });
        if (category && category.attribute_schema && Array.isArray(category.attribute_schema)) {
          const schema = category.attribute_schema;
          const providedAttributes = req.body.attribute_default_values || {};
          
          for (const attr of schema) {
            if (attr.required && providedAttributes[attr.name] === undefined) {
              await transaction.rollback();
              return res.status(400).json({ 
                error: `Required attribute "${attr.name}" is missing` 
              });
            }
            
            if (providedAttributes[attr.name] !== undefined) {
              if (attr.type === 'select' && attr.options) {
                if (!attr.options.includes(providedAttributes[attr.name])) {
                  await transaction.rollback();
                  return res.status(400).json({ 
                    error: `Invalid value for attribute "${attr.name}". Must be one of: ${attr.options.join(', ')}` 
                  });
                }
              }
            }
          }
        }
      }
      updateData.attribute_default_values = req.body.attribute_default_values;
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product has inventory batches
    const batchCount = await InventoryBatch.count({
      where: { product_id: id },
      transaction
    });

    if (batchCount > 0) {
      await transaction.rollback();
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.type !== 'raw_tracked') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Only raw_tracked products can have inventory batches' 
      });
    }

    // Validation
    if (!branch_id || initial_quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: branch_id, initial_quantity' 
      });
    }

    if (initial_quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'initial_quantity must be greater than 0' });
    }

    // If grouped, instance_code is required
    if (grouped && !instance_code) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'instance_code is required when grouped is true' 
      });
    }

    // Verify branch exists
    const branch = await Branch.findByPk(branch_id, { transaction });
    if (!branch) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Verify batch_type_id
    if (!batch_type_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'batch_type_id is required' });
    }

    const batchType = await BatchType.findByPk(batch_type_id, { transaction });
    if (!batchType || !batchType.is_active) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid or inactive batch type' });
    }

    // Check if instance_code already exists (if grouped)
    if (grouped && instance_code) {
      const existingBatch = await InventoryBatch.findOne({ 
        where: { instance_code },
        transaction
      });
      if (existingBatch) {
        await transaction.rollback();
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
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate at least one price is being updated
    if (sale_price === undefined && cost_price === undefined) {
      await transaction.rollback();
      return res.status(400).json({ error: 'At least one price (sale_price or cost_price) must be provided' });
    }

    // Store old prices
    const oldSalePrice = product.sale_price;
    const oldCostPrice = product.cost_price;

    // Check if anything actually changed
    const saleChanged = sale_price !== undefined && parseFloat(sale_price) !== parseFloat(oldSalePrice || 0);
    const costChanged = cost_price !== undefined && parseFloat(cost_price) !== parseFloat(oldCostPrice || 0);

    if (!saleChanged && !costChanged) {
      await transaction.rollback();
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
      await transaction.rollback();
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

    // Only for raw_tracked products
    if (product.type !== 'raw_tracked') {
      return res.status(400).json({ error: 'Stock tracking is only available for raw_tracked products' });
    }
    
    const where = { product_id: id };
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      order: [['branch_id', 'ASC'], ['instance_code', 'ASC']]
    });

    // Calculate totals by branch
    const branchTotals = {};
    let grandTotal = 0;

    batches.forEach(batch => {
      const branchId = batch.branch_id;
      if (!branchTotals[branchId]) {
        branchTotals[branchId] = {
          branch: batch.branch,
          total_quantity: 0,
          batches: []
        };
      }
      branchTotals[branchId].total_quantity += parseFloat(batch.remaining_quantity);
      branchTotals[branchId].batches.push(batch);
      grandTotal += parseFloat(batch.remaining_quantity);
    });

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        type: product.type
      },
      branch_totals: Object.values(branchTotals),
      grand_total: grandTotal,
      batches
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
      limit: parseInt(limit)
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
