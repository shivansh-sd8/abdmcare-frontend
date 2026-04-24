import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Print as PrintIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import OPDCard from '../../components/OPDCard';

const AppointmentList: React.FC = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printAppointment, setPrintAppointment] = useState<any>(null);

  useEffect(() => {
    fetchAppointments();
  }, [page, pageSize, statusFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getAllAppointments({
        page: page + 1,
        limit: pageSize,
        status: statusFilter || undefined,
      }) as any;

      const data = response.data;
      setAppointments(data.data.appointments || []);
      setTotal(data.data.total || 0);
    } catch (error: any) {
      toast.error('Failed to load appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppointment) return;

    try {
      await appointmentService.updateAppointment(selectedAppointment.id, { status });
      toast.success('Appointment status updated');
      setShowDialog(false);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update appointment');
    }
  };

  const handlePrintOPD = (appointment: any) => {
    setPrintAppointment(appointment);
    setShowPrintDialog(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      SCHEDULED: 'primary',
      CONFIRMED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'error',
      NO_SHOW: 'default',
    };
    return colors[status] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'appointmentNumber',
      headerName: 'Appointment #',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {params.row.patient?.firstName} {params.row.patient?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            UHID: {params.row.patient?.uhid}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'doctor',
      headerName: 'Doctor',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          Dr. {params.row.doctor?.firstName} {params.row.doctor?.lastName}
        </Typography>
      ),
    },
    {
      field: 'scheduledAt',
      headerName: 'Date & Time',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {new Date(params.value).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(params.value).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedAppointment(params.row);
              setShowDialog(true);
            }}
            title="Update Status"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handlePrintOPD(params.row)}
            title="Print OPD Card"
          >
            <PrintIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Appointments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => toast.info('Create appointment coming soon')}
          >
            New Appointment
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="SCHEDULED">Scheduled</MenuItem>
            <MenuItem value="CONFIRMED">Confirmed</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </TextField>
        </Box>

        <DataGrid
          rows={appointments}
          columns={columns}
          loading={loading}
          pagination
          paginationMode="server"
          rowCount={total}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          autoHeight
          disableRowSelectionOnClick
        />
      </Paper>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Appointment Status</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Patient: {selectedAppointment?.patient?.firstName} {selectedAppointment?.patient?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Doctor: Dr. {selectedAppointment?.doctor?.firstName} {selectedAppointment?.doctor?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Status: <Chip label={selectedAppointment?.status} size="small" />
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                color="info"
                onClick={() => handleUpdateStatus('CONFIRMED')}
              >
                Confirm Appointment
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
              >
                Mark In Progress
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={() => handleUpdateStatus('CANCELLED')}
              >
                Cancel Appointment
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* OPD Card Print Dialog */}
      <Dialog
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '@media print': {
            '& .MuiDialog-paper': {
              maxWidth: 'none',
              margin: 0,
              boxShadow: 'none',
            },
          },
        }}
      >
        <DialogContent sx={{ '@media print': { padding: 0 } }}>
          {printAppointment && <OPDCard appointment={printAppointment} />}
        </DialogContent>
        <DialogActions sx={{ '@media print': { display: 'none' } }}>
          <Button onClick={() => setShowPrintDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => window.print()}>
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentList;
