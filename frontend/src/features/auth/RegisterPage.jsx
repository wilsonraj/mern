import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useDispatch } from 'react-redux';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

import { showNotification } from '../../app/notificationSlice';
import MuiFormField from '../../components/form/MuiFormField';
import { registerSchema } from './registerSchema';
import { useRegisterMutation } from './authApi';
import { setCredentials } from './authSlice';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
    try {
      const result = await register(data).unwrap();
      const payload = result?.data ?? result;
      dispatch(setCredentials({ user: payload.user, accessToken: payload.accessToken }));
      dispatch(showNotification({ message: 'Account created successfully.', severity: 'success' }));
      navigate('/products', { replace: true });
    } catch (err) {
      const message = err?.data?.message || 'Registration failed';
      dispatch(showNotification({ message, severity: 'error' }));
    }
  };

  return (
    <Box className="auth-page" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Box className="auth-shell">
        <Box className="auth-showcase">
          <Box className="auth-brand">
            <Box className="auth-brand-mark"><Inventory2OutlinedIcon /></Box>
            <span>STOCKROOM</span>
          </Box>
          <Box className="auth-showcase-copy">
            <Box className="auth-showcase-eyebrow">
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 14, mr: 0.75 }} />
              Start with clarity
            </Box>
            <Typography component="h1" className="auth-showcase-title">
              Make room for better business.
            </Typography>
            <Typography className="auth-showcase-description">
              Create your workspace and bring your product catalog into one simple, thoughtfully designed place.
            </Typography>
          </Box>
          <Typography className="auth-showcase-footer">Good things start with an organized inventory.</Typography>
        </Box>

        <Box className="auth-form-panel">
          <Box className="auth-form-content">
            <Box className="auth-mobile-brand">
              <Box className="glass-brand-mark"><Inventory2OutlinedIcon fontSize="small" /></Box>
              <span>STOCKROOM</span>
            </Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
              YOUR WORKSPACE
            </Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 0.5 }}>
              Create your account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2.5, lineHeight: 1.7 }}>
              A few details and you’re ready to get started.
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <MuiFormField name="name" control={control} label="Full name" />
              <MuiFormField name="email" control={control} label="Email address" type="email" />
              <MuiFormField name="password" control={control} label="Password" type="password" />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting || isLoading}
                sx={{ mt: 2, minHeight: 50 }}
              >
                {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
              Already have an account?{' '}
              <Button color="primary" size="small" onClick={() => navigate('/login')} sx={{ minWidth: 0, px: 0.5 }}>
                Sign in
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RegisterPage;
