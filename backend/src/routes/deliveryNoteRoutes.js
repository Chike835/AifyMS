import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getDefaultTemplate
} from '../controllers/deliveryNoteController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get default template (all authenticated users can view)
router.get('/templates/default', getDefaultTemplate);

// List templates (requires sale_view_all)
router.get('/templates', requirePermission('sale_view_all'), getTemplates);

// Get single template (requires sale_view_all)
router.get('/templates/:id', requirePermission('sale_view_all'), getTemplateById);

// Create template (requires sale_edit_price)
router.post('/templates', requirePermission('sale_edit_price'), createTemplate);

// Update template (requires sale_edit_price)
router.put('/templates/:id', requirePermission('sale_edit_price'), updateTemplate);

// Delete template (requires sale_edit_price)
router.delete('/templates/:id', requirePermission('sale_edit_price'), deleteTemplate);

export default router;


