import express from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branchController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/branches - Get all branches
router.get('/', getBranches);

// POST /api/branches - Create branch (requires settings_manage)
router.post('/', requirePermission('settings_manage'), createBranch);

// PUT /api/branches/:id - Update branch (requires settings_manage)
router.put('/:id', requirePermission('settings_manage'), updateBranch);

// DELETE /api/branches/:id - Delete branch (requires settings_manage)
router.delete('/:id', requirePermission('settings_manage'), deleteBranch);

export default router;

