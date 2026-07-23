import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tab,
  Tabs,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  LocalHospital as HospitalIcon,
  AccessTime as TimeIcon,
  Receipt as ReceiptIcon,
  MedicalInformation as RxIcon,
  Summarize as SummaryIcon,
  Hotel as BedIcon,
} from '@mui/icons-material';
import ipdService from '../services/ipdService';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { generateOPDCardPDF, HospitalInfo, ConsultationInfo } from '../utils/pdfGenerator';
import documentService from '../services/documentService';
import hospitalService from '../services/hospitalService';
import encounterService from '../services/encounterService';

interface OPDCardDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  encounter?: any;
  onUpdate?: (data: any) => Promise<void>;
  readOnly?: boolean;
  admissionId?: string | null;
}

const NAVY = '#1A3C6E';
const NAVY_LIGHT = '#E6EDF8';
const BORDER = '#BED2EB';
const LGRAY = '#F5F7FA';

const SectionBar: React.FC<{ label: string; right?: string }> = ({ label, right }) => (
  <Box
    sx={{
      bgcolor: NAVY,
      color: 'white',
      px: 1.5,
      py: 0.6,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '3px 3px 0 0',
    }}
  >
    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.72rem' }}>
      {label}
    </Typography>
    {right && (
      <Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.85 }}>
        {right}
      </Typography>
    )}
  </Box>
);

