import jwt from 'jsonwebtoken';
import { logActivitySync } from '../middleware/activityLogger.js';
import config from '../config/env.js';
import { User, Role, Branch, Permission } from '../models/index.js';

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

    console.log(`[DEBUG] Login attempt for: ${email}`);

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
      console.log('[DEBUG] User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      console.log('[DEBUG] User inactive');
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check password
    let isValidPassword = false;
    try {
      console.log(`[DEBUG] Checking password for ${user.email}. Hash starts with: ${user.password_hash?.substring(0, 10)}...`);
      isValidPassword = await user.checkPassword(password);
      console.log(`[DEBUG] Password valid: ${isValidPassword}`);
    } catch (error) {
      console.error('Password verification error:', error);
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

    // Log successful login
    await logActivitySync(
      'LOGIN',
      'auth',
      `User ${user.email} logged in`,
      req,
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

