import express from 'express';
import upload from '../config/multer.config.js';
import { bulkUploadProducts } from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/bulk', protect, upload.single('file'), bulkUploadProducts);

export default router;
