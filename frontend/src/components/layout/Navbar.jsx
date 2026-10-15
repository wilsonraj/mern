import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DynamicFeedOutlinedIcon from '@mui/icons-material/DynamicFeedOutlined';
import Badge from '@mui/material/Badge';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { toggleTheme } from '../../theme/themeSlice';
import { logout, selectCurrentUser } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApi';
import { showNotification } from '../../app/notificationSlice';
import { useGetUnreadMessageCountsQuery } from '../../features/community/communityApi';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector((state) => state.theme.mode);
  const user = useSelector(selectCurrentUser);
  const { data: unreadResponse } = useGetUnreadMessageCountsQuery(undefined, { skip: !user });
  const unreadCount = unreadResponse?.data?.total || 0;
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
    <AppBar position="sticky" elevation={0} color="default" className="glass-appbar">
      <Toolbar sx={{ gap: 2, maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, minHeight: 72 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <span className="glass-brand">
            <span className="glass-brand-mark"><HealthAndSafetyOutlinedIcon fontSize="small" /></span>
            CARE CONNECT
          </span>
        </Typography>

        <IconButton onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme" className="theme-toggle">
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {user && (
          <Button
            color="inherit"
            size="small"
            startIcon={<DynamicFeedOutlinedIcon />}
            onClick={() => navigate('/feed')}
          >
            Feed
          </Button>
        )}

        {user && (
          <Button
            color="inherit"
            size="small"
            startIcon={(
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <ForumOutlinedIcon />
              </Badge>
            )}
            onClick={() => navigate('/messages')}
          >
            Messages
          </Button>
        )}

        {user?.role === 'patient' && (
          <Button color="inherit" size="small" onClick={() => navigate('/appointments')}>
            Appointments
          </Button>
        )}

        {user?.role === 'doctor' && (
          <Button color="inherit" size="small" onClick={() => navigate('/doctor')}>
            Doctor portal
          </Button>
        )}

        {user?.role === 'admin' && (
          <Button
            color="inherit"
            size="small"
            startIcon={<AdminPanelSettingsOutlinedIcon />}
            onClick={() => navigate('/admin')}
          >
            Admin
          </Button>
        )}

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <Box className="user-chip">
              <Box className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</Box>
              <Typography variant="body2" color="text.primary" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>
                {user.name}
              </Typography>
            </Box>
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
