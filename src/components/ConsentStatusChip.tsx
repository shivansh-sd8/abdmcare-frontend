import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chip, alpha, keyframes } from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  AccessTime,
  Block,
  Sync,
} from '@mui/icons-material';
import consentService from '../services/consentService';

const POLL_INTERVAL_MS = 5_000;

const TERMINAL_STATUSES = new Set(['GRANTED', 'DENIED', 'EXPIRED', 'REVOKED']);

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(243, 156, 18, 0); }
  100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0); }
`;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactElement; label: string }> = {
  REQUESTED:     { color: '#F39C12', icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Requested' },
  GRANTED:       { color: '#50C878', icon: <CheckCircle sx={{ fontSize: 16 }} />,    label: 'Granted' },
  DENIED:        { color: '#E74C3C', icon: <Cancel sx={{ fontSize: 16 }} />,         label: 'Denied' },
  EXPIRED:       { color: '#95A5A6', icon: <AccessTime sx={{ fontSize: 16 }} />,     label: 'Expired' },
  REVOKED:       { color: '#E74C3C', icon: <Block sx={{ fontSize: 16 }} />,          label: 'Revoked' },
  DATA_RECEIVED: { color: '#4A90E2', icon: <Sync sx={{ fontSize: 16 }} />,           label: 'Data Received' },
};

interface ConsentStatusChipProps {
  consentId: string;
  initialStatus?: string;
  onStatusChange?: (newStatus: string) => void;
}

const ConsentStatusChip: React.FC<ConsentStatusChipProps> = ({
  consentId,
  initialStatus = 'REQUESTED',
  onStatusChange,
}) => {
  const [status, setStatus] = useState(initialStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const pollStatus = useCallback(async () => {
    try {
      const res = await consentService.getConsentStatus(consentId) as any;
      const newStatus: string = res?.data?.status || res?.status;
      if (!newStatus || !mountedRef.current) return;

      if (newStatus !== status) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }

      if (TERMINAL_STATUSES.has(newStatus) && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [consentId, status, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;

    if (!TERMINAL_STATUSES.has(initialStatus)) {
      intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [consentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.REQUESTED;
  const isPolling = !TERMINAL_STATUSES.has(status);

  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: alpha(cfg.color, 0.1),
        color: cfg.color,
        fontWeight: 600,
        fontSize: 12,
        height: 26,
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        animation: isPolling ? `${pulse} 2s ease-in-out infinite` : 'none',
        '& .MuiChip-icon': { color: cfg.color },
      }}
    />
  );
};

export default ConsentStatusChip;
