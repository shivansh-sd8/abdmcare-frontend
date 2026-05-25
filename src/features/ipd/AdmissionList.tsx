import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Chip, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Select, MenuItem, InputLabel, FormControl, Alert, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Add, Refresh, Print, LocalHospital, Bed as BedIcon,
  CheckCircle, ExitToApp, CurrencyRupee, AccountBalance,
  PhoneAndroid, Money, Visibility, VerifiedUser,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, differenceInDays } from 'date-fns';
import { useLocation } from 'react-router-dom';
import ipdService from '../../services/ipdService';
import { generateIPDBill } from '../../utils/ipdBillGenerator';
import { useSelector } from 'react-redux';
import IPDAdmissionDetail from './IPDAdmissionDetail';

const STATUS_COLOR: Record<string, 'default'|'success'|'error'|'warning'|'info'> = {
  ADMITTED:         'success',
  DISCHARGE_READY:  'warning',
  DISCHARGED:       'default',
  TRANSFERRED:      'info',
  ABSCONDED:        'error',
};

const STATUS_LABEL: Record<string, string> = {
  ADMITTED:        'In Treatment',
  DISCHARGE_READY: 'Discharge Ready',
  DISCHARGED:      'Discharged',
  TRANSFERRED:     'Transferred',
  ABSCONDED:       'Absconded',
};

const DISCHARGE_ROLES = ['RECEPTIONIST', 'ADMIN', 'BILLING', 'SUPERADMIN', 'SUPER_ADMIN'];

const PAY_STATUS_COLOR: Record<string, 'default'|'success'|'warning'|'error'> = {
  PAID:    'success',
  PARTIAL: 'warning',
  PENDING: 'default',
};

interface Ward {
  id: string;
  name: string;
  dailyCharges: number;
  beds: Array<{ id: string; bedNumber: string; status: string }>;
}

interface Admission {
  id: string;
  admissionNumber: string;
  status: string;
  paymentStatus?: string;
  admittedAt: string;
  dischargedAt?: string;
  dischargeReadyAt?: string;
  admissionReason?: string;
  diagnosis?: string;
  dailyCharges: number;
  advancePaid: number;
  totalAmount: number;
  paymentCollected?: number;
  transactionRef?: string;
  paymentMethod?: string;
  notes?: string;
  patient: { id: string; firstName: string; lastName: string; uhid: string; mobile?: string; gender?: string; dob?: string };
  ward: { id: string; name: string; type: string; dailyCharges: number };
  bed?: { id: string; bedNumber: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────

const AdmissionList: React.FC = () => {
  const authUser = useSelector((state: any) => state.auth?.user);
  const location = useLocation();

  const [admissions, setAdmissions]       = useState<Admission[]>([]);
  const [wards, setWards]                 = useState<Ward[]>([]);
  const [loading, setLoading]             = useState(true);
  const [statusFilter, setStatusFilter]   = useState('ADMITTED');
  const [showAdmitDialog, setShowAdmitDialog]         = useState(false);
  const [showDischargeDialog, setShowDischargeDialog] = useState<Admission | null>(null);
  const [saving, setSaving] = useState(false);
  const [billPreview, setBillPreview] = useState<any>(null);
  const [detailAdmissionId, setDetailAdmissionId]     = useState<string | null>(null);

  const [admitForm, setAdmitForm] = useState({
    patientId: '', patientSearch: '', wardId: '', bedId: '',
    admissionReason: '', diagnosis: '', dailyCharges: 0, advancePaid: 0,
    advancePaymentMethod: 'CASH', advanceTransactionRef: '', notes: '',
    encounterId: '',
  });

  const [dischargeForm, setDischargeForm] = useState({
    notes: '', totalAmount: 0, paymentCollected: 0,
    paymentMethod: 'CASH', transactionRef: '',
  });

  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);

  // ── Auto-open admit dialog from URL params (doctor/receptionist deep-link) ──
  useEffect(() => {
    const params     = new URLSearchParams(location.search);
    const autoAdmit  = params.get('admit') === '1';
    const patientId  = params.get('patientId')   || '';
    const encounterI = params.get('encounterId') || '';
    const patientName= params.get('patientName') || '';
    const diagnosis  = params.get('diagnosis')   || '';
    const reason     = params.get('reason')      || '';

    if (autoAdmit && patientId) {
      setAdmitForm((f) => ({
        ...f,
        patientId,
        encounterId:     encounterI,
        patientSearch:   patientName,
        diagnosis,
        admissionReason: reason,
      }));
      setTimeout(() => setShowAdmitDialog(true), 400);
    }
  }, [location.search]);

  const loadAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ipdService.listAdmissions({ status: statusFilter || undefined }) as any;
      setAdmissions(res.data?.data?.admissions || res.data?.admissions || []);
    } catch {
      toast.error('Failed to load admissions');
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadWards(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadAdmissions(); }, [loadAdmissions]);

