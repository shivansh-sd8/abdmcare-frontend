import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

/** Canonical, human-readable product name. Single source of truth for branding. */
export const BRAND_NAME = 'Abha Ayushman';
/** Public path to the brand logo (served from /public). */
export const BRAND_LOGO_SRC = '/abhaayushman.png';

export interface BrandLogoProps {
  /** Rendered height of the logo in pixels. Width scales automatically. */
  height?: number;
  /**
   * When the logo sits on a dark/coloured surface, wrap it in a rounded white
   * plate so the multi-colour wordmark stays legible.
   */
  onDark?: boolean;
  /** Optional click handler (e.g. navigate home). Adds a pointer cursor. */
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * Renders the official "Abha Ayushman" brand lockup (symbol + wordmark + tagline).
 * Centralising this guarantees consistent branding across login, landing,
 * the app shell and password-recovery screens.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ height = 48, onDark = false, onClick, sx }) => {
  const img = (
    <Box
      component="img"
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      sx={{ height, width: 'auto', display: 'block', userSelect: 'none' }}
      draggable={false}
    />
  );

  if (!onDark && !onClick) {
    return <Box sx={sx}>{img}</Box>;
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...(onDark && {
          backgroundColor: '#ffffff',
          borderRadius: 2,
          p: 1,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }),
        ...sx,
      }}
    >
      {img}
    </Box>
  );
};

export default BrandLogo;
