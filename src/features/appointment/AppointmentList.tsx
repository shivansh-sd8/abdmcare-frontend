import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Skeleton,
  alpha,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
} from '@mui/material';
import {
  Add,
  Search,
  CalendarToday,
  Schedule,
  CheckCircle,
  Cancel,
  AccessTime,
  Person,
  LocalHospital,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Hotel as AdmitIcon,
  AccountCircle as ProfileIcon,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import appointmentService from '../../services/appointmentService';
import hospitalService from '../../services/hospitalService';
import vitalsService from '../../services/vitalsService';
import { format } from 'date-fns';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { toast } from 'react-toastify';
import { generateOPDCardPDF, HospitalInfo, ConsultationInfo } from '../../utils/pdfGenerator';
import documentService from '../../services/documentService';
import encounterService from '../../services/encounterService';
import OPDCardDialog from '../../components/OPDCardDialog';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const AppointmentList: React.FC = () => {
  const navigate = useNavigate();
  const permissions = useRolePermissions();
  const authUser = useSelector((state: any) => state.auth?.user);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [opdCardOpen, setOpdCardOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });

  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
  });

  // Refs so the fetch callback always reads latest values without re-creating
  const statusRef = useRef(statusFilter);
  statusRef.current = statusFilter;
  const dateRef = useRef(dateFilter);
  dateRef.current = dateFilter;
  const pageRef = useRef(paginationModel);
  pageRef.current = paginationModel;

  const [fetchKey, setFetchKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pageRef.current.page + 1,
        limit: pageRef.current.pageSize,
      };
      if (statusRef.current) params.status = statusRef.current;
      if (dateRef.current) params.date = dateRef.current;

      const response = await appointmentService.searchAppointments(params);
      const data = response as any;
      const body = data.data?.data || data.data || {};
      const appointmentList = Array.isArray(body) ? body : (body.data || []);
      const total = body.pagination?.total ?? appointmentList.length;
      setAppointments(appointmentList);
      setTotalRows(total);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const fetchStats = useCallback(async () => {
    try {
      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) {
        const response = await appointmentService.getAppointmentStats();
        const data = response as any;
        const statsData = data.data?.data || data.data || {};
        setStats({
          total: statsData.total || 0,
          today: statsData.today || 0,
          upcoming: statsData.scheduled || statsData.upcoming || 0,
          completed: statsData.completed || 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  }, [permissions]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // When filters change → reset to page 0 and trigger a single fetch
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setFetchKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter]);

  // When pagination changes from the grid (user clicks next page) → trigger fetch
  const handlePaginationChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
    setFetchKey((k) => k + 1);
  }, []);

  const handleCheckIn = async (appointment: any) => {
    try {
      setLoading(true);
      const response = await appointmentService.checkInAppointment(appointment.id) as any;
      const data = response.data?.data || response.data;
      toast.success(`Patient checked in! OPD Card: ${data.opdCardNumber}`);
      fetchAppointments();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to check in patient');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOPDCard = async (appointment: any) => {
    try {
      const hospitalId = appointment.hospitalId || authUser?.hospitalId;
      let hospitalInfo: HospitalInfo = { name: 'Hospital' };
      if (hospitalId) {
        try {
          const hRes = await hospitalService.getHospitalById(hospitalId) as any;
          const h = hRes.data?.data || hRes.data || {};
          hospitalInfo = {
            name: h.name || 'Hospital',
            addressLine1: h.addressLine1,
            city: h.city,
            state: h.state,
            country: h.country,
            phone: h.phone,
            email: h.email,
            website: h.website,
            gstNumber: h.gstNumber,
          };
        } catch (_) {}
      }

      let vitalsInfo = undefined;
      if (appointment.patient?.id) {
        try {
          const vRes = await vitalsService.getLatestVitals(appointment.patient.id) as any;
          const v = vRes.data?.data || vRes.data || null;
          if (v) {
            vitalsInfo = {
              recordedAt: v.createdAt ? format(new Date(v.createdAt), 'dd-MM-yyyy h:mm a') : undefined,
              height: v.height,
              weight: v.weight,
              bloodPressureSystolic: v.bloodPressureSystolic,
              bloodPressureDiastolic: v.bloodPressureDiastolic,
              heartRate: v.heartRate,
              temperature: v.temperature,
              bmi: v.bmi,
              oxygenSaturation: v.oxygenSaturation,
              respiratoryRate: v.respiratoryRate,
            };
          }
        } catch (_) {}
      }

      const age = appointment.patient?.dob
        ? new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear()
        : 'NA';

      let consultationInfo: ConsultationInfo | undefined;
      const encounterId = appointment.encounterId || appointment.encounter?.id;
      if (encounterId) {
        try {
          const encRes = await encounterService.getEncounterById(encounterId) as any;
          const enc = encRes.data?.data || encRes.data;
          if (enc) {
            consultationInfo = {
              chiefComplaint: enc.chiefComplaint,
              provisionalDiagnosis: enc.provisionalDiagnosis,
              finalDiagnosis: enc.finalDiagnosis || enc.diagnosis,
              notes: enc.notes,
              followUpDate: enc.followUpDate,
              prescriptions: Array.isArray(enc.prescriptions) ? enc.prescriptions.map((rx: any) => ({
                medicineName: rx.medicineName || '',
                dosage: rx.dosage || '',
                frequency: rx.frequency || '',
                duration: rx.duration || '',
                instructions: rx.instructions || '',
              })) : [],
              labOrders: Array.isArray(enc.labOrders) ? enc.labOrders.map((o: any) => ({
                testName: o.testName || '',
                testType: o.testType,
                priority: o.priority,
              })) : [],
            };
          }
        } catch (_) {}
      }

      const base64 = generateOPDCardPDF({
        opdCardNumber: appointment.opdCardNumber,
        issueDate: format(new Date(appointment.checkedInAt || appointment.createdAt), 'dd-MM-yyyy h:mm a'),
        hospital: hospitalInfo,
        patient: {
          name: `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim(),
          uhid: appointment.patient?.uhid || 'NA',
          age,
          gender: appointment.patient?.gender || 'NA',
          mobile: appointment.patient?.mobile || 'NA',
          address: appointment.patient?.address || '',
          relationName: appointment.patient?.emergencyContact?.relationship || 'NA',
        },
        appointment: {
          doctor: `Dr. ${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim(),
          doctorRegistrationNo: appointment.doctor?.registrationNo,
          doctorSignatureBase64: appointment.doctor?.signatureBase64,
          department: appointment.doctor?.department?.name || 'Not Specified',
          fees: '₹0',
          paymentMode: 'Not Paid',
        },
        generatedBy: authUser?.name || 'System',
        vitals: vitalsInfo,
        consultation: consultationInfo,
      });
      if (appointment.patient?.id) {
        documentService.persistDocument({ patientId: appointment.patient.id, type: 'OPD_CARD', content: base64 }).catch(() => {});
      }

      toast.success('OPD Card PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading OPD card:', error);
      toast.error('Failed to download OPD card');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':    return '#4A90E2';
      case 'COMPLETED':    return '#50C878';
      case 'CANCELLED':    return '#E74C3C';
      case 'IN_PROGRESS':  return '#F39C12';
      default:             return '#95A5A6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':   return <Schedule fontSize="small" />;
      case 'COMPLETED':   return <CheckCircle fontSize="small" />;
      case 'CANCELLED':   return <Cancel fontSize="small" />;
      default:            return <AccessTime fontSize="small" />;
    }
  };

  // Client-side search on already-fetched rows (name / doctor / ID)
  const filteredRows = searchQuery.trim()
    ? appointments.filter((apt) => {
        const q = searchQuery.toLowerCase();
        const patientName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
        const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.toLowerCase();
        const id = (apt.id || '').toLowerCase();
        const uhid = (apt.patient?.uhid || '').toLowerCase();
        return patientName.includes(q) || doctorName.includes(q) || id.includes(q) || uhid.includes(q);
      })
    : appointments;

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#4A90E2', width: 36, height: 36 }}>
            <Person fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="500">
              {params.row.patient?.firstName} {params.row.patient?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.patient?.uhid || ''}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'doctor',
      headerName: 'Doctor',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#9B59B6', width: 36, height: 36 }}>
            <LocalHospital fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="500">
            Dr. {params.row.doctor?.firstName} {params.row.doctor?.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'scheduledAt',
      headerName: 'Date & Time',
      width: 160,
      valueGetter: (value: any) => value ? new Date(value).getTime() : 0,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2">
              {params.row.scheduledAt ? format(new Date(params.row.scheduledAt), 'dd MMM yyyy') : '-'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {params.row.scheduledAt ? format(new Date(params.row.scheduledAt), 'hh:mm a') : '-'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.row.type || 'OPD'}
          size="small"
          sx={{ bgcolor: alpha('#4A90E2', 0.1), color: '#4A90E2', fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status || 'SCHEDULED';
        const color = getStatusColor(status);
        return (
          <Chip
            icon={getStatusIcon(status)}
            label={status.replace('_', ' ')}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          />
        );
      },
    },
    {
      field: 'notes',
      headerName: 'Reason / Notes',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        const raw = params.row.notes || '';
        const reason = raw.split('\n---\n')[0] || '-';
        return (
          <Typography variant="caption" color="text.secondary" noWrap title={raw}>
            {reason}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const status = (params.row.status || '').toUpperCase();
        const isTerminal = ['COMPLETED', 'CANCELLED'].includes(status);
        const canCheckIn = status === 'SCHEDULED' && !params.row.checkedInAt && !params.row.opdCardNumber;
        const canAdmit = !isTerminal && (['CHECKED_IN', 'IN_PROGRESS'].includes(status) || !!params.row.opdCardNumber);

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {canCheckIn && (permissions.isReceptionist || permissions.isAdmin) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                onClick={() => handleCheckIn(params.row)}
                sx={{
                  textTransform: 'none', fontWeight: 600, fontSize: '0.75rem',
                  px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: '#50C878',
                  '&:hover': { bgcolor: '#3DA863' },
                  boxShadow: '0 2px 6px rgba(80,200,120,0.35)',
                }}
              >
                Check-In
              </Button>
            )}
            {canAdmit && (permissions.isReceptionist || permissions.isAdmin || permissions.isDoctor) && (
              <Tooltip title="Admit to IPD">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => {
                    const p = params.row;
                    const qs = new URLSearchParams({
                      admit: '1',
                      patientId: p.patientId || '',
                      encounterId: p.encounterId || '',
                      patientName: `${p.patient?.firstName || ''} ${p.patient?.lastName || ''} (${p.patient?.uhid || ''})`.trim(),
                      diagnosis: p.encounter?.diagnosis || p.encounter?.provisionalDiagnosis || '',
                      reason: p.notes || p.reason || '',
                    }).toString();
                    navigate(`/app/ipd?${qs}`);
                  }}
                >
                  <AdmitIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {params.row.opdCardNumber && (
              <>
                <Tooltip title="View OPD Card">
                  <IconButton size="small" color="primary" onClick={() => { setSelectedAppointment(params.row); setOpdCardOpen(true); }}>
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton size="small" color="success" onClick={() => handleDownloadOPDCard(params.row)}>
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {isTerminal && params.row.patientId && (
              <Tooltip title="View Patient Profile">
                <IconButton size="small" sx={{ color: '#4A90E2' }} onClick={() => navigate(`/app/patients/${params.row.patientId}`)}>
                  <ProfileIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  const statsCards = [
    { label: 'Total Appointments', value: stats.total, color: '#4A90E2', icon: <CalendarToday /> },
    { label: 'Today', value: stats.today, color: '#F39C12', icon: <Schedule /> },
    { label: 'Scheduled', value: stats.upcoming, color: '#9B59B6', icon: <AccessTime /> },
    { label: 'Completed', value: stats.completed, color: '#50C878', icon: <CheckCircle /> },
  ];

  const hasActiveFilters = statusFilter || dateFilter;

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 4, gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            Appointment Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule and manage patient appointments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/app/appointments/schedule')}
          sx={{
            background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #357ABD 0%, #2868A8 100%)' },
          }}
        >
          Schedule Appointment
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            {loading && appointments.length === 0 ? (
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
            ) : (
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(stat.color, 0.08)} 0%, ${alpha(stat.color, 0.02)} 100%)`,
                  border: `1px solid ${alpha(stat.color, 0.2)}`,
                  borderRadius: 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${alpha(stat.color, 0.2)}` },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={stat.color}>
                        {stat.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {stat.label}
                      </Typography>
                    </Box>
                    <Box sx={{
                      bgcolor: stat.color, borderRadius: 2, p: 1.5, color: 'white',
                      display: 'flex', boxShadow: `0 4px 12px ${alpha(stat.color, 0.4)}`,
                    }}>
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Stack spacing={2}>
          {/* Row 1: Search + Date */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search patient, doctor, UHID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              type="date"
              label="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              size="small"
              sx={{ width: 180 }}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant={dateFilter === format(new Date(), 'yyyy-MM-dd') ? 'contained' : 'outlined'}
              size="small"
              startIcon={<CalendarToday sx={{ fontSize: 14 }} />}
              onClick={() => setDateFilter(format(new Date(), 'yyyy-MM-dd'))}
              sx={{
                textTransform: 'none', borderRadius: 2, fontWeight: 500, px: 2,
                ...(dateFilter === format(new Date(), 'yyyy-MM-dd')
                  ? { bgcolor: '#F39C12', '&:hover': { bgcolor: '#E08A00' } }
                  : { borderColor: '#F39C12', color: '#F39C12' }),
              }}
            >
              Today
            </Button>
            {hasActiveFilters && (
              <Tooltip title="Clear all filters">
                <IconButton
                  onClick={() => { setStatusFilter(''); setDateFilter(''); setSearchQuery(''); }}
                  size="small"
                  sx={{ color: '#E74C3C' }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Row 2: Status filter toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_e, val) => { if (val !== null) setStatusFilter(val); }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none', px: 2, py: 0.5, borderRadius: '20px !important',
                  border: '1px solid', borderColor: 'divider', mx: 0.5,
                  fontSize: '0.8rem', fontWeight: 500,
                  '&.Mui-selected': { bgcolor: alpha('#4A90E2', 0.12), color: '#4A90E2', borderColor: '#4A90E2' },
                },
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{
        height: { xs: 400, sm: 500, md: 600 },
        width: '100%', borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <DataGrid
          rows={filteredRows}
          rowCount={searchQuery.trim() ? filteredRows.length : totalRows}
          loading={loading}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationChange}
          paginationMode={searchQuery.trim() ? 'client' : 'server'}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          initialState={{
            sorting: { sortModel: [{ field: 'scheduledAt', sort: 'desc' }] },
          }}
          sx={{
            '& .MuiDataGrid-cell': { py: 2 },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 },
          }}
        />
      </Paper>

      {/* OPD Card Dialog */}
      {selectedAppointment && (
        <OPDCardDialog
          open={opdCardOpen}
          onClose={() => setOpdCardOpen(false)}
          appointment={selectedAppointment}
          encounter={selectedAppointment.encounter}
          readOnly={false}
        />
      )}
    </Box>
  );
};

export default AppointmentList;
