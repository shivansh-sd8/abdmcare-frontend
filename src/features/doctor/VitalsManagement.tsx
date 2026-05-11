import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  alpha,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Add,
  Visibility,
  MonitorHeart,
  Thermostat,
  Favorite,
  Air,
  FitnessCenter,
  Height,
  Opacity,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import vitalsService from '../../services/vitalsService';
import patientService from '../../services/patientService';

interface VitalsRecord {
  id: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string };
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  notes?: string;
  createdAt: string;
  recordedBy?: { firstName: string; lastName: string };
}

const VitalsManagement: React.FC = () => {
  const permissions = useRolePermissions();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [vitals, setVitals] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedVitals, setSelectedVitals] = useState<VitalsRecord | null>(null);
  const [patients, setPatients] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  const [formData, setFormData] = useState({
    patientId: '',
    temperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    notes: '',
  });

  const fetchVitals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vitalsService.getAllVitals({ page: page + 1, limit: rowsPerPage }) as any;
      setVitals(response.data?.vitals || response.data?.data || []);
      setTotalCount(response.data?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch vitals');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => { fetchVitals(); }, [fetchVitals]);

  const fetchPatients = async () => {
    try {
      const response = await patientService.searchPatients({ limit: 100 }) as any;
      // Backend returns: { success, data: Patient[] }  (array directly, no wrapper key)
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.patients || response.data?.data || [];
      setPatients(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load patient list');
    }
  };

  const handleCreate = async () => {
    try {
      const payload: Record<string, unknown> = { patientId: formData.patientId };
      if (formData.temperature) payload.temperature = parseFloat(formData.temperature);
      if (formData.bloodPressureSystolic) payload.bloodPressureSystolic = parseInt(formData.bloodPressureSystolic);
      if (formData.bloodPressureDiastolic) payload.bloodPressureDiastolic = parseInt(formData.bloodPressureDiastolic);
      if (formData.heartRate) payload.heartRate = parseInt(formData.heartRate);
      if (formData.respiratoryRate) payload.respiratoryRate = parseInt(formData.respiratoryRate);
      if (formData.oxygenSaturation) payload.oxygenSaturation = parseInt(formData.oxygenSaturation);
      if (formData.weight) payload.weight = parseFloat(formData.weight);
      if (formData.height) payload.height = parseFloat(formData.height);
      if (formData.notes) payload.notes = formData.notes;

      await vitalsService.createVitals(payload as any);
      setCreateOpen(false);
      setFormData({ patientId: '', temperature: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', heartRate: '', respiratoryRate: '', oxygenSaturation: '', weight: '', height: '', notes: '' });
      fetchVitals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record vitals');
    }
  };

  const getBPStatus = (sys?: number, dia?: number) => {
    if (!sys || !dia) return null;
    if (sys < 90 || dia < 60) return <Chip label="Low" size="small" color="info" />;
    if (sys <= 120 && dia <= 80) return <Chip label="Normal" size="small" color="success" />;
    if (sys <= 139 || dia <= 89) return <Chip label="Elevated" size="small" color="warning" />;
    return <Chip label="High" size="small" color="error" />;
  };

  const getSpO2Status = (val?: number) => {
    if (!val) return null;
    if (val >= 95) return <Chip label={`${val}%`} size="small" color="success" />;
    if (val >= 90) return <Chip label={`${val}%`} size="small" color="warning" />;
    return <Chip label={`${val}%`} size="small" color="error" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Vitals</Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isNurse ? 'Record and monitor patient vitals' : 'Patient vital signs records'}
          </Typography>
        </Box>
        {permissions.canRecordVitals && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { fetchPatients(); setCreateOpen(true); }}>
            Record Vitals
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Records', value: totalCount, icon: <MonitorHeart />, color: '#4A90E2' },
          { title: "Today's Records", value: vitals.filter(v => new Date(v.createdAt).toDateString() === new Date().toDateString()).length, icon: <Thermostat />, color: '#50C878' },
        ].map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card sx={{ background: `linear-gradient(135deg, ${alpha(card.color, 0.08)} 0%, ${alpha(card.color, 0.02)} 100%)`, border: `1px solid ${alpha(card.color, 0.2)}`, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ backgroundColor: card.color, borderRadius: 2, p: 1, color: 'white' }}>{card.icon}</Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{card.title}</Typography>
                  <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>BP (mmHg)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Heart Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Temp (°C)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>SpO2</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box sx={{ py: 4 }}>
                        <MonitorHeart sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No vitals recorded</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  vitals.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{v.patient?.firstName} {v.patient?.lastName}</Typography>
                        {v.patient?.uhid && <Typography variant="caption" color="text.secondary">{v.patient.uhid}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Favorite sx={{ fontSize: 16, color: '#E74C3C' }} />
                          <Typography variant="body2">{v.bloodPressureSystolic || '-'}/{v.bloodPressureDiastolic || '-'}</Typography>
                          {getBPStatus(v.bloodPressureSystolic, v.bloodPressureDiastolic)}
                        </Box>
                      </TableCell>
                      <TableCell>{v.heartRate ? `${v.heartRate} bpm` : '-'}</TableCell>
                      <TableCell>{v.temperature ? `${v.temperature}°C` : '-'}</TableCell>
                      <TableCell>{getSpO2Status(v.oxygenSaturation) || '-'}</TableCell>
                      <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => { setSelectedVitals(v); setViewOpen(true); }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination component="div" count={totalCount} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
          </>
        )}
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Vitals</DialogTitle>
        <DialogContent>
          <TextField select label="Patient" fullWidth margin="normal" value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}>
            {patients.map((p) => (<MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>))}
          </TextField>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField label="BP Systolic" type="number" fullWidth size="small" value={formData.bloodPressureSystolic} onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">mmHg</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="BP Diastolic" type="number" fullWidth size="small" value={formData.bloodPressureDiastolic} onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">mmHg</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="Heart Rate" type="number" fullWidth size="small" value={formData.heartRate} onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">bpm</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="Temperature" type="number" fullWidth size="small" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">°C</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="Respiratory Rate" type="number" fullWidth size="small" value={formData.respiratoryRate} onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">/min</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="SpO2" type="number" fullWidth size="small" value={formData.oxygenSaturation} onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">%</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="Weight" type="number" fullWidth size="small" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">kg</Typography> }} /></Grid>
            <Grid item xs={6}><TextField label="Height" type="number" fullWidth size="small" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} InputProps={{ endAdornment: <Typography variant="caption">cm</Typography> }} /></Grid>
          </Grid>
          <TextField label="Notes" fullWidth margin="normal" multiline rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.patientId}>Record</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Vitals Details</Typography>
          {selectedVitals && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedVitals.patient?.firstName} {selectedVitals.patient?.lastName}
              {selectedVitals.patient?.uhid && ` · ${selectedVitals.patient.uhid}`}
              {' · '}{new Date(selectedVitals.createdAt).toLocaleString()}
            </Typography>
          )}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedVitals && (() => {
            const vitalCards = [
              {
                label: 'Blood Pressure',
                value: (selectedVitals.bloodPressureSystolic && selectedVitals.bloodPressureDiastolic)
                  ? `${selectedVitals.bloodPressureSystolic}/${selectedVitals.bloodPressureDiastolic}`
                  : '—',
                unit: 'mmHg',
                icon: <Air />,
                color: '#e53e3e',
                status: getBPStatus(selectedVitals.bloodPressureSystolic, selectedVitals.bloodPressureDiastolic),
              },
              {
                label: 'Heart Rate',
                value: selectedVitals.heartRate ?? '—',
                unit: 'bpm',
                icon: <Favorite />,
                color: '#e53e3e',
              },
              {
                label: 'Temperature',
                value: selectedVitals.temperature ?? '—',
                unit: '°C',
                icon: <Thermostat />,
                color: '#dd6b20',
              },
              {
                label: 'SpO2',
                value: selectedVitals.oxygenSaturation ?? '—',
                unit: '%',
                icon: <Opacity />,
                color: '#3182ce',
                status: getSpO2Status(selectedVitals.oxygenSaturation),
              },
              {
                label: 'Resp. Rate',
                value: selectedVitals.respiratoryRate ?? '—',
                unit: '/min',
                icon: <MonitorHeart />,
                color: '#6b46c1',
              },
              {
                label: 'Weight',
                value: selectedVitals.weight ?? '—',
                unit: 'kg',
                icon: <FitnessCenter />,
                color: '#2f855a',
              },
              {
                label: 'Height',
                value: selectedVitals.height ?? '—',
                unit: 'cm',
                icon: <Height />,
                color: '#2c7a7b',
              },
            ];

            return (
              <Grid container spacing={2}>
                {vitalCards.map((card) => (
                  <Grid item xs={6} key={card.label}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isDark ? alpha(card.color, 0.25) : alpha(card.color, 0.2),
                        bgcolor: isDark ? alpha(card.color, 0.08) : alpha(card.color, 0.05),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        height: '100%',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{
                          color: card.color,
                          display: 'flex',
                          p: 0.5,
                          borderRadius: 1,
                          bgcolor: isDark ? alpha(card.color, 0.15) : alpha(card.color, 0.1),
                        }}>
                          {card.icon}
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {card.label}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: card.color, lineHeight: 1 }}>
                          {String(card.value)}
                        </Typography>
                        {card.value !== '—' && (
                          <Typography variant="caption" color="text.secondary">{card.unit}</Typography>
                        )}
                      </Box>
                      {card.status && <Box sx={{ mt: 0.5 }}>{card.status}</Box>}
                    </Box>
                  </Grid>
                ))}
                {selectedVitals.notes && (
                  <Grid item xs={12}>
                    <Box sx={{
                      p: 2, borderRadius: 2, border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
                    }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedVitals.notes}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VitalsManagement;
