import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { User, Role, Permission, Branch } from '../models/index.js';

/**
 * Middleware to verify JWT token and attach user to request
 * Expects token in Authorization header as: "Bearer <token>"
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // PERFORMANCE FIX: Single optimized query to fetch user, role, permissions, and branch
    // This replaces the previous 2-query approach (user + separate getPermissions call)
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'full_name', 'is_active', 'role_id', 'branch_id'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          required: false // LEFT JOIN
        },
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['slug'],
              through: { attributes: [] } // Exclude junction table fields
            }
          ]
        }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Extract permission slugs from the nested include
    const permissionSlugs = user.role?.permissions?.map(p => p.slug) || [];

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
      role_name: user.role?.name || decoded.role_name, // Prefer DB role name
      branch_id: user.branch_id, // Prefer DB branch_id
      branch: user.branch,
      permissions: permissionSlugs // Fresh permissions from single query
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret);

    // PERFORMANCE FIX: Single query for optional auth (same optimization as authenticate)
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'full_name', 'is_active', 'role_id', 'branch_id'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['slug'],
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (user && user.is_active) {
      const permissionSlugs = user.role?.permissions?.map(p => p.slug) || [];

      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        role_name: user.role?.name || decoded.role_name,
        branch_id: user.branch_id,
        branch: user.branch,
        permissions: permissionSlugs
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // On error, just continue without user
    req.user = null;
    next();
  }
};

