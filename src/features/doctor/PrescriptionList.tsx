import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Tooltip, CircularProgress, Alert, Grid, alpha, Divider,
  Avatar, InputAdornment, Collapse, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import {
  Add, Delete, Medication, Print, LocalPharmacy, Search,
  Refresh, ExpandMore, ExpandLess, Person, Close, CheckCircle,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import prescriptionService from '../../services/prescriptionService';
import patientService from '../../services/patientService';
import { format } from 'date-fns';

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
  totalCharges?: number;
  dispensedAt?: string;
  createdAt: string;
}

// Group prescriptions by patient
interface PatientGroup {
  patient: Prescription['patient'];
  prescriptions: Prescription[];
}

const FREQ_COLORS: Record<string, string> = {
  'Once daily':  '#1565c0',
  'Twice daily': '#6a1b9a',
  'Thrice daily':'#e65100',
  'Four times':  '#c62828',
};

export default function PrescriptionList() {
  const permissions = useRolePermissions();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [expandedRx, setExpandedRx]             = useState<Set<string>>(new Set());

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients]     = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [formData, setFormData]     = useState({ patientId: '', diagnosis: '', notes: '' });

  // Dispense dialog
  const [dispenseRx, setDispenseRx] = useState<Prescription | null>(null);
  const [dispensePrices, setDispensePrices] = useState<Record<string, string>>({});
  const [dispensingQtys, setDispensingQtys] = useState<Record<string, string>>({});
  const [dispenseSaving, setDispenseSaving] = useState(false);

  const openDispenseDialog = (rx: Prescription) => {
    const prices: Record<string, string> = {};
    const qtys:   Record<string, string> = {};
    rx.medications.forEach((m, i) => {
      prices[i] = String((m as any).price ?? '');
      qtys[i]   = String((m as any).quantity ?? '1');
    });
    setDispensePrices(prices);
    setDispensingQtys(qtys);
    setDispenseRx(rx);
  };

  const handleDispense = async () => {
    if (!dispenseRx) return;
    setDispenseSaving(true);
    try {
      await prescriptionService.dispensePrescription(dispenseRx.id, {
        medicines: dispenseRx.medications.map((m, i) => ({
          name:     m.name,
          price:    parseFloat(dispensePrices[i] || '0'),
          quantity: parseInt(dispensingQtys[i] || '1', 10),
        })),
      });
      setDispenseRx(null);
      fetchPrescriptions();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to dispense prescription');
    } finally { setDispenseSaving(false); }
  };
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 100 };
      const response = await prescriptionService.getAllPrescriptions(params) as any;
      const payload  = response.data?.data || response.data || {};
      setPrescriptions(payload.prescriptions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch prescriptions');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  // Group by patient
  const groups = useMemo<PatientGroup[]>(() => {
    const map = new Map<string, PatientGroup>();
    let q = search.toLowerCase();
    const list = prescriptions.filter(rx => {
      if (!q) return true;
      return (
        `${rx.patient?.firstName} ${rx.patient?.lastName}`.toLowerCase().includes(q) ||
        rx.patient?.uhid?.toLowerCase().includes(q) ||
        rx.diagnosis?.toLowerCase().includes(q) ||
        rx.doctor?.lastName?.toLowerCase().includes(q) ||
        (rx.medications || []).some(m => m.name.toLowerCase().includes(q))
      );
    });

    for (const rx of list) {
      const key = rx.patient?.id || 'unknown';
      if (!map.has(key)) map.set(key, { patient: rx.patient, prescriptions: [] });
      map.get(key)!.prescriptions.push(rx);
    }
    return Array.from(map.values());
  }, [prescriptions, search]);

  const togglePatient = (id: string) => {
    setExpandedPatients(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleRx = (id: string) => {
    setExpandedRx(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleCreate = async () => {
    const validMeds = medications.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (!formData.patientId || validMeds.length === 0) return;
    setSaving(true);
    try {
      await prescriptionService.createPrescription({
        patientId: formData.patientId,
        medications: validMeds,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
      } as any);
      setCreateOpen(false);
      setFormData({ patientId: '', diagnosis: '', notes: '' });
      setMedications([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create prescription');
    } finally { setSaving(false); }
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

  const handlePrint = (rx: Prescription) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Prescription</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:700px;margin:auto}
  h2{margin:0 0 4px;color:#1a3c6e;font-size:22px} .sub{color:#666;font-size:13px;margin-bottom:20px}
  .info-row{display:flex;gap:32px;margin-bottom:16px;padding:12px;background:#f5f8ff;border-radius:8px}
  .info-item{} .info-item label{font-size:11px;color:#888;display:block;text-transform:uppercase;letter-spacing:.5px} .info-item span{font-weight:600;font-size:14px}
  .rx-symbol{font-size:28px;color:#1a3c6e;margin-bottom:8px}
  .med{border:1px solid #e0e7f0;border-radius:8px;padding:12px;margin-bottom:10px}
  .med-name{font-weight:700;font-size:15px;margin-bottom:4px} .med-detail{color:#555;font-size:13px}
  .notes{margin-top:16px;padding:12px;background:#fffde7;border-radius:8px;font-size:13px}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:12px;color:#888}
</style>
      </head><body>
<h2>Prescription</h2><div class="sub">${format(new Date(rx.createdAt), 'dd MMMM yyyy')}</div>
<div class="info-row">
  <div class="info-item"><label>Patient</label><span>${rx.patient?.firstName} ${rx.patient?.lastName}</span></div>
  ${rx.patient?.uhid ? `<div class="info-item"><label>UHID</label><span>${rx.patient.uhid}</span></div>` : ''}
  <div class="info-item"><label>Prescribed By</label><span>Dr. ${rx.doctor?.firstName} ${rx.doctor?.lastName}</span></div>
</div>
${rx.diagnosis ? `<p><strong>Diagnosis:</strong> ${rx.diagnosis}</p>` : ''}
<div class="rx-symbol">℞</div>
${(rx.medications || []).map(m => `
<div class="med">
  <div class="med-name">${m.name} — ${m.dosage}</div>
  <div class="med-detail">${m.frequency} &nbsp;·&nbsp; ${m.duration}</div>
  ${m.instructions ? `<div class="med-detail" style="margin-top:4px"><em>${m.instructions}</em></div>` : ''}
</div>`).join('')}
${rx.notes ? `<div class="notes"><strong>Notes:</strong> ${rx.notes}</div>` : ''}
<div class="footer"><span>Printed on ${new Date().toLocaleDateString()}</span><span>Signature: ____________________</span></div>
</body></html>`);
    w.document.close();
    w.print();
  };

  const totalMeds = prescriptions.reduce((s, rx) => s + (rx.medications || []).length, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Prescriptions</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {permissions.isPharmacist
              ? 'Review and dispense prescriptions'
              : permissions.isDoctor
              ? 'All prescriptions you have issued'
              : 'All prescriptions in your hospital'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchPrescriptions} disabled={loading}><Refresh /></IconButton>
          </Tooltip>
        {permissions.canCreatePrescription && (
            <Button variant="contained" startIcon={<Add />}
              onClick={() => {
                patientService.searchPatients({ limit: 100 } as any).then((r: any) => {
                  const list = Array.isArray(r.data) ? r.data : r.data?.patients || r.data?.data || [];
                  setPatients(list);
                });
                setCreateOpen(true);
              }}>
            New Prescription
          </Button>
        )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Patients',      value: groups.length,     color: '#1a3c6e', icon: <Person /> },
          { label: 'Prescriptions', value: prescriptions.length, color: '#2e7d32', icon: <LocalPharmacy /> },
          { label: 'Total Medicines',value: totalMeds,        color: '#6a1b9a', icon: <Medication /> },
        ].map(s => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3,
              borderColor: alpha(s.color, 0.25), bgcolor: alpha(s.color, 0.04) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: s.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </Box>
              <Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800} color={s.color}>{s.value}</Typography>
                </Box>
              </Box>
            </Paper>
        </Grid>
        ))}
      </Grid>

      {/* Search */}
      <TextField size="small" placeholder="Search patient, medicine, diagnosis, doctor…"
        value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3, minWidth: 320 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {/* Patient groups */}
        {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : groups.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <LocalPharmacy sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No prescriptions found</Typography>
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            Prescriptions will appear here once a doctor completes a consultation.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map(({ patient, prescriptions: rxList }) => {
            const patientId = patient?.id || 'unknown';
            const isOpen    = expandedPatients.has(patientId);

            return (
              <Paper key={patientId} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                {/* Patient header — click to expand/collapse */}
                <Box
                  onClick={() => togglePatient(patientId)}
                  sx={{ px: 2.5, py: 1.5, bgcolor: alpha('#1a3c6e', 0.04),
                    borderBottom: isOpen ? '1px solid' : 'none', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
                    '&:hover': { bgcolor: alpha('#1a3c6e', 0.08) } }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: '#1a3c6e', fontSize: 14, fontWeight: 700 }}>
                    {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>{patient?.firstName} {patient?.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      UHID: {patient?.uhid || '—'}
                    </Typography>
                  </Box>
                  <Chip label={`${rxList.length} prescription${rxList.length > 1 ? 's' : ''}`}
                    size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </Box>

                {/* Prescriptions list */}
                <Collapse in={isOpen}>
                  <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {rxList.map((rx) => {
                      const rxOpen = expandedRx.has(rx.id);
                      return (
                        <Paper key={rx.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                          {/* Rx header */}
                          <Box
                            onClick={() => toggleRx(rx.id)}
                            sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center',
                              gap: 1.5, cursor: 'pointer', bgcolor: alpha('#2e7d32', 0.03),
                              '&:hover': { bgcolor: alpha('#2e7d32', 0.07) } }}>
                            <Medication sx={{ color: '#2e7d32', fontSize: 20 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" fontWeight={700}>
                                  Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                                </Typography>
                                {rx.diagnosis && (
                                  <Typography variant="caption" color="text.secondary" noWrap
                                    sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    · {rx.diagnosis}
                                  </Typography>
                                )}
                      </Box>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(rx.createdAt), 'dd MMM yyyy, hh:mm a')} &nbsp;·&nbsp;
                                {(rx.medications || []).length} medicine{(rx.medications || []).length > 1 ? 's' : ''}
                                {rx.status === 'DISPENSED' && (
                                  <Chip label="Dispensed" color="success" size="small" sx={{ ml: 1 }} />
                                )}
                                {rx.status === 'PENDING' && (
                                  <Chip label="Pending Dispense" color="warning" size="small" sx={{ ml: 1 }} />
                                )}
                        </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                              {(permissions.isPharmacist || permissions.isAdmin || permissions.isSuperAdmin) && rx.status !== 'DISPENSED' && (
                                <Tooltip title="Dispense Medicines">
                                  <Button size="small" variant="contained" color="success"
                                    startIcon={<CheckCircle fontSize="small" />}
                                    onClick={() => openDispenseDialog(rx)}
                                    sx={{ textTransform: 'none', py: 0.25 }}>
                                    Dispense
                                  </Button>
                          </Tooltip>
                              )}
                          <Tooltip title="Print">
                                <IconButton size="small" onClick={() => handlePrint(rx)}>
                                  <Print fontSize="small" />
                                </IconButton>
                          </Tooltip>
                          {(permissions.isDoctor || permissions.isSuperAdmin) && (
                            <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDelete(rx.id)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                            {rxOpen ? <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    : <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />}
                          </Box>

                          {/* Medicines list */}
                          <Collapse in={rxOpen}>
                            <Box sx={{ px: 2, pt: 1, pb: 2 }}>
                              {rx.diagnosis && (
                                <Box sx={{ mb: 1.5, p: 1.25, bgcolor: alpha('#1565c0', 0.05),
                                  borderRadius: 2, borderLeft: '3px solid #1565c0' }}>
                                  <Typography variant="caption" fontWeight={700} color="#1565c0">DIAGNOSIS</Typography>
                                  <Typography variant="body2" mt={0.25}>{rx.diagnosis}</Typography>
                                </Box>
                              )}

                              <Typography variant="caption" fontWeight={700} color="text.secondary"
                                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: .5 }}>
                                ℞ Medicines
                              </Typography>

                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {(rx.medications || []).map((med, i) => (
                                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5,
                                    p: 1.25, borderRadius: 2,
                                    bgcolor: alpha('#6a1b9a', 0.03),
                                    border: '1px solid', borderColor: alpha('#6a1b9a', 0.1) }}>
                                    <Box sx={{ minWidth: 24, height: 24, borderRadius: '50%',
                                      bgcolor: '#6a1b9a', color: '#fff', display: 'flex',
                                      alignItems: 'center', justifyContent: 'center',
                                      fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                      {i + 1}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" fontWeight={700}>
                                        {med.name}
                                        {med.dosage && (
                                          <Typography component="span" variant="body2"
                                            color="text.secondary" fontWeight={400}> — {med.dosage}</Typography>
                                        )}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                        {med.frequency && (
                                          <Chip label={med.frequency} size="small" variant="outlined"
                                            sx={{ height: 20, fontSize: 11,
                                              borderColor: alpha(FREQ_COLORS[med.frequency] || '#666', 0.4),
                                              color: FREQ_COLORS[med.frequency] || 'text.secondary' }} />
                                        )}
                                        {med.duration && (
                                          <Chip label={med.duration} size="small" variant="outlined"
                                            sx={{ height: 20, fontSize: 11 }} />
                                        )}
                                        {med.instructions && (
                                          <Typography variant="caption" color="text.secondary"
                                            sx={{ alignSelf: 'center' }}>
                                            {med.instructions}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>

                              {rx.notes && (
                                <Box sx={{ mt: 1.5, p: 1.25, bgcolor: '#fffde7', borderRadius: 2,
                                  border: '1px solid #f9a825' }}>
                                  <Typography variant="caption" fontWeight={700} color="#f57f17">NOTES</Typography>
                                  <Typography variant="body2" mt={0.25}>{rx.notes}</Typography>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </Paper>
                      );
                    })}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Create Prescription Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Medication color="primary" /> New Prescription
          </Box>
          <IconButton size="small" onClick={() => setCreateOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Patient" fullWidth value={formData.patientId}
                onChange={e => setFormData({ ...formData, patientId: e.target.value })}>
                {patients.map(p => (<MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>))}
          </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Diagnosis" fullWidth value={formData.diagnosis}
                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2.5, mb: 1 }}>
            ℞ Medicines
          </Typography>

          {medications.map((med, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2,
              bgcolor: alpha('#6a1b9a', 0.02) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" fontWeight={700} color="primary">Medicine #{index + 1}</Typography>
                {medications.length > 1 && (
                  <Button size="small" color="error" startIcon={<Delete />}
                    onClick={() => setMedications(medications.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                )}
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}><TextField label="Name *" fullWidth size="small" value={med.name}
                  onChange={e => { const u=[...medications]; u[index]={...u[index],name:e.target.value}; setMedications(u); }} /></Grid>
                <Grid item xs={12} sm={6}><TextField label="Dosage *" fullWidth size="small" value={med.dosage}
                  placeholder="e.g. 500mg" onChange={e => { const u=[...medications]; u[index]={...u[index],dosage:e.target.value}; setMedications(u); }} /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Frequency *" fullWidth size="small" value={med.frequency}
                  placeholder="Twice daily" onChange={e => { const u=[...medications]; u[index]={...u[index],frequency:e.target.value}; setMedications(u); }} /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Duration *" fullWidth size="small" value={med.duration}
                  placeholder="7 days" onChange={e => { const u=[...medications]; u[index]={...u[index],duration:e.target.value}; setMedications(u); }} /></Grid>
                <Grid item xs={12} sm={4}><TextField label="Instructions" fullWidth size="small" value={med.instructions}
                  placeholder="After meals" onChange={e => { const u=[...medications]; u[index]={...u[index],instructions:e.target.value}; setMedications(u); }} /></Grid>
              </Grid>
            </Paper>
          ))}

          <Button variant="outlined" startIcon={<Add />} size="small"
            onClick={() => setMedications([...medications, { name:'', dosage:'', frequency:'', duration:'', instructions:'' }])}>
            Add Medicine
          </Button>

          <TextField label="Notes (optional)" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !formData.patientId}
            startIcon={saving ? <CircularProgress size={14} /> : <Medication />}>
            {saving ? 'Saving…' : 'Save Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={!!dispenseRx} onClose={() => setDispenseRx(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            <Box>
              <Typography fontWeight={700}>Dispense Medicines</Typography>
              <Typography variant="caption" color="text.secondary">
                Patient: {dispenseRx?.patient?.firstName} {dispenseRx?.patient?.lastName}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDispenseRx(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter price and quantity for each medicine. Total will be added to the patient's bill.
          </Alert>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Medicine</strong></TableCell>
                <TableCell><strong>Dosage / Freq</strong></TableCell>
                <TableCell width={90}><strong>Qty</strong></TableCell>
                <TableCell width={110}><strong>Price (₹)</strong></TableCell>
                <TableCell width={90} align="right"><strong>Subtotal</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dispenseRx?.medications || []).map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{m.dosage} · {m.frequency}</TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={dispensingQtys[i] ?? '1'}
                      onChange={e => setDispensingQtys(q => ({ ...q, [i]: e.target.value }))}
                      inputProps={{ min: 1, style: { width: 60, padding: '4px 8px' } }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" placeholder="0.00"
                      value={dispensePrices[i] ?? ''}
                      onChange={e => setDispensePrices(p => ({ ...p, [i]: e.target.value }))}
                      InputProps={{ startAdornment: <span style={{ fontSize: 12, marginRight: 2 }}>₹</span> }}
                      inputProps={{ min: 0, style: { width: 80, padding: '4px 8px' } }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ₹{((parseFloat(dispensePrices[i] || '0')) * (parseInt(dispensingQtys[i] || '1', 10))).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>Total:</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ₹{(dispenseRx?.medications || []).reduce((sum, _, i) =>
                    sum + (parseFloat(dispensePrices[i] || '0') * parseInt(dispensingQtys[i] || '1', 10)), 0
                  ).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDispenseRx(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleDispense}
            disabled={dispenseSaving}
            startIcon={dispenseSaving ? <CircularProgress size={14} /> : <CheckCircle />}>
            {dispenseSaving ? 'Processing…' : 'Confirm Dispense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
