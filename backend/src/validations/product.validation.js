/**
 * Simple manual validation for product payloads.
 * Swap this out for Joi/Zod/Yup if you prefer schema-based validation.
 */
const validateProduct = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Product name is required');
  }

  if (data.price === undefined || data.price === null || isNaN(Number(data.price))) {
    errors.push('Price is required and must be a number');
  } else if (Number(data.price) < 0) {
    errors.push('Price cannot be negative');
  }

  if (data.quantity !== undefined && isNaN(Number(data.quantity))) {
    errors.push('Quantity must be a number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export { validateProduct };
