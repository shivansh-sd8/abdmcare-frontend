import { createTheme, alpha } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette — calmer, more "medical-tech" than candy-green.
// Primary stays in the ABDM green family (recognisable identity), accent moves
// to a deep indigo/violet, and we add a teal "info" accent for callbacks.
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  primary: {
    main:  '#0F9D7A',   // deep teal-green (calmer than #4CAF50)
    light: '#22BA92',
    dark:  '#0A7A5E',
  },
  secondary: {
    main:  '#5B5BD6',   // indigo accent
    light: '#7E7EE8',
    dark:  '#4040B8',
  },
  success: { main: '#10B981', light: '#34D399', dark: '#047857' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#B45309' },
  error:   { main: '#EF4444', light: '#F87171', dark: '#B91C1C' },
  info:    { main: '#0EA5E9', light: '#38BDF8', dark: '#0369A1' },
};

// Subtle, layered shadow scale (avoids the default MUI heaviness).
const lightShadows = [
  'none',
  '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 1px rgba(15, 23, 42, 0.04)',
  '0 2px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  '0 4px 8px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.04)',
  '0 6px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.05)',
  '0 8px 16px rgba(15, 23, 42, 0.09), 0 3px 6px rgba(15, 23, 42, 0.05)',
  '0 12px 24px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.05)',
  '0 16px 32px rgba(15, 23, 42, 0.11), 0 6px 12px rgba(15, 23, 42, 0.06)',
  '0 20px 40px rgba(15, 23, 42, 0.12), 0 8px 16px rgba(15, 23, 42, 0.06)',
  ...Array(16).fill('0 24px 48px rgba(15, 23, 42, 0.14), 0 10px 20px rgba(15, 23, 42, 0.07)'),
] as any;

const darkShadows = [
  'none',
  '0 1px 2px rgba(0,0,0,0.5), 0 1px 1px rgba(0,0,0,0.3)',
  '0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
  '0 4px 8px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.3)',
  '0 6px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3)',
  '0 8px 16px rgba(0,0,0,0.6), 0 3px 6px rgba(0,0,0,0.3)',
  '0 12px 24px rgba(0,0,0,0.65), 0 4px 8px rgba(0,0,0,0.4)',
  '0 16px 32px rgba(0,0,0,0.7), 0 6px 12px rgba(0,0,0,0.4)',
  '0 20px 40px rgba(0,0,0,0.75), 0 8px 16px rgba(0,0,0,0.4)',
  ...Array(16).fill('0 24px 48px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5)'),
] as any;

declare module '@mui/material/styles' {
  interface Theme {
    customGradients: {
      brand: string;
      brandSoft: string;
      hero: string;
      sidebar: string;
    };
  }
  interface ThemeOptions {
    customGradients?: Theme['customGradients'];
  }
  interface Components {
    MuiDataGrid?: {
      defaultProps?: any;
      styleOverrides?: any;
    };
  }
}

