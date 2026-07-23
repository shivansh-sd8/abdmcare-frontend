import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

interface LoadingStateProps {
  /** Headline above the loader, e.g. "Loading patients" */
  message?: string;
  /** Optional helper text */
  hint?: string;
  /** Make the loader stretch to fill available space */
  fullHeight?: boolean;
  /** Override loader size */
  size?: number;
}

/**
 * Friendlier alternative to a plain CircularProgress: a soft pulsing brand-
 * gradient ring + helper text, centered. Used while initial page data loads.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  hint,
  fullHeight,
  size = 44,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 6,
        minHeight: fullHeight ? '60vh' : 200,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: theme.customGradients.brand,
          padding: '3px',
          animation: 'spin 1.1s linear infinite',
          '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: theme.palette.background.default,
          }}
        />
        {/* mask cap to give the ring a "split" look */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(${alpha(theme.palette.background.default, 0)} 0deg, ${theme.palette.background.default} 270deg, ${alpha(theme.palette.background.default, 0)} 360deg)`,
            mixBlendMode: 'normal',
            opacity: 0,
          }}
        />
      </Box>

      {message && (
        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
          {message}
        </Typography>
      )}
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360, textAlign: 'center' }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingState;
