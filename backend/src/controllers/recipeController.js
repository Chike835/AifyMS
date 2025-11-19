import { Recipe, Product } from '../models/index.js';

/**
 * POST /api/recipes
 * Create a manufacturing recipe
 */
export const createRecipe = async (req, res, next) => {
  try {
    const {
      name,
      virtual_product_id,
      raw_product_id,
      conversion_factor
    } = req.body;

    // Validation
    if (!name || !virtual_product_id || !raw_product_id || conversion_factor === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, virtual_product_id, raw_product_id, conversion_factor' 
      });
    }

    if (conversion_factor <= 0) {
      return res.status(400).json({ error: 'conversion_factor must be greater than 0' });
    }

    // Verify virtual product exists and is manufactured_virtual
    const virtualProduct = await Product.findByPk(virtual_product_id);
    if (!virtualProduct) {
      return res.status(404).json({ error: 'Virtual product not found' });
    }
    if (virtualProduct.type !== 'manufactured_virtual') {
      return res.status(400).json({ 
        error: 'Virtual product must be of type manufactured_virtual' 
      });
    }

    // Verify raw product exists and is raw_tracked
    const rawProduct = await Product.findByPk(raw_product_id);
    if (!rawProduct) {
      return res.status(404).json({ error: 'Raw product not found' });
    }
    if (rawProduct.type !== 'raw_tracked') {
      return res.status(400).json({ 
        error: 'Raw product must be of type raw_tracked' 
      });
    }

    // Check if recipe already exists for this combination
    const existingRecipe = await Recipe.findOne({
      where: {
        virtual_product_id,
        raw_product_id
      }
    });
    if (existingRecipe) {
      return res.status(409).json({ 
        error: 'Recipe already exists for this virtual product and raw product combination' 
      });
    }

    // Create recipe
    const recipe = await Recipe.create({
      name,
      virtual_product_id,
      raw_product_id,
      conversion_factor
    });

    // Load with associations
    const recipeWithDetails = await Recipe.findByPk(recipe.id, {
      include: [
        { model: Product, as: 'virtual_product' },
        { model: Product, as: 'raw_product' }
      ]
    });

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: recipeWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes
 * List all recipes
 */
export const getRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.findAll({
      include: [
        { 
          model: Product, 
          as: 'virtual_product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        },
        { 
          model: Product, 
          as: 'raw_product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ recipes });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/by-virtual/:productId
 * Get recipe for a specific virtual product
 * Used in POS to calculate raw material requirements
 */
export const getRecipeByVirtualProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const recipe = await Recipe.findOne({
      where: { virtual_product_id: productId },
      include: [
        { 
          model: Product, 
          as: 'virtual_product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        },
        { 
          model: Product, 
          as: 'raw_product',
          attributes: ['id', 'sku', 'name', 'type', 'base_unit']
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found for this product' });
    }

    res.json({ recipe });
  } catch (error) {
    next(error);
  }
};

