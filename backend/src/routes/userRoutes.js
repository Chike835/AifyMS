import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getBranchesForUsers
} from '../controllers/userController.js';

const router = express.Router();

// ============================================
// USER ROUTES
// ============================================

// GET /users/roles - Get all roles (for dropdown)
router.get('/roles', authenticate, requirePermission('user_view'), getRoles);

// GET /users/branches - Get all branches (for dropdown)
router.get('/branches', authenticate, requirePermission('user_view'), getBranchesForUsers);

// GET /users - List all users (with filters)
router.get('/', authenticate, requirePermission('user_view'), getUsers);

// GET /users/:id - Get user by ID
router.get('/:id', authenticate, requirePermission('user_view'), getUserById);

// POST /users - Create a new user
router.post('/', authenticate, requirePermission('user_add'), createUser);

// PUT /users/:id - Update a user
router.put('/:id', authenticate, requirePermission('user_edit'), updateUser);

// DELETE /users/:id - Delete (deactivate) a user
router.delete('/:id', authenticate, requirePermission('user_delete'), deleteUser);

export default router;












