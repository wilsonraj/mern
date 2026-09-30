import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useDispatch } from 'react-redux';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

import { showNotification } from '../../app/notificationSlice';
import MuiFormField from '../../components/form/MuiFormField';
import { loginSchema } from './loginSchema';
import { useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
    try {
      const result = await login(data).unwrap();
      const payload = result?.data ?? result;
      dispatch(setCredentials({ user: payload.user, accessToken: payload.accessToken }));
      dispatch(showNotification({ message: 'Signed in successfully.', severity: 'success' }));
      const redirectTo = location.state?.from?.pathname || '/products';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err?.data?.message || 'Invalid email or password';
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
              Inventory, in focus
            </Box>
            <Typography component="h1" className="auth-showcase-title">
              Your business, beautifully organized.
            </Typography>
            <Typography className="auth-showcase-description">
              A calmer way to manage products, keep your catalog in sync, and stay on top of every detail.
            </Typography>
          </Box>
          <Typography className="auth-showcase-footer">A clearer view of what you have in stock.</Typography>
        </Box>

        <Box className="auth-form-panel">
          <Box className="auth-form-content">
            <Box className="auth-mobile-brand">
              <Box className="glass-brand-mark"><Inventory2OutlinedIcon fontSize="small" /></Box>
              <span>STOCKROOM</span>
            </Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
              WELCOME BACK
            </Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 0.5 }}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3.5, lineHeight: 1.7 }}>
              Enter your details to continue to your workspace.
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <MuiFormField name="email" control={control} label="Email address" type="email" autoFocus />
              <MuiFormField name="password" control={control} label="Password" type="password" />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting || isLoading}
                sx={{ mt: 2, minHeight: 50 }}
              >
                {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Continue to dashboard'}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
              New here?{' '}
              <Button color="primary" size="small" onClick={() => navigate('/register')} sx={{ minWidth: 0, px: 0.5 }}>
                Create an account
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
