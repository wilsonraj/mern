import * as productService from '../services/product.service.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Create a new product
// @route   POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return ApiResponse.success(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products (supports pagination, search, filtering)
// @route   GET /api/products
const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    return ApiResponse.success(res, result, 'Products fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }
    return ApiResponse.success(res, product, 'Product fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }
    return ApiResponse.success(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a single product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }
    return ApiResponse.success(res, null, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete products by array of IDs
// @route   DELETE /api/products/bulk-delete
const bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.error(res, 'Please provide an array of product IDs', 400);
    }

    const result = await productService.deleteManyProducts(ids);
    return ApiResponse.success(
      res,
      { deletedCount: result.deletedCount },
      'Products deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts
};
