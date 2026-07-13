import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useDispatch } from 'react-redux';

import MuiFormField from '../../components/form/MuiFormField';
import { loginSchema } from './loginSchema';
import { useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [login, { isLoading }] = useLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur'
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const result = await login(data).unwrap();
      const payload = result?.data ?? result;
      dispatch(setCredentials({ user: payload, token: payload.token }));
      const redirectTo = location.state?.from?.pathname || '/products';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err?.data?.message || 'Invalid email or password');
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
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your credentials to access the dashboard.
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <MuiFormField name="email" control={control} label="Email" type="email" autoFocus />
          <MuiFormField name="password" control={control} label="Password" type="password" />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isSubmitting || isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>
        <Button color="inherit" fullWidth size="large" sx={{ mt: 2 }} onClick={() => navigate('/register')}>
          Create an account
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;
