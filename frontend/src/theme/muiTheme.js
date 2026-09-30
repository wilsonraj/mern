import { createTheme } from '@mui/material/styles';

const baseTypography = {
  fontFamily: "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif",
  h1: { fontWeight: 750, letterSpacing: '-0.045em' },
  h2: { fontWeight: 750, letterSpacing: '-0.04em' },
  h3: { fontWeight: 720, letterSpacing: '-0.035em' },
  h4: { fontWeight: 700, letterSpacing: '-0.03em' },
  h5: { fontWeight: 700, letterSpacing: '-0.025em' },
  button: { textTransform: 'none', fontWeight: 650, letterSpacing: '0.005em' }
};

const buildTheme = (mode) =>
  createTheme({
    palette:
      mode === 'dark'
        ? {
            mode: 'dark',
            primary: { main: '#9a8cff', light: '#c0b8ff', dark: '#7565ee' },
            secondary: { main: '#46d6c8' },
            background: { default: '#0b1020', paper: '#141a2b' },
            text: { primary: '#f3f4ff', secondary: '#a3abc4' },
            divider: 'rgba(255,255,255,0.09)'
          }
        : {
            mode: 'light',
            primary: { main: '#6558d9', light: '#897ff0', dark: '#4b40b2' },
            secondary: { main: '#149e97' },
            background: { default: '#f3f5fb', paper: '#ffffff' },
            text: { primary: '#20243a', secondary: '#777e95' },
            divider: 'rgba(53,59,94,0.1)'
          },
    typography: baseTypography,
    shape: { borderRadius: 16 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, padding: '10px 20px', boxShadow: 'none' },
          contained: {
            boxShadow: '0 8px 18px rgba(101,88,217,0.2)',
            '&:hover': { boxShadow: '0 10px 24px rgba(101,88,217,0.28)' }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 22 }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 13,
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.74)'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none' }
        }
      },
      MuiTextField: {
        defaultProps: { size: 'small' }
      }
    }
  });

export const getMuiTheme = (mode) => buildTheme(mode);
