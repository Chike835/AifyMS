import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import attributeRoutes from './attributeRoutes.js';
import branchRoutes from './branchRoutes.js';
import recipeRoutes from './recipeRoutes.js';
import salesRoutes from './salesRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import importExportRoutes from './importExportRoutes.js';
import customerRoutes from './customerRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';

const router = express.Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/attributes', attributeRoutes);
router.use('/branches', branchRoutes);
router.use('/recipes', recipeRoutes);
router.use('/sales', salesRoutes);
router.use('/payments', paymentRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/', importExportRoutes);

export default router;

