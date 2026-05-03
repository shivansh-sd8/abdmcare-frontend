import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, CircularProgress,
  Alert, Grid, Card, CardContent, alpha, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  MedicalInformation, LocalHospital, Assignment, Schedule,
  CheckCircle, Edit as EditIcon, Visibility, HourglassEmpty, Hotel as AdmitIcon,
  CurrencyRupee, Money, PhoneAndroid, AccountBalance,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import encounterService from '../../services/encounterService';
import ConsultationDialog from './CompleteConsultationDialog';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Encounter {
  id: string;
  encounterId?: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string };
  doctor?: { firstName: string; lastName: string; specialization?: string };
  appointment?: any;
  type: string;
  status: string;
  chiefComplaint: string;
  finalDiagnosis?: string;
  diagnosis?: string;
  notes?: string;
  prescriptions?: any[];
  labOrders?: any[];
  visitDate?: string;
  createdAt: string;
  consultationFee?: number;
  labCharges?: number;
  medicineCharges?: number;
  totalAmount?: number;
  paymentStatus?: string;
}

const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS:      '#F39C12',
  ACTIVE:           '#4A90E2',
  CHECKED_IN:       '#2980b9',
  COMPLETED:        '#27ae60',
  LAB_PENDING:      '#8e44ad',
  PHARMACY_PENDING: '#d35400',
  BILLING_PENDING:  '#7f8c8d',
  CANCELLED:        '#e74c3c',
};

const STATUS_CHIP_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  IN_PROGRESS:      'warning',
  ACTIVE:           'info',
  CHECKED_IN:       'info',
  COMPLETED:        'success',
  LAB_PENDING:      'info',
  PHARMACY_PENDING: 'warning',
  BILLING_PENDING:  'default',
  CANCELLED:        'error',
};

const ACTIVE_STATUSES  = new Set(['IN_PROGRESS', 'ACTIVE', 'CHECKED_IN']);
const PENDING_STATUSES = new Set(['LAB_PENDING', 'PHARMACY_PENDING', 'BILLING_PENDING']);

// ─── Component ────────────────────────────────────────────────────────────────

