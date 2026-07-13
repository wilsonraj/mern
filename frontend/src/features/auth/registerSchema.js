import * as yup from 'yup';

export const registerSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().required('Email is required').email('Enter a valid email address'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters')
});
