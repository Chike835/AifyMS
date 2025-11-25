import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProductPrice,
  getProductPriceHistory,
  bulkUpdatePrices,
  getProductStock,
  getProductSales
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/products - List products (requires product_view)
router.get('/', requirePermission('product_view'), getProducts);

// POST /api/products - Create product (requires product_add)
router.post('/', requirePermission('product_add'), createProduct);

// PUT /api/products/bulk-price-update - Bulk update prices (requires product_edit)
router.put('/bulk-price-update', requirePermission('product_edit'), bulkUpdatePrices);

// GET /api/products/:id - Get product by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getProductById);

// PUT /api/products/:id/price - Update product price (requires product_edit)
router.put('/:id/price', requirePermission('product_edit'), updateProductPrice);

// GET /api/products/:id/price-history - Get price history (requires product_view_cost)
router.get('/:id/price-history', requirePermission('product_view_cost'), getProductPriceHistory);

export default router;

