import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import hospitalService from '../../services/hospitalService';
import { toast } from 'react-toastify';

interface Hospital {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  plan: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  abdmEnabled: boolean;
  hipId?: string;
  hiuId?: string;
  isActive: boolean;
  _count?: {
    users: number;
    doctors: number;
    appointments: number;
  };
  createdAt: string;
}

const HospitalManagement: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response: any = await hospitalService.getAllHospitals({
        search: searchQuery || undefined,
      });
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      
      // Try different response structures
      const hospitals = response.data?.data?.hospitals || 
                       response.data?.hospitals || 
                       response.hospitals || 
                       [];
      
      console.log('Extracted hospitals:', hospitals);
      setHospitals(hospitals);
    } catch (error: any) {
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (hospital?: Hospital) => {
    if (hospital) {
      setEditingHospital(hospital);
      setFormData({
        name: hospital.name,
        code: hospital.code,
        address: hospital.address || '',
        city: hospital.city || '',
        state: hospital.state || '',
        pincode: hospital.pincode || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
      });
    } else {
      setEditingHospital(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHospital(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingHospital) {
        await hospitalService.updateHospital(editingHospital.id, formData);
        toast.success('Hospital updated successfully');
      } else {
        await hospitalService.createHospital(formData);
        toast.success('Hospital created successfully');
      }
      handleCloseDialog();
      fetchHospitals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save hospital');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this hospital?')) {
      try {
        await hospitalService.deleteHospital(id);
        toast.success('Hospital deleted successfully');
        fetchHospitals();
      } catch (error: any) {
        toast.error('Failed to delete hospital');
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Hospital Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'code',
      headerName: 'Code',
      width: 120,
    },
    {
      field: 'city',
      headerName: 'City',
      width: 150,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
    },
    {
      field: 'stats',
      headerName: 'Stats',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            size="small"
            label={`${params.row._count?.users || 0} Users`}
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${params.row._count?.patients || 0} Patients`}
            color="success"
            variant="outlined"
          />
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            Hospital Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all hospitals in the system
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add Hospital
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search hospitals by name, code, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchHospitals()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={hospitals}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hospital Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hospital Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingHospital}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingHospital ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalManagement;
