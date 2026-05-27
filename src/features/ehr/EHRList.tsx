import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, CircularProgress, Alert,
  Grid, Card, CardContent, alpha, TextField, InputAdornment, Avatar,
  Dialog, DialogTitle, DialogContent, Button,
} from '@mui/material';
import {
  Search, Person, Visibility, Assignment, HealthAndSafety,
  CalendarToday, MedicalInformation, Medication, CheckCircle,
  HowToReg, Close as CloseIcon, FiberManualRecord,
  MonitorHeart, Science, LocalHospital, Payments,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format, differenceInYears } from 'date-fns';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ehrService from '../../services/ehrService';
import { generatePatientReport } from '../../utils/patientReportGenerator';
import documentService from '../../services/documentService';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | 'REGISTRATION'
  | 'APPOINTMENT'
  | 'CHECK_IN'
  | 'VITALS'
  | 'CONSULTATION'
  | 'LAB_ORDER'
  | 'INVESTIGATION'
  | 'PRESCRIPTION'
  | 'PAYMENT';

interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  description: string;
  status?: string;
  data: any;
}

interface PatientSummary {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob?: string;
  mobile: string;
  bloodGroup?: string;
  createdAt: string;
  abhaRecord?: { abhaAddress?: string; abhaNumber?: string };
  _count: {
    appointments:   number;
    encounters:     number;
    prescriptions:  number;
    vitals:         number;
    investigations: number;
    payments:       number;
  };
  appointments: any[];
  encounters:   any[];
}

// ─── Event config (color / icon / background for each type) ───────────────────

const EVENT_CONFIG: Record<EventType, { color: string; icon: React.ReactNode; bg: string; label: string }> = {
  REGISTRATION:  { color: '#1a3c6e', bg: '#e8eef7', icon: <HowToReg    fontSize="small" />, label: 'Registration'  },
  APPOINTMENT:   { color: '#e67e22', bg: '#fef3e3', icon: <CalendarToday fontSize="small" />, label: 'Appointment'   },
  CHECK_IN:      { color: '#27ae60', bg: '#e8f8ed', icon: <CheckCircle  fontSize="small" />, label: 'Check-in'      },
  VITALS:        { color: '#2980b9', bg: '#eaf4fb', icon: <MonitorHeart fontSize="small" />, label: 'Vitals'        },
  CONSULTATION:  { color: '#8e44ad', bg: '#f3e8fb', icon: <MedicalInformation fontSize="small" />, label: 'Consultation'  },
  LAB_ORDER:     { color: '#d35400', bg: '#fdebd0', icon: <Science      fontSize="small" />, label: 'Lab Order'     },
  INVESTIGATION: { color: '#16a085', bg: '#e4f5f2', icon: <LocalHospital fontSize="small" />, label: 'Investigation' },
  PRESCRIPTION:  { color: '#27ae60', bg: '#e8f8ed', icon: <Medication   fontSize="small" />, label: 'Prescription'  },
  PAYMENT:       { color: '#7f8c8d', bg: '#f2f3f4', icon: <Payments     fontSize="small" />, label: 'Payment'       },
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   '#4A90E2',
  IN_PROGRESS: '#F39C12',
  COMPLETED:   '#50C878',
  CANCELLED:   '#E74C3C',
  PENDING:     '#F39C12',
  ORDERED:     '#8e44ad',
  COLLECTED:   '#2980b9',
  REPORTED:    '#27ae60',
  PAID:        '#27ae60',
  PARTIAL:     '#F39C12',
  UNPAID:      '#E74C3C',
};

// ─── Vitals detail rows ───────────────────────────────────────────────────────

