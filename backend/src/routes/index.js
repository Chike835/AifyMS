import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import recipeRoutes from './recipeRoutes.js';
import salesRoutes from './salesRoutes.js';
import paymentRoutes from './paymentRoutes.js';

const router = express.Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);
router.use('/sales', salesRoutes);
router.use('/payments', paymentRoutes);

export default router;

