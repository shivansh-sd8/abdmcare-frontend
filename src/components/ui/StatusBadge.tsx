import React from 'react';
import { Box, Chip, alpha, useTheme } from '@mui/material';
import {
  CheckCircle, HourglassEmpty, Cancel, Block, AccessTime, ErrorOutline,
  RadioButtonChecked, PauseCircle, PlayCircle,
} from '@mui/icons-material';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  icon?: React.ReactElement;
  size?: 'small' | 'medium';
  variant?: 'soft' | 'solid' | 'outlined';
  dot?: boolean;
}

/** Map common ABDM / clinical statuses → tone + icon. */
const STATUS_PRESETS: Record<string, { tone: StatusTone; icon: React.ReactElement; label?: string }> = {
  GRANTED:        { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  ACTIVE:         { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  COMPLETED:      { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  PAID:           { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  DELIVERED:      { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  DISPENSED:      { tone: 'success', icon: <CheckCircle fontSize="small" /> },
  LINKED:         { tone: 'success', icon: <CheckCircle fontSize="small" /> },

  REQUESTED:      { tone: 'warning', icon: <HourglassEmpty fontSize="small" /> },
  PENDING:        { tone: 'warning', icon: <HourglassEmpty fontSize="small" /> },
  IN_PROGRESS:    { tone: 'info',    icon: <PlayCircle fontSize="small" />, label: 'IN PROGRESS' },
  ORDERED:        { tone: 'info',    icon: <PlayCircle fontSize="small" /> },
  CONSULTING:     { tone: 'info',    icon: <PlayCircle fontSize="small" /> },
  ADMITTED:       { tone: 'info',    icon: <RadioButtonChecked fontSize="small" /> },
  DISCHARGE_READY:{ tone: 'warning', icon: <PauseCircle fontSize="small" />, label: 'DISCHARGE READY' },

  DENIED:         { tone: 'error',   icon: <Cancel fontSize="small" /> },
  REJECTED:       { tone: 'error',   icon: <Cancel fontSize="small" /> },
  ERRORED:        { tone: 'error',   icon: <ErrorOutline fontSize="small" /> },
  FAILED:         { tone: 'error',   icon: <ErrorOutline fontSize="small" /> },

  EXPIRED:        { tone: 'neutral', icon: <AccessTime fontSize="small" /> },
  REVOKED:        { tone: 'error',   icon: <Block fontSize="small" /> },
  DEACTIVATED:    { tone: 'error',   icon: <Block fontSize="small" /> },
  DELETED:        { tone: 'error',   icon: <Block fontSize="small" /> },
};

/**
 * Drop-in replacement for the dozen one-off `<Chip color="…" label="…">` calls
 * across the app. Recognises ABDM/clinical statuses automatically and applies
 * a consistent tone and icon.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone,
  icon,
  size = 'small',
  variant = 'soft',
  dot,
}) => {
  const theme = useTheme();
  const upper = label?.toUpperCase().replace(/\s+/g, '_');
  const preset = STATUS_PRESETS[upper];
  const finalTone = tone ?? preset?.tone ?? 'neutral';
  const finalIcon = icon ?? preset?.icon;
  const finalLabel = preset?.label ?? label;

  const palette = finalTone === 'neutral' ? theme.palette.text.secondary
    : finalTone === 'primary' ? theme.palette.primary.main
    : theme.palette[finalTone].main;

  const palBg = finalTone === 'neutral'
    ? alpha(theme.palette.text.disabled, theme.palette.mode === 'dark' ? 0.18 : 0.10)
    : alpha(palette, theme.palette.mode === 'dark' ? 0.18 : 0.12);

  if (variant === 'solid') {
    return (
      <Chip
        label={finalLabel}
        size={size}
        icon={dot ? undefined : finalIcon}
        sx={{
          bgcolor: palette,
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.02em',
          '& .MuiChip-icon': { color: '#fff' },
        }}
      />
    );
  }

  if (variant === 'outlined') {
    return (
      <Chip
        label={finalLabel}
        size={size}
        variant="outlined"
        icon={dot ? undefined : finalIcon}
        sx={{
          borderColor: alpha(palette, 0.5),
          color: palette,
          fontWeight: 700,
          '& .MuiChip-icon': { color: palette },
        }}
      />
    );
  }

  // soft (default)
  return (
    <Chip
      label={
        dot ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: palette }} />
            {finalLabel}
          </Box>
        ) : finalLabel
      }
      size={size}
      icon={dot ? undefined : finalIcon}
      sx={{
        bgcolor: palBg,
        color: palette,
        fontWeight: 700,
        border: `1px solid ${alpha(palette, 0.25)}`,
        '& .MuiChip-icon': { color: palette },
      }}
    />
  );
};

export default StatusBadge;
