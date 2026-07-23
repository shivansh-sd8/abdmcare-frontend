import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Grid, Card, CardContent, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  Skeleton, Alert, IconButton, Tooltip, alpha, Divider, Stack, useTheme,
} from '@mui/material';
import {
  Person, LocalHospital, CalendarToday, Phone, Email, ArrowBack,
  MedicalServices, School, Badge, CurrencyRupee, Groups, Edit, Schedule,
  EventAvailable, EventBusy, Coffee, TrendingUp, AccountBalanceWallet,
  Receipt, Storefront,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import { toast } from 'react-toastify';
import DoctorEditDialog from './DoctorEditDialog';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
    {value === index && children}
  </Box>
);

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const currency = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<0 | 1 | 2>(0);
  const [scheduleData, setScheduleData] = useState<any>(null);

  // Who is logged in? Used to gate the Edit button.
  // Admins can edit any doctor in their hospital; super-admins anyone;
  // a logged-in doctor can edit their own profile + schedule.
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchSchedule();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res: any = await doctorService.getDoctorProfile(id!);
      setData(res.data?.data || res.data);
    } catch (err: any) {
      toast.error('Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res: any = await doctorService.getSchedule(id!);
      setScheduleData(res.data?.data || res.data);
    } catch {
      // schedule is optional — silently degrade
    }
  };

  const reloadAll = () => { fetchProfile(); fetchSchedule(); };

  const canEdit = useMemo(() => {
    if (!data?.doctor) return false;
    if (currentUser?.role === 'SUPER_ADMIN') return true;
    if (currentUser?.role === 'ADMIN' && currentUser?.hospitalId === data.doctor.hospitalId) return true;
    // Doctor editing themselves
    if (currentUser?.role === 'DOCTOR' && currentUser?.id === data.doctor.userId) return true;
    return false;
  }, [data, currentUser]);

  const openEdit = (tabIdx: 0 | 1 | 2 = 0) => {
    setEditTab(tabIdx);
    setEditOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Doctor not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const { doctor, summary, encounters, appointments, patientsSeen, earningsSummary } = data;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
        <Avatar sx={{ width: 56, height: 56, bgcolor: '#1976d2', fontSize: 24 }}>
          {doctor.firstName?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h5" fontWeight="bold">Dr. {doctor.firstName} {doctor.lastName}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip icon={<MedicalServices />} label={doctor.specialization} size="small" color="primary" />
            {doctor.qualification && <Chip icon={<School />} label={doctor.qualification} size="small" variant="outlined" />}
            <Chip icon={<Badge />} label={`Reg: ${doctor.registrationNo}`} size="small" variant="outlined" />
            {doctor.hprId && <Chip label={`HPR: ${doctor.hprId}`} size="small" color="success" />}
            {doctor.isActive === false && <Chip label="Inactive" size="small" color="error" variant="outlined" />}
          </Box>
        </Box>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CurrencyRupee />}
              onClick={() => openEdit(1)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Set fee
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Schedule />}
              onClick={() => openEdit(2)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Schedule
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Edit />}
              onClick={() => openEdit(0)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Edit profile
            </Button>
          </Stack>
        )}
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Overview" icon={<Person />} iconPosition="start" />
          <Tab label={`Patients (${summary.totalPatientsSeen})`} icon={<Groups />} iconPosition="start" />
          <Tab label={`Encounters (${summary.totalEncounters})`} icon={<LocalHospital />} iconPosition="start" />
          <Tab label={`Schedule (${summary.totalAppointments})`} icon={<CalendarToday />} iconPosition="start" />
          <Tab label="Earnings" icon={<CurrencyRupee />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Tab 0: Overview */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Doctor Details</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <InfoRow icon={<Person />} label="Name" value={`Dr. ${doctor.firstName} ${doctor.lastName}`} />
                    <InfoRow icon={<MedicalServices />} label="Specialization" value={doctor.specialization} />
                    <InfoRow icon={<School />} label="Qualification" value={doctor.qualification || '—'} />
                    <InfoRow icon={<Badge />} label="Registration" value={doctor.registrationNo} />
                    <InfoRow icon={<Phone />} label="Mobile" value={doctor.mobile} />
                    {doctor.email && <InfoRow icon={<Email />} label="Email" value={doctor.email} />}
                    {doctor.consultationFee && <InfoRow icon={<CurrencyRupee />} label="Consultation Fee" value={currency(doctor.consultationFee)} />}
                    {doctor.department && <InfoRow icon={<LocalHospital />} label="Department" value={doctor.department.name} />}
                    {doctor.hospital && <InfoRow icon={<LocalHospital />} label="Hospital" value={doctor.hospital.name} />}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={7}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Patients Seen', value: summary.totalPatientsSeen, color: '#4A90E2' },
                    { label: 'Total Encounters', value: summary.totalEncounters, color: '#50C878' },
                    { label: 'Appointments', value: summary.totalAppointments, color: '#F39C12' },
                    { label: 'Prescriptions', value: summary.totalPrescriptions, color: '#9B59B6' },
                    { label: 'Total Earnings', value: currency(summary.totalEarnings), color: '#1ABC9C', isText: true },
                  ].map((s: any) => (
                    <Grid item xs={6} sm={4} key={s.label}>
                      <Card sx={{ textAlign: 'center', background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.02)} 100%)`, border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant={s.isText ? 'h6' : 'h5'} fontWeight="bold" color={s.color}>{s.isText ? s.value : s.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Patients Seen */}
          <TabPanel value={tab} index={1}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>UHID</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Last Visit</TableCell>
                    <TableCell>Last Diagnosis</TableCell>
                    <TableCell>Visit Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(patientsSeen || []).map((p: any) => (
                    <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/app/patients/${p.id}`)}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: p.gender === 'Male' ? '#1976d2' : '#9c27b0', fontSize: 14 }}>
                            {p.firstName?.charAt(0)}
                          </Avatar>
                          {p.firstName} {p.lastName}
                        </Box>
                      </TableCell>
                      <TableCell>{p.uhid}</TableCell>
                      <TableCell>{p.gender || '—'}</TableCell>
                      <TableCell>{p.mobile || '—'}</TableCell>
                      <TableCell>{fmt(p.lastVisit)}</TableCell>
                      <TableCell>{p.lastDiagnosis || '—'}</TableCell>
                      <TableCell><Chip label={p.visitCount} size="small" color="primary" /></TableCell>
                    </TableRow>
                  ))}
                  {(!patientsSeen || patientsSeen.length === 0) && (
                    <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary">No patients seen yet</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 2: Encounters */}
          <TabPanel value={tab} index={2}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Chief Complaint</TableCell>
                    <TableCell>Diagnosis</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(encounters || []).map((enc: any) => (
                    <TableRow key={enc.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/app/encounters/${enc.id}`)}>
                      <TableCell>{fmt(enc.visitDate)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{enc.patient?.firstName} {enc.patient?.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">{enc.patient?.uhid}</Typography>
                      </TableCell>
                      <TableCell><Chip label={enc.type} size="small" /></TableCell>
                      <TableCell>{enc.chiefComplaint || '—'}</TableCell>
                      <TableCell>{enc.finalDiagnosis || enc.diagnosis || '—'}</TableCell>
                      <TableCell><StatusChip status={enc.status} /></TableCell>
                    </TableRow>
                  ))}
                  {(!encounters || encounters.length === 0) && (
                    <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary">No encounters</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 3: Schedule — weekly working-hours grid + appointments */}
          <TabPanel value={tab} index={3}>
            {/* Working-hours summary */}
            <ScheduleSummary
              schedule={scheduleData}
              canEdit={canEdit}
              onEdit={() => openEdit(2)}
            />

            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
              Upcoming & past appointments
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(appointments || []).map((apt: any) => (
                    <TableRow key={apt.id} hover>
                      <TableCell>{fmt(apt.scheduledAt)} {apt.scheduledAt ? new Date(apt.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</TableCell>
                      <TableCell>
                        {apt.patient ? (
                          <Box>
                            <Typography variant="body2">{apt.patient.firstName} {apt.patient.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">{apt.patient.uhid}</Typography>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Chip label={apt.type || 'CONSULTATION'} size="small" /></TableCell>
                      <TableCell><StatusChip status={apt.status} /></TableCell>
                      <TableCell>{apt.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(!appointments || appointments.length === 0) && (
                    <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary">No appointments</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 4: Earnings — consult-only with ancillary breakdown */}
          <TabPanel value={tab} index={4}>
            <Alert
              severity="info"
              icon={<TrendingUp />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <strong>Doctor's earnings = consultation fee only.</strong> Pharmacy, lab and
              radiology charges that the front desk collects against this doctor's
              encounters are tracked separately under <em>Ancillary collections</em> below
              — they belong to the hospital's pharmacy / diagnostics budgets, not the doctor.
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <EarningsStatCard
                  icon={<AccountBalanceWallet />}
                  label="Doctor's earnings"
                  hint="Capped consult fee per encounter"
                  value={currency(summary.totalEarnings)}
                  color={theme.palette.success.main}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <EarningsStatCard
                  icon={<Receipt />}
                  label="Total collected"
                  hint="All money received against this doctor's encounters"
                  value={currency(summary.totalCollected ?? summary.totalEarnings)}
                  color={theme.palette.info.main}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <EarningsStatCard
                  icon={<Storefront />}
                  label="Ancillary (pharmacy / lab / scan)"
                  hint="Belongs to hospital, not doctor"
                  value={currency(summary.totalAncillary ?? 0)}
                  color={theme.palette.warning.main}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Monthly earnings (consultation fees only)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Doctor's earnings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(earningsSummary || []).map((e: any) => (
                    <TableRow key={e.month} hover>
                      <TableCell>{e.month}</TableCell>
                      <TableCell align="right">{currency(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {(!earningsSummary || earningsSummary.length === 0) && (
                    <TableRow><TableCell colSpan={2} align="center"><Typography color="text.secondary">No earnings data yet</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>

      {/* Edit profile / fee / schedule dialog */}
      <DoctorEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        doctor={{ ...doctor, ...(scheduleData || {}) }}
        initialTab={editTab}
        onSaved={reloadAll}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Schedule summary — weekly working-hours card on the Schedule tab.
// Reads from getSchedule() (workingHours / slotDuration / breakTimes / hospital
// fallbacks) and renders a clean per-day chip strip.
// ---------------------------------------------------------------------------
const ScheduleSummary: React.FC<{
  schedule: any;
  canEdit: boolean;
  onEdit: () => void;
}> = ({ schedule, canEdit, onEdit }) => {
  const theme = useTheme();
  // Unify workingHours shape: accept upper- or lower-cased keys.
  const wh: Record<string, any> = (schedule?.workingHours || {}) as any;
  const hospitalHours: Record<string, any> = (schedule?.hospital?.operatingHours || {}) as any;

  const dayInfo = (k: string) => {
    const item = wh[k] ?? wh[k.toLowerCase()] ?? hospitalHours[k] ?? hospitalHours[k.toLowerCase()];
    if (!item || typeof item !== 'object') return { open: false, start: '', end: '' };
    return {
      open: item.open !== undefined ? !!item.open : !!(item.start && item.end),
      start: item.start || '',
      end: item.end || '',
    };
  };

  const slot = Number(schedule?.slotDuration) || Number(schedule?.hospital?.defaultSlotDuration) || 15;
  const maxPerDay = Number(schedule?.maxPatientsPerDay) || 30;
  const breaks = Array.isArray(schedule?.breakTimes) ? schedule.breakTimes : [];

  const openCount = DAY_KEYS.filter((k) => dayInfo(k).open).length;
  const totalHours = DAY_KEYS.reduce((acc, k) => {
    const d = dayInfo(k);
    if (!d.open || !d.start || !d.end) return acc;
    const [sh, sm] = d.start.split(':').map(Number);
    const [eh, em] = d.end.split(':').map(Number);
    return acc + Math.max(0, (eh + em / 60) - (sh + sm / 60));
  }, 0);

  return (
    <Paper variant="outlined" sx={{
      p: 2, borderRadius: 2,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.primary.main, 0.0)} 100%)`,
    }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Weekly availability</Typography>
          <Typography variant="caption" color="text.secondary">
            {openCount} day{openCount === 1 ? '' : 's'} open · {totalHours.toFixed(1)} h / week ·
            slot {slot} min · max {maxPerDay} patients / day
          </Typography>
        </Box>
        {canEdit && (
          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={onEdit} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Edit schedule
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        {DAY_KEYS.map((k) => {
          const d = dayInfo(k);
          return (
            <Paper
              key={k}
              variant="outlined"
              sx={{
                p: 1, borderRadius: 2, minWidth: 96, textAlign: 'center',
                borderColor: d.open ? alpha(theme.palette.success.main, 0.4) : 'divider',
                background: d.open ? alpha(theme.palette.success.main, 0.06) : alpha(theme.palette.text.disabled, 0.04),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {DAY_LABELS[k]}
              </Typography>
              {d.open ? (
                <>
                  <Typography variant="body2" fontWeight={700}>{d.start}</Typography>
                  <Typography variant="caption" color="text.secondary">to {d.end}</Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.disabled" fontWeight={700}>Closed</Typography>
              )}
            </Paper>
          );
        })}
      </Stack>

      {breaks.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Breaks</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {breaks.map((b: any, i: number) => (
              <Chip
                key={i}
                size="small"
                icon={<Coffee />}
                label={`${(b.day || 'ALL').toString().toUpperCase()} · ${b.start}–${b.end}${b.label ? ` (${b.label})` : ''}`}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Earnings card primitive
// ---------------------------------------------------------------------------
const EarningsStatCard: React.FC<{
  icon: React.ReactElement;
  label: string;
  hint?: string;
  value: string;
  color: string;
}> = ({ icon, label, hint, value, color }) => (
  <Paper variant="outlined" sx={{
    p: 2, borderRadius: 2, height: '100%',
    background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.0)} 100%)`,
    border: `1px solid ${alpha(color, 0.25)}`,
  }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: 1.5, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: alpha(color, 0.18), color,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const InfoRow: React.FC<{ icon: React.ReactElement; label: string; value: string }> = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Tooltip title={label}>{React.cloneElement(icon, { sx: { fontSize: 18, color: 'text.secondary' } })}</Tooltip>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>{label}:</Typography>
    <Typography variant="body2" fontWeight="500">{value || '—'}</Typography>
  </Box>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    COMPLETED: 'success', PAID: 'success', ACTIVE: 'success', SCHEDULED: 'info',
    CONFIRMED: 'info', IN_PROGRESS: 'info', CHECKED_IN: 'info',
    PENDING: 'warning', CANCELLED: 'error', NO_SHOW: 'error',
  };
  return <Chip label={status} size="small" color={colorMap[status] || 'default'} />;
};

export default DoctorProfile;
