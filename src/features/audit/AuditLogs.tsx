import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  History,
  Person,
  CalendarToday,
  Clear,
  Refresh,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { toast } from 'react-toastify';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { PageHeader, EmptyState } from '../../components/ui';

const actionTone = (action: string): { color: any; bg: string; fg: string; label: string } => {
  const a = (action || '').toUpperCase();
  if (a.includes('POST') || a.includes('CREATE')) return { color: 'success', bg: '', fg: '', label: a };
  if (a.includes('PUT') || a.includes('PATCH') || a.includes('UPDATE')) return { color: 'info', bg: '', fg: '', label: a };
  if (a.includes('DELETE')) return { color: 'error', bg: '', fg: '', label: a };
  if (a.includes('LOGIN')) return { color: 'primary', bg: '', fg: '', label: a };
  return { color: 'default', bg: '', fg: '', label: a || 'GET' };
};

const AuditLogs: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, entityFilter, actionFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/api/v1/audit-logs', {
        params: {
          page: page + 1,
          limit: pageSize,
          module: entityFilter || undefined,
          action: actionFilter || undefined,
        },
      });
      const list = response.data?.logs || response.logs || [];
      const t = response.data?.total || response.total || 0;
      setLogs(list);
      setTotal(t);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const u = l.user || {};
      const userName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return [
        userName,
        u.role,
        l.action,
        l.module,
        l.resourceType,
        l.resourceId,
        l.ipAddress,
      ].some((v: any) => (v || '').toString().toLowerCase().includes(q));
    });
  }, [logs, searchQuery]);

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
          <Box>
            <Typography variant="body2">{format(new Date(params.value), 'dd MMM yyyy')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(params.value), 'hh:mm:ss a')}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'user',
      headerName: 'User',
      width: 220,
      renderCell: (params) => {
        const u = params.value || {};
        const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}` || '?';
        return (
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Avatar sx={{
              width: 32, height: 32, fontSize: '0.7rem', fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main',
            }}>{initials}</Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {u.firstName} {u.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">{u.role}</Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 160,
      renderCell: (params) => {
        const tone = actionTone(params.value);
        return <Chip label={tone.label} color={tone.color} size="small" variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700 }} />;
      },
    },
    {
      field: 'module',
      headerName: 'Module',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value || 'SYSTEM'} color="primary" variant="outlined" size="small"
          sx={{ fontSize: '0.7rem' }} />
      ),
    },
    {
      field: 'resourceType',
      headerName: 'Entity',
      width: 130,
      renderCell: (params) => params.value
        ? <Chip label={params.value} variant="outlined" size="small" sx={{ fontSize: '0.7rem' }} />
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'resourceId',
      headerName: 'Entity ID',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
          {params.value ? `${params.value.substring(0, 8)}…` : '—'}
        </Typography>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IP',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
          {params.value || '—'}
        </Typography>
      ),
    },
  ];

  const hasFilters = !!(searchQuery || entityFilter || actionFilter);

  return (
    <Box>
      <PageHeader
        title="Audit Logs"
        subtitle="Every action across the platform · for compliance & security review"
        icon={<History />}
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAuditLogs} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        }
      />

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth size="small"
              placeholder="Search by user, action, IP, entity…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Grid>
          <Grid item xs={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Module</InputLabel>
              <Select value={entityFilter} label="Module" onChange={(e) => setEntityFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="AUTH">Authentication</MenuItem>
                <MenuItem value="HOSPITAL">Hospital</MenuItem>
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="PATIENT">Patient</MenuItem>
                <MenuItem value="DOCTOR">Doctor</MenuItem>
                <MenuItem value="APPOINTMENT">Appointment</MenuItem>
                <MenuItem value="CONSENT">Consent</MenuItem>
                <MenuItem value="ABHA">ABHA</MenuItem>
                <MenuItem value="PRESCRIPTION">Prescription</MenuItem>
                <MenuItem value="INVESTIGATION">Investigation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select value={actionFilter} label="Action" onChange={(e) => setActionFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CREATE">Create</MenuItem>
                <MenuItem value="UPDATE">Update</MenuItem>
                <MenuItem value="DELETE">Delete</MenuItem>
                <MenuItem value="VIEW">View</MenuItem>
                <MenuItem value="LOGIN">Login</MenuItem>
                <MenuItem value="LOGOUT">Logout</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {hasFilters && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredLogs.length} of {total} log{total === 1 ? '' : 's'}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setSearchQuery(''); setEntityFilter(''); setActionFilter(''); }}
            >
              Clear filters
            </Typography>
          </Stack>
        )}
      </Paper>

      {/* Mobile: card list. Desktop: DataGrid. */}
      {isMobile ? (
        <Stack spacing={1}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, height: 90, borderRadius: 2 }} />
            ))
          ) : filteredLogs.length === 0 ? (
            <EmptyState icon={<History />} title="No logs" message="No audit events match these filters." />
          ) : (
            filteredLogs.map((l: any) => {
              const u = l.user || {};
              const tone = actionTone(l.action);
              return (
                <Paper key={l.id || `${l.timestamp}-${u.id}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: '0.7rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main',
                      }}>
                        {(u.firstName?.[0] || '') + (u.lastName?.[0] || '') || <Person fontSize="small" />}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {u.firstName} {u.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{u.role}</Typography>
                      </Box>
                      <Chip size="small" label={tone.label} color={tone.color} variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 20 }} />
                    </Stack>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      <Chip size="small" label={l.module || 'SYSTEM'} variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }} />
                      {l.resourceType && (
                        <Chip size="small" label={l.resourceType} variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem' }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      {l.ipAddress && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {l.ipAddress}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ height: 600, borderRadius: 2, overflow: 'hidden' }}>
          <DataGrid
            rows={filteredLogs}
            columns={columns}
            loading={loading}
            rowCount={searchQuery ? filteredLogs.length : total}
            paginationMode={searchQuery ? 'client' : 'server'}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': { py: 1.5 },
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <EmptyState icon={<History />} title="No logs" message="No audit events match these filters." />
                </Box>
              ),
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default AuditLogs;
