import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  alpha,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  Divider,
  Alert,
  Autocomplete,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Search,
  VerifiedUser,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Person,
  CalendarToday,
  Description,
  Visibility,
  Block,
  AccessTime,
  Close,
  CloudDownload,
  AssignmentInd,
  DeleteSweep,
  FolderOpen,
  Article,
  Inbox,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import consentService from '../../services/consentService';
import hiuService from '../../services/hiuService';
import patientService from '../../services/patientService';
import ConsentStatusChip from '../../components/ConsentStatusChip';
import { toast } from 'react-toastify';
import { format, formatDistanceToNow } from 'date-fns';
import { GradientHero, StatCard } from '../../components/ui';

const POLL_INTERVAL_MS = 10_000;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactElement }> = {
  GRANTED:   { color: '#50C878', icon: <CheckCircle fontSize="small" /> },
  REQUESTED: { color: '#F39C12', icon: <HourglassEmpty fontSize="small" /> },
  DENIED:    { color: '#E74C3C', icon: <Cancel fontSize="small" /> },
  EXPIRED:   { color: '#95A5A6', icon: <AccessTime fontSize="small" /> },
  REVOKED:   { color: '#E74C3C', icon: <Block fontSize="small" /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status?.toUpperCase()] || { color: '#4A90E2', icon: <VerifiedUser fontSize="small" /> };
}

// Per ABDM M3 Health Information Types. The wire codes (sent on the consent
// request) are immutable; we render friendly labels next to them so an operator
// doesn't have to read camelCase ABDM jargon. WellnessRecord and
// ImmunizationRecord both have FHIR profiles built locally
// (see backend/src/common/utils/fhir/profiles).
const HI_TYPE_OPTIONS: { code: string; label: string; hint: string }[] = [
  { code: 'OPConsultation',      label: 'OPD consultations',     hint: 'Out-patient visit notes' },
  { code: 'Prescription',        label: 'Prescriptions',         hint: 'Medication orders' },
  { code: 'DiagnosticReport',    label: 'Lab & diagnostics',     hint: 'Pathology, radiology reports' },
  { code: 'DischargeSummary',    label: 'Discharge summaries',   hint: 'IPD discharge documents' },
  { code: 'ImmunizationRecord',  label: 'Immunisation records',  hint: 'Vaccinations administered' },
  { code: 'WellnessRecord',      label: 'Wellness records',      hint: 'Vitals, lifestyle data' },
  { code: 'HealthDocumentRecord',label: 'Other documents',       hint: 'Misc. health documents' },
];

const PURPOSE_LABELS: Record<string, string> = {
  CAREMGT: 'Care Management',
  BTG: 'Break the Glass',
  PUBHLTH: 'Public Health',
  HPAYMT: 'Healthcare Payment',
  DSRCH: 'Disease Specific Research',
  PATRQT: 'Patient (Self) Requested',
  HQUALITY: 'Healthcare Quality',
  CARE_MANAGEMENT: 'Care Management',
  BREAK_THE_GLASS: 'Break the Glass',
  PUBLIC_HEALTH: 'Public Health',
  DISEASE_SPECIFIC_HEALTHCARE_RESEARCH: 'Disease Specific Research',
  HEALTHCARE_PAYMENT: 'Healthcare Payment',
  SELF_REQUESTED: 'Patient (Self) Requested',
  HEALTHCARE_QUALITY_AUDIT: 'Healthcare Quality',
};

const ConsentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REQUESTED' | 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [stats, setStats] = useState({ total: 0, granted: 0, requested: 0, expired: 0 });

  // Fetch records dialog state
  const [fetchOpen, setFetchOpen] = useState(false);
  const [fetchConsent, setFetchConsent] = useState<any>(null);
  const [fetchSubmitting, setFetchSubmitting] = useState(false);
  const [fetchFrom, setFetchFrom] = useState('');
  const [fetchTo, setFetchTo] = useState('');

  // New Consent Request dialog state
  const [newConsentOpen, setNewConsentOpen] = useState(false);
  const [newConsentLoading, setNewConsentLoading] = useState(false);
  const [newConsentForm, setNewConsentForm] = useState({
    patientAbhaId: '',
    purpose: 'CAREMGT',
    hiTypes: ['OPConsultation', 'Prescription', 'DiagnosticReport'] as string[],
    dateRangeFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateRangeTo: new Date().toISOString().split('T')[0],
    requesterName: '',
    requesterId: '',
  });

  // Patient search state for autocomplete
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const patientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePatientSearch = useCallback((query: string) => {
    if (patientSearchTimer.current) clearTimeout(patientSearchTimer.current);
    if (!query || query.length < 2) { setPatientOptions([]); return; }
    patientSearchTimer.current = setTimeout(async () => {
      setPatientSearchLoading(true);
      try {
        const res = await patientService.searchPatients({ search: query, abhaLinked: true, limit: 20 }) as any;
        const patients = res?.data?.patients || res?.data || res?.patients || [];
        setPatientOptions(Array.isArray(patients) ? patients : []);
      } catch { setPatientOptions([]); }
      finally { setPatientSearchLoading(false); }
    }, 350);
  }, []);

  // View Details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<any>(null);
  const [artefactData, setArtefactData] = useState<any>(null);

  // Track previous statuses for change detection
  const prevStatusMap = useRef<Record<string, string>>({});

  const fetchStats = useCallback(async (fallbackData?: any[]) => {
    try {
      const res = await consentService.getConsentStats() as any;
      const s = res?.data || res;
      if (s && typeof s.total === 'number') {
        setStats({ total: s.total, granted: s.granted || 0, requested: s.pending || s.requested || 0, expired: s.expired || 0 });
        return;
      }
    } catch { /* fall through to client-side */ }
    // Client-side fallback
    if (fallbackData) {
      setStats({
        total: fallbackData.length,
        granted: fallbackData.filter((c: any) => c.status === 'GRANTED').length,
        requested: fallbackData.filter((c: any) => c.status === 'REQUESTED').length,
        expired: fallbackData.filter((c: any) => c.status === 'EXPIRED').length,
      });
    }
  }, []);

  const fetchConsents = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await consentService.getAllConsents();
      const data = (response as any).data || [];

      // Detect status changes and show toast notifications
      const prevMap = prevStatusMap.current;
      for (const consent of data) {
        const prev = prevMap[consent.id];
        if (prev === 'REQUESTED' && consent.status === 'GRANTED') {
          toast.success(`Consent ${consent.consentId} has been GRANTED`);
        } else if (prev === 'REQUESTED' && consent.status === 'DENIED') {
          toast.error(`Consent ${consent.consentId} has been DENIED`);
        }
      }

      // Update prev map
      const newMap: Record<string, string> = {};
      for (const c of data) newMap[c.id] = c.status;
      prevStatusMap.current = newMap;

      setConsents(data);
      fetchStats(data);
    } catch {
      if (!isBackground) toast.error('Failed to load consents');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchConsents(false);
  }, [fetchConsents]);

  // Auto-poll while any consent is in REQUESTED state
  useEffect(() => {
    const hasRequested = consents.some(c => c.status === 'REQUESTED');
    if (!hasRequested) return;

    const intervalId = setInterval(() => fetchConsents(true), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [consents, fetchConsents]);

  const handleCancelConsent = async (consentId: string) => {
    try {
      await consentService.revokeConsent(consentId);
      toast.success('Consent request cancelled');
      fetchConsents(false);
    } catch {
      toast.error('Failed to cancel consent request');
    }
  };

  const handleOpenNewConsent = () => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setNewConsentForm(f => ({
      ...f,
      patientAbhaId: '',
      requesterName: userData?.name || userData?.firstName || 'Doctor',
      requesterId: userData?.id || 'DOCTOR',
    }));
    setSelectedPatient(null);
    setPatientOptions([]);
    setNewConsentOpen(true);
  };

  const handleCreateNewConsent = async () => {
    if (!newConsentForm.patientAbhaId.trim()) {
      toast.warning('Please enter patient ABHA ID or address');
      return;
    }
    if (newConsentForm.hiTypes.length === 0) {
      toast.warning('Please select at least one health information type');
      return;
    }
    setNewConsentLoading(true);
    try {
      await consentService.createConsentRequest({
        patientAbhaId: newConsentForm.patientAbhaId.trim(),
        purpose: newConsentForm.purpose,
        hiTypes: newConsentForm.hiTypes,
        dateRangeFrom: newConsentForm.dateRangeFrom,
        dateRangeTo: newConsentForm.dateRangeTo,
        requesterName: newConsentForm.requesterName,
        requesterId: newConsentForm.requesterId,
      });
      toast.success('Consent request sent — patient will be notified on ABHA app');
      setNewConsentOpen(false);
      fetchConsents(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create consent request');
    } finally {
      setNewConsentLoading(false);
    }
  };

  // ── Fetch Records (post-grant): pulls health information from PHR via HIU ───
  const openFetchDialog = (consent: any) => {
    setFetchConsent(consent);
    // Pre-fill from artefact / consent-stored date range when available; else
    // fall back to "last 1 year".
    const today = new Date().toISOString().split('T')[0];
    const oneYrAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const from = consent.dateRangeFrom
      ? new Date(consent.dateRangeFrom).toISOString().split('T')[0]
      : oneYrAgo;
    const to = consent.dateRangeTo
      ? new Date(consent.dateRangeTo).toISOString().split('T')[0]
      : today;
    setFetchFrom(from);
    setFetchTo(to);
    setFetchOpen(true);
  };

  const handleFetchRecords = async () => {
    if (!fetchConsent) return;
    if (!fetchFrom || !fetchTo) {
      toast.warning('Please pick a date range');
      return;
    }
    try {
      setFetchSubmitting(true);
      await hiuService.requestHealthInformation({
        consentId: fetchConsent.id,
        dateRangeFrom: new Date(fetchFrom).toISOString(),
        dateRangeTo: new Date(fetchTo).toISOString(),
      });
      toast.success(
        'Records request sent — they\'ll appear in the patient\'s profile shortly',
        { autoClose: 4000 },
      );
      setFetchOpen(false);
      setFetchConsent(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request records');
    } finally {
      setFetchSubmitting(false);
    }
  };

  const handleViewDetails = async (consent: any) => {
    setSelectedConsent(consent);
    setArtefactData(null);
    setDetailsOpen(true);

    // Always hit the artefact endpoint — it returns the locally-stored
    // artefact (post on-fetch callback), the count of records pulled, and the
    // purgedAt marker for revoked/expired consents. The dialog uses these to
    // pick the right empty/active/purged state.
    setDetailsLoading(true);
    try {
      const res = await consentService.fetchConsentArtefact(consent.id) as any;
      setArtefactData(res?.data || res);
    } catch {
      // Artefact endpoint failed (e.g. consent not yet granted) — leave null
      // so the dialog falls back to its lifecycle messaging.
    } finally {
      setDetailsLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'consentId',
      headerName: 'Consent ID',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="500" color="primary" noWrap>
          {params.row.consentId}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            <Person fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="500">
            {params.row.patient?.firstName} {params.row.patient?.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'purpose',
      headerName: 'Purpose',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={<Description />}
          label={params.row.purpose || 'Care Management'}
          size="small"
          sx={{ bgcolor: alpha('#9B59B6', 0.1), color: '#9B59B6', fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <ConsentStatusChip
          consentId={params.row.id}
          initialStatus={params.row.status || 'REQUESTED'}
          onStatusChange={() => fetchConsents(true)}
        />
      ),
    },
    {
      field: 'recordsCount',
      headerName: 'Records',
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const count = Number(params.row.recordsCount || 0);
        const purged = !!params.row.purgedAt;
        if (purged) {
          return (
            <Tooltip title="Records were purged when this consent was revoked or expired (ABDM compliance).">
              <Chip
                size="small"
                icon={<DeleteSweep sx={{ fontSize: 14 }} />}
                label="Purged"
                color="default"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: 11 }}
              />
            </Tooltip>
          );
        }
        if (count === 0 && params.row.status === 'GRANTED') {
          return (
            <Tooltip title="Consent granted but no records pulled yet — click Fetch to import.">
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                None yet
              </Typography>
            </Tooltip>
          );
        }
        if (count === 0) {
          return <Typography variant="body2" color="text.secondary">—</Typography>;
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FolderOpen sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" fontWeight={600} color="success.main">
              {count}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'elapsed',
      headerName: 'Elapsed',
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        if (params.row.status !== 'REQUESTED') return <Typography variant="body2" color="text.secondary">—</Typography>;
        const created = params.row.createdAt ? new Date(params.row.createdAt) : null;
        if (!created) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: '#F39C12' }} />
            <Typography variant="body2" color="warning.main" fontWeight={500}>
              {formatDistanceToNow(created, { addSuffix: false })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2">
            {params.row.createdAt ? format(new Date(params.row.createdAt), 'MMM dd, yyyy') : '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.expiresAt ? format(new Date(params.row.expiresAt), 'MMM dd, yyyy') : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status;
        const patientId = params.row.patient?.id || params.row.patientId;
        return (
          <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
            {status === 'GRANTED' && (
              <Tooltip title="Pull patient's records from PHR using this consent">
                <IconButton
                  size="small"
                  sx={{ color: 'success.main' }}
                  onClick={() => openFetchDialog(params.row)}
                >
                  <CloudDownload fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Details">
              <IconButton size="small" color="primary" onClick={() => handleViewDetails(params.row)}>
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {patientId && (
              <Tooltip title="Open patient profile">
                <IconButton
                  size="small"
                  sx={{ color: 'info.main' }}
                  onClick={() => navigate(`/app/patients/${patientId}`)}
                >
                  <AssignmentInd fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {status === 'REQUESTED' && (
              <Tooltip title="Cancel Request">
                <IconButton size="small" color="error" onClick={() => handleCancelConsent(params.row.id)}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  const filteredConsents = consents.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.consentId?.toLowerCase().includes(q) ||
      c.patient?.firstName?.toLowerCase().includes(q) ||
      c.patient?.lastName?.toLowerCase().includes(q) ||
      c.purpose?.toLowerCase().includes(q)
    );
  });

  const statsCards: { label: string; value: number; tone: 'info' | 'success' | 'warning' | 'error' }[] = [
    { label: 'Total Consents', value: stats.total,     tone: 'info' },
    { label: 'Granted',        value: stats.granted,   tone: 'success' },
    { label: 'Requested',      value: stats.requested, tone: 'warning' },
    { label: 'Expired',        value: stats.expired,   tone: 'error' },
  ];

  const statsIcons = [<VerifiedUser />, <CheckCircle />, <HourglassEmpty />, <Cancel />];

  return (
    <Box sx={{ overflow: 'hidden', maxWidth: '100%' }}>
      <GradientHero
        title="Consent Management"
        subtitle="Request, track and pull a patient's health records from any ABDM-linked hospital. Records and decryption keys are auto-deleted the moment a consent is revoked or expires, per ABDM compliance."
        icon={<VerifiedUser />}
        badge={
          consents.some(c => c.status === 'REQUESTED') ? (
            <Chip
              label="Auto-refreshing"
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.22),
                color: '#fff',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          ) : undefined
        }
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenNewConsent}
            sx={{
              bgcolor: '#fff',
              color: 'primary.main',
              fontWeight: 700,
              '&:hover': { bgcolor: alpha('#fff', 0.9) },
            }}
          >
            New Consent Request
          </Button>
        }
      />
      <Box sx={{ height: 16 }} />

      <Grid container spacing={2.25} sx={{ mb: 3 }}>
        {statsCards.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <StatCard
              label={s.label}
              value={s.value.toLocaleString()}
              tone={s.tone}
              icon={statsIcons[i]}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by consent ID, patient name, or purpose…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                '& fieldset': { border: 'none' },
                backgroundColor: 'transparent',
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {([
              { id: 'ALL',        label: 'All',          color: 'primary'   as const },
              { id: 'REQUESTED',  label: 'Pending',      color: 'warning'   as const },
              { id: 'GRANTED',    label: 'Granted',      color: 'success'   as const },
              { id: 'DENIED',     label: 'Denied',       color: 'error'     as const },
              { id: 'EXPIRED',    label: 'Expired',      color: 'default'   as const },
              { id: 'REVOKED',    label: 'Revoked',      color: 'error'     as const },
            ] as const).map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                size="small"
                color={statusFilter === opt.id ? opt.color : 'default'}
                variant={statusFilter === opt.id ? 'filled' : 'outlined'}
                onClick={() => setStatusFilter(opt.id as any)}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          height: { xs: 420, sm: 520, md: 620 },
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <DataGrid
          rows={filteredConsents}
          loading={loading}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': { py: 1.5 },
          }}
        />
      </Paper>

      {/* ── New Consent Request Dialog ──────────────────────────────── */}
      <Dialog open={newConsentOpen} onClose={() => setNewConsentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add color="primary" />
              New Consent Request
            </Box>
            <IconButton onClick={() => setNewConsentOpen(false)} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" icon={<VerifiedUser fontSize="small" />} sx={{ mb: 2.25 }}>
            The patient will get this request as a notification on their ABHA / PHR app. Records become available
            for fetch only after they approve.
          </Alert>

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Patient
          </Typography>
          <Autocomplete
            freeSolo
            options={patientOptions}
            loading={patientSearchLoading}
            value={selectedPatient}
            getOptionLabel={(option: any) => {
              if (typeof option === 'string') return option;
              const name = `${option.firstName || ''} ${option.lastName || ''}`.trim();
              const abha = option.abhaRecord?.abhaAddress || option.abhaRecord?.abhaNumber || option.abhaAddress || option.abhaNumber || option.abhaId || '';
              return abha ? `${name} (${abha})` : name;
            }}
            isOptionEqualToValue={(opt: any, val: any) => opt?.id === val?.id}
            filterOptions={(x) => x}
            onInputChange={(_e, value, reason) => {
              if (reason === 'input') {
                handlePatientSearch(value);
                setNewConsentForm(f => ({ ...f, patientAbhaId: value }));
              }
            }}
            onChange={(_e, value) => {
              if (value && typeof value !== 'string') {
                setSelectedPatient(value);
                const abhaId = value.abhaRecord?.abhaAddress || value.abhaRecord?.abhaNumber || value.abhaAddress || value.abhaNumber || value.abhaId || '';
                setNewConsentForm(f => ({ ...f, patientAbhaId: abhaId }));
              } else {
                setSelectedPatient(null);
                setNewConsentForm(f => ({ ...f, patientAbhaId: typeof value === 'string' ? value : '' }));
              }
            }}
            renderOption={(props, option: any) => (
              <ListItem {...props} key={option.id} dense>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                    {(option.firstName?.[0] || '')}{(option.lastName?.[0] || '')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      {option.firstName} {option.lastName}
                      {option.uhid && <Chip label={option.uhid} size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {option.abhaRecord?.abhaAddress || option.abhaRecord?.abhaNumber || option.abhaAddress || option.abhaNumber || option.abhaId || 'No ABHA'}
                      {option.mobile ? ` · ${option.mobile}` : ''}
                    </Typography>
                  }
                />
              </ListItem>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                placeholder="Search by name, UHID, or paste an ABHA address (e.g. name@sbx)"
                helperText="ABDM only accepts the patient's ABHA address (with @) — not the 14-digit number."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {patientSearchLoading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2.25 }}
          />

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Why are you requesting this?
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2.25 }}>
            <InputLabel>Purpose</InputLabel>
            <Select
              value={newConsentForm.purpose}
              label="Purpose"
              onChange={(e) => setNewConsentForm(f => ({ ...f, purpose: e.target.value }))}
            >
              <MenuItem value="CAREMGT">Care Management — ongoing treatment</MenuItem>
              <MenuItem value="BTG">Break the Glass — emergency access</MenuItem>
              <MenuItem value="PUBHLTH">Public Health</MenuItem>
              <MenuItem value="HPAYMT">Healthcare Payment / Insurance</MenuItem>
              <MenuItem value="DSRCH">Disease Specific Research</MenuItem>
              <MenuItem value="PATRQT">Patient Self-Requested</MenuItem>
              <MenuItem value="HQUALITY">Healthcare Quality Audit</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            What records do you need?
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.25, mb: 2.25, borderRadius: 2, bgcolor: 'action.hover' }}>
            <FormGroup>
              <Grid container spacing={0.5}>
                {HI_TYPE_OPTIONS.map((t) => (
                  <Grid item xs={12} sm={6} key={t.code}>
                    <FormControlLabel
                      sx={{ alignItems: 'flex-start', m: 0, py: 0.25 }}
                      control={
                        <Checkbox
                          size="small"
                          sx={{ pt: 0.5 }}
                          checked={newConsentForm.hiTypes.includes(t.code)}
                          onChange={(e) => setNewConsentForm(f => ({
                            ...f,
                            hiTypes: e.target.checked ? [...f.hiTypes, t.code] : f.hiTypes.filter(x => x !== t.code),
                          }))}
                        />
                      }
                      label={
                        <Box sx={{ pt: '2px' }}>
                          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                            {t.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                            {t.hint}
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Paper>

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            For what time period?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="From"
              type="date"
              size="small"
              fullWidth
              value={newConsentForm.dateRangeFrom}
              onChange={(e) => setNewConsentForm(f => ({ ...f, dateRangeFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText="Earliest record date"
            />
            <TextField
              label="To"
              type="date"
              size="small"
              fullWidth
              value={newConsentForm.dateRangeTo}
              onChange={(e) => setNewConsentForm(f => ({ ...f, dateRangeTo: e.target.value }))}
              inputProps={{ max: new Date().toISOString().split('T')[0] }}
              InputLabelProps={{ shrink: true }}
              helperText="Latest record date"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewConsentOpen(false)} disabled={newConsentLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateNewConsent}
            disabled={newConsentLoading || !newConsentForm.patientAbhaId.trim() || newConsentForm.hiTypes.length === 0}
            startIcon={newConsentLoading ? <CircularProgress size={16} /> : <Add />}
          >
            {newConsentLoading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Details Dialog ─────────────────────────────────────── */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description color="primary" />
              Consent Details
            </Box>
            <IconButton onClick={() => setDetailsOpen(false)} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedConsent && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Consent ID</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedConsent.consentId || selectedConsent.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <ConsentStatusChip consentId={selectedConsent.id} initialStatus={selectedConsent.status || 'REQUESTED'} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedConsent.patient?.firstName} {selectedConsent.patient?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Purpose</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {PURPOSE_LABELS[selectedConsent.purpose] || selectedConsent.purpose || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2">
                    {selectedConsent.createdAt ? format(new Date(selectedConsent.createdAt), 'MMM dd, yyyy HH:mm') : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Expires</Typography>
                  <Typography variant="body2">
                    {selectedConsent.expiresAt ? format(new Date(selectedConsent.expiresAt), 'MMM dd, yyyy HH:mm') : '—'}
                  </Typography>
                </Grid>
                {selectedConsent.grantedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Granted At</Typography>
                    <Typography variant="body2">{format(new Date(selectedConsent.grantedAt), 'MMM dd, yyyy HH:mm')}</Typography>
                  </Grid>
                )}
                {selectedConsent.revokedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Revoked At</Typography>
                    <Typography variant="body2">{format(new Date(selectedConsent.revokedAt), 'MMM dd, yyyy HH:mm')}</Typography>
                  </Grid>
                )}
                {selectedConsent.hiTypes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Health Info Types</Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(Array.isArray(selectedConsent.hiTypes) ? selectedConsent.hiTypes : []).map((t: string) => (
                        <Chip key={t} label={t} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {selectedConsent.abdmRequestId && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">ABDM Request ID</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{selectedConsent.abdmRequestId}</Typography>
                  </Grid>
                )}
                {selectedConsent.abdmConsentId && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">ABDM Consent ID</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{selectedConsent.abdmConsentId}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* ── Records pulled under this consent ─────────────────── */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderOpen color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Records pulled under this consent
                  </Typography>
                  {Number.isFinite(artefactData?.recordsCount) && (
                    <Chip
                      size="small"
                      label={`${artefactData.recordsCount}`}
                      color={artefactData.recordsCount > 0 ? 'success' : 'default'}
                      variant={artefactData.recordsCount > 0 ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  )}
                </Box>
                {selectedConsent.status === 'GRANTED' && !artefactData?.purgedAt && (
                  <Tooltip title="Re-fetch from the patient profile">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        setDetailsLoading(true);
                        try {
                          const res = await consentService.fetchConsentArtefact(selectedConsent.id) as any;
                          setArtefactData(res?.data || res);
                        } catch { /* ignore */ }
                        finally { setDetailsLoading(false); }
                      }}
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {detailsLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Checking what records have arrived from PHR…
                  </Typography>
                </Box>
              )}

              {!detailsLoading && artefactData?.purgedAt && (
                <Alert severity="warning" icon={<DeleteSweep fontSize="small" />} sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                    Records purged
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(artefactData.recordsCount || 0)} record(s) and the decryption key were wiped on{' '}
                    {format(new Date(artefactData.purgedAt), 'MMM dd, yyyy HH:mm')} because the consent was{' '}
                    {(selectedConsent.status || '').toLowerCase()}. ABDM compliance — no copy is retained.
                  </Typography>
                </Alert>
              )}

              {!detailsLoading && !artefactData?.purgedAt && (
                <>
                  {selectedConsent.status === 'REQUESTED' && (
                    <Alert severity="info" sx={{ mb: 1 }} icon={<HourglassEmpty fontSize="small" />}>
                      Waiting for the patient to approve this request on their ABHA app. Records will appear here automatically once they grant.
                    </Alert>
                  )}

                  {selectedConsent.status === 'DENIED' && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      The patient denied this request — no data will be pulled.
                    </Alert>
                  )}

                  {selectedConsent.status === 'GRANTED' && (artefactData?.records?.length ?? 0) === 0 && (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        textAlign: 'center',
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                        borderStyle: 'dashed',
                      }}
                    >
                      <Inbox sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        No records pulled yet
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Consent is granted but no health information has been imported under it. Click <strong>Fetch Records</strong> to pull from the patient's linked HIPs.
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CloudDownload />}
                        onClick={() => { setDetailsOpen(false); openFetchDialog(selectedConsent); }}
                      >
                        Fetch records now
                      </Button>
                    </Paper>
                  )}

                  {selectedConsent.status === 'GRANTED' && (artefactData?.records?.length ?? 0) > 0 && (
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                        {artefactData.records.map((rec: any, idx: number) => (
                          <Box
                            key={rec.id || idx}
                            sx={{
                              p: 1.25,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              borderBottom: idx < artefactData.records.length - 1 ? '1px solid' : 'none',
                              borderColor: 'divider',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#50C878', 0.12), color: 'success.main' }}>
                              <Article fontSize="small" />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {rec.recordType || 'Health Record'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {rec.sourceHipName || rec.sourceHipId || 'Unknown HIP'}
                                {rec.recordDate ? ` · ${format(new Date(rec.recordDate), 'MMM dd, yyyy')}` : ''}
                                {rec.receivedAt ? ` · received ${formatDistanceToNow(new Date(rec.receivedAt), { addSuffix: true })}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      {selectedConsent.patient?.id && (
                        <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', textAlign: 'right' }}>
                          <Button
                            size="small"
                            startIcon={<AssignmentInd fontSize="small" />}
                            onClick={() => navigate(`/app/patients/${selectedConsent.patient.id}`)}
                            sx={{ textTransform: 'none' }}
                          >
                            View in patient profile
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  )}
                </>
              )}

              {/* ── Compliance footnote ─────────────────────────────── */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}
              >
                ABDM compliance: imported records and the decryption key are wiped automatically when the patient revokes the consent or the grant window expires. A scheduled sweeper runs every 15 min as a backstop.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedConsent?.status === 'GRANTED' && (
            <Button
              color="success"
              variant="contained"
              startIcon={<CloudDownload />}
              onClick={() => { setDetailsOpen(false); openFetchDialog(selectedConsent); }}
            >
              Fetch Records
            </Button>
          )}
          {selectedConsent?.status === 'REQUESTED' && (
            <Button
              color="error"
              variant="outlined"
              onClick={() => { handleCancelConsent(selectedConsent.id); setDetailsOpen(false); }}
            >
              Cancel Request
            </Button>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Fetch Records Dialog ─────────────────────────────────────── */}
      <Dialog open={fetchOpen} onClose={() => !fetchSubmitting && setFetchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudDownload color="success" />
              Pull Records from PHR
            </Box>
            <IconButton onClick={() => setFetchOpen(false)} size="small" disabled={fetchSubmitting}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {fetchConsent && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                We'll request <strong>
                  {Array.isArray(fetchConsent.hiTypes) ? fetchConsent.hiTypes.join(', ') : 'all granted health info types'}
                </strong> for{' '}
                <strong>{fetchConsent.patient?.firstName} {fetchConsent.patient?.lastName}</strong>.
                Records arrive over ABDM and appear automatically in the patient's profile.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1.25 }}>
                <TextField
                  label="From"
                  type="date"
                  size="small"
                  fullWidth
                  value={fetchFrom}
                  onChange={(e) => setFetchFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="To"
                  type="date"
                  size="small"
                  fullWidth
                  value={fetchTo}
                  onChange={(e) => setFetchTo(e.target.value)}
                  inputProps={{ max: new Date().toISOString().split('T')[0] }}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFetchOpen(false)} disabled={fetchSubmitting}>Cancel</Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleFetchRecords}
            disabled={fetchSubmitting || !fetchFrom || !fetchTo}
            startIcon={fetchSubmitting ? <CircularProgress size={16} /> : <CloudDownload />}
          >
            {fetchSubmitting ? 'Requesting…' : 'Fetch Records'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsentManagement;
