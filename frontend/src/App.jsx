import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';

import { getMuiTheme } from './theme/muiTheme';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  const mode = useSelector((state) => state.theme.mode);
  const muiTheme = useMemo(() => getMuiTheme(mode), [mode]);

  return (
    <ThemeProvider theme={muiTheme}>
      {/* CssBaseline only normalizes elements outside .bootstrap-scope;
          Bootstrap's own Reboot reset is scoped separately (see postcss.config.js). */}
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
