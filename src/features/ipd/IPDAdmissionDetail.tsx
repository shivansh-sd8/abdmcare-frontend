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
  Warning, NoteAdd, Download as DownloadIcon,
  Print, Receipt, Payment,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, differenceInDays } from 'date-fns';
import { useSelector } from 'react-redux';
import ipdService from '../../services/ipdService';
import documentService from '../../services/documentService';

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
  newPrescriptions?: Array<{ id: string; medications: any[]; status?: string; doctor?: any }>;
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
  patientId?: string;
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

interface BillData {
  wardCharges: number;
  labCharges: number;
  pharmacyCharges?: number;
  medicineCharges?: number;
  consultationFee: number;
  discount: number;
  discountReason?: string;
  total: number;
  totalAfterDiscount: number;
  totalAmount?: number;
  advancePaid: number;
  paymentsCollected?: number;
  balance: number;
  balanceDue?: number;
  days?: number;
  wardDays?: number;
  dailyRate?: number;
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
const QUICK_TEST_TYPES = ['LAB', 'RADIOLOGY', 'PATHOLOGY'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'NEFT', 'CHEQUE', 'OTHER'];

function emptyMed(): Medicine {
  return { medicineName: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' };
}
function emptyLab(): LabOrder {
  return { testName: '', testType: 'LAB', priority: 'ROUTINE', instructions: '' };
}

function statusChipProps(status: string) {
  switch (status) {
    case 'ADMITTED':
      return { label: 'In Treatment', color: 'success' as const };
    case 'DISCHARGE_READY':
      return { label: 'Discharge Ready - Awaiting Payment', color: 'warning' as const };
    case 'DISCHARGED':
      return { label: 'Discharged', color: 'default' as const };
    default:
      return { label: status, color: 'default' as const };
  }
}

export default function IPDAdmissionDetail({ open, admissionId, onClose, onDischarge, onUpdated }: Props) {
  const authUser = useSelector((state: any) => state.auth?.user);
  const role     = authUser?.role;
  const isDoctor     = role === 'DOCTOR';
  const isBillingRole = role === 'RECEPTIONIST' || role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isAdminRole  = role === 'SUPER_ADMIN' || role === 'ADMIN';

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

  // Running bill
  const [billData, setBillData]     = useState<BillData | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  // Quick Prescription dialog
  const [rxDialogOpen, setRxDialogOpen] = useState(false);
  const [quickMeds, setQuickMeds]       = useState<Medicine[]>([emptyMed()]);
  const [savingRx, setSavingRx]         = useState(false);

  // Quick Lab Order dialog
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [quickLabs, setQuickLabs]         = useState<LabOrder[]>([emptyLab()]);
  const [savingLabs, setSavingLabs]       = useState(false);

  // Quick Vitals dialog
  const [vitalsDialogOpen, setVitalsDialogOpen] = useState(false);
  const [quickVitals, setQuickVitals] = useState({
    bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '',
    oxygenSaturation: '', weight: '', height: '', respiratoryRate: '',
  });
  const [savingVitals, setSavingVitals] = useState(false);

  // Collect Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount]   = useState('');
  const [paymentMethod, setPaymentMethod]   = useState('CASH');
  const [paymentRef, setPaymentRef]         = useState('');
  const [collectingPayment, setCollectingPayment] = useState(false);

  /* ── Data loading ──────────────────────────────────────────────────────── */

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

  const loadBill = useCallback(async () => {
    if (!admissionId) return;
    setBillLoading(true);
    try {
      const res = await ipdService.getAdmissionBill(admissionId) as any;
      setBillData(res.data?.data ?? res.data);
    } catch {
      setBillData(null);
    } finally {
      setBillLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    if (open && admissionId) { load(); loadBill(); setTab(0); }
  }, [open, admissionId, load, loadBill]);

  useEffect(() => {
    if (!isAdminRole || !open) return;
    import('../../services/doctorService').then(m =>
      m.default.searchDoctors({ limit: 50 }).then((res: any) => {
        const list = res.data?.doctors || res.data?.data || res.data || [];
        setDoctors(list.slice(0, 50));
      }).catch(() => {})
    );
  }, [isAdminRole, open]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const resolveDoctorId = () =>
    isAdminRole ? (selectedDoctorId || undefined) : (authUser?.doctorId || undefined);

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
        doctorId:     resolveDoctorId(),
        diagnosis:    roundDiagnosis.trim() || undefined,
        notes:        roundNotes.trim() || undefined,
        vitalSigns:   vitalPayload,
        prescriptions: validMeds,
        labOrders:    validLabs,
      });
      toast.success('Daily round saved');
      setRoundDialogOpen(false);
      load();
      loadBill();
      onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save round');
    } finally {
      setSavingRound(false);
    }
  };

