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
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  CheckCircle,
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
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]); // Unfiltered data
  const [hospitals, setHospitals] = useState<Hospital[]>([]); // Filtered data for display
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'HOSPITAL',
    email: '',
    phone: '',
    alternatePhone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    registrationNumber: '',
    gstNumber: '',
    panNumber: '',
    licenseNumber: '',
    establishedYear: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    totalBeds: '',
    icuBeds: '',
    emergencyBeds: '',
    operationTheaters: '',
    plan: 'FREE',
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, planFilter, searchQuery]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response: any = await hospitalService.getAllHospitals({});
      
      // Try different response structures
      const fetchedHospitals = response.data?.data?.hospitals || 
                               response.data?.hospitals || 
                               response.hospitals || 
                               [];
      
      setAllHospitals(fetchedHospitals);
      applyFilters(fetchedHospitals);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (hospitalsToFilter: Hospital[] = allHospitals) => {
    let filtered = [...hospitalsToFilter];

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === statusFilter);
    }

    // Apply plan filter
    if (planFilter && planFilter !== 'all') {
      filtered = filtered.filter(h => h.plan === planFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name?.toLowerCase().includes(query) ||
        h.code?.toLowerCase().includes(query) ||
        h.email?.toLowerCase().includes(query) ||
        h.city?.toLowerCase().includes(query)
      );
    }

    setHospitals(filtered);
  };

  const handleOpenDialog = (hospital?: Hospital) => {
    if (hospital) {
      setEditingHospital(hospital);
      setFormData({
        name: hospital.name,
        code: hospital.code,
        type: (hospital as any).type || 'HOSPITAL',
        email: hospital.email || '',
        phone: hospital.phone || '',
        alternatePhone: (hospital as any).alternatePhone || '',
        website: (hospital as any).website || '',
        addressLine1: (hospital as any).addressLine1 || '',
        addressLine2: (hospital as any).addressLine2 || '',
        city: hospital.city || '',
        state: hospital.state || '',
        pincode: hospital.pincode || '',
        landmark: (hospital as any).landmark || '',
        registrationNumber: (hospital as any).registrationNumber || '',
        gstNumber: (hospital as any).gstNumber || '',
        panNumber: (hospital as any).panNumber || '',
        licenseNumber: (hospital as any).licenseNumber || '',
        establishedYear: (hospital as any).establishedYear || '',
        ownerName: (hospital as any).ownerName || '',
        ownerEmail: (hospital as any).ownerEmail || '',
        ownerPhone: (hospital as any).ownerPhone || '',
        totalBeds: (hospital as any).totalBeds || '',
        icuBeds: (hospital as any).icuBeds || '',
        emergencyBeds: (hospital as any).emergencyBeds || '',
        operationTheaters: (hospital as any).operationTheaters || '',
        plan: hospital.plan || 'FREE',
      });
    } else {
      setEditingHospital(null);
      setFormData({
        name: '',
        code: '',
        type: 'HOSPITAL',
        email: '',
        phone: '',
        alternatePhone: '',
        website: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        registrationNumber: '',
        gstNumber: '',
        panNumber: '',
        licenseNumber: '',
        establishedYear: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        totalBeds: '',
        icuBeds: '',
        emergencyBeds: '',
        operationTheaters: '',
        plan: 'FREE',
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
    if (window.confirm('Are you sure you want to suspend this hospital?')) {
      try {
        await hospitalService.deleteHospital(id);
        toast.success('Hospital suspended successfully');
        fetchHospitals();
      } catch (error: any) {
        toast.error('Failed to suspend hospital');
      }
    }
  };

  const handleActivate = async (id: string) => {
    if (window.confirm('Are you sure you want to activate this hospital?')) {
      try {
        await hospitalService.updateHospital(id, {
          isActive: true,
          status: 'ACTIVE',
        } as any);
        toast.success('Hospital activated successfully');
        fetchHospitals();
      } catch (error: any) {
        toast.error('Failed to activate hospital');
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
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const statusColors: any = {
          ACTIVE: 'success',
          TRIAL: 'info',
          SUSPENDED: 'error',
          EXPIRED: 'warning',
        };
        return (
          <Chip
            label={params.value || 'N/A'}
            color={statusColors[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => {
        const isSuspendedOrExpired = params.row.status === 'SUSPENDED' || params.row.status === 'EXPIRED';
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={() => handleOpenDialog(params.row)}
              title="Edit Hospital"
            >
              <Edit fontSize="small" />
            </IconButton>
            {isSuspendedOrExpired ? (
              <IconButton 
                size="small" 
                onClick={() => handleActivate(params.row.id)} 
                color="success"
                title="Activate Hospital"
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            ) : (
              <IconButton 
                size="small" 
                onClick={() => handleDelete(params.row.id)} 
                color="error"
                title="Suspend Hospital"
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
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
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="TRIAL">TRIAL</MenuItem>
              <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
              <MenuItem value="EXPIRED">EXPIRED</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Plan Filter"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Plans</MenuItem>
              <MenuItem value="FREE">FREE</MenuItem>
              <MenuItem value="BASIC">BASIC</MenuItem>
              <MenuItem value="PROFESSIONAL">PROFESSIONAL</MenuItem>
              <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setStatusFilter('all');
                setPlanFilter('all');
                setSearchQuery('');
              }}
              sx={{ height: '40px' }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
        <TextField
          fullWidth
          placeholder="Search hospitals by name, code, email, or city..."
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
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={hospitals}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          getRowClassName={(params) => 
            params.row.status === 'SUSPENDED' || params.row.status === 'EXPIRED' ? 'inactive-row' : ''
          }
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .inactive-row': {
              backgroundColor: '#ffebee',
              color: '#c62828',
              '&:hover': {
                backgroundColor: '#ffcdd2',
              },
            },
          }}
        />
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hospital Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Hospital Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingHospital}
                helperText="Leave empty for auto-generation"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="HOSPITAL">Hospital</option>
                <option value="CLINIC">Clinic</option>
                <option value="NURSING_HOME">Nursing Home</option>
                <option value="DIAGNOSTIC_CENTER">Diagnostic Center</option>
                <option value="POLYCLINIC">Polyclinic</option>
                <option value="SPECIALTY_CENTER">Specialty Center</option>
                <option value="MULTI_SPECIALTY">Multi Specialty</option>
                <option value="SUPER_SPECIALTY">Super Specialty</option>
              </TextField>
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Contact Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Alternate Phone"
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </Grid>

            {/* Address Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Address Details
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1"
                required
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Landmark"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              />
            </Grid>

            {/* Legal & Registration */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Legal & Registration Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="License Number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GST Number"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PAN Number"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Established Year"
                value={formData.establishedYear}
                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
              />
            </Grid>

            {/* Owner Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Owner/Director Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Owner Name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Owner Email"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Owner Phone"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              />
            </Grid>

            {/* Facility Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Facility Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Total Beds"
                value={formData.totalBeds}
                onChange={(e) => setFormData({ ...formData, totalBeds: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="ICU Beds"
                value={formData.icuBeds}
                onChange={(e) => setFormData({ ...formData, icuBeds: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Emergency Beds"
                value={formData.emergencyBeds}
                onChange={(e) => setFormData({ ...formData, emergencyBeds: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Operation Theaters"
                value={formData.operationTheaters}
                onChange={(e) => setFormData({ ...formData, operationTheaters: e.target.value })}
              />
            </Grid>

            {/* Subscription Plan */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                Subscription Plan
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Plan"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="FREE">Free (14-day trial)</option>
                <option value="BASIC">Basic - ₹2,999/month</option>
                <option value="PROFESSIONAL">Professional - ₹9,999/month</option>
                <option value="ENTERPRISE">Enterprise - Custom pricing</option>
              </TextField>
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
