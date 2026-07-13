import { createTheme } from '@mui/material/styles';

const baseTypography = {
  fontFamily: "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif",
  h1: { fontWeight: 700 },
  h2: { fontWeight: 700 },
  button: { textTransform: 'none', fontWeight: 600 }
};

const buildTheme = (mode) =>
  createTheme({
    palette:
      mode === 'dark'
        ? {
            mode: 'dark',
            primary: { main: '#7C9CFF' },
            secondary: { main: '#F2994A' },
            background: { default: '#0F1420', paper: '#161D2E' }
          }
        : {
            mode: 'light',
            primary: { main: '#3454D1' },
            secondary: { main: '#F2994A' },
            background: { default: '#F7F8FC', paper: '#FFFFFF' }
          },
    typography: baseTypography,
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '8px 20px' }
        }
      },
      MuiTextField: {
        defaultProps: { size: 'small' }
      }
    }
  });

export const getMuiTheme = (mode) => buildTheme(mode);
