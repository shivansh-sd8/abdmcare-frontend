import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  alpha,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';
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
import ipdService from '../../services/ipdService';
import OPDCardDialog from '../../components/OPDCardDialog';

// "ADMITTED" is a pseudo-filter — there's no Appointment.status === 'ADMITTED'.
// We send no status to the server and instead client-side filter to rows whose
// patient currently has an active admission (ADMITTED or DISCHARGE_READY).
const ADMITTED_PSEUDO = '__ADMITTED__';

const STATUS_OPTIONS = [
  { value: '',              label: 'All' },
  { value: 'SCHEDULED',     label: 'Scheduled' },
  { value: 'IN_PROGRESS',   label: 'In Progress' },
  { value: ADMITTED_PSEUDO, label: 'Admitted' },
  { value: 'COMPLETED',     label: 'Completed' },
  { value: 'CANCELLED',     label: 'Cancelled' },
];

const AppointmentList: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  // Track which patients are already admitted (ADMITTED or DISCHARGE_READY)
  const [admittedPatientIds, setAdmittedPatientIds] = useState<Set<string>>(new Set());
  const [admissionByPatientId, setAdmissionByPatientId] = useState<Record<string, any>>({});

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
      // "Admitted" is a pseudo-filter — client-side, no server status param.
      if (statusRef.current && statusRef.current !== ADMITTED_PSEUDO) {
        params.status = statusRef.current;
      }
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

  // Fetch active admissions to mark already-admitted patients
  useEffect(() => {
    const fetchAdmitted = async () => {
      try {
        const [admRes, drRes] = await Promise.all([
          ipdService.listAdmissions({ status: 'ADMITTED' }) as any,
          ipdService.listAdmissions({ status: 'DISCHARGE_READY' }) as any,
        ]);
        const all = [
          ...(admRes.data?.data?.admissions || admRes.data?.admissions || []),
          ...(drRes.data?.data?.admissions || drRes.data?.admissions || []),
        ];
        const map: Record<string, any> = {};
        for (const a of all) { if (a.patient?.id) map[a.patient.id] = a; }
        setAdmittedPatientIds(new Set(Object.keys(map)));
        setAdmissionByPatientId(map);
      } catch { /* silent */ }
    };
    fetchAdmitted();
  }, [fetchKey]);

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

  // Client-side search on already-fetched rows (name / doctor / ID).
  // The "Admitted" pseudo-filter is also applied here because it depends on
  // the admittedPatientIds set, which is computed client-side from
  // listAdmissions; we can't push it into the appointments search API.
  const filteredRows = (() => {
    let rows = appointments;
    if (statusFilter === ADMITTED_PSEUDO) {
      rows = rows.filter((apt) => admittedPatientIds.has(apt.patient?.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((apt) => {
        const patientName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
        const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.toLowerCase();
        const id = (apt.id || '').toLowerCase();
        const uhid = (apt.patient?.uhid || '').toLowerCase();
        return patientName.includes(q) || doctorName.includes(q) || id.includes(q) || uhid.includes(q);
      });
    }
    return rows;
  })();

  const columns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        const isAdmitted = admittedPatientIds.has(params.row.patient?.id);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: isAdmitted ? '#F39C12' : '#4A90E2', width: 36, height: 36 }}>
              {isAdmitted ? <AdmitIcon fontSize="small" /> : <Person fontSize="small" />}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" fontWeight="500">
                  {params.row.patient?.firstName} {params.row.patient?.lastName}
                </Typography>
                {isAdmitted && (
                  <Chip
                    label="IPD"
                    size="small"
                    sx={{
                      height: 18, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: alpha('#F39C12', 0.15), color: '#F39C12',
                      border: '1px solid', borderColor: alpha('#F39C12', 0.3),
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {params.row.patient?.uhid || ''}
              </Typography>
            </Box>
          </Box>
        );
      },
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
      renderCell: (params: GridRenderCellParams) => {
        const isAdmitted = admittedPatientIds.has(params.row.patient?.id);
        return (
          <Chip
            label={isAdmitted ? 'IPD' : (params.row.type || 'OPD')}
            size="small"
            sx={{
              bgcolor: isAdmitted ? alpha('#F39C12', 0.1) : alpha('#4A90E2', 0.1),
              color: isAdmitted ? '#F39C12' : '#4A90E2',
              fontWeight: 500,
              border: isAdmitted ? `1px solid ${alpha('#F39C12', 0.3)}` : 'none',
            }}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status || 'SCHEDULED';
        const color = getStatusColor(status);
        const activeAdm = admissionByPatientId[params.row.patient?.id];
        const isAdmitted = !!activeAdm;
        const isDischargeReady = activeAdm?.status === 'DISCHARGE_READY';
        const admissionRecommended = !!params.row.encounter?.admissionRequired && !isAdmitted;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start', py: 0.5 }}>
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
            {/* Show the doctor's disposition next to the routine status so
                whoever's looking at the queue sees "the doctor wants this
                patient admitted" without opening the encounter. */}
            {admissionRecommended && (
              <Tooltip title={params.row.encounter?.admissionReason || 'Doctor recommends admission'}>
                <Chip
                  label="Admission recommended"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', height: 18 }}
                />
              </Tooltip>
            )}
            {isAdmitted && (
              <Tooltip title={`${activeAdm.admissionNumber}${activeAdm.ward?.name ? ` · ${activeAdm.ward.name}` : ''}${activeAdm.bed?.bedNumber ? ` · Bed ${activeAdm.bed.bedNumber}` : ''}`}>
                <Chip
                  label={isDischargeReady ? 'Ready for discharge' : 'Admitted'}
                  size="small"
                  color="warning"
                  variant={isDischargeReady ? 'outlined' : 'filled'}
                  sx={{ fontWeight: 700, fontSize: '0.65rem', height: 18 }}
                />
              </Tooltip>
            )}
          </Box>
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
            {canAdmit && (permissions.isReceptionist || permissions.isAdmin || permissions.isDoctor) && !admittedPatientIds.has(params.row.patient?.id) && (
              (() => {
                const recommended = !!params.row.encounter?.admissionRequired;
                // When the doctor has flagged admission, surface a labeled
                // "Admit" button so the admin / receptionist doesn't have to
                // hunt for an icon. Carry the admissionReason forward to the
                // IPD dialog so they don't have to retype it.
                const onClick = () => {
                  const p = params.row;
                  const qs = new URLSearchParams({
                    admit: '1',
                    patientId: p.patientId || '',
                    encounterId: p.encounterId || '',
                    patientName: `${p.patient?.firstName || ''} ${p.patient?.lastName || ''} (${p.patient?.uhid || ''})`.trim(),
                    diagnosis: p.encounter?.finalDiagnosis || p.encounter?.diagnosis || p.encounter?.provisionalDiagnosis || '',
                    reason: p.encounter?.admissionReason || p.notes || p.reason || '',
                  }).toString();
                  navigate(`/app/ipd?${qs}`);
                };
                return recommended ? (
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={onClick}
                    startIcon={<AdmitIcon sx={{ fontSize: 16 }} />}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', px: 1.25, py: 0.4 }}
                  >
                    Admit now
                  </Button>
                ) : (
                  <Tooltip title="Admit to IPD">
                    <IconButton size="small" color="warning" onClick={onClick}>
                      <AdmitIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                );
              })()
            )}
            {params.row.opdCardNumber && (
              <>
                <Tooltip title={admittedPatientIds.has(params.row.patient?.id) ? 'View OPD Card & IPD Admission' : 'View OPD Card'}>
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
            {(isTerminal || admittedPatientIds.has(params.row.patient?.id)) && params.row.patientId && (
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

  const hasActiveFilters = statusFilter || dateFilter;

  return (
    <Box>
      <PageHeader
        title="Appointments"
        subtitle="Schedule and manage patient appointments"
        icon={<CalendarToday />}
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/app/appointments/schedule')}
          >
            Schedule
          </Button>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Total" value={stats.total.toLocaleString()}
            icon={<CalendarToday />} tone="info" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Today" value={stats.today.toLocaleString()}
            icon={<Schedule />} tone="warning" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Scheduled" value={stats.upcoming.toLocaleString()}
            icon={<AccessTime />} tone="secondary" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Completed" value={stats.completed.toLocaleString()}
            icon={<CheckCircle />} tone="success" loading={loading} />
        </Grid>
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

      {/* Data: card list on mobile, DataGrid on desktop */}
      {isMobile ? (
        <Stack spacing={1.25}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, height: 110, borderRadius: 2 }} />
            ))
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={<CalendarToday />}
              title="No appointments"
              message={hasActiveFilters || searchQuery ? 'Try adjusting filters.' : 'Schedule a new appointment to get started.'}
              action={{ label: 'Schedule', onClick: () => navigate('/app/appointments/schedule') }}
            />
          ) : (
            filteredRows.map((apt: any) => {
              const activeAdm = admissionByPatientId[apt.patient?.id];
              const isAdmitted = !!activeAdm;
              const isDischargeReady = activeAdm?.status === 'DISCHARGE_READY';
              const status = (apt.status || 'SCHEDULED').toUpperCase();
              const time = apt.scheduledAt
                ? format(new Date(apt.scheduledAt), 'dd MMM · hh:mm a')
                : '—';
              return (
                <Paper
                  key={apt.id}
                  variant="outlined"
                  sx={{
                    p: 1.5, borderRadius: 2,
                    transition: 'border-color 150ms ease',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Avatar sx={{
                        width: 38, height: 38, fontSize: '0.78rem', fontWeight: 700,
                        bgcolor: alpha(isAdmitted ? theme.palette.warning.main : theme.palette.info.main, 0.16),
                        color: isAdmitted ? 'warning.main' : 'info.main',
                      }}>
                        {isAdmitted ? <AdmitIcon fontSize="small" /> : (
                          (apt.patient?.firstName?.[0] || '') + (apt.patient?.lastName?.[0] || '')
                        )}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {apt.patient?.firstName} {apt.patient?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          Dr. {apt.doctor?.firstName} {apt.doctor?.lastName} · {apt.patient?.uhid || '—'}
                        </Typography>
                      </Box>
                      <Stack direction="column" spacing={0.4} alignItems="flex-end">
                        <Chip
                          size="small"
                          label={status.replace('_', ' ').toLowerCase()}
                          sx={{
                            textTransform: 'capitalize',
                            height: 22, fontSize: '0.65rem',
                            bgcolor: alpha(getStatusColor(status), 0.1),
                            color: getStatusColor(status),
                            fontWeight: 600,
                          }}
                        />
                        {isAdmitted && (
                          <Chip
                            size="small"
                            label={isDischargeReady ? 'Ready for discharge' : 'Admitted'}
                            color="warning"
                            variant={isDischargeReady ? 'outlined' : 'filled'}
                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{time}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.25}>
                        {status === 'SCHEDULED' && !apt.opdCardNumber && (permissions.isReceptionist || permissions.isAdmin) && (
                          <Button size="small" variant="contained" color="success"
                            sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.7rem', textTransform: 'none' }}
                            onClick={() => handleCheckIn(apt)}>
                            Check-in
                          </Button>
                        )}
                        {apt.opdCardNumber && (
                          <Tooltip title="View OPD">
                            <IconButton size="small" color="primary"
                              onClick={() => { setSelectedAppointment(apt); setOpdCardOpen(true); }}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {apt.patientId && (
                          <Tooltip title="Patient profile">
                            <IconButton size="small" sx={{ color: 'info.main' }}
                              onClick={() => navigate(`/app/patients/${apt.patientId}`)}>
                              <ProfileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      ) : (
        <Paper sx={{
          height: { sm: 500, md: 600 }, width: '100%', borderRadius: 2, overflow: 'hidden',
        }} variant="outlined">
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
            initialState={{ sorting: { sortModel: [{ field: 'scheduledAt', sort: 'desc' }] } }}
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': { py: 2 },
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <EmptyState
                    icon={<CalendarToday />}
                    title="No appointments"
                    message={hasActiveFilters || searchQuery ? 'Try adjusting filters.' : 'Schedule a new appointment to get started.'}
                    action={{ label: 'Schedule', onClick: () => navigate('/app/appointments/schedule') }}
                  />
                </Box>
              ),
            }}
          />
        </Paper>
      )}

      {/* OPD Card Dialog */}
      {selectedAppointment && (
        <OPDCardDialog
          open={opdCardOpen}
          onClose={() => setOpdCardOpen(false)}
          appointment={selectedAppointment}
          encounter={selectedAppointment.encounter}
          admissionId={admissionByPatientId[selectedAppointment.patient?.id]?.id || null}
          readOnly={false}
        />
      )}
    </Box>
  );
};

export default AppointmentList;
