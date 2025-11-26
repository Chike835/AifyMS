import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { User, Role, Branch, Permission } from '../models/index.js';
import { logActivitySync } from '../middleware/activityLogger.js';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with role and branch
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['id', 'slug', 'group_name']
            }
          ]
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check password with error handling
    let isValidPassword = false;
    try {
      isValidPassword = await user.checkPassword(password);
    } catch (passwordError) {
      console.error('Password verification error:', passwordError.message);
      return res.status(500).json({ error: 'Authentication service error' });
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Extract permissions
    const permissions = user.role?.permissions?.map(p => p.slug) || [];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Log login activity
    // Create a mock req object for logging
    const mockReq = {
      user: {
        id: user.id,
        branch_id: user.branch_id
      },
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || req.connection?.remoteAddress,
      headers: req.headers
    };

    await logActivitySync(
      'LOGIN',
      'auth',
      `User ${user.full_name} logged in`,
      mockReq,
      'user',
      user.id
    );

    // Return user data with token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        role_name: user.role?.name,
        branch_id: user.branch_id,
        branch: user.branch,
        permissions: permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user details
 */
export const getMe = async (req, res, next) => {
  try {
    // User is already attached by authenticate middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
