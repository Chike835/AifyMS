import express from 'express';
import { 
  createRecipe, 
  getRecipes, 
  getRecipeByVirtualProduct,
  updateRecipe,
  deleteRecipe
} from '../controllers/recipeController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/recipes - List recipes (requires recipe_view)
router.get('/', requirePermission('recipe_view'), getRecipes);

// GET /api/recipes/by-virtual/:productId - Get recipe for virtual product (requires recipe_view)
router.get('/by-virtual/:productId', requirePermission('recipe_view'), getRecipeByVirtualProduct);

// POST /api/recipes - Create recipe (requires recipe_manage)
router.post('/', requirePermission('recipe_manage'), createRecipe);

// PUT /api/recipes/:id - Update recipe (requires recipe_manage)
router.put('/:id', requirePermission('recipe_manage'), updateRecipe);

// DELETE /api/recipes/:id - Delete recipe (requires recipe_manage)
router.delete('/:id', requirePermission('recipe_manage'), deleteRecipe);

export default router;

