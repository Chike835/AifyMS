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

    // Lightweight query: Only check if user exists and is active
    // Use JWT payload for role_id, branch_id, permissions to avoid heavy joins
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'full_name', 'is_active', 'role_id', 'branch_id'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          required: false // LEFT JOIN - branch may be null
        }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Use permissions from JWT payload (faster, but may be stale if permissions changed)
    // If permissions need to be fresh, we can add a lightweight permission check here
    const permissions = decoded.permissions || [];

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role_id: decoded.role_id || user.role_id,
      role_name: decoded.role_name,
      branch_id: decoded.branch_id || user.branch_id,
      branch: user.branch,
      permissions: permissions
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

    // Lightweight query for optional auth
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'full_name', 'is_active', 'role_id', 'branch_id'],
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ]
    });

    if (user && user.is_active) {
      const permissions = decoded.permissions || [];
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: decoded.role_id || user.role_id,
        role_name: decoded.role_name,
        branch_id: decoded.branch_id || user.branch_id,
        branch: user.branch,
        permissions: permissions
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