  const handleSaveQuickPrescription = async () => {
    if (!admissionId) return;
    const validMeds = quickMeds.filter(m => m.medicineName.trim());
    if (validMeds.length === 0) { toast.warning('Add at least one medicine'); return; }
    setSavingRx(true);
    try {
      await ipdService.createAdmissionRound(admissionId, {
        doctorId: resolveDoctorId(),
        prescriptions: validMeds,
      });
      toast.success('Prescription added');
      setRxDialogOpen(false);
      setQuickMeds([emptyMed()]);
      load(); loadBill(); onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add prescription');
    } finally { setSavingRx(false); }
  };

  const handleSaveQuickLab = async () => {
    if (!admissionId) return;
    const validLabs = quickLabs.filter(l => l.testName.trim());
    if (validLabs.length === 0) { toast.warning('Add at least one lab test'); return; }
    setSavingLabs(true);
    try {
      await ipdService.createAdmissionRound(admissionId, {
        doctorId: resolveDoctorId(),
        labOrders: validLabs,
      });
      toast.success('Lab test ordered');
      setLabDialogOpen(false);
      setQuickLabs([emptyLab()]);
      load(); loadBill(); onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to order lab test');
    } finally { setSavingLabs(false); }
  };

  const handleSaveQuickVitals = async () => {
    if (!admissionId) return;
    const hasAny = Object.values(quickVitals).some(v => String(v).trim());
    if (!hasAny) { toast.warning('Enter at least one vital sign'); return; }
    setSavingVitals(true);
    try {
      const vp = {
        bloodPressureSystolic:  quickVitals.bpSystolic       ? parseInt(quickVitals.bpSystolic)        : undefined,
        bloodPressureDiastolic: quickVitals.bpDiastolic      ? parseInt(quickVitals.bpDiastolic)       : undefined,
        heartRate:              quickVitals.heartRate         ? parseInt(quickVitals.heartRate)          : undefined,
        temperature:            quickVitals.temperature       ? parseFloat(quickVitals.temperature)     : undefined,
        oxygenSaturation:       quickVitals.oxygenSaturation ? parseFloat(quickVitals.oxygenSaturation): undefined,
        weight:                 quickVitals.weight            ? parseFloat(quickVitals.weight)          : undefined,
        height:                 quickVitals.height            ? parseFloat(quickVitals.height)          : undefined,
        respiratoryRate:        quickVitals.respiratoryRate   ? parseInt(quickVitals.respiratoryRate)   : undefined,
      };
      await ipdService.createAdmissionRound(admissionId, {
        doctorId: resolveDoctorId(),
        vitalSigns: vp,
      });
      toast.success('Vitals recorded');
      setVitalsDialogOpen(false);
      setQuickVitals({ bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '',
                       oxygenSaturation: '', weight: '', height: '', respiratoryRate: '' });
      load(); onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to record vitals');
    } finally { setSavingVitals(false); }
  };

