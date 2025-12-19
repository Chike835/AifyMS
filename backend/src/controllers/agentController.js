import { Agent, AgentCommission, SalesOrder, Branch } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Helper to apply branch filtering
 */
const applyBranchFilter = (req, where) => {
  if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
    where.branch_id = req.user.branch_id;
  }
  return where;
};

/**
 * GET /api/agents
 * List all agents
 */
export const getAgents = async (req, res, next) => {
  try {
    const { active_only } = req.query;
    const where = applyBranchFilter(req, {});

    if (active_only === 'true') {
      where.is_active = true;
    }

    const agents = await Agent.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });

    res.json({ agents });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agents/:id
 * Get single agent with commission history
 */
export const getAgentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = applyBranchFilter(req, { id });

    const agent = await Agent.findOne({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get commission summary
    const commissions = await AgentCommission.findAll({
      where: { agent_id: id },
      include: [
        {
          model: SalesOrder,
          as: 'sales_order',
          attributes: ['id', 'invoice_number', 'created_at', 'total_amount']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Calculate totals
    const totalCommissions = await AgentCommission.sum('commission_amount', {
      where: { agent_id: id }
    });

    const pendingCommissions = await AgentCommission.sum('commission_amount', {
      where: { agent_id: id, payment_status: 'pending' }
    });

    const paidCommissions = await AgentCommission.sum('commission_amount', {
      where: { agent_id: id, payment_status: 'paid' }
    });

    res.json({
      agent,
      commissions,
      summary: {
        total_commissions: totalCommissions || 0,
        pending_commissions: pendingCommissions || 0,
        paid_commissions: paidCommissions || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/agents
 * Create new agent
 */
export const createAgent = async (req, res, next) => {
  try {
    const { name, email, phone, commission_rate, is_active, branch_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Super Admin can create agents for any branch, others for their own branch
    let targetBranchId = branch_id;
    if (req.user?.role_name !== 'Super Admin') {
      targetBranchId = req.user.branch_id;
    }

    const agent = await Agent.create({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      commission_rate: commission_rate ? parseFloat(commission_rate) : 0,
      is_active: is_active !== undefined ? is_active : true,
      branch_id: targetBranchId
    });

    const agentWithBranch = await Agent.findByPk(agent.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.status(201).json({
      message: 'Agent created successfully',
      agent: agentWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/agents/:id
 * Update agent
 */
export const updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, commission_rate, is_active, branch_id } = req.body;

    const where = applyBranchFilter(req, { id });
    const agent = await Agent.findOne({ where });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or unauthorized' });
    }

    // Super Admin can change branch, others cannot
    let targetBranchId = agent.branch_id;
    if (req.user?.role_name === 'Super Admin' && branch_id !== undefined) {
      targetBranchId = branch_id;
    }

    if (name !== undefined) agent.name = name.trim();
    if (email !== undefined) agent.email = email?.trim() || null;
    if (phone !== undefined) agent.phone = phone?.trim() || null;
    if (commission_rate !== undefined) agent.commission_rate = parseFloat(commission_rate);
    if (is_active !== undefined) agent.is_active = is_active;
    if (targetBranchId !== undefined) agent.branch_id = targetBranchId;

    await agent.save();

    const agentWithBranch = await Agent.findByPk(agent.id, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    res.json({
      message: 'Agent updated successfully',
      agent: agentWithBranch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/agents/:id
 * Delete agent (soft delete by setting is_active = false)
 */
export const deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = applyBranchFilter(req, { id });
    const agent = await Agent.findOne({ where });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or unauthorized' });
    }

    // Check if agent has commissions
    const commissionCount = await AgentCommission.count({
      where: { agent_id: id }
    });

    if (commissionCount > 0) {
      // Soft delete
      agent.is_active = false;
      await agent.save();
      return res.json({
        message: 'Agent deactivated (has commission history)',
        agent
      });
    }

    // Hard delete if no commissions
    await agent.destroy();

    res.json({
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agents/:id/commissions
 * Get agent commissions with filters
 */
export const getAgentCommissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status, start_date, end_date } = req.query;

    const where = applyBranchFilter(req, { id });
    const agent = await Agent.findOne({ where });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or unauthorized' });
    }

    const commissionWhere = { agent_id: id };
    if (payment_status) {
      commissionWhere.payment_status = payment_status;
    }
    if (start_date || end_date) {
      commissionWhere.created_at = {};
      if (start_date) commissionWhere.created_at[Op.gte] = new Date(start_date);
      if (end_date) commissionWhere.created_at[Op.lte] = new Date(end_date);
    }

    const commissions = await AgentCommission.findAll({
      where: commissionWhere,
      include: [
        {
          model: SalesOrder,
          as: 'sales_order',
          attributes: ['id', 'invoice_number', 'created_at', 'total_amount', 'customer_id'],
          include: [{ model: Branch, as: 'branch', attributes: ['name'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ commissions });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/agents/commissions/:id/pay
 * Mark commission as paid
 */
export const markCommissionPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const commission = await AgentCommission.findByPk(id, {
      include: [{ model: Agent, as: 'agent' }]
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    // Check branch access
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      const order = await SalesOrder.findByPk(commission.sales_order_id);
      if (order && order.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Unauthorized to update this commission' });
      }
    }

    if (commission.payment_status === 'paid') {
      return res.status(400).json({ error: 'Commission is already marked as paid' });
    }

    commission.payment_status = 'paid';
    commission.paid_at = new Date();
    if (notes) commission.notes = notes;

    await commission.save();

    res.json({
      message: 'Commission marked as paid',
      commission
    });
  } catch (error) {
    next(error);
  }
};
































