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
  Print as PrintIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import { format } from 'date-fns';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { toast } from 'react-toastify';
import { IconButton } from '@mui/material';

const AppointmentList: React.FC = () => {
  const navigate = useNavigate();
  const permissions = useRolePermissions();
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

  const handleCheckIn = async (appointment: any) => {
    try {
      setLoading(true);
      const response = await appointmentService.checkInAppointment(appointment.id) as any;
      const data = response.data?.data || response.data;
      
      toast.success(`✅ Patient checked in! OPD Card: ${data.opdCardNumber}`);
      
      // Refresh list
      fetchAppointments();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to check in patient');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOPDCard = async (appointment: any) => {
    try {
      // Fetch encounter details if available
      let encounterDetails = '';
      if (appointment.encounterId) {
        try {
          const encounterResponse = await fetch(`http://localhost:8080/api/v1/encounters/${appointment.encounterId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const encounterData = await encounterResponse.json();
          const encounter = encounterData.data;
          
          if (encounter) {
            encounterDetails = `
CONSULTATION DETAILS:
-----------------------------------------------------------
Chief Complaint: ${encounter.chiefComplaint || 'N/A'}
Diagnosis: ${encounter.diagnosis || encounter.finalDiagnosis || 'Pending'}
Notes: ${encounter.notes || 'N/A'}
Status: ${encounter.status}
Visit Date: ${format(new Date(encounter.visitDate), 'PPpp')}
`;
          }
        } catch (err) {
          console.error('Failed to fetch encounter details', err);
        }
      }

      const opdCardContent = `
╔═══════════════════════════════════════════════════════════════╗
║                         OPD CARD                              ║
║                    HOSPITAL MANAGEMENT SYSTEM                 ║
╚═══════════════════════════════════════════════════════════════╝

OPD Card Number: ${appointment.opdCardNumber}
Issue Date: ${format(new Date(appointment.checkedInAt), 'PPpp')}

═══════════════════════════════════════════════════════════════

PATIENT INFORMATION:
-------------------------------------------------------------------
Name            : ${appointment.patient?.firstName} ${appointment.patient?.lastName}
UHID            : ${appointment.patient?.uhid}
Age             : ${appointment.patient?.dob ? new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear() : 'N/A'} years
Gender          : ${appointment.patient?.gender}
Blood Group     : ${appointment.patient?.bloodGroup || 'N/A'}
Mobile          : ${appointment.patient?.mobile}
Email           : ${appointment.patient?.email || 'N/A'}
Address         : ${appointment.patient?.address?.line1 || ''}, ${appointment.patient?.address?.city || ''}, ${appointment.patient?.address?.state || ''} - ${appointment.patient?.address?.pincode || ''}

═══════════════════════════════════════════════════════════════

APPOINTMENT DETAILS:
-------------------------------------------------------------------
Doctor          : Dr. ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}
Specialization  : ${appointment.doctor?.specialization}
Department      : ${appointment.doctor?.department?.name || 'N/A'}
Scheduled Time  : ${format(new Date(appointment.scheduledAt), 'PPpp')}
Appointment Type: ${appointment.type}
Status          : ${appointment.status}
${encounterDetails}
═══════════════════════════════════════════════════════════════

EMERGENCY CONTACT:
-------------------------------------------------------------------
Name            : ${appointment.patient?.emergencyContact?.name || 'N/A'}
Relationship    : ${appointment.patient?.emergencyContact?.relationship || 'N/A'}
Mobile          : ${appointment.patient?.emergencyContact?.mobile || 'N/A'}

═══════════════════════════════════════════════════════════════

                    ** IMPORTANT INSTRUCTIONS **

1. Please carry this OPD card for all future visits
2. Arrive 15 minutes before your scheduled appointment
3. Bring all previous medical records and prescriptions
4. Follow doctor's advice and prescribed medications
5. For emergencies, contact: [Hospital Emergency Number]

═══════════════════════════════════════════════════════════════

Generated on: ${format(new Date(), 'PPpp')}
System: ABDM Care - Hospital Management System

    `.trim();

      const blob = new Blob([opdCardContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OPD-Card-${appointment.opdCardNumber}-${appointment.patient?.firstName}-${appointment.patient?.lastName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('OPD Card downloaded successfully');
    } catch (error) {
      console.error('Error downloading OPD card:', error);
      toast.error('Failed to download OPD card');
    }
  };  

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.searchAppointments({});
      const data = response as any;
      console.log('Appointments API Response:', data);
      const appointmentList = data.data?.data?.data || data.data?.data || data.data || [];
      console.log('Parsed appointments:', appointmentList);
      setAppointments(appointmentList);
    } catch (error: any) {
      // Silently handle permission errors
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Only fetch stats if user has permission (SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST)
      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) {
        const response = await appointmentService.getAppointmentStats();
        const data = response as any;
        const statsData = data.data?.data || data.data || {};
        setStats({
          total: statsData.total || 0,
          today: statsData.today || 0,
          upcoming: statsData.upcoming || 0,
          completed: statsData.completed || 0,
        });
      }
    } catch (error: any) {
      // Silently handle permission errors
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
      width: 180,
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
      width: 180,
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
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="caption" color="text.secondary" noWrap>
          {params.row.notes || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const canCheckIn = params.row.status === 'SCHEDULED' && !params.row.checkedInAt && !params.row.opdCardNumber;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canCheckIn && (permissions.isReceptionist || permissions.isAdmin) && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleCheckIn(params.row)}
                title="Check-In Patient"
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            )}
            {params.row.opdCardNumber && (
              <IconButton
                size="small"
                color="success"
                onClick={() => handleDownloadOPDCard(params.row)}
                title="Download OPD Card"
              >
                <PrintIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
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
          onClick={() => navigate('/appointments/schedule')}
          sx={{
            background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #357ABD 0%, #2868A8 100%)',
            },
          }}
        >
          Schedule Appointment
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
