import express from 'express';
import { getBranches } from '../controllers/branchController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/branches - Get all branches
router.get('/', getBranches);

export default router;

