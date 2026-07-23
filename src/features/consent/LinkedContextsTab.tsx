import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Chip,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  HourglassEmpty,
  ErrorOutline,
  Link as LinkIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import hipService from '../../services/hipService';

const POLL_INTERVAL_MS = 10_000;

type LinkStatus = 'ALL' | 'LINKED' | 'PENDING' | 'FAILED';

const STATUS_META: Record<string, { color: 'success' | 'warning' | 'error'; icon: React.ReactElement }> = {
  LINKED: { color: 'success', icon: <CheckCircle sx={{ fontSize: 15 }} /> },
  PENDING: { color: 'warning', icon: <HourglassEmpty sx={{ fontSize: 15 }} /> },
  FAILED: { color: 'error', icon: <ErrorOutline sx={{ fontSize: 15 }} /> },
};

const fmtTime = (d: any) => (d ? format(new Date(d), 'MMM dd, yyyy HH:mm') : '—');

/**
 * Hospital-wide list of ABDM care-context links. Shows exactly what was linked,
 * for which patient, the HI type advertised, the current link status, when ABDM
 * confirmed it, and (on hover) why a link failed.
 */
const LinkedContextsTab: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LinkStatus>('ALL');

  const load = useCallback((background = false) => {
    if (!background) setLoading(true);
    hipService
      .listCareContexts()
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setRows(list);
      })
      .catch(() => { if (!background) setRows([]); })
      .finally(() => { if (!background) setLoading(false); });
  }, []);

  useEffect(() => { load(false); }, [load]);

  // Auto-poll while any context is PENDING — links confirm asynchronously.
  const hasPending = rows.some((r) => r.linkStatus === 'PENDING');
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hasPending, load]);

  const counts = useMemo(() => ({
    total: rows.length,
    linked: rows.filter((r) => r.linkStatus === 'LINKED').length,
    pending: rows.filter((r) => r.linkStatus === 'PENDING').length,
    failed: rows.filter((r) => r.linkStatus === 'FAILED').length,
  }), [rows]);

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? rows : rows.filter((r) => r.linkStatus === statusFilter)),
    [rows, statusFilter],
  );

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1.1,
      minWidth: 180,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const pt = p.row.patient || {};
        const name = `${pt.firstName || ''} ${pt.lastName || ''}`.trim() || 'Unknown patient';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 12 }}>
              {(pt.firstName?.[0] || '') + (pt.lastName?.[0] || '') || '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {pt.uhid || pt.abhaAddress || '—'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'display',
      headerName: 'Care Context',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Box sx={{ minWidth: 0, py: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight={600} noWrap>{p.row.display}</Typography>
            {p.row.encounter?.type && (
              <Chip size="small" variant="outlined" label={p.row.encounter.type} sx={{ height: 17, fontSize: 9.5 }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>
            {p.row.careContextId}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'hiType',
      headerName: 'HI Type',
      width: 150,
      sortable: false,
      renderCell: (p: GridRenderCellParams) =>
        p.row.hiType ? (
          <Chip size="small" color="info" variant="outlined" label={p.row.hiType} sx={{ height: 20, fontSize: 11 }} />
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'linkStatus',
      headerName: 'Status',
      width: 130,
      renderCell: (p: GridRenderCellParams) => {
        const meta = STATUS_META[p.row.linkStatus] || STATUS_META.PENDING;
        const chip = (
          <Chip
            size="small"
            icon={meta.icon}
            label={p.row.linkStatus}
            color={meta.color}
            variant={p.row.linkStatus === 'LINKED' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        );
        return p.row.linkStatus === 'FAILED' && p.row.linkError ? (
          <Tooltip title={p.row.linkError} arrow>{chip}</Tooltip>
        ) : chip;
      },
    },
    {
      field: 'linkedAt',
      headerName: 'Linked / Updated',
      width: 165,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Typography variant="caption" color="text.secondary">
          {p.row.linkStatus === 'LINKED' ? fmtTime(p.row.linkedAt || p.row.updatedAt) : fmtTime(p.row.createdAt)}
        </Typography>
      ),
    },
  ];

  const FilterChip: React.FC<{ id: LinkStatus; label: string; color: any; n?: number }> = ({ id, label, color, n }) => (
    <Chip
      label={n != null ? `${label} (${n})` : label}
      size="small"
      color={statusFilter === id ? color : 'default'}
      variant={statusFilter === id ? 'filled' : 'outlined'}
      onClick={() => setStatusFilter(id)}
      sx={{ fontWeight: 600 }}
    />
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <LinkIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={700}>Care-Context Links</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', ml: 1 }}>
            <FilterChip id="ALL" label="All" color="primary" n={counts.total} />
            <FilterChip id="LINKED" label="Linked" color="success" n={counts.linked} />
            <FilterChip id="PENDING" label="Pending" color="warning" n={counts.pending} />
            <FilterChip id="FAILED" label="Failed" color="error" n={counts.failed} />
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasPending && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={12} />
                <Typography variant="caption" color="text.secondary">Awaiting ABDM…</Typography>
              </Box>
            )}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => load(false)}><Refresh fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ height: { xs: 420, sm: 520, md: 620 }, width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          getRowId={(r) => r.id || r.careContextId}
          loading={loading}
          columns={columns}
          getRowHeight={() => 64}
          onRowClick={(params) => {
            const pid = params.row.patient?.id;
            if (pid) navigate(`/app/patients/${pid}`);
          }}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-row:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
          }}
        />
      </Paper>
    </Box>
  );
};

export default LinkedContextsTab;
