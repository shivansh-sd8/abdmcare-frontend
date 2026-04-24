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
  Visibility,
  Print,
  LocalPharmacy,
  Medication,
  CheckCircle,
} from '@mui/icons-material';
import prescriptionService from '../../services/prescriptionService';

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

const PrescriptionQueue: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await prescriptionService.getAllPrescriptions({ page: page + 1, limit: rowsPerPage }) as any;
      setPrescriptions(response.data?.prescriptions || response.data?.data || []);
      setTotalCount(response.data?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const handlePrint = (prescription: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Prescription</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>
      <h2>Prescription — Dispensing Copy</h2>
      <p><strong>Patient:</strong> ${prescription.patient?.firstName} ${prescription.patient?.lastName} ${prescription.patient?.uhid ? `(${prescription.patient.uhid})` : ''}</p>
      <p><strong>Doctor:</strong> Dr. ${prescription.doctor?.firstName} ${prescription.doctor?.lastName}</p>
      <p><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString()}</p>
      ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ''}
      <table><thead><tr><th>#</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
      <tbody>${(prescription.medications || []).map((m, i) => `<tr><td>${i + 1}</td><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.instructions || '-'}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:30px;border-top:1px solid #ddd;padding-top:10px"><strong>Dispensed by:</strong> _________________________ <strong>Date:</strong> _____________</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const todayCount = prescriptions.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Pharmacy Queue</Typography>
          <Typography variant="body2" color="text.secondary">View prescriptions and dispense medications</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Prescriptions', value: totalCount, icon: <LocalPharmacy />, color: '#9B59B6' },
          { title: "Today's Queue", value: todayCount, icon: <Medication />, color: '#4A90E2' },
          { title: 'Dispensed Today', value: 0, icon: <CheckCircle />, color: '#50C878' },
        ].map((card) => (
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
                  <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
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
                        <Typography color="text.secondary">No prescriptions in queue</Typography>
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
                      <TableCell>Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(rx.medications || []).slice(0, 3).map((m, i) => (
                            <Chip key={i} label={`${m.name} ${m.dosage}`} size="small" variant="outlined" />
                          ))}
                          {(rx.medications || []).length > 3 && <Chip label={`+${rx.medications.length - 3}`} size="small" />}
                        </Box>
                      </TableCell>
                      <TableCell>{rx.diagnosis || '-'}</TableCell>
                      <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => { setSelectedPrescription(rx); setViewOpen(true); }}><Visibility fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Print for Dispensing">
                            <IconButton size="small" color="primary" onClick={() => handlePrint(rx)}><Print fontSize="small" /></IconButton>
                          </Tooltip>
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Prescription Details</DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography><strong>Patient:</strong> {selectedPrescription.patient?.firstName} {selectedPrescription.patient?.lastName}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>UHID:</strong> {selectedPrescription.patient?.uhid || '-'}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>Doctor:</strong> Dr. {selectedPrescription.doctor?.firstName} {selectedPrescription.doctor?.lastName}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>Date:</strong> {new Date(selectedPrescription.createdAt).toLocaleString()}</Typography></Grid>
              </Grid>
              {selectedPrescription.diagnosis && <Typography sx={{ mb: 2 }}><strong>Diagnosis:</strong> {selectedPrescription.diagnosis}</Typography>}
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Medications to Dispense</Typography>
              {(selectedPrescription.medications || []).map((med, i) => (
                <Paper key={i} sx={{ p: 2, mb: 1, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={600}>{i + 1}. {med.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {med.dosage} — {med.frequency} — {med.duration}
                      </Typography>
                      {med.instructions && <Typography variant="body2" color="primary">{med.instructions}</Typography>}
                    </Box>
                  </Box>
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

export default PrescriptionQueue;
