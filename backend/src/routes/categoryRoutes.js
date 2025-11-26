import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  importCategories,
  exportCategories
} from '../controllers/categoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import { uploadMiddleware } from '../controllers/importExportController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/categories - List categories (requires product_view)
router.get('/', requirePermission('product_view'), getCategories);

// POST /api/categories - Create category (requires product_add)
router.post('/', requirePermission('product_add'), createCategory);

// POST /api/categories/import - Import categories from CSV/Excel
router.post('/import', requirePermission('product_add'), uploadMiddleware, importCategories);

// GET /api/categories/export - Export categories to CSV
router.get('/export', requirePermission('product_view'), exportCategories);

// GET /api/categories/:id - Get category by ID (requires product_view)
router.get('/:id', requirePermission('product_view'), getCategoryById);

// PUT /api/categories/:id - Update category (requires product_edit)
router.put('/:id', requirePermission('product_edit'), updateCategory);

// DELETE /api/categories/:id - Delete category (requires product_delete)
router.delete('/:id', requirePermission('product_delete'), deleteCategory);

export default router;