  const handleCollectPayment = async () => {
    if (!admissionId) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { toast.warning('Enter a valid payment amount'); return; }
    setCollectingPayment(true);
    try {
      await ipdService.collectPayment(admissionId, {
        amount: amt,
        paymentMethod,
        transactionRef: paymentRef.trim() || undefined,
      });
      toast.success('Payment collected successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount(''); setPaymentMethod('CASH'); setPaymentRef('');
      load(); loadBill(); onUpdated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to collect payment');
    } finally { setCollectingPayment(false); }
  };

  /* ── Field helpers ─────────────────────────────────────────────────────── */

  const updateMed = (idx: number, field: keyof Medicine, val: string) =>
    setMedicines(ms => ms.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const updateLab = (idx: number, field: keyof LabOrder, val: string) =>
    setLabOrders(ls => ls.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  const updateQuickMed = (idx: number, field: keyof Medicine, val: string) =>
    setQuickMeds(ms => ms.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const updateQuickLab = (idx: number, field: keyof LabOrder, val: string) =>
    setQuickLabs(ls => ls.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  /* ── Computed values ───────────────────────────────────────────────────── */

  const daysSinceAdmit = admission
    ? differenceInDays(new Date(), new Date(admission.admittedAt))
    : 0;
  const wardChargesAccrued = (daysSinceAdmit || 1) * (admission?.dailyCharges || 0);
  const balance = Math.max(0, wardChargesAccrued - (admission?.advancePaid || 0));

  const allPrescriptions = admission?.rounds?.flatMap((round, ri) => [
    ...(round.prescriptions ?? []).map(p => ({
      medicineName: p.medicineName, dosage: p.dosage, frequency: p.frequency,
      duration: p.duration, instructions: p.instructions,
      roundNum: ri + 1, date: round.visitDate, doctor: round.doctor,
    })),
    ...(round.newPrescriptions ?? []).flatMap(rx =>
      (Array.isArray(rx.medications) ? rx.medications : []).map((m: any) => ({
        medicineName: m.name, dosage: m.dosage, frequency: m.frequency,
        duration: m.duration, instructions: m.instructions,
        roundNum: ri + 1, date: round.visitDate, doctor: round.doctor,
      }))
    ),
  ]) ?? [];

  const allLabOrders = admission?.rounds?.flatMap((round, ri) =>
    (round.labOrders ?? []).map(l => ({
      ...l, roundNum: ri + 1, date: round.visitDate, doctor: round.doctor,
    }))
  ) ?? [];

  if (!open) return null;

  /* ── Doctor picker sub-component for quick dialogs ─────────────────────── */
  const DoctorPicker = () => isAdminRole ? (
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
  ) : null;

  /* ── Vitals form fields (shared between dialogs) ───────────────────────── */
  const vitalsFields = [
    { key: 'bpSystolic',       label: 'BP Systolic',  placeholder: '120', unit: 'mmHg' },
    { key: 'bpDiastolic',      label: 'BP Diastolic', placeholder: '80',  unit: 'mmHg' },
    { key: 'heartRate',        label: 'Pulse',        placeholder: '72',  unit: 'bpm' },
    { key: 'temperature',      label: 'Temperature',  placeholder: '98.6',unit: '°C' },
    { key: 'oxygenSaturation', label: 'SpO₂',         placeholder: '98',  unit: '%' },
    { key: 'weight',           label: 'Weight',       placeholder: '70',  unit: 'kg' },
    { key: 'height',           label: 'Height',       placeholder: '165', unit: 'cm' },
    { key: 'respiratoryRate',  label: 'Resp. Rate',   placeholder: '16',  unit: '/min' },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          Main Detail Dialog
         ══════════════════════════════════════════════════════════════════════ */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {admission.patient.firstName} {admission.patient.lastName} · UHID: {admission.patient.uhid}
                  </Typography>
                  <Chip size="small" {...statusChipProps(admission.status)} />
                </Box>
              )}
            </Box>
          </Box>

          {/* ── Header action buttons ──────────────────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Print Admission Summary — always available */}
            {admission && admissionId && (
              <Button variant="outlined" size="small" startIcon={<Print />}
                onClick={async () => {
                  try {
                    const { generateAdmissionSummary } = await import('../../utils/admissionSummaryGenerator');
                    const admB64 = generateAdmissionSummary({
                      hospital: { name: 'Hospital' },
                      patient: {
                        name: `${admission.patient.firstName} ${admission.patient.lastName}`,
                        uhid: admission.patient.uhid,
                        mobile: admission.patient.mobile,
                        gender: admission.patient.gender,
                        age: admission.patient.dob ? `${new Date().getFullYear() - new Date(admission.patient.dob).getFullYear()} yrs` : undefined,
                        bloodGroup: admission.patient.bloodGroup,
                      },
                      admission: {
                        admissionNumber: admission.admissionNumber,
                        admittedAt: admission.admittedAt,
                        wardName: admission.ward?.name || '—',
                        bedNumber: admission.bed?.bedNumber,
                        diagnosis: admission.diagnosis,
                        admissionReason: admission.admissionReason,
                        dailyCharges: admission.dailyCharges,
                        advancePaid: admission.advancePaid,
                        notes: admission.notes,
                      },
                    });
                    documentService.persistDocument({ patientId: admission.patient.id || admission.patientId || '', admissionId, type: 'ADMISSION_SUMMARY', content: admB64 }).catch(() => {});
                    toast.success('Admission Summary PDF downloaded');
                  } catch (e: any) {
                    console.error('Admission summary error:', e);
                    toast.error('Failed to generate admission summary');
                  }
                }}
              >
                Admission Summary
              </Button>
            )}

            {/* Print Gate Pass — only when DISCHARGED */}
            {admission?.status === 'DISCHARGED' && admissionId && (
              <Button variant="outlined" size="small" startIcon={<Print />}
                onClick={async () => {
                  try {
                    const { generateGatePass } = await import('../../utils/gatePassGenerator');
                    const gBill = billData;
                    const gpB64 = generateGatePass({
                      hospital: { name: 'Hospital' },
                      patient: {
                        name: `${admission.patient.firstName} ${admission.patient.lastName}`,
                        uhid: admission.patient.uhid,
                        mobile: admission.patient.mobile,
                        gender: admission.patient.gender,
                        age: admission.patient.dob ? `${new Date().getFullYear() - new Date(admission.patient.dob).getFullYear()} yrs` : undefined,
                      },
                      admission: {
                        admissionNumber: admission.admissionNumber,
                        admittedAt: admission.admittedAt,
                        dischargedAt: admission.dischargedAt || new Date().toISOString(),
                        wardName: admission.ward?.name || '—',
                        bedNumber: admission.bed?.bedNumber,
                        diagnosis: admission.diagnosis,
                        days: daysSinceAdmit || 1,
                      },
                      payment: {
                        totalAmount: gBill?.totalAmount ?? admission.totalAmount ?? 0,
                        totalPaid: (gBill?.advancePaid ?? 0) + (gBill?.paymentsCollected ?? 0),
                        paymentStatus: admission.paymentStatus || 'PENDING',
                      },
                    });
                    documentService.persistDocument({ patientId: admission.patient.id || admission.patientId || '', admissionId, type: 'GATE_PASS', content: gpB64 }).catch(() => {});
                    toast.success('Gate Pass PDF downloaded');
                  } catch (e: any) {
                    console.error('Gate pass error:', e);
                    toast.error('Failed to generate gate pass');
                  }
                }}
              >
                Gate Pass
              </Button>
            )}

            {/* Print Discharge Summary — existing, only when DISCHARGED */}
            {admission?.status === 'DISCHARGED' && admissionId && (
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                onClick={async () => {
                  try {
                    const res: any = await ipdService.getDischargeSummary(admissionId);
                    const data = res.data?.data || res.data;
                    const { generateDischargeSummaryPDF } = await import('../../utils/dischargeSummaryGenerator');
                    const p = data.patient;
                    const age = p.dob ? `${new Date().getFullYear() - new Date(p.dob).getFullYear()} yrs` : 'N/A';
                    const dsB64 = generateDischargeSummaryPDF({
                      hospital: { name: data.hospital?.name || 'Hospital', addressLine1: data.hospital?.addressLine1, city: data.hospital?.city, state: data.hospital?.state, phone: data.hospital?.phone, email: data.hospital?.email },
                      patient: { name: `${p.firstName} ${p.lastName}`, uhid: p.uhid, age, gender: p.gender || 'N/A', mobile: p.mobile || '', address: [p.addressLine1, p.city, p.state, p.pincode].filter(Boolean).join(', '), bloodGroup: p.bloodGroup },
                      admission: data.admission,
                      doctors: data.doctors || [],
                      rounds: data.rounds || [],
                      investigations: data.investigations || [],
                      medications: data.medications || [],
                      billing: data.billing,
                    });
                    documentService.persistDocument({ patientId: admission?.patient?.id || admission?.patientId || p.id, admissionId, type: 'DISCHARGE_SUMMARY', content: dsB64 }).catch(() => {});
                    toast.success('Discharge Summary PDF downloaded');
                  } catch (e: any) {
                    console.error('Discharge summary error:', e);
                    toast.error('Failed to generate discharge summary');
                  }
                }}
              >
                Discharge Summary
              </Button>
            )}

            {/* Doctor / admin → Mark Discharge Ready when ADMITTED. Admins
                inherit the doctor's clinical sign-off path because they have
                all-access — but the actual discharge billing still belongs to
                billing roles below. */}
            {(isDoctor || isAdminRole) && admission?.status === 'ADMITTED' && (
              <Tooltip title="Mark patient clinically ready for discharge (receptionist will collect payment)">
                <Button variant="outlined" color="warning" size="small"
                  startIcon={markingReady ? <CircularProgress size={14} /> : <CheckCircle />}
                  onClick={handleMarkDischargeReady} disabled={markingReady}
                >
                  Mark Discharge Ready
                </Button>
              </Tooltip>
            )}

            {/* Billing roles → Discharge & Collect Payment when DISCHARGE_READY */}
            {isBillingRole && admission?.status === 'DISCHARGE_READY' && (
              <Button variant="contained" color="error" size="small"
                startIcon={<ExitToApp />}
                onClick={() => admission && onDischarge(admission)}
              >
                Discharge &amp; Collect Payment
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
            <Tabs value={tab} onChange={(_, v) => setTab(v)}
              sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
              variant="scrollable" scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label={`Prescriptions (${allPrescriptions.length})`} />
              <Tab label={`Investigations (${allLabOrders.length})`} />
              <Tab label={`Daily Rounds (${admission.rounds?.length ?? 0})`} />
              <Tab label="Payments" />
            </Tabs>

            <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>

              {/* ── Tab 0: Overview ─────────────────────────────────────────── */}
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
                        <Chip size="small" {...statusChipProps(admission.status)} />
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Assignment fontSize="small" color="primary" />
                          <Typography variant="subtitle2" fontWeight={700}>Clinical Details</Typography>
                        </Box>
                        {admission.status !== 'DISCHARGED' && (
                          <Button size="small" variant="outlined" startIcon={<MonitorHeart />}
                            onClick={() => {
                              setQuickVitals({ bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '',
                                               oxygenSaturation: '', weight: '', height: '', respiratoryRate: '' });
                              setSelectedDoctorId('');
                              setVitalsDialogOpen(true);
                            }}
                          >
                            Record Vitals
                          </Button>
                        )}
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

                  {/* Running Bill */}
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#1565c0', 0.04) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Receipt fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>Running Bill</Typography>
                      </Box>

                      {billLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : billData ? (
                        <>
                          {[
                            { label: 'Ward Charges', value: billData.wardCharges ?? 0,
                              sub: (billData.days || billData.wardDays) ? `${billData.days || billData.wardDays} days × ₹${(billData.dailyRate ?? 0).toLocaleString()}` : null },
                            { label: 'Lab / Investigation', value: billData.labCharges ?? 0, sub: null },
                            { label: 'Medicine / Pharmacy', value: billData.pharmacyCharges ?? billData.medicineCharges ?? 0, sub: null },
                            { label: 'Consultation Fee', value: billData.consultationFee ?? 0, sub: null },
                          ].map(row => (
                            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                                {row.sub && (
                                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: 10 }}>
                                    {row.sub}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="body2">₹{row.value.toLocaleString()}</Typography>
                            </Box>
                          ))}

                          {(billData.discount ?? 0) > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="success.main">Discount</Typography>
                              <Typography variant="body2" color="success.main">−₹{billData.discount.toLocaleString()}</Typography>
                            </Box>
                          )}

                          <Divider sx={{ my: 1 }} />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Total</Typography>
                            <Typography variant="body2" fontWeight={700}>₹{(billData.totalAfterDiscount ?? billData.totalAmount ?? billData.total ?? 0).toLocaleString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Advance Paid</Typography>
                            <Typography variant="body2">₹{(billData.advancePaid ?? 0).toLocaleString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Payments Collected</Typography>
                            <Typography variant="body2">₹{(billData.paymentsCollected ?? 0).toLocaleString()}</Typography>
                          </Box>

                          <Divider sx={{ my: 1 }} />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" fontWeight={700} color="error.main">Balance Due</Typography>
                            <Typography variant="subtitle2" fontWeight={700} color="error.main">
                              ₹{(billData.balance ?? billData.balanceDue ?? 0).toLocaleString()}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        /* Fallback to basic ward-charge computation */
                        <>
                          {[
                            ['Ward Charges (accrued)', `₹${wardChargesAccrued.toLocaleString()}`],
                            ['Advance Paid', `₹${(admission.advancePaid || 0).toLocaleString()}`],
                            ['Balance Due', `₹${balance.toLocaleString()}`],
                          ].map(([label, value]) => (
                            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography variant="body2"
                                fontWeight={label === 'Balance Due' ? 700 : 400}
                                color={label === 'Balance Due' ? 'error.main' : 'inherit'}
                              >
                                {value}
                              </Typography>
                            </Box>
                          ))}
                        </>
                      )}

                      {isBillingRole && admission.status !== 'DISCHARGED' && (
                        <Button variant="outlined" color="primary" size="small" fullWidth
                          startIcon={<Payment />} sx={{ mt: 1.5 }}
                          onClick={() => { setPaymentAmount(''); setPaymentMethod('CASH'); setPaymentRef(''); setPaymentDialogOpen(true); }}
                        >
                          Collect Payment
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  {/* Discharge ready banner */}
                  {admission.dischargeReadyAt && admission.status !== 'DISCHARGED' && (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<Warning />}
                        action={isBillingRole && admission.status === 'DISCHARGE_READY' && (
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

              {/* ── Tab 1: Prescriptions ───────────────────────────────────── */}
              {tab === 1 && (
                <Box>
                  {/* Prescriptions are a doctor / admin action — nurses
                      see the list but not the "Add" button (scope of practice). */}
                  {admission.status !== 'DISCHARGED' && (isDoctor || isAdminRole) && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" color="success" startIcon={<Medication />}
                        onClick={() => { setQuickMeds([emptyMed()]); setSelectedDoctorId(''); setRxDialogOpen(true); }}
                      >
                        Add Prescription
                      </Button>
                    </Box>
                  )}
                  {allPrescriptions.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <Medication sx={{ fontSize: 48, opacity: 0.3 }} />
                      <Typography variant="body2" mt={1}>No prescriptions yet.</Typography>
                      {admission.status !== 'DISCHARGED' && (
                        <Typography variant="caption">Click "Add Prescription" to prescribe medication.</Typography>
                      )}
                    </Box>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Round', 'Date', 'Doctor', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allPrescriptions.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell>#{p.roundNum}</TableCell>
                            <TableCell>{format(new Date(p.date), 'dd MMM')}</TableCell>
                            <TableCell>Dr. {p.doctor?.firstName} {p.doctor?.lastName}</TableCell>
                            <TableCell>{p.medicineName}</TableCell>
                            <TableCell>{p.dosage}</TableCell>
                            <TableCell>{p.frequency}</TableCell>
                            <TableCell>{p.duration}</TableCell>
                            <TableCell>{p.instructions || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* ── Tab 2: Investigations ──────────────────────────────────── */}
              {tab === 2 && (
                <Box>
                  {admission.status !== 'DISCHARGED' && (isDoctor || isAdminRole) && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" color="info" startIcon={<Science />}
                        onClick={() => { setQuickLabs([emptyLab()]); setSelectedDoctorId(''); setLabDialogOpen(true); }}
                      >
                        Order Lab Test
                      </Button>
                    </Box>
                  )}
                  {allLabOrders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <Science sx={{ fontSize: 48, opacity: 0.3 }} />
                      <Typography variant="body2" mt={1}>No investigations ordered yet.</Typography>
                      {admission.status !== 'DISCHARGED' && (
                        <Typography variant="caption">Click "Order Lab Test" to request investigations.</Typography>
                      )}
                    </Box>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Round', 'Date', 'Doctor', 'Test Name', 'Type', 'Priority', 'Status'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allLabOrders.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell>#{l.roundNum}</TableCell>
                            <TableCell>{format(new Date(l.date), 'dd MMM')}</TableCell>
                            <TableCell>Dr. {l.doctor?.firstName} {l.doctor?.lastName}</TableCell>
                            <TableCell>{l.testName}</TableCell>
                            <TableCell>{l.testType}</TableCell>
                            <TableCell>
                              <Chip label={l.priority} size="small"
                                color={l.priority === 'URGENT' || l.priority === 'STAT' ? 'error' : 'default'} />
                            </TableCell>
                            <TableCell>
                              <Chip label={l.status} size="small"
                                color={l.status === 'COMPLETED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* ── Tab 3: Daily Rounds ────────────────────────────────────── */}
              {tab === 3 && (
                <Box>
                  {admission.status === 'ADMITTED' && (isDoctor || isAdminRole) && (
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
                              {((round.prescriptions?.length ?? 0) + (round.newPrescriptions?.length ?? 0)) > 0 && (
                                <Chip
                                  label={`${(round.prescriptions?.length ?? 0) + (round.newPrescriptions?.length ?? 0)} Rx`}
                                  size="small" color="success" icon={<Medication />}
                                />
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
                            {((round.prescriptions?.length ?? 0) + (round.newPrescriptions?.length ?? 0)) > 0 && (
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
                                    {(round.prescriptions ?? []).map((p: any, pi: number) => (
                                      <TableRow key={`ep-${pi}`}>
                                        <TableCell>{p.medicineName}</TableCell>
                                        <TableCell>{p.dosage}</TableCell>
                                        <TableCell>{p.frequency}</TableCell>
                                        <TableCell>{p.duration}</TableCell>
                                        <TableCell>{p.instructions || '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                    {(round.newPrescriptions ?? []).flatMap((rx: any, ri: number) =>
                                      (Array.isArray(rx.medications) ? rx.medications : []).map((m: any, mi: number) => (
                                        <TableRow key={`rx-${ri}-${mi}`}>
                                          <TableCell>{m.name}</TableCell>
                                          <TableCell>{m.dosage}</TableCell>
                                          <TableCell>{m.frequency}</TableCell>
                                          <TableCell>{m.duration}</TableCell>
                                          <TableCell>{m.instructions || '—'}</TableCell>
                                        </TableRow>
                                      ))
                                    )}
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

              {/* ── Tab 4: Payments ────────────────────────────────────────── */}
              {tab === 4 && (
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

      {/* ══════════════════════════════════════════════════════════════════════
          Daily Round Dialog (existing — unchanged)
         ══════════════════════════════════════════════════════════════════════ */}
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
                {vitalsFields.map(f => (
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

      {/* ══════════════════════════════════════════════════════════════════════
          Quick Prescription Dialog
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={rxDialogOpen} onClose={() => setRxDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Medication color="success" />
            <Typography fontWeight={700}>Add Prescription</Typography>
          </Box>
          <IconButton onClick={() => setRxDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2}>
            <DoctorPicker />
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Medications</Typography>
                <Button size="small" variant="outlined" startIcon={<Add />}
                  onClick={() => setQuickMeds(ms => [...ms, emptyMed()])}>
                  Add Another
                </Button>
              </Box>
              {quickMeds.map((med, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth size="small" label="Medicine Name" value={med.medicineName}
                        onChange={e => updateQuickMed(idx, 'medicineName', e.target.value)} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField fullWidth size="small" label="Dosage" value={med.dosage}
                        onChange={e => updateQuickMed(idx, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Frequency</InputLabel>
                        <Select label="Frequency" value={med.frequency}
                          onChange={e => updateQuickMed(idx, 'frequency', e.target.value)}>
                          {FREQ_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Duration</InputLabel>
                        <Select label="Duration" value={med.duration}
                          onChange={e => updateQuickMed(idx, 'duration', e.target.value)}>
                          {DUR_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField fullWidth size="small" label="Instructions" value={med.instructions}
                        onChange={e => updateQuickMed(idx, 'instructions', e.target.value)} placeholder="After meals…" />
                    </Grid>
                    <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
                      {quickMeds.length > 1 && (
                        <IconButton size="small" color="error"
                          onClick={() => setQuickMeds(ms => ms.filter((_, i) => i !== idx))}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRxDialogOpen(false)} disabled={savingRx}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSaveQuickPrescription} disabled={savingRx}
            startIcon={savingRx ? <CircularProgress size={16} /> : <CheckCircle />}>
            {savingRx ? 'Saving…' : 'Save Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Quick Lab Order Dialog
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={labDialogOpen} onClose={() => setLabDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science color="info" />
            <Typography fontWeight={700}>Order Lab Test</Typography>
          </Box>
          <IconButton onClick={() => setLabDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2}>
            <DoctorPicker />
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Lab Tests</Typography>
                <Button size="small" variant="outlined" color="info" startIcon={<Add />}
                  onClick={() => setQuickLabs(ls => [...ls, emptyLab()])}>
                  Add Another
                </Button>
              </Box>
              {quickLabs.map((lab, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" label="Test Name" value={lab.testName}
                        onChange={e => updateQuickLab(idx, 'testName', e.target.value)} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select label="Type" value={lab.testType || 'LAB'}
                          onChange={e => updateQuickLab(idx, 'testType', e.target.value)}>
                          {QUICK_TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Priority</InputLabel>
                        <Select label="Priority" value={lab.priority || 'ROUTINE'}
                          onChange={e => updateQuickLab(idx, 'priority', e.target.value)}>
                          {['ROUTINE', 'URGENT'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={10} sm={2}>
                      <TextField fullWidth size="small" label="Instructions" value={lab.instructions}
                        onChange={e => updateQuickLab(idx, 'instructions', e.target.value)} />
                    </Grid>
                    <Grid item xs={2} sm={1} sx={{ textAlign: 'center' }}>
                      {quickLabs.length > 1 && (
                        <IconButton size="small" color="error"
                          onClick={() => setQuickLabs(ls => ls.filter((_, i) => i !== idx))}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setLabDialogOpen(false)} disabled={savingLabs}>Cancel</Button>
          <Button variant="contained" color="info" onClick={handleSaveQuickLab} disabled={savingLabs}
            startIcon={savingLabs ? <CircularProgress size={16} /> : <CheckCircle />}>
            {savingLabs ? 'Ordering…' : 'Order Lab Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Quick Vitals Dialog
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={vitalsDialogOpen} onClose={() => setVitalsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonitorHeart color="primary" />
            <Typography fontWeight={700}>Record Vitals</Typography>
          </Box>
          <IconButton onClick={() => setVitalsDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2}>
            <DoctorPicker />
            {vitalsFields.map(f => (
              <Grid item xs={6} sm={3} key={f.key}>
                <TextField
                  fullWidth size="small" label={`${f.label} (${f.unit})`} placeholder={f.placeholder}
                  type="number"
                  value={(quickVitals as any)[f.key]}
                  onChange={e => setQuickVitals(v => ({ ...v, [f.key]: e.target.value }))}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setVitalsDialogOpen(false)} disabled={savingVitals}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveQuickVitals} disabled={savingVitals}
            startIcon={savingVitals ? <CircularProgress size={16} /> : <CheckCircle />}>
            {savingVitals ? 'Saving…' : 'Save Vitals'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Collect Payment Dialog
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payment color="primary" />
            <Typography fontWeight={700}>Collect Payment</Typography>
          </Box>
          <IconButton onClick={() => setPaymentDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {billData && (
              <Grid item xs={12}>
                <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                  Balance Due: <strong>₹{(billData.balance ?? billData.balanceDue ?? 0).toLocaleString()}</strong>
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Amount (₹)" type="number" value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select label="Payment Method" value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Transaction Ref (optional)" value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)} placeholder="UPI Ref / Cheque No. / Receipt" />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} disabled={collectingPayment}>Cancel</Button>
          <Button variant="contained" onClick={handleCollectPayment} disabled={collectingPayment}
            startIcon={collectingPayment ? <CircularProgress size={16} /> : <CheckCircle />}>
            {collectingPayment ? 'Processing…' : 'Collect Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
