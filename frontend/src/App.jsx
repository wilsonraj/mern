import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import { BrowserRouter } from 'react-router-dom';

import { getMuiTheme } from './theme/muiTheme';
import AppRoutes from './routes/AppRoutes';
import ToastNotification from './components/common/ToastNotification';
import { useRefreshMutation } from './features/auth/authApi';
import { logout, setAuthReady, setCredentials } from './features/auth/authSlice';

let authBootstrapPromise;

const App = () => {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.theme.mode);
  const authReady = useSelector((state) => state.auth.ready);
  const muiTheme = useMemo(() => getMuiTheme(mode), [mode]);
  const [refreshSession] = useRefreshMutation();

  useEffect(() => {
    if (!authBootstrapPromise) {
      authBootstrapPromise = refreshSession()
        .unwrap()
        .then((result) => {
          const payload = result?.data;
          if (!payload?.user || !payload.accessToken) {
            throw new Error('The refresh endpoint returned an invalid session response.');
          }
          dispatch(setCredentials({ user: payload.user, accessToken: payload.accessToken }));
        })
        .catch(() => {
          dispatch(logout());
        })
        .finally(() => {
          dispatch(setAuthReady());
        });
    }
  }, [dispatch, refreshSession]);

  return (
    <ThemeProvider theme={muiTheme}>
      {/* CssBaseline only normalizes elements outside .bootstrap-scope;
          Bootstrap's own Reboot reset is scoped separately (see postcss.config.js). */}
      <CssBaseline />
      <BrowserRouter>
        {authReady ? <AppRoutes /> : (
          <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: '#fff' }}>
            <CircularProgress color="inherit" />
          </Backdrop>
        )}
      </BrowserRouter>
      <ToastNotification />
    </ThemeProvider>
  );
};

export default App;
