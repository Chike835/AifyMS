import { Product, PriceHistory, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * POST /api/products
 * Create a new product
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      type,
      base_unit,
      sale_price,
      cost_price,
      tax_rate,
      brand,
      category
    } = req.body;

    // Validation
    if (!sku || !name || !type || !base_unit || sale_price === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: sku, name, type, base_unit, sale_price' 
      });
    }

    // Validate product type
    const validTypes = ['standard', 'compound', 'raw_tracked', 'manufactured_virtual'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid product type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }

    // Create product
    const product = await Product.create({
      sku,
      name,
      type,
      base_unit,
      sale_price,
      cost_price: cost_price || null,
      tax_rate: tax_rate || 0,
      brand: brand || null,
      category: category || null
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products
 * List all products
 */
export const getProducts = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const where = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Filter cost_price based on permission
    const canViewCost = req.user?.permissions?.includes('product_view_cost');
    const productsData = products.map(product => {
      const productData = product.toJSON();
      if (!canViewCost) {
        delete productData.cost_price;
      }
      return productData;
    });

    res.json({ products: productsData });
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

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = product.toJSON();
    const canViewCost = req.user?.permissions?.includes('product_view_cost');
    if (!canViewCost) {
      delete productData.cost_price;
    }

    res.json({ product: productData });
  } catch (error) {
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

    const { InventoryBatch, Branch } = await import('../models/index.js');
    
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

    const { SalesItem, SalesOrder, Customer, Branch } = await import('../models/index.js');

    const where = { product_id: id };
    
    // Date filtering
    if (start_date || end_date) {
      where['$sales_order.created_at$'] = {};
      if (start_date) where['$sales_order.created_at$'][Op.gte] = new Date(start_date);
      if (end_date) where['$sales_order.created_at$'][Op.lte] = new Date(end_date);
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
          as: 'sales_order',
          where: orderWhere,
          include: [
            { model: Customer, as: 'customer', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['$sales_order.created_at$', 'DESC']],
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

