import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentCommissions,
  markCommissionPaid
} from '../controllers/agentController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List agents (requires agent_view)
router.get('/', requirePermission('agent_view'), getAgents);

// Get single agent (requires agent_view)
router.get('/:id', requirePermission('agent_view'), getAgentById);

// Create agent (requires agent_manage)
router.post('/', requirePermission('agent_manage'), createAgent);

// Update agent (requires agent_manage)
router.put('/:id', requirePermission('agent_manage'), updateAgent);

// Delete agent (requires agent_manage)
router.delete('/:id', requirePermission('agent_manage'), deleteAgent);

// Get agent commissions (requires agent_view)
router.get('/:id/commissions', requirePermission('agent_view'), getAgentCommissions);

// Mark commission as paid (requires agent_manage)
router.put('/commissions/:id/pay', requirePermission('agent_manage'), markCommissionPaid);

export default router;










