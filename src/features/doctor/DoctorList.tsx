import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Avatar,
  Chip,
  alpha,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';
import {
  Add,
  Search,
  LocalHospital,
  Person,
  MedicalServices,
  Phone,
  Email,
  Visibility,
  VerifiedUser,
  Clear,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import { toast } from 'react-toastify';
import { useRolePermissions } from '../../hooks/useRolePermissions';

const DoctorList: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const permissions = useRolePermissions();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, specializations: 0 });

  // Filters
  const [specFilter, setSpecFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Editing the doctor's profile, fee or schedule now lives entirely inside
  // the Doctor Profile page (DoctorEditDialog) — keeps the list focused on
  // search/discovery and avoids duplicating the same forms in two places.

  useEffect(() => {
    fetchDoctors();
    // Only fetch stats for ADMIN and SUPER_ADMIN
    if (permissions.isAdmin || permissions.isSuperAdmin) {
      fetchStats();
    }
  }, [permissions.isAdmin, permissions.isSuperAdmin]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorService.searchDoctors({});
      const data = response as any;
      setDoctors(data.data || []);
    } catch (error: any) {
      toast.error('Failed to load doctors');
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await doctorService.getDoctorStats();
      const data = response as any;
      setStats({
        total: data.data?.total || 0,
        active: data.data?.hprLinked || data.data?.active || data.data?.total || 0,
        specializations: data.data?.specializations?.length || 0,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'doctor',
      headerName: 'Doctor',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <Avatar
            sx={{
              bgcolor: '#9B59B6',
              width: 40,
              height: 40,
            }}
          >
            {params.row.firstName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="600">
              Dr. {params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.registrationNo}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'specialization',
      headerName: 'Specialization',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={<MedicalServices />}
          label={params.row.specialization}
          size="small"
          sx={{
            bgcolor: alpha('#4A90E2', 0.1),
            color: '#4A90E2',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'contact',
      headerName: 'Contact',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2">{params.row.mobile}</Typography>
          </Box>
          {params.row.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {params.row.email}
              </Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      field: 'qualification',
      headerName: 'Qualification',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{params.row.qualification}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={<VerifiedUser />}
          label={params.row.isActive ? 'Active' : 'Inactive'}
          size="small"
          color={params.row.isActive ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View profile">
            <IconButton size="small" color="primary" onClick={() => navigate(`/app/doctors/${params.row.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredDoctors = doctors.filter((doc) => {
    if (specFilter && (doc.specialization || '') !== specFilter) return false;
    if (statusFilter === 'ACTIVE' && !doc.isActive) return false;
    if (statusFilter === 'INACTIVE' && doc.isActive) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${doc.firstName || ''} ${doc.lastName || ''}`.toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    const regNo = (doc.registrationNo || '').toLowerCase();
    return name.includes(q) || spec.includes(q) || regNo.includes(q);
  });

  // Extract distinct specialisations from current dataset for chip filter
  const distinctSpecs = Array.from(
    new Set(doctors.map((d) => d.specialization).filter(Boolean) as string[])
  ).sort();

  return (
    <Box>
      <PageHeader
        title={permissions.isReceptionist ? 'Doctor Directory' : 'Doctor Management'}
        subtitle={
          permissions.isReceptionist
            ? 'Search and view doctors for appointment scheduling'
            : 'Manage medical professionals, schedules, and specialisations'
        }
        icon={<LocalHospital />}
        actions={
          (permissions.isAdmin || permissions.isSuperAdmin) ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/app/doctors/new')}
            >
              Add doctor
            </Button>
          ) : undefined
        }
      />

      {(permissions.isAdmin || permissions.isSuperAdmin) && (
        <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
          <Grid item xs={6} sm={4}>
            <StatCard label="Total doctors" value={stats.total.toLocaleString()}
              icon={<LocalHospital />} tone="secondary" loading={loading} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <StatCard label="Active" value={stats.active.toLocaleString()}
              icon={<Person />} tone="success" loading={loading} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard label="Specialisations" value={stats.specializations.toLocaleString()}
              icon={<MedicalServices />} tone="info" loading={loading} />
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2 }} variant="outlined">
        <Stack spacing={1.25}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, specialisation, or registration #"
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

          {/* Quick filter chips */}
          {(distinctSpecs.length > 0 || (permissions.isAdmin || permissions.isSuperAdmin)) && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                size="small"
                label="All"
                color={!specFilter && statusFilter === 'ALL' ? 'primary' : 'default'}
                variant={!specFilter && statusFilter === 'ALL' ? 'filled' : 'outlined'}
                onClick={() => { setSpecFilter(''); setStatusFilter('ALL'); }}
                sx={{ fontWeight: 600 }}
              />
              {(permissions.isAdmin || permissions.isSuperAdmin) && (
                <>
                  <Chip
                    size="small"
                    label="Active"
                    color={statusFilter === 'ACTIVE' ? 'success' : 'default'}
                    variant={statusFilter === 'ACTIVE' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label="Inactive"
                    color={statusFilter === 'INACTIVE' ? 'warning' : 'default'}
                    variant={statusFilter === 'INACTIVE' ? 'filled' : 'outlined'}
                    onClick={() => setStatusFilter(statusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')}
                    sx={{ fontWeight: 600 }}
                  />
                  <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 0.5 }} />
                </>
              )}
              {distinctSpecs.slice(0, 8).map((sp) => (
                <Chip
                  key={sp}
                  size="small"
                  label={sp}
                  variant={specFilter === sp ? 'filled' : 'outlined'}
                  color={specFilter === sp ? 'secondary' : 'default'}
                  onClick={() => setSpecFilter(specFilter === sp ? '' : sp)}
                  sx={{ fontWeight: 500 }}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Mobile: card list. Desktop: DataGrid. */}
      {isMobile ? (
        <Stack spacing={1.25}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, height: 96, borderRadius: 2 }} />
            ))
          ) : filteredDoctors.length === 0 ? (
            <EmptyState
              title="No doctors found"
              message={searchQuery ? 'Try a different search term.' : 'Add your first doctor to get started.'}
              action={(permissions.isAdmin || permissions.isSuperAdmin) ? {
                label: 'Add doctor', onClick: () => navigate('/app/doctors/new'),
              } : undefined}
            />
          ) : (
            filteredDoctors.map((doc) => (
              <Paper
                key={doc.id}
                variant="outlined"
                sx={{
                  p: 1.5, borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease',
                  '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
                }}
                onClick={() => navigate(`/app/doctors/${doc.id}`)}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{
                    width: 44, height: 44, fontSize: '0.85rem', fontWeight: 700,
                    bgcolor: alpha(theme.palette.secondary.main, 0.16),
                    color: 'secondary.main',
                  }}>
                    {doc.firstName?.charAt(0)}{doc.lastName?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      Dr. {doc.firstName} {doc.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {doc.specialization}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                      {doc.registrationNo && (
                        <Chip size="small" label={doc.registrationNo}
                          sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                      )}
                      <Chip
                        size="small"
                        label={doc.isActive ? 'Active' : 'Inactive'}
                        color={doc.isActive ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    </Stack>
                  </Box>
                  <Tooltip title="View profile">
                    <IconButton size="small" color="primary"
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/doctors/${doc.id}`); }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      ) : (
        <Paper sx={{
          height: 600, width: '100%', borderRadius: 2, overflow: 'hidden',
        }} variant="outlined">
          <DataGrid
            rows={filteredDoctors}
            loading={loading}
            columns={columns}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': { py: 1.5 },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
                fontWeight: 600,
              },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <EmptyState
                    title="No doctors found"
                    message={searchQuery ? 'Try a different search term.' : 'Add your first doctor to get started.'}
                  />
                </Box>
              ),
            }}
          />
        </Paper>
      )}

    </Box>
  );
};

export default DoctorList;
