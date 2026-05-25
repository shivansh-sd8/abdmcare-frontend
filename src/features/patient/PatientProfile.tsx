import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Grid, Card, CardContent, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  Skeleton, Alert, IconButton, Tooltip, alpha, Divider, LinearProgress,
  Collapse,
} from '@mui/material';
import {
  Person, LocalHospital, Science, Medication, MonitorHeart, Receipt,
  Hotel, HealthAndSafety, CalendarToday, Phone, Email, Bloodtype,
  ArrowBack, EventAvailable, MedicalServices, TrendingUp, Home,
  ExpandMore, ExpandLess, Download, Verified, Warning,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import ehrService from '../../services/ehrService';
import { toast } from 'react-toastify';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
    {value === index && children}
  </Box>
);

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: any) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const currency = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const formatLabResults = (results: any): string => {
  if (!results) return '—';
  if (typeof results === 'string') return results;
  if (typeof results !== 'object') return String(results);

  const parts: string[] = [];
  if (results.notes) parts.push(results.notes);
  if (Array.isArray(results.parameters)) {
    results.parameters.forEach((p: any) => {
      const name = p.name || p.parameterName || '';
      const val = p.value || p.result || '';
      const unit = p.unit || '';
      const ref = p.referenceRange || p.normalRange || '';
      if (name && val) {
        parts.push(`${name}: ${val}${unit ? ' ' + unit : ''}${ref ? ` (Ref: ${ref})` : ''}`);
      }
    });
  }
  if (results.interpretation) parts.push(`Interpretation: ${results.interpretation}`);
  if (results.conclusion) parts.push(results.conclusion);

  return parts.length > 0 ? parts.join('\n') : JSON.stringify(results);
};

// ── Main Component ───────────────────────────────────────────────────────────

