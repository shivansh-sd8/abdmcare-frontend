import React, { useState, useEffect, useMemo } from 'react';
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
  Paper,
  Stack,
  Tooltip,
  alpha,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  People,
  LocalHospital,
  FilterList,
  Clear,
  SupervisorAccount,
  MedicalServices,
  PersonOutline,
  AdminPanelSettings,
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
  hospital?: { name: string };
  isActive: boolean;
  createdAt: string;
}

interface Hospital {
  id: string;
  name: string;
  code: string;
}

const roleColorMap: Record<string, { bg: string; fg: string }> = {
  SUPER_ADMIN:    { bg: '#7c3aed', fg: '#fff' },
  ADMIN:          { bg: '#2563eb', fg: '#fff' },
  DOCTOR:         { bg: '#059669', fg: '#fff' },
  NURSE:          { bg: '#d97706', fg: '#fff' },
  RECEPTIONIST:   { bg: '#0891b2', fg: '#fff' },
  LAB_TECHNICIAN: { bg: '#7c3aed', fg: '#fff' },
  PHARMACIST:     { bg: '#be185d', fg: '#fff' },
};

const roleLabelMap: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Admin',
  DOCTOR:         'Doctor',
  NURSE:          'Nurse',
  RECEPTIONIST:   'Receptionist',
  LAB_TECHNICIAN: 'Lab Technician',
  PHARMACIST:     'Pharmacist',
};

