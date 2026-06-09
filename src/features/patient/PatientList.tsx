import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Grid,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Visibility,
  HealthAndSafety,
  Phone,
  Email,
  Person,
  CalendarToday,
  PersonAdd,
  EventAvailable,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import patientService from '../../services/patientService';
import { toast } from 'react-toastify';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { PageHeader, StatCard } from '../../components/ui';

const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    abhaLinked: 0,
    newToday: 0,
    appointments: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search: re-fetch whenever searchQuery changes (also fires on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPatients = async (search?: string) => {
    try {
      setLoading(true);
      const response = await patientService.searchPatients(search ? { search } : {});
      const data = response as any;
      // Handle both wrapped and unwrapped responses
      const list = data.data?.patients || data.data?.data || data.data || [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (error: any) {
      toast.error('Failed to load patients');
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await patientService.getPatientStats();
      const data = response as any;
      setStats({
        total: data.data?.total || 0,
        abhaLinked: data.data?.abhaLinked || 0,
        newToday: data.data?.todayRegistrations || data.data?.todayCount || 0,
        appointments: data.data?.appointments || 0,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, patient: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedPatient(patient);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPatient(null);
  };

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      width: 260,
      renderCell: (params: GridRenderCellParams) => {
        const isMale = params.row.gender === 'Male';
        const tone = isMale ? theme.palette.info.main : theme.palette.secondary.main;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
            <Avatar
              sx={{
                bgcolor: alpha(tone, 0.16),
                color: tone,
                border: `1.5px solid ${alpha(tone, 0.3)}`,
                width: 38, height: 38,
                fontSize: '0.85rem',
              }}
            >
              {(params.row.firstName?.[0] || 'P').toUpperCase()}
              {(params.row.lastName?.[0] || '').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {params.row.firstName} {params.row.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {params.row.uhid}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'contact',
      headerName: 'Contact',
      width: 180,
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
      field: 'abha',
      headerName: 'ABHA Status',
      width: 220,
      renderCell: (params: GridRenderCellParams) => {
        const abhaValue = params.row.abhaNumber || params.row.abhaId || params.row.abhaRecord?.abhaNumber || '';
        return (
        <Box>
          {abhaValue ? (
            <Box>
              <Chip
                icon={<HealthAndSafety />}
                label="ABHA Linked"
                size="small"
                color="success"
                sx={{ mb: 0.5 }}
              />
              <Typography variant="caption" display="block" color="text.secondary">
                {abhaValue}
              </Typography>
            </Box>
          ) : (
            <Chip
              label="No ABHA"
              size="small"
              variant="outlined"
              color="warning"
            />
          )}
        </Box>
        );
      },
    },
    {
      field: 'demographics',
      headerName: 'Demographics',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2">
            {params.row.gender}, {params.row.age}y
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.bloodGroup}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'lastVisit',
      headerName: 'Last Visit',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2">{params.row.lastVisit}</Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Profile">
            <IconButton size="small" color="primary" onClick={() => navigate(`/app/patients/${params.row.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => navigate('/app/patients/new', { state: { editPatient: params.row } })}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, params.row)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const statsCards = [
    { label: 'Total Patients', value: stats.total,       tone: 'info' as const,      icon: <Person /> },
    { label: 'ABHA Linked',    value: stats.abhaLinked,  tone: 'success' as const,   icon: <HealthAndSafety /> },
    { label: 'New Today',      value: stats.newToday,    tone: 'warning' as const,   icon: <PersonAdd /> },
    { label: 'Appointments',   value: stats.appointments,tone: 'secondary' as const, icon: <EventAvailable /> },
  ];

  return (
    <Box>
      <PageHeader
        title="Patient Management"
        subtitle="Manage patient records and ABHA integration"
        icon={<Person />}
        actions={
          <>
            <Button variant="outlined" size="small" startIcon={<FilterList />}>
              Filters
            </Button>
            <PermissionGuard requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => navigate('/app/patients/new')}
              >
                New Patient
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        {statsCards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <StatCard
              label={s.label}
              value={s.value.toLocaleString()}
              tone={s.tone}
              icon={s.icon}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.25, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, UHID, mobile, or ABHA number…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              '& fieldset': { border: 'none' },
              backgroundColor: 'transparent',
            },
          }}
        />
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          height: { xs: 420, sm: 520, md: 620 },
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={patients}
          loading={loading}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': { py: 1.5 },
          }}
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          navigate(`/app/patients/${selectedPatient?.id}`);
        }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Full Profile
        </MenuItem>
        <PermissionGuard requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
          <MenuItem onClick={() => {
            handleMenuClose();
            const abhaValue = selectedPatient?.abhaNumber || selectedPatient?.abhaId || selectedPatient?.abhaRecord?.abhaNumber || '';
            if (abhaValue) {
              navigate('/app/abha', { state: { patientId: selectedPatient.id, abhaNumber: abhaValue, mode: 'view' } });
            } else {
              navigate('/app/abha', { state: { patientId: selectedPatient.id, patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`, mobile: selectedPatient.mobile, mode: 'link' } });
            }
          }}>
            <HealthAndSafety fontSize="small" sx={{ mr: 1 }} />
            {(selectedPatient?.abhaNumber || selectedPatient?.abhaId || selectedPatient?.abhaRecord?.abhaNumber) ? 'View ABHA Details' : 'Link ABHA'}
          </MenuItem>
        </PermissionGuard>
        <PermissionGuard requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
          <MenuItem onClick={() => {
            handleMenuClose();
            navigate('/app/appointments/schedule', { state: { patientId: selectedPatient?.id, patientName: `${selectedPatient?.firstName} ${selectedPatient?.lastName}` } });
          }}>
            <CalendarToday fontSize="small" sx={{ mr: 1 }} />
            Book Appointment
          </MenuItem>
        </PermissionGuard>
        <PermissionGuard requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE']}>
          <MenuItem onClick={() => {
            handleMenuClose();
            navigate('/app/patients/new', { state: { editPatient: selectedPatient } });
          }}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit Patient
          </MenuItem>
        </PermissionGuard>
      </Menu>
    </Box>
  );
};

export default PatientList;
