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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
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
  Schedule,
  Save,
  Delete,
  Clear,
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
  const [stats, setStats] = useState({ total: 0, active: 0, specializations: 0 });
  const [editFeeDoctor, setEditFeeDoctor] = useState<any>(null);
  const [editFeeValue, setEditFeeValue] = useState('');

  // ── Doctor Schedule state ─────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState<any>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const [doctorSched, setDoctorSched] = useState<{
    workingHours: Record<string, { start: string; end: string } | null>;
    slotDuration: number | null;
    maxPatientsPerDay: number;
    breakTimes: { start: string; end: string; label: string }[];
  }>({ workingHours: {}, slotDuration: null, maxPatientsPerDay: 30, breakTimes: [] });

  const handleOpenSchedule = async (doc: any) => {
    setScheduleDoctor(doc);
    setScheduleOpen(true);
    try {
      setScheduleLoading(true);
      const res: any = await doctorService.getSchedule(doc.id);
      const d = res.data || res;
      setDoctorSched({
        workingHours: d.workingHours || {},
        slotDuration: d.slotDuration || null,
        maxPatientsPerDay: d.maxPatientsPerDay || 30,
        breakTimes: d.breakTimes || [],
      });
    } catch { /* defaults */ }
    finally { setScheduleLoading(false); }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDoctor) return;
    try {
      setScheduleLoading(true);
      const payload: any = { ...doctorSched };
      if (Object.keys(payload.workingHours).length === 0) payload.workingHours = null;
      if (!payload.slotDuration) payload.slotDuration = null;
      await doctorService.updateSchedule(scheduleDoctor.id, payload);
      toast.success('Doctor schedule updated');
      setScheduleOpen(false);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to update schedule'); }
    finally { setScheduleLoading(false); }
  };

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
        active: data.data?.hprLinked || data.data?.active || data.data?.total || 0,
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
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Profile">
            <IconButton size="small" color="primary" onClick={() => navigate(`/app/doctors/${params.row.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {(permissions.isAdmin || permissions.isSuperAdmin) && (
            <>
              <Tooltip title="Schedule">
                <IconButton size="small" sx={{ color: '#6366f1' }} onClick={() => handleOpenSchedule(params.row)}>
                  <Schedule fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Set Consultation Fee">
                <IconButton size="small" color="primary"
                  onClick={() => { setEditFeeDoctor(params.row); setEditFeeValue(String(params.row.consultationFee ?? '')); }}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
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
            onClick={() => navigate('/app/doctors/new')}
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
          rows={searchQuery.trim() ? doctors.filter((doc) => {
            const q = searchQuery.toLowerCase();
            const name = `${doc.firstName || ''} ${doc.lastName || ''}`.toLowerCase();
            const spec = (doc.specialization || '').toLowerCase();
            const regNo = (doc.registrationNo || '').toLowerCase();
            return name.includes(q) || spec.includes(q) || regNo.includes(q);
          }) : doctors}
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

      {/* Edit Consultation Fee Dialog */}
      <Dialog open={!!editFeeDoctor} onClose={() => setEditFeeDoctor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Set Consultation Fee</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dr. {editFeeDoctor?.firstName} {editFeeDoctor?.lastName} — {editFeeDoctor?.specialization}
          </Typography>
          <TextField
            fullWidth autoFocus type="number" label="OPD Consultation Fee (₹)"
            value={editFeeValue}
            onChange={e => setEditFeeValue(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            helperText="Leave blank to use hospital-level default fee"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditFeeDoctor(null)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await doctorService.updateDoctor(editFeeDoctor.id, {
                consultationFee: editFeeValue ? parseFloat(editFeeValue) : null,
              } as any);
              toast.success('Consultation fee updated');
              setEditFeeDoctor(null);
              fetchDoctors();
            } catch { toast.error('Failed to update fee'); }
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Doctor Schedule Dialog ──────────────────────────────────────── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>
              Schedule — Dr. {scheduleDoctor?.firstName} {scheduleDoctor?.lastName}
            </Typography>
            <IconButton onClick={() => setScheduleOpen(false)}><Clear /></IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Leave blank to use hospital defaults. Only set overrides here.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {scheduleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Slot Duration</InputLabel>
                    <Select value={doctorSched.slotDuration || ''} label="Slot Duration"
                      onChange={e => setDoctorSched(p => ({ ...p, slotDuration: e.target.value ? Number(e.target.value) : null }))}>
                      <MenuItem value="">Hospital default</MenuItem>
                      {[10, 15, 20, 30, 45, 60].map(m => <MenuItem key={m} value={m}>{m} min</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Max Patients/Day" type="number" value={doctorSched.maxPatientsPerDay} sx={{ width: 160 }}
                    onChange={e => setDoctorSched(p => ({ ...p, maxPatientsPerDay: Math.max(1, Math.min(200, Number(e.target.value) || 30)) }))}
                    inputProps={{ min: 1, max: 200 }} />
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Working Hours (overrides hospital)</Typography>
              </Grid>
              {DAYS.map(day => {
                const hours = doctorSched.workingHours[day];
                const hasOverride = hours !== undefined && hours !== null;
                return (
                  <Grid item xs={12} key={day}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography sx={{ width: 50, fontWeight: 500, fontSize: '0.85rem' }}>{DAY_LABELS[day]}</Typography>
                      <FormControlLabel
                        control={<Switch size="small" checked={hasOverride}
                          onChange={() => {
                            setDoctorSched(p => {
                              const wh = { ...p.workingHours };
                              if (hasOverride) { delete wh[day]; } else { wh[day] = { start: '09:00', end: '17:00' }; }
                              return { ...p, workingHours: wh };
                            });
                          }} />}
                        label={hasOverride ? (hours === null ? 'Off' : 'Custom') : 'Default'}
                        sx={{ width: 100 }}
                      />
                      {hasOverride && hours && (
                        <>
                          <TextField size="small" type="time" label="Start" value={hours.start}
                            onChange={e => setDoctorSched(p => ({ ...p, workingHours: { ...p.workingHours, [day]: { ...hours, start: e.target.value } } }))}
                            InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                          <Typography variant="body2">to</Typography>
                          <TextField size="small" type="time" label="End" value={hours.end}
                            onChange={e => setDoctorSched(p => ({ ...p, workingHours: { ...p.workingHours, [day]: { ...hours, end: e.target.value } } }))}
                            InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                        </>
                      )}
                      {hasOverride && (
                        <Button size="small" color="warning"
                          onClick={() => setDoctorSched(p => {
                            const wh = { ...p.workingHours };
                            if (hours) wh[day] = null; else wh[day] = { start: '09:00', end: '17:00' };
                            return { ...p, workingHours: wh };
                          })}>
                          {hours ? 'Mark Off' : 'Set Hours'}
                        </Button>
                      )}
                    </Stack>
                  </Grid>
                );
              })}

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Break Times</Typography>
                {doctorSched.breakTimes.map((b, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField size="small" type="time" value={b.start} label="Start" InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                      onChange={e => { const bt = [...doctorSched.breakTimes]; bt[i] = { ...bt[i], start: e.target.value }; setDoctorSched(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" type="time" value={b.end} label="End" InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                      onChange={e => { const bt = [...doctorSched.breakTimes]; bt[i] = { ...bt[i], end: e.target.value }; setDoctorSched(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" value={b.label} label="Label" sx={{ width: 120 }}
                      onChange={e => { const bt = [...doctorSched.breakTimes]; bt[i] = { ...bt[i], label: e.target.value }; setDoctorSched(p => ({ ...p, breakTimes: bt })); }} />
                    <IconButton size="small" color="error" onClick={() => setDoctorSched(p => ({ ...p, breakTimes: p.breakTimes.filter((_, idx) => idx !== i) }))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setDoctorSched(p => ({ ...p, breakTimes: [...p.breakTimes, { start: '13:00', end: '14:00', label: 'Lunch' }] }))} sx={{ mt: 1 }}>
                  + Add Break
                </Button>
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

export default DoctorList;