const InfoRow: React.FC<{ label: string; value: string | React.ReactNode; bold?: boolean; color?: string }> = ({
  label,
  value,
  bold,
  color,
}) => (
  <Box sx={{ mb: 0.3 }}>
    <Typography
      variant="caption"
      sx={{ fontWeight: 700, color: '#50607E', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem' }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: bold ? 600 : 400, color: color || '#141428', fontSize: '0.82rem', mt: 0.1 }}
    >
      {value || '—'}
    </Typography>
  </Box>
);

const OPDCardDialog: React.FC<OPDCardDialogProps> = ({
  open,
  onClose,
  appointment,
  encounter: encounterProp,
  onUpdate,
  readOnly = false,
  admissionId = null,
}) => {
  const authUser = useSelector((state: any) => state.auth?.user);
  const [hospitalInfo, setHospitalInfo] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [enc, setEnc] = useState<any>(encounterProp || null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [admission, setAdmission] = useState<any>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    setLoading(true);

    const fetchAll = async () => {
      const hospitalId = appointment.hospitalId || authUser?.hospitalId;
      const encounterId = appointment.encounterId || appointment.encounter?.id || encounterProp?.id;

      // Try the unified /full endpoint first — it returns everything in one call
      if (encounterId) {
        try {
          const fullRes: any = await encounterService.getEncounterFull(encounterId);
          const data = fullRes.data?.data || fullRes.data;
          if (data) {
            setEnc(data);
            if (data.vitals) setVitals(data.vitals);
            if (data.hospital) setHospitalInfo(data.hospital);
            setLoading(false);
            return;
          }
        } catch {
          // Fall back to individual calls
        }
      }

      // Fallback: fetch hospital info separately
      if (hospitalId) {
        hospitalService
          .getHospitalById(hospitalId)
          .then((res: any) => setHospitalInfo(res.data?.data || res.data || {}))
          .catch(() => {});
      }

      if (encounterId && !encounterProp) {
        encounterService
          .getEncounterById(encounterId)
          .then((res: any) => setEnc(res.data?.data || res.data || null))
          .catch(() => {});
      }

      setLoading(false);
    };

    fetchAll();
  }, [open, appointment, encounterProp, authUser?.hospitalId]);

  useEffect(() => {
    if (encounterProp) setEnc(encounterProp);
  }, [encounterProp]);

  // Reset tab when dialog opens/closes
  useEffect(() => {
    if (!open) { setActiveTab(0); setAdmission(null); }
  }, [open]);

  // Fetch IPD admission when admissionId provided
  useEffect(() => {
    if (!open || !admissionId) return;
    setAdmissionLoading(true);
    (ipdService.getAdmission(admissionId) as any)
      .then((res: any) => setAdmission(res.data?.data || res.data || null))
      .catch(() => {})
      .finally(() => setAdmissionLoading(false));
  }, [open, admissionId]);

  const calculateAge = () => {
    if (!appointment?.patient?.dob) return 'N/A';
    const diff = new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear();
    return `${diff} yrs`;
  };

  const formatAddr = (patient: any) => {
    if (!patient) return '';
    if (typeof patient.address === 'string') return patient.address;
    if (patient.address) {
      const a = patient.address;
      return [a.line1, a.addressLine1, a.city, a.state, a.pincode].filter(Boolean).join(', ');
    }
    return [patient.addressLine1, patient.city, patient.state, patient.pincode].filter(Boolean).join(', ');
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      let hInfo: HospitalInfo = { name: hospitalInfo?.name || 'Hospital' };
      if (hospitalInfo) {
        hInfo = {
          name: hospitalInfo.name || 'Hospital',
          addressLine1: hospitalInfo.addressLine1,
          city: hospitalInfo.city,
          state: hospitalInfo.state,
          country: hospitalInfo.country,
          phone: hospitalInfo.phone,
          email: hospitalInfo.email,
          website: hospitalInfo.website,
          gstNumber: hospitalInfo.gstNumber,
        };
      }

      let vitalsInfo = undefined;
      if (vitals) {
            vitalsInfo = {
          recordedAt: vitals.createdAt ? format(new Date(vitals.createdAt), 'dd-MM-yyyy h:mm a') : undefined,
          height: vitals.height,
          weight: vitals.weight,
          bloodPressureSystolic: vitals.bloodPressureSystolic,
          bloodPressureDiastolic: vitals.bloodPressureDiastolic,
          heartRate: vitals.heartRate,
          temperature: vitals.temperature,
          bmi: vitals.bmi,
          oxygenSaturation: vitals.oxygenSaturation,
          respiratoryRate: vitals.respiratoryRate,
        };
      }

      const age = appointment.patient?.dob
        ? new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear()
        : 'NA';

      let consultationInfo: ConsultationInfo | undefined;
          if (enc) {
            consultationInfo = {
              chiefComplaint: enc.chiefComplaint,
              provisionalDiagnosis: enc.provisionalDiagnosis,
              finalDiagnosis: enc.finalDiagnosis || enc.diagnosis,
              notes: enc.notes,
              followUpDate: enc.followUpDate,
          prescriptions: Array.isArray(enc.prescriptions)
            ? enc.prescriptions.map((rx: any) => ({
                medicineName: rx.medicineName || '',
                dosage: rx.dosage || '',
                frequency: rx.frequency || '',
                duration: rx.duration || '',
                instructions: rx.instructions || '',
              }))
            : [],
          labOrders: Array.isArray(enc.labOrders)
            ? enc.labOrders.map((o: any) => ({ testName: o.testName || '' }))
            : [],
        };
      }

      const base64 = generateOPDCardPDF({
        opdCardNumber: appointment.opdCardNumber,
        issueDate: format(new Date(appointment.checkedInAt || appointment.createdAt), 'dd-MM-yyyy h:mm a'),
        hospital: hInfo,
        patient: {
          name: `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim(),
          uhid: appointment.patient?.uhid || 'NA',
          age,
          gender: appointment.patient?.gender || 'NA',
          mobile: appointment.patient?.mobile || 'NA',
          address: appointment.patient?.address || '',
          relationName: appointment.patient?.emergencyContact?.relationship || 'NA',
        },
        appointment: {
          doctor: `Dr. ${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim(),
          doctorRegistrationNo: appointment.doctor?.registrationNo,
          doctorSignatureBase64: appointment.doctor?.signatureBase64,
          department: appointment.doctor?.department?.name || 'Not Specified',
          fees: '₹0',
          paymentMode: 'Not Paid',
        },
        generatedBy: authUser?.name || 'System',
        vitals: vitalsInfo,
        consultation: consultationInfo,
      });
      if (appointment.patient?.id) {
        documentService.persistDocument({ patientId: appointment.patient.id, type: 'OPD_CARD', content: base64 }).catch(() => {});
      }

      toast.success('OPD Card PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPrescription = async () => {
    try {
      const { generatePrescriptionPDF } = await import('../utils/pdfGenerator');
      const age = patient?.dob
        ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`
        : 'N/A';
      const rxB64 = generatePrescriptionPDF({
        hospital: { name: hospitalInfo?.name || 'Hospital', addressLine1: hospitalInfo?.addressLine1, city: hospitalInfo?.city, state: hospitalInfo?.state, phone: hospitalInfo?.phone, email: hospitalInfo?.email },
        patient: { name: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(), uhid: patient?.uhid || 'NA', age, gender: patient?.gender || 'NA', mobile: patient?.mobile || 'NA' },
        doctor: { name: `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim(), specialization: doctor?.specialization, registrationNo: doctor?.registrationNo, department: doctor?.department?.name, signatureBase64: doctor?.signatureBase64 },
        diagnosis: enc?.finalDiagnosis || enc?.diagnosis,
        prescriptions: (enc?.prescriptions || []).map((rx: any) => ({ medicineName: rx.medicineName || '', dosage: rx.dosage || '', frequency: rx.frequency || '', duration: rx.duration || '', instructions: rx.instructions || '' })),
        notes: enc?.notes,
        followUpDate: enc?.followUpDate ? new Date(enc.followUpDate).toLocaleDateString('en-IN') : undefined,
        date: appointment?.checkedInAt ? format(new Date(appointment.checkedInAt), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'),
      });
      if (patient?.id) {
        documentService.persistDocument({ patientId: patient.id, encounterId: enc?.id, type: 'PRESCRIPTION', content: rxB64 }).catch(() => {});
      }
      toast.success('Prescription PDF downloaded');
    } catch (error) {
      console.error('Prescription PDF error:', error);
      toast.error('Failed to generate Prescription PDF');
    }
  };

  const handleDownloadVisitSummary = async () => {
    try {
      const { generateVisitSummaryPDF } = await import('../utils/pdfGenerator');
      const age = patient?.dob
        ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`
        : 'N/A';
      const vsB64 = generateVisitSummaryPDF({
        hospital: { name: hospitalInfo?.name || 'Hospital', addressLine1: hospitalInfo?.addressLine1, city: hospitalInfo?.city, state: hospitalInfo?.state, phone: hospitalInfo?.phone, email: hospitalInfo?.email },
        patient: { name: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(), uhid: patient?.uhid || 'NA', age, gender: patient?.gender || 'NA', mobile: patient?.mobile || 'NA' },
        doctor: { name: `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim(), specialization: doctor?.specialization, registrationNo: doctor?.registrationNo, signatureBase64: doctor?.signatureBase64 },
        visit: {
          date: appointment?.checkedInAt ? format(new Date(appointment.checkedInAt), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'),
          department: doctor?.department?.name,
          chiefComplaint: enc?.chiefComplaint,
          diagnosis: enc?.finalDiagnosis || enc?.diagnosis,
          notes: enc?.notes,
          followUpDate: enc?.followUpDate ? new Date(enc.followUpDate).toLocaleDateString('en-IN') : undefined,
        },
        vitals: vitals ? {
          height: vitals.height, weight: vitals.weight,
          bloodPressureSystolic: vitals.bloodPressureSystolic, bloodPressureDiastolic: vitals.bloodPressureDiastolic,
          heartRate: vitals.heartRate, temperature: vitals.temperature, bmi: vitals.bmi,
          oxygenSaturation: vitals.oxygenSaturation, respiratoryRate: vitals.respiratoryRate,
        } : undefined,
        prescriptions: (enc?.prescriptions || []).map((rx: any) => ({ medicineName: rx.medicineName, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, instructions: rx.instructions })),
        investigations: (enc?.labOrders || enc?.investigations || []).map((o: any) => ({ testName: o.testName, status: o.status || 'ORDERED' })),
        billing: enc?.billing ? { total: enc.billing.totalAmount, paid: enc.billing.paymentCollected, balance: enc.billing.balance, method: enc.paymentMethod } : undefined,
      });
      if (patient?.id) {
        documentService.persistDocument({ patientId: patient.id, encounterId: enc?.id, type: 'VISIT_SUMMARY', content: vsB64 }).catch(() => {});
      }
      toast.success('Visit Summary PDF downloaded');
    } catch (error) {
      console.error('Visit Summary PDF error:', error);
      toast.error('Failed to generate Visit Summary PDF');
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const { generateReceiptPDF } = await import('../utils/pdfGenerator');
      const billing = enc?.billing || {};
      const items: Array<{ description: string; amount: number }> = [];
      if (billing.consultationFee > 0) items.push({ description: 'Consultation Fee', amount: billing.consultationFee });
      if (billing.labCharges > 0) items.push({ description: 'Lab / Investigation Charges', amount: billing.labCharges });
      if (billing.medicineCharges > 0) items.push({ description: 'Medicine / Pharmacy Charges', amount: billing.medicineCharges });
      if (billing.scanCharges > 0) items.push({ description: 'Scan / Radiology Charges', amount: billing.scanCharges });

      const rcptB64 = generateReceiptPDF({
        hospital: { name: hospitalInfo?.name || 'Hospital', addressLine1: hospitalInfo?.addressLine1, city: hospitalInfo?.city, state: hospitalInfo?.state, phone: hospitalInfo?.phone, email: hospitalInfo?.email },
        patient: { name: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(), uhid: patient?.uhid || 'NA' },
        receiptNumber: enc?.payments?.[0]?.receiptNumber || `RCPT-${Date.now()}`,
        date: format(new Date(), 'dd-MM-yyyy h:mm a'),
        items,
        totalAmount: billing.totalAmount || 0,
        amountPaid: billing.paymentCollected || 0,
        balance: billing.balance || 0,
        paymentMethod: enc?.paymentMethod || 'N/A',
        transactionRef: enc?.transactionRef,
        generatedBy: authUser?.name || 'System',
      });
      if (patient?.id) {
        documentService.persistDocument({ patientId: patient.id, encounterId: enc?.id, type: 'RECEIPT', content: rcptB64 }).catch(() => {});
      }
      toast.success('Receipt PDF downloaded');
    } catch (error) {
      console.error('Receipt PDF error:', error);
      toast.error('Failed to generate Receipt PDF');
    }
  };

  const hName = hospitalInfo?.name || 'AbhaAyushman Hospital';
  const hAddr = [hospitalInfo?.addressLine1, hospitalInfo?.city, hospitalInfo?.state].filter(Boolean).join(', ');
  const hContact = [hospitalInfo?.phone, hospitalInfo?.email].filter(Boolean).join('  ·  ');
  const initials = hName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  const patient = appointment?.patient;
  const doctor = appointment?.doctor;
  const prescriptions = enc?.prescriptions || [];
  const labOrders = enc?.labOrders || [];

  const patientRows: [string, string, string, string][] = [
    ['UHID', patient?.uhid || '—', 'Date', appointment?.checkedInAt ? format(new Date(appointment.checkedInAt), 'dd-MM-yyyy h:mm a') : format(new Date(appointment?.createdAt || new Date()), 'dd-MM-yyyy h:mm a')],
    ['Name', `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || '—', 'Contact', patient?.mobile || '—'],
    ['Age / Gender', `${calculateAge()} / ${patient?.gender || '—'}`, 'Blood Group', patient?.bloodGroup || '—'],
    ['Doctor', `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim(), 'Department', doctor?.department?.name || doctor?.specialization || '—'],
    ['Address', formatAddr(patient) || '—', 'Email', patient?.email || '—'],
  ];

  const vitalsItems: [string, string][] = [];
  if (vitals) {
    if (vitals.height != null) vitalsItems.push(['Height', `${vitals.height} ft`]);
    if (vitals.weight != null) vitalsItems.push(['Weight', `${vitals.weight} kg`]);
    if (vitals.bloodPressureSystolic != null)
      vitalsItems.push(['BP', `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg`]);
    if (vitals.heartRate != null) vitalsItems.push(['Pulse', `${vitals.heartRate} bpm`]);
    if (vitals.temperature != null) vitalsItems.push(['Temp', `${vitals.temperature} °F`]);
    if (vitals.bmi != null) vitalsItems.push(['BMI', `${vitals.bmi}`]);
    if (vitals.oxygenSaturation != null) vitalsItems.push(['SpO₂', `${vitals.oxygenSaturation}%`]);
    if (vitals.respiratoryRate != null) vitalsItems.push(['Resp', `${vitals.respiratoryRate}/min`]);
  }

  const IPDPanel = () => {
    if (admissionLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
    if (!admission) return <Box sx={{ p: 3 }}><Typography color="text.secondary">No admission data found.</Typography></Box>;
    const adm = admission;
    const days = Math.max(1, Math.floor((new Date().getTime() - new Date(adm.admittedAt).getTime()) / 86400000));
    return (
      <Box sx={{ p: 0 }}>
        {/* Status banner */}
        <Box sx={{
          px: 2, py: 1, mb: 2,
          bgcolor: adm.status === 'ADMITTED' ? alpha('#50C878', 0.08) : alpha('#F39C12', 0.08),
          border: '1px solid', borderColor: adm.status === 'ADMITTED' ? alpha('#50C878', 0.25) : alpha('#F39C12', 0.25),
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BedIcon sx={{ color: adm.status === 'ADMITTED' ? '#50C878' : '#F39C12', fontSize: 20 }} />
            <Typography variant="body2" fontWeight={700} color={adm.status === 'ADMITTED' ? '#2A8A4A' : '#B07010'}>
              {adm.status === 'ADMITTED' ? 'Currently Admitted' : 'Discharge Ready'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontWeight={600}>
            {adm.admissionNumber}
          </Typography>
        </Box>

        {/* Admission info grid */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, mb: 2 }}>
          <Table size="small">
            <TableBody>
              {[
                ['Ward', adm.ward?.name || '—', 'Bed', adm.bed?.bedNumber ? `Bed ${adm.bed.bedNumber}` : 'Not assigned'],
                ['Admitted', adm.admittedAt ? format(new Date(adm.admittedAt), 'dd MMM yyyy, h:mm a') : '—', 'Days', `${days} day(s)`],
                ['Reason', adm.admissionReason || '—', 'Diagnosis', adm.diagnosis || '—'],
                ['Daily Rate', `₹${adm.dailyCharges?.toLocaleString('en-IN') || 0}/day`, 'Advance Paid', `₹${adm.advancePaid?.toLocaleString('en-IN') || 0}`],
              ].map((row: any, idx: number) => (
                <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? LGRAY : 'white' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#50607E', fontSize: '0.72rem', width: '13%', textTransform: 'uppercase', py: 0.8, borderColor: BORDER }}>{row[0]}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem', py: 0.8, borderColor: BORDER, width: '37%' }}>{row[1]}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#50607E', fontSize: '0.72rem', width: '13%', textTransform: 'uppercase', py: 0.8, borderColor: BORDER, borderLeft: `1px solid ${BORDER}` }}>{row[2]}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem', py: 0.8, borderColor: BORDER, width: '37%' }}>{row[3]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Rounds summary */}
        {Array.isArray(adm.rounds) && adm.rounds.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <SectionBar label={`IPD DAILY ROUNDS  (${adm.rounds.length})`} />
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 6px 6px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#E6EDF8' }}>
                    {['Date', 'Doctor', 'Diagnosis / Notes', 'Rx', 'Labs'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adm.rounds.map((r: any, i: number) => (
                    <TableRow key={r.id || i} sx={{ bgcolor: i % 2 === 0 ? LGRAY : 'white' }}>
                      <TableCell sx={{ fontSize: '0.78rem', py: 0.6, whiteSpace: 'nowrap' }}>
                        {r.visitDate ? format(new Date(r.visitDate), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>
                        {r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', py: 0.6, maxWidth: 200 }}>
                        <Typography variant="caption" noWrap title={r.diagnosis || r.notes || ''}>
                          {r.diagnosis || r.notes || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>
                        {(r.prescriptions?.length || r.newPrescriptions?.length) ? '✓' : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>
                        {r.labOrders?.length ? `${r.labOrders.length}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Running bill */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[
            { label: 'Ward Charges', value: `₹${(days * (adm.dailyCharges || 0)).toLocaleString('en-IN')}` },
            { label: 'Advance Paid', value: `₹${(adm.advancePaid || 0).toLocaleString('en-IN')}` },
            { label: 'Est. Balance', value: `₹${Math.max(0, days * (adm.dailyCharges || 0) - (adm.advancePaid || 0)).toLocaleString('en-IN')}` },
            { label: 'Payment Status', value: adm.paymentStatus || 'PENDING' },
          ].map((item) => (
            <Paper key={item.label} variant="outlined" sx={{ px: 2, py: 1, flex: 1, minWidth: 120, borderColor: BORDER, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</Typography>
              <Typography variant="body2" fontWeight={700} color={NAVY}>{item.value}</Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
      {/* Custom Header — matching the PDF */}
      <Box sx={{ bgcolor: 'white', px: 3, pt: 2.5, pb: 1.5, position: 'relative' }}>
        {/* Action buttons */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
          {!readOnly && onUpdate && (
            <IconButton size="small" sx={{ color: NAVY }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={handleDownloadPDF} disabled={downloading} sx={{ color: NAVY }}>
            {downloading ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: '#999' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Hospital Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `3px solid ${NAVY}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.95rem' }}>{initials}</Typography>
      </Box>
          <Box sx={{ flex: 1, textAlign: 'center', pr: 6 }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem', letterSpacing: 0.3 }}>
              {hName}
            </Typography>
            {hAddr && (
              <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.7rem' }}>
                {hAddr}
                </Typography>
            )}
            {hContact && (
              <Typography variant="caption" display="block" sx={{ color: '#50607E', fontSize: '0.65rem' }}>
                {hContact}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Title bar */}
        <Box
          sx={{
            borderTop: `2.5px solid ${NAVY}`,
            borderBottom: `2.5px solid ${NAVY}`,
            py: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.7rem' }}>
            Card No: <strong>{appointment?.opdCardNumber || '—'}</strong>
          </Typography>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.95rem', letterSpacing: 1 }}>
            PATIENT RECORD
          </Typography>
          <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.7rem' }}>
            <TimeIcon sx={{ fontSize: 11, mr: 0.3, verticalAlign: 'middle' }} />
            {appointment?.checkedInAt
              ? format(new Date(appointment.checkedInAt), 'dd-MM-yyyy')
              : format(new Date(), 'dd-MM-yyyy')}
          </Typography>
        </Box>

        {/* Tabs — only shown when patient is admitted */}
        {admissionId && (
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mt: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}
          >
            <Tab label="OPD Card" icon={<HospitalIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="IPD Admission" icon={<BedIcon sx={{ fontSize: 16 }} />} iconPosition="start"
              sx={{ color: '#F39C12', '&.Mui-selected': { color: '#F39C12' } }}
            />
          </Tabs>
        )}
      </Box>

      <DialogContent sx={{ px: 3, py: 2, bgcolor: '#FAFBFD' }}>
        {/* IPD Tab */}
        {admissionId && activeTab === 1 ? (
          <IPDPanel />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* ── Patient Info Table ──────────────────────────── */}
            <SectionBar label="PATIENT INFORMATION" />
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px', mb: 2.5 }}>
              <Table size="small">
                <TableBody>
                  {patientRows.map((row, idx) => (
                    <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? LGRAY : 'white' }}>
                      <TableCell
                        sx={{ fontWeight: 700, color: '#50607E', fontSize: '0.72rem', width: '13%', py: 0.8, borderColor: BORDER, textTransform: 'uppercase' }}
                      >
                        {row[0]}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.82rem', color: '#141428', py: 0.8, borderColor: BORDER, fontWeight: row[0] === 'Name' || row[0] === 'UHID' ? 600 : 400, width: '37%' }}
                      >
                        {row[1]}
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, color: '#50607E', fontSize: '0.72rem', width: '13%', py: 0.8, borderColor: BORDER, borderLeft: `1px solid ${BORDER}`, textTransform: 'uppercase' }}
                      >
                        {row[2]}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.82rem', color: '#141428', py: 0.8, borderColor: BORDER, width: '37%' }}
                      >
                        {row[3]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ── OPD Timing ─────────────────────────────────── */}
            <Paper
              variant="outlined"
              sx={{
                borderColor: BORDER,
                bgcolor: NAVY_LIGHT,
                px: 2,
                py: 0.8,
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 1,
              }}
            >
              <HospitalIcon sx={{ color: NAVY, fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem' }}>
                OPD TIMING:
                  </Typography>
              <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.72rem' }}>
                MON – SAT | 09:00 AM – 06:00 PM
              </Typography>
              <Box sx={{ ml: 'auto' }}>
                <Chip
                  label={appointment?.status || 'SCHEDULED'}
                  size="small"
                  color={
                    appointment?.status === 'COMPLETED'
                      ? 'success'
                      : appointment?.status === 'IN_PROGRESS'
                      ? 'warning'
                      : 'default'
                  }
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              </Box>
            </Paper>

            {/* ── Vitals ─────────────────────────────────────── */}
            {vitalsItems.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <SectionBar
                  label="VITALS"
                  right={vitals?.createdAt ? `Recorded: ${format(new Date(vitals.createdAt), 'dd-MM-yyyy h:mm a')}` : ''}
                />
                <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px' }}>
                  <Grid container>
                    {vitalsItems.map(([label, val], idx) => (
                      <Grid
                        item
                        xs={3}
                        key={idx}
                        sx={{
                          p: 1,
                          bgcolor: (Math.floor(idx / 4) + (idx % 4)) % 2 === 0 ? LGRAY : 'white',
                          borderRight: (idx + 1) % 4 !== 0 ? `1px solid ${BORDER}` : 'none',
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#50607E', fontWeight: 700, fontSize: '0.62rem' }}>
                          {label}
              </Typography>
                        <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.85rem' }}>{val}</Typography>
            </Grid>
                    ))}
            </Grid>
                </Paper>
              </Box>
            )}

            {/* ── Chief Complaint ─────────────────────────────── */}
            <Box sx={{ mb: 2.5 }}>
              <SectionBar label="CHIEF COMPLAINT / SYMPTOMS" />
              <Paper
                variant="outlined"
                sx={{
                  borderColor: BORDER,
                  borderRadius: '0 0 3px 3px',
                  p: 1.5,
                  minHeight: 50,
                  bgcolor: enc?.chiefComplaint ? LGRAY : '#FCFEFF',
                }}
              >
                {enc?.chiefComplaint ? (
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#141428', whiteSpace: 'pre-wrap' }}>
                    {enc.chiefComplaint}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#C8D2DC', fontSize: '0.82rem' }}>
                    (To be filled by the doctor / receptionist)
                </Typography>
                )}
              </Paper>
              </Box>

            {/* ── Diagnosis ───────────────────────────────────── */}
            {(enc?.provisionalDiagnosis || enc?.finalDiagnosis || enc?.diagnosis) && (
              <Box sx={{ mb: 2.5 }}>
                <SectionBar label="DIAGNOSIS" />
                <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px', p: 1.5 }}>
                  {enc?.provisionalDiagnosis && (
                    <Box sx={{ mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#50607E', fontSize: '0.68rem' }}>
                        Provisional:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.82rem', ml: 1, display: 'inline' }}>
                        {enc.provisionalDiagnosis}
                      </Typography>
                    </Box>
                  )}
                  {(enc?.finalDiagnosis || enc?.diagnosis) && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem' }}>
                        Final Diagnosis:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', ml: 1, display: 'inline', color: NAVY }}>
                        {enc.finalDiagnosis || enc.diagnosis}
                      </Typography>
                    </Box>
                  )}
                </Paper>
                </Box>
            )}

            {/* ── Prescription ────────────────────────────────── */}
            {prescriptions.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <SectionBar label={`PRESCRIPTION  (${prescriptions.length} Medicine${prescriptions.length > 1 ? 's' : ''})`} />
                <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#E6EEFC' }}>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', width: 30, py: 0.7 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>Medicine Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>Dosage</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>Frequency</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY, fontSize: '0.72rem', py: 0.7 }}>Instructions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prescriptions.map((rx: any, idx: number) => (
                        <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? LGRAY : 'white' }}>
                          <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, py: 0.6 }}>{rx.medicineName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>{rx.dosage || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>{rx.frequency || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', py: 0.6 }}>{rx.duration || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', py: 0.6, color: '#50607E' }}>{rx.instructions || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                </Box>
            )}

            {/* ── Investigations ──────────────────────────────── */}
            {labOrders.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <SectionBar label={`INVESTIGATIONS  (${labOrders.length})`} />
                <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px', p: 1.5 }}>
                  <Grid container spacing={0}>
                    {labOrders.map((o: any, idx: number) => (
                      <Grid item xs={6} key={idx}>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', py: 0.2 }}>
                          {idx + 1}. {o.testName}
                        </Typography>
            </Grid>
                    ))}
              </Grid>
                </Paper>
              </Box>
            )}

            {/* ── Follow-up Date ──────────────────────────────── */}
            {enc?.followUpDate && (
              <Paper
                variant="outlined"
                sx={{ borderColor: BORDER, px: 2, py: 1, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 1 }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: NAVY, fontSize: '0.78rem' }}>
                  Follow-up Date:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {new Date(enc.followUpDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Typography>
              </Paper>
            )}

            {/* ── Notes ──────────────────────────────────────── */}
            {enc?.notes && (
              <Box sx={{ mb: 2.5 }}>
                <SectionBar label="NOTES / INSTRUCTIONS" />
                <Paper
                  variant="outlined"
                  sx={{ borderColor: BORDER, borderRadius: '0 0 3px 3px', p: 1.5 }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                    {enc.notes}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* ── Doctor Signature Block ──────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, mb: 1 }}>
              <Box sx={{ textAlign: 'center', minWidth: 180 }}>
                <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.68rem' }}>
                  Authorised Signature
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    borderColor: BORDER,
                    bgcolor: '#FAFCFF',
                    height: 60,
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {doctor?.signatureBase64 ? (
                    <img src={doctor.signatureBase64} alt="Signature" style={{ maxHeight: 50, maxWidth: 150 }} />
                  ) : (
                    <Typography variant="caption" sx={{ color: '#ddd', fontStyle: 'italic' }}>
                      Signature
                    </Typography>
                  )}
                </Paper>
                <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.82rem' }}>
                  Dr. {doctor?.firstName} {doctor?.lastName}
                </Typography>
                {doctor?.registrationNo && (
                  <Typography variant="caption" sx={{ color: '#50607E', fontSize: '0.68rem' }}>
                    Reg. No: {doctor.registrationNo}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* ── Footer ─────────────────────────────────────── */}
            <Divider sx={{ borderColor: BORDER, mt: 2 }} />
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Typography variant="caption" sx={{ color: '#828C9B', fontStyle: 'italic', fontSize: '0.62rem' }}>
                This document is computer generated. No manual signature required unless specified.
              </Typography>
              <Typography variant="caption" display="block" sx={{ color: '#828C9B', fontSize: '0.6rem', mt: 0.3 }}>
                Generated: {new Date().toLocaleString('en-IN')} · OPD Card: {appointment?.opdCardNumber || '—'}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BORDER}`, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {prescriptions.length > 0 && (
            <Button size="small" startIcon={<RxIcon sx={{ fontSize: 14 }} />} onClick={handleDownloadPrescription}
              sx={{ textTransform: 'none', fontSize: '0.72rem', color: NAVY }}>
              Prescription
            </Button>
          )}
          {enc?.billing && enc.billing.paymentCollected > 0 && (
            <Button size="small" startIcon={<ReceiptIcon sx={{ fontSize: 14 }} />} onClick={handleDownloadReceipt}
              sx={{ textTransform: 'none', fontSize: '0.72rem', color: NAVY }}>
              Receipt
            </Button>
          )}
          {enc && (enc.finalDiagnosis || enc.diagnosis) && (
            <Button size="small" startIcon={<SummaryIcon sx={{ fontSize: 14 }} />} onClick={handleDownloadVisitSummary}
              sx={{ textTransform: 'none', fontSize: '0.72rem', color: NAVY }}>
              Visit Summary
            </Button>
          )}
        </Box>
        <Button onClick={onClose} size="small">
          Close
            </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OPDCardDialog;
