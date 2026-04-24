import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Payment as PaymentIcon,
  CheckCircle,
  Pending,
  Print,
  Refresh,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import paymentService from '../../services/paymentService';

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [page, pageSize, statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getAllPayments({
        page: page + 1,
        limit: pageSize,
        status: statusFilter || undefined,
      }) as any;

      const data = response.data;
      setPayments(data.data.payments || []);
      setTotal(data.data.total || 0);
    } catch (error: any) {
      toast.error('Failed to load payments');
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayment) return;

    try {
      await paymentService.markAsPaid(selectedPayment.id, transactionId);
      toast.success('Payment marked as paid');
      setShowPaymentDialog(false);
      setTransactionId('');
      fetchPayments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update payment');
    }
  };

  const handlePrintReceipt = (_payment: any) => {
    // TODO: Implement receipt printing
    toast.info('Receipt printing coming soon');
  };

  const columns: GridColDef[] = [
    {
      field: 'receiptNumber',
      headerName: 'Receipt #',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {params.value.firstName} {params.value.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.uhid}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          ₹{params.value.toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Method',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const colorMap: Record<string, any> = {
          PAID: 'success',
          PENDING: 'warning',
          CANCELLED: 'error',
          PARTIAL: 'info',
        };
        return (
          <Chip
            label={params.value}
            color={colorMap[params.value] || 'default'}
            size="small"
            icon={params.value === 'PAID' ? <CheckCircle /> : <Pending />}
          />
        );
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 200,
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 150,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.row.status === 'PENDING' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => {
                setSelectedPayment(params.row);
                setShowPaymentDialog(true);
              }}
            >
              Mark Paid
            </Button>
          )}
          {params.row.status === 'PAID' && (
            <IconButton
              size="small"
              onClick={() => handlePrintReceipt(params.row)}
            >
              <Print />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PaymentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Payment Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage patient payments and receipts
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={fetchPayments} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={payments}
          columns={columns}
          loading={loading}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Mark as Paid Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Payment as Paid</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Patient:</strong> {selectedPayment.patient?.firstName} {selectedPayment.patient?.lastName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Amount:</strong> ₹{selectedPayment.amount?.toFixed(2)}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                <strong>Receipt #:</strong> {selectedPayment.receiptNumber}
              </Typography>

              <TextField
                fullWidth
                label="Transaction ID (Optional)"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction/reference number"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleMarkAsPaid}>
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentManagement;
