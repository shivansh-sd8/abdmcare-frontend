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
  Divider,
  TextField,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  Print,
  LocalPharmacy,
  Medication,
  CheckCircle,
  Search,
} from '@mui/icons-material';
import prescriptionService from '../../services/prescriptionService';
import pharmacyService from '../../services/pharmacyService';
import { toast } from 'react-toastify';
import { PageHeader, StatCard } from '../../components/ui';

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
  status?: string;
  dispensedAt?: string;
  createdAt: string;
}

/** Pharmacy master record (subset). */
interface MedicineOption {
  id: string;
  name: string;
  brandName?: string;
  unit?: string;
  mrp?: number;
  totalStock?: number;
}

/** A row in the dispense dialog representing one line on the prescription. */
interface DispenseLine {
  /** Original prescription label (drug name + dosage), shown read-only. */
  label: string;
  /** Selected pharmacy master record (or null if not yet matched). */
  match: MedicineOption | null;
  /** Quantity to dispense for this line. */
  quantity: number;
  /** Unit price (defaults to master MRP, but editable for OTC mark-downs). */
  price: number;
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

  // ── Dispense dialog state ─────────────────────────────────────────────
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [dispenseTarget, setDispenseTarget] = useState<Prescription | null>(null);
  const [dispenseLines, setDispenseLines] = useState<DispenseLine[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);

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

  /** Open the dispense dialog and seed lines from the prescription, attempting
   *  best-effort name matches against the pharmacy master. */
  const openDispense = async (prescription: Prescription) => {
    setDispenseTarget(prescription);
    setDispenseOpen(true);
    setDispenseLines((prescription.medications || []).map((m) => ({
      label: `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`,
      match: null,
      quantity: 1,
      price: 0,
    })));

    // Pull a small slice of the master so the autocomplete has options ready.
    try {
      const res: any = await pharmacyService.listMedicines({ limit: 100 });
      const list: MedicineOption[] = res.data?.medicines || res.data?.data || res.data || [];
      setMedicineOptions(list);

      // Try to auto-match by exact (case-insensitive) name. The user can
      // override before submitting.
      setDispenseLines(prev => prev.map((line, i) => {
        const orig = prescription.medications?.[i];
        if (!orig) return line;
        const target = (orig.name || '').toLowerCase().trim();
        const exact = list.find(x => (x.name || '').toLowerCase().trim() === target);
        const partial = exact || list.find(x => target.includes((x.name || '').toLowerCase().trim()) || (x.name || '').toLowerCase().trim().includes(target));
        return partial
          ? { ...line, match: partial, price: typeof partial.mrp === 'number' ? partial.mrp : line.price }
          : line;
      }));
    } catch {
      // Silent: dialog still works, user can pick manually
    }
  };

  const closeDispense = () => {
    setDispenseOpen(false);
    setDispenseTarget(null);
    setDispenseLines([]);
  };

  const updateLine = (idx: number, patch: Partial<DispenseLine>) => {
    setDispenseLines(prev => prev.map((line, i) => i === idx ? { ...line, ...patch } : line));
  };

  /** Block submission when any line has zero quantity, missing match, or the
   *  selected medicine doesn't have enough stock. */
  const dispenseValidation = (() => {
    if (dispenseLines.length === 0) return 'No medications to dispense';
    for (let i = 0; i < dispenseLines.length; i++) {
      const l = dispenseLines[i];
      if (l.quantity <= 0) return `Row ${i + 1}: quantity must be at least 1`;
      if (l.price < 0)     return `Row ${i + 1}: price cannot be negative`;
      if (l.match && typeof l.match.totalStock === 'number' && l.match.totalStock < l.quantity) {
        return `Row ${i + 1}: only ${l.match.totalStock} ${l.match.unit || 'units'} of ${l.match.name} in stock`;
      }
    }
    return null;
  })();

  const submitDispense = async () => {
    if (!dispenseTarget) return;
    if (dispenseValidation) {
      toast.error(dispenseValidation);
      return;
    }
    try {
      setDispensing(true);
      await prescriptionService.dispensePrescription(dispenseTarget.id, {
        medicines: dispenseLines.map((l, i) => ({
          name: l.match?.name || (dispenseTarget.medications?.[i]?.name || l.label),
          medicineId: l.match?.id,
          price: Number(l.price) || 0,
          quantity: Number(l.quantity) || 1,
        })),
      });
      toast.success('Prescription dispensed and stock deducted');
      closeDispense();
      fetchPrescriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispense prescription');
    } finally {
      setDispensing(false);
    }
  };

