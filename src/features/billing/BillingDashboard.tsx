import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Card, CardContent, IconButton, Tooltip, Divider,
  TextField, CircularProgress, Alert, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Receipt as BillingIcon,
  CurrencyRupee,
  CheckCircle,
  Visibility,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import api from '../../services/api';

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const;

const BillingDashboard: React.FC = () => {
  const [encounters, setEncounters]           = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [billDialog, setBillDialog]           = useState(false);
  const [paymentMethod, setPaymentMethod]     = useState<string>('CASH');
  const [transactionRef, setTransactionRef]   = useState('');
  const [collecting, setCollecting]           = useState(false);

  const fetchPendingBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/encounters?status=BILLING_PENDING') as any;
      setEncounters(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to fetch pending bills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPendingBills(); }, [fetchPendingBills]);

  const handleOpenBill = (enc: any) => {
    setSelectedEncounter(enc);
    setPaymentMethod('CASH');
    setTransactionRef('');
    setBillDialog(true);
  };

  const consultationFee  = Number(selectedEncounter?.consultationFee  ?? 0);
  const labCharges        = Number(selectedEncounter?.labCharges       ?? 0);
  const medicineCharges   = Number(selectedEncounter?.medicineCharges  ?? 0);
  const totalAmount       = Number(selectedEncounter?.totalAmount      ?? (consultationFee + labCharges + medicineCharges));

  const handleCollectPayment = async () => {
    if (!selectedEncounter) return;
    if (!paymentMethod) { toast.warning('Select a payment method'); return; }
    setCollecting(true);
    try {
      await api.patch(`/api/v1/encounters/${selectedEncounter.id}/collect-payment`, {
        paymentMethod,
        paymentCollected: totalAmount,
        transactionRef:   transactionRef || undefined,
      });
      toast.success('Payment collected successfully');
      setBillDialog(false);
      fetchPendingBills();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to record payment');
    } finally {
      setCollecting(false);
    }
  };

  const todayCount = encounters.filter(e => {
    return new Date(e.visitDate).toDateString() === new Date().toDateString();
  }).length;

  const totalPending = encounters.reduce((s, e) => s + Number(e.totalAmount ?? 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BillingIcon color="primary" /> Billing Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#FFF3E0' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Pending Bills</Typography>
              <Typography variant="h3" fontWeight={700} color="#F57C00">{encounters.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Today's Bills</Typography>
              <Typography variant="h3" fontWeight={700} color="#1976D2">{todayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#E8F5E9' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Pending Amount</Typography>
              <Typography variant="h4" fontWeight={700} color="#2E7D32">
                ₹{totalPending.toLocaleString('en-IN')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Consultation</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Lab</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Pharmacy</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : encounters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.light', mb: 1 }} />
                    <Typography color="text.secondary">No pending bills — all clear!</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                encounters.map((enc) => (
                  <TableRow key={enc.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {enc.patient?.firstName} {enc.patient?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{enc.patient?.uhid}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Dr. {enc.doctor?.firstName} {enc.doctor?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(enc.visitDate ?? enc.createdAt), 'dd MMM yy')}
                      </Typography>
                    </TableCell>
                    <TableCell>₹{Number(enc.consultationFee ?? 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`₹${Number(enc.labCharges ?? 0).toLocaleString('en-IN')}`}
                        color={Number(enc.labCharges) > 0 ? 'info' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`₹${Number(enc.medicineCharges ?? 0).toLocaleString('en-IN')}`}
                        color={Number(enc.medicineCharges) > 0 ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        ₹{Number(enc.totalAmount ?? 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Collect Payment">
                        <IconButton size="small" color="success" onClick={() => handleOpenBill(enc)}>
                          <CurrencyRupee fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Collect Payment Dialog */}
      <Dialog open={billDialog} onClose={() => !collecting && setBillDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CurrencyRupee color="success" /> Collect Payment
        </DialogTitle>
        <DialogContent>
          {selectedEncounter && (
            <>
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedEncounter.patient?.firstName} {selectedEncounter.patient?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedEncounter.patient?.uhid} &nbsp;|&nbsp; Dr. {selectedEncounter.doctor?.firstName} {selectedEncounter.doctor?.lastName}
                </Typography>
              </Box>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Bill Summary</Typography>
                {[
                  { label: 'Consultation Fee', value: consultationFee },
                  { label: 'Lab / Tests', value: labCharges },
                  { label: 'Medicines', value: medicineCharges },
                ].map(row => (
                  <Grid container key={row.label} sx={{ mb: 0.5 }}>
                    <Grid item xs={8}>
                      <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">
                        {row.value > 0 ? `₹${row.value.toLocaleString('en-IN')}` : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                ))}
                <Divider sx={{ my: 1 }} />
                <Grid container>
                  <Grid item xs={8}>
                    <Typography fontWeight={700}>Total</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={700} color="primary">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Payment Mode</Typography>
              <ToggleButtonGroup
                value={paymentMethod}
                exclusive
                onChange={(_, v) => v && setPaymentMethod(v)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                {PAYMENT_METHODS.map(m => (
                  <ToggleButton key={m} value={m} sx={{ fontSize: 12 }}>{m}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              {(paymentMethod === 'UPI' || paymentMethod === 'CARD' || paymentMethod === 'BANK_TRANSFER') && (
                <TextField
                  label="Transaction / Reference ID"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  fullWidth
                  size="small"
                />
              )}

              {totalAmount === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Total amount is ₹0. Please verify the bill before collecting.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillDialog(false)} disabled={collecting}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCollectPayment}
            disabled={collecting || totalAmount === 0}
            startIcon={collecting ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {collecting ? 'Recording…' : `Collect ₹${totalAmount.toLocaleString('en-IN')}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingDashboard;
