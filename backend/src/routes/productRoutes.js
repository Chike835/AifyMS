import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductPrice,
  getProductPriceHistory,
  bulkUpdatePrices,
  getProductStock,
  getProductSales,
  getProductBatches,
  addProductBatch
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

// PUT /api/products/:id - Update product (requires product_edit)
router.put('/:id', requirePermission('product_edit'), updateProduct);

// DELETE /api/products/:id - Delete product (requires product_delete)
router.delete('/:id', requirePermission('product_delete'), deleteProduct);

// PUT /api/products/:id/price - Update product price (requires product_edit)
router.put('/:id/price', requirePermission('product_edit'), updateProductPrice);

// GET /api/products/:id/price-history - Get price history (requires product_view_cost)
router.get('/:id/price-history', requirePermission('product_view_cost'), getProductPriceHistory);

// GET /api/products/:id/stock - Get product stock across branches (requires product_view)
router.get('/:id/stock', requirePermission('product_view'), getProductStock);

// GET /api/products/:id/sales - Get product sales history (requires product_view)
router.get('/:id/sales', requirePermission('product_view'), getProductSales);

// GET /api/products/:id/batches - Get product batches (requires batch_view or product_view)
router.get('/:id/batches', requirePermission('batch_view', 'product_view'), getProductBatches);

// POST /api/products/:id/batches - Add batch to product (requires batch_create or stock_add_opening)
router.post('/:id/batches', requirePermission('batch_create', 'stock_add_opening'), addProductBatch);

export default router;
