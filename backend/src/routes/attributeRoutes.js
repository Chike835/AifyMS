import express from 'express';
import {
  getAllAttributes,
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getAllColors,
  createColor,
  updateColor,
  deleteColor,
  getAllGauges,
  createGauge,
  updateGauge,
  deleteGauge,
  importBrands,
  exportBrands
} from '../controllers/attributeController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { uploadMiddleware } from '../controllers/importExportController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Combined endpoint to get all attributes
router.get('/', requirePermission('product_view'), getAllAttributes);

// Brands routes
router.get('/brands', requirePermission('product_view'), getAllBrands);
router.post('/brands', requirePermission('product_add'), createBrand);
// IMPORTANT: Specific routes (/import, /export) must come BEFORE parameterized routes (/:id)
router.post('/brands/import', requirePermission('product_add'), uploadMiddleware, importBrands);
router.get('/brands/export', requirePermission('product_view'), exportBrands);
router.put('/brands/:id', requirePermission('product_edit'), updateBrand);
router.delete('/brands/:id', requirePermission('product_delete'), deleteBrand);

// Colors routes
router.get('/colors', requirePermission('product_view'), getAllColors);
router.post('/colors', requirePermission('product_add'), createColor);
router.put('/colors/:id', requirePermission('product_edit'), updateColor);
router.delete('/colors/:id', requirePermission('product_delete'), deleteColor);

// Gauges routes
router.get('/gauges', requirePermission('product_view'), getAllGauges);
router.post('/gauges', requirePermission('product_add'), createGauge);
router.put('/gauges/:id', requirePermission('product_edit'), updateGauge);
router.delete('/gauges/:id', requirePermission('product_delete'), deleteGauge);

export default router;

