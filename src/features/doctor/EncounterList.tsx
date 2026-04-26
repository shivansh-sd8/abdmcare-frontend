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
  Chip,
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
} from '@mui/material';
import {
  Add,
  Visibility,
  CheckCircle,
  MedicalInformation,
  LocalHospital,
  Assignment,
  Schedule,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import encounterService from '../../services/encounterService';
import patientService from '../../services/patientService';

interface Encounter {
  id: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string };
  doctor?: { firstName: string; lastName: string; specialization?: string };
  type: string;
  status: string;
  chiefComplaint: string;
  diagnosis?: string;
  notes?: string;
  createdAt: string;
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  ACTIVE: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const EncounterList: React.FC = () => {
  const permissions = useRolePermissions();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);

  const [patients, setPatients] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [formData, setFormData] = useState({
    patientId: '',
    type: 'OPD' as 'OPD' | 'IPD' | 'EMERGENCY',
    chiefComplaint: '',
    notes: '',
  });
  const [completeData, setCompleteData] = useState({ diagnosis: '', notes: '' });

  const fetchEncounters = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (permissions.isDoctor) {
        params.doctorId = permissions.userId;
      }
      const response = await encounterService.getAllEncounters(params as any) as any;
      // API returns { success, message, data: [...] }
      const encountersData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setEncounters(encountersData);
      setTotalCount(encountersData.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch encounters');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, permissions.isDoctor, permissions.userId]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  const fetchPatients = async () => {
    try {
      const response = await patientService.searchPatients({ limit: 100 }) as any;
      setPatients(response.data?.patients || response.data?.data || []);
    } catch {
      // silently fail
    }
  };

  const handleCreate = async () => {
    try {
      await encounterService.createEncounter({
        ...formData,
        doctorId: permissions.userId,
      });
      setCreateOpen(false);
      setFormData({ patientId: '', type: 'OPD', chiefComplaint: '', notes: '' });
      fetchEncounters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create encounter');
    }
  };

  const handleComplete = async () => {
    if (!selectedEncounter) return;
    try {
      await encounterService.completeEncounter(selectedEncounter.id, completeData);
      setCompleteOpen(false);
      setCompleteData({ diagnosis: '', notes: '' });
      setSelectedEncounter(null);
      fetchEncounters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete encounter');
    }
  };

  const openCreateDialog = () => {
    fetchPatients();
    setCreateOpen(true);
  };

  const statCards = [
    { title: 'Total Encounters', value: totalCount, icon: <MedicalInformation />, color: '#4A90E2' },
    { title: 'Active', value: encounters.filter(e => e.status === 'ACTIVE' || e.status === 'IN_PROGRESS').length, icon: <Schedule />, color: '#F39C12' },
    { title: 'Completed', value: encounters.filter(e => e.status === 'COMPLETED').length, icon: <CheckCircle />, color: '#50C878' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Encounters</Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isDoctor ? 'Manage your patient encounters' : 'View clinical encounters'}
          </Typography>
        </Box>
        {permissions.canCreateEncounter && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
            New Encounter
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={4} key={card.title}>
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
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Chief Complaint</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {encounters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box sx={{ py: 4 }}>
                        <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No encounters found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  encounters.map((encounter) => (
                    <TableRow key={encounter.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {encounter.patient?.firstName} {encounter.patient?.lastName}
                          </Typography>
                          {encounter.patient?.uhid && (
                            <Typography variant="caption" color="text.secondary">{encounter.patient.uhid}</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={encounter.type} size="small" variant="outlined" icon={<LocalHospital sx={{ fontSize: 16 }} />} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {encounter.chiefComplaint}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={encounter.status} size="small" color={statusColors[encounter.status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(encounter.createdAt).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => { setSelectedEncounter(encounter); setViewOpen(true); }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {permissions.isDoctor && (encounter.status === 'ACTIVE' || encounter.status === 'IN_PROGRESS') && (
                            <Tooltip title="Complete Encounter">
                              <IconButton size="small" color="success" onClick={() => { setSelectedEncounter(encounter); setCompleteData({ diagnosis: '', notes: '' }); setCompleteOpen(true); }}>
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            />
          </>
        )}
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Encounter</DialogTitle>
        <DialogContent>
          <TextField select label="Patient" fullWidth margin="normal" value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}>
            {patients.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Type" fullWidth margin="normal" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}>
            <MenuItem value="OPD">OPD</MenuItem>
            <MenuItem value="IPD">IPD</MenuItem>
            <MenuItem value="EMERGENCY">Emergency</MenuItem>
          </TextField>
          <TextField label="Chief Complaint" fullWidth margin="normal" multiline rows={3} value={formData.chiefComplaint} onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })} />
          <TextField label="Notes" fullWidth margin="normal" multiline rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.patientId || !formData.chiefComplaint}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Encounter Details</DialogTitle>
        <DialogContent>
          {selectedEncounter && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography><strong>Patient:</strong> {selectedEncounter.patient?.firstName} {selectedEncounter.patient?.lastName}</Typography>
              <Typography><strong>Type:</strong> {selectedEncounter.type}</Typography>
              <Typography><strong>Status:</strong> <Chip label={selectedEncounter.status} size="small" color={statusColors[selectedEncounter.status] || 'default'} /></Typography>
              <Typography><strong>Chief Complaint:</strong> {selectedEncounter.chiefComplaint}</Typography>
              {selectedEncounter.diagnosis && <Typography><strong>Diagnosis:</strong> {selectedEncounter.diagnosis}</Typography>}
              {selectedEncounter.notes && <Typography><strong>Notes:</strong> {selectedEncounter.notes}</Typography>}
              <Typography><strong>Date:</strong> {new Date(selectedEncounter.createdAt).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Encounter</DialogTitle>
        <DialogContent>
          <TextField label="Diagnosis" fullWidth margin="normal" multiline rows={3} required value={completeData.diagnosis} onChange={(e) => setCompleteData({ ...completeData, diagnosis: e.target.value })} />
          <TextField label="Closing Notes" fullWidth margin="normal" multiline rows={2} value={completeData.notes} onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleComplete} disabled={!completeData.diagnosis}>Complete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EncounterList;
