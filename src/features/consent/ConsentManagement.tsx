import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Skeleton,
  alpha,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  VerifiedUser,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Person,
  CalendarToday,
  Description,
  Visibility,
  Block,
  AccessTime,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import consentService from '../../services/consentService';
import ConsentStatusChip from '../../components/ConsentStatusChip';
import { toast } from 'react-toastify';
import { format, formatDistanceToNow } from 'date-fns';

const POLL_INTERVAL_MS = 10_000;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactElement }> = {
  GRANTED:   { color: '#50C878', icon: <CheckCircle fontSize="small" /> },
  REQUESTED: { color: '#F39C12', icon: <HourglassEmpty fontSize="small" /> },
  DENIED:    { color: '#E74C3C', icon: <Cancel fontSize="small" /> },
  EXPIRED:   { color: '#95A5A6', icon: <AccessTime fontSize="small" /> },
  REVOKED:   { color: '#E74C3C', icon: <Block fontSize="small" /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status?.toUpperCase()] || { color: '#4A90E2', icon: <VerifiedUser fontSize="small" /> };
}

const ConsentManagement: React.FC = () => {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, granted: 0, requested: 0, expired: 0 });

  // Track previous statuses for change detection
  const prevStatusMap = useRef<Record<string, string>>({});

  const computeStats = useCallback((data: any[]) => {
    setStats({
      total: data.length,
      granted: data.filter((c: any) => c.status === 'GRANTED').length,
      requested: data.filter((c: any) => c.status === 'REQUESTED').length,
      expired: data.filter((c: any) => c.status === 'EXPIRED').length,
    });
  }, []);

  const fetchConsents = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await consentService.getAllConsents();
      const data = (response as any).data || [];

      // Detect status changes and show toast notifications
      const prevMap = prevStatusMap.current;
      for (const consent of data) {
        const prev = prevMap[consent.id];
        if (prev === 'REQUESTED' && consent.status === 'GRANTED') {
          toast.success(`Consent ${consent.consentId} has been GRANTED`);
        } else if (prev === 'REQUESTED' && consent.status === 'DENIED') {
          toast.error(`Consent ${consent.consentId} has been DENIED`);
        }
      }

      // Update prev map
      const newMap: Record<string, string> = {};
      for (const c of data) newMap[c.id] = c.status;
      prevStatusMap.current = newMap;

      setConsents(data);
      computeStats(data);
    } catch {
      if (!isBackground) toast.error('Failed to load consents');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [computeStats]);

  useEffect(() => {
    fetchConsents(false);
  }, [fetchConsents]);

  // Auto-poll while any consent is in REQUESTED state
  useEffect(() => {
    const hasRequested = consents.some(c => c.status === 'REQUESTED');
    if (!hasRequested) return;

    const intervalId = setInterval(() => fetchConsents(true), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [consents, fetchConsents]);

  const handleCancelConsent = async (consentId: string) => {
    try {
      await consentService.revokeConsent(consentId);
      toast.success('Consent request cancelled');
      fetchConsents(false);
    } catch {
      toast.error('Failed to cancel consent request');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'consentId',
      headerName: 'Consent ID',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="500" color="primary" noWrap>
          {params.row.consentId}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#4A90E2', width: 36, height: 36 }}>
            <Person fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="500">
            {params.row.patient?.firstName} {params.row.patient?.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'purpose',
      headerName: 'Purpose',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={<Description />}
          label={params.row.purpose || 'Care Management'}
          size="small"
          sx={{ bgcolor: alpha('#9B59B6', 0.1), color: '#9B59B6', fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <ConsentStatusChip
          consentId={params.row.id}
          initialStatus={params.row.status || 'REQUESTED'}
          onStatusChange={() => fetchConsents(true)}
        />
      ),
    },
    {
      field: 'elapsed',
      headerName: 'Elapsed',
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        if (params.row.status !== 'REQUESTED') return <Typography variant="body2" color="text.secondary">—</Typography>;
        const created = params.row.createdAt ? new Date(params.row.createdAt) : null;
        if (!created) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: '#F39C12' }} />
            <Typography variant="body2" color="warning.main" fontWeight={500}>
              {formatDistanceToNow(created, { addSuffix: false })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2">
            {params.row.createdAt ? format(new Date(params.row.createdAt), 'MMM dd, yyyy') : '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.expiresAt ? format(new Date(params.row.expiresAt), 'MMM dd, yyyy') : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" color="primary">
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === 'REQUESTED' && (
            <Tooltip title="Cancel Request">
              <IconButton size="small" color="error" onClick={() => handleCancelConsent(params.row.id)}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const filteredConsents = consents.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.consentId?.toLowerCase().includes(q) ||
      c.patient?.firstName?.toLowerCase().includes(q) ||
      c.patient?.lastName?.toLowerCase().includes(q) ||
      c.purpose?.toLowerCase().includes(q)
    );
  });

  const statsCards = [
    { label: 'Total Consents', value: stats.total, color: '#4A90E2', icon: <VerifiedUser /> },
    { label: 'Granted', value: stats.granted, color: '#50C878', icon: <CheckCircle /> },
    { label: 'Requested', value: stats.requested, color: '#F39C12', icon: <HourglassEmpty /> },
    { label: 'Expired', value: stats.expired, color: '#95A5A6', icon: <Cancel /> },
  ];

  return (
    <Box sx={{ overflow: 'hidden', maxWidth: '100%' }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 4,
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            Consent Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage patient consent requests and permissions
            {consents.some(c => c.status === 'REQUESTED') && (
              <Chip
                label="Auto-refreshing"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ ml: 1, height: 20, fontSize: 11 }}
              />
            )}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #50C878 0%, #45B369 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #45B369 0%, #3A9E5A 100%)' },
          }}
        >
          New Consent Request
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            {loading ? (
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
            ) : (
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(stat.color, 0.08)} 0%, ${alpha(stat.color, 0.02)} 100%)`,
                  border: `1px solid ${alpha(stat.color, 0.2)}`,
                  borderRadius: 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(stat.color, 0.2)}`,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={stat.color}>
                        {stat.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {stat.label}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: stat.color,
                        borderRadius: 2,
                        p: 1.5,
                        color: 'white',
                        display: 'flex',
                        boxShadow: `0 4px 12px ${alpha(stat.color, 0.4)}`,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <TextField
          fullWidth
          placeholder="Search by consent ID, patient name, or purpose..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper sx={{
        height: { xs: 400, sm: 500, md: 600 },
        width: '100%',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        <DataGrid
          rows={filteredConsents}
          loading={loading}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': { py: 2 },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 },
          }}
        />
      </Paper>
    </Box>
  );
};

export default ConsentManagement;
