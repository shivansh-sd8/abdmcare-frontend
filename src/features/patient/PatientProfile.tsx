import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Grid, Card, CardContent, Chip, Avatar,
  Table, TableBody, TableCell, TableHead, TableRow, Button,
  Skeleton, Alert, IconButton, Tooltip, alpha, Divider, LinearProgress,
  CircularProgress, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField, FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  Person, LocalHospital, MonitorHeart, Receipt,
  Hotel, HealthAndSafety, CalendarToday, Phone, Bloodtype,
  ArrowBack, EventAvailable, TrendingUp, Home,
  ExpandMore, ExpandLess, Download, Verified, Description,
  Assignment, CloudDownload, Link as LinkIcon, AddCircleOutline,
  Block, PersonAdd,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import ehrService from '../../services/ehrService';
import ipdService from '../../services/ipdService';
import { toast } from 'react-toastify';
import { generateOPDCardPDF, generateReceiptPDF, generatePrescriptionPDF, generateVisitSummaryPDF } from '../../utils/pdfGenerator';
import { generateLabReport } from '../../utils/labReportGenerator';
import { generateDischargeSummaryPDF } from '../../utils/dischargeSummaryGenerator';
import { generateAdmissionSummary } from '../../utils/admissionSummaryGenerator';
import { generateGatePass } from '../../utils/gatePassGenerator';
import { generateIPDBill } from '../../utils/ipdBillGenerator';
import { generatePatientReport } from '../../utils/patientReportGenerator';
import documentService from '../../services/documentService';
import FederatedRecords from '../hiu/FederatedRecords';
import ConsentStatusChip from '../../components/ConsentStatusChip';
import hipService from '../../services/hipService';
import consentService from '../../services/consentService';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>{value === index && children}</Box>
);

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: any) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const currency = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

// ── Care Contexts Section (direct API, not via encounters join) ───────────────

