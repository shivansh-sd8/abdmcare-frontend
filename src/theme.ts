import { createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

export const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main:         '#4CAF50',
        light:        '#81C784',
        dark:         '#388E3C',
        contrastText: '#ffffff',
      },
      secondary: {
        main:         '#667eea',
        light:        '#9fa8da',
        dark:         '#4F46E5',
        contrastText: '#ffffff',
      },
      success: { main: '#4CAF50' },
      error:   { main: '#f56565' },
      warning: { main: '#ed8936' },
      info:    { main: '#63b3ed' },
      background: {
        default: isDark ? '#0d1117' : '#f5f7fa',
        paper:   isDark ? '#161b22' : '#ffffff',
      },
      text: {
        primary:   isDark ? '#e6edf3' : '#1a202c',
        secondary: isDark ? '#8b949e' : '#718096',
        disabled:  isDark ? '#484f58' : '#a0aec0',
      },
      divider: isDark ? 'rgba(240,246,252,0.1)' : 'rgba(0,0,0,0.08)',
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },

    shape: { borderRadius: 8 },

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.07)',
            border: isDark ? '1px solid rgba(240,246,252,0.1)' : 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
            ...(isDark && {
              border: '1px solid rgba(240,246,252,0.08)',
            }),
          },
          elevation1: {
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.07)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: isDark
              ? 'rgba(240,246,252,0.08)'
              : 'rgba(0,0,0,0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            ...(isDark && {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(240,246,252,0.15)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(240,246,252,0.3)',
              },
            }),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

// Default light export for files that import theme directly
export default createAppTheme('light');
