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
  MenuItem,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { toast } from 'react-toastify';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import hospitalService from '../../services/hospitalService';
import api from '../../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hospitalId?: string;
  hospital?: {
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface Hospital {
  id: string;
  name: string;
  code: string;
}

const UserManagement: React.FC = () => {
  const permissions = useRolePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'RECEPTIONIST',
    hospitalId: '',
    // Doctor-specific fields
    specialization: '',
    qualification: '',
    registrationNo: '',
    hprId: '',
  });

  // Only SUPER_ADMIN can create SUPER_ADMIN role
  // ADMIN can only create staff roles
  const roles = permissions.isSuperAdmin
    ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']
    : ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'];

  useEffect(() => {
    fetchUsers();
    if (permissions.isSuperAdmin) {
      fetchHospitals();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/api/v1/auth/users');
      console.log('Users response:', response);
      
      // The api.get already extracts response.data, so we just need .data
      const users = response.data?.data || response.data || [];
      
      console.log('Extracted users:', users);
      setUsers(users);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response: any = await hospitalService.getAllHospitals();
      console.log('Hospitals response:', response);
      console.log('Hospitals data:', response.data);
      
      // Try different response structures
      const hospitals = response.data?.data?.hospitals || 
                       response.data?.hospitals || 
                       response.hospitals || 
                       [];
      
      console.log('Extracted hospitals:', hospitals);
      setHospitals(hospitals);
    } catch (error: any) {
      console.error('Error fetching hospitals:', error);
      console.error('Error response:', error.response);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: '',
        role: user.role,
        hospitalId: user.hospitalId || '',
        specialization: '',
        qualification: '',
        registrationNo: '',
        hprId: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'RECEPTIONIST',
        hospitalId: '',
        specialization: '',
        qualification: '',
        registrationNo: '',
        hprId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData };
      
      // ADMIN users: auto-assign their hospitalId to new users
      if (!permissions.isSuperAdmin) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        submitData.hospitalId = currentUser.hospitalId;
      }
      
      if (editingUser) {
        await api.put(`/api/v1/auth/users/${editingUser.id}`, submitData);
        toast.success('User updated successfully');
      } else {
        await api.post('/api/v1/auth/register', submitData);
        toast.success('User created successfully');
      }
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/v1/auth/users/${id}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error: any) {
        toast.error('Failed to delete user');
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'fullName',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`,
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="primary"
          size="small"
          variant="outlined"
        />
      ),
    },
    ...(permissions.isSuperAdmin
      ? [
          {
            field: 'hospital',
            headerName: 'Hospital',
            width: 200,
            valueGetter: (params: any) => params.row.hospital?.name || 'N/A',
          },
        ]
      : []),
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
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isSuperAdmin
              ? 'Manage all users across hospitals'
              : 'Manage users in your hospital'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add User
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users by name, username, or email..."
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
          rows={users}
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
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Role Selection - Show First */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Basic Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                required
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
                placeholder="9999999999"
              />
            </Grid>
            {!editingUser && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Grid>
            )}

            {/* Doctor-Specific Fields */}
            {formData.role === 'DOCTOR' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" sx={{ mt: 1, mb: 1 }}>
                    Professional Details
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Specialization"
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  >
                    {['Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology', 'General Medicine', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Urology'].map((spec) => (
                      <MenuItem key={spec} value={spec}>
                        {spec}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Qualification"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g., MBBS, MD"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Registration Number"
                    required
                    value={formData.registrationNo}
                    onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                    placeholder="e.g., MCI-12345"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="HPR ID (Optional)"
                    value={formData.hprId}
                    onChange={(e) => setFormData({ ...formData, hprId: e.target.value })}
                    placeholder="Health Professional Registry ID"
                  />
                </Grid>
              </>
            )}

            {/* Hospital Selection for Super Admin */}
            {permissions.isSuperAdmin && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Hospital</InputLabel>
                  <Select
                    value={formData.hospitalId}
                    label="Hospital"
                    onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {hospitals.map((hospital) => (
                      <MenuItem key={hospital.id} value={hospital.id}>
                        {hospital.name} ({hospital.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