const UserManagement: React.FC = () => {
  const permissions = useRolePermissions();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
    firstName: '', lastName: '', phone: '',
    role: 'RECEPTIONIST', hospitalId: '',
    specialization: '', qualification: '', registrationNo: '', hprId: '',
  });

  const allRoles = permissions.isSuperAdmin
    ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']
    : ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'];

  useEffect(() => {
    fetchUsers();
    if (permissions.isSuperAdmin) fetchHospitals();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/api/v1/auth/users');
      setUsers(response.data?.data || response.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response: any = await hospitalService.getAllHospitals();
      setHospitals(
        response.data?.data?.hospitals || response.data?.hospitals || response.hospitals || []
      );
    } catch {
      /* silent */
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'ALL') list = list.filter((u) => u.role === roleFilter);
    if (hospitalFilter !== 'ALL')
      list = list.filter((u) => (hospitalFilter === 'NONE' ? !u.hospitalId : u.hospitalId === hospitalFilter));
    if (statusFilter !== 'ALL') list = list.filter((u) => (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive));
    return list;
  }, [users, searchQuery, roleFilter, hospitalFilter, statusFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, [users]);

  const activeFilters = [roleFilter !== 'ALL', hospitalFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

  const clearFilters = () => {
    setRoleFilter('ALL');
    setHospitalFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  // ── Dialog handlers ──────────────────────────────────────────────────────
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username, email: user.email, password: '',
        firstName: user.firstName, lastName: user.lastName, phone: '',
        role: user.role, hospitalId: user.hospitalId || '',
        specialization: '', qualification: '', registrationNo: '', hprId: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '', email: '', password: '',
        firstName: '', lastName: '', phone: '',
        role: 'RECEPTIONIST', hospitalId: '',
        specialization: '', qualification: '', registrationNo: '', hprId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingUser(null); };

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData };
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
      } catch {
        toast.error('Failed to delete user');
      }
    }
  };

  // ── Stat cards ───────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Users', value: users.length, icon: <People />, color: '#6366f1' },
    { label: 'Doctors', value: roleCounts['DOCTOR'] || 0, icon: <MedicalServices />, color: '#059669' },
    { label: 'Staff', value: users.filter((u) => !['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(u.role)).length, icon: <PersonOutline />, color: '#0891b2' },
    { label: 'Admins', value: (roleCounts['ADMIN'] || 0) + (roleCounts['SUPER_ADMIN'] || 0), icon: <AdminPanelSettings />, color: '#7c3aed' },
  ];

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'fullName',
      headerName: 'User',
      flex: 1.2,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
              bgcolor: alpha(roleColorMap[params.row.role]?.bg || '#6366f1', 0.15),
              color: roleColorMap[params.row.role]?.bg || '#6366f1',
            }}
          >
            {params.row.firstName?.[0]}{params.row.lastName?.[0]}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
              {params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{params.row.username}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => {
        const c = roleColorMap[params.value] || { bg: '#64748b', fg: '#fff' };
        return (
          <Chip
            label={roleLabelMap[params.value] || params.value}
            size="small"
            sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      },
    },
    ...(permissions.isSuperAdmin
      ? [{
          field: 'hospital',
          headerName: 'Hospital',
          flex: 0.8,
          minWidth: 180,
          renderCell: (params: any) => {
            const name = params.row.hospital?.name;
            return name ? (
              <Chip
                icon={<LocalHospital sx={{ fontSize: 14 }} />}
                label={name}
                size="small"
                variant="outlined"
                sx={{ maxWidth: '100%' }}
              />
            ) : (
              <Typography variant="caption" color="text.disabled">No hospital</Typography>
            );
          },
        }]
      : []),
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          sx={{
            fontWeight: 600, fontSize: '0.7rem',
            bgcolor: params.value ? alpha('#22c55e', 0.12) : alpha('#ef4444', 0.1),
            color: params.value ? '#16a34a' : '#dc2626',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit user">
            <IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: 'text.secondary' }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete user">
            <IconButton size="small" onClick={() => handleDelete(params.row.id)} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#1e1b4b' : '#667eea'} 0%, ${theme.palette.mode === 'dark' ? '#312e81' : '#764ba2'} 100%)`,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SupervisorAccount sx={{ fontSize: 40, opacity: 0.9 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">User Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                {permissions.isSuperAdmin ? 'Manage all users across hospitals' : 'Manage users in your hospital'}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)', color: '#fff',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              fontWeight: 600, px: 3, borderRadius: 2,
            }}
          >
            Add User
          </Button>
        </Box>
      </Paper>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5, borderRadius: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: `0 4px 20px ${alpha(s.color, 0.15)}` },
              }}
            >
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: 2, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(s.color, 0.1), color: s.color,
                }}
              >
                {s.icon}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search & Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled' }} /></InputAdornment>,
              ...(searchQuery ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}><Clear fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
              } : {}),
            }}
          />
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            size="small"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ minWidth: 100, borderRadius: 2 }}
          >
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
        </Stack>

        <Collapse in={showFilters}>
          <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="ALL">All Roles</MenuItem>
                {Object.keys(roleLabelMap).map((r) => (
                  <MenuItem key={r} value={r}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: roleColorMap[r]?.bg || '#64748b' }} />
                      <span>{roleLabelMap[r]}</span>
                      {roleCounts[r] ? <Typography variant="caption" color="text.secondary">({roleCounts[r]})</Typography> : null}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {permissions.isSuperAdmin && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Hospital</InputLabel>
                <Select value={hospitalFilter} label="Hospital" onChange={(e) => setHospitalFilter(e.target.value)}>
                  <MenuItem value="ALL">All Hospitals</MenuItem>
                  <MenuItem value="NONE">No Hospital Assigned</MenuItem>
                  {hospitals.map((h) => (
                    <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>

            {activeFilters > 0 && (
              <Button size="small" startIcon={<Clear />} onClick={clearFilters} color="inherit" sx={{ alignSelf: 'center' }}>
                Clear all
              </Button>
            )}
          </Stack>
        </Collapse>
      </Paper>

      {/* Results summary */}
      <Box sx={{ mb: 1, px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{filteredUsers.length}</strong> of {users.length} users
        </Typography>
      </Box>

      {/* Data Grid */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          autoHeight
          rowHeight={60}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 },
            '& .MuiDataGrid-cell': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
          }}
        />
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>{editingUser ? 'Edit User' : 'Create New User'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {editingUser ? 'Update user information' : 'Fill in the details to add a new user'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required size="small">
                <InputLabel>Role</InputLabel>
                <Select value={formData.role} label="Role" onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  {allRoles.map((role) => (
                    <MenuItem key={role} value={role}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: roleColorMap[role]?.bg || '#64748b' }} />
                        <span>{roleLabelMap[role] || role}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="First Name" required value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Last Name" required value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Username" required value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!editingUser} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Email" type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Phone" required value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="9999999999" />
            </Grid>
            {!editingUser && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Password" type="password" required value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </Grid>
            )}

            {formData.role === 'DOCTOR' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" sx={{ mt: 1, fontWeight: 700 }}>
                    Professional Details
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" select label="Specialization" required value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}>
                    {['Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology', 'General Medicine', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Urology'].map((spec) => (
                      <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Qualification" required value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} placeholder="e.g., MBBS, MD" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Registration Number" required value={formData.registrationNo}
                    onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })} placeholder="e.g., MCI-12345" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="HPR ID (Optional)" value={formData.hprId}
                    onChange={(e) => setFormData({ ...formData, hprId: e.target.value })} placeholder="Health Professional Registry ID" />
                </Grid>
              </>
            )}

            {permissions.isSuperAdmin && (
              <Grid item xs={12}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Hospital</InputLabel>
                  <Select value={formData.hospitalId} label="Hospital"
                    onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {hospitals.map((hospital) => (
                      <MenuItem key={hospital.id} value={hospital.id}>{hospital.name} ({hospital.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 2, px: 3 }}>
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
