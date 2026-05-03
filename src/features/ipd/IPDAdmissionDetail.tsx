import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Grid, Chip, Divider,
  CircularProgress, Alert, Paper, IconButton, Tooltip,
  Accordion, AccordionSummary,
  AccordionDetails, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, alpha,
} from '@mui/material';
import {
  Close, Add, ExpandMore, Medication, Science,
  CheckCircle, Person, BedOutlined,
  Assignment, MonitorHeart, LocalHospital, ExitToApp,
  Warning, NoteAdd,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, differenceInDays } from 'date-fns';
import { useSelector } from 'react-redux';
import ipdService from '../../services/ipdService';

interface Medicine {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface LabOrder {
  testName: string;
  testType?: string;
  priority?: string;
  instructions?: string;
}

interface Round {
  id: string;
  visitDate: string;
  diagnosis?: string;
  notes?: string;
  vitalSigns?: any;
  doctor?: { id: string; firstName: string; lastName: string; specialization?: string };
  prescriptions?: Array<{ medicineName: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
  labOrders?: Array<{ testName: string; testType: string; priority: string; status: string }>;
}

interface AdmissionDetail {
  id: string;
  admissionNumber: string;
  status: string;
  admittedAt: string;
  dischargedAt?: string;
  admissionReason?: string;
  diagnosis?: string;
  notes?: string;
  dailyCharges: number;
  advancePaid: number;
  totalAmount: number;
  paymentStatus?: string;
  dischargeReadyAt?: string;
  dischargeReadyBy?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    uhid: string;
    mobile?: string;
    gender?: string;
    dob?: string;
    bloodGroup?: string;
  };
  ward: { id: string; name: string; type: string; dailyCharges: number };
  bed?: { id: string; bedNumber: string };
  encounter?: { id: string; chiefComplaint: string; diagnosis?: string };
  rounds: Round[];
  payments?: Array<{ amount: number; paymentMethod: string; createdAt: string; description: string }>;
}

interface Props {
  open: boolean;
  admissionId: string | null;
  onClose: () => void;
  onDischarge: (admission: AdmissionDetail) => void;
  onUpdated: () => void;
}

const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'As needed', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'At bedtime'];
const DUR_OPTIONS  = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '30 days', 'Ongoing'];
const TEST_TYPES   = ['BLOOD', 'URINE', 'STOOL', 'IMAGING', 'ECG', 'ECHO', 'BIOPSY', 'CULTURE', 'OTHER'];

