import * as yup from 'yup';

export const productSchema = yup.object({
  name: yup.string().required('Product name is required').trim(),
  sku: yup.string().trim().nullable(),
  category: yup.string().trim().nullable(),
  price: yup
    .number()
    .typeError('Price must be a number')
    .required('Price is required')
    .min(0, 'Price cannot be negative'),
  quantity: yup
    .number()
    .typeError('Quantity must be a number')
    .min(0, 'Quantity cannot be negative')
    .default(0),
  description: yup.string().trim().nullable()
});
