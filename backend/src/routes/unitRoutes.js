import express from 'express';
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  importUnits,
  exportUnits
} from '../controllers/unitController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { uploadMiddleware } from '../controllers/importExportController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/units - List units (requires product_view)
router.get('/', requirePermission('product_view'), getUnits);

// POST /api/units - Create unit (requires product_add)
router.post('/', requirePermission('product_add'), createUnit);

// POST /api/units/import - Import units from CSV/Excel
router.post('/import', requirePermission('product_add'), uploadMiddleware, importUnits);

// GET /api/units/export - Export units to CSV
router.get('/export', requirePermission('product_view'), exportUnits);

// GET /api/units/:id - Get unit by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getUnitById);

// PUT /api/units/:id - Update unit (requires product_edit)
router.put('/:id', requirePermission('product_edit'), updateUnit);

// DELETE /api/units/:id - Delete unit (requires product_delete)
router.delete('/:id', requirePermission('product_delete'), deleteUnit);

export default router;







