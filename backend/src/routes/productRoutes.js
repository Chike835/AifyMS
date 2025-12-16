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
  addProductBatch,
  createDefaultBatches,
  generateVariants,
  getVariantLedger,
  getProductInstanceCodes,
  deleteVariant,
  bulkDeleteVariants
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { activityLogger } from '../middleware/activityLogger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/products - List products (requires product_view)
router.get('/', requirePermission('product_view'), getProducts);

// POST /api/products - Create product (requires product_add)
router.post(
  '/',
  requirePermission('product_add'),
  activityLogger(
    'CREATE',
    'products',
    (req, data) => `Created product: ${data?.product?.name || req.body.name} (SKU: ${data?.product?.sku || req.body.sku})`,
    (req, data) => ({ reference_type: 'product', reference_id: data?.product?.id })
  ),
  createProduct
);

// PUT /api/products/bulk-price-update - Bulk update prices (requires product_edit)
router.put('/bulk-price-update', requirePermission('product_edit'), bulkUpdatePrices);

// GET /api/products/:id - Get product by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getProductById);

// PUT /api/products/:id - Update product (requires product_edit)
router.put(
  '/:id',
  requirePermission('product_edit'),
  activityLogger(
    'UPDATE',
    'products',
    (req, data) => `Updated product: ${data?.product?.name || 'ID: ' + req.params.id}`,
    (req, data) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  updateProduct
);

// DELETE /api/products/:id - Delete product (requires product_delete)
router.delete(
  '/:id',
  requirePermission('product_delete'),
  activityLogger(
    'DELETE',
    'products',
    (req, data) => `Deleted product ID: ${req.params.id}`,
    (req, data) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  deleteProduct
);

// PUT /api/products/:id/price - Update product price (requires product_edit)
router.put(
  '/:id/price',
  requirePermission('product_edit'),
  activityLogger(
    'UPDATE',
    'products',
    (req, data) => `Updated price for product ID: ${req.params.id}`,
    (req) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  updateProductPrice
);

// GET /api/products/:id/price-history - Get price history (requires product_view_cost)
router.get('/:id/price-history', requirePermission('product_view_cost'), getProductPriceHistory);

// GET /api/products/:id/stock - Get product stock across branches (requires product_view)
router.get('/:id/stock', requirePermission('product_view'), getProductStock);

// GET /api/products/:id/sales - Get product sales history (requires product_view)
router.get('/:id/sales', requirePermission('product_view'), getProductSales);

// GET /api/products/:id/batches - Get product batches (requires batch_view or product_view)
router.get('/:id/batches', requirePermission('batch_view', 'product_view'), getProductBatches);

// POST /api/products/:id/batches - Add batch to product (requires batch_create or stock_add_opening)
router.post(
  '/:id/batches',
  requirePermission('batch_create', 'stock_add_opening'),
  activityLogger(
    'CREATE',
    'inventory_batches',
    (req, data) => `Added batch to product ID: ${req.params.id} (Qty: ${req.body.initial_quantity})`,
    (req, data) => ({ reference_type: 'inventory_batch', reference_id: data?.batch?.id })
  ),
  addProductBatch
);

// POST /api/products/:id/batches/defaults - Create default batches for product (requires batch_create or stock_add_opening)
router.post(
  '/:id/batches/defaults',
  requirePermission('batch_create', 'stock_add_opening'),
  activityLogger(
    'CREATE',
    'inventory_batches',
    (req, data) => `Created default batches for product ID: ${req.params.id}`,
    (req, data) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  createDefaultBatches
);

// POST /api/products/:id/generate-variants - Generate variants (requires product_edit)
router.post(
  '/:id/generate-variants',
  requirePermission('product_edit'),
  activityLogger(
    'UPDATE',
    'products',
    (req, data) => `Generated variants for product ID: ${req.params.id}`,
    (req) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  generateVariants
);

// DELETE /api/products/:id/variants/:variantId - Delete variant (requires product_edit)
router.delete(
  '/:id/variants/:variantId',
  requirePermission('product_edit'),
  activityLogger(
    'DELETE',
    'products',
    (req, data) => `Deleted variant ${req.params.variantId} from product ${req.params.id}`,
    (req) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  deleteVariant
);

// POST /api/products/:id/variants/bulk-delete - Bulk delete variants (requires product_edit)
router.post(
  '/:id/variants/bulk-delete',
  requirePermission('product_edit'),
  activityLogger(
    'DELETE',
    'products',
    (req, data) => `Bulk deleted variants from product ID: ${req.params.id}`,
    (req) => ({ reference_type: 'product', reference_id: req.params.id })
  ),
  bulkDeleteVariants
);

// GET /api/products/:id/variant-ledger - Get ledger for variant (requires product_view)
router.get('/:id/variant-ledger', requirePermission('product_view'), getVariantLedger);

// GET /api/products/:id/instance-codes - Get instance codes (requires product_view)
router.get('/:id/instance-codes', requirePermission('product_view'), getProductInstanceCodes);

export default router;
