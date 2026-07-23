import React from 'react';
import { Box, Card, Typography, Stack, Skeleton, alpha, useTheme, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactElement;
  /** Tone — drives icon background, accent line, and (light) gradient */
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Optional small descriptor under the value, e.g. "+12 today" */
  delta?: { value: string | number; trend?: 'up' | 'down' | 'flat'; label?: string };
  /** Optional subtle helper text on hover */
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
  /** Use compact layout (smaller value typography) */
  dense?: boolean;
}

/**
 * Refined dashboard / list-page metric card.
 *
 * Visual:
 * - subtle gradient + thin top accent line (tone-coloured)
 * - icon chip at top-right
 * - tabular-numerals value + optional trend pill
 * - elevation lifts on hover when clickable
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  tone = 'primary',
  delta,
  hint,
  loading,
  onClick,
  dense,
}) => {
  const theme = useTheme();
  const color = theme.palette[tone].main;

  if (loading) {
    return <Skeleton variant="rectangular" height={dense ? 88 : 110} sx={{ borderRadius: 3 }} />;
  }

  const card = (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(160deg, ${alpha(color, 0.10)} 0%, ${alpha(color, 0)} 70%)`
          : `linear-gradient(160deg, ${alpha(color, 0.07)} 0%, ${alpha(color, 0)} 65%)`,
        borderColor: alpha(color, 0.22),
        transition: 'transform 220ms ease, box-shadow 220ms ease',
        '&:hover': onClick ? {
          transform: 'translateY(-3px)',
          boxShadow: `0 14px 32px ${alpha(color, 0.22)}`,
          borderColor: alpha(color, 0.4),
        } : undefined,
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0)})`,
        },
      }}
    >
      <Box sx={{ p: dense ? 1.75 : 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: '0.6875rem',
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: dense ? '1.6rem' : '1.95rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography>
            {delta && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                {delta.trend === 'up' && (
                  <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                )}
                {delta.trend === 'down' && (
                  <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
                )}
                {(!delta.trend || delta.trend === 'flat') && (
                  <TrendingFlat sx={{ fontSize: 14, color: 'text.secondary' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: delta.trend === 'up'
                      ? 'success.main'
                      : delta.trend === 'down'
                        ? 'error.main'
                        : 'text.secondary',
                  }}
                >
                  {delta.value}
                </Typography>
                {delta.label && (
                  <Typography variant="caption" color="text.secondary">{delta.label}</Typography>
                )}
              </Stack>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
                background: alpha(color, 0.14),
                border: `1px solid ${alpha(color, 0.25)}`,
                flexShrink: 0,
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: 20 } })}
            </Box>
          )}
        </Stack>
      </Box>
    </Card>
  );

  return hint ? <Tooltip title={hint} arrow placement="top">{card}</Tooltip> : card;
};

export default StatCard;
