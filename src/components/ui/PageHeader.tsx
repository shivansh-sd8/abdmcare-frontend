import React from 'react';
import { Box, Typography, Stack, Breadcrumbs, Link as MuiLink, alpha, useTheme } from '@mui/material';
import { NavigateNext, ChevronRight } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export interface CrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactElement;
  /** Right-aligned action area (buttons, switches, etc.) */
  actions?: React.ReactNode;
  /** Optional breadcrumb trail */
  breadcrumbs?: CrumbItem[];
  /** Optional "eyebrow" tag shown above the title (like a section badge) */
  eyebrow?: React.ReactNode;
  dense?: boolean;
}

/**
 * Consistent screen header used across the app.
 * Replaces the ad-hoc `<Box mb={3}><Typography h4 …/></Box>` pattern that
 * was repeated across every page with slightly different spacing and weight.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
  eyebrow,
  dense,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ mb: dense ? 2 : 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}
        >
          {breadcrumbs.map((c, i) =>
            c.to && i < breadcrumbs.length - 1 ? (
              <MuiLink
                key={i}
                component={RouterLink}
                to={c.to}
                underline="hover"
                color="text.secondary"
                sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {c.label}
              </MuiLink>
            ) : (
              <Typography key={i} sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                background: alpha(theme.palette.primary.main, 0.10),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                flexShrink: 0,
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: 22 } })}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            {eyebrow && (
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ display: 'block', mb: 0.25, fontWeight: 700 }}
              >
                {eyebrow}
              </Typography>
            )}
            <Typography
              variant={dense ? 'h5' : 'h4'}
              fontWeight={800}
              sx={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
              noWrap
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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

interface SectionTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

/** Smaller, in-page section title (between PageHeader and content blocks). */
export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, action }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <ChevronRight sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      )}
    </Box>
    {action}
  </Stack>
);

export default PageHeader;
