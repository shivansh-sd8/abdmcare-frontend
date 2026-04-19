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
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import consentService from '../../services/consentService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const ConsentManagement: React.FC = () => {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    granted: 0,
    requested: 0,
    expired: 0,
  });

  useEffect(() => {
    fetchConsents();
    fetchStats();
  }, []);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const response = await consentService.getAllConsents();
      const data = response as any;
      setConsents(data.data || []);
    } catch (error: any) {
      toast.error('Failed to load consents');
      console.error('Error fetching consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await consentService.getAllConsents();
      const data = response as any;
      const allConsents = data.data || [];
      
      setStats({
        total: allConsents.length,
        granted: allConsents.filter((c: any) => c.status === 'GRANTED').length,
        requested: allConsents.filter((c: any) => c.status === 'REQUESTED').length,
        expired: allConsents.filter((c: any) => c.status === 'EXPIRED').length,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'GRANTED':
        return '#50C878';
      case 'REQUESTED':
        return '#F39C12';
      case 'EXPIRED':
        return '#95A5A6';
      case 'REVOKED':
        return '#E74C3C';
      case 'DENIED':
        return '#E74C3C';
      default:
        return '#4A90E2';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'GRANTED':
        return <CheckCircle fontSize="small" />;
      case 'REQUESTED':
        return <HourglassEmpty fontSize="small" />;
      case 'EXPIRED':
      case 'REVOKED':
      case 'DENIED':
        return <Cancel fontSize="small" />;
      default:
        return <VerifiedUser fontSize="small" />;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'consentId',
      headerName: 'Consent ID',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="500" color="primary">
          {params.row.consentId}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 180,
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
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={<Description />}
          label={params.row.purpose || 'Care Management'}
          size="small"
          sx={{
            bgcolor: alpha('#9B59B6', 0.1),
            color: '#9B59B6',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status || 'REQUESTED';
        const color = getStatusColor(status);
        return (
          <Chip
            icon={getStatusIcon(status)}
            label={status}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 500,
            }}
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
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
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.expiresAt ? format(new Date(params.row.expiresAt), 'MMM dd, yyyy') : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: () => (
        <Tooltip title="View Details">
          <IconButton size="small" color="primary">
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const statsCards = [
    { label: 'Total Consents', value: stats.total, color: '#4A90E2', icon: <VerifiedUser /> },
    { label: 'Granted', value: stats.granted, color: '#50C878', icon: <CheckCircle /> },
    { label: 'Requested', value: stats.requested, color: '#F39C12', icon: <HourglassEmpty /> },
    { label: 'Expired', value: stats.expired, color: '#95A5A6', icon: <Cancel /> },
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
            Consent Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage patient consent requests and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #50C878 0%, #45B369 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #45B369 0%, #3A9E5A 100%)',
            },
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
        overflow: 'auto',
      }}>
        <DataGrid
          rows={consents}
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

export default ConsentManagement;
