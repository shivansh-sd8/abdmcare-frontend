import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

interface EmptyStateProps {
  icon?: React.ReactElement;
  title?: React.ReactNode;
  message?: React.ReactNode;
  action?: { label: string; onClick: () => void; icon?: React.ReactElement };
  /** Compact variant for use inside a small card / panel */
  small?: boolean;
  tone?: 'neutral' | 'primary' | 'info' | 'warning';
}

/**
 * Friendly, well-spaced empty state. Supersedes the various
 * "<Paper><InfoOutlined/><Typography>No items</Typography></Paper>" blocks
 * scattered across the codebase.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <InboxOutlined />,
  title,
  message,
  action,
  small,
  tone = 'neutral',
}) => {
  const theme = useTheme();
  const accent = tone === 'neutral'
    ? theme.palette.text.disabled
    : theme.palette[tone].main;

  return (
    <Box
      sx={{
        py: small ? 3 : 6,
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: small ? 48 : 64,
            height: small ? 48 : 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alpha(accent, theme.palette.mode === 'dark' ? 0.10 : 0.08),
            color: tone === 'neutral' ? 'text.disabled' : `${tone}.main`,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: small ? 22 : 30 } })}
        </Box>
        {title && (
          <Typography variant={small ? 'subtitle2' : 'h6'} fontWeight={700}>
            {title}
          </Typography>
        )}
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: small ? 320 : 460, mx: 'auto' }}
          >
            {message}
          </Typography>
        )}
        {action && (
          <Button
            variant="contained"
            size={small ? 'small' : 'medium'}
            startIcon={action.icon}
            onClick={action.onClick}
            sx={{ mt: 0.5 }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default EmptyState;
