import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add,
  Search,
  CalendarToday,
  Schedule,
  CheckCircle,
  Cancel,
  AccessTime,
  Person,
  LocalHospital,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import appointmentService from '../../services/appointmentService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const AppointmentList: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.searchAppointments({});
      const data = response as any;
      setAppointments(data.data || []);
    } catch (error: any) {
      toast.error('Failed to load appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await appointmentService.getAppointmentStats();
      const data = response as any;
      setStats({
        total: data.data?.total || 0,
        today: data.data?.today || 0,
        upcoming: data.data?.upcoming || 0,
        completed: data.data?.completed || 0,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return '#4A90E2';
      case 'COMPLETED':
        return '#50C878';
      case 'CANCELLED':
        return '#E74C3C';
      case 'IN_PROGRESS':
        return '#F39C12';
      default:
        return '#95A5A6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return <Schedule fontSize="small" />;
      case 'COMPLETED':
        return <CheckCircle fontSize="small" />;
      case 'CANCELLED':
        return <Cancel fontSize="small" />;
      default:
        return <AccessTime fontSize="small" />;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      width: 200,
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
      field: 'doctor',
      headerName: 'Doctor',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#9B59B6', width: 36, height: 36 }}>
            <LocalHospital fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="500">
            Dr. {params.row.doctor?.firstName} {params.row.doctor?.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'scheduledAt',
      headerName: 'Date & Time',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2">
              {params.row.scheduledAt ? format(new Date(params.row.scheduledAt), 'MMM dd, yyyy') : '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {params.row.scheduledAt ? format(new Date(params.row.scheduledAt), 'hh:mm a') : '-'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.row.type || 'OPD'}
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
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status || 'SCHEDULED';
        const color = getStatusColor(status);
        return (
          <Chip
            icon={getStatusIcon(status)}
            label={status.replace('_', ' ')}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          />
        );
      },
    },
    {
      field: 'notes',
      headerName: 'Notes',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="caption" color="text.secondary" noWrap>
          {params.row.notes || '-'}
        </Typography>
      ),
    },
  ];

  const statsCards = [
    { label: 'Total Appointments', value: stats.total, color: '#4A90E2', icon: <CalendarToday /> },
    { label: 'Today', value: stats.today, color: '#F39C12', icon: <Schedule /> },
    { label: 'Upcoming', value: stats.upcoming, color: '#9B59B6', icon: <AccessTime /> },
    { label: 'Completed', value: stats.completed, color: '#50C878', icon: <CheckCircle /> },
  ];

  return (
    <Box>
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
            Appointment Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule and manage patient appointments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #357ABD 0%, #2868A8 100%)',
            },
          }}
        >
          New Appointment
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
          placeholder="Search by patient name, doctor, or appointment ID..."
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
        overflow: 'auto',
      }}>
        <DataGrid
          rows={appointments}
          loading={loading}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              py: 2,
            },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'action.hover',
              fontWeight: 600,
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default AppointmentList;
