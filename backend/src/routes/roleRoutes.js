import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getRoles,
  getRoleById,
  getAllPermissions,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole
} from '../controllers/roleController.js';

const router = express.Router();

// ============================================
// ROLE MANAGEMENT ROUTES
// All routes require 'role_manage' permission (Super Admin only)
// ============================================

// GET /roles/permissions - Get all permissions (for matrix editor)
router.get('/permissions', authenticate, requirePermission('role_manage'), getAllPermissions);

// GET /roles - List all roles with permissions
router.get('/', authenticate, requirePermission('role_manage'), getRoles);

// GET /roles/:id - Get role by ID with permissions
router.get('/:id', authenticate, requirePermission('role_manage'), getRoleById);

// POST /roles - Create a new role
router.post('/', authenticate, requirePermission('role_manage'), createRole);

// PUT /roles/:id - Update role name/description
router.put('/:id', authenticate, requirePermission('role_manage'), updateRole);

// PUT /roles/:id/permissions - Update role permissions (replace all)
router.put('/:id/permissions', authenticate, requirePermission('role_manage'), updateRolePermissions);

// DELETE /roles/:id - Delete a role
router.delete('/:id', authenticate, requirePermission('role_manage'), deleteRole);

export default router;












