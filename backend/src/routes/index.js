import express from 'express';
import productRoutes from './product.routes.js';
import uploadRoutes from './upload.routes.js';
import userRoutes from './user.routes.js';
import communityRoutes from './community.routes.js';
import feedRoutes from './feed.routes.js';
import appointmentRoutes from './appointment.routes.js';

const router = express.Router();

router.use('/products', productRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);
router.use('/community', communityRoutes);
router.use('/feed', feedRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
