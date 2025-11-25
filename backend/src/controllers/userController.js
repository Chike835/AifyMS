import { User, Role, Branch, Permission } from '../models/index.js';
import { hashPassword } from '../utils/passwordUtils.js';
import { Op } from 'sequelize';

/**
 * Get all users (branch-filtered for non-Super Admin)
 * Permission: user_view
 */
export const getUsers = async (req, res, next) => {
  try {
    const { branch_id, role_name } = req.user;
    const { page = 1, limit = 20, search, role_id, is_active } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause with branch filtering
    let whereClause = {};
    
    // Non-Super Admin can only see users in their branch
    const canViewGlobal = req.user?.permissions?.includes('user_view_global');
    if (!canViewGlobal && role_name !== 'Super Admin') {
      whereClause.branch_id = branch_id;
    } else if (req.query.branch_id) {
      whereClause.branch_id = req.query.branch_id;
    }

    // Filter by role
    if (role_id) {
      whereClause.role_id = role_id;
    }

    // Filter by active status
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // Search by name or email
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      attributes: { exclude: ['password_hash'] },
      order: [['full_name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.status(200).json({
      total_count: count,
      total_pages: Math.ceil(count / parseInt(limit)),
      current_page: parseInt(page),
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    next(error);
  }
};

/**
 * Get user by ID
 * Permission: user_view
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name } = req.user;

    const user = await User.findByPk(id, {
      include: [
        { 
          model: Role, 
          as: 'role', 
          attributes: ['id', 'name'],
          include: [
            { model: Permission, as: 'permissions', attributes: ['id', 'slug', 'group_name'] }
          ]
        },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Branch access check (unless user has global view permission)
    const canViewGlobal = req.user?.permissions?.includes('user_view_global');
    if (!canViewGlobal && role_name !== 'Super Admin' && user.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    next(error);
  }
};

/**
 * Create a new user
 * Permission: user_add
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, password, full_name, role_id, branch_id: targetBranchId, is_active } = req.body;
    const { branch_id: creatorBranchId, role_name } = req.user;

    // Validate required fields
    if (!email || !password || !full_name || !role_id) {
      return res.status(400).json({ error: 'Email, password, full name, and role are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Determine branch_id
    let assignedBranchId = targetBranchId;
    if (role_name !== 'Super Admin') {
      // Non-Super Admin can only create users for their own branch
      assignedBranchId = creatorBranchId;
    }

    // Super Admin doesn't require a branch
    if (role.name === 'Super Admin') {
      assignedBranchId = null;
    } else if (!assignedBranchId) {
      return res.status(400).json({ error: 'Branch is required for non-Super Admin users' });
    }

    // If branch is specified, verify it exists
    if (assignedBranchId) {
      const branch = await Branch.findByPk(assignedBranchId);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }
    }

    // Create user (password will be hashed by model hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: password, // Hook will hash this
      full_name: full_name.trim(),
      role_id,
      branch_id: assignedBranchId,
      is_active: is_active !== undefined ? is_active : true
    });

    // Fetch created user with associations (without password)
    const createdUser = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Error creating user:', error);
    next(error);
  }
};

/**
 * Update a user
 * Permission: user_edit
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, password, full_name, role_id, branch_id: targetBranchId, is_active } = req.body;
    const { branch_id: editorBranchId, role_name, id: editorId } = req.user;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Branch access check
    const canViewGlobal = req.user?.permissions?.includes('user_view_global');
    if (!canViewGlobal && role_name !== 'Super Admin' && user.branch_id !== editorBranchId) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }

    // Prevent deactivating yourself
    if (id === editorId && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Validate email if being changed
    if (email && email.toLowerCase() !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const existingUser = await User.findOne({ 
        where: { 
          email: email.toLowerCase(),
          id: { [Op.ne]: id }
        } 
      });
      if (existingUser) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
    }

    // Validate password if being changed
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify role if being changed
    let newRole = user.role;
    if (role_id && role_id !== user.role_id) {
      newRole = await Role.findByPk(role_id);
      if (!newRole) {
        return res.status(404).json({ error: 'Role not found' });
      }
    }

    // Determine branch_id
    let assignedBranchId = targetBranchId !== undefined ? targetBranchId : user.branch_id;
    if (newRole.name === 'Super Admin') {
      assignedBranchId = null;
    }

    // Build update object
    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password_hash = password; // Hook will hash
    if (full_name) updateData.full_name = full_name.trim();
    if (role_id) updateData.role_id = role_id;
    if (targetBranchId !== undefined || newRole.name === 'Super Admin') {
      updateData.branch_id = assignedBranchId;
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    await user.update(updateData);

    // Fetch updated user
    const updatedUser = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    next(error);
  }
};

/**
 * Delete a user (soft delete by deactivating)
 * Permission: user_delete
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { branch_id, role_name, id: deleterId } = req.user;

    // Prevent deleting yourself
    if (id === deleterId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Branch access check
    const canViewGlobal = req.user?.permissions?.includes('user_view_global');
    if (!canViewGlobal && role_name !== 'Super Admin' && user.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }

    // Soft delete (deactivate)
    await user.update({ is_active: false });

    res.status(200).json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    next(error);
  }
};

/**
 * Get all roles (for dropdown)
 * Permission: user_view
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    res.status(200).json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    next(error);
  }
};

/**
 * Get all branches (for dropdown)
 * Permission: user_view
 */
export const getBranchesForUsers = async (req, res, next) => {
  try {
    const branches = await Branch.findAll({
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });

    res.status(200).json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    next(error);
  }
};