const CareContextsSection: React.FC<{ patientId: string; refreshKey: any }> = ({ patientId, refreshKey }) => {
  const [contexts, setContexts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    hipService.getCareContexts(patientId)
      .then((res: any) => {
        // api.get() unwraps response.data, so res = { success, message, data: [...] }
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setContexts(list);
      })
      .catch(() => setContexts([]))
      .finally(() => setLoading(false));
  }, [patientId, refreshKey]);

  if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={20} /></Box>;

  return (
    <SectionCard title="Linked Care Contexts">
      {contexts.length === 0
        ? <EmptyState icon={<LinkIcon />} message="No care contexts yet — click 'Link Care Contexts' above" small />
        : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {contexts.map((cc: any) => (
              <Box key={cc.careContextId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{cc.display}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{cc.careContextId}</Typography>
                  <Typography variant="caption" color="text.secondary">HIP: {cc.hipId}</Typography>
                </Box>
                <Chip
                  size="small"
                  label={cc.linkStatus}
                  color={cc.linkStatus === 'LINKED' ? 'success' : cc.linkStatus === 'FAILED' ? 'error' : 'warning'}
                  variant={cc.linkStatus === 'LINKED' ? 'filled' : 'outlined'}
                />
              </Box>
            ))}
          </Box>
        )
      }
    </SectionCard>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const HI_TYPES = ['OPConsultation', 'Prescription', 'DiagnosticReport', 'DischargeSummary', 'ImmunizationRecord', 'HealthDocumentRecord'];

const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Link Care Contexts dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);

  // Request Consent dialog
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentForm, setConsentForm] = useState({
    purpose: 'CAREMGT',
    hiTypes: ['OPConsultation', 'Prescription', 'DiagnosticReport'],
    dateRangeFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateRangeTo: new Date(Date.now() - 60 * 1000).toISOString().split('T')[0], // yesterday-safe: today minus 1 min
  });

  useEffect(() => { if (id) fetchProfile(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try { setLoading(true); const res: any = await ehrService.getPatientProfile(id!); setData(res.data?.data || res.data); }
    catch { toast.error('Failed to load patient profile'); }
    finally { setLoading(false); }
  };

  const handleLinkCareContexts = async () => {
    const patient = data?.patient;
    if (!patient) return;
    setLinkingLoading(true);
    try {
      const allEncounters = data?.encounters || [];
      const unlinked = allEncounters.filter((e: any) => !e.careContext || e.careContext?.linkStatus !== 'LINKED');
      if (unlinked.length === 0) { toast.info('All encounters are already linked'); setLinkDialogOpen(false); return; }
      const careContexts = unlinked.map((e: any) => ({
        encounterId: e.id,
        display: `${e.type === 'IPD' ? 'IPD' : 'OPD'} Visit - ${fmt(e.visitDate || e.createdAt)}`,
      }));
      const res: any = await hipService.addCareContexts(patient.id, careContexts);
      const msg = res?.data?.message || '';
      if (msg.toLowerCase().includes('awaiting') || msg.toLowerCase().includes('pending')) {
        toast.info(`${careContexts.length} care context(s) registered — ABDM confirmation pending`);
      } else {
        toast.success(msg || `${careContexts.length} care context(s) linked to ABDM`);
      }

      // NOTE: We deliberately do NOT call link/context/notify from here.
      // Linking is completed entirely server-side via the ABDM token flow
      // (generate-token → on-generate-token → link/carecontext → on_carecontext).
      // The backend fires link/context/notify only AFTER on_carecontext confirms
      // a link exists. Calling notify here — before any link exists — made ABDM
      // return "ABDM-1006: No links found for the patient in the given HIP".

      setLinkDialogOpen(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to link care contexts');
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    const patient = data?.patient;
    if (!patient) return;
    const abhaId = patient.abhaRecord?.abhaAddress || patient.abhaAddress
      || patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId;
    if (!abhaId) { toast.error('Patient has no ABHA — cannot request consent'); return; }
    setConsentLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const requesterName = userData?.name
        || [userData?.firstName, userData?.lastName].filter(Boolean).join(' ').trim()
        || 'Doctor';
      const requesterId = userData?.hprId || userData?.registrationNo || userData?.id || 'DOCTOR';
      await consentService.createConsentRequest({
        patientAbhaId: abhaId,
        purpose: consentForm.purpose,
        hiTypes: consentForm.hiTypes,
        dateRangeFrom: consentForm.dateRangeFrom,
        dateRangeTo: consentForm.dateRangeTo,
        requesterName,
        requesterId,
      });
      toast.success('Consent request sent — patient will be notified on ABHA app');
      setConsentDialogOpen(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send consent request');
    } finally {
      setConsentLoading(false);
    }
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} /><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} /></Box>;
  if (!data) return <Box sx={{ p: 3 }}><Alert severity="error">Patient not found</Alert><Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button></Box>;

  const { patient, summary, billingOverview, chargeItems, latestVitals, activeAdmission, pendingAdmissionRecommendation, encounters, prescriptions, vitals, investigations, admissions, consents, appointments } = data;
  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : null;
  const address = patient.address
    ? typeof patient.address === 'object'
      ? [
          patient.address.line || patient.address.line1,
          patient.address.line2,
          patient.address.district,
          patient.address.city,
          patient.address.state,
          patient.address.pincode,
        ].filter(Boolean).join(', ')
      : patient.address
    : null;
  const emergencyContact = patient.emergencyContact && typeof patient.emergencyContact === 'object'
    ? patient.emergencyContact
    : null;

  const isMale = patient.gender === 'Male';
  const accent = isMale ? '#0EA5E9' : '#A855F7';

  return (
    <Box>
      {/* ── Header ── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.25,
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(accent, 0.06)} 0%, ${alpha(accent, 0)} 60%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            insetInline: 0, top: 0, height: 3,
            background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0)})`,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              bgcolor: alpha(accent, 0.08),
              color: accent,
              border: `1px solid ${alpha(accent, 0.18)}`,
              '&:hover': { bgcolor: alpha(accent, 0.14) },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Avatar
            sx={{
              width: 64, height: 64,
              fontSize: '1.4rem',
              bgcolor: alpha(accent, 0.16),
              color: accent,
              border: `2px solid ${alpha(accent, 0.32)}`,
              boxShadow: `0 8px 18px ${alpha(accent, 0.22)}`,
            }}
          >
            {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>
              <Chip label={patient.uhid} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
              {patient.gender && (
                <Chip label={`${patient.gender.toUpperCase()}${age != null ? `, ${age}y` : ''}`} size="small" sx={{ fontWeight: 600 }} />
              )}
              {patient.bloodGroup && (
                <Chip icon={<Bloodtype sx={{ fontSize: 14 }} />} label={patient.bloodGroup} size="small" color="error" variant="outlined" />
              )}
              <Chip icon={<Phone sx={{ fontSize: 14 }} />} label={patient.mobile} size="small" variant="outlined" />
              {(patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId) && (
                <Chip
                  icon={<Verified sx={{ fontSize: 14 }} />}
                  label={`ABHA: ${patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId}`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<EventAvailable />}
            onClick={() => navigate('/app/appointments/schedule', { state: { patientId: patient.id } })}
          >
            Book Appointment
          </Button>
        </Box>
      </Paper>

      {activeAdmission && (
        <Alert
          severity={activeAdmission.status === 'DISCHARGE_READY' ? 'info' : 'warning'}
          icon={<Hotel />}
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/app/ipd?openId=${activeAdmission.id}`)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Open admission
            </Button>
          }
        >
          <strong>
            {activeAdmission.status === 'DISCHARGE_READY' ? 'Ready for discharge' : 'Currently admitted'}
          </strong>
          {' — '}
          {activeAdmission.admissionNumber}
          {activeAdmission.ward?.name ? ` | Ward: ${activeAdmission.ward.name}` : ''}
          {activeAdmission.bed?.bedNumber ? ` | Bed: ${activeAdmission.bed.bedNumber}` : ''}
          {activeAdmission.admittedAt ? ` | Since ${fmtTime(activeAdmission.admittedAt)}` : ''}
        </Alert>
      )}

      {/* Doctor recommended admission, but the patient hasn't been admitted
          yet. Surfaces the doctor's reason and a one-click "Admit now" CTA so
          admin/receptionist can act without hunting through encounters. */}
      {!activeAdmission && pendingAdmissionRecommendation && (
        <Alert
          severity="warning"
          icon={<Hotel />}
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => {
                const enc = pendingAdmissionRecommendation;
                const qs = new URLSearchParams({
                  admit: '1',
                  patientId: patient.id,
                  encounterId: enc.id || '',
                  patientName: `${patient.firstName} ${patient.lastName} (${patient.uhid || ''})`.trim(),
                  diagnosis: enc.finalDiagnosis || enc.provisionalDiagnosis || enc.diagnosis || '',
                  reason: enc.admissionReason || '',
                }).toString();
                navigate(`/app/ipd?${qs}`);
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Admit now
            </Button>
          }
        >
          <strong>Admission recommended</strong>
          {pendingAdmissionRecommendation.admissionReason
            ? ` — ${pendingAdmissionRecommendation.admissionReason}`
            : ' — by the consulting doctor.'}
        </Alert>
      )}

      {/*
        ABDM lifecycle banner — when the CM has informed us that the patient
        deactivated or deleted their PHR (via /api/v3/patients/status/notify),
        AbhaRecord.profileStatus moves out of ACTIVE. Surface this prominently
        because:
          • We can no longer push new health data for this patient
          • All existing care contexts are unlinked
          • Any open consents have been auto-revoked + records purged
      */}
      {patient.abhaRecord?.profileStatus && patient.abhaRecord.profileStatus !== 'ACTIVE' && (
        <Alert severity="error" icon={<Block />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>ABHA {patient.abhaRecord.profileStatus}</strong>
          {patient.abhaRecord.deactivatedAt && (
            <> on {fmt(patient.abhaRecord.deactivatedAt)}</>
          )} —
          {' '}This patient deactivated their ABHA. ABDM linking, consent and
          data-push are disabled. Existing local hospital records are retained
          but cannot be shared with other facilities until the patient
          reactivates their ABHA.
        </Alert>
      )}

      {/*
        Incomplete-profile banner.
        Shows when the patient was registered from an ABDM Scan & Share (so we
        only have what the patient's PHR app supplied — typically no mobile,
        sparse address, no blood group / emergency contact). The receptionist
        is expected to fill in the missing fields and then click "Mark profile
        complete" to dismiss this for everyone.
      */}
      {patient.profileCompleted === false && (
        <Alert
          severity="info"
          icon={<PersonAdd />}
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/app/patients/new', { state: { editPatient: patient } })}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Complete intake
            </Button>
          }
        >
          <strong>Incomplete profile</strong>
          {patient.registrationSource === 'SCAN_SHARE' ? ' — registered from an ABHA Scan & Share. ' : ' — '}
          ABDM only sent us the basics. Please confirm <strong>mobile</strong>,
          <strong> address</strong>, <strong>blood group</strong> and <strong>emergency contact</strong> with the patient,
          then mark the profile complete.
        </Alert>
      )}

      {/* ── 4 Tabs ── */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 1,
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, py: 1, fontSize: '0.8125rem' },
          }}
        >
          <Tab label="Overview" icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Visits (${(summary?.totalEncounters || 0) + (summary?.totalAdmissions || 0)})`} icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Billing" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="ABHA & Consent" icon={<HealthAndSafety sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="ABDM Records" icon={<CloudDownload sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {/* ═══ Tab 0: Overview ═══ */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={4}>
                <SectionCard title="Demographics">
                  <InfoRow icon={<Person />} label="Name" value={`${patient.firstName}${patient.middleName ? ' ' + patient.middleName : ''} ${patient.lastName}`} />
                  <InfoRow icon={<CalendarToday />} label="DOB" value={`${fmt(patient.dob)}${age != null ? ` (${age}y)` : ''}`} />
                  <InfoRow icon={<Phone />} label="Mobile" value={patient.mobile} />
                  {patient.email && <InfoRow icon={<Phone />} label="Email" value={patient.email} />}
                  {address && <InfoRow icon={<Home />} label="Address" value={address} />}
                  {patient.maritalStatus && <InfoRow icon={<Person />} label="Marital status" value={patient.maritalStatus} />}
                  {patient.occupation && <InfoRow icon={<Person />} label="Occupation" value={patient.occupation} />}
                  {Array.isArray(patient.allergies) && patient.allergies.length > 0 && (
                    <InfoRow icon={<MonitorHeart />} label="Allergies" value={patient.allergies.join(', ')} />
                  )}
                  {emergencyContact && (emergencyContact.name || emergencyContact.mobile) && (
                    <InfoRow
                      icon={<Phone />}
                      label="Emergency contact"
                      value={`${emergencyContact.name || '—'}${emergencyContact.relationship ? ` (${emergencyContact.relationship})` : ''} • ${emergencyContact.mobile || ''}`}
                    />
                  )}
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SectionCard title="Latest Vitals">
                  {latestVitals ? (
                    <>
                      {latestVitals.bloodPressureSystolic && <InfoRow icon={<TrendingUp />} label="BP" value={`${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg`} />}
                      {latestVitals.heartRate && <InfoRow icon={<MonitorHeart />} label="Pulse" value={`${latestVitals.heartRate} bpm`} />}
                      {latestVitals.temperature && <InfoRow icon={<MonitorHeart />} label="Temp" value={`${latestVitals.temperature}°C`} />}
                      {latestVitals.oxygenSaturation && <InfoRow icon={<MonitorHeart />} label="SpO₂" value={`${latestVitals.oxygenSaturation}%`} />}
                      {latestVitals.weight && <InfoRow icon={<MonitorHeart />} label="Weight" value={`${latestVitals.weight} kg`} />}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Recorded: {fmtTime(latestVitals.recordedAt)}</Typography>
                    </>
                  ) : <EmptyState icon={<MonitorHeart />} message="No vitals recorded yet" small />}
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={4}>
                <SectionCard title="Billing Summary">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <BillingRow label="Total Billed" value={billingOverview?.totalBilled} color="#1a3c6e" />
                    <BillingRow label="Total Paid" value={billingOverview?.totalPaid} color="#27ae60" />
                    <Divider />
                    <BillingRow label="Outstanding" value={billingOverview?.totalOutstanding} color={billingOverview?.totalOutstanding > 0 ? '#e74c3c' : '#27ae60'} bold />
                    {billingOverview?.totalBilled > 0 && (
                      <LinearProgress variant="determinate" value={Math.min(100, (billingOverview.totalPaid / billingOverview.totalBilled) * 100)}
                        sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#27ae60', 0.12), '& .MuiLinearProgress-bar': { bgcolor: '#27ae60', borderRadius: 3 } }} />
                    )}
                  </Box>
                </SectionCard>
              </Grid>
              {/* ── Upcoming appointments ───────────────────────────────────── */}
              {Array.isArray(appointments) && appointments.length > 0 && (
                <Grid item xs={12}>
                  <SectionCard title="Upcoming & Recent Appointments">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {appointments.slice(0, 5).map((appt: any) => {
                        const when = appt.scheduledAt ? new Date(appt.scheduledAt) : null;
                        const isFuture = when ? when.getTime() > Date.now() : false;
                        const docName = appt.doctor
                          ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
                          : 'Doctor';
                        return (
                          <Box key={appt.id} sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            p: 1.25, borderRadius: 1.5,
                            border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                            bgcolor: theme => alpha(theme.palette.primary.main, isFuture ? 0.05 : 0.02),
                          }}>
                            <CalendarToday sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {docName} {appt.doctor?.specialization ? `(${appt.doctor.specialization})` : ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {when ? when.toLocaleString() : ''} {appt.type ? `• ${appt.type}` : ''}
                              </Typography>
                            </Box>
                            <Chip size="small"
                              label={appt.status}
                              color={
                                appt.status === 'COMPLETED' ? 'success' :
                                appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' ? 'default' :
                                'primary'
                              }
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </SectionCard>
                </Grid>
              )}
              <Grid item xs={12}>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Encounters', value: summary.totalEncounters, color: '#4A90E2', t: 1 },
                    { label: 'Prescriptions', value: summary.totalPrescriptions, color: '#50C878', t: 1 },
                    { label: 'Vitals', value: summary.totalVitals, color: '#F39C12', t: 1 },
                    { label: 'Investigations', value: summary.totalInvestigations, color: '#9B59B6', t: 1 },
                    { label: 'Payments', value: summary.totalPayments, color: '#E74C3C', t: 2 },
                    { label: 'Admissions', value: summary.totalAdmissions, color: '#1ABC9C', t: 1 },
                  ].map((s) => (
                    <Grid item xs={4} sm={2} key={s.label}>
                      <Card onClick={() => setTab(s.t)} sx={{
                        textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                        background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                        border: `1px solid ${alpha(s.color, 0.15)}`,
                        transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${alpha(s.color, 0.2)}` },
                      }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ═══ Tab 1: Visits (with EHR download + unified cards) ═══ */}
          <TabPanel value={tab} index={1}>
            <VisitsTab encounters={encounters} prescriptions={prescriptions} investigations={investigations}
              vitals={vitals} admissions={admissions} patient={patient} age={age} address={address} summary={summary} />
          </TabPanel>

          {/* ═══ Tab 2: Billing ═══ */}
          <TabPanel value={tab} index={2}>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              {[
                { label: 'Total Billed', value: billingOverview?.totalBilled, color: '#1a3c6e', bg: '#e8edf5' },
                { label: 'Total Paid', value: billingOverview?.totalPaid, color: '#27ae60', bg: '#e8f8ef' },
                { label: 'Outstanding', value: billingOverview?.totalOutstanding, color: billingOverview?.totalOutstanding > 0 ? '#e74c3c' : '#27ae60', bg: billingOverview?.totalOutstanding > 0 ? '#fde8e8' : '#e8f8ef' },
              ].map((c) => (
                <Grid item xs={12} sm={4} key={c.label}>
                  <Card sx={{ textAlign: 'center', bgcolor: c.bg, border: 'none', borderRadius: 2, boxShadow: 'none' }}>
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{c.label}</Typography>
                      <Typography variant="h4" fontWeight={800} color={c.color}>{currency(c.value)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {billingOverview?.totalBilled > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Payment Progress</Typography>
                  <Typography variant="caption" fontWeight={600}>{Math.round((billingOverview.totalPaid / billingOverview.totalBilled) * 100)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, (billingOverview.totalPaid / billingOverview.totalBilled) * 100)}
                  sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#27ae60', 0.12), '& .MuiLinearProgress-bar': { bgcolor: '#27ae60', borderRadius: 4 } }} />
              </Box>
            )}
            {billingOverview?.totalBilled > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Charge Breakdown</Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Consultation', value: billingOverview?.consultation, color: '#4A90E2' },
                    { label: 'Lab & Radiology', value: billingOverview?.lab, color: '#9B59B6' },
                    { label: 'Pharmacy', value: billingOverview?.medicine, color: '#50C878' },
                    { label: 'Scans', value: billingOverview?.scan, color: '#F39C12' },
                    { label: 'Ward (IPD)', value: billingOverview?.ward, color: '#1ABC9C' },
                    { label: 'Other', value: billingOverview?.other, color: '#95A5A6' },
                  ].filter(c => (c.value || 0) > 0).map((c) => (
                    <Grid item xs={6} sm={4} md={2} key={c.label}>
                      <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha(c.color, 0.06), border: `1px solid ${alpha(c.color, 0.12)}` }}>
                        <Typography variant="h6" fontWeight={700} color={c.color}>{currency(c.value)}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Visit-wise Charges & Payments</Typography>
            <BillingTable chargeItems={chargeItems} patient={patient} />
          </TabPanel>

          {/* ═══ Tab 3: ABHA & Consent ═══ */}
          <TabPanel value={tab} index={3}>
            {(() => {
              // Compute once per render — `hasAbha` controls whether the
              // tab shows the consent / link-care-contexts toolbar (rich
              // mode) or a dedicated "no ABHA, link one now" hero (empty
              // mode). Receptionists kept getting stranded on this tab
              // for unlinked patients, so the empty mode now carries a
              // primary CTA instead of a passive caption.
              const hasAbha = !!(patient.abhaNumber || patient.abhaId || patient.abhaRecord);
              const linkPayload = {
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                mobile: patient.mobile,
                mode: 'link' as const,
              };

              if (!hasAbha) {
                return (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2.5, sm: 3.5 },
                      borderRadius: 3,
                      borderStyle: 'dashed',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                      borderColor: (t) => alpha(t.palette.primary.main, 0.4),
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2.5,
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                        color: 'primary.main',
                      }}
                    >
                      <HealthAndSafety />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        No ABHA linked yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Link this patient&apos;s 14-digit ABHA so you can request consent,
                        pull federated health records, and link care contexts under
                        ABDM. If they don&apos;t have one yet, you can create it from the
                        same page.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
                      <Button
                        variant="contained"
                        startIcon={<LinkIcon />}
                        onClick={() => navigate('/app/abha', { state: linkPayload })}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                      >
                        Link ABHA
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddCircleOutline />}
                        onClick={() =>
                          navigate('/app/abha', {
                            state: { ...linkPayload, mode: 'create' },
                          })
                        }
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Create new ABHA
                      </Button>
                    </Box>
                  </Paper>
                );
              }

              return (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<LinkIcon />}
                    size="small"
                    onClick={() => setLinkDialogOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Link Care Contexts
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AddCircleOutline />}
                    size="small"
                    color="primary"
                    onClick={() => setConsentDialogOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Request Consent
                  </Button>
                </Box>
              );
            })()}
            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid item xs={12} md={6}>
                <SectionCard title="ABHA Record">
                  {(patient.abhaRecord || patient.abhaNumber || patient.abhaId) ? (() => {
                    const abhaNum = patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId || '—';
                    const abhaAddr = patient.abhaRecord?.abhaAddress || patient.abhaAddress || null;
                    return (
                      <>
                        <InfoRow icon={<Verified />} label="ABHA Number" value={abhaNum} />
                        {abhaAddr && <InfoRow icon={<HealthAndSafety />} label="ABHA Address" value={abhaAddr} />}
                        {patient.abhaRecord?.kycStatus && <InfoRow icon={<Person />} label="KYC Status" value={patient.abhaRecord.kycStatus} />}
                        {patient.abhaRecord?.name && <InfoRow icon={<Person />} label="ABHA Name" value={patient.abhaRecord.name} />}
                      </>
                    );
                  })() : (
                    <Typography variant="body2" color="text.secondary">
                      Use &ldquo;Link ABHA&rdquo; above to attach this patient&apos;s health ID.
                    </Typography>
                  )}
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <SectionCard title="Consent Records">
                  {(consents || []).length === 0 ? <EmptyState icon={<HealthAndSafety />} message="No consent records" small /> : (
                    <Box
                      sx={{
                        maxHeight: 360,
                        overflowY: 'auto',
                        pr: 0.5,
                        mr: -0.5,
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                      }}
                    >
                      {consents.map((c: any) => {
                        const purposeLabel = ({ CARE_MANAGEMENT: 'Care Management', BREAK_THE_GLASS: 'Break the Glass', PUBLIC_HEALTH: 'Public Health', DISEASE_SPECIFIC_HEALTHCARE_RESEARCH: 'Disease Specific Research' } as Record<string, string>)[c.purpose] || c.purpose || 'Health Data Consent';
                        const hiTypes: string[] = Array.isArray(c.hiTypes) ? c.hiTypes : [];
                        return (
                          <Box key={c.id} sx={{ mb: 1.5, p: 1.75, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', transition: 'box-shadow .2s', '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>{purposeLabel}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{c.consentId}</Typography>
                              </Box>
                              <ConsentStatusChip consentId={c.id} initialStatus={c.status} />
                            </Box>
                            {hiTypes.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                                {hiTypes.map((t) => (
                                  <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 20, fontSize: 10.5 }} />
                                ))}
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                              <Typography variant="caption" color="text.secondary">Requested {fmtTime(c.createdAt)}</Typography>
                              {c.grantedAt && (
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>Granted {fmtTime(c.grantedAt)}</Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  {(consents || []).some((c: any) => c.status === 'GRANTED') && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CloudDownload sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary">
                        Fetched documents appear in the{' '}
                        <Box component="span" onClick={() => setTab(4)} sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                          ABDM Records
                        </Box>{' '}tab.
                      </Typography>
                    </Box>
                  )}
                  {(consents || []).length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
                      Showing {consents.length} consent{consents.length === 1 ? '' : 's'} • scroll to see more
                    </Typography>
                  )}
                </SectionCard>
              </Grid>

              {/* Care Contexts */}
              <Grid item xs={12}>
                <CareContextsSection patientId={patient.id} refreshKey={linkDialogOpen} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ═══ Tab 4: ABDM Records ═══ */}
          <TabPanel value={tab} index={4}>
            <FederatedRecords patientId={patient.id} />
          </TabPanel>
        </Box>
      </Paper>

      {/* ── Link Care Contexts Dialog ── */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            Link Care Contexts to ABDM
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will link all unlinked visits/encounters for <strong>{patient.firstName} {patient.lastName}</strong> to their ABDM profile (ABHA: {patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaRecord?.abhaAddress || patient.abhaAddress || patient.abhaId}).
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Linked care contexts allow the patient to share their health records stored here with any HIU (doctor/app) via ABDM consent flow.
          </Typography>
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Unlinked encounters: {(data?.encounters || []).filter((e: any) => !e.careContext || e.careContext?.linkStatus !== 'LINKED').length}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkDialogOpen(false)} disabled={linkingLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLinkCareContexts}
            disabled={linkingLoading}
            startIcon={linkingLoading ? <CircularProgress size={16} /> : <LinkIcon />}
          >
            {linkingLoading ? 'Linking…' : 'Link Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Request Consent Dialog ── */}
      <Dialog open={consentDialogOpen} onClose={() => setConsentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddCircleOutline color="primary" />
            Request Health Data Consent
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            A consent request will be sent to <strong>{patient.firstName} {patient.lastName}</strong> on their ABHA app. They must approve it before data can be fetched.
          </Alert>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Purpose</InputLabel>
            <Select
              value={consentForm.purpose}
              label="Purpose"
              onChange={(e) => setConsentForm(f => ({ ...f, purpose: e.target.value }))}
            >
              <MenuItem value="CAREMGT">Care Management</MenuItem>
              <MenuItem value="BTG">Break the Glass</MenuItem>
              <MenuItem value="PUBHLTH">Public Health</MenuItem>
              <MenuItem value="HPAYMT">Healthcare Payment</MenuItem>
              <MenuItem value="DSRCH">Disease Specific Healthcare Research</MenuItem>
              <MenuItem value="PATRQT">Patient Requested</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" sx={{ mb: 1 }}>
            Health Information Types
          </Typography>
          <FormGroup row sx={{ mb: 2 }}>
            {HI_TYPES.map(t => (
              <FormControlLabel
                key={t}
                control={
                  <Checkbox
                    size="small"
                    checked={consentForm.hiTypes.includes(t)}
                    onChange={(e) => setConsentForm(f => ({
                      ...f,
                      hiTypes: e.target.checked ? [...f.hiTypes, t] : f.hiTypes.filter(x => x !== t),
                    }))}
                  />
                }
                label={<Typography variant="caption">{t}</Typography>}
              />
            ))}
          </FormGroup>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              value={consentForm.dateRangeFrom}
              onChange={(e) => setConsentForm(f => ({ ...f, dateRangeFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              value={consentForm.dateRangeTo}
              onChange={(e) => setConsentForm(f => ({ ...f, dateRangeTo: e.target.value }))}
              inputProps={{ max: new Date().toISOString().split('T')[0] }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConsentDialogOpen(false)} disabled={consentLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRequestConsent}
            disabled={consentLoading || consentForm.hiTypes.length === 0}
            startIcon={consentLoading ? <CircularProgress size={16} /> : <AddCircleOutline />}
          >
            {consentLoading ? 'Sending…' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Shared Sub-Components ────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </CardContent>
  </Card>
);

const InfoRow: React.FC<{ icon: React.ReactElement; label: string; value: string }> = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
    <Tooltip title={label}>{React.cloneElement(icon, { sx: { fontSize: 18, color: 'text.secondary', mt: 0.25 } })}</Tooltip>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, flexShrink: 0 }}>{label}:</Typography>
    <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>{value || '—'}</Typography>
  </Box>
);

const BillingRow: React.FC<{ label: string; value: any; color: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant={bold ? 'h6' : 'body1'} fontWeight={bold ? 800 : 600} color={color}>{currency(value)}</Typography>
  </Box>
);

const EmptyState: React.FC<{ icon: React.ReactElement; message: string; small?: boolean }> = ({ icon, message, small }) => (
  <Box sx={{ textAlign: 'center', py: small ? 3 : 6 }}>
    {React.cloneElement(icon, { sx: { fontSize: small ? 40 : 52, color: 'text.disabled', mb: 0.5 } })}
    <Typography variant="body2" color="text.secondary">{message}</Typography>
  </Box>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  if (!status) return null;
  const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label?: string }> = {
    COMPLETED: { color: 'success' }, PAID: { color: 'success' }, DISPENSED: { color: 'success' },
    ACTIVE: { color: 'success' }, ADMITTED: { color: 'info' }, DISCHARGE_READY: { color: 'warning', label: 'DISCHARGE READY' },
    IN_PROGRESS: { color: 'info', label: 'IN PROGRESS' }, ORDERED: { color: 'info' }, CONSULTING: { color: 'info' },
    PENDING: { color: 'warning' }, REQUESTED: { color: 'warning' }, PARTIAL: { color: 'warning' },
    SAMPLE_COLLECTED: { color: 'info', label: 'SAMPLE COLLECTED' },
    CANCELLED: { color: 'error' }, REJECTED: { color: 'error' }, DISCHARGED: { color: 'default' },
  };
  const cfg = map[status] || { color: 'default' as const };
  return <Chip label={cfg.label || status.replace(/_/g, ' ')} size="small" color={cfg.color} sx={{ fontSize: 11, fontWeight: 600, height: 22 }} />;
};

const VisitSection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" fontWeight={700} sx={{ color, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75, display: 'block' }}>{title}</Typography>
    {children}
  </Box>
);

const DetailRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <Box sx={{ mb: 0.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={bold ? 600 : 400}>{value || '—'}</Typography>
  </Box>
);

const VitalBadge: React.FC<{ label: string; value: any; unit: string }> = ({ label, value, unit }) => (
  <Box sx={{ px: 1.5, py: 0.5, bgcolor: alpha('#F39C12', 0.06), borderRadius: 1.5, border: `1px solid ${alpha('#F39C12', 0.12)}` }}>
    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value} <span style={{ fontWeight: 400, fontSize: 11 }}>{unit}</span></Typography>
  </Box>
);

const ActionBtn: React.FC<{ label: string; onClick: () => void; color?: 'primary' | 'success' | 'warning' }> = ({ label, onClick, color }) => (
  <Button size="small" variant="outlined" color={color || 'primary'} startIcon={<Download sx={{ fontSize: 14 }} />}
    onClick={onClick} sx={{ fontSize: '0.7rem', textTransform: 'none', borderRadius: 1.5 }}>{label}</Button>
);

// ── Visits Tab (unified cards + Full EHR download) ───────────────────────────

const VisitsTab: React.FC<{
  encounters: any[]; prescriptions: any[]; investigations: any[];
  vitals: any[]; admissions: any[]; patient: any; age: number | null; address: string | null; summary: any;
}> = ({ encounters, prescriptions, investigations, vitals, admissions, patient, age, address, summary }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ehrLoading, setEhrLoading] = useState(false);
  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const hospital = useMemo(() => { try { return JSON.parse(localStorage.getItem('hospital') || '{}'); } catch { return {}; } }, []);
  const hospitalInfo = useMemo(() => ({
    name: hospital.name || 'Hospital', addressLine1: hospital.address?.line || hospital.addressLine1 || hospital.address,
    city: hospital.address?.city || hospital.city, state: hospital.address?.state || hospital.state,
    phone: hospital.phone, email: hospital.email, registrationNumber: hospital.registrationNumber,
  }), [hospital]);

  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  const patientAge = age != null ? `${age}` : '—';
  const patientAddr = address || '';

  // ── Visit grouping ──
  const visitGroups = useMemo(() => {
    const enc = encounters || []; const rx = prescriptions || []; const inv = investigations || [];
    const vit = vitals || []; const adm = admissions || [];
    const ipdEncIds = new Set(adm.flatMap((a: any) => enc.filter((e: any) => e.admissionId === a.id).map((e: any) => e.id)));

    const opdVisits = enc.filter((e: any) => !ipdEncIds.has(e.id)).map((e: any) => ({
      id: e.id, type: 'OPD' as const, date: e.visitDate, encounter: e,
      prescriptions: rx.filter((r: any) => r.encounterId === e.id),
      investigations: inv.filter((i: any) => i.encounterId === e.id),
      vitals: vit.filter((v: any) => v.encounterId === e.id),
    }));

    const ipdVisits = adm.map((a: any) => {
      const rounds = enc.filter((e: any) => e.admissionId === a.id);
      const roundIds = rounds.map((e: any) => e.id);
      return {
        id: a.id, type: 'IPD' as const, date: a.admittedAt, admission: a, rounds,
        prescriptions: rx.filter((r: any) => r.admissionId === a.id || roundIds.includes(r.encounterId)),
        investigations: inv.filter((i: any) => i.admissionId === a.id || roundIds.includes(i.encounterId)),
        vitals: [] as any[],
      };
    });

    return [...opdVisits, ...ipdVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [encounters, prescriptions, investigations, vitals, admissions]);

  const standaloneInv = useMemo(() => (investigations || []).filter((i: any) => !i.encounterId && !i.admissionId), [investigations]);

  // OPD encounters whose charges were absorbed into an IPD bill (avoid showing amount on card)
  const absorbedOPDIds = useMemo(() => {
    const set = new Set<string>();
    (admissions || []).forEach((a: any) => {
      if (!a.encounterId) return;
      const enc = (encounters || []).find((e: any) => e.id === a.encounterId);
      if (enc && !Number(enc.paymentCollected || 0) && enc.paymentStatus !== 'PAID') set.add(a.encounterId);
    });
    return set;
  }, [admissions, encounters]);

  // ── PDF handlers ──
  const handleFullEHR = async () => {
    setEhrLoading(true);
    try {
      const res: any = await ehrService.getPatientEHR(patient.id);
      const ehrData = res.data?.data || res.data;
      const ehrBase64 = generatePatientReport({ hospital: hospitalInfo, patient: { firstName: patient.firstName, lastName: patient.lastName, uhid: patient.uhid, dob: patient.dob, gender: patient.gender, mobile: patient.mobile, email: patient.email, bloodGroup: patient.bloodGroup, address: patient.address, createdAt: patient.createdAt, abhaRecord: patient.abhaRecord }, timeline: ehrData.timeline || [], summary: ehrData.summary || summary || {} });
      documentService.persistDocument({ patientId: patient.id, type: 'EHR_REPORT', content: ehrBase64 }).catch(() => {});
      toast.success('Full EHR downloaded');
    } catch { toast.error('Failed to generate EHR Report'); } finally { setEhrLoading(false); }
  };

  const handleOPDCard = (enc: any) => {
    try {
      const opdBase64 = generateOPDCardPDF({ opdCardNumber: enc.encounterId || enc.id?.slice(0, 8)?.toUpperCase() || 'N/A', issueDate: enc.visitDate || new Date().toISOString(), hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, age: patientAge, gender: patient.gender || '', mobile: patient.mobile || '', address: patientAddr }, appointment: { doctor: `Dr. ${enc.doctor?.firstName || ''} ${enc.doctor?.lastName || ''}`.trim(), department: enc.doctor?.specialization || '', fees: enc.totalAmount ? `₹${enc.totalAmount}` : '' }, consultation: { chiefComplaint: enc.chiefComplaint, provisionalDiagnosis: enc.diagnosis, finalDiagnosis: enc.finalDiagnosis, notes: enc.notes } });
      documentService.persistDocument({ patientId: patient.id, encounterId: enc.id, type: 'OPD_CARD', content: opdBase64 }).catch(() => {});
      toast.success('OPD Card downloaded');
    } catch { toast.error('Failed'); }
  };

  const handlePrescription = (enc: any, rxList: any[]) => {
    const meds = rxList.flatMap((rx: any) => (rx.medications || []).map((m: any) => ({ medicineName: m.name || m.medicineName || m.drug || '', dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', instructions: m.instructions || '' })));
    if (meds.length === 0) { toast.info('No medications to export'); return; }
    try {
      const rxBase64 = generatePrescriptionPDF({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, age: patientAge, gender: patient.gender || '', mobile: patient.mobile || '' }, doctor: { name: `Dr. ${enc.doctor?.firstName || ''} ${enc.doctor?.lastName || ''}`.trim(), specialization: enc.doctor?.specialization }, diagnosis: enc.finalDiagnosis || enc.diagnosis, prescriptions: meds, date: enc.visitDate || new Date().toISOString() });
      documentService.persistDocument({ patientId: patient.id, encounterId: enc.id, type: 'PRESCRIPTION', content: rxBase64 }).catch(() => {});
      toast.success('Prescription downloaded');
    } catch { toast.error('Failed'); }
  };

  const handleVisitSummary = (visit: any) => {
    const enc = visit.encounter;
    const meds = visit.prescriptions.flatMap((rx: any) => (rx.medications || []).map((m: any) => ({ medicineName: m.name || m.medicineName || m.drug || '', dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', instructions: m.instructions || '' })));
    try {
      const vsBase64 = generateVisitSummaryPDF({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, age: patientAge, gender: patient.gender || '', mobile: patient.mobile || '' }, doctor: { name: `Dr. ${enc.doctor?.firstName || ''} ${enc.doctor?.lastName || ''}`.trim(), specialization: enc.doctor?.specialization }, visit: { date: enc.visitDate || new Date().toISOString(), department: enc.doctor?.specialization, chiefComplaint: enc.chiefComplaint, diagnosis: enc.finalDiagnosis || enc.diagnosis, notes: enc.notes, followUpDate: enc.followUpDate }, vitals: visit.vitals[0] || undefined, prescriptions: meds.length > 0 ? meds : undefined, investigations: visit.investigations.map((i: any) => ({ testName: i.testName, status: i.status })), billing: enc.totalAmount ? { total: Number(enc.totalAmount || 0), paid: Number(enc.paymentCollected || 0), balance: Math.max(0, Number(enc.totalAmount || 0) - Number(enc.paymentCollected || 0)), method: enc.paymentMethod } : undefined });
      documentService.persistDocument({ patientId: patient.id, encounterId: enc.id, type: 'VISIT_SUMMARY', content: vsBase64 }).catch(() => {});
      toast.success('Visit Summary downloaded');
    } catch { toast.error('Failed'); }
  };

  const handleReceipt = (enc: any) => {
    const items: Array<{ description: string; amount: number }> = [];
    if (Number(enc.consultationFee || 0) > 0) items.push({ description: 'Consultation Fee', amount: Number(enc.consultationFee) });
    if (Number(enc.labCharges || 0) > 0) items.push({ description: 'Lab & Radiology', amount: Number(enc.labCharges) });
    if (Number(enc.medicineCharges || 0) > 0) items.push({ description: 'Pharmacy', amount: Number(enc.medicineCharges) });
    if (Number(enc.scanCharges || 0) > 0) items.push({ description: 'Scans', amount: Number(enc.scanCharges) });
    if (items.length === 0 && Number(enc.totalAmount || 0) > 0) items.push({ description: 'Consultation', amount: Number(enc.totalAmount) });
    try {
      const rcptBase64 = generateReceiptPDF({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid }, receiptNumber: enc.encounterId || `RCP-${enc.id?.slice(0, 8) || Date.now()}`, date: fmt(enc.visitDate), items, totalAmount: Number(enc.totalAmount || 0), amountPaid: Number(enc.paymentCollected || 0), balance: Math.max(0, Number(enc.totalAmount || 0) - Number(enc.paymentCollected || 0)), paymentMethod: enc.paymentMethod || 'CASH' });
      documentService.persistDocument({ patientId: patient.id, encounterId: enc.id, type: 'RECEIPT', content: rcptBase64 }).catch(() => {});
      toast.success('Receipt downloaded');
    } catch { toast.error('Failed'); }
  };

  const handleLabReport = (inv: any) => {
    try {
      const params = Array.isArray(inv.results?.parameters) ? inv.results.parameters : [];
      const labBase64 = generateLabReport({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, age: patientAge, gender: patient.gender, mobile: patient.mobile }, doctor: { name: `Dr. ${inv.doctor?.firstName || ''} ${inv.doctor?.lastName || ''}`.trim(), department: inv.doctor?.specialization }, report: { reportId: inv.id?.slice(0, 8)?.toUpperCase() || 'N/A', testName: inv.testName || 'Investigation', testType: inv.testType || 'LAB', orderedAt: inv.orderedAt || new Date().toISOString(), reportedAt: inv.completedAt || inv.updatedAt || new Date().toISOString(), sampleCollectedAt: inv.sampleCollectedAt, parameters: params.map((p: any) => ({ name: p.name || p.parameterName || '', value: p.value || p.result || '', unit: p.unit || '', referenceRange: p.referenceRange || p.normalRange || '', flag: p.flag || 'N' })), notes: inv.results?.notes || inv.notes } });
      documentService.persistDocument({ patientId: patient.id, encounterId: inv.encounterId, type: 'LAB_REPORT', content: labBase64 }).catch(() => {});
      toast.success('Lab Report downloaded');
    } catch { toast.error('Failed'); }
  };

  const handleIPDDoc = async (type: string, adm: any, visit: any) => {
    const days = adm.dischargedAt ? Math.max(1, Math.ceil((new Date(adm.dischargedAt).getTime() - new Date(adm.admittedAt).getTime()) / 86400000)) : Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000));
    const total = Number(adm.totalAmount || 0); const advance = Number(adm.advancePaid || 0); const dischargePaid = Number(adm.paymentCollected || 0);

    // Fetch real bill data from backend for bill / discharge docs
    let bill: any = null;
    if (type === 'bill' || type === 'discharge') {
      try { const res: any = await ipdService.getAdmissionBill(adm.id); bill = res?.data; } catch {}
    }

    let docBase64: string | undefined;
    try {
      if (type === 'admission') {
        docBase64 = generateAdmissionSummary({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, mobile: patient.mobile, gender: patient.gender, age: patientAge, address: patientAddr, bloodGroup: patient.bloodGroup }, admission: { admissionNumber: adm.admissionNumber || 'N/A', admittedAt: adm.admittedAt, wardName: adm.ward?.name || '—', bedNumber: adm.bed?.bedNumber, diagnosis: adm.diagnosis, admissionReason: adm.admissionReason, dailyCharges: Number(adm.dailyCharges || adm.ward?.dailyCharges || 0), advancePaid: advance, notes: adm.notes } });
      } else if (type === 'bill') {
        const labTests = (bill?.labItems || []).map((i: any) => ({ name: i.testName || 'Lab Test', amount: Number(i.amount || 0) }));
        const medicines: Array<{ name: string; qty?: number; rate?: number; amount?: number }> = [];
        (bill?.rxItems || []).filter((r: any) => r.status === 'DISPENSED').forEach((r: any) => {
          const meds = Array.isArray(r.medications) ? r.medications : [];
          meds.forEach((m: any) => medicines.push({ name: m.name || m.medicineName || 'Medicine', qty: m.quantity || 1, rate: Number(m.price || 0), amount: Number(m.price || 0) * (m.quantity || 1) }));
        });
        if (!medicines.some(m => (m.amount || 0) > 0) && (bill?.medicineCharges || 0) > 0) {
          medicines.length = 0;
          medicines.push({ name: 'Pharmacy Charges', amount: bill.medicineCharges });
        }
        docBase64 = generateIPDBill({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, mobile: patient.mobile, gender: patient.gender, age: patientAge }, admission: { admissionNumber: adm.admissionNumber || 'N/A', admittedAt: adm.admittedAt, dischargedAt: adm.dischargedAt, wardName: adm.ward?.name || '—', bedNumber: adm.bed?.bedNumber, diagnosis: adm.diagnosis, admissionReason: adm.admissionReason, dailyCharges: Number(adm.dailyCharges || adm.ward?.dailyCharges || 0), days: bill?.days || days, advancePaid: advance, totalAmount: bill?.total || total, notes: adm.notes, consultationFee: bill?.consultationFee || 0, labTests: labTests.length > 0 ? labTests : undefined, medicines: medicines.length > 0 ? medicines : undefined } });
      } else if (type === 'discharge') {
        const realBilling = bill ? { wardCharges: bill.wardCharges, consultationFee: bill.consultationFee || 0, labCharges: bill.labCharges || 0, medicineCharges: bill.medicineCharges || 0, totalAmount: bill.total || total, advancePaid: advance, amountCollected: dischargePaid, balance: Math.max(0, (bill.total || total) - advance - dischargePaid) } : { wardCharges: Number(adm.dailyCharges || 0) * days, consultationFee: 0, labCharges: 0, medicineCharges: 0, totalAmount: total, advancePaid: advance, amountCollected: dischargePaid, balance: Math.max(0, total - advance - dischargePaid) };
        docBase64 = generateDischargeSummaryPDF({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, age: patientAge, gender: patient.gender || '', mobile: patient.mobile || '', address: patientAddr, bloodGroup: patient.bloodGroup }, admission: { admissionNumber: adm.admissionNumber || 'N/A', admittedAt: adm.admittedAt, dischargedAt: adm.dischargedAt || new Date().toISOString(), ward: adm.ward?.name || '—', bed: adm.bed?.bedNumber, days, admissionReason: adm.admissionReason, diagnosis: adm.diagnosis }, doctors: (visit.rounds || []).reduce((acc: any[], r: any) => { const nm = `Dr. ${r.doctor?.firstName || ''} ${r.doctor?.lastName || ''}`.trim(); if (!acc.find((d: any) => d.name === nm)) acc.push({ name: nm, specialization: r.doctor?.specialization }); return acc; }, []), rounds: (visit.rounds || []).map((r: any) => ({ date: r.visitDate || r.createdAt, doctor: `Dr. ${r.doctor?.firstName || ''} ${r.doctor?.lastName || ''}`.trim(), notes: r.notes, diagnosis: r.finalDiagnosis || r.diagnosis })), investigations: visit.investigations.map((i: any) => ({ testName: i.testName, result: typeof i.results === 'string' ? i.results : i.results?.notes || '', date: i.orderedAt, status: i.status })), medications: visit.prescriptions.flatMap((rx: any) => (rx.medications || []).map((m: any) => ({ name: m.name || m.medicineName || m.drug || '', dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', instructions: m.instructions || '' }))), billing: realBilling });
      } else if (type === 'gatepass') {
        docBase64 = generateGatePass({ hospital: hospitalInfo, patient: { name: patientName, uhid: patient.uhid, mobile: patient.mobile, gender: patient.gender, age: patientAge }, admission: { admissionNumber: adm.admissionNumber || 'N/A', admittedAt: adm.admittedAt, dischargedAt: adm.dischargedAt || new Date().toISOString(), wardName: adm.ward?.name || '—', bedNumber: adm.bed?.bedNumber, diagnosis: adm.diagnosis, days }, payment: { totalAmount: total, totalPaid: advance + dischargePaid, paymentStatus: adm.paymentStatus || 'PENDING' } });
      }
      const docTypeMap: Record<string, string> = { admission: 'ADMISSION_SUMMARY', bill: 'IPD_BILL', discharge: 'DISCHARGE_SUMMARY', gatepass: 'GATE_PASS' };
      if (docBase64) {
        documentService.persistDocument({ patientId: patient.id, admissionId: adm.id, type: docTypeMap[type] || type.toUpperCase(), content: docBase64 }).catch(() => {});
      }
      toast.success('Document downloaded');
    } catch { toast.error('Failed'); }
  };

  if (visitGroups.length === 0 && standaloneInv.length === 0) {
    return <EmptyState icon={<LocalHospital />} message="No visits recorded yet" />;
  }

  // ── Render ──
  return (
    <Box>
      {/* Full EHR download at top */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2.5, background: 'linear-gradient(135deg, rgba(26,60,110,0.04) 0%, rgba(22,160,133,0.04) 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Description sx={{ color: '#1a3c6e', fontSize: 26 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Full Health Record (EHR)</Typography>
              <Typography variant="caption" color="text.secondary">Complete multi-page report with all patient data</Typography>
            </Box>
          </Box>
          <Button variant="contained" size="small" startIcon={ehrLoading ? <CircularProgress size={14} color="inherit" /> : <Download />}
            disabled={ehrLoading} onClick={handleFullEHR} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {ehrLoading ? 'Generating...' : 'Download EHR'}
          </Button>
        </Box>
      </Paper>

      {/* Unified visit cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visitGroups.map((visit) => {
          const isOpen = expanded.has(visit.id);
          const isOPD = visit.type === 'OPD';
          const enc = (visit as any).encounter;
          const adm = (visit as any).admission;
          const typeColor = isOPD ? '#4A90E2' : '#9B59B6';
          const typeBg = isOPD ? '#e8edf5' : '#f3e8fa';

          // Header info
          const title = isOPD
            ? `Dr. ${enc?.doctor?.firstName || ''} ${enc?.doctor?.lastName || ''}`.trim() + (enc?.doctor?.specialization ? ` · ${enc.doctor.specialization}` : '')
            : `${adm?.ward?.name || 'Ward'} · ${(() => { const d = adm?.dischargedAt ? Math.max(1, Math.ceil((new Date(adm.dischargedAt).getTime() - new Date(adm.admittedAt).getTime()) / 86400000)) : Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000)); return `${d} day${d > 1 ? 's' : ''} stay`; })()}`;
          const subtitle = isOPD
            ? `${fmtTime(enc?.visitDate)}${enc?.chiefComplaint ? ` · ${enc.chiefComplaint}` : ''}`
            : `${adm?.admissionNumber} · ${fmt(adm?.admittedAt)} — ${adm?.dischargedAt ? fmt(adm.dischargedAt) : 'Ongoing'}`;
          const isAbsorbed = isOPD && absorbedOPDIds.has(visit.id);
          const amount = isAbsorbed ? 0 : (isOPD ? Number(enc?.totalAmount || 0) : Number(adm?.totalAmount || 0));
          const status = isOPD ? enc?.status : adm?.status;

          return (
            <Paper key={visit.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {/* Unified header */}
              <Box onClick={() => toggle(visit.id)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer',
                bgcolor: typeBg, '&:hover': { bgcolor: alpha(typeColor, 0.1) },
              }}>
                <Chip label={visit.type} size="small" sx={{ bgcolor: typeColor, color: '#fff', fontWeight: 700, fontSize: 11, height: 24 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{title}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  {isAbsorbed && <Chip label="Billed via IPD" size="small" variant="outlined" sx={{ fontSize: 10, height: 20, color: '#9B59B6', borderColor: '#9B59B6' }} />}
                  {!isAbsorbed && amount > 0 && <Typography variant="body2" fontWeight={700}>{currency(amount)}</Typography>}
                  <StatusChip status={status} />
                  {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Box>
              </Box>

              <Collapse in={isOpen}>
                <Box sx={{ p: 2 }}>
                  {/* Consultation / Admission Details */}
                  {isOPD ? (
                    (enc?.chiefComplaint || enc?.finalDiagnosis || enc?.diagnosis || enc?.notes) && (
                      <VisitSection title="Consultation" color={typeColor}>
                        {enc.chiefComplaint && <DetailRow label="Chief Complaint" value={enc.chiefComplaint} />}
                        {(enc.finalDiagnosis || enc.diagnosis) && <DetailRow label="Diagnosis" value={enc.finalDiagnosis || enc.diagnosis} bold />}
                        {enc.notes && <DetailRow label="Notes" value={enc.notes} />}
                        {enc.followUpDate && <DetailRow label="Follow-up" value={fmt(enc.followUpDate)} />}
                      </VisitSection>
                    )
                  ) : (
                    <VisitSection title="Admission Details" color={typeColor}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={6} sm={3}><DetailRow label="Ward / Bed" value={`${adm?.ward?.name || '—'} / ${adm?.bed?.bedNumber || '—'}`} /></Grid>
                        <Grid item xs={6} sm={3}><DetailRow label="Daily Rate" value={`${currency(adm?.dailyCharges || adm?.ward?.dailyCharges)}/day`} /></Grid>
                        <Grid item xs={6} sm={3}><DetailRow label="Admitted" value={fmtTime(adm?.admittedAt)} /></Grid>
                        <Grid item xs={6} sm={3}><DetailRow label="Discharged" value={adm?.dischargedAt ? fmtTime(adm.dischargedAt) : 'Ongoing'} /></Grid>
                      </Grid>
                      {(adm?.admissionReason || adm?.diagnosis) && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                          {adm.admissionReason && <Typography variant="body2"><strong>Reason:</strong> {adm.admissionReason}</Typography>}
                          {adm.diagnosis && <Typography variant="body2"><strong>Diagnosis:</strong> {adm.diagnosis}</Typography>}
                        </Box>
                      )}
                    </VisitSection>
                  )}

                  {/* Doctor Rounds (IPD only) */}
                  {!isOPD && (visit as any).rounds?.length > 0 && (
                    <VisitSection title={`Doctor Rounds (${(visit as any).rounds.length})`} color="#4A90E2">
                      {(visit as any).rounds.map((r: any) => (
                        <Box key={r.id} sx={{ mb: 1, p: 1, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight={600}>Dr. {r.doctor?.firstName} {r.doctor?.lastName} · {fmt(r.visitDate)}</Typography>
                            <StatusChip status={r.status} />
                          </Box>
                          {(r.finalDiagnosis || r.diagnosis || r.chiefComplaint || r.notes) && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{r.finalDiagnosis || r.diagnosis || r.chiefComplaint || r.notes}</Typography>
                          )}
                        </Box>
                      ))}
                    </VisitSection>
                  )}

                  {/* Prescriptions */}
                  {visit.prescriptions.length > 0 && (
                    <VisitSection title={`Prescriptions (${visit.prescriptions.length})`} color="#50C878">
                      {visit.prescriptions.map((rx: any) => {
                        const meds = Array.isArray(rx.medications) ? rx.medications : [];
                        return (
                          <Box key={rx.id} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <StatusChip status={rx.status} />
                              {!isOPD && <Typography variant="caption" color="text.secondary">{fmt(rx.issuedAt)}</Typography>}
                            </Box>
                            <Table size="small">
                              <TableHead><TableRow sx={{ '& th': { py: 0.5, fontSize: 11, fontWeight: 700, color: 'text.secondary' } }}>
                                <TableCell>Medicine</TableCell><TableCell>Dosage</TableCell><TableCell>Frequency</TableCell><TableCell>Duration</TableCell>
                              </TableRow></TableHead>
                              <TableBody>
                                {meds.map((m: any, i: number) => (
                                  <TableRow key={i} sx={{ '& td': { py: 0.5, fontSize: 12, border: 0 } }}>
                                    <TableCell><Typography variant="body2" fontWeight={500}>{m.name || m.medicineName || m.drug || '—'}</Typography></TableCell>
                                    <TableCell>{m.dosage || '—'}</TableCell><TableCell>{m.frequency || '—'}</TableCell><TableCell>{m.duration || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        );
                      })}
                    </VisitSection>
                  )}

                  {/* Lab & Radiology */}
                  {visit.investigations.length > 0 && (
                    <VisitSection title={`Lab & Radiology (${visit.investigations.length})`} color="#9B59B6">
                      {visit.investigations.map((inv: any) => (
                        <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <Chip label={inv.testType || 'LAB'} size="small" variant="outlined" color={inv.testType === 'RADIOLOGY' ? 'warning' : 'info'} sx={{ fontSize: 10, height: 20 }} />
                          <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>{inv.testName}</Typography>
                          <StatusChip status={inv.status} />
                          {(inv.status === 'COMPLETED' || inv.results) && (
                            <Tooltip title="Download Report"><IconButton size="small" onClick={() => handleLabReport(inv)} sx={{ p: 0.5 }}><Download fontSize="small" /></IconButton></Tooltip>
                          )}
                        </Box>
                      ))}
                    </VisitSection>
                  )}

                  {/* Vitals */}
                  {visit.vitals.length > 0 && (
                    <VisitSection title="Vitals" color="#F39C12">
                      {visit.vitals.map((v: any) => (
                        <Box key={v.id} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                          {v.bloodPressureSystolic && <VitalBadge label="BP" value={`${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`} unit="mmHg" />}
                          {v.heartRate && <VitalBadge label="Pulse" value={v.heartRate} unit="bpm" />}
                          {v.temperature && <VitalBadge label="Temp" value={v.temperature} unit="°C" />}
                          {v.oxygenSaturation && <VitalBadge label="SpO₂" value={v.oxygenSaturation} unit="%" />}
                          {v.weight && <VitalBadge label="Weight" value={v.weight} unit="kg" />}
                        </Box>
                      ))}
                    </VisitSection>
                  )}

                  {/* Documents (unified for OPD and IPD) */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ width: '100%', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Documents</Typography>
                    {isOPD && (
                      <>
                        <ActionBtn label="OPD Card" onClick={() => handleOPDCard(enc)} />
                        {visit.prescriptions.length > 0 && <ActionBtn label="Prescription" onClick={() => handlePrescription(enc, visit.prescriptions)} />}
                        <ActionBtn label="Visit Summary" onClick={() => handleVisitSummary(visit)} />
                        {Number(enc?.totalAmount || 0) > 0 && <ActionBtn label="Receipt" onClick={() => handleReceipt(enc)} />}
                      </>
                    )}
                    {!isOPD && (
                      <>
                        <ActionBtn label="Admission Summary" onClick={() => handleIPDDoc('admission', adm, visit)} />
                        <ActionBtn label="IPD Bill" onClick={() => handleIPDDoc('bill', adm, visit)} />
                        {visit.prescriptions.length > 0 && <ActionBtn label="Prescription" onClick={() => { const doc = (visit as any).rounds?.[0] || { doctor: {} }; handlePrescription(doc, visit.prescriptions); }} />}
                        {adm?.status === 'DISCHARGED' && (
                          <>
                            <ActionBtn label="Discharge Summary" color="success" onClick={() => handleIPDDoc('discharge', adm, visit)} />
                            <ActionBtn label="Gate Pass" color="warning" onClick={() => handleIPDDoc('gatepass', adm, visit)} />
                          </>
                        )}
                      </>
                    )}
                    {visit.investigations.filter((i: any) => i.status === 'COMPLETED' || i.results).map((inv: any) => (
                      <ActionBtn key={inv.id} label={`${inv.testName} Report`} onClick={() => handleLabReport(inv)} />
                    ))}
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })}

        {/* Standalone investigations */}
        {standaloneInv.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>Standalone Records</Typography>
            <Divider sx={{ mb: 1.5 }} />
            {standaloneInv.map((inv: any) => (
              <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Chip label={inv.testType || 'LAB'} size="small" variant="outlined" color="info" sx={{ fontSize: 10, height: 20 }} />
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>{inv.testName} · {fmt(inv.orderedAt)}</Typography>
                <StatusChip status={inv.status} />
                {(inv.status === 'COMPLETED' || inv.results) && (
                  <Tooltip title="Download Report"><IconButton size="small" onClick={() => handleLabReport(inv)} sx={{ p: 0.5 }}><Download fontSize="small" /></IconButton></Tooltip>
                )}
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    </Box>
  );
};

// ── Billing Table ────────────────────────────────────────────────────────────

const BillingTable: React.FC<{ chargeItems: any[]; patient?: any }> = ({ chargeItems, patient }) => {
  const items = chargeItems || [];
  const visitGroups = useMemo(() => {
    const primary = items.filter((i: any) => !i.isDetail);
    const details = items.filter((i: any) => i.isDetail);
    const byParent = new Map<string, any[]>();
    details.forEach((d: any) => { if (d.parentId) { const arr = byParent.get(d.parentId) || []; arr.push(d); byParent.set(d.parentId, arr); } });
    return primary.map((v: any) => ({ ...v, children: byParent.get(v.id) || [] }));
  }, [items]);

  const [exp, setExp] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExp(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleReceipt = (visit: any) => {
    const hosp = (() => { try { return JSON.parse(localStorage.getItem('hospital') || '{}'); } catch { return {}; } })();
    const bk: Array<{ description: string; amount: number }> = [];
    if (visit.consultation > 0) bk.push({ description: 'Consultation Fee', amount: visit.consultation });
    if (visit.lab > 0) bk.push({ description: 'Lab & Radiology', amount: visit.lab });
    if (visit.medicine > 0) bk.push({ description: 'Pharmacy', amount: visit.medicine });
    if (visit.scan > 0) bk.push({ description: 'Scans', amount: visit.scan });
    if (visit.ward > 0) bk.push({ description: 'Ward Charges', amount: visit.ward });
    if (bk.length === 0 && visit.total > 0) bk.push({ description: visit.description, amount: visit.total });
    const billingRcptBase64 = generateReceiptPDF({ hospital: { name: hosp.name || 'Hospital', addressLine1: hosp.address || hosp.addressLine1, city: hosp.city, state: hosp.state, phone: hosp.phone, email: hosp.email }, patient: { name: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Patient', uhid: patient?.uhid || '—' }, receiptNumber: visit.detail || `RCP-${visit.id?.slice(0, 8) || Date.now()}`, date: fmt(visit.date), items: bk, totalAmount: visit.total || 0, amountPaid: visit.paid || 0, balance: Math.max(0, (visit.total || 0) - (visit.paid || 0)), paymentMethod: visit.paymentMethod || 'CASH' });
    if (patient?.id) {
      documentService.persistDocument({ patientId: patient.id, type: 'RECEIPT', content: billingRcptBase64 }).catch(() => {});
    }
  };

  const cfg: Record<string, { color: string; bg: string; icon: string }> = { OPD: { color: '#4A90E2', bg: '#e8edf5', icon: 'OPD' }, IPD: { color: '#9B59B6', bg: '#f3e8fa', icon: 'IPD' }, PAYMENT: { color: '#95A5A6', bg: '#f0f0f0', icon: 'PAY' } };

  if (visitGroups.length === 0) return <EmptyState icon={<Receipt />} message="No charges recorded" small />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {visitGroups.map((visit: any) => {
        const c = cfg[visit.type] || cfg.PAYMENT;
        const open = exp.has(visit.id);
        const hasBk = visit.consultation > 0 || visit.lab > 0 || visit.medicine > 0 || visit.scan > 0 || visit.ward > 0;
        const hasCh = visit.children.length > 0;
        const canExp = hasBk || hasCh;
        const bal = Math.max(0, (visit.total || 0) - (visit.paid || 0));
        return (
          <Paper key={`${visit.type}-${visit.id}`} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box onClick={() => canExp && toggle(visit.id)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, bgcolor: c.bg, cursor: canExp ? 'pointer' : 'default', '&:hover': canExp ? { bgcolor: alpha(c.color, 0.1) } : {} }}>
              <Chip label={c.icon} size="small" sx={{ bgcolor: c.color, color: '#fff', fontWeight: 700, fontSize: 11, height: 24, minWidth: 40 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{visit.description}</Typography>
                <Typography variant="caption" color="text.secondary">{fmt(visit.date)}{visit.detail ? ` · ${visit.detail}` : ''}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={700}>{currency(visit.total)}</Typography>
                  {visit.paid > 0 && <Typography variant="caption" color="success.main" fontWeight={600}>Paid {currency(visit.paid)}</Typography>}
                </Box>
                {bal > 0 && <Chip label={currency(bal)} size="small" color="error" variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />}
                <StatusChip status={visit.status} />
                {canExp && (open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
              </Box>
            </Box>
            <Collapse in={open}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {hasBk && (
                  <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(c.color, 0.02) }}>
                    <Grid container spacing={1}>
                      {[{ l: 'Consultation', v: visit.consultation, cl: '#4A90E2' }, { l: 'Lab', v: visit.lab, cl: '#9B59B6' }, { l: 'Pharmacy', v: visit.medicine, cl: '#50C878' }, { l: 'Scans', v: visit.scan, cl: '#F39C12' }, { l: 'Ward', v: visit.ward, cl: '#1ABC9C' }].filter(x => x.v > 0).map(x => (
                        <Grid item xs={6} sm={4} md={3} key={x.l}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(x.cl, 0.06), border: `1px solid ${alpha(x.cl, 0.12)}`, textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: x.cl }}>{currency(x.v)}</Typography>
                            <Typography variant="caption" color="text.secondary">{x.l}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Tooltip title="Download Receipt"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleReceipt(visit); }}><Download fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </Box>
                )}
                {hasCh && (
                  <Box sx={{ borderTop: hasBk ? '1px solid' : 'none', borderColor: 'divider' }}>
                    {visit.children.map((ch: any, i: number) => (
                      <Box key={`${ch.type}-${ch.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, pl: 3, py: 0.75, bgcolor: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                        <Chip label={ch.type} size="small" variant="outlined" color={ch.type === 'LAB' ? 'info' : ch.type === 'PHARMACY' ? 'success' : 'default'} sx={{ fontSize: 10, fontWeight: 600, height: 20, minWidth: 56 }} />
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>{ch.description}</Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ minWidth: 70, textAlign: 'right' }}>{ch.total > 0 ? currency(ch.total) : '—'}</Typography>
                        <StatusChip status={ch.status} />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
};

export default PatientProfile;
