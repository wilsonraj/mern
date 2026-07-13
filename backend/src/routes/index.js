import express from 'express';
import productRoutes from './product.routes.js';
import uploadRoutes from './upload.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

router.use('/products', productRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);

export default router;
