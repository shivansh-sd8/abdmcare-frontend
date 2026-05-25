import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Grid, Card, CardContent, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  Skeleton, Alert, IconButton, Tooltip, alpha, Divider,
} from '@mui/material';
import {
  Person, LocalHospital, CalendarToday, Phone, Email, ArrowBack,
  MedicalServices, School, Badge, CurrencyRupee, Groups,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import { toast } from 'react-toastify';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
    {value === index && children}
  </Box>
);

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const currency = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchProfile();
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
        <Avatar sx={{ width: 56, height: 56, bgcolor: '#1976d2', fontSize: 24 }}>
          {doctor.firstName?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">Dr. {doctor.firstName} {doctor.lastName}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip icon={<MedicalServices />} label={doctor.specialization} size="small" color="primary" />
            {doctor.qualification && <Chip icon={<School />} label={doctor.qualification} size="small" variant="outlined" />}
            <Chip icon={<Badge />} label={`Reg: ${doctor.registrationNo}`} size="small" variant="outlined" />
            {doctor.hprId && <Chip label={`HPR: ${doctor.hprId}`} size="small" color="success" />}
          </Box>
        </Box>
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

          {/* Tab 3: Schedule */}
          <TabPanel value={tab} index={3}>
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

          {/* Tab 4: Earnings */}
          <TabPanel value={tab} index={4}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ textAlign: 'center', background: `linear-gradient(135deg, ${alpha('#1ABC9C', 0.08)} 0%, ${alpha('#1ABC9C', 0.02)} 100%)`, border: `1px solid ${alpha('#1ABC9C', 0.2)}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total Earnings</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#1ABC9C">{currency(summary.totalEarnings)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Monthly Breakdown</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Amount</TableCell>
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
                    <TableRow><TableCell colSpan={2} align="center"><Typography color="text.secondary">No earnings data</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

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