export const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  // Surface stack for a multi-layer "frosted" feel.
  const bgDefault = isDark ? '#0B0F14' : '#F6F8FB';
  const bgPaper   = isDark ? '#11161D' : '#FFFFFF';
  const bgSubtle  = isDark ? '#161C25' : '#F1F4F9';
  const dividerC  = isDark ? 'rgba(240,246,252,0.08)' : 'rgba(15, 23, 42, 0.08)';

  return createTheme({
    palette: {
      mode,
      primary:   { ...BRAND.primary,   contrastText: '#ffffff' },
      secondary: { ...BRAND.secondary, contrastText: '#ffffff' },
      success:   BRAND.success,
      warning:   BRAND.warning,
      error:     BRAND.error,
      info:      BRAND.info,
      background: {
        default: bgDefault,
        paper:   bgPaper,
      },
      text: {
        primary:   isDark ? '#E6EDF3' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#475569',
        disabled:  isDark ? '#475569' : '#94A3B8',
      },
      divider: dividerC,
      action: {
        hover: isDark ? alpha('#94A3B8', 0.06) : alpha('#475569', 0.04),
        selected: isDark ? alpha(BRAND.primary.main, 0.16) : alpha(BRAND.primary.main, 0.08),
      },
    },

    shadows: isDark ? darkShadows : lightShadows,

    typography: {
      fontFamily: '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeightLight: 400,
      fontWeightRegular: 500,
      fontWeightMedium: 600,
      fontWeightBold: 700,
      h1: { fontWeight: 800, letterSpacing: '-0.025em', fontSize: '2.25rem', lineHeight: 1.2 },
      h2: { fontWeight: 800, letterSpacing: '-0.022em', fontSize: '1.875rem', lineHeight: 1.25 },
      h3: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.5rem', lineHeight: 1.3 },
      h4: { fontWeight: 700, letterSpacing: '-0.018em', fontSize: '1.25rem', lineHeight: 1.35 },
      h5: { fontWeight: 700, letterSpacing: '-0.015em', fontSize: '1.125rem', lineHeight: 1.4 },
      h6: { fontWeight: 700, letterSpacing: '-0.01em',  fontSize: '1rem',     lineHeight: 1.45 },
      subtitle1: { fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.5 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5, letterSpacing: '0.01em' },
      overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
    },

    shape: { borderRadius: 12 },

    customGradients: {
      brand:     `linear-gradient(135deg, ${BRAND.primary.main} 0%, ${BRAND.secondary.main} 100%)`,
      brandSoft: `linear-gradient(135deg, ${alpha(BRAND.primary.main, 0.12)} 0%, ${alpha(BRAND.secondary.main, 0.10)} 100%)`,
      hero:      `linear-gradient(135deg, ${BRAND.primary.dark} 0%, ${BRAND.secondary.main} 60%, ${BRAND.secondary.dark} 100%)`,
      sidebar:   isDark
        ? `linear-gradient(180deg, #0B0F14 0%, #0F141B 100%)`
        : `linear-gradient(180deg, #FFFFFF 0%, ${alpha(BRAND.primary.main, 0.04)} 100%)`,
    },

    components: {
      // ─── Global resets / scrollbar polish ─────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          'html, body, #root': {
            height: '100%',
            // Smooth font rendering
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          },
          'html': {
            WebkitTextSizeAdjust: '100%',
          },
          // Tabular numerals everywhere they matter (vitals, prices, IDs).
          '.tabular-nums, table, .MuiDataGrid-cell, .MuiTableCell-root': {
            fontVariantNumeric: 'tabular-nums',
          },
          // Custom scrollbars (subtle, themed).
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.14)',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: isDark ? 'rgba(148,163,184,0.32)' : 'rgba(15,23,42,0.24)',
            backgroundClip: 'padding-box',
            border: '2px solid transparent',
          },
          // Selection
          '::selection': {
            backgroundColor: alpha(BRAND.primary.main, 0.25),
            color: isDark ? '#E6EDF3' : '#0F172A',
          },
          // Reduced-motion respect
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.001ms !important',
              transitionDuration: '0.001ms !important',
            },
          },
        },
      },

      // ─── Buttons: subtle weight, smooth motion, gradient-friendly ─────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            paddingInline: 16,
            paddingBlock: 8,
            letterSpacing: '-0.005em',
            transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
            '&:focus-visible': {
              outline: `2px solid ${alpha(BRAND.primary.main, 0.5)}`,
              outlineOffset: 2,
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${BRAND.primary.main} 0%, ${BRAND.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.primary.light} 0%, ${BRAND.primary.main} 100%)`,
              boxShadow: `0 6px 16px ${alpha(BRAND.primary.main, 0.30)}`,
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
            // Default MUI disabled state turns the gradient off and renders
            // text at rgba(0,0,0,0.26) which makes contained CTAs ("Send OTP",
            // "Look Up", etc.) practically invisible. Force a readable
            // light-on-tint disabled look instead.
            '&.Mui-disabled': {
              background: alpha(BRAND.primary.main, isDark ? 0.18 : 0.22),
              color: alpha('#ffffff', isDark ? 0.78 : 0.92),
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.secondary.main} 0%, ${BRAND.secondary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.secondary.light} 0%, ${BRAND.secondary.main} 100%)`,
              boxShadow: `0 6px 16px ${alpha(BRAND.secondary.main, 0.30)}`,
              transform: 'translateY(-1px)',
            },
            '&.Mui-disabled': {
              background: alpha(BRAND.secondary.main, isDark ? 0.18 : 0.22),
              color: alpha('#ffffff', isDark ? 0.78 : 0.92),
            },
          },
          outlined: {
            borderColor: dividerC,
            '&:hover': {
              borderColor: BRAND.primary.main,
              background: alpha(BRAND.primary.main, 0.04),
            },
          },
          sizeSmall: { paddingBlock: 6, paddingInline: 12, fontSize: '0.8125rem' },
          sizeLarge: { paddingBlock: 11, paddingInline: 22, fontSize: '0.9375rem' },
        },
      },

      // ─── Cards & papers: lighter shadows, crisper border ──────────────────
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundImage: 'none',
            border: `1px solid ${dividerC}`,
            boxShadow: isDark ? 'none' : lightShadows[1],
            transition: 'box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundImage: 'none',
          },
          elevation0: { boxShadow: 'none' },
          elevation1: { boxShadow: isDark ? 'none' : lightShadows[1] },
          elevation2: { boxShadow: isDark ? darkShadows[2] : lightShadows[2] },
          outlined: {
            border: `1px solid ${dividerC}`,
          },
        },
      },

      // ─── App bar (transparent, glassy) ────────────────────────────────────
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'saturate(180%) blur(14px)',
            WebkitBackdropFilter: 'saturate(180%) blur(14px)',
            backgroundColor: isDark ? alpha('#0B0F14', 0.78) : alpha('#FFFFFF', 0.78),
            borderBottom: `1px solid ${dividerC}`,
          },
        },
      },

      // ─── Drawer ────────────────────────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRight: `1px solid ${dividerC}`,
          },
        },
      },

      // ─── Inputs ────────────────────────────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'box-shadow 160ms ease, border-color 160ms ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: dividerC,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(240,246,252,0.18)' : 'rgba(15,23,42,0.18)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND.primary.main,
              borderWidth: 1.5,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${alpha(BRAND.primary.main, 0.12)}`,
            },
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            '&.Mui-focused': { color: BRAND.primary.main },
          },
        },
      },

      // ─── Chips ─────────────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
          },
          sizeSmall: { height: 22 },
          outlined: {
            borderColor: dividerC,
          },
        },
      },

      // ─── Tabs ──────────────────────────────────────────────────────────────
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${BRAND.primary.main}, ${BRAND.secondary.main})`,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
            letterSpacing: '-0.005em',
            transition: 'color 160ms ease',
            '&.Mui-selected': { color: BRAND.primary.main },
          },
        },
      },

      // ─── Tables ────────────────────────────────────────────────────────────
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: dividerC,
            fontSize: '0.8125rem',
          },
          head: {
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#94A3B8' : '#475569',
            backgroundColor: bgSubtle,
          },
        },
      },

      // ─── DataGrid (used heavily) ──────────────────────────────────────────
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            fontSize: '0.8125rem',
            '--DataGrid-rowBorderColor': dividerC,
            '--DataGrid-containerBackground': bgPaper,
          },
          columnHeaders: {
            backgroundColor: bgSubtle,
            borderBottom: `1px solid ${dividerC}`,
          },
          columnHeader: {
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
            color: isDark ? '#94A3B8' : '#475569',
          },
          row: {
            transition: 'background-color 120ms ease',
            '&:hover': { backgroundColor: alpha(BRAND.primary.main, 0.04) },
          },
          cell: {
            borderBottomColor: dividerC,
          },
          footerContainer: {
            borderTop: `1px solid ${dividerC}`,
            backgroundColor: 'transparent',
          },
        } as any,
      },

      // ─── Dialog ────────────────────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
            boxShadow: isDark ? darkShadows[8] : lightShadows[8],
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: '1.125rem', paddingBlock: 18 },
        },
      },

      // ─── Tooltip ───────────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 8,
            paddingBlock: 8,
            paddingInline: 12,
            backgroundColor: isDark ? '#1E293B' : '#0F172A',
          },
          arrow: { color: isDark ? '#1E293B' : '#0F172A' },
        },
      },

      // ─── Alerts ────────────────────────────────────────────────────────────
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontSize: '0.8125rem',
            border: '1px solid transparent',
            alignItems: 'center',
          },
          standardSuccess: {
            backgroundColor: alpha(BRAND.success.main, 0.10),
            color:           isDark ? BRAND.success.light : BRAND.success.dark,
            borderColor:     alpha(BRAND.success.main, 0.25),
          },
          standardError: {
            backgroundColor: alpha(BRAND.error.main, 0.10),
            color:           isDark ? BRAND.error.light : BRAND.error.dark,
            borderColor:     alpha(BRAND.error.main, 0.25),
          },
          standardWarning: {
            backgroundColor: alpha(BRAND.warning.main, 0.12),
            color:           isDark ? BRAND.warning.light : BRAND.warning.dark,
            borderColor:     alpha(BRAND.warning.main, 0.25),
          },
          standardInfo: {
            backgroundColor: alpha(BRAND.info.main, 0.10),
            color:           isDark ? BRAND.info.light : BRAND.info.dark,
            borderColor:     alpha(BRAND.info.main, 0.25),
          },
        },
      },

      // ─── List items ───────────────────────────────────────────────────────
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'background-color 140ms ease, color 140ms ease',
          },
        },
      },

      // ─── Avatar ────────────────────────────────────────────────────────────
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            letterSpacing: '-0.01em',
          },
        },
      },

      // ─── Linear Progress (more refined) ───────────────────────────────────
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 8, height: 6 },
          bar: { borderRadius: 8 },
        },
      },

      // ─── Skeleton (subtler) ───────────────────────────────────────────────
      MuiSkeleton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },

      // ─── Switch (rounded pill) ────────────────────────────────────────────
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: BRAND.primary.main,
              opacity: 0.9,
            },
          },
        },
      },

      // ─── Backdrop blur on modals ──────────────────────────────────────────
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            backgroundColor: isDark ? 'rgba(2,6,23,0.65)' : 'rgba(15,23,42,0.42)',
          },
        },
      },
    },
  });
};

// Default light export for files that import theme directly
export default createAppTheme('light');