const VitalsDetail: React.FC<{ data: any }> = ({ data }) => {
  const rows = [
    ['Temperature',    data.temperature      ? `${data.temperature} °F`                   : null],
    ['Blood Pressure', data.bloodPressureSystolic && data.bloodPressureDiastolic
      ? `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic} mmHg` : null],
    ['Heart Rate',     data.heartRate         ? `${data.heartRate} bpm`                   : null],
    ['Resp. Rate',     data.respiratoryRate   ? `${data.respiratoryRate} breaths/min`      : null],
    ['SpO₂',          data.oxygenSaturation  ? `${data.oxygenSaturation}%`                : null],
    ['Weight',         data.weight            ? `${data.weight} kg`                        : null],
    ['Height',         data.height            ? `${data.height} cm`                        : null],
    ['BMI',            data.bmi               ? `${data.bmi}`                              : null],
    ['Recorded by',    data.recordedBy        || null],
    ['Notes',          data.notes             || null],
  ].filter(([, v]) => v);

  return (
    <Grid container spacing={1}>
      {rows.map(([label, value]) => (
        <Grid item xs={6} key={label as string}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
          <Typography variant="body2">{value}</Typography>
        </Grid>
      ))}
    </Grid>
  );
};

// ─── Timeline event card ─────────────────────────────────────────────────────

