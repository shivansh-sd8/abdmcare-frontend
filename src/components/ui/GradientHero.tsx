import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';

interface GradientHeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactElement;
  actions?: React.ReactNode;
  /** Optional small chip / badge area beside the title */
  badge?: React.ReactNode;
  /** Override the default brand gradient with a tone or custom gradient */
  tone?: 'brand' | 'success' | 'info' | 'warning' | 'error';
  customGradient?: string;
  /** Compact variant */
  dense?: boolean;
}

/**
 * Eye-catching hero strip at the top of major feature pages
 * (Patient Profile, Federated Records, ABHA management, etc.).
 *
 * Replaces the ad-hoc `<Paper sx={{ background: 'linear-gradient(...)' }}>`
 * patterns across screens with a single, themable, accessible primitive.
 */
export const GradientHero: React.FC<GradientHeroProps> = ({
  title,
  subtitle,
  icon,
  actions,
  badge,
  tone = 'brand',
  customGradient,
  dense,
}) => {
  const theme = useTheme();

  const gradients: Record<NonNullable<GradientHeroProps['tone']>, string> = {
    brand:   theme.customGradients.brand,
    success: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
    info:    `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.main} 100%)`,
    warning: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`,
    error:   `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
  };

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: { xs: 2, sm: dense ? 2.25 : 2.75 },
        color: '#fff',
        background: customGradient || gradients[tone],
        overflow: 'hidden',
        boxShadow: `0 12px 32px ${alpha(theme.palette[tone === 'brand' ? 'primary' : tone].main, 0.30)}`,
        // Subtle decorative orb in the corner
        '&::before': {
          content: '""',
          position: 'absolute',
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: alpha('#ffffff', 0.10),
          filter: 'blur(2px)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -120,
          bottom: -120,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: alpha('#ffffff', 0.06),
          pointerEvents: 'none',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: dense ? 44 : 50,
                height: dense ? 44 : 50,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha('#ffffff', 0.18),
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.25)',
                flexShrink: 0,
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: dense ? 22 : 26, color: '#fff' } })}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography
                variant={dense ? 'h6' : 'h5'}
                fontWeight={800}
                sx={{ letterSpacing: '-0.02em', lineHeight: 1.2, color: '#fff' }}
              >
                {title}
              </Typography>
              {badge}
            </Stack>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{ opacity: 0.92, mt: 0.25, color: alpha('#fff', 0.92) }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: 'auto' }, gap: 1 }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default GradientHero;
