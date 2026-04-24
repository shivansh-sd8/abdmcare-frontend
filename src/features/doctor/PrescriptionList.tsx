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
  Divider,
} from '@mui/material';
import {
  Add,
  Visibility,
  Delete,
  Medication,
  Print,
  LocalPharmacy,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import prescriptionService from '../../services/prescriptionService';
import patientService from '../../services/patientService';

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string };
  doctor?: { firstName: string; lastName: string; specialization?: string };
  medications: MedicationItem[];
  diagnosis?: string;
  notes?: string;
  createdAt: string;
}

const EncounterList: React.FC = () => {
  const permissions = useRolePermissions();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [patients, setPatients] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    notes: '',
  });
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page: page + 1, limit: rowsPerPage };
      if (permissions.isDoctor) params.doctorId = permissions.userId;
      const response = await prescriptionService.getAllPrescriptions(params as any) as any;
      setPrescriptions(response.data?.prescriptions || response.data?.data || []);
      setTotalCount(response.data?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, permissions.isDoctor, permissions.userId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const fetchPatients = async () => {
    try {
      const response = await patientService.searchPatients({ limit: 100 }) as any;
      setPatients(response.data?.patients || response.data?.data || []);
    } catch {
      // silently fail
    }
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, field: keyof MedicationItem, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleCreate = async () => {
    try {
      const validMeds = medications.filter(m => m.name && m.dosage && m.frequency && m.duration);
      if (validMeds.length === 0) {
        setError('At least one complete medication is required');
        return;
      }
      await prescriptionService.createPrescription({
        patientId: formData.patientId,
        doctorId: permissions.userId,
        medications: validMeds,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
      });
      setCreateOpen(false);
      setFormData({ patientId: '', diagnosis: '', notes: '' });
      setMedications([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create prescription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await prescriptionService.deletePrescription(id);
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handlePrint = (prescription: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Prescription</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>
      <h2>Prescription</h2>
      <p><strong>Patient:</strong> ${prescription.patient?.firstName} ${prescription.patient?.lastName}</p>
      <p><strong>Doctor:</strong> Dr. ${prescription.doctor?.firstName} ${prescription.doctor?.lastName}</p>
      <p><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</p>
      ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ''}
      <table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
      <tbody>${(prescription.medications || []).map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.instructions || '-'}</td></tr>`).join('')}</tbody></table>
      ${prescription.notes ? `<p style="margin-top:20px"><strong>Notes:</strong> ${prescription.notes}</p>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Prescriptions</Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isDoctor ? 'Create and manage prescriptions' : permissions.isPharmacist ? 'View prescriptions for dispensing' : 'View prescriptions'}
          </Typography>
        </Box>
        {permissions.canCreatePrescription && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { fetchPatients(); setCreateOpen(true); }}>
            New Prescription
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: `linear-gradient(135deg, ${alpha('#4A90E2', 0.08)} 0%, ${alpha('#4A90E2', 0.02)} 100%)`, border: `1px solid ${alpha('#4A90E2', 0.2)}`, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ backgroundColor: '#4A90E2', borderRadius: 2, p: 1, color: 'white' }}><Medication /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Prescriptions</Typography>
                <Typography variant="h5" fontWeight="bold">{totalCount}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
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
                  {!permissions.isDoctor && <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>}
                  <TableCell sx={{ fontWeight: 600 }}>Medications</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Diagnosis</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box sx={{ py: 4 }}>
                        <LocalPharmacy sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No prescriptions found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  prescriptions.map((rx) => (
                    <TableRow key={rx.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{rx.patient?.firstName} {rx.patient?.lastName}</Typography>
                        {rx.patient?.uhid && <Typography variant="caption" color="text.secondary">{rx.patient.uhid}</Typography>}
                      </TableCell>
                      {!permissions.isDoctor && (
                        <TableCell>Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}</TableCell>
                      )}
                      <TableCell>
                        <Chip label={`${(rx.medications || []).length} medication(s)`} size="small" icon={<Medication sx={{ fontSize: 14 }} />} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rx.diagnosis || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => { setSelectedPrescription(rx); setViewOpen(true); }}><Visibility fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Print">
                            <IconButton size="small" onClick={() => handlePrint(rx)}><Print fontSize="small" /></IconButton>
                          </Tooltip>
                          {(permissions.isDoctor || permissions.isSuperAdmin) && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(rx.id)}><Delete fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </Box>
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
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Prescription</DialogTitle>
        <DialogContent>
          <TextField select label="Patient" fullWidth margin="normal" value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}>
            {patients.map((p) => (<MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>))}
          </TextField>
          <TextField label="Diagnosis" fullWidth margin="normal" value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} />

          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>Medications</Typography>
          {medications.map((med, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">Medication #{index + 1}</Typography>
                {medications.length > 1 && (
                  <Button size="small" color="error" onClick={() => handleRemoveMedication(index)}>Remove</Button>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField label="Name" fullWidth size="small" value={med.name} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} /></Grid>
                <Grid item xs={12} sm={6}><TextField label="Dosage" fullWidth size="small" value={med.dosage} onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)} placeholder="e.g. 500mg" /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Frequency" fullWidth size="small" value={med.frequency} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="e.g. Twice daily" /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Duration" fullWidth size="small" value={med.duration} onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)} placeholder="e.g. 7 days" /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Instructions" fullWidth size="small" value={med.instructions} onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)} placeholder="e.g. After meals" /></Grid>
              </Grid>
            </Box>
          ))}
          <Button variant="outlined" startIcon={<Add />} onClick={handleAddMedication} sx={{ mt: 1 }}>Add Medication</Button>

          <TextField label="Notes" fullWidth margin="normal" multiline rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.patientId || medications.every(m => !m.name)}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Prescription Details</DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box sx={{ pt: 1 }}>
              <Typography><strong>Patient:</strong> {selectedPrescription.patient?.firstName} {selectedPrescription.patient?.lastName}</Typography>
              <Typography><strong>Doctor:</strong> Dr. {selectedPrescription.doctor?.firstName} {selectedPrescription.doctor?.lastName}</Typography>
              <Typography><strong>Date:</strong> {new Date(selectedPrescription.createdAt).toLocaleString()}</Typography>
              {selectedPrescription.diagnosis && <Typography><strong>Diagnosis:</strong> {selectedPrescription.diagnosis}</Typography>}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Medications</Typography>
              {(selectedPrescription.medications || []).map((med, i) => (
                <Paper key={i} sx={{ p: 2, mb: 1, backgroundColor: 'grey.50' }}>
                  <Typography fontWeight={600}>{med.name} — {med.dosage}</Typography>
                  <Typography variant="body2" color="text.secondary">{med.frequency} for {med.duration}</Typography>
                  {med.instructions && <Typography variant="body2" color="text.secondary">Instructions: {med.instructions}</Typography>}
                </Paper>
              ))}
              {selectedPrescription.notes && <Typography sx={{ mt: 2 }}><strong>Notes:</strong> {selectedPrescription.notes}</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPrescription && <Button startIcon={<Print />} onClick={() => handlePrint(selectedPrescription)}>Print</Button>}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EncounterList;