const PatientProfile: React.FC = () => {
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
      const res: any = await ehrService.getPatientProfile(id!);
      setData(res.data?.data || res.data);
    } catch (err: any) {
      toast.error('Failed to load patient profile');
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
        <Alert severity="error">Patient not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const { patient, summary, billingOverview, chargeItems, latestVitals, activeAdmission, encounters, prescriptions, vitals, investigations, payments, admissions, consents } = data;
  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : null;
  const address = patient.address
    ? typeof patient.address === 'object'
      ? [patient.address.line, patient.address.district, patient.address.city, patient.address.state, patient.address.pincode].filter(Boolean).join(', ')
      : patient.address
    : null;

  return (
    <Box>
      {/* ── Header ── */}
      <Paper sx={{ p: 2.5, mb: 2, borderRadius: 3, background: 'linear-gradient(135deg, #f8f9fe 0%, #fff 100%)', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: alpha('#000', 0.04) }}><ArrowBack /></IconButton>
          <Avatar sx={{ width: 60, height: 60, bgcolor: patient.gender === 'Male' ? '#1976d2' : '#9c27b0', fontSize: 26, fontWeight: 700 }}>
            {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700}>{patient.firstName} {patient.lastName}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
              <Chip label={patient.uhid} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
              {patient.gender && <Chip label={`${patient.gender.toUpperCase()}${age != null ? `, ${age}y` : ''}`} size="small" sx={{ fontWeight: 500 }} />}
              {patient.bloodGroup && <Chip icon={<Bloodtype sx={{ fontSize: 14 }} />} label={patient.bloodGroup} size="small" color="error" variant="outlined" />}
              <Chip icon={<Phone sx={{ fontSize: 14 }} />} label={patient.mobile} size="small" variant="outlined" />
              {(patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId) && (
                <Chip icon={<Verified sx={{ fontSize: 14 }} />} label={`ABHA: ${patient.abhaRecord?.abhaNumber || patient.abhaNumber || patient.abhaId}`} size="small" color="success" variant="outlined" />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button variant="outlined" size="small" startIcon={<EventAvailable />} onClick={() => navigate('/app/appointments/schedule', { state: { patientId: patient.id } })}>
              Book Appointment
            </Button>
          </Box>
        </Box>
      </Paper>

      {activeAdmission && (
        <Alert severity="warning" icon={<Hotel />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>Currently Admitted</strong> — {activeAdmission.admissionNumber} | Ward: {activeAdmission.ward?.name} | Bed: {activeAdmission.bed?.bedNumber}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1, borderColor: 'divider', px: 1, minHeight: 44,
            '& .MuiTab-root': { minHeight: 44, py: 1, fontSize: 13, textTransform: 'none' },
          }}
        >
          <Tab label="Overview" icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Encounters (${summary.totalEncounters})`} icon={<LocalHospital sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Prescriptions (${summary.totalPrescriptions})`} icon={<Medication sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Vitals (${summary.totalVitals})`} icon={<MonitorHeart sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Lab & Radiology (${summary.totalInvestigations})`} icon={<Science sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Billing" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`IPD (${summary.totalAdmissions})`} icon={<Hotel sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="ABHA & Consent" icon={<HealthAndSafety sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>

          {/* ═══════════════ Tab 0: Overview ═══════════════ */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2.5}>
              {/* Demographics */}
              <Grid item xs={12} md={4}>
                <SectionCard title="Demographics">
                  <InfoRow icon={<Person />} label="Name" value={`${patient.firstName} ${patient.lastName}`} />
                  <InfoRow icon={<CalendarToday />} label="DOB" value={`${fmt(patient.dob)}${age != null ? ` (${age}y)` : ''}`} />
                  <InfoRow icon={<Phone />} label="Mobile" value={patient.mobile} />
                  {patient.email && <InfoRow icon={<Email />} label="Email" value={patient.email} />}
                  {address && <InfoRow icon={<Home />} label="Address" value={address} />}
                </SectionCard>
              </Grid>

              {/* Latest Vitals */}
              <Grid item xs={12} md={4}>
                <SectionCard title="Latest Vitals">
                  {latestVitals ? (
                    <>
                      {latestVitals.bloodPressureSystolic && <InfoRow icon={<TrendingUp />} label="BP" value={`${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg`} />}
                      {latestVitals.heartRate && <InfoRow icon={<MonitorHeart />} label="Pulse" value={`${latestVitals.heartRate} bpm`} />}
                      {latestVitals.temperature && <InfoRow icon={<MonitorHeart />} label="Temp" value={`${latestVitals.temperature}°C`} />}
                      {latestVitals.oxygenSaturation && <InfoRow icon={<MonitorHeart />} label="SpO₂" value={`${latestVitals.oxygenSaturation}%`} />}
                      {latestVitals.weight && <InfoRow icon={<MonitorHeart />} label="Weight" value={`${latestVitals.weight} kg`} />}
                      {latestVitals.height && <InfoRow icon={<MonitorHeart />} label="Height" value={`${latestVitals.height} cm`} />}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Recorded: {fmtTime(latestVitals.recordedAt)}</Typography>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <MonitorHeart sx={{ fontSize: 40, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">No vitals recorded yet</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>

              {/* Billing Summary */}
              <Grid item xs={12} md={4}>
                <SectionCard title="Billing Summary">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <BillingRow label="Total Billed" value={billingOverview?.totalBilled} color="#1a3c6e" />
                    <BillingRow label="Total Paid" value={billingOverview?.totalPaid} color="#27ae60" />
                    <Divider />
                    <BillingRow
                      label="Outstanding"
                      value={billingOverview?.totalOutstanding}
                      color={billingOverview?.totalOutstanding > 0 ? '#e74c3c' : '#27ae60'}
                      bold
                    />
                    {billingOverview?.totalBilled > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (billingOverview.totalPaid / billingOverview.totalBilled) * 100)}
                        sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#27ae60', 0.12), '& .MuiLinearProgress-bar': { bgcolor: '#27ae60', borderRadius: 3 } }}
                      />
                    )}
                  </Box>
                </SectionCard>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12}>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Encounters', value: summary.totalEncounters, color: '#4A90E2', tab: 1 },
                    { label: 'Prescriptions', value: summary.totalPrescriptions, color: '#50C878', tab: 2 },
                    { label: 'Vitals', value: summary.totalVitals, color: '#F39C12', tab: 3 },
                    { label: 'Investigations', value: summary.totalInvestigations, color: '#9B59B6', tab: 4 },
                    { label: 'Payments', value: summary.totalPayments, color: '#E74C3C', tab: 5 },
                    { label: 'Admissions', value: summary.totalAdmissions, color: '#1ABC9C', tab: 6 },
                  ].map((s) => (
                    <Grid item xs={4} sm={2} key={s.label}>
                      <Card
                        onClick={() => setTab(s.tab)}
                        sx={{
                          textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                          background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                          border: `1px solid ${alpha(s.color, 0.15)}`,
                          transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${alpha(s.color, 0.2)}` },
                        }}
                      >
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

          {/* ═══════════════ Tab 1: Encounters ═══════════════ */}
          <TabPanel value={tab} index={1}>
            {(!encounters || encounters.length === 0) ? (
              <EmptyState icon={<LocalHospital />} message="No encounters recorded" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Chief Complaint</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Diagnosis</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Charges</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {encounters.map((enc: any) => (
                      <TableRow key={enc.id} hover>
                        <TableCell>
                          <Typography variant="body2">{fmt(enc.visitDate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={enc.type} size="small" variant="outlined"
                            color={enc.type === 'OPD' ? 'primary' : enc.type === 'IPD' ? 'secondary' : 'default'}
                            sx={{ fontWeight: 600, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            Dr. {enc.doctor?.firstName} {enc.doctor?.lastName}
                          </Typography>
                          {enc.doctor?.specialization && (
                            <Typography variant="caption" color="text.secondary">{enc.doctor.specialization}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 160 }} noWrap title={enc.chiefComplaint}>
                            {enc.chiefComplaint || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={enc.finalDiagnosis ? 600 : 400} sx={{ maxWidth: 160 }} noWrap
                            title={enc.finalDiagnosis || enc.diagnosis || ''}>
                            {enc.finalDiagnosis || enc.diagnosis || <span style={{ color: '#aaa' }}>Pending</span>}
                          </Typography>
                        </TableCell>
                        <TableCell><StatusChip status={enc.status} /></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>{currency(enc.totalAmount)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StatusChip status={enc.paymentStatus || 'PENDING'} />
                            {Number(enc.paymentCollected || 0) > 0 && (
                              <Typography variant="caption" color="success.main" fontWeight={600}>
                                {currency(enc.paymentCollected)}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* ═══════════════ Tab 2: Prescriptions ═══════════════ */}
          <TabPanel value={tab} index={2}>
            {(!prescriptions || prescriptions.length === 0) ? (
              <EmptyState icon={<Medication />} message="No prescriptions issued" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Diagnosis</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Medications</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Charges</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prescriptions.map((rx: any) => {
                      const meds = Array.isArray(rx.medications) ? rx.medications : [];
                      const uniqueMeds = [...new Map(meds.map((m: any) => [m.name || m.medicineName || m.drug, m])).values()];
                      return (
                        <TableRow key={rx.id} hover>
                          <TableCell>{fmt(rx.issuedAt)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{rx.diagnosis || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {uniqueMeds.slice(0, 4).map((m: any, i: number) => {
                                const name = m.name || m.medicineName || m.drug || 'Unknown';
                                const dosage = m.dosage ? ` ${m.dosage}` : '';
                                return (
                                  <Chip
                                    key={i}
                                    label={`${name}${dosage}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: 11, height: 22, maxWidth: 180 }}
                                    title={`${name}${dosage} · ${m.frequency || ''} · ${m.duration || ''}`}
                                  />
                                );
                              })}
                              {uniqueMeds.length > 4 && <Chip label={`+${uniqueMeds.length - 4}`} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={rx.status || 'PENDING'}
                              size="small"
                              color={rx.status === 'DISPENSED' ? 'success' : rx.status === 'CANCELLED' ? 'error' : 'warning'}
                              sx={{ fontSize: 11, fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={Number(rx.totalCharges) > 0 ? 600 : 400}>
                              {Number(rx.totalCharges) > 0 ? currency(rx.totalCharges) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }} title={rx.notes}>
                              {rx.notes || '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* ═══════════════ Tab 3: Vitals ═══════════════ */}
          <TabPanel value={tab} index={3}>
            {(!vitals || vitals.length === 0) ? (
              <EmptyState icon={<MonitorHeart />} message="No vitals recorded yet" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>BP (mmHg)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Pulse (bpm)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Temp (°C)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SpO₂ (%)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Weight (kg)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Height (cm)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>BMI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vitals.map((v: any) => (
                      <TableRow key={v.id} hover>
                        <TableCell>{fmtTime(v.recordedAt)}</TableCell>
                        <TableCell>{v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '—'}</TableCell>
                        <TableCell>{v.heartRate || '—'}</TableCell>
                        <TableCell>{v.temperature || '—'}</TableCell>
                        <TableCell>{v.oxygenSaturation || '—'}</TableCell>
                        <TableCell>{v.weight || '—'}</TableCell>
                        <TableCell>{v.height || '—'}</TableCell>
                        <TableCell>{v.bmi || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* ═══════════════ Tab 4: Lab & Radiology ═══════════════ */}
          <TabPanel value={tab} index={4}>
            {(!investigations || investigations.length === 0) ? (
              <EmptyState icon={<Science />} message="No investigations ordered" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Test Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Results</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ordered By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {investigations.map((inv: any) => {
                      const parsedResults = formatLabResults(inv.results);
                      const hasResults = parsedResults !== '—';
                      return (
                        <TableRow key={inv.id} hover>
                          <TableCell>{fmt(inv.orderedAt)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{inv.testName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={inv.testType || 'LAB'}
                              size="small"
                              variant="outlined"
                              color={inv.testType === 'RADIOLOGY' ? 'warning' : 'info'}
                              sx={{ fontSize: 11, fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={inv.priority || 'ROUTINE'}
                              size="small"
                              color={inv.priority === 'URGENT' || inv.priority === 'STAT' ? 'error' : 'default'}
                              sx={{ fontSize: 11, fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell><StatusChip status={inv.status} /></TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            {hasResults ? (
                              <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, maxWidth: 400 }}>{parsedResults}</pre>} arrow placement="left">
                                <Typography variant="body2" noWrap sx={{ cursor: 'help', maxWidth: 200, color: '#1a3c6e' }}>
                                  {parsedResults.split('\n')[0]}
                                  {parsedResults.includes('\n') && '…'}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.disabled">Awaiting results</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">Dr. {inv.doctor?.firstName} {inv.doctor?.lastName}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={Number(inv.amount) > 0 ? 600 : 400}>
                              {Number(inv.amount) > 0 ? currency(inv.amount) : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* ═══════════════ Tab 5: Billing ═══════════════ */}
          <TabPanel value={tab} index={5}>
            {/* Summary Cards */}
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
                  <Typography variant="caption" fontWeight={600}>
                    {Math.round((billingOverview.totalPaid / billingOverview.totalBilled) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (billingOverview.totalPaid / billingOverview.totalBilled) * 100)}
                  sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#27ae60', 0.12), '& .MuiLinearProgress-bar': { bgcolor: '#27ae60', borderRadius: 4 } }}
                />
              </Box>
            )}

            {/* Charge breakdown */}
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

            {/* Charges table — only primary items, not detail sub-rows */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>All Charges & Payments</Typography>
            <BillingTable chargeItems={chargeItems} />
          </TabPanel>

          {/* ═══════════════ Tab 6: IPD ═══════════════ */}
          <TabPanel value={tab} index={6}>
            {(!admissions || admissions.length === 0) ? (
              <EmptyState icon={<Hotel />} message="No IPD admissions" />
            ) : (
              admissions.map((adm: any) => {
                const days = adm.dischargedAt
                  ? Math.max(1, Math.ceil((new Date(adm.dischargedAt).getTime() - new Date(adm.admittedAt).getTime()) / 86400000))
                  : Math.max(1, Math.ceil((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000));
                const total = Number(adm.totalAmount || 0);
                const advance = Number(adm.advancePaid || 0);
                const dischargePaid = Number(adm.paymentCollected || 0);
                const totalPaid = advance + dischargePaid;

                return (
                  <Card key={adm.id} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5,
                      bgcolor: adm.status === 'ADMITTED' ? alpha('#4A90E2', 0.06) : adm.status === 'DISCHARGED' ? alpha('#27ae60', 0.06) : alpha('#F39C12', 0.06),
                      borderBottom: '1px solid', borderColor: 'divider',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Hotel sx={{ color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>{adm.admissionNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">{days} day{days > 1 ? 's' : ''} stay</Typography>
                        </Box>
                      </Box>
                      <StatusChip status={adm.status} />
                    </Box>

                    <CardContent>
                      <Grid container spacing={2} sx={{ mb: 1.5 }}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary" display="block">Admitted</Typography>
                          <Typography variant="body2" fontWeight={500}>{fmtTime(adm.admittedAt)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary" display="block">Discharged</Typography>
                          <Typography variant="body2" fontWeight={500}>{adm.dischargedAt ? fmtTime(adm.dischargedAt) : 'Ongoing'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary" display="block">Ward / Bed</Typography>
                          <Typography variant="body2" fontWeight={500}>{adm.ward?.name || '—'} / {adm.bed?.bedNumber || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary" display="block">Daily Rate</Typography>
                          <Typography variant="body2" fontWeight={500}>{currency(adm.dailyCharges || adm.ward?.dailyCharges)}/day</Typography>
                        </Grid>
                      </Grid>

                      {(adm.admissionReason || adm.diagnosis) && (
                        <Box sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1.5 }}>
                          {adm.admissionReason && <Typography variant="body2"><strong>Reason:</strong> {adm.admissionReason}</Typography>}
                          {adm.diagnosis && <Typography variant="body2"><strong>Diagnosis:</strong> {adm.diagnosis}</Typography>}
                        </Box>
                      )}

                      {/* Billing for this admission */}
                      {total > 0 && (
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', p: 1.5, bgcolor: alpha('#1a3c6e', 0.03), borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Total Bill</Typography>
                            <Typography variant="body1" fontWeight={700}>{currency(total)}</Typography>
                          </Box>
                          {advance > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Advance Paid</Typography>
                              <Typography variant="body1" fontWeight={600} color="info.main">{currency(advance)}</Typography>
                            </Box>
                          )}
                          <Box>
                            <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                            <Typography variant="body1" fontWeight={600} color="success.main">{currency(totalPaid)}</Typography>
                          </Box>
                          {total - totalPaid > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Balance</Typography>
                              <Typography variant="body1" fontWeight={600} color="error.main">{currency(total - totalPaid)}</Typography>
                            </Box>
                          )}
                          <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
                            <StatusChip status={adm.paymentStatus || 'PENDING'} />
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabPanel>

          {/* ═══════════════ Tab 7: ABHA & Consent ═══════════════ */}
          <TabPanel value={tab} index={7}>
            <Grid container spacing={3}>
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
                        {patient.abhaRecord?.healthId && <InfoRow icon={<Person />} label="Health ID" value={patient.abhaRecord.healthId} />}
                        {patient.abhaRecord?.name && <InfoRow icon={<Person />} label="ABHA Name" value={patient.abhaRecord.name} />}
                      </>
                    );
                  })() : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <HealthAndSafety sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No ABHA linked to this patient</Typography>
                      <Typography variant="caption" color="text.secondary">ABHA can be linked during patient check-in or via ABHA Management</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <SectionCard title="Consent Records">
                  {(consents || []).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <HealthAndSafety sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No consent records</Typography>
                    </Box>
                  ) : (
                    consents.map((c: any) => (
                      <Box key={c.id} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={600}>{c.purpose || 'Health Data Consent'}</Typography>
                          <StatusChip status={c.status} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">{fmtTime(c.createdAt)}</Typography>
                      </Box>
                    ))
                  )}
                </SectionCard>
              </Grid>
            </Grid>
          </TabPanel>

        </Box>
      </Paper>
    </Box>
  );
};

// ── Sub-Components ───────────────────────────────────────────────────────────

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

const EmptyState: React.FC<{ icon: React.ReactElement; message: string }> = ({ icon, message }) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    {React.cloneElement(icon, { sx: { fontSize: 52, color: 'text.disabled', mb: 1 } })}
    <Typography color="text.secondary">{message}</Typography>
  </Box>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  if (!status) return null;
  const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label?: string }> = {
    COMPLETED: { color: 'success' }, PAID: { color: 'success' }, DISPENSED: { color: 'success' },
    ACTIVE: { color: 'success' }, ADMITTED: { color: 'info' }, DISCHARGE_READY: { color: 'warning', label: 'DISCHARGE READY' },
    IN_PROGRESS: { color: 'info', label: 'IN PROGRESS' }, ORDERED: { color: 'info' },
    PENDING: { color: 'warning' }, REQUESTED: { color: 'warning' }, PARTIAL: { color: 'warning' },
    SAMPLE_COLLECTED: { color: 'info', label: 'SAMPLE COLLECTED' },
    CANCELLED: { color: 'error' }, REJECTED: { color: 'error' },
    DISCHARGED: { color: 'default' },
  };
  const cfg = map[status] || { color: 'default' as const };
  return (
    <Chip
      label={cfg.label || status.replace(/_/g, ' ')}
      size="small"
      color={cfg.color}
      sx={{ fontSize: 11, fontWeight: 600, height: 22 }}
    />
  );
};

const BillingTable: React.FC<{ chargeItems: any[] }> = ({ chargeItems }) => {
  const [showDetails, setShowDetails] = useState(false);
  const items = chargeItems || [];
  const primaryItems = items.filter((i: any) => !i.isDetail);
  const detailItems = items.filter((i: any) => i.isDetail);
  const displayItems = showDetails ? items : primaryItems;

  return (
    <>
      {detailItems.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Button
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {showDetails ? 'Hide' : 'Show'} detailed breakdown ({detailItems.length} items)
          </Button>
        </Box>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Paid</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayItems.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 2 }}>No charges or payments</Typography></TableCell></TableRow>
            ) : (
              displayItems.map((item: any) => {
                const isDetail = item.isDetail;
                const balance = Math.max(0, (item.total || 0) - (item.paid || 0));
                const typeColor: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'default'> = {
                  OPD: 'primary', IPD: 'secondary', LAB: 'info', PHARMACY: 'success', RECEIPT: 'warning', PAYMENT: 'default',
                };
                return (
                  <TableRow key={`${item.type}-${item.id}`} hover sx={{ bgcolor: isDetail ? alpha('#f8f9fa', 0.5) : 'inherit' }}>
                    <TableCell>
                      <Typography variant="body2" color={isDetail ? 'text.secondary' : 'text.primary'}>{fmt(item.date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.type}
                        size="small"
                        variant={isDetail ? 'outlined' : 'filled'}
                        color={typeColor[item.type] || 'default'}
                        sx={{ fontSize: 10, fontWeight: 600, height: 20 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={isDetail ? 400 : 500}>{item.description}</Typography>
                      {item.detail && <Typography variant="caption" color="text.secondary" display="block">{item.detail}</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {item.total > 0 ? currency(item.total) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight={item.paid > 0 ? 600 : 400}>
                        {item.paid > 0 ? currency(item.paid) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={balance > 0 ? 'error.main' : 'text.secondary'} fontWeight={balance > 0 ? 600 : 400}>
                        {balance > 0 ? currency(balance) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusChip status={item.status} /></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default PatientProfile;
