import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, IconButton, InputAdornment, MenuItem, Paper, Stack,
  Tooltip, alpha, useTheme, Collapse, FormControl, InputLabel, Select,
  Switch, FormControlLabel, CircularProgress,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, CheckCircle, LocalHospital, FilterList,
  Clear, Business, People, MedicalServices, CreditCard, Schedule, Save,
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
  _count?: { users: number; doctors: number; patients: number; appointments: number };
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  ACTIVE:    { color: '#16a34a', bg: '#dcfce7' },
  TRIAL:     { color: '#2563eb', bg: '#dbeafe' },
  SUSPENDED: { color: '#dc2626', bg: '#fee2e2' },
  EXPIRED:   { color: '#d97706', bg: '#fef3c7' },
};

const planConfig: Record<string, { color: string; label: string }> = {
  FREE:         { color: '#64748b', label: 'Free' },
  BASIC:        { color: '#2563eb', label: 'Basic' },
  PROFESSIONAL: { color: '#7c3aed', label: 'Professional' },
  ENTERPRISE:   { color: '#059669', label: 'Enterprise' },
};

const HospitalManagement: React.FC = () => {
  const theme = useTheme();
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: '', code: '', type: 'HOSPITAL', email: '', phone: '',
    alternatePhone: '', website: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '', landmark: '',
    registrationNumber: '', gstNumber: '', panNumber: '', licenseNumber: '',
    establishedYear: '', ownerName: '', ownerEmail: '', ownerPhone: '',
    totalBeds: '', icuBeds: '', emergencyBeds: '', operationTheaters: '',
    plan: 'FREE', defaultOpdCharge: '',
  });

  // ── Schedule dialog state ────────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleHospital, setScheduleHospital] = useState<Hospital | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const DAY_LABELS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const [scheduleData, setScheduleData] = useState<{
    is24x7: boolean;
    defaultSlotDuration: number;
    operatingHours: Record<string, { start: string; end: string } | null>;
    breakTimes: { start: string; end: string; label: string }[];
    holidays: string[];
  }>({
    is24x7: false, defaultSlotDuration: 30,
    operatingHours: { mon: { start: '09:00', end: '21:00' }, tue: { start: '09:00', end: '21:00' }, wed: { start: '09:00', end: '21:00' }, thu: { start: '09:00', end: '21:00' }, fri: { start: '09:00', end: '21:00' }, sat: { start: '09:00', end: '17:00' }, sun: { start: '09:00', end: '14:00' } },
    breakTimes: [], holidays: [],
  });

  const handleOpenSchedule = async (hospital: Hospital) => {
    setScheduleHospital(hospital);
    setScheduleOpen(true);
    try {
      setScheduleLoading(true);
      const res: any = await hospitalService.getSchedule(hospital.id);
      const d = res.data || res;
      setScheduleData({
        is24x7: d.is24x7 || false,
        defaultSlotDuration: d.defaultSlotDuration || 30,
        operatingHours: d.operatingHours || { mon: { start: '09:00', end: '21:00' }, tue: { start: '09:00', end: '21:00' }, wed: { start: '09:00', end: '21:00' }, thu: { start: '09:00', end: '21:00' }, fri: { start: '09:00', end: '21:00' }, sat: { start: '09:00', end: '17:00' }, sun: { start: '09:00', end: '14:00' } },
        breakTimes: d.breakTimes || [],
        holidays: d.holidays || [],
      });
    } catch { /* use defaults */ }
    finally { setScheduleLoading(false); }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleHospital) return;
    try {
      setScheduleLoading(true);
      await hospitalService.updateSchedule(scheduleHospital.id, scheduleData);
      toast.success('Schedule updated');
      setScheduleOpen(false);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to update schedule'); }
    finally { setScheduleLoading(false); }
  };

  const updateDayHours = (day: string, field: 'start' | 'end', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [day]: { ...(prev.operatingHours[day] || { start: '09:00', end: '21:00' }), [field]: value } },
    }));
  };

  const toggleDayClosed = (day: string) => {
    setScheduleData(prev => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [day]: prev.operatingHours[day] ? null : { start: '09:00', end: '21:00' } },
    }));
  };

  useEffect(() => { fetchHospitals(); }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response: any = await hospitalService.getAllHospitals({});
      const fetched = response.data?.data?.hospitals || response.data?.hospitals || response.hospitals || [];
      setAllHospitals(fetched);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const hospitals = useMemo(() => {
    let list = [...allHospitals];
    if (statusFilter !== 'ALL') list = list.filter((h) => h.status === statusFilter);
    if (planFilter !== 'ALL') list = list.filter((h) => h.plan === planFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((h) =>
        h.name?.toLowerCase().includes(q) || h.code?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) || h.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allHospitals, statusFilter, planFilter, searchQuery]);

  const activeFilters = [statusFilter !== 'ALL', planFilter !== 'ALL'].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter('ALL'); setPlanFilter('ALL'); setSearchQuery(''); };

  const statCards = useMemo(() => [
    { label: 'Total Hospitals', value: allHospitals.length, icon: <Business />, color: '#6366f1' },
    { label: 'Active', value: allHospitals.filter((h) => h.status === 'ACTIVE').length, icon: <CheckCircle />, color: '#16a34a' },
    { label: 'Trial', value: allHospitals.filter((h) => h.status === 'TRIAL').length, icon: <LocalHospital />, color: '#2563eb' },
    { label: 'Total Users', value: allHospitals.reduce((s, h) => s + (h._count?.users || 0), 0), icon: <People />, color: '#7c3aed' },
  ], [allHospitals]);

  // ── Dialog handlers ──────────────────────────────────────────────────────
  const handleOpenDialog = (hospital?: Hospital) => {
    if (hospital) {
      setEditingHospital(hospital);
      const h = hospital as any;
      setFormData({
        name: hospital.name, code: hospital.code, type: h.type || 'HOSPITAL',
        email: hospital.email || '', phone: hospital.phone || '',
        alternatePhone: h.alternatePhone || '', website: h.website || '',
        addressLine1: h.addressLine1 || '', addressLine2: h.addressLine2 || '',
        city: hospital.city || '', state: hospital.state || '', pincode: hospital.pincode || '',
        landmark: h.landmark || '', registrationNumber: h.registrationNumber || '',
        gstNumber: h.gstNumber || '', panNumber: h.panNumber || '',
        licenseNumber: h.licenseNumber || '', establishedYear: h.establishedYear || '',
        ownerName: h.ownerName || '', ownerEmail: h.ownerEmail || '', ownerPhone: h.ownerPhone || '',
        totalBeds: h.totalBeds || '', icuBeds: h.icuBeds || '',
        emergencyBeds: h.emergencyBeds || '', operationTheaters: h.operationTheaters || '',
        plan: hospital.plan || 'FREE',
        defaultOpdCharge: h.defaultOpdCharge ? String(h.defaultOpdCharge) : '',
      });
    } else {
      setEditingHospital(null);
      setFormData({
        name: '', code: '', type: 'HOSPITAL', email: '', phone: '',
        alternatePhone: '', website: '', addressLine1: '', addressLine2: '',
        city: '', state: '', pincode: '', landmark: '',
        registrationNumber: '', gstNumber: '', panNumber: '', licenseNumber: '',
        establishedYear: '', ownerName: '', ownerEmail: '', ownerPhone: '',
        totalBeds: '', icuBeds: '', emergencyBeds: '', operationTheaters: '',
        plan: 'FREE', defaultOpdCharge: '',
      });
    }
    setOpenDialog(true);
  };
  const handleCloseDialog = () => { setOpenDialog(false); setEditingHospital(null); };

  const handleSubmit = async () => {
    try {
      if (editingHospital) {
        await hospitalService.updateHospital(editingHospital.id, {
          ...formData,
          defaultOpdCharge: formData.defaultOpdCharge ? parseFloat(formData.defaultOpdCharge) : undefined,
        });
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
        toast.success('Hospital suspended');
        fetchHospitals();
      } catch { toast.error('Failed to suspend hospital'); }
    }
  };

  const handleActivate = async (id: string) => {
    if (window.confirm('Activate this hospital?')) {
      try {
        await hospitalService.updateHospital(id, { isActive: true, status: 'ACTIVE' } as any);
        toast.success('Hospital activated');
        fetchHospitals();
      } catch { toast.error('Failed to activate hospital'); }
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Hospital',
      flex: 1.2,
      minWidth: 260,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha('#6366f1', 0.1), color: '#6366f1',
            }}
          >
            <LocalHospital fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{params.value}</Typography>
            <Typography variant="caption" color="text.secondary">{params.row.code}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'city',
      headerName: 'Location',
      width: 160,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.row.city || '—'}</Typography>
          {params.row.state && <Typography variant="caption" color="text.secondary">{params.row.state}</Typography>}
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">{params.value || '—'}</Typography>
      ),
    },
    {
      field: 'plan',
      headerName: 'Plan',
      width: 130,
      renderCell: (params) => {
        const pc = planConfig[params.value] || planConfig.FREE;
        return (
          <Chip
            icon={<CreditCard sx={{ fontSize: 14 }} />}
            label={pc.label}
            size="small"
            sx={{ bgcolor: alpha(pc.color, 0.1), color: pc.color, fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      field: 'stats',
      headerName: 'Stats',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Chip
            icon={<People sx={{ fontSize: 13 }} />}
            label={`${params.row._count?.users || 0}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            icon={<MedicalServices sx={{ fontSize: 13 }} />}
            label={`${params.row._count?.doctors || 0}`}
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            label={`${params.row._count?.patients || 0} Pts`}
            size="small"
            variant="outlined"
            color="info"
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const sc = statusConfig[params.value] || { color: '#64748b', bg: '#f1f5f9' };
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const isSuspended = params.row.status === 'SUSPENDED' || params.row.status === 'EXPIRED';
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Schedule"><IconButton size="small" onClick={() => handleOpenSchedule(params.row)} sx={{ color: '#6366f1' }}><Schedule fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: 'text.secondary' }}><Edit fontSize="small" /></IconButton></Tooltip>
            {isSuspended ? (
              <Tooltip title="Activate"><IconButton size="small" onClick={() => handleActivate(params.row.id)} color="success"><CheckCircle fontSize="small" /></IconButton></Tooltip>
            ) : (
              <Tooltip title="Suspend"><IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <Grid item xs={12}>
      <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mt: 1.5, mb: 0.5, borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`, pb: 0.5 }}>
        {title}
      </Typography>
    </Grid>
  );

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#1e3a5f' : '#0ea5e9'} 0%, ${theme.palette.mode === 'dark' ? '#1e1b4b' : '#6366f1'} 100%)`,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Business sx={{ fontSize: 40, opacity: 0.9 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Hospital Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>Manage all hospitals in the system</Typography>
            </Box>
          </Box>
          <Button
            variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            Add Hospital
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
                p: 2.5, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`,
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 4px 20px ${alpha(s.color, 0.15)}` },
              }}
            >
              <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(s.color, 0.1), color: s.color }}>
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
            placeholder="Search by name, code, email, or city..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            size="small" sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled' }} /></InputAdornment>,
              ...(searchQuery ? { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery('')}><Clear fontSize="small" /></IconButton></InputAdornment> } : {}),
            }}
          />
          <Button
            variant={showFilters ? 'contained' : 'outlined'} size="small" startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)} sx={{ minWidth: 100, borderRadius: 2 }}
          >
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
        </Stack>

        <Collapse in={showFilters}>
          <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Status</MenuItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: val.color }} />
                      <span>{key}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Plan</InputLabel>
              <Select value={planFilter} label="Plan" onChange={(e) => setPlanFilter(e.target.value)}>
                <MenuItem value="ALL">All Plans</MenuItem>
                {Object.entries(planConfig).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: val.color }} />
                      <span>{val.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {activeFilters > 0 && (
              <Button size="small" startIcon={<Clear />} onClick={clearFilters} color="inherit" sx={{ alignSelf: 'center' }}>Clear all</Button>
            )}
          </Stack>
        </Collapse>
      </Paper>

      {/* Results summary */}
      <Box sx={{ mb: 1, px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{hospitals.length}</strong> of {allHospitals.length} hospitals
        </Typography>
      </Box>

      {/* Data Grid */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <DataGrid
          rows={hospitals} columns={columns} loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick autoHeight rowHeight={64}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(theme.palette.primary.main, 0.04), borderBottom: `1px solid ${theme.palette.divider}` },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 },
            '& .MuiDataGrid-cell': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
          }}
        />
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>{editingHospital ? 'Edit Hospital' : 'Register New Hospital'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {editingHospital ? 'Update hospital information' : 'Fill in details to register a new hospital'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <SectionTitle title="Basic Information" />
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Hospital Name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Hospital Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={!!editingHospital} helperText="Auto-generated if empty" /></Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} SelectProps={{ native: true }}>
                {['HOSPITAL', 'CLINIC', 'NURSING_HOME', 'DIAGNOSTIC_CENTER', 'POLYCLINIC', 'SPECIALTY_CENTER', 'MULTI_SPECIALTY', 'SUPER_SPECIALTY'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, ' ')}</option>
                ))}
              </TextField>
            </Grid>

            <SectionTitle title="Contact Information" />
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Email" required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Alt. Phone" value={formData.alternatePhone} onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></Grid>

            <SectionTitle title="Address" />
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Address Line 1" required value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Address Line 2" value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="City" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="State" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Pincode" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} inputProps={{ maxLength: 6 }} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Landmark" value={formData.landmark} onChange={(e) => setFormData({ ...formData, landmark: e.target.value })} /></Grid>

            <SectionTitle title="Legal & Registration" />
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Registration Number" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="License Number" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Established Year" type="number" value={formData.establishedYear} onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="GST Number" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="PAN Number" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })} /></Grid>

            <SectionTitle title="Owner / Director" />
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Owner Name" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Owner Email" type="email" value={formData.ownerEmail} onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Owner Phone" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} /></Grid>

            <SectionTitle title="Facility Details" />
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" label="Total Beds" value={formData.totalBeds} onChange={(e) => setFormData({ ...formData, totalBeds: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" label="ICU Beds" value={formData.icuBeds} onChange={(e) => setFormData({ ...formData, icuBeds: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" label="Emergency Beds" value={formData.emergencyBeds} onChange={(e) => setFormData({ ...formData, emergencyBeds: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" label="Operation Theaters" value={formData.operationTheaters} onChange={(e) => setFormData({ ...formData, operationTheaters: e.target.value })} /></Grid>

            <SectionTitle title="Subscription & Pricing" />
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Plan" value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })} SelectProps={{ native: true }}>
                <option value="FREE">Free (14-day trial)</option>
                <option value="BASIC">Basic — ₹2,999/month</option>
                <option value="PROFESSIONAL">Professional — ₹9,999/month</option>
                <option value="ENTERPRISE">Enterprise — Custom pricing</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Default OPD Fee (₹)" type="number" placeholder="e.g. 300" helperText="Fallback when doctor has no individual fee"
                value={formData.defaultOpdCharge} onChange={(e) => setFormData({ ...formData, defaultOpdCharge: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 2, px: 3 }}>{editingHospital ? 'Update Hospital' : 'Create Hospital'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Schedule Configuration Dialog ────────────────────────────────── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>Schedule — {scheduleHospital?.name}</Typography>
            <IconButton onClick={() => setScheduleOpen(false)}><Clear /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {scheduleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <FormControlLabel
                    control={<Switch checked={scheduleData.is24x7} onChange={e => setScheduleData(p => ({ ...p, is24x7: e.target.checked }))} />}
                    label="24/7 Hospital"
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Default Slot Duration</InputLabel>
                    <Select value={scheduleData.defaultSlotDuration} label="Default Slot Duration"
                      onChange={e => setScheduleData(p => ({ ...p, defaultSlotDuration: Number(e.target.value) }))}>
                      {[10, 15, 20, 30, 45, 60].map(m => <MenuItem key={m} value={m}>{m} minutes</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              {!scheduleData.is24x7 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Operating Hours</Typography>
                  </Grid>
                  {DAYS.map(day => {
                    const hours = scheduleData.operatingHours[day];
                    const isClosed = !hours;
                    return (
                      <Grid item xs={12} key={day}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography sx={{ width: 90, fontWeight: 500 }}>{DAY_LABELS[day]}</Typography>
                          <FormControlLabel
                            control={<Switch size="small" checked={!isClosed} onChange={() => toggleDayClosed(day)} />}
                            label={isClosed ? 'Closed' : 'Open'}
                            sx={{ width: 100 }}
                          />
                          {!isClosed && (
                            <>
                              <TextField size="small" type="time" label="Start" value={hours?.start || '09:00'}
                                onChange={e => updateDayHours(day, 'start', e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                              <Typography>to</Typography>
                              <TextField size="small" type="time" label="End" value={hours?.end || '21:00'}
                                onChange={e => updateDayHours(day, 'end', e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                            </>
                          )}
                        </Stack>
                      </Grid>
                    );
                  })}
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Break Times</Typography>
                {scheduleData.breakTimes.map((b, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField size="small" type="time" value={b.start} label="Start" InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], start: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" type="time" value={b.end} label="End" InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], end: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" value={b.label} label="Label" placeholder="e.g. Lunch" sx={{ width: 150 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], label: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <IconButton size="small" color="error" onClick={() => setScheduleData(p => ({ ...p, breakTimes: p.breakTimes.filter((_, idx) => idx !== i) }))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setScheduleData(p => ({ ...p, breakTimes: [...p.breakTimes, { start: '13:00', end: '14:00', label: 'Lunch' }] }))} sx={{ mt: 1 }}>
                  + Add Break
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Holidays</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  {scheduleData.holidays.map((h, i) => (
                    <Chip key={i} label={h} size="small" onDelete={() => setScheduleData(p => ({ ...p, holidays: p.holidays.filter((_, idx) => idx !== i) }))} />
                  ))}
                </Stack>
                <TextField size="small" type="date" label="Add Holiday" InputLabelProps={{ shrink: true }} sx={{ mt: 1, width: 200 }}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !scheduleData.holidays.includes(val))
                      setScheduleData(p => ({ ...p, holidays: [...p.holidays, val].sort() }));
                    e.target.value = '';
                  }} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setScheduleOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSaveSchedule} variant="contained" disabled={scheduleLoading}
            startIcon={scheduleLoading ? <CircularProgress size={16} /> : <Save />} sx={{ borderRadius: 2, px: 3 }}>
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalManagement;