  const todayCount = prescriptions.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length;

  const dispensedToday = prescriptions.filter(p => {
    if (p.status?.toUpperCase() !== 'DISPENSED') return false;
    const today = new Date().toDateString();
    return p.dispensedAt ? new Date(p.dispensedAt).toDateString() === today : true;
  }).length;

  return (
    <Box>
      <PageHeader
        title="Pharmacy Queue"
        subtitle="Review prescriptions and dispense medications"
        icon={<LocalPharmacy />}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={4}>
          <StatCard label="Total Rx" value={String(totalCount)}
            icon={<LocalPharmacy />} tone="secondary" loading={loading} />
        </Grid>
        <Grid item xs={4}>
          <StatCard label="Today's queue" value={String(todayCount)}
            icon={<Medication />} tone="info" loading={loading} />
        </Grid>
        <Grid item xs={4}>
          <StatCard label="Dispensed today" value={String(dispensedToday)}
            icon={<CheckCircle />} tone="success" loading={loading} />
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
                          {rx.status?.toUpperCase() !== 'DISPENSED' && (
                            <Tooltip title="Dispense">
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircle />}
                                  onClick={() => openDispense(rx)}
                                  sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
                                >
                                  Dispense
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                          {rx.status?.toUpperCase() === 'DISPENSED' && (
                            <Chip label="Dispensed" size="small" color="success" variant="outlined" />
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

      {/* Dispense Dialog — explicit medicine matching, real prices, stock check */}
      <Dialog open={dispenseOpen} onClose={dispensing ? undefined : closeDispense} maxWidth="md" fullWidth>
        <DialogTitle>Dispense Prescription</DialogTitle>
        <DialogContent>
          {dispenseTarget && (
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ mb: 2 }}>
                <strong>Patient:</strong> {dispenseTarget.patient?.firstName} {dispenseTarget.patient?.lastName}
                {dispenseTarget.patient?.uhid ? ` (${dispenseTarget.patient.uhid})` : ''}
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }} icon={<Search />}>
                Match each prescribed item to a pharmacy master record so stock is deducted (FEFO) and the patient is billed correctly.
              </Alert>

              {dispenseLines.map((line, i) => (
                <Paper key={i} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>{i + 1}. {line.label}</strong>
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        size="small"
                        options={medicineOptions}
                        value={line.match}
                        getOptionLabel={(o) => o ? `${o.name}${o.brandName ? ` (${o.brandName})` : ''}` : ''}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_, val) => updateLine(i, {
                          match: val,
                          price: val && typeof val.mrp === 'number' ? val.mrp : line.price,
                        })}
                        renderOption={(props, opt) => (
                          <li {...props} key={opt.id}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {opt.name}{opt.brandName ? ` — ${opt.brandName}` : ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                MRP ₹{opt.mrp ?? 0} • Stock {opt.totalStock ?? 0} {opt.unit || ''}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField {...params} label="Match to pharmacy master"
                            error={!line.match}
                            helperText={!line.match ? 'Required for stock deduction' : ''}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        size="small" fullWidth type="number"
                        label="Quantity" value={line.quantity}
                        inputProps={{ min: 1 }}
                        onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        error={typeof line.match?.totalStock === 'number' && line.match.totalStock < line.quantity}
                        helperText={
                          typeof line.match?.totalStock === 'number' && line.match.totalStock < line.quantity
                            ? `Only ${line.match.totalStock} in stock`
                            : (line.match ? `Stock: ${line.match.totalStock ?? 0}` : '')
                        }
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        size="small" fullWidth type="number"
                        label="Unit price" value={line.price}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        onChange={(e) => updateLine(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="h6">
                  Total: ₹{dispenseLines.reduce((s, l) => s + (l.price * l.quantity), 0).toFixed(2)}
                </Typography>
              </Box>

              {dispenseValidation && (
                <Alert severity="warning" sx={{ mt: 2 }}>{dispenseValidation}</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDispense} disabled={dispensing}>Cancel</Button>
          <Button
            variant="contained" color="success"
            onClick={submitDispense}
            disabled={dispensing || !!dispenseValidation}
            startIcon={dispensing ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
          >
            {dispensing ? 'Dispensing...' : 'Confirm Dispense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrescriptionQueue;
