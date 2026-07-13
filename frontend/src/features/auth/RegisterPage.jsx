import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useDispatch } from 'react-redux';

import MuiFormField from '../../components/form/MuiFormField';
import { registerSchema } from './registerSchema';
import { useRegisterMutation } from './authApi';
import { setCredentials } from './authSlice';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [register, { isLoading }] = useRegisterMutation();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onBlur'
  });

  const onSubmit = async (data) => {
    setServerError('');

    try {
      const result = await register(data).unwrap();
      const payload = result?.data ?? result;
      dispatch(setCredentials({ user: payload, token: payload.token }));
      navigate('/products', { replace: true });
    } catch (err) {
      setServerError(err?.data?.message || 'Registration failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={700}>
          Create account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Register a new account to access the dashboard.
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <MuiFormField name="name" control={control} label="Full name" />
          <MuiFormField name="email" control={control} label="Email" type="email" />
          <MuiFormField name="password" control={control} label="Password" type="password" />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isSubmitting || isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
          </Button>

          <Button
            color="inherit"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            onClick={() => navigate('/login')}
          >
            Already have an account? Sign in
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