  const loadWards = async () => {
    try {
      const res = await ipdService.listWards() as any;
      setWards(res.data?.data || res.data || []);
    } catch { /* silent */ }
  };

  // When a ward is selected auto-populate its daily charge
  const handleWardChange = (wardId: string) => {
    const ward = wards.find((w) => w.id === wardId);
    setAdmitForm((f) => ({
      ...f,
      wardId,
      bedId:        '',
      dailyCharges: ward?.dailyCharges ?? 0,
    }));
  };

  const searchPatients = async (q: string) => {
    if (!q || q.length < 2) { setPatientSuggestions([]); return; }
    try {
      const { default: patientService } = await import('../../services/patientService');
      const res = await patientService.searchPatients({ search: q }) as any;
      const list = res.data?.patients || res.data?.data || res.data || [];
      setPatientSuggestions(list.slice(0, 8));
    } catch { /* silent */ }
  };

  const handleAdmit = async () => {
    if (!admitForm.patientId || !admitForm.wardId) {
      toast.error('Patient and Ward are required'); return;
    }
    try {
      setSaving(true);
      await ipdService.admitPatient({
        patientId:       admitForm.patientId,
        wardId:          admitForm.wardId,
        bedId:           admitForm.bedId || undefined,
        admissionReason: admitForm.admissionReason,
        diagnosis:       admitForm.diagnosis,
        dailyCharges:    admitForm.dailyCharges,
        advancePaid:     admitForm.advancePaid,
        advanceMethod:   admitForm.advancePaymentMethod || undefined,
        advanceTransactionRef: admitForm.advanceTransactionRef || undefined,
        notes:           admitForm.notes,
        encounterId:     admitForm.encounterId || undefined,
      });
      toast.success('Patient admitted successfully');
      setShowAdmitDialog(false);
      setAdmitForm({
        patientId: '', patientSearch: '', wardId: '', bedId: '',
        admissionReason: '', diagnosis: '', dailyCharges: 0, advancePaid: 0,
        advancePaymentMethod: 'CASH', advanceTransactionRef: '', notes: '', encounterId: '',
      });
      loadAdmissions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to admit patient');
    } finally { setSaving(false); }
  };

  const openDischargeDialog = async (adm: Admission) => {
    if (adm.status === 'ADMITTED') {
      toast.error('Doctor must mark patient as discharge-ready first');
      return;
    }
    // Fetch itemized bill from backend
    let bill: any = null;
    try {
      const res = await ipdService.getAdmissionBill(adm.id) as any;
      bill = res?.data;
    } catch {}
    const total   = bill?.total ?? (Math.max(1, differenceInDays(new Date(), new Date(adm.admittedAt))) * adm.dailyCharges);
    const balance = Math.max(0, total - adm.advancePaid);
    setBillPreview(bill);
    setDischargeForm({ notes: '', totalAmount: total, paymentCollected: balance, paymentMethod: 'CASH', transactionRef: '' });
    setShowDischargeDialog(adm);
  };

  const handleDischarge = async () => {
    if (!showDischargeDialog) return;
    try {
      setSaving(true);
      await ipdService.dischargePatient(showDischargeDialog.id, {
        notes:            dischargeForm.notes,
        totalAmount:      dischargeForm.totalAmount,
        paymentCollected: dischargeForm.paymentCollected,
        paymentMethod:    dischargeForm.paymentMethod,
        transactionRef:   dischargeForm.transactionRef || undefined,
      });
      toast.success('Patient discharged and payment recorded');
      setShowDischargeDialog(null);
      loadAdmissions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to discharge');
    } finally { setSaving(false); }
  };

