import { Op } from 'sequelize';
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

    // Verify virtual product exists
    const virtualProduct = await Product.findByPk(virtual_product_id);
    if (!virtualProduct) {
      return res.status(404).json({ error: 'Virtual product not found' });
    }

    // Verify raw product exists
    const rawProduct = await Product.findByPk(raw_product_id);
    if (!rawProduct) {
      return res.status(404).json({ error: 'Raw product not found' });
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

/**
 * PUT /api/recipes/:id
 * Update a recipe
 */
export const updateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      virtual_product_id,
      raw_product_id,
      conversion_factor,
      wastage_margin
    } = req.body;

    const recipe = await Recipe.findByPk(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Validation
    if (conversion_factor !== undefined && conversion_factor <= 0) {
      return res.status(400).json({ error: 'conversion_factor must be greater than 0' });
    }

    if (wastage_margin !== undefined && (wastage_margin < 0 || wastage_margin > 100)) {
      return res.status(400).json({ error: 'wastage_margin must be between 0 and 100' });
    }

    // If changing products, verify they exist
    if (virtual_product_id && virtual_product_id !== recipe.virtual_product_id) {
      const virtualProduct = await Product.findByPk(virtual_product_id);
      if (!virtualProduct) {
        return res.status(404).json({ error: 'Virtual product not found' });
      }
    }

    if (raw_product_id && raw_product_id !== recipe.raw_product_id) {
      const rawProduct = await Product.findByPk(raw_product_id);
      if (!rawProduct) {
        return res.status(404).json({ error: 'Raw product not found' });
      }

      // Check if recipe already exists for new combination
      const existingRecipe = await Recipe.findOne({
        where: {
          virtual_product_id: virtual_product_id || recipe.virtual_product_id,
          raw_product_id,
          id: { [Op.ne]: id }
        }
      });
      if (existingRecipe) {
        return res.status(409).json({ 
          error: 'Recipe already exists for this virtual product and raw product combination' 
        });
      }
    }

    // Update fields
    if (name !== undefined) recipe.name = name;
    if (virtual_product_id !== undefined) recipe.virtual_product_id = virtual_product_id;
    if (raw_product_id !== undefined) recipe.raw_product_id = raw_product_id;
    if (conversion_factor !== undefined) recipe.conversion_factor = conversion_factor;
    if (wastage_margin !== undefined) recipe.wastage_margin = wastage_margin;

    await recipe.save();

    // Load with associations
    const recipeWithDetails = await Recipe.findByPk(recipe.id, {
      include: [
        { model: Product, as: 'virtual_product' },
        { model: Product, as: 'raw_product' }
      ]
    });

    res.json({
      message: 'Recipe updated successfully',
      recipe: recipeWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recipes/:id
 * Delete a recipe
 */
export const deleteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;

    const recipe = await Recipe.findByPk(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    await recipe.destroy();

    res.json({
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

