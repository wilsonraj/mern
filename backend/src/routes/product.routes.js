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
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(getAllProducts)
  .post(protect, validate(validateProduct), createProduct);

router.delete('/bulk-delete', protect, bulkDeleteProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

export default router;