  const handlePrintBill = (adm: Admission) => {
    const admittedAt    = new Date(adm.admittedAt);
    const dischargedAt  = adm.dischargedAt ? new Date(adm.dischargedAt) : new Date();
    const days          = Math.max(1, differenceInDays(dischargedAt, admittedAt));
    generateIPDBill({
      hospital: { name: authUser?.hospitalName || 'MediSync Hospital' },
      patient: {
        name:   `${adm.patient.firstName} ${adm.patient.lastName}`,
        uhid:    adm.patient.uhid,
        mobile:  adm.patient.mobile,
        gender:  adm.patient.gender,
        age:     adm.patient.dob
          ? `${new Date().getFullYear() - new Date(adm.patient.dob).getFullYear()} yrs`
          : undefined,
      },
      admission: {
        admissionNumber: adm.admissionNumber,
        admittedAt:      adm.admittedAt,
        dischargedAt:    adm.dischargedAt,
        wardName:        adm.ward.name,
        bedNumber:       adm.bed?.bedNumber,
        diagnosis:       adm.diagnosis,
        admissionReason: adm.admissionReason,
        dailyCharges:    adm.dailyCharges,
        days,
        advancePaid:     adm.advancePaid,
        totalAmount:     adm.totalAmount || days * adm.dailyCharges,
        notes:           adm.notes,
      },
    });
  };

  const userRole = (authUser?.role || JSON.parse(localStorage.getItem('user') || '{}').role || '').toUpperCase();
  const isDoctor = userRole === 'DOCTOR';
  const canDischarge = DISCHARGE_ROLES.includes(userRole);

  const handleMarkDischargeReady = async (admissionId: string) => {
    try {
      setSaving(true);
      await ipdService.markDischargeReady(admissionId);
      toast.success('Patient marked as discharge-ready');
      loadAdmissions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to mark discharge ready');
    } finally { setSaving(false); }
  };

  const selectedWardBeds = wards
    .find((w) => w.id === admitForm.wardId)
    ?.beds.filter((b) => b.status === 'AVAILABLE') || [];

