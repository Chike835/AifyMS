import express from 'express';
import { importData, exportData, uploadMiddleware } from '../controllers/importExportController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/import/:entity - Import data from CSV (requires data_import)
router.post('/import/:entity', requirePermission('data_import'), uploadMiddleware, importData);

// GET /api/export/:entity - Export data to CSV (requires data_export_operational or data_export_financial)
router.get('/export/:entity', (req, res, next) => {
  const { entity } = req.params;
  // Financial exports (sales) require data_export_financial, others require data_export_operational
  const permission = entity === 'sales' ? 'data_export_financial' : 'data_export_operational';
  requirePermission(permission)(req, res, next);
}, exportData);

export default router;

