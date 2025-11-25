import { Branch, User } from '../models/index.js';

/**
 * GET /api/branches
 * Get all branches
 */
export const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ branches });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/branches
 * Create a new branch
 */
export const createBranch = async (req, res, next) => {
  try {
    const { name, code, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check if code already exists
    const existingBranch = await Branch.findOne({ where: { code } });
    if (existingBranch) {
      return res.status(400).json({ error: 'Branch code already exists' });
    }

    const branch = await Branch.create({
      name,
      code: code.toUpperCase(),
      address: address || null
    });

    res.status(201).json({ branch });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/branches/:id
 * Update branch details
 */
export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address } = req.body;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Check if code is being changed and if it conflicts
    if (code && code.toUpperCase() !== branch.code) {
      const existingBranch = await Branch.findOne({ where: { code: code.toUpperCase() } });
      if (existingBranch) {
        return res.status(400).json({ error: 'Branch code already exists' });
      }
    }

    branch.name = name || branch.name;
    branch.code = code ? code.toUpperCase() : branch.code;
    branch.address = address !== undefined ? address : branch.address;

    await branch.save();

    res.json({ branch });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/branches/:id
 * Delete a branch (soft delete - check for users first)
 */
export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Check if branch has users assigned
    const userCount = await User.count({ where: { branch_id: id } });
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete branch. ${userCount} user(s) are assigned to this branch. Please reassign users first.` 
      });
    }

    await branch.destroy();

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};

