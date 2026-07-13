import { Product } from '../models/index.js';

const createProduct = async (data) => {
  return Product.create(data);
};

const getAllProducts = async (queryParams) => {
  const { page = 1, limit = 20, search, category, sortBy = '-createdAt' } = queryParams;

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    filter.category = category;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter)
  ]);

  return {
    products,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    }
  };
};

const getProductById = async (id) => {
  return Product.findById(id);
};

const updateProduct = async (id, data) => {
  return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};

const deleteManyProducts = async (ids) => {
  return Product.deleteMany({ _id: { $in: ids } });
};

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteManyProducts
};
