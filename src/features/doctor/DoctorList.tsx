import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Skeleton,
  alpha,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  LocalHospital,
  Person,
  MedicalServices,
  Phone,
  Email,
  Edit,
  Visibility,
  VerifiedUser,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import { toast } from 'react-toastify';
import { useRolePermissions } from '../../hooks/useRolePermissions';

const DoctorList: React.FC = () => {
  const navigate = useNavigate();
  const permissions = useRolePermissions();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    specializations: 0,
  });

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
        active: data.data?.active || 0,
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
      width: 120,
      sortable: false,
      renderCell: () => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" color="primary">
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {(permissions.isAdmin || permissions.isSuperAdmin) && (
            <Tooltip title="Edit">
              <IconButton size="small" color="primary">
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const statsCards = [
    { label: 'Total Doctors', value: stats.total, color: '#9B59B6', icon: <LocalHospital /> },
    { label: 'Active Doctors', value: stats.active, color: '#50C878', icon: <Person /> },
    { label: 'Specializations', value: stats.specializations, color: '#4A90E2', icon: <MedicalServices /> },
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
            {permissions.isReceptionist ? 'Doctor Directory' : 'Doctor Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isReceptionist 
              ? 'Search and view doctors for appointment scheduling' 
              : 'Manage medical professionals and their specializations'}
          </Typography>
        </Box>
        {(permissions.isAdmin || permissions.isSuperAdmin) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/doctors/new')}
            sx={{
              background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #8E44AD 0%, #7D3C98 100%)',
              },
            }}
          >
            Add Doctor
          </Button>
        )}
      </Box>

      {(permissions.isAdmin || permissions.isSuperAdmin) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
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
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <TextField
          fullWidth
          placeholder="Search by name, specialization, or registration number..."
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
          rows={doctors}
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

export default DoctorList;