const EncounterList: React.FC = () => {
  const permissions = useRolePermissions();
  const authUser    = useSelector((state: any) => state.auth?.user);
  const navigate    = useNavigate();

  const [encounters,        setEncounters]        = useState<Encounter[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [statusTab,         setStatusTab]         = useState(0);    // 0=All 1=Waiting 2=In Progress 3=Completed

  const [consultOpen,       setConsultOpen]       = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);

  // Collect Payment dialog
  const [paymentEnc,      setPaymentEnc]      = useState<Encounter | null>(null);
  const [paymentMethod,   setPaymentMethod]   = useState('CASH');
  const [paymentAmount,   setPaymentAmount]   = useState('');
  const [transactionRef,  setTransactionRef]  = useState('');
  const [paymentSaving,   setPaymentSaving]   = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const handleCollectPayment = async () => {
    if (!paymentEnc) return;
    setPaymentSaving(true);
    try {
      await api.patch(`/api/v1/encounters/${paymentEnc.id}/collect-payment`, {
        paymentMethod,
        paymentCollected: parseFloat(paymentAmount) || 0,
        transactionRef:   transactionRef || undefined,
      });
      setPaymentEnc(null);
      fetchEncounters();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to record payment');
    } finally { setPaymentSaving(false); }
  };

  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res: any;
      if (permissions.isDoctor && authUser?.id) {
        res = await encounterService.getDoctorEncounters(authUser.id);
      } else {
        res = await encounterService.getAllEncounters({ page: 1, limit: 200 });
      }
      const list = res.data?.data ?? res.data ?? [];
      setEncounters(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch encounters');
    } finally {
      setLoading(false);
    }
  }, [permissions.isDoctor, authUser?.id]);

  useEffect(() => { fetchEncounters(); }, [fetchEncounters]);

  // ── Open consultation ─────────────────────────────────────────────────────

  const openConsultation = (enc: Encounter) => {
    setSelectedEncounter(enc);
    setConsultOpen(true);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const waiting    = encounters.filter((e) => ACTIVE_STATUSES.has(e.status));
  const completed  = encounters.filter((e) => e.status === 'COMPLETED');
  const pending    = encounters.filter((e) => PENDING_STATUSES.has(e.status));
  const cancelled  = encounters.filter((e) => e.status === 'CANCELLED');

  const TAB_FILTERS: { label: string; count: number; data: Encounter[] }[] = [
    { label: 'All',       count: encounters.length, data: encounters },
    { label: 'Waiting',   count: waiting.length,    data: waiting    },
    { label: 'Completed', count: completed.length,  data: completed  },
    { label: 'Pending',   count: pending.length,    data: pending    },
    { label: 'Cancelled', count: cancelled.length,  data: cancelled  },
  ];

  const visibleEncounters = TAB_FILTERS[statusTab]?.data ?? encounters;

  // ── Stat cards ────────────────────────────────────────────────────────────

  const stats = [
    { label: 'Total',     value: encounters.length,   color: '#4A90E2', icon: <MedicalInformation /> },
    { label: 'Waiting',   value: waiting.length,      color: '#F39C12', icon: <HourglassEmpty />,
      pulse: waiting.length > 0 },
    { label: 'Completed', value: completed.length,    color: '#27ae60', icon: <CheckCircle /> },
    { label: 'Pending',   value: pending.length,      color: '#8e44ad', icon: <Schedule /> },
  ];

  return (
    <Box>
      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1a3c6e">
            {permissions.isDoctor ? 'My Patients' : 'Encounters'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isDoctor
              ? 'Patients checked in and waiting for consultation'
              : 'All clinical encounters'}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Stat cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {stats.map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha(s.color, 0.09)}, ${alpha(s.color, 0.02)})`,
              border: `1px solid ${alpha(s.color, 0.22)}`, borderRadius: 3,
              position: 'relative', overflow: 'visible',
            }}>
              {(s as any).pulse && s.value > 0 && (
                <Box sx={{
                  position: 'absolute', top: -4, right: -4,
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: '#F39C12',
                  boxShadow: '0 0 0 4px rgba(243,156,18,0.3)',
                  animation: 'pulse 1.5s ease infinite',
                  '@keyframes pulse': {
                    '0%,100%': { boxShadow: '0 0 0 4px rgba(243,156,18,0.3)' },
                    '50%': { boxShadow: '0 0 0 8px rgba(243,156,18,0)' },
                  },
                }} />
              )}
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
                <Box sx={{ bgcolor: s.color, borderRadius: 2, p: 0.75, color: 'white' }}>{s.icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Status filter tabs ── */}
      <Paper sx={{ borderRadius: '12px 12px 0 0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Tabs
          value={statusTab}
          onChange={(_, v) => setStatusTab(v)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}
        >
          {TAB_FILTERS.map((tab, idx) => (
            <Tab
              key={tab.label}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {tab.label}
                  {tab.count > 0 && (
                    <Chip label={tab.count} size="small"
                      sx={{
                        height: 18, fontSize: 10, minWidth: 24,
                        bgcolor: idx === 1 && tab.count > 0 ? alpha('#F39C12', 0.15) : alpha('#1a3c6e', 0.1),
                        color:   idx === 1 && tab.count > 0 ? '#b7770d' : '#1a3c6e',
                        fontWeight: 700,
                      }}
                    />
                  )}
                </Box>
              }
              sx={{ minHeight: 44, fontSize: 13, textTransform: 'none' }}
            />
          ))}
        </Tabs>

        {/* ── Table ── */}
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700, pl: 2 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Chief Complaint</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Diagnosis</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Rx / Labs</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleEncounters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 6 }}>
                        <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No encounters found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEncounters.map((enc) => {
                    const isActive     = ACTIVE_STATUSES.has(enc.status);
                    const statusColor  = STATUS_COLOR[enc.status] ?? '#999';
                    const canEdit      = permissions.isDoctor || permissions.isAdmin || permissions.isSuperAdmin;

                    return (
                      <TableRow
                        key={enc.id}
                        hover
                        onClick={() => canEdit && openConsultation(enc)}
                        sx={{
                          cursor: canEdit ? 'pointer' : 'default',
                          bgcolor: isActive ? alpha('#F39C12', 0.04) : 'inherit',
                          borderLeft: isActive ? `3px solid ${statusColor}` : '3px solid transparent',
                          '&:hover': { bgcolor: alpha('#1a3c6e', 0.04) },
                        }}
                      >
                        {/* Patient */}
                        <TableCell sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {enc.patient?.firstName} {enc.patient?.lastName}
                          </Typography>
                          {enc.patient?.uhid && (
                            <Typography variant="caption" color="primary">{enc.patient.uhid}</Typography>
                          )}
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Chip label={enc.type} size="small" variant="outlined"
                            icon={<LocalHospital sx={{ fontSize: 12 }} />}
                            sx={{ fontSize: 11, height: 22 }} />
                        </TableCell>

                        {/* Chief Complaint */}
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {enc.chiefComplaint || <span style={{ color: '#aaa' }}>—</span>}
                          </Typography>
                        </TableCell>

                        {/* Diagnosis */}
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}
                            color={enc.finalDiagnosis || enc.diagnosis ? 'text.primary' : 'text.disabled'}>
                            {enc.finalDiagnosis || enc.diagnosis || 'Pending'}
                          </Typography>
                        </TableCell>

                        {/* Rx / Labs */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {enc.prescriptions?.length ? (
                              <Chip label={`${enc.prescriptions.length} Rx`} size="small" color="primary"
                                sx={{ height: 18, fontSize: 10 }} />
                            ) : null}
                            {enc.labOrders?.length ? (
                              <Chip label={`${enc.labOrders.length} Lab`} size="small" color="warning"
                                sx={{ height: 18, fontSize: 10 }} />
                            ) : null}
                            {!enc.prescriptions?.length && !enc.labOrders?.length && (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Chip
                            label={enc.status.replace(/_/g, ' ')}
                            size="small"
                            color={STATUS_CHIP_COLOR[enc.status] ?? 'default'}
                            sx={{ fontSize: 11, height: 22, fontWeight: isActive ? 700 : 400 }}
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {enc.visitDate
                              ? format(new Date(enc.visitDate), 'dd MMM, hh:mm a')
                              : format(new Date(enc.createdAt), 'dd MMM yyyy')}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {canEdit && (
                              <Tooltip title="Open Consultation">
                                <IconButton size="small" color="primary"
                                  onClick={() => openConsultation(enc)}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="View (read-only)">
                              <IconButton size="small"
                                onClick={() => openConsultation(enc)}>
                                <Visibility sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {/* Admit to IPD — doctor recommends, receptionist finalises */}
                            {permissions.isDoctor && (
                              <Tooltip title="Recommend Admit to IPD">
                                <IconButton size="small" color="warning"
                                  onClick={() => {
                                    const qs = new URLSearchParams({
                                      admit:       '1',
                                      patientId:   enc.patient?.id || '',
                                      encounterId: enc.id          || '',
                                      patientName: `${enc.patient?.firstName || ''} ${enc.patient?.lastName || ''} (${enc.patient?.uhid || ''})`.trim(),
                                      diagnosis:   enc.finalDiagnosis || enc.diagnosis || '',
                                      reason:      enc.chiefComplaint || '',
                                    }).toString();
                                    navigate(`/ipd?${qs}`);
                                  }}>
                                  <AdmitIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {/* Bill / Collect Payment — receptionist sees this for any unpaid encounter */}
                            {(permissions.isReceptionist || permissions.isAdmin || permissions.isSuperAdmin) &&
                              ['BILLING_PENDING', 'COMPLETED', 'LAB_PENDING', 'PHARMACY_PENDING'].includes(enc.status) &&
                              enc.paymentStatus !== 'PAID' && (
                              <Tooltip title={enc.status === 'BILLING_PENDING' ? 'Collect Payment' : 'View Bill'}>
                                <IconButton size="small"
                                  color={enc.status === 'BILLING_PENDING' ? 'success' : 'default'}
                                  onClick={() => {
                                    setPaymentEnc(enc);
                                    setPaymentAmount(String(enc.totalAmount ?? 0));
                                    setPaymentMethod('CASH');
                                    setTransactionRef('');
                                  }}>
                                  <CurrencyRupee sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
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
      </Paper>

      {/* ── Consultation editor ── */}
      {selectedEncounter && (
        <ConsultationDialog
          open={consultOpen}
          onClose={() => { setConsultOpen(false); setSelectedEncounter(null); }}
          encounter={selectedEncounter}
          onSaved={() => fetchEncounters()}
        />
      )}

      {/* ── Collect Payment Dialog ── */}
      <Dialog open={!!paymentEnc} onClose={() => setPaymentEnc(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CurrencyRupee color="success" />
            <Box>
              <Typography fontWeight={700}>OPD Bill</Typography>
              <Typography variant="caption" color="text.secondary">
                {paymentEnc?.patient?.firstName} {paymentEnc?.patient?.lastName}
                {paymentEnc?.patient?.uhid && ` · ${paymentEnc.patient.uhid}`}
                {paymentEnc?.doctor && ` · Dr. ${paymentEnc.doctor.firstName} ${paymentEnc.doctor.lastName}`}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Itemized bill */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Bill Summary</Typography>
            <Grid container spacing={0.5}>
              {[
                { label: 'Consultation Fee',  val: Number(paymentEnc?.consultationFee ?? 0) },
                { label: 'Lab / Tests',       val: Number(paymentEnc?.labCharges      ?? 0) },
                { label: 'Medicines',         val: Number(paymentEnc?.medicineCharges ?? 0) },
              ].map(({ label, val }) => (
                <React.Fragment key={label}>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">{label}</Typography></Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight={val > 0 ? 600 : 400} align="right"
                      color={val > 0 ? 'inherit' : 'text.disabled'}>
                      ₹{val.toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                </React.Fragment>
              ))}
              <Grid item xs={12}><Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.75 }} /></Grid>
              <Grid item xs={6}><Typography variant="body1" fontWeight="bold">Total</Typography></Grid>
              <Grid item xs={6}><Typography variant="body1" fontWeight="bold" align="right" color="primary.main">
                ₹{Number(paymentEnc?.totalAmount ?? 0).toLocaleString('en-IN')}
              </Typography></Grid>
            </Grid>
          </Paper>

          {paymentEnc?.status === 'BILLING_PENDING' ? (
            <>
              <TextField fullWidth type="number" label="Amount to Collect (₹)" sx={{ mb: 2 }}
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                InputProps={{ startAdornment: <CurrencyRupee sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} /> }} />

              <Typography variant="body2" fontWeight={600} gutterBottom>Payment Mode</Typography>
              <ToggleButtonGroup value={paymentMethod} exclusive size="small"
                onChange={(_, v) => v && setPaymentMethod(v)}
                sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                <ToggleButton value="CASH" sx={{ gap: 0.5 }}><Money fontSize="small" /> Cash</ToggleButton>
                <ToggleButton value="UPI"  sx={{ gap: 0.5 }}><PhoneAndroid fontSize="small" /> UPI</ToggleButton>
                <ToggleButton value="CARD" sx={{ gap: 0.5 }}><CurrencyRupee fontSize="small" /> Card</ToggleButton>
                <ToggleButton value="BANK_TRANSFER" sx={{ gap: 0.5 }}><AccountBalance fontSize="small" /> Bank</ToggleButton>
              </ToggleButtonGroup>

              {paymentMethod !== 'CASH' && (
                <TextField fullWidth label="Transaction / Reference ID" value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)} />
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              This encounter is still <strong>{paymentEnc?.status?.replace('_', ' ')}</strong>.
              Bill will be collectable once labs and pharmacy are complete.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPaymentEnc(null)}>Close</Button>
          {paymentEnc?.status === 'BILLING_PENDING' && (
            <Button variant="contained" color="success" onClick={handleCollectPayment}
              disabled={paymentSaving} startIcon={paymentSaving ? <CircularProgress size={14} /> : <CheckCircle />}>
              {paymentSaving ? 'Recording…' : 'Record Payment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EncounterList;
