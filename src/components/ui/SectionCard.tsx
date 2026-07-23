import React from 'react';
import { Box, Card, Typography, Stack, Divider } from '@mui/material';

interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactElement;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Remove the inner content padding (useful when content is a table). */
  disableContentPadding?: boolean;
  /** Render as outlined (no shadow) instead of elevated. */
  variant?: 'outlined' | 'elevated';
  /** Custom header background, e.g. a gradient hero card */
  headerSx?: any;
  sx?: any;
}

/**
 * Reusable card with a header row (icon + title + subtitle on the left, action on the right),
 * a divider, and a content slot. Replaces dozens of one-off `<Paper><Typography subtitle>…</Paper>`
 * structures across the app for consistent rhythm.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  disableContentPadding,
  variant = 'elevated',
  headerSx,
  sx,
}) => {
  return (
    <Card
      variant={variant === 'outlined' ? 'outlined' : 'elevation'}
      elevation={variant === 'outlined' ? 0 : 1}
      sx={{
        overflow: 'hidden',
        ...sx,
      }}
    >
      {(title || action) && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.25,
              py: 1.75,
              gap: 1.5,
              ...headerSx,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              {icon && (
                <Box sx={{ display: 'flex', color: 'primary.main' }}>
                  {React.cloneElement(icon, { sx: { fontSize: 20 } })}
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                {title && (
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
            {action}
          </Box>
          <Divider />
        </>
      )}

      <Box sx={{ p: disableContentPadding ? 0 : 2.25 }}>{children}</Box>
    </Card>
  );
};

export default SectionCard;
