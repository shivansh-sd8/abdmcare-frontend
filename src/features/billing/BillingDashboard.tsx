import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import {
  Receipt as BillingIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const BillingDashboard: React.FC = () => {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [billDialog, setBillDialog] = useState(false);
  const [billDetails, setBillDetails] = useState({
    consultationFee: 500,
    labCharges: 0,
    medicineCharges: 0,
    scanCharges: 0,
    discount: 0,
  });

  useEffect(() => {
    fetchPendingBills();
  }, []);

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/api/v1/encounters?status=BILLING_PENDING', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setEncounters(data.data || []);
    } catch (error) {
      console.error('Error fetching pending bills:', error);
      toast.error('Failed to fetch pending bills');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = (encounter: any) => {
    setSelectedEncounter(encounter);
    
    // Calculate charges
    const labCharges = (encounter.labTestsOrdered || []).length * 200; // ₹200 per test
    const medicineCharges = (encounter.prescription || []).length * 150; // ₹150 per medicine (avg)
    const scanCharges = (encounter.scansOrdered || []).length * 800; // ₹800 per scan
    
    setBillDetails({
      consultationFee: encounter.consultationFee || 500,
      labCharges,
      medicineCharges,
      scanCharges,
      discount: 0,
    });
    
    setBillDialog(true);
  };

  const calculateTotal = () => {
    const { consultationFee, labCharges, medicineCharges, scanCharges, discount } = billDetails;
    const subtotal = consultationFee + labCharges + medicineCharges + scanCharges;
    return subtotal - discount;
  };

  const handleGenerateBill = async () => {
    try {
      const totalAmount = calculateTotal();
      
      await fetch(`http://localhost:8080/api/v1/encounters/${selectedEncounter.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          billGenerated: true,
          consultationFee: billDetails.consultationFee,
          labCharges: billDetails.labCharges,
          medicineCharges: billDetails.medicineCharges,
          scanCharges: billDetails.scanCharges,
          totalAmount,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
        }),
      });
      
      toast.success('Bill generated and payment recorded');
      setBillDialog(false);
      fetchPendingBills();
    } catch (error) {
      console.error('Error generating bill:', error);
      toast.error('Failed to generate bill');
    }
  };

  const stats = {
    pending: encounters.length,
    today: encounters.filter(e => {
      const today = new Date();
      const encounterDate = new Date(e.createdAt);
      return encounterDate.toDateString() === today.toDateString();
    }).length,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BillingIcon fontSize="large" color="primary" />
        Billing Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#FFF3E0' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Bills</Typography>
              <Typography variant="h3" fontWeight={600} color="#F57C00">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Today's Bills</Typography>
              <Typography variant="h3" fontWeight={600} color="#1976D2">{stats.today}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Bills Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>OPD Card</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Services</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Loading...</TableCell>
                </TableRow>
              ) : encounters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 4 }}>
                      <BillingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No pending bills</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                encounters.map((encounter) => (
                  <TableRow key={encounter.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {encounter.appointment?.opdCardNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {encounter.patient?.firstName} {encounter.patient?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {encounter.patient?.uhid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label="Consultation" size="small" color="primary" variant="outlined" />
                        {encounter.labTestsOrdered && encounter.labTestsOrdered.length > 0 && (
                          <Chip label="Lab Tests" size="small" color="info" variant="outlined" />
                        )}
                        {encounter.prescription && encounter.prescription.length > 0 && (
                          <Chip label="Medicines" size="small" color="success" variant="outlined" />
                        )}
                        {encounter.scansOrdered && encounter.scansOrdered.length > 0 && (
                          <Chip label="Scans" size="small" color="warning" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Dr. {encounter.doctor?.firstName} {encounter.doctor?.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(encounter.createdAt), 'PP')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Generate Bill">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleViewBill(encounter)}
                        >
                          <PaymentIcon fontSize="small" />
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

      {/* Generate Bill Dialog */}
      <Dialog open={billDialog} onClose={() => setBillDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate Bill</DialogTitle>
        <DialogContent>
          {selectedEncounter && (
            <>
              {/* Patient Info */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Patient</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedEncounter.patient?.firstName} {selectedEncounter.patient?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedEncounter.patient?.uhid}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">OPD Card</Typography>
                    <Typography variant="body1" fontWeight={600} color="primary">
                      {selectedEncounter.appointment?.opdCardNumber}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Bill Items */}
              <Typography variant="h6" gutterBottom>Bill Details</Typography>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={8}>
                    <Typography>Consultation Fee</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={billDetails.consultationFee}
                      onChange={(e) => setBillDetails({ ...billDetails, consultationFee: parseFloat(e.target.value) || 0 })}
                      InputProps={{ startAdornment: '₹' }}
                    />
                  </Grid>

                  {(selectedEncounter.labTestsOrdered || []).length > 0 && (
                    <>
                      <Grid item xs={8}>
                        <Typography>Lab Tests ({selectedEncounter.labTestsOrdered.length} tests)</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'right' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={billDetails.labCharges}
                          onChange={(e) => setBillDetails({ ...billDetails, labCharges: parseFloat(e.target.value) || 0 })}
                          InputProps={{ startAdornment: '₹' }}
                        />
                      </Grid>
                    </>
                  )}

                  {(selectedEncounter.prescription || []).length > 0 && (
                    <>
                      <Grid item xs={8}>
                        <Typography>Medicines ({selectedEncounter.prescription.length} items)</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'right' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={billDetails.medicineCharges}
                          onChange={(e) => setBillDetails({ ...billDetails, medicineCharges: parseFloat(e.target.value) || 0 })}
                          InputProps={{ startAdornment: '₹' }}
                        />
                      </Grid>
                    </>
                  )}

                  {(selectedEncounter.scansOrdered || []).length > 0 && (
                    <>
                      <Grid item xs={8}>
                        <Typography>Scans/Imaging ({selectedEncounter.scansOrdered.length} scans)</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'right' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={billDetails.scanCharges}
                          onChange={(e) => setBillDetails({ ...billDetails, scanCharges: parseFloat(e.target.value) || 0 })}
                          InputProps={{ startAdornment: '₹' }}
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={8}>
                    <Typography>Discount</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={billDetails.discount}
                      onChange={(e) => setBillDetails({ ...billDetails, discount: parseFloat(e.target.value) || 0 })}
                      InputProps={{ startAdornment: '₹' }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Grid container>
                  <Grid item xs={8}>
                    <Typography variant="h6" fontWeight={600}>Total Amount</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      ₹{calculateTotal().toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateBill} 
            variant="contained" 
            startIcon={<PaymentIcon />}
            color="success"
          >
            Generate Bill & Mark Paid
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingDashboard;
