import { Product } from '../models/index.js';
import { Op } from 'sequelize';

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

