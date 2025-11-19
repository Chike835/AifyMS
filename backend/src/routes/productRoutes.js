import express from 'express';
import { createProduct, getProducts, getProductById } from '../controllers/productController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/products - List products (requires product_view)
router.get('/', requirePermission('product_view'), getProducts);

// GET /api/products/:id - Get product by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getProductById);

// POST /api/products - Create product (requires product_add)
router.post('/', requirePermission('product_add'), createProduct);

export default router;

