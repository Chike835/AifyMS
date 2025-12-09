import sequelize from '../config/db.js';
import { Role, Permission, User } from '../models/index.js';
import { Op } from 'sequelize';

// Protected roles that cannot be deleted or have certain permissions removed
const PROTECTED_ROLES = ['Super Admin'];

/**
 * Get all roles with their permissions and user counts
 * Permission: role_manage
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'group_name'],
          through: { attributes: [] } // Exclude junction table fields
        }
      ],
      order: [['name', 'ASC']]
    });

    // Get user counts for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.count({ where: { role_id: role.id } });
        return {
          ...role.toJSON(),
          user_count: userCount
        };
      })
    );

    res.status(200).json(rolesWithCounts);
  } catch (error) {
    console.error('Error fetching roles:', error);
    next(error);
  }
};

/**
 * Get role by ID with permissions
 * Permission: role_manage
 */
export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'group_name'],
          through: { attributes: [] }
        }
      ]
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get user count
    const userCount = await User.count({ where: { role_id: id } });

    res.status(200).json({
      ...role.toJSON(),
      user_count: userCount
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    next(error);
  }
};

/**
 * Get all permissions grouped by category
 * Permission: role_manage
 */
export const getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({
      attributes: ['id', 'slug', 'group_name'],
      order: [['group_name', 'ASC'], ['slug', 'ASC']]
    });

    // Group permissions by group_name
    const grouped = permissions.reduce((acc, perm) => {
      const group = perm.group_name;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push({
        id: perm.id,
        slug: perm.slug
      });
      return acc;
    }, {});

    res.status(200).json({
      permissions,
      grouped
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    next(error);
  }
};

/**
 * Create a new role
 * Permission: role_manage
 */
export const createRole = async (req, res, next) => {
  try {
    const { name, description, permission_ids } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check for duplicate name
    const existingRole = await Role.findOne({
      where: { name: { [Op.iLike]: name.trim() } }
    });

    if (existingRole) {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }

    // Create the role
    const role = await Role.create({
      name: name.trim(),
      description: description?.trim() || null
    });

    // Assign permissions if provided
    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
      const permissions = await Permission.findAll({
        where: { id: permission_ids }
      });
      await role.setPermissions(permissions);
    }

    // Fetch created role with permissions
    const createdRole = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'group_name'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json(createdRole);
  } catch (error) {
    console.error('Error creating role:', error);
    next(error);
  }
};

/**
 * Update a role's name and description
 * Permission: role_manage
 */
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent renaming protected roles
    if (PROTECTED_ROLES.includes(role.name) && name && name.trim() !== role.name) {
      return res.status(403).json({ error: `Cannot rename the "${role.name}" role` });
    }

    // Check for duplicate name (excluding current role)
    if (name && name.trim().toLowerCase() !== role.name.toLowerCase()) {
      const existingRole = await Role.findOne({
        where: {
          name: { [Op.iLike]: name.trim() },
          id: { [Op.ne]: id }
        }
      });

      if (existingRole) {
        return res.status(409).json({ error: 'A role with this name already exists' });
      }
    }

    // Update the role
    await role.update({
      name: name ? name.trim() : role.name,
      description: description !== undefined ? (description?.trim() || null) : role.description
    });

    // Fetch updated role with permissions
    const updatedRole = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'group_name'],
          through: { attributes: [] }
        }
      ]
    });

    const userCount = await User.count({ where: { role_id: id } });

    res.status(200).json({
      ...updatedRole.toJSON(),
      user_count: userCount
    });
  } catch (error) {
    console.error('Error updating role:', error);
    next(error);
  }
};

/**
 * Update a role's permissions (replace all)
 * Permission: role_manage
 */
export const updateRolePermissions = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { permission_ids } = req.body;

    const role = await Role.findByPk(id, {
      include: [{ model: Permission, as: 'permissions' }]
    });

    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Role not found' });
    }

    // Validate permission_ids is an array
    if (!Array.isArray(permission_ids)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'permission_ids must be an array' });
    }

    // For Super Admin, ensure role_manage permission is always included
    if (role.name === 'Super Admin') {
      const roleManagePermission = await Permission.findOne({
        where: { slug: 'role_manage' }
      });

      if (roleManagePermission && !permission_ids.includes(roleManagePermission.id)) {
        await transaction.rollback();
        return res.status(403).json({
          error: 'Cannot remove "role_manage" permission from Super Admin role'
        });
      }
    }

    // Verify all permission IDs exist
    const permissions = await Permission.findAll({
      where: { id: permission_ids },
      transaction
    });

    if (permissions.length !== permission_ids.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'One or more permission IDs are invalid' });
    }

    // Replace all permissions
    await role.setPermissions(permissions, { transaction });

    await transaction.commit();

    // Fetch updated role with permissions
    const updatedRole = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'group_name'],
          through: { attributes: [] }
        }
      ]
    });

    const userCount = await User.count({ where: { role_id: id } });

    res.status(200).json({
      ...updatedRole.toJSON(),
      user_count: userCount
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating role permissions:', error);
    next(error);
  }
};

/**
 * Delete a role
 * Permission: role_manage
 */
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting protected roles
    if (PROTECTED_ROLES.includes(role.name)) {
      return res.status(403).json({ error: `Cannot delete the "${role.name}" role` });
    }

    // Check if role has users assigned
    const userCount = await User.count({ where: { role_id: id } });
    if (userCount > 0) {
      return res.status(400).json({
        error: `Cannot delete role with ${userCount} assigned user(s). Reassign users first.`
      });
    }

    // Delete the role (permissions associations will be removed automatically)
    await role.destroy();

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    next(error);
  }
};

