const EventCard: React.FC<{ event: TimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.CONSULTATION;
  const [open, setOpen] = useState(false);

  const canExpand =
    event.type === 'CONSULTATION' ||
    event.type === 'VITALS' ||
    event.type === 'LAB_ORDER' ||
    event.type === 'INVESTIGATION' ||
    event.type === 'PAYMENT' ||
    (event.type === 'PRESCRIPTION' && (event.data?.medications?.length ?? 0) > 0);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
        {/* ── Timeline spine ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: cfg.bg, color: cfg.color, border: `2px solid ${cfg.color}` }}>
            {cfg.icon}
          </Avatar>
          {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: '#e0e7ef', mt: 0.5, minHeight: 20 }} />}
        </Box>

        {/* ── Card body ── */}
        <Paper
          elevation={0}
          sx={{
            flex: 1, mb: isLast ? 0 : 2, p: 1.5,
            border: `1px solid ${alpha(cfg.color, 0.18)}`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 2,
            bgcolor: alpha(cfg.bg, 0.4),
            cursor: canExpand ? 'pointer' : 'default',
            '&:hover': canExpand ? { boxShadow: `0 2px 10px ${alpha(cfg.color, 0.15)}` } : {},
          }}
          onClick={() => canExpand && setOpen(true)}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={700} color={cfg.color}>{event.title}</Typography>
                {event.status && (
                  <Chip
                    label={event.status.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      height: 18, fontSize: 10,
                      bgcolor: alpha(STATUS_COLOR[event.status] ?? cfg.color, 0.12),
                      color: STATUS_COLOR[event.status] ?? cfg.color,
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">{event.description}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {format(new Date(event.date), 'dd MMM yyyy')}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {format(new Date(event.date), 'hh:mm a')}
              </Typography>
            </Box>
          </Box>

          {/* ── Inline preview: vitals ── */}
          {event.type === 'VITALS' && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {event.data.bloodPressureSystolic && (
                <Typography variant="caption" color={cfg.color} fontWeight={600}>
                  BP {event.data.bloodPressureSystolic}/{event.data.bloodPressureDiastolic}
                </Typography>
              )}
              {event.data.heartRate && (
                <Typography variant="caption" color={cfg.color} fontWeight={600}>
                  ♥ {event.data.heartRate} bpm
                </Typography>
              )}
              {event.data.oxygenSaturation && (
                <Typography variant="caption" color={cfg.color} fontWeight={600}>
                  SpO₂ {event.data.oxygenSaturation}%
                </Typography>
              )}
              {event.data.temperature && (
                <Typography variant="caption" color={cfg.color} fontWeight={600}>
                  {event.data.temperature}°F
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>click to expand</Typography>
            </Box>
          )}

          {/* ── Inline preview: prescription ── */}
          {event.type === 'PRESCRIPTION' && Array.isArray(event.data?.medications) && event.data.medications.length > 0 && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              {event.data.medications.slice(0, 2).map((m: any, i: number) => (
                <Typography key={i} variant="caption" display="block" color="text.secondary">
                  • {m.name || m.medicineName}  {m.dosage}  {m.frequency}  {m.duration}
                </Typography>
              ))}
              {event.data.medications.length > 2 && (
                <Typography variant="caption" color="text.disabled">
                  +{event.data.medications.length - 2} more medicines — click to expand
                </Typography>
              )}
            </Box>
          )}

          {/* ── Inline preview: consultation summary ── */}
          {event.type === 'CONSULTATION' && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {event.data?.prescriptions?.length > 0 && (
                <Chip label={`${event.data.prescriptions.length} Rx`} size="small"
                  sx={{ height: 18, fontSize: 10, bgcolor: alpha('#27ae60', 0.1), color: '#27ae60' }} />
              )}
              {event.data?.labOrders?.length > 0 && (
                <Chip label={`${event.data.labOrders.length} Lab`} size="small"
                  sx={{ height: 18, fontSize: 10, bgcolor: alpha('#d35400', 0.1), color: '#d35400' }} />
              )}
              {event.data?.admissionRequired && (
                <Chip label="Admission Required" size="small" color="error"
                  sx={{ height: 18, fontSize: 10 }} />
              )}
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>click to expand</Typography>
            </Box>
          )}

          {/* ── Inline preview: lab order result ── */}
          {(event.type === 'LAB_ORDER' || event.type === 'INVESTIGATION') && event.data?.results && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Result: </Typography>
              <Typography variant="caption" color="text.primary">{String(event.data.results).slice(0, 120)}</Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Detail dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: cfg.color, color: 'white', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {cfg.icon}
            <Typography variant="h6">{event.title}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1.5 }}>
            {format(new Date(event.date), 'EEEE, dd MMMM yyyy  hh:mm a')}
          </Typography>

          {/* VITALS detail */}
          {event.type === 'VITALS' && <VitalsDetail data={event.data} />}

          {/* CONSULTATION detail */}
          {event.type === 'CONSULTATION' && (
            <Grid container spacing={1.5}>
              {event.data?.chiefComplaint && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>CHIEF COMPLAINT</Typography>
                  <Typography variant="body2">{event.data.chiefComplaint}</Typography>
                </Grid>
              )}
              {event.data?.historyOfPresentIllness && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>HISTORY OF PRESENT ILLNESS</Typography>
                  <Typography variant="body2">{event.data.historyOfPresentIllness}</Typography>
                </Grid>
              )}
              {event.data?.physicalExamination && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>PHYSICAL EXAMINATION</Typography>
                  <Typography variant="body2">{event.data.physicalExamination}</Typography>
                </Grid>
              )}
              {event.data?.provisionalDiagnosis && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>PROVISIONAL DIAGNOSIS</Typography>
                  <Typography variant="body2">{event.data.provisionalDiagnosis}</Typography>
                </Grid>
              )}
              {event.data?.finalDiagnosis && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>FINAL DIAGNOSIS</Typography>
                  <Typography variant="body2">{event.data.finalDiagnosis}</Typography>
                </Grid>
              )}
              {event.data?.prescriptions?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>PRESCRIPTIONS</Typography>
                  {event.data.prescriptions.map((rx: any, i: number) => (
                    <Typography key={i} variant="body2">
                      • {rx.medicineName} — {rx.dosage}, {rx.frequency}, {rx.duration}
                      {rx.instructions ? ` (${rx.instructions})` : ''}
                    </Typography>
                  ))}
                </Grid>
              )}
              {event.data?.labOrders?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>LAB ORDERS</Typography>
                  {event.data.labOrders.map((o: any, i: number) => (
                    <Typography key={i} variant="body2">
                      • {o.testName}  [{o.testType || 'Lab'}]  — {o.status || 'Pending'}
                    </Typography>
                  ))}
                </Grid>
              )}
              {event.data?.followUpDate && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>FOLLOW-UP DATE</Typography>
                  <Typography variant="body2">{format(new Date(event.data.followUpDate), 'dd MMM yyyy')}</Typography>
                </Grid>
              )}
              {event.data?.notes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>NOTES</Typography>
                  <Typography variant="body2">{event.data.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}

          {/* LAB ORDER detail */}
          {event.type === 'LAB_ORDER' && (
            <Grid container spacing={1.5}>
              {[
                ['Test Name',   event.data?.testName],
                ['Test Type',   event.data?.testType],
                ['Priority',    event.data?.priority],
                ['Status',      event.data?.status],
                ['Order ID',    event.data?.orderId],
                ['Completed',   event.data?.completedAt ? format(new Date(event.data.completedAt), 'dd MMM yyyy') : null],
              ].filter(([, v]) => v).map(([l, v]) => (
                <Grid item xs={6} key={l as string}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{l}</Typography>
                  <Typography variant="body2">{v}</Typography>
                </Grid>
              ))}
              {event.data?.results && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>RESULTS</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{String(event.data.results)}</Typography>
                </Grid>
              )}
              {event.data?.resultNotes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>RESULT NOTES</Typography>
                  <Typography variant="body2">{event.data.resultNotes}</Typography>
                </Grid>
              )}
            </Grid>
          )}

          {/* INVESTIGATION detail */}
          {event.type === 'INVESTIGATION' && (
            <Grid container spacing={1.5}>
              {[
                ['Test Name',       event.data?.testName],
                ['Test Type',       event.data?.testType],
                ['Status',          event.data?.status],
                ['Priority',        event.data?.priority],
                ['Instructions',    event.data?.instructions],
                ['Sample Collected', event.data?.sampleCollectedAt ? format(new Date(event.data.sampleCollectedAt), 'dd MMM yyyy') : null],
                ['Reported At',     event.data?.reportedAt        ? format(new Date(event.data.reportedAt), 'dd MMM yyyy')         : null],
                ['Doctor',          event.data?.doctor ? `Dr. ${event.data.doctor.firstName} ${event.data.doctor.lastName}` : null],
              ].filter(([, v]) => v).map(([l, v]) => (
                <Grid item xs={6} key={l as string}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{l}</Typography>
                  <Typography variant="body2">{v}</Typography>
                </Grid>
              ))}
              {event.data?.results && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>RESULTS</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{String(event.data.results)}</Typography>
                </Grid>
              )}
              {event.data?.reportUrl && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>REPORT</Typography>
                  <Typography variant="body2" component="a" href={event.data.reportUrl} target="_blank" rel="noreferrer">
                    View Report
                  </Typography>
                </Grid>
              )}
              {event.data?.notes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>NOTES</Typography>
                  <Typography variant="body2">{event.data.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}

          {/* PRESCRIPTION detail */}
          {event.type === 'PRESCRIPTION' && (
            <Grid container spacing={1.5}>
              {event.data?.diagnosis && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>DIAGNOSIS</Typography>
                  <Typography variant="body2">{event.data.diagnosis}</Typography>
                </Grid>
              )}
              {event.data?.doctor && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>DOCTOR</Typography>
                  <Typography variant="body2">Dr. {event.data.doctor.firstName} {event.data.doctor.lastName}</Typography>
                </Grid>
              )}
              {event.data?.medications?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>MEDICINES</Typography>
                  {event.data.medications.map((m: any, i: number) => (
                    <Box key={i} sx={{ mb: 0.5, p: 1, bgcolor: alpha('#27ae60', 0.06), borderRadius: 1, border: '1px solid', borderColor: alpha('#27ae60', 0.2) }}>
                      <Typography variant="body2" fontWeight={600}>{m.name || m.medicineName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join('  ·  ')}
                      </Typography>
                    </Box>
                  ))}
                </Grid>
              )}
              {event.data?.validUntil && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>VALID UNTIL</Typography>
                  <Typography variant="body2">{format(new Date(event.data.validUntil), 'dd MMM yyyy')}</Typography>
                </Grid>
              )}
              {event.data?.notes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>NOTES</Typography>
                  <Typography variant="body2">{event.data.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}

          {/* PAYMENT detail */}
          {event.type === 'PAYMENT' && (
            <Grid container spacing={1.5}>
              {[
                ['Amount',          event.data?.amount !== undefined ? `₹ ${event.data.amount}` : null],
                ['Method',          event.data?.paymentMethod],
                ['Status',          event.data?.status],
                ['Transaction ID',  event.data?.transactionId],
                ['Receipt No.',     event.data?.receiptNumber],
                ['Description',     event.data?.description],
              ].filter(([, v]) => v).map(([l, v]) => (
                <Grid item xs={6} key={l as string}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>{l}</Typography>
                  <Typography variant="body2">{v}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Patient EHR dialog (full timeline) ──────────────────────────────────────

const PatientEHRDialog: React.FC<{
  patient: PatientSummary;
  open: boolean;
  onClose: () => void;
}> = ({ patient, open, onClose }) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState<string>('ALL');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFilter('ALL');
    ehrService
      .getPatientEHR(patient.id)
      .then((res: any) => {
        const data = res.data?.data || res.data;
        setTimeline(data?.timeline || []);
        setSummary(data?.summary);
      })
      .catch(() => toast.error('Failed to load EHR timeline'))
      .finally(() => setLoading(false));
  }, [open, patient.id]);

  const authUserInDialog = useSelector((state: any) => state.auth?.user);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const ehrRes = await ehrService.getPatientEHR(patient.id) as any;
      const ehrData    = ehrRes.data?.data || ehrRes.data || {};
      const hospitalInfo = ehrData.hospital ?? {};

      const ehrB64 = generatePatientReport({
        hospital:    hospitalInfo,
        patient:     patient as any,
        timeline:    ehrData.timeline ?? timeline,
        summary:     ehrData.summary  ?? summary ?? {
          totalAppointments: 0, totalEncounters: 0, totalPrescriptions: 0,
          totalVitals: 0, totalInvestigations: 0, totalLabOrders: 0,
          totalPayments: 0, lastVisit: null,
        },
        generatedBy: authUserInDialog?.name,
      });
      documentService.persistDocument({ patientId: patient.id, type: 'EHR_REPORT', content: ehrB64 }).catch(() => {});
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const age = patient.dob ? differenceInYears(new Date(), new Date(patient.dob)) : 'N/A';

  const FILTERS: { label: string; value: string }[] = [
    { label: 'All',            value: 'ALL'           },
    { label: 'Appointments',   value: 'APPOINTMENT'   },
    { label: 'Check-ins',      value: 'CHECK_IN'      },
    { label: 'Vitals',         value: 'VITALS'        },
    { label: 'Consultations',  value: 'CONSULTATION'  },
    { label: 'Lab Orders',     value: 'LAB_ORDER'     },
    { label: 'Investigations', value: 'INVESTIGATION' },
    { label: 'Prescriptions',  value: 'PRESCRIPTION'  },
    { label: 'Payments',       value: 'PAYMENT'       },
  ];

  const filtered = filter === 'ALL'
    ? timeline
    : timeline.filter((e) => e.type === filter);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      {/* ── Dialog header ── */}
      <DialogTitle sx={{ bgcolor: '#1a3c6e', color: 'white', py: 1.5, px: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{patient.firstName} {patient.lastName}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {patient.uhid}  ·  {age} yrs  ·  {patient.gender}
              {patient.bloodGroup ? `  ·  ${patient.bloodGroup}` : ''}
              {patient.abhaRecord?.abhaAddress ? `  ·  ABHA: ${patient.abhaRecord.abhaAddress}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Tooltip title="Download Consolidated Health Record (PDF)">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={downloadingReport ? <CircularProgress size={13} color="inherit" /> : <DownloadIcon />}
                  onClick={handleDownloadReport}
                  disabled={downloadingReport || loading}
                  sx={{
                    color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: 11,
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
                    '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  {downloadingReport ? 'Generating…' : 'Health Record'}
                </Button>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* ── Summary pills + filters ── */}
      <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5, bgcolor: '#f5f7fa', borderBottom: '1px solid', borderColor: 'divider' }}>
        {summary && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
            {[
              { label: 'Appointments',   value: summary.totalAppointments,   color: '#e67e22' },
              { label: 'Consultations',  value: summary.totalEncounters,     color: '#8e44ad' },
              { label: 'Prescriptions',  value: summary.totalPrescriptions,  color: '#27ae60' },
              { label: 'Vitals',         value: summary.totalVitals,         color: '#2980b9' },
              { label: 'Lab Orders',     value: summary.totalLabOrders,      color: '#d35400' },
              { label: 'Investigations', value: summary.totalInvestigations, color: '#16a085' },
              { label: 'Payments',       value: summary.totalPayments,       color: '#7f8c8d' },
              {
                label: 'Last Visit',
                value: summary.lastVisit ? format(new Date(summary.lastVisit), 'dd MMM yy') : 'Never',
                color: '#1a3c6e',
              },
            ].map((s) => (
              <Box key={s.label} sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.25, py: 0.4, borderRadius: 2,
                bgcolor: alpha(s.color, 0.1), border: `1px solid ${alpha(s.color, 0.25)}`,
              }}>
                <FiberManualRecord sx={{ fontSize: 8, color: s.color }} />
                <Typography variant="caption" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Type filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} size="small"
              onClick={() => setFilter(f.value)}
              color={filter === f.value ? 'primary' : 'default'}
              variant={filter === f.value ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontSize: 11 }}
            />
          ))}
        </Box>
      </Box>

      {/* ── Timeline ── */}
      <DialogContent sx={{ px: 2.5, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No records found for this filter</Typography>
          </Box>
        ) : (
          filtered.map((event, idx) => (
            <EventCard key={event.id} event={event} isLast={idx === filtered.length - 1} />
          ))
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main EHR List page ───────────────────────────────────────────────────────

const EHRList: React.FC = () => {
  const authUser = useSelector((state: any) => state.auth?.user);
  const [patients,         setPatients]         = useState<PatientSummary[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [search,           setSearch]           = useState('');
  const [selectedPatient,  setSelectedPatient]  = useState<PatientSummary | null>(null);
  const [downloadingId,    setDownloadingId]    = useState<string | null>(null);

  // Quick download from table row — hospital info comes from the EHR response (no separate call)
  const handleQuickDownload = async (patient: PatientSummary) => {
    setDownloadingId(patient.id);
    try {
      const ehrRes   = await ehrService.getPatientEHR(patient.id) as any;
      const ehrData  = ehrRes.data?.data || ehrRes.data || {};
      const quickB64 = generatePatientReport({
        hospital:    ehrData.hospital ?? {},
        patient:     patient as any,
        timeline:    ehrData.timeline ?? [],
        summary:     ehrData.summary  ?? {
          totalAppointments: 0, totalEncounters: 0, totalPrescriptions: 0,
          totalVitals: 0, totalInvestigations: 0, totalLabOrders: 0,
          totalPayments: 0, lastVisit: null,
        },
        generatedBy: authUser?.name,
      });
      documentService.persistDocument({ patientId: patient.id, type: 'EHR_REPORT', content: quickB64 }).catch(() => {});
      toast.success('Health record downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchPatients = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await ehrService.getPatientList(q) as any;
      const list = res.data?.data || res.data || [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, fetchPatients]);

  const totalPatients     = patients.length;
  const withEncounters    = patients.filter((p) => (p._count?.encounters    ?? 0) > 0).length;
  const withPrescriptions = patients.filter((p) => (p._count?.prescriptions ?? 0) > 0).length;
  const withVitals        = patients.filter((p) => (p._count?.vitals        ?? 0) > 0).length;

  return (
    <Box>
      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <HealthAndSafety sx={{ color: '#1a3c6e', fontSize: 32 }} />
            <Typography variant="h4" fontWeight={800} color="#1a3c6e">
              Electronic Health Records
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Complete patient health history — appointments, consultations, vitals, lab orders, investigations, prescriptions &amp; payments
          </Typography>
          {authUser?.hospitalId && (
            <Chip label="ABHA Sync Ready" size="small" color="success" variant="outlined"
              sx={{ mt: 0.75, fontSize: 11 }} />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Summary cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Patients',     value: totalPatients,     color: '#1a3c6e', icon: <Person /> },
          { label: 'With Consultations', value: withEncounters,    color: '#8e44ad', icon: <MedicalInformation /> },
          { label: 'With Prescriptions', value: withPrescriptions, color: '#27ae60', icon: <Medication /> },
          { label: 'Vitals Recorded',    value: withVitals,        color: '#2980b9', icon: <MonitorHeart /> },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha(s.color, 0.08)}, ${alpha(s.color, 0.02)})`,
              border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3,
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                <Box sx={{ bgcolor: s.color, borderRadius: 2, p: 1, color: 'white' }}>{s.icon}</Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Search ── */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <TextField fullWidth size="small"
          placeholder="Search by name, UHID, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* ── Patient table ── */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                {['Patient', 'UHID / ABHA', 'Age / Gender', 'Contact', 'Last Visit', 'Records', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 6 }}>
                      <HealthAndSafety sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No patient records found</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((p) => {
                  const age      = p.dob ? differenceInYears(new Date(), new Date(p.dob)) : '—';
                  const lastAppt = p.appointments?.[0];
                  const lastEnc  = p.encounters?.[0];
                  const apptColor = STATUS_COLOR[lastAppt?.status] ?? '#999';
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: '#1a3c6e', fontSize: 13 }}>
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{p.firstName} {p.lastName}</Typography>
                            {p.bloodGroup && (
                              <Chip label={p.bloodGroup} size="small" color="error" variant="outlined"
                                sx={{ height: 16, fontSize: 10 }} />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">{p.uhid}</Typography>
                        {p.abhaRecord?.abhaAddress && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ABHA: {p.abhaRecord.abhaAddress}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{age} yrs / {p.gender}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{p.mobile}</Typography>
                      </TableCell>
                      <TableCell>
                        {lastAppt ? (
                          <>
                            <Typography variant="body2">
                              {format(new Date(lastAppt.scheduledAt), 'dd MMM yy')}
                            </Typography>
                            <Chip label={lastAppt.status} size="small"
                              sx={{ height: 16, fontSize: 10, bgcolor: alpha(apptColor, 0.1), color: apptColor }} />
                          </>
                        ) : (
                          <Typography variant="caption" color="text.disabled">No visits</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Record count chips from DB counts */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {[
                            { label: `${p._count?.appointments   ?? 0} Appts`,    color: '#e67e22' },
                            { label: `${p._count?.encounters      ?? 0} Consults`, color: '#8e44ad' },
                            { label: `${p._count?.prescriptions   ?? 0} Rx`,       color: '#27ae60' },
                            { label: `${p._count?.vitals          ?? 0} Vitals`,   color: '#2980b9' },
                            { label: `${p._count?.investigations  ?? 0} Labs`,     color: '#16a085' },
                          ].map((tag) => (
                            <Chip key={tag.label} label={tag.label} size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: alpha(tag.color, 0.1), color: tag.color }} />
                          ))}
                        </Box>
                        {/* Last diagnosis snippet */}
                        {(lastEnc?.finalDiagnosis || lastEnc?.diagnosis) && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block', mt: 0.25 }}>
                            Dx: {lastEnc.finalDiagnosis || lastEnc.diagnosis}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Full EHR Timeline">
                            <IconButton size="small" color="primary" onClick={() => setSelectedPatient(p)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download Consolidated Health Record PDF">
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                disabled={downloadingId === p.id}
                                onClick={() => handleQuickDownload(p)}
                              >
                                {downloadingId === p.id
                                  ? <CircularProgress size={14} />
                                  : <DownloadIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* ── Timeline dialog ── */}
      {selectedPatient && (
        <PatientEHRDialog
          patient={selectedPatient}
          open={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </Box>
  );
};

export default EHRList;