function emptyMed(): Medicine {
  return { medicineName: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' };
}
function emptyLab(): LabOrder {
  return { testName: '', testType: 'BLOOD', priority: 'ROUTINE', instructions: '' };
}

export default function IPDAdmissionDetail({ open, admissionId, onClose, onDischarge, onUpdated }: Props) {
  const authUser = useSelector((state: any) => state.auth?.user);
  const role     = authUser?.role;
  const canDischarge = role === 'RECEPTIONIST' || role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'DOCTOR';
  const isAdminRole = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [admission, setAdmission]     = useState<AdmissionDetail | null>(null);
  const [loading, setLoading]         = useState(false);
  const [tab, setTab]                 = useState(0);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [markingReady, setMarkingReady]       = useState(false);
  const [doctors, setDoctors]                 = useState<Array<{ id: string; firstName: string; lastName: string; specialization: string }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Round form state
  const [roundDiagnosis, setRoundDiagnosis] = useState('');
  const [roundNotes, setRoundNotes]         = useState('');
  const [vitals, setVitals] = useState({
    bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '',
    oxygenSaturation: '', weight: '', height: '', respiratoryRate: '',
  });
  const [medicines, setMedicines]           = useState<Medicine[]>([emptyMed()]);
  const [labOrders, setLabOrders]           = useState<LabOrder[]>([]);
  const [savingRound, setSavingRound]       = useState(false);

  const load = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const res = await ipdService.getAdmission(admissionId) as any;
      setAdmission(res.data?.data ?? res.data);
    } catch {
      toast.error('Failed to load admission details');
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    if (open && admissionId) { load(); setTab(0); }
  }, [open, admissionId, load]);

  // Fetch doctors list for admin users
  useEffect(() => {
    if (!isAdminRole || !open) return;
    import('../../services/doctorService').then(m =>
      m.default.searchDoctors({ limit: 50 }).then((res: any) => {
        const list = res.data?.doctors || res.data?.data || res.data || [];
        setDoctors(list.slice(0, 50));
      }).catch(() => {})
    );
  }, [isAdminRole, open]);

  const handleMarkDischargeReady = async () => {
    if (!admissionId) return;
    setMarkingReady(true);
    try {
      await ipdService.markDischargeReady(admissionId);
      toast.success('Patient marked as ready for discharge');
      load();
      onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to mark discharge ready');
    } finally {
      setMarkingReady(false);
    }
  };

  const openRoundDialog = () => {
    setRoundDiagnosis(admission?.diagnosis || '');
    setRoundNotes('');
    setVitals({ bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '',
                oxygenSaturation: '', weight: '', height: '', respiratoryRate: '' });
    setMedicines([emptyMed()]);
    setLabOrders([]);
    setSelectedDoctorId('');
    setRoundDialogOpen(true);
  };

  const handleSaveRound = async () => {
    if (!admissionId) return;
    if (!roundDiagnosis.trim() && !roundNotes.trim() && medicines.every(m => !m.medicineName.trim()) && labOrders.every(l => !l.testName.trim())) {
      toast.warning('Add at least a diagnosis, note, medicine, or lab test');
      return;
    }
    setSavingRound(true);
    try {
      const validMeds = medicines.filter(m => m.medicineName.trim());
      const validLabs = labOrders.filter(l => l.testName.trim());
      const hasVitals = Object.values(vitals).some(v => String(v).trim());
      const vitalPayload = hasVitals ? {
        bloodPressureSystolic:  vitals.bpSystolic  ? parseInt(vitals.bpSystolic)   : undefined,
        bloodPressureDiastolic: vitals.bpDiastolic ? parseInt(vitals.bpDiastolic)  : undefined,
        heartRate:              vitals.heartRate    ? parseInt(vitals.heartRate)    : undefined,
        temperature:            vitals.temperature  ? parseFloat(vitals.temperature): undefined,
        oxygenSaturation:       vitals.oxygenSaturation ? parseFloat(vitals.oxygenSaturation) : undefined,
        weight:                 vitals.weight       ? parseFloat(vitals.weight)     : undefined,
        height:                 vitals.height       ? parseFloat(vitals.height)     : undefined,
        respiratoryRate:        vitals.respiratoryRate  ? parseInt(vitals.respiratoryRate) : undefined,
      } : undefined;

      await ipdService.createAdmissionRound(admissionId, {
        doctorId:     isAdminRole ? (selectedDoctorId || undefined) : (authUser?.doctorId || undefined),
        diagnosis:    roundDiagnosis.trim() || undefined,
        notes:        roundNotes.trim() || undefined,
        vitalSigns:   vitalPayload,
        prescriptions: validMeds,
        labOrders:    validLabs,
      });
      toast.success('Daily round saved');
      setRoundDialogOpen(false);
      load();
      onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save round');
    } finally {
      setSavingRound(false);
    }
  };

  // Helpers
  const updateMed = (idx: number, field: keyof Medicine, val: string) =>
    setMedicines(ms => ms.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const updateLab = (idx: number, field: keyof LabOrder, val: string) =>
    setLabOrders(ls => ls.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const daysSinceAdmit = admission
    ? differenceInDays(new Date(), new Date(admission.admittedAt))
    : 0;
  const wardChargesAccrued = (daysSinceAdmit || 1) * (admission?.dailyCharges || 0);
  const balance = Math.max(0, wardChargesAccrued - (admission?.advancePaid || 0));

  if (!open) return null;

  return (
    <>
      {/* Main Detail Dialog */}
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocalHospital color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                IPD Admission — {admission?.admissionNumber ?? '...'}
              </Typography>
              {admission && (
                <Typography variant="caption" color="text.secondary">
                  {admission.patient.firstName} {admission.patient.lastName} · UHID: {admission.patient.uhid}
                  {admission.dischargeReadyAt && (
                    <Chip label="Discharge Ready" color="warning" size="small" sx={{ ml: 1 }} icon={<CheckCircle />} />
                  )}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {admission?.status === 'ADMITTED' && !admission.dischargeReadyAt && (
              <Tooltip title="Mark patient clinically ready for discharge (receptionist will collect payment)">
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={markingReady ? <CircularProgress size={14} /> : <CheckCircle />}
                  onClick={handleMarkDischargeReady}
                  disabled={markingReady}
                >
                  Mark Discharge Ready
                </Button>
              </Tooltip>
            )}
            {canDischarge && admission?.status === 'ADMITTED' && (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<ExitToApp />}
                onClick={() => admission && onDischarge(admission)}
              >
                Discharge
              </Button>
            )}
            <IconButton onClick={onClose}><Close /></IconButton>
          </Box>
        </DialogTitle>

        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !admission ? (
          <Alert severity="error" sx={{ m: 2 }}>Could not load admission details.</Alert>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Overview" />
              <Tab label={`Daily Rounds (${admission.rounds?.length ?? 0})`} />
              <Tab label="Payments" />
            </Tabs>

            <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* ── Tab 0: Overview ────────────────────────────────── */}
              {tab === 0 && (
                <Grid container spacing={2}>
                  {/* Patient card */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Person fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>Patient Information</Typography>
                      </Box>
                      <Grid container spacing={1}>
                        {[
                          ['Name', `${admission.patient.firstName} ${admission.patient.lastName}`],
                          ['UHID', admission.patient.uhid],
                          ['Mobile', admission.patient.mobile ?? '—'],
                          ['Gender', admission.patient.gender ?? '—'],
                          ['DOB', admission.patient.dob ? format(new Date(admission.patient.dob), 'dd MMM yyyy') : '—'],
                          ['Blood Group', admission.patient.bloodGroup ?? '—'],
                        ].map(([label, value]) => (
                          <Grid item xs={6} key={label}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="body2" fontWeight={500}>{value}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Admission card */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <BedOutlined fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>Admission Details</Typography>
                        <Chip label={admission.status} size="small"
                          color={admission.status === 'ADMITTED' ? 'info' : admission.status === 'DISCHARGED' ? 'success' : 'default'} />
                      </Box>
                      <Grid container spacing={1}>
                        {[
                          ['Admission No.', admission.admissionNumber],
                          ['Ward', admission.ward?.name ?? '—'],
                          ['Bed', admission.bed?.bedNumber ?? 'Not assigned'],
                          ['Admitted On', format(new Date(admission.admittedAt), 'dd MMM yyyy, hh:mm a')],
                          ['Days Admitted', `${daysSinceAdmit || 1} day(s)`],
                          ['Daily Rate', `₹${admission.dailyCharges?.toLocaleString()}`],
                        ].map(([label, value]) => (
                          <Grid item xs={6} key={label}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="body2" fontWeight={500}>{value}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Diagnosis + Reason */}
                  <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Assignment fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>Clinical Details</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">Admission Reason</Typography>
                      <Typography variant="body2" mb={1.5}>{admission.admissionReason || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">Current Diagnosis</Typography>
                      <Typography variant="body2" fontWeight={500} color="primary.main">
                        {admission.diagnosis || 'Not updated yet'}
                      </Typography>
                      {admission.notes && <>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Notes</Typography>
                        <Typography variant="body2">{admission.notes}</Typography>
                      </>}
                    </Paper>
                  </Grid>

                  {/* Billing summary */}
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#1565c0', 0.04) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <MonitorHeart fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>Billing Summary</Typography>
                      </Box>
                      {[
                        ['Ward Charges (accrued)', `₹${wardChargesAccrued.toLocaleString()}`],
                        ['Advance Paid', `₹${(admission.advancePaid || 0).toLocaleString()}`],
                        ['Balance Due', `₹${balance.toLocaleString()}`],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight={label === 'Balance Due' ? 700 : 400}
                            color={label === 'Balance Due' ? 'error.main' : 'inherit'}>
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>

                  {/* Discharge ready banner */}
                  {admission.dischargeReadyAt && (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<Warning />}
                        action={canDischarge && admission.status === 'ADMITTED' && (
                          <Button color="inherit" size="small" startIcon={<ExitToApp />}
                            onClick={() => onDischarge(admission)}>
                            Process Discharge
                          </Button>
                        )}
                      >
                        Doctor has marked this patient as <strong>ready for discharge</strong>.
                        {admission.dischargeReadyAt && (
                          <> Marked on {format(new Date(admission.dischargeReadyAt), 'dd MMM yyyy, hh:mm a')}.</>
                        )}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ── Tab 1: Daily Rounds ────────────────────────────── */}
              {tab === 1 && (
                <Box>
                  {admission.status === 'ADMITTED' && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" startIcon={<NoteAdd />} onClick={openRoundDialog}>
                        Add Daily Round
                      </Button>
                    </Box>
                  )}
                  {(!admission.rounds || admission.rounds.length === 0) ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <NoteAdd sx={{ fontSize: 48, opacity: 0.3 }} />
                      <Typography variant="body2" mt={1}>No rounds recorded yet.</Typography>
                      {admission.status === 'ADMITTED' && <Typography variant="caption">Click "Add Daily Round" to start documenting.</Typography>}
                    </Box>
                  ) : (
                    admission.rounds.map((round, idx) => (
                      <Accordion key={round.id} defaultExpanded={idx === admission.rounds.length - 1}
                        sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider' }} elevation={0}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'primary.main',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                              fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {idx + 1}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                Round {idx + 1} — {format(new Date(round.visitDate), 'dd MMM yyyy, hh:mm a')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Dr. {round.doctor?.firstName} {round.doctor?.lastName}
                                {round.diagnosis && ` · ${round.diagnosis}`}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {(round.prescriptions?.length ?? 0) > 0 && (
                                <Chip label={`${round.prescriptions!.length} Rx`} size="small" color="success" icon={<Medication />} />
                              )}
                              {(round.labOrders?.length ?? 0) > 0 && (
                                <Chip label={`${round.labOrders!.length} Labs`} size="small" color="info" icon={<Science />} />
                              )}
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Grid container spacing={2}>
                            {round.vitalSigns && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Vitals</Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                                  {Object.entries(round.vitalSigns).filter(([, v]) => v).map(([k, v]) => (
                                    <Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              </Grid>
                            )}
                            {round.diagnosis && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Diagnosis</Typography>
                                <Typography variant="body2">{round.diagnosis}</Typography>
                              </Grid>
                            )}
                            {round.notes && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Notes</Typography>
                                <Typography variant="body2">{round.notes}</Typography>
                              </Grid>
                            )}
                            {(round.prescriptions?.length ?? 0) > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                  Prescriptions
                                </Typography>
                                <Table size="small" sx={{ mt: 0.5 }}>
                                  <TableHead>
                                    <TableRow>
                                      {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                                      ))}
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {round.prescriptions!.map((p, pi) => (
                                      <TableRow key={pi}>
                                        <TableCell>{p.medicineName}</TableCell>
                                        <TableCell>{p.dosage}</TableCell>
                                        <TableCell>{p.frequency}</TableCell>
                                        <TableCell>{p.duration}</TableCell>
                                        <TableCell>{p.instructions || '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Grid>
                            )}
                            {(round.labOrders?.length ?? 0) > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                  Lab Orders
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                  {round.labOrders!.map((l, li) => (
                                    <Chip key={li} label={`${l.testName} (${l.priority})`}
                                      size="small" color={l.status === 'COMPLETED' ? 'success' : 'default'} />
                                  ))}
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                </Box>
              )}

              {/* ── Tab 2: Payments ────────────────────────────────── */}
              {tab === 2 && (
                <Box>
                  {(!admission.payments || admission.payments.length === 0) ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <Typography variant="body2">No payment records yet.</Typography>
                    </Box>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          {['Date', 'Amount', 'Method', 'Description'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {admission.payments!.map((p, pi) => (
                          <TableRow key={pi}>
                            <TableCell>{format(new Date(p.createdAt), 'dd MMM yyyy')}</TableCell>
                            <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                            <TableCell><Chip label={p.paymentMethod} size="small" /></TableCell>
                            <TableCell>{p.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ── Daily Round Dialog ──────────────────────────────────────── */}
      <Dialog open={roundDialogOpen} onClose={() => setRoundDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { height: '85vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NoteAdd color="primary" />
            <Typography fontWeight={700}>Add Daily Round</Typography>
          </Box>
          <IconButton onClick={() => setRoundDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ overflow: 'auto' }}>
          <Grid container spacing={2.5}>
            {/* Vitals */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MonitorHeart fontSize="small" color="primary" /> Vital Signs (optional)
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { key: 'bpSystolic',      label: 'BP Systolic',   placeholder: '120', unit: 'mmHg' },
                  { key: 'bpDiastolic',     label: 'BP Diastolic',  placeholder: '80',  unit: 'mmHg' },
                  { key: 'heartRate',       label: 'Pulse',         placeholder: '72',  unit: 'bpm' },
                  { key: 'temperature',     label: 'Temperature',   placeholder: '98.6',unit: '°F' },
                  { key: 'oxygenSaturation',label: 'SpO₂',          placeholder: '98',  unit: '%' },
                  { key: 'weight',          label: 'Weight',        placeholder: '70',  unit: 'kg' },
                  { key: 'height',          label: 'Height',        placeholder: '165', unit: 'cm' },
                  { key: 'respiratoryRate', label: 'Resp. Rate',    placeholder: '16',  unit: '/min' },
                ].map(f => (
                  <Grid item xs={6} sm={3} key={f.key}>
                    <TextField
                      fullWidth size="small" label={`${f.label} (${f.unit})`} placeholder={f.placeholder}
                      type="number"
                      value={(vitals as any)[f.key]}
                      onChange={e => setVitals(v => ({ ...v, [f.key]: e.target.value }))}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Doctor picker — only for Admin/SuperAdmin */}
            {isAdminRole && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Attending Doctor *</InputLabel>
                  <Select label="Attending Doctor *" value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}>
                    {doctors.map(d => (
                      <MenuItem key={d.id} value={d.id}>
                        Dr. {d.firstName} {d.lastName} — {d.specialization}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Diagnosis + Notes */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Diagnosis / Assessment" multiline rows={3}
                value={roundDiagnosis} onChange={e => setRoundDiagnosis(e.target.value)}
                placeholder="Updated diagnosis for this round…"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Clinical Notes" multiline rows={3}
                value={roundNotes} onChange={e => setRoundNotes(e.target.value)}
                placeholder="Observations, response to treatment, plan…"
              />
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Prescriptions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Medication fontSize="small" color="success" /> Prescriptions
                </Typography>
                <Button size="small" variant="outlined" startIcon={<Add />}
                  onClick={() => setMedicines(ms => [...ms, emptyMed()])}>
                  Add Medicine
                </Button>
              </Box>
              {medicines.map((med, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth size="small" label="Medicine Name" value={med.medicineName}
                        onChange={e => updateMed(idx, 'medicineName', e.target.value)} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField fullWidth size="small" label="Dosage" value={med.dosage}
                        onChange={e => updateMed(idx, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Frequency</InputLabel>
                        <Select label="Frequency" value={med.frequency}
                          onChange={e => updateMed(idx, 'frequency', e.target.value)}>
                          {FREQ_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Duration</InputLabel>
                        <Select label="Duration" value={med.duration}
                          onChange={e => updateMed(idx, 'duration', e.target.value)}>
                          {DUR_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField fullWidth size="small" label="Instructions" value={med.instructions}
                        onChange={e => updateMed(idx, 'instructions', e.target.value)} placeholder="After meals…" />
                    </Grid>
                    <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
                      {medicines.length > 1 && (
                        <IconButton size="small" color="error"
                          onClick={() => setMedicines(ms => ms.filter((_, i) => i !== idx))}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Lab Orders */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Science fontSize="small" color="info" /> Lab Orders
                </Typography>
                <Button size="small" variant="outlined" color="info" startIcon={<Add />}
                  onClick={() => setLabOrders(ls => [...ls, emptyLab()])}>
                  Add Lab Test
                </Button>
              </Box>
              {labOrders.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No lab tests ordered.</Typography>
              ) : (
                labOrders.map((lab, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Test Name" value={lab.testName}
                          onChange={e => updateLab(idx, 'testName', e.target.value)} />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Type</InputLabel>
                          <Select label="Type" value={lab.testType || 'BLOOD'}
                            onChange={e => updateLab(idx, 'testType', e.target.value)}>
                            {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Priority</InputLabel>
                          <Select label="Priority" value={lab.priority || 'ROUTINE'}
                            onChange={e => updateLab(idx, 'priority', e.target.value)}>
                            {['ROUTINE', 'URGENT', 'STAT'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={10} sm={3}>
                        <TextField fullWidth size="small" label="Instructions" value={lab.instructions}
                          onChange={e => updateLab(idx, 'instructions', e.target.value)} />
                      </Grid>
                      <Grid item xs={2} sm={1} sx={{ textAlign: 'center' }}>
                        <IconButton size="small" color="error"
                          onClick={() => setLabOrders(ls => ls.filter((_, i) => i !== idx))}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRoundDialogOpen(false)} disabled={savingRound}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRound} disabled={savingRound}
            startIcon={savingRound ? <CircularProgress size={16} /> : <CheckCircle />}>
            {savingRound ? 'Saving…' : 'Save Round'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
