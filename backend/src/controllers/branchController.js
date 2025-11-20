import { Branch } from '../models/index.js';

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