  // ── Discharge summary calculations ───────────────────────────────────────
  const dischargedAdm = showDischargeDialog;
  const dischDays     = dischargedAdm
    ? Math.max(1, differenceInDays(new Date(), new Date(dischargedAdm.admittedAt)))
    : 0;
  const wardChargesAmt = dischargedAdm ? dischDays * dischargedAdm.dailyCharges : 0;
  const balance        = dischargedAdm
    ? Math.max(0, dischargeForm.totalAmount - dischargedAdm.advancePaid - dischargeForm.paymentCollected)
    : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">IPD / Admissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage inpatient admissions, discharges and billing
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadAdmissions}><Refresh /></IconButton>
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowAdmitDialog(true)}>
            Admit Patient
          </Button>
        </Box>
      </Box>

      {/* Status filter tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)} variant="scrollable">
          {['', 'ADMITTED', 'DISCHARGE_READY', 'DISCHARGED', 'TRANSFERRED'].map((s) => (
            <Tab key={s} label={STATUS_LABEL[s] || 'All'} value={s} />
          ))}
        </Tabs>
      </Paper>

      {/* Admissions table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : admissions.length === 0 ? (
        <Alert severity="info">No admissions found for the selected filter.</Alert>
      ) : (
        <Paper sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#1a3c6e', 0.06) }}>
                {['Admission #', 'Patient', 'Ward / Bed', 'Admitted', 'Days', 'Charges', 'Payment', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, py: 1.5 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {admissions.map((adm) => {
                const days = Math.max(1, differenceInDays(
                  adm.dischargedAt ? new Date(adm.dischargedAt) : new Date(),
                  new Date(adm.admittedAt),
                ));
                const total   = adm.totalAmount || days * adm.dailyCharges;
                const balance = Math.max(0, total - adm.advancePaid - (adm.paymentCollected || 0));
                return (
                  <TableRow key={adm.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>
                      {adm.admissionNumber}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {adm.patient.firstName} {adm.patient.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{adm.patient.uhid}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{adm.ward.name}</Typography>
                      {adm.bed && <Typography variant="caption" color="text.secondary">Bed {adm.bed.bedNumber}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{format(new Date(adm.admittedAt), 'dd MMM yy')}</Typography>
                      <Typography variant="caption" color="text.secondary">{format(new Date(adm.admittedAt), 'hh:mm a')}</Typography>
                    </TableCell>
                    <TableCell>{days}d</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>₹{total.toLocaleString('en-IN')}</Typography>
                      {adm.advancePaid > 0 && (
                        <Typography variant="caption" color="success.main">Adv: ₹{adm.advancePaid.toLocaleString('en-IN')}</Typography>
                      )}
                      {balance > 0 && (
                        <Typography variant="caption" color="error.main" display="block">
                          Due: ₹{balance.toLocaleString('en-IN')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={adm.paymentStatus || 'PENDING'}
                        color={PAY_STATUS_COLOR[adm.paymentStatus || 'PENDING']}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABEL[adm.status] || adm.status} color={STATUS_COLOR[adm.status] || 'default'} size="small" />
                      {adm.dischargeReadyAt && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Ready since {format(new Date(adm.dischargeReadyAt), 'dd MMM yyyy')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details / Add Daily Round">
                          <IconButton size="small" color="info" onClick={() => setDetailAdmissionId(adm.id)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {adm.status === 'ADMITTED' && isDoctor && (
                          <Tooltip title="Mark Discharge Ready">
                            <IconButton size="small" sx={{ color: 'warning.main' }} onClick={() => handleMarkDischargeReady(adm.id)}>
                              <VerifiedUser fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {adm.status === 'DISCHARGE_READY' && canDischarge && (
                          <Tooltip title="Discharge & Collect Payment">
                            <IconButton size="small" color="warning" onClick={() => openDischargeDialog(adm)}>
                              <ExitToApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Print IPD Bill">
                          <IconButton size="small" color="primary" onClick={() => handlePrintBill(adm)}>
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ── Admit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showAdmitDialog} onClose={() => setShowAdmitDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalHospital color="primary" />
            <Box>
              <Typography variant="h6">Admit Patient to IPD</Typography>
              <Typography variant="caption" color="text.secondary">
                Daily charges are pre-filled from the selected ward's standard rate
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Patient search */}
            <Grid item xs={12}>
              <TextField fullWidth label="Search Patient (Name / UHID / Mobile)" value={admitForm.patientSearch}
                onChange={(e) => {
                  setAdmitForm({ ...admitForm, patientSearch: e.target.value, patientId: '' });
                  searchPatients(e.target.value);
                }} />
              {patientSuggestions.length > 0 && (
                <Paper sx={{ mt: 0.5, maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                  {patientSuggestions.map((p) => (
                    <Box key={p.id} sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        setAdmitForm({ ...admitForm, patientId: p.id, patientSearch: `${p.firstName} ${p.lastName} (${p.uhid})` });
                        setPatientSuggestions([]);
                      }}>
                      <Typography variant="body2" fontWeight={600}>{p.firstName} {p.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.uhid} · {p.mobile}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
              {admitForm.patientId && (
                <Chip label="Patient selected ✓" color="success" size="small" sx={{ mt: 0.5 }} />
              )}
            </Grid>

            {/* Ward & Bed */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Ward</InputLabel>
                <Select value={admitForm.wardId} label="Ward" onChange={(e) => handleWardChange(e.target.value)}>
                  {wards.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                      {w.dailyCharges > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ₹{w.dailyCharges}/day
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!admitForm.wardId || selectedWardBeds.length === 0}>
                <InputLabel>Bed (Optional)</InputLabel>
                <Select value={admitForm.bedId} label="Bed (Optional)"
                  onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}>
                  <MenuItem value="">No specific bed</MenuItem>
                  {selectedWardBeds.map((b) => <MenuItem key={b.id} value={b.id}>Bed {b.bedNumber}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Reason & Diagnosis */}
            <Grid item xs={12}>
              <TextField fullWidth label="Admission Reason" value={admitForm.admissionReason}
                onChange={(e) => setAdmitForm({ ...admitForm, admissionReason: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Diagnosis (if known)" value={admitForm.diagnosis}
                onChange={(e) => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} />
            </Grid>

            {/* Charges */}
            <Grid item xs={12}>
              <Divider><Typography variant="caption" color="text.secondary">Billing</Typography></Divider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Daily Charges (₹/day)" value={admitForm.dailyCharges}
                helperText="Auto-filled from ward rate. Override if needed."
                onChange={(e) => setAdmitForm({ ...admitForm, dailyCharges: parseFloat(e.target.value) || 0 })}
                InputProps={{ startAdornment: <CurrencyRupee sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Advance Payment (₹)" value={admitForm.advancePaid}
                onChange={(e) => setAdmitForm({ ...admitForm, advancePaid: parseFloat(e.target.value) || 0 })}
                InputProps={{ startAdornment: <CurrencyRupee sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }} />
            </Grid>

            {/* Advance payment method (shown only if advance > 0) */}
            {admitForm.advancePaid > 0 && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Advance Payment Mode</InputLabel>
                    <Select value={admitForm.advancePaymentMethod} label="Advance Payment Mode"
                      onChange={(e) => setAdmitForm({ ...admitForm, advancePaymentMethod: e.target.value })}>
                      <MenuItem value="CASH">💵 Cash</MenuItem>
                      <MenuItem value="UPI">📱 UPI</MenuItem>
                      <MenuItem value="CARD">💳 Card</MenuItem>
                      <MenuItem value="BANK_TRANSFER">🏦 Bank Transfer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {admitForm.advancePaymentMethod !== 'CASH' && (
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Transaction ID / Reference" value={admitForm.advanceTransactionRef}
                      onChange={(e) => setAdmitForm({ ...admitForm, advanceTransactionRef: e.target.value })}
                      placeholder="UPI ref / card auth / NEFT ref" />
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Notes" value={admitForm.notes}
                onChange={(e) => setAdmitForm({ ...admitForm, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAdmitDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdmit}
            disabled={saving || !admitForm.patientId || !admitForm.wardId}
            startIcon={<BedIcon />}>
            {saving ? 'Admitting…' : 'Confirm Admission'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Discharge & Payment Dialog ────────────────────────────────────── */}
      <Dialog open={!!showDischargeDialog} onClose={() => setShowDischargeDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExitToApp color="warning" />
            <Box>
              <Typography variant="h6">Discharge Patient</Typography>
              <Typography variant="caption" color="text.secondary">
                Collect payment and release bed
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {dischargedAdm && (
            <Box sx={{ mt: 1 }}>
              {/* Patient summary */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>{dischargedAdm.patient.firstName} {dischargedAdm.patient.lastName}</strong>
                  &nbsp;·&nbsp;{dischargedAdm.ward.name}
                  {dischargedAdm.bed && `, Bed ${dischargedAdm.bed.bedNumber}`}
                  &nbsp;·&nbsp;Admitted {format(new Date(dischargedAdm.admittedAt), 'dd MMM yyyy')}
                </Typography>
              </Alert>

              {/* Bill summary box — itemized */}
              <Paper variant="outlined" sx={{ p: 0, mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight="bold">Itemized Bill</Typography>
                </Box>

                {/* Ward */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Grid container alignItems="center">
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>Ward / Bed Charges</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {billPreview?.days ?? dischDays} day(s) × ₹{dischargedAdm.dailyCharges}/day · {dischargedAdm.ward?.name}
                        {dischargedAdm.bed?.bedNumber && ` · Bed ${dischargedAdm.bed.bedNumber}`}
                      </Typography>
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700}>
                        ₹{(billPreview?.wardCharges ?? wardChargesAmt).toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* OPD Consultation Fee */}
                {(billPreview?.consultationFee ?? 0) > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1 }}>
                      <Grid container alignItems="center">
                        <Grid item xs={7}>
                          <Typography variant="body2" fontWeight={600}>Doctor Consultation Fee</Typography>
                          {billPreview?.opdDoctor && (
                            <Typography variant="caption" color="text.secondary">{billPreview.opdDoctor}</Typography>
                          )}
                        </Grid>
                        <Grid item xs={5} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={700}>
                            ₹{Number(billPreview.consultationFee).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    <Divider />
                  </>
                )}

                {/* Lab tests */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Grid container alignItems="center" sx={{ mb: 0.5 }}>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>Lab / Investigations</Typography>
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700}
                        color={(billPreview?.labCharges ?? 0) > 0 ? 'inherit' : 'text.secondary'}>
                        {(billPreview?.labCharges ?? 0) > 0
                          ? `₹${(billPreview.labCharges).toLocaleString('en-IN')}`
                          : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                  {/* Investigation rows */}
                  {[
                    ...(billPreview?.labItems ?? []),
                    ...(billPreview?.extraLabOrders ?? []).map((o: any) => ({ ...o, amount: null })),
                  ].map((item: any, idx: number) => (
                    <Grid container key={idx} sx={{ pl: 1.5, py: 0.25 }}>
                      <Grid item xs={7}>
                        <Typography variant="caption" color="text.secondary">
                          ↳ {item.testName} {item.status === 'COMPLETED' ? '✓' : `(${item.status?.toLowerCase?.() ?? 'pending'})`}
                        </Typography>
                      </Grid>
                      <Grid item xs={5} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption"
                          color={Number(item.amount) > 0 ? 'inherit' : 'warning.main'}>
                          {Number(item.amount) > 0
                            ? `₹${Number(item.amount).toLocaleString('en-IN')}`
                            : 'charge pending'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ))}
                  {(billPreview?.labItems?.length ?? 0) === 0 && (billPreview?.extraLabOrders?.length ?? 0) === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ pl: 1.5 }}>No lab tests ordered</Typography>
                  )}
                </Box>

                <Divider />

                {/* Medicines */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Grid container alignItems="center" sx={{ mb: 0.5 }}>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>Medicines / Pharmacy</Typography>
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700}
                        color={(billPreview?.medicineCharges ?? 0) > 0 ? 'inherit' : 'text.secondary'}>
                        {(billPreview?.medicineCharges ?? 0) > 0
                          ? `₹${(billPreview.medicineCharges).toLocaleString('en-IN')}`
                          : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                  {/* New-style prescriptions */}
                  {(billPreview?.rxItems ?? []).map((rx: any, idx: number) => (
                    (rx.medications as any[] ?? []).map((m: any, mi: number) => (
                      <Grid container key={`${idx}-${mi}`} sx={{ pl: 1.5, py: 0.25 }}>
                        <Grid item xs={7}>
                          <Typography variant="caption" color="text.secondary">
                            ↳ {m.name || m.medicineName} {m.dosage && `· ${m.dosage}`}
                            {rx.status === 'DISPENSED' ? ' ✓' : ' (pending dispense)'}
                          </Typography>
                        </Grid>
                        <Grid item xs={5} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption"
                            color={m.price ? 'inherit' : 'warning.main'}>
                            {m.price
                              ? `₹${(Number(m.price) * (m.quantity ?? 1)).toLocaleString('en-IN')}`
                              : 'charge pending'}
                          </Typography>
                        </Grid>
                      </Grid>
                    ))
                  ))}
                  {/* Old-style EncounterPrescription medicines */}
                  {(billPreview?.encPrescriptions ?? []).map((ep: any, idx: number) => (
                    <Grid container key={`ep-${idx}`} sx={{ pl: 1.5, py: 0.25 }}>
                      <Grid item xs={7}>
                        <Typography variant="caption" color="text.secondary">
                          ↳ {ep.medicineName} {ep.dosage && `· ${ep.dosage}`} (pending dispense)
                        </Typography>
                      </Grid>
                      <Grid item xs={5} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color={ep.price ? 'inherit' : 'warning.main'}>
                          {ep.price
                            ? `₹${(Number(ep.price) * (ep.quantity ?? 1)).toLocaleString('en-IN')}`
                            : 'charge pending'}
                        </Typography>
                      </Grid>
                    </Grid>
                  ))}
                  {(billPreview?.rxItems?.length ?? 0) === 0 && (billPreview?.encPrescriptions?.length ?? 0) === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ pl: 1.5 }}>No medicines prescribed</Typography>
                  )}
                </Box>

                <Divider />

                {/* Totals */}
                <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                  <Grid container>
                    <Grid item xs={7}><Typography variant="body1" fontWeight="bold">Total</Typography></Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body1" fontWeight="bold" color="primary.main">
                        ₹{dischargeForm.totalAmount.toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={7}><Typography variant="body2" color="success.main">Advance Paid</Typography></Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="success.main">− ₹{dischargedAdm.advancePaid.toLocaleString('en-IN')}</Typography>
                    </Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={700} color="error.main">Balance to Collect</Typography></Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700} color="error.main">
                        ₹{Math.max(0, dischargeForm.totalAmount - dischargedAdm.advancePaid).toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              <Grid container spacing={2}>
                {/* Editable total (allow adjustment for extra charges) */}
                <Grid item xs={12}>
                  <TextField fullWidth type="number" label="Final Total Amount (₹)"
                    value={dischargeForm.totalAmount}
                    helperText="Adjust if extra charges apply (auto-computed from lab + medicines + ward)"
                    onChange={(e) => {
                      const t = parseFloat(e.target.value) || 0;
                      setDischargeForm((f) => ({
                        ...f,
                        totalAmount:      t,
                        paymentCollected: Math.max(0, t - dischargedAdm.advancePaid),
                      }));
                    }}
                    InputProps={{ startAdornment: <CurrencyRupee sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }} />
                </Grid>

                {/* Amount being collected now */}
                <Grid item xs={12}>
                  <TextField fullWidth type="number" label="Amount Collected Now (₹)"
                    value={dischargeForm.paymentCollected}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, paymentCollected: parseFloat(e.target.value) || 0 })}
                    InputProps={{ startAdornment: <CurrencyRupee sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }} />
                </Grid>

                {/* Payment mode */}
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Payment Mode</Typography>
                  <ToggleButtonGroup
                    value={dischargeForm.paymentMethod} exclusive size="small"
                    onChange={(_, v) => v && setDischargeForm({ ...dischargeForm, paymentMethod: v, transactionRef: '' })}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <ToggleButton value="CASH" sx={{ gap: 0.5 }}>
                      <Money fontSize="small" /> Cash
                    </ToggleButton>
                    <ToggleButton value="UPI" sx={{ gap: 0.5 }}>
                      <PhoneAndroid fontSize="small" /> UPI
                    </ToggleButton>
                    <ToggleButton value="CARD" sx={{ gap: 0.5 }}>
                      <CurrencyRupee fontSize="small" /> Card
                    </ToggleButton>
                    <ToggleButton value="BANK_TRANSFER" sx={{ gap: 0.5 }}>
                      <AccountBalance fontSize="small" /> Bank Transfer
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                {/* Transaction ref — shown for non-cash */}
                {dischargeForm.paymentMethod !== 'CASH' && (
                  <Grid item xs={12}>
                    <TextField fullWidth label={
                        dischargeForm.paymentMethod === 'UPI' ? 'UPI Transaction ID'
                      : dischargeForm.paymentMethod === 'CARD' ? 'Card Auth / Reference No.'
                      : 'Bank Ref / NEFT / IMPS ID'
                    }
                      value={dischargeForm.transactionRef}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, transactionRef: e.target.value })}
                      placeholder={
                        dischargeForm.paymentMethod === 'UPI' ? 'e.g. 4236XXXXXXXXXX'
                        : 'Reference number'
                      } />
                  </Grid>
                )}

                {/* Remaining balance display */}
                {balance > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      Outstanding balance after this collection: <strong>₹{balance.toLocaleString('en-IN')}</strong>
                    </Alert>
                  </Grid>
                )}
                {balance <= 0 && dischargeForm.paymentCollected > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="success" icon={<CheckCircle />}>
                      Payment fully settled ✓
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={2} label="Discharge Notes / Summary"
                    value={dischargeForm.notes}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, notes: e.target.value })} />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowDischargeDialog(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleDischarge} disabled={saving}
            startIcon={<ExitToApp />}>
            {saving ? 'Processing…' : 'Confirm Discharge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── IPD Admission Detail (rounds, vitals, daily notes) ─────────────── */}
      <IPDAdmissionDetail
        open={!!detailAdmissionId}
        admissionId={detailAdmissionId}
        onClose={() => setDetailAdmissionId(null)}
        onDischarge={(adm: any) => {
          setDetailAdmissionId(null);
          openDischargeDialog(adm);
        }}
        onUpdated={loadAdmissions}
      />
    </Box>
  );
};

export default AdmissionList;
