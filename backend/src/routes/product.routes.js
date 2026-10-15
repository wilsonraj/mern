import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts
} from '../controllers/product.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { validateProduct } from '../validations/product.validation.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(getAllProducts)
  .post(protect, authorize('admin'), validate(validateProduct), createProduct);

router.delete('/bulk-delete', protect, authorize('admin'), bulkDeleteProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('admin'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

export default router;
