import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { toggleTheme } from '../../theme/themeSlice';
import { logout, selectCurrentUser } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApi';
import { showNotification } from '../../app/notificationSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector((state) => state.theme.mode);
  const user = useSelector(selectCurrentUser);
  const [logoutSession, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    let revoked = true;
    try {
      await logoutSession().unwrap();
    } catch (error) {
      revoked = false;
      dispatch(showNotification({
        message: error?.data?.message || 'Could not revoke the refresh session.',
        severity: 'error'
      }));
    }
    dispatch(logout());
    if (revoked) {
      dispatch(showNotification({ message: 'You have been signed out.', severity: 'success' }));
    }
    navigate('/login', { replace: true });
  };

  return (
    <AppBar position="static" elevation={0} color="default">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          MERN Admin
        </Typography>

        <IconButton onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {user.name}
            </Typography>
            <Button variant="outlined" size="small" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <CircularProgress size={18} /> : 'Log out'}
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
