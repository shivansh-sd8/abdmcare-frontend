import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Search,
  History,
  Person,
  CalendarToday,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AuditLogs: React.FC = () => {
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
  }, [page, pageSize, entityFilter, actionFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>('/api/v1/audit-logs', {
        params: {
          page: page + 1,
          limit: pageSize,
          module: entityFilter || undefined,
          action: actionFilter || undefined,
        },
      });

      console.log('Audit logs response:', response);
      
      // api.get already extracts response.data
      const logs = response.data?.logs || response.logs || [];
      const total = response.data?.total || response.total || 0;
      
      setLogs(logs);
      setTotal(total);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday fontSize="small" color="action" />
          <Typography variant="body2">
            {new Date(params.value).toLocaleString()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'user',
      headerName: 'User',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person fontSize="small" color="action" />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {params.value.firstName} {params.value.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.value.role}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 180,
      renderCell: (params) => {
        const action = params.value || '';
        let color: any = 'default';
        
        if (action.includes('POST')) color = 'success';
        else if (action.includes('PUT') || action.includes('PATCH')) color = 'info';
        else if (action.includes('DELETE')) color = 'error';
        else if (action.includes('GET')) color = 'default';
        
        return (
          <Chip
            label={action}
            color={color}
            size="small"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      field: 'module',
      headerName: 'Module',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'SYSTEM'} 
          color="primary"
          variant="outlined" 
          size="small" 
        />
      ),
    },
    {
      field: 'resourceType',
      headerName: 'Entity',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value || 'N/A'} variant="outlined" size="small" />
      ),
    },
    {
      field: 'resourceId',
      headerName: 'Entity ID',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value ? params.value.substring(0, 8) + '...' : '-'}
        </Typography>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IP Address',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value || '-'}
        </Typography>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <History sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Audit Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track all system activities and user actions
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search logs..."
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
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select
                value={entityFilter}
                label="Module"
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <MenuItem value="">All Modules</MenuItem>
                <MenuItem value="AUTH">Authentication</MenuItem>
                <MenuItem value="HOSPITAL">Hospital</MenuItem>
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="PATIENT">Patient</MenuItem>
                <MenuItem value="DOCTOR">Doctor</MenuItem>
                <MenuItem value="APPOINTMENT">Appointment</MenuItem>
                <MenuItem value="CONSENT">Consent</MenuItem>
                <MenuItem value="ABHA">ABHA</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
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
      </Paper>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
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

export default AuditLogs;
