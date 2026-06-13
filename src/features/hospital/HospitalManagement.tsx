import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, IconButton, InputAdornment, MenuItem, Paper, Stack,
  Tooltip, alpha, useTheme, Collapse, FormControl, InputLabel, Select,
  Switch, FormControlLabel, CircularProgress, Alert,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, CheckCircle, LocalHospital, FilterList,
  Clear, Business, People, MedicalServices, CreditCard, Schedule, Save,
  HealthAndSafety, Insights, AdminPanelSettings, Visibility, VisibilityOff,
  ContactPhone, LocationOn, Gavel, KingBed, Domain, Close,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import hospitalService from '../../services/hospitalService';
import hipService from '../../services/hipService';
import { toast } from 'react-toastify';
import { PageHeader, StatCard } from '../../components/ui';

interface Hospital {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  plan: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  abdmEnabled: boolean;
  hipId?: string;
  hiuId?: string;
  isActive: boolean;
  primaryAdminId?: string | null;
  primaryAdmin?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    isActive: boolean;
  } | null;
  _count?: { users: number; doctors: number; patients: number; appointments: number };
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  ACTIVE:    { color: '#16a34a', bg: '#dcfce7' },
  TRIAL:     { color: '#2563eb', bg: '#dbeafe' },
  SUSPENDED: { color: '#dc2626', bg: '#fee2e2' },
  EXPIRED:   { color: '#d97706', bg: '#fef3c7' },
};

const planConfig: Record<string, { color: string; label: string }> = {
  FREE:         { color: '#64748b', label: 'Free' },
  BASIC:        { color: '#2563eb', label: 'Basic' },
  PROFESSIONAL: { color: '#7c3aed', label: 'Professional' },
  ENTERPRISE:   { color: '#059669', label: 'Enterprise' },
};

const HospitalManagement: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Form fields are aligned 1:1 with the backend `HospitalOnboardingData`
  // contract. We deliberately do NOT collect:
  //   • `code` — server always generates the hospital code.
  //   • `ownerName/Email/Phone` — derived from the primary admin block.
  //   • `abdmClientId/Secret/CallbackUrl` — these are PLATFORM-level per
  //     ABDM docs (issued by NHA per integrator) and live in env vars.
  //
  // The single `email` field is used as both the hospital's primary email
  // and the admin user's login email (consolidated, not duplicated).
  const [formData, setFormData] = useState({
    // Hospital basics
    name: '', type: 'HOSPITAL',
    email: '', phone: '', alternatePhone: '', website: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', landmark: '',
    registrationNumber: '', gstNumber: '', panNumber: '', licenseNumber: '', establishedYear: '',
    // Primary admin (REQUIRED on create; editable on update)
    adminFirstName: '', adminLastName: '', adminPhone: '',
    adminUsername: '', adminPassword: '',
    // Facility & subscription
    totalBeds: '', icuBeds: '', emergencyBeds: '', operationTheaters: '',
    plan: 'FREE', defaultOpdCharge: '',
    // ABDM (per-facility identifiers from HFR/NHA)
    hipId: '', hipName: '', hiuId: '', hiuName: '', hfrFacilityId: '',
  });
  const [abdmRegistering, setAbdmRegistering] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // ── Schedule dialog state ────────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleHospital, setScheduleHospital] = useState<Hospital | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const DAY_LABELS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const [scheduleData, setScheduleData] = useState<{
    is24x7: boolean;
    defaultSlotDuration: number;
    operatingHours: Record<string, { start: string; end: string } | null>;
    breakTimes: { start: string; end: string; label: string }[];
    holidays: string[];
  }>({
    is24x7: false, defaultSlotDuration: 30,
    operatingHours: { mon: { start: '09:00', end: '21:00' }, tue: { start: '09:00', end: '21:00' }, wed: { start: '09:00', end: '21:00' }, thu: { start: '09:00', end: '21:00' }, fri: { start: '09:00', end: '21:00' }, sat: { start: '09:00', end: '17:00' }, sun: { start: '09:00', end: '14:00' } },
    breakTimes: [], holidays: [],
  });

  const handleOpenSchedule = async (hospital: Hospital) => {
    setScheduleHospital(hospital);
    setScheduleOpen(true);
    try {
      setScheduleLoading(true);
      const res: any = await hospitalService.getSchedule(hospital.id);
      const d = res.data || res;
      setScheduleData({
        is24x7: d.is24x7 || false,
        defaultSlotDuration: d.defaultSlotDuration || 30,
        operatingHours: d.operatingHours || { mon: { start: '09:00', end: '21:00' }, tue: { start: '09:00', end: '21:00' }, wed: { start: '09:00', end: '21:00' }, thu: { start: '09:00', end: '21:00' }, fri: { start: '09:00', end: '21:00' }, sat: { start: '09:00', end: '17:00' }, sun: { start: '09:00', end: '14:00' } },
        breakTimes: d.breakTimes || [],
        holidays: d.holidays || [],
      });
    } catch { /* use defaults */ }
    finally { setScheduleLoading(false); }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleHospital) return;
    try {
      setScheduleLoading(true);
      await hospitalService.updateSchedule(scheduleHospital.id, scheduleData);
      toast.success('Schedule updated');
      setScheduleOpen(false);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to update schedule'); }
    finally { setScheduleLoading(false); }
  };

  const updateDayHours = (day: string, field: 'start' | 'end', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [day]: { ...(prev.operatingHours[day] || { start: '09:00', end: '21:00' }), [field]: value } },
    }));
  };

  const toggleDayClosed = (day: string) => {
    setScheduleData(prev => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [day]: prev.operatingHours[day] ? null : { start: '09:00', end: '21:00' } },
    }));
  };

  useEffect(() => { fetchHospitals(); }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response: any = await hospitalService.getAllHospitals({});
      const fetched = response.data?.data?.hospitals || response.data?.hospitals || response.hospitals || [];
      setAllHospitals(fetched);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const hospitals = useMemo(() => {
    let list = [...allHospitals];
    if (statusFilter !== 'ALL') list = list.filter((h) => h.status === statusFilter);
    if (planFilter !== 'ALL') list = list.filter((h) => h.plan === planFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((h) =>
        h.name?.toLowerCase().includes(q) || h.code?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) || h.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allHospitals, statusFilter, planFilter, searchQuery]);

  const activeFilters = [statusFilter !== 'ALL', planFilter !== 'ALL'].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter('ALL'); setPlanFilter('ALL'); setSearchQuery(''); };

  const statCards = useMemo(() => [
    { label: 'Total Hospitals', value: allHospitals.length, icon: <Business />, color: '#6366f1' },
    { label: 'Active', value: allHospitals.filter((h) => h.status === 'ACTIVE').length, icon: <CheckCircle />, color: '#16a34a' },
    { label: 'Trial', value: allHospitals.filter((h) => h.status === 'TRIAL').length, icon: <LocalHospital />, color: '#2563eb' },
    { label: 'Total Users', value: allHospitals.reduce((s, h) => s + (h._count?.users || 0), 0), icon: <People />, color: '#7c3aed' },
  ], [allHospitals]);

  // ── Client-side validation (mirrors backend express-validator rules
  //    exactly so the API never has to reject a request from this form). ──
  const PHONE_RE = /^[6-9]\d{9}$/;
  const PINCODE_RE = /^\d{6}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const URL_RE = /^https?:\/\/.+/;
  const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
  const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
  const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
  const HFR_FACILITY_RE = /^IN\d{10}$/;
  const HIP_ID_RE = /^IN\d{10}(?:_[A-Za-z0-9]{1,16})?$/;
  const HIU_ID_RE = /^[A-Za-z0-9_-]{4,40}$/;

  const validateField = (field: string, value: string): string => {
    const v = (value ?? '').toString();
    const trimmed = v.trim();
    switch (field) {
      // ── Hospital basics ──
      case 'name':
        if (!trimmed) return 'Hospital name is required';
        if (trimmed.length < 2 || trimmed.length > 200) return 'Name must be 2-200 characters';
        return '';
      case 'email':
        if (!trimmed) return 'Email is required';
        if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address';
        return '';
      case 'phone':
        if (!trimmed) return 'Reception phone is required';
        if (!PHONE_RE.test(trimmed)) return 'Must be a valid 10-digit Indian number';
        return '';
      case 'alternatePhone':
        if (trimmed && !PHONE_RE.test(trimmed)) return 'Must be a valid 10-digit Indian number';
        return '';
      case 'website':
        if (trimmed && !URL_RE.test(trimmed)) return 'Website must start with http:// or https://';
        return '';
      case 'addressLine1':
        if (!trimmed) return 'Address Line 1 is required';
        if (trimmed.length < 3 || trimmed.length > 500) return 'Address must be 3-500 characters';
        return '';
      case 'addressLine2':
        if (trimmed && trimmed.length > 500) return 'Address Line 2 must be under 500 characters';
        return '';
      case 'city':
        if (!trimmed) return 'City is required';
        if (trimmed.length < 2 || trimmed.length > 100) return 'City must be 2-100 characters';
        return '';
      case 'state':
        if (!trimmed) return 'State is required';
        if (trimmed.length < 2 || trimmed.length > 100) return 'State must be 2-100 characters';
        return '';
      case 'pincode':
        if (!trimmed) return 'Pincode is required';
        if (!PINCODE_RE.test(trimmed)) return 'Must be exactly 6 digits';
        return '';
      case 'landmark':
        if (trimmed && trimmed.length > 200) return 'Landmark must be under 200 characters';
        return '';
      case 'registrationNumber':
        if (trimmed && (trimmed.length < 3 || trimmed.length > 50))
          return 'Registration number must be 3-50 characters';
        return '';
      case 'licenseNumber':
        if (trimmed && (trimmed.length < 3 || trimmed.length > 50))
          return 'License number must be 3-50 characters';
        return '';
      case 'gstNumber':
        if (trimmed && !GST_RE.test(trimmed.toUpperCase()))
          return 'Invalid GST (e.g. 22AAAAA0000A1Z5)';
        return '';
      case 'panNumber':
        if (trimmed && !PAN_RE.test(trimmed.toUpperCase()))
          return 'Invalid PAN (e.g. ABCDE1234F)';
        return '';
      case 'establishedYear': {
        if (!trimmed) return '';
        const yr = parseInt(trimmed, 10);
        const now = new Date().getFullYear();
        if (isNaN(yr) || yr < 1800 || yr > now)
          return `Year must be between 1800 and ${now}`;
        return '';
      }

      // ── Primary admin (REQUIRED on create) ──
      case 'adminFirstName':
        if (!trimmed) return editingHospital ? '' : 'First name is required';
        if (trimmed && (trimmed.length < 1 || trimmed.length > 50)) return 'Must be 1-50 characters';
        return '';
      case 'adminLastName':
        if (!trimmed) return editingHospital ? '' : 'Last name is required';
        if (trimmed && (trimmed.length < 1 || trimmed.length > 50)) return 'Must be 1-50 characters';
        return '';
      case 'adminPhone':
        if (!trimmed) return editingHospital ? '' : 'Admin mobile is required';
        if (trimmed && !PHONE_RE.test(trimmed))
          return 'Must be a valid 10-digit Indian number';
        return '';
      case 'adminUsername':
        if (!trimmed) return editingHospital ? '' : 'Username is required';
        if (trimmed && (trimmed.length < 3 || trimmed.length > 50))
          return 'Username must be 3-50 characters';
        if (trimmed && !USERNAME_RE.test(trimmed))
          return 'Letters, numbers, and underscores only';
        return '';
      case 'adminPassword':
        // On EDIT the password field is optional (blank = keep existing).
        // On CREATE it's required.
        if (!trimmed) return editingHospital ? '' : 'Password is required';
        if (trimmed.length < 8 || trimmed.length > 128)
          return 'Password must be at least 8 characters';
        return '';

      // ── Facility capacity / subscription ──
      case 'totalBeds':
      case 'icuBeds':
      case 'emergencyBeds': {
        if (!trimmed) return '';
        const n = parseInt(trimmed, 10);
        if (isNaN(n) || n < 0 || n > 10000) return 'Must be 0-10,000';
        return '';
      }
      case 'operationTheaters': {
        if (!trimmed) return '';
        const n = parseInt(trimmed, 10);
        if (isNaN(n) || n < 0 || n > 1000) return 'Must be 0-1,000';
        return '';
      }
      case 'defaultOpdCharge': {
        if (!trimmed) return '';
        const n = parseFloat(trimmed);
        if (isNaN(n) || n < 0 || n > 100000) return 'Must be 0-1,00,000';
        return '';
      }

      // ── ABDM identifiers ──
      case 'hfrFacilityId':
        if (trimmed && !HFR_FACILITY_RE.test(trimmed))
          return 'Format: IN followed by exactly 10 digits (e.g. IN3410000260)';
        return '';
      case 'hipId':
        if (trimmed && !HIP_ID_RE.test(trimmed))
          return 'Format: IN<10 digits> (optionally _<counter>)';
        return '';
      case 'hiuId':
        if (trimmed && !HIU_ID_RE.test(trimmed))
          return '4-40 chars: letters, digits, _ or -';
        return '';
      case 'hipName':
      case 'hiuName':
        if (trimmed && (trimmed.length < 2 || trimmed.length > 200))
          return 'Display name must be 2-200 characters';
        return '';

      default:
        return '';
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateField(field, value);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const validateAll = (): boolean => {
    // Required + optional fields — every key in formData gets validated.
    const allFields = Object.keys(formData);
    const errors: Record<string, string> = {};
    for (const f of allFields) {
      const err = validateField(f, (formData as any)[f] || '');
      if (err) errors[f] = err;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Dialog handlers ──────────────────────────────────────────────────────
  const blankForm = () => ({
    name: '', type: 'HOSPITAL',
    email: '', phone: '', alternatePhone: '', website: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', landmark: '',
    registrationNumber: '', gstNumber: '', panNumber: '', licenseNumber: '', establishedYear: '',
    adminFirstName: '', adminLastName: '', adminPhone: '',
    adminUsername: '', adminPassword: '',
    totalBeds: '', icuBeds: '', emergencyBeds: '', operationTheaters: '',
    plan: 'FREE', defaultOpdCharge: '',
    hipId: '', hipName: '', hiuId: '', hiuName: '', hfrFacilityId: '',
  });

  const handleOpenDialog = (hospital?: Hospital) => {
    setFieldErrors({});
    setShowAdminPassword(false);
    if (hospital) {
      setEditingHospital(hospital);
      const h = hospital as any;
      const admin = hospital.primaryAdmin || {};
      setFormData({
        name: hospital.name, type: h.type || 'HOSPITAL',
        email: hospital.email || '', phone: hospital.phone || '',
        alternatePhone: h.alternatePhone || '', website: h.website || '',
        addressLine1: h.addressLine1 || '', addressLine2: h.addressLine2 || '',
        city: hospital.city || '', state: hospital.state || '', pincode: hospital.pincode || '',
        landmark: h.landmark || '',
        registrationNumber: h.registrationNumber || '',
        gstNumber: h.gstNumber || '', panNumber: h.panNumber || '',
        licenseNumber: h.licenseNumber || '',
        establishedYear: h.establishedYear ? String(h.establishedYear) : '',
        // Pre-fill admin block from the linked primary admin user.
        adminFirstName: (admin as any).firstName || '',
        adminLastName: (admin as any).lastName || '',
        adminPhone: (admin as any).phone || '',
        adminUsername: (admin as any).username || '',
        adminPassword: '', // never pre-filled; blank = keep existing
        totalBeds: h.totalBeds ? String(h.totalBeds) : '',
        icuBeds: h.icuBeds ? String(h.icuBeds) : '',
        emergencyBeds: h.emergencyBeds ? String(h.emergencyBeds) : '',
        operationTheaters: h.operationTheaters ? String(h.operationTheaters) : '',
        plan: hospital.plan || 'FREE',
        defaultOpdCharge: h.defaultOpdCharge ? String(h.defaultOpdCharge) : '',
        hipId: hospital.hipId || '', hipName: h.hipName || '',
        hiuId: h.hiuId || '', hiuName: h.hiuName || '',
        hfrFacilityId: h.hfrFacilityId || '',
      });
    } else {
      setEditingHospital(null);
      setFormData(blankForm());
    }
    setOpenDialog(true);
  };
  const handleCloseDialog = () => { setOpenDialog(false); setEditingHospital(null); setFieldErrors({}); };

  const handleSubmit = async () => {
    if (!validateAll()) {
      toast.error('Please fix the highlighted errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Build the payload — only send non-empty fields. The backend treats
      // empty strings as "absent" via .optional({ values: 'falsy' }) anyway,
      // but trimming here keeps the request small and the contract clean.
      const payload: any = {};
      for (const [key, val] of Object.entries(formData)) {
        if (val !== '' && val !== null && val !== undefined) {
          payload[key] = typeof val === 'string' ? val.trim() : val;
        }
      }
      // Numeric coercions (backend express-validator does isInt / isFloat).
      if (payload.defaultOpdCharge) payload.defaultOpdCharge = parseFloat(payload.defaultOpdCharge);
      if (payload.establishedYear) payload.establishedYear = parseInt(payload.establishedYear, 10);
      if (payload.totalBeds) payload.totalBeds = parseInt(payload.totalBeds, 10);
      if (payload.icuBeds) payload.icuBeds = parseInt(payload.icuBeds, 10);
      if (payload.emergencyBeds) payload.emergencyBeds = parseInt(payload.emergencyBeds, 10);
      if (payload.operationTheaters) payload.operationTheaters = parseInt(payload.operationTheaters, 10);
      // GST/PAN are stored uppercase server-side; we mirror that here so the
      // payload matches the expected shape (avoids surprise sanitization).
      if (payload.gstNumber) payload.gstNumber = payload.gstNumber.toUpperCase();
      if (payload.panNumber) payload.panNumber = payload.panNumber.toUpperCase();

      if (editingHospital) {
        // On EDIT: do not send adminUsername/Password if unchanged so we
        // never accidentally reset credentials. We pre-populate username so
        // it's safe to keep, but blank password means "leave it alone".
        if (!payload.adminPassword) delete payload.adminPassword;
        await hospitalService.updateHospital(editingHospital.id, payload);
        toast.success('Hospital updated successfully');
      } else {
        await hospitalService.createHospital(payload);
        toast.success('Hospital created successfully');
      }
      handleCloseDialog();
      fetchHospitals();
    } catch (error: any) {
      const resp = error.response?.data;

      // Parse field-level validation errors from backend (422)
      if (resp?.errors && Array.isArray(resp.errors)) {
        const backendErrors: Record<string, string> = {};
        const messages: string[] = [];
        for (const e of resp.errors) {
          if (e.field && e.field !== 'unknown') {
            backendErrors[e.field] = e.message;
          }
          messages.push(e.message);
        }
        setFieldErrors(prev => ({ ...prev, ...backendErrors }));
        toast.error(messages.join(' • ') || 'Validation failed');
      } else {
        toast.error(resp?.message || 'Failed to save hospital');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to suspend this hospital?')) {
      try {
        await hospitalService.deleteHospital(id);
        toast.success('Hospital suspended');
        fetchHospitals();
      } catch { toast.error('Failed to suspend hospital'); }
    }
  };

  const handleActivate = async (id: string) => {
    if (window.confirm('Activate this hospital?')) {
      try {
        await hospitalService.updateHospital(id, { isActive: true, status: 'ACTIVE' } as any);
        toast.success('Hospital activated');
        fetchHospitals();
      } catch { toast.error('Failed to activate hospital'); }
    }
  };

  const handleAbdmRegister = async (hospital: Hospital) => {
    if (!hospital.hipId) {
      toast.error('Set a HIP ID first (Edit → ABDM Integration section)');
      return;
    }
    if (!window.confirm(`Register "${hospital.name}" as HIP with ABDM?\nHIP ID: ${hospital.hipId}`)) return;

    setAbdmRegistering(true);
    try {
      // Pass the target hospital so SUPER_ADMIN (whose JWT carries no hospitalId)
      // can register any hospital, while ADMIN is locked to their own.
      await hipService.registerHipService(hospital.id);
      // Best-effort HIU registration too; fail silently if the hospital has no HIU id.
      const h: any = hospital;
      if (h.hiuId) {
        try { await hipService.registerHiuService(hospital.id); } catch (_) { /* non-blocking */ }
      }
      toast.success('Hospital registered with ABDM successfully!');
      fetchHospitals();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to register with ABDM';
      toast.error(msg);
    } finally {
      setAbdmRegistering(false);
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Hospital',
      flex: 1.2,
      minWidth: 260,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha('#6366f1', 0.1), color: '#6366f1',
            }}
          >
            <LocalHospital fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{params.value}</Typography>
            <Typography variant="caption" color="text.secondary">{params.row.code}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'city',
      headerName: 'Location',
      width: 160,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.row.city || '—'}</Typography>
          {params.row.state && <Typography variant="caption" color="text.secondary">{params.row.state}</Typography>}
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">{params.value || '—'}</Typography>
      ),
    },
    {
      field: 'plan',
      headerName: 'Plan',
      width: 130,
      renderCell: (params) => {
        const pc = planConfig[params.value] || planConfig.FREE;
        return (
          <Chip
            icon={<CreditCard sx={{ fontSize: 14 }} />}
            label={pc.label}
            size="small"
            sx={{ bgcolor: alpha(pc.color, 0.1), color: pc.color, fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      field: 'stats',
      headerName: 'Stats',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Chip
            icon={<People sx={{ fontSize: 13 }} />}
            label={`${params.row._count?.users || 0}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            icon={<MedicalServices sx={{ fontSize: 13 }} />}
            label={`${params.row._count?.doctors || 0}`}
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            label={`${params.row._count?.patients || 0} Pts`}
            size="small"
            variant="outlined"
            color="info"
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const sc = statusConfig[params.value] || { color: '#64748b', bg: '#f1f5f9' };
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'abdmEnabled',
      headerName: 'ABDM',
      width: 100,
      renderCell: (params) => {
        if (params.value) {
          return <Chip icon={<HealthAndSafety sx={{ fontSize: 14 }} />} label="Active" size="small" sx={{ bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontWeight: 600, fontSize: '0.7rem' }} />;
        }
        if (params.row.hipId) {
          return <Chip label="Pending" size="small" sx={{ bgcolor: alpha('#d97706', 0.1), color: '#d97706', fontWeight: 600, fontSize: '0.7rem' }} />;
        }
        return <Chip label="—" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />;
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 210,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const isSuspended = params.row.status === 'SUSPENDED' || params.row.status === 'EXPIRED';
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="View performance">
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hospitals/${params.row.id}/performance`)}
                sx={{ color: theme.palette.primary.main }}
              >
                <Insights fontSize="small" />
              </IconButton>
            </Tooltip>
            {params.row.hipId && !params.row.abdmEnabled && (
              <Tooltip title="Register with ABDM">
                <IconButton size="small" onClick={() => handleAbdmRegister(params.row)} sx={{ color: '#059669' }} disabled={abdmRegistering}>
                  {abdmRegistering ? <CircularProgress size={16} /> : <HealthAndSafety fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Schedule"><IconButton size="small" onClick={() => handleOpenSchedule(params.row)} sx={{ color: '#6366f1' }}><Schedule fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: 'text.secondary' }}><Edit fontSize="small" /></IconButton></Tooltip>
            {isSuspended ? (
              <Tooltip title="Activate"><IconButton size="small" onClick={() => handleActivate(params.row.id)} color="success"><CheckCircle fontSize="small" /></IconButton></Tooltip>
            ) : (
              <Tooltip title="Suspend"><IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  // Richer section header — icon tile + title + sub-copy. Uses a soft tinted
  // bar on the left so each section reads like a clearly bounded "card"
  // without forcing us to nest Paper elements inside the dialog grid.
  type AccentTone = 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'error';
  const SectionHeader: React.FC<{
    icon: React.ReactNode;
    title: string;
    description?: string;
    tone?: AccentTone;
    badge?: React.ReactNode;
  }> = ({ icon, title, description, tone = 'primary', badge }) => {
    const accent = theme.palette[tone].main;
    return (
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            mt: 2, mb: 0.5, p: 1.5, pl: 1.75,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${alpha(accent, 0.10)} 0%, ${alpha(accent, 0.02)} 80%)`,
            borderLeft: `4px solid ${accent}`,
          }}
        >
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              bgcolor: alpha(accent, 0.16), color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1" fontWeight={700}
              sx={{ color: accent, lineHeight: 1.2, letterSpacing: 0.1 }}
            >
              {title}
            </Typography>
            {description && (
              <Typography
                variant="caption" color="text.secondary"
                sx={{ display: 'block', lineHeight: 1.3, mt: 0.25 }}
              >
                {description}
              </Typography>
            )}
          </Box>
          {badge}
        </Box>
      </Grid>
    );
  };

  const TONE_BY_LABEL: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    'Total Hospitals': 'primary',
    'Active': 'success',
    'Pending': 'warning',
    'Suspended': 'info',
  };

  return (
    <Box>
      <PageHeader
        title="Hospital Management"
        subtitle="Onboard, monitor, and govern hospitals on the platform"
        icon={<Business />}
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add hospital
          </Button>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        {statCards.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <StatCard
              label={s.label}
              value={String(s.value)}
              icon={s.icon as React.ReactElement}
              tone={TONE_BY_LABEL[s.label] || 'info'}
            />
          </Grid>
        ))}
      </Grid>

      {/* Search & Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            placeholder="Search by name, code, email, or city..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            size="small" sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled' }} /></InputAdornment>,
              ...(searchQuery ? { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery('')}><Clear fontSize="small" /></IconButton></InputAdornment> } : {}),
            }}
          />
          <Button
            variant={showFilters ? 'contained' : 'outlined'} size="small" startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)} sx={{ minWidth: 100, borderRadius: 2 }}
          >
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
        </Stack>

        <Collapse in={showFilters}>
          <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Status</MenuItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: val.color }} />
                      <span>{key}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Plan</InputLabel>
              <Select value={planFilter} label="Plan" onChange={(e) => setPlanFilter(e.target.value)}>
                <MenuItem value="ALL">All Plans</MenuItem>
                {Object.entries(planConfig).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: val.color }} />
                      <span>{val.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {activeFilters > 0 && (
              <Button size="small" startIcon={<Clear />} onClick={clearFilters} color="inherit" sx={{ alignSelf: 'center' }}>Clear all</Button>
            )}
          </Stack>
        </Collapse>
      </Paper>

      {/* Results summary */}
      <Box sx={{ mb: 1, px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{hospitals.length}</strong> of {allHospitals.length} hospitals
        </Typography>
      </Box>

      {/* Data Grid */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <DataGrid
          rows={hospitals} columns={columns} loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick autoHeight rowHeight={64}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(theme.palette.primary.main, 0.04), borderBottom: `1px solid ${theme.palette.divider}` },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 },
            '& .MuiDataGrid-cell': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
          }}
        />
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog
        open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {/* Gradient hero title — shows live hospital name + status chip on edit. */}
        <DialogTitle
          sx={{
            p: 0,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.96)} 0%, ${alpha(theme.palette.primary.dark, 0.96)} 100%)`,
            color: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2.5, pr: 1.5 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: 2,
                bgcolor: alpha('#fff', 0.18), color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {editingHospital ? <Edit /> : <LocalHospital />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {editingHospital
                  ? (formData.name?.trim() || editingHospital.name || 'Edit Hospital')
                  : 'Register a New Hospital'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
                {editingHospital
                  ? `Code: ${editingHospital.code} · ${editingHospital.status} · ${editingHospital.plan}`
                  : 'Fill in the details below — required fields are marked with *'}
              </Typography>
              {editingHospital && (
                <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                  <Chip
                    size="small" label={editingHospital.status}
                    sx={{ bgcolor: alpha('#fff', 0.18), color: '#fff', fontWeight: 600, height: 22 }}
                  />
                  {editingHospital.abdmEnabled ? (
                    <Chip
                      size="small" icon={<HealthAndSafety sx={{ fontSize: 14, color: '#fff !important' }} />}
                      label="ABDM Active"
                      sx={{ bgcolor: alpha('#16a34a', 0.85), color: '#fff', fontWeight: 600, height: 22 }}
                    />
                  ) : editingHospital.hipId ? (
                    <Chip size="small" label="ABDM Pending"
                      sx={{ bgcolor: alpha('#f59e0b', 0.85), color: '#fff', fontWeight: 600, height: 22 }} />
                  ) : null}
                </Stack>
              )}
            </Box>
            <IconButton
              onClick={handleCloseDialog}
              sx={{ color: alpha('#fff', 0.85), '&:hover': { bgcolor: alpha('#fff', 0.12) } }}
              size="small"
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            maxHeight: '70vh',
            bgcolor: alpha(theme.palette.background.default, 0.6),
            // subtle inner gutter so sections breathe.
            px: { xs: 2, sm: 3 }, py: 2,
            // Unified input shape across the dialog — rounded corners + focus
            // ring tint for a modern feel without per-field overrides.
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              transition: 'box-shadow 120ms ease, border-color 120ms ease',
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`,
              },
              '&.Mui-error.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.16)}`,
              },
            },
            '& .MuiFormHelperText-root': { ml: 1, mt: 0.5 },
          }}
        >
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            {/* ── 1. Hospital Information ─────────────────────────────── */}
            <SectionHeader
              icon={<Domain />}
              title="Hospital Information"
              description="The facility's name and category"
              tone="primary"
            />
            <Grid item xs={12} sm={editingHospital ? 6 : 8}>
              <TextField fullWidth size="small" label="Hospital Name" required
                value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)}
                error={!!fieldErrors.name} helperText={fieldErrors.name}
                inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" select label="Type" value={formData.type}
                onChange={(e) => handleFieldChange('type', e.target.value)} SelectProps={{ native: true }}>
                {['HOSPITAL', 'CLINIC', 'NURSING_HOME', 'DIAGNOSTIC_CENTER', 'POLYCLINIC', 'SPECIALTY_CENTER', 'MULTI_SPECIALTY', 'SUPER_SPECIALTY'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </TextField>
            </Grid>
            {editingHospital && (
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" label="Code" value={editingHospital.code}
                  disabled InputProps={{ readOnly: true }}
                  helperText="System-generated" />
              </Grid>
            )}

            {/* ── 2. Primary Hospital Admin ──────────────────────────── */}
            <SectionHeader
              icon={<AdminPanelSettings />}
              title="Primary Hospital Admin"
              description="Owner identity — single login that doubles as the hospital's primary contact"
              tone="warning"
              badge={
                <Chip
                  size="small"
                  label={editingHospital ? 'Editable' : 'Required'}
                  color={editingHospital ? 'default' : 'warning'}
                  sx={{ height: 22, fontWeight: 600 }}
                />
              }
            />
            <Grid item xs={12}>
              <Alert severity={editingHospital ? 'info' : 'warning'} icon={<AdminPanelSettings />} sx={{ borderRadius: 2 }}>
                {editingHospital ? (
                  <>
                    This hospital's owner / primary admin. Editing here updates the linked user's profile.
                    Leave password blank to keep the existing one.
                  </>
                ) : (
                  <>
                    The hospital's owner. We create a single ADMIN user with these
                    credentials — they're how the hospital will sign in. The email
                    below is used for both the hospital record and this admin.
                  </>
                )}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="First Name" required={!editingHospital}
                value={formData.adminFirstName} onChange={(e) => handleFieldChange('adminFirstName', e.target.value)}
                error={!!fieldErrors.adminFirstName} helperText={fieldErrors.adminFirstName}
                inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Last Name" required={!editingHospital}
                value={formData.adminLastName} onChange={(e) => handleFieldChange('adminLastName', e.target.value)}
                error={!!fieldErrors.adminLastName} helperText={fieldErrors.adminLastName}
                inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Email" type="email" required
                value={formData.email} onChange={(e) => handleFieldChange('email', e.target.value)}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email || 'Used for both the hospital record and admin login'} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Mobile" required={!editingHospital}
                value={formData.adminPhone} onChange={(e) => handleFieldChange('adminPhone', e.target.value)}
                error={!!fieldErrors.adminPhone}
                helperText={fieldErrors.adminPhone || 'Admin\'s personal mobile (10-digit Indian)'}
                inputProps={{ maxLength: 10 }} placeholder="9876543210" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Username" required={!editingHospital}
                value={formData.adminUsername} onChange={(e) => handleFieldChange('adminUsername', e.target.value)}
                error={!!fieldErrors.adminUsername}
                helperText={fieldErrors.adminUsername || 'Letters, numbers, and underscores only (3-50 chars)'}
                inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Password"
                type={showAdminPassword ? 'text' : 'password'}
                required={!editingHospital}
                value={formData.adminPassword} onChange={(e) => handleFieldChange('adminPassword', e.target.value)}
                error={!!fieldErrors.adminPassword}
                helperText={fieldErrors.adminPassword || (editingHospital ? 'Leave blank to keep existing password' : 'At least 8 characters')}
                inputProps={{ maxLength: 128 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowAdminPassword(!showAdminPassword)} edge="end">
                        {showAdminPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />
            </Grid>
            {editingHospital?.primaryAdmin && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ borderRadius: 2, fontSize: 13 }} icon={<CheckCircle />}>
                  Admin user verified — <strong>{editingHospital.primaryAdmin.firstName} {editingHospital.primaryAdmin.lastName}</strong> ({editingHospital.primaryAdmin.email}, @{editingHospital.primaryAdmin.username})
                  {editingHospital.primaryAdmin.isActive ? '' : ' — currently inactive'}
                </Alert>
              </Grid>
            )}
            {editingHospital && !editingHospital.primaryAdmin && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  No primary admin user is linked to this hospital. Create one from User Management or contact support.
                </Alert>
              </Grid>
            )}

            {/* ── 3. Hospital Contact (front desk / general line) ───── */}
            <SectionHeader
              icon={<ContactPhone />}
              title="Hospital Contact"
              description="Front-desk / reception lines that appear in patient-facing places"
              tone="info"
            />
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Reception Phone" required
                value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone || 'Front-desk / general line (10-digit Indian)'}
                inputProps={{ maxLength: 10 }} placeholder="9876543210" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Alternate Phone"
                value={formData.alternatePhone} onChange={(e) => handleFieldChange('alternatePhone', e.target.value)}
                error={!!fieldErrors.alternatePhone} helperText={fieldErrors.alternatePhone}
                inputProps={{ maxLength: 10 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Website" placeholder="https://example.com"
                value={formData.website} onChange={(e) => handleFieldChange('website', e.target.value)}
                error={!!fieldErrors.website} helperText={fieldErrors.website} />
            </Grid>

            {/* ── 4. Address ──────────────────────────────────────────── */}
            <SectionHeader
              icon={<LocationOn />}
              title="Address"
              description="Physical location of the facility"
              tone="primary"
            />
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Address Line 1" required
                value={formData.addressLine1} onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                error={!!fieldErrors.addressLine1} helperText={fieldErrors.addressLine1}
                inputProps={{ maxLength: 500 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Address Line 2"
                value={formData.addressLine2} onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
                error={!!fieldErrors.addressLine2} helperText={fieldErrors.addressLine2}
                inputProps={{ maxLength: 500 }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="City" required
                value={formData.city} onChange={(e) => handleFieldChange('city', e.target.value)}
                error={!!fieldErrors.city} helperText={fieldErrors.city}
                inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="State" required
                value={formData.state} onChange={(e) => handleFieldChange('state', e.target.value)}
                error={!!fieldErrors.state} helperText={fieldErrors.state}
                inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="Pincode" required
                value={formData.pincode} onChange={(e) => handleFieldChange('pincode', e.target.value)}
                error={!!fieldErrors.pincode} helperText={fieldErrors.pincode}
                inputProps={{ maxLength: 6 }} placeholder="110001" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="Landmark"
                value={formData.landmark} onChange={(e) => handleFieldChange('landmark', e.target.value)}
                error={!!fieldErrors.landmark} helperText={fieldErrors.landmark}
                inputProps={{ maxLength: 200 }} />
            </Grid>

            {/* ── 5. Legal & Registration (optional) ──────────────────── */}
            <SectionHeader
              icon={<Gavel />}
              title="Legal & Registration"
              description="Statutory registrations — useful for invoicing and audits"
              tone="secondary"
              badge={<Chip size="small" label="Optional" sx={{ height: 22 }} />}
            />
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Registration Number"
                value={formData.registrationNumber} onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
                error={!!fieldErrors.registrationNumber} helperText={fieldErrors.registrationNumber}
                inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="License Number"
                value={formData.licenseNumber} onChange={(e) => handleFieldChange('licenseNumber', e.target.value)}
                error={!!fieldErrors.licenseNumber} helperText={fieldErrors.licenseNumber}
                inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Established Year" type="number"
                value={formData.establishedYear} onChange={(e) => handleFieldChange('establishedYear', e.target.value)}
                error={!!fieldErrors.establishedYear} helperText={fieldErrors.establishedYear}
                placeholder={`e.g. ${new Date().getFullYear() - 10}`}
                inputProps={{ min: 1800, max: new Date().getFullYear() }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="GST Number" placeholder="22AAAAA0000A1Z5"
                value={formData.gstNumber} onChange={(e) => handleFieldChange('gstNumber', e.target.value.toUpperCase())}
                error={!!fieldErrors.gstNumber} helperText={fieldErrors.gstNumber}
                inputProps={{ maxLength: 15, style: { textTransform: 'uppercase' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="PAN Number" placeholder="ABCDE1234F"
                value={formData.panNumber} onChange={(e) => handleFieldChange('panNumber', e.target.value.toUpperCase())}
                error={!!fieldErrors.panNumber} helperText={fieldErrors.panNumber}
                inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
            </Grid>

            {/* ── 6. Facility Capacity (optional) ─────────────────────── */}
            <SectionHeader
              icon={<KingBed />}
              title="Facility Capacity"
              description="Bed and OT counts — drives admission and resource planning"
              tone="info"
              badge={<Chip size="small" label="Optional" sx={{ height: 22 }} />}
            />
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="number" label="Total Beds"
                value={formData.totalBeds} onChange={(e) => handleFieldChange('totalBeds', e.target.value)}
                error={!!fieldErrors.totalBeds} helperText={fieldErrors.totalBeds}
                inputProps={{ min: 0, max: 10000 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="number" label="ICU Beds"
                value={formData.icuBeds} onChange={(e) => handleFieldChange('icuBeds', e.target.value)}
                error={!!fieldErrors.icuBeds} helperText={fieldErrors.icuBeds}
                inputProps={{ min: 0, max: 10000 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="number" label="Emergency Beds"
                value={formData.emergencyBeds} onChange={(e) => handleFieldChange('emergencyBeds', e.target.value)}
                error={!!fieldErrors.emergencyBeds} helperText={fieldErrors.emergencyBeds}
                inputProps={{ min: 0, max: 10000 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="number" label="Operation Theaters"
                value={formData.operationTheaters} onChange={(e) => handleFieldChange('operationTheaters', e.target.value)}
                error={!!fieldErrors.operationTheaters} helperText={fieldErrors.operationTheaters}
                inputProps={{ min: 0, max: 1000 }} />
            </Grid>

            {/* ── 7. Subscription & Pricing ───────────────────────────── */}
            <SectionHeader
              icon={<CreditCard />}
              title="Subscription & Pricing"
              description="Plan tier and the default OPD fee fallback"
              tone="success"
            />
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Plan" value={formData.plan}
                onChange={(e) => handleFieldChange('plan', e.target.value)} SelectProps={{ native: true }}>
                <option value="FREE">Free (14-day trial)</option>
                <option value="BASIC">Basic — ₹2,999/month</option>
                <option value="PROFESSIONAL">Professional — ₹9,999/month</option>
                <option value="ENTERPRISE">Enterprise — Custom pricing</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Default OPD Fee (₹)" type="number" placeholder="e.g. 300"
                helperText={fieldErrors.defaultOpdCharge || 'Fallback when doctor has no individual fee'}
                error={!!fieldErrors.defaultOpdCharge}
                value={formData.defaultOpdCharge} onChange={(e) => handleFieldChange('defaultOpdCharge', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, max: 100000, step: 10 }} />
            </Grid>

            {/* ── 8. ABDM Integration (per-facility) ──────────────────── */}
            <SectionHeader
              icon={<HealthAndSafety />}
              title="ABDM Integration"
              description="Per-facility identifiers from ABDM's Health Facility Registry"
              tone="success"
              badge={
                editingHospital?.abdmEnabled
                  ? <Chip size="small" color="success" label="Active" sx={{ height: 22, fontWeight: 600 }} />
                  : <Chip size="small" label="Optional" sx={{ height: 22 }} />
              }
            />
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }} icon={<HealthAndSafety />}>
                <strong>Per ABDM:</strong> HFR / HIP / HIU IDs are <strong>per-facility</strong> identifiers
                issued by ABDM's Health Facility Registry (NHA). HPR IDs belong on individual <em>doctors</em>,
                not the hospital. ABDM <em>client_id</em> / <em>client_secret</em> / <em>callback URL</em>
                are platform-level and configured at the system level (env), not per hospital.
                <br />
                <strong>Multi-tenant:</strong> when you save, this facility's HIP / HIU IDs are auto-registered
                with the platform's ABDM bridge so they become the unit of consent and the unit of data
                fulfillment. Without these IDs the hospital cannot link care contexts to ABDM, request
                consent, or fetch records — every HIP / HIU operation will be rejected.
              </Alert>
            </Grid>
            {editingHospital?.abdmEnabled && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<HealthAndSafety />} sx={{ borderRadius: 2 }}>
                  This hospital is registered with ABDM. HIP ID: <strong>{editingHospital.hipId}</strong>
                </Alert>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="HFR Facility ID" placeholder="e.g. IN3410000260"
                value={formData.hfrFacilityId} onChange={(e) => handleFieldChange('hfrFacilityId', e.target.value)}
                error={!!fieldErrors.hfrFacilityId}
                helperText={fieldErrors.hfrFacilityId || 'Canonical Health Facility Registry ID — IN + 10 digits'}
                inputProps={{ maxLength: 20 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="HIP ID" placeholder="e.g. IN3410000260 or IN3410000260_1"
                value={formData.hipId} onChange={(e) => handleFieldChange('hipId', e.target.value)}
                error={!!fieldErrors.hipId}
                helperText={fieldErrors.hipId || 'Health Information Provider — typically equal to HFR ID'}
                inputProps={{ maxLength: 30 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="HIP Display Name"
                placeholder="Defaults to hospital name"
                value={formData.hipName} onChange={(e) => handleFieldChange('hipName', e.target.value)}
                error={!!fieldErrors.hipName}
                helperText={fieldErrors.hipName || 'Patient-facing facility name shown in the ABHA app'}
                inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="HIU ID" placeholder="e.g. IN3410000260"
                value={formData.hiuId} onChange={(e) => handleFieldChange('hiuId', e.target.value)}
                error={!!fieldErrors.hiuId}
                helperText={fieldErrors.hiuId || 'Health Information User ID from ABDM/NHA'}
                inputProps={{ maxLength: 40 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="HIU Display Name"
                placeholder="Defaults to hospital name"
                value={formData.hiuName} onChange={(e) => handleFieldChange('hiuName', e.target.value)}
                error={!!fieldErrors.hiuName}
                helperText={fieldErrors.hiuName}
                inputProps={{ maxLength: 200 }} />
            </Grid>

            {editingHospital && formData.hipId && !editingHospital.abdmEnabled && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Save the HIP ID first, then click "Register with ABDM" from the hospital list to activate ABDM integration.
                </Alert>
              </Grid>
            )}
            {!editingHospital && !formData.hipId && !formData.hiuId && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  <strong>No ABDM IDs set:</strong> this hospital will be onboarded but will <em>not</em> be
                  able to participate in ABDM consent, linking, or data flows. Add the HFR / HIP / HIU IDs
                  to enable ABDM. You can always edit them later.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3, py: 2,
            bgcolor: alpha(theme.palette.background.default, 0.7),
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex', justifyContent: 'space-between', gap: 2,
          }}
        >
          {/* Live error count — gives a glanceable signal of "what's blocking save". */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {Object.keys(fieldErrors).length > 0 ? (
              <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                {Object.keys(fieldErrors).length} field{Object.keys(fieldErrors).length === 1 ? '' : 's'} need attention
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                Ready to save
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.25}>
            <Button onClick={handleCloseDialog} sx={{ borderRadius: 2, px: 2.5 }} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit} variant="contained" disabled={submitting}
              sx={{
                borderRadius: 2, px: 3.5, fontWeight: 600,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.32)}`,
                '&:hover': { boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.42)}` },
              }}
              startIcon={
                submitting
                  ? <CircularProgress size={16} color="inherit" />
                  : (editingHospital ? <Save fontSize="small" /> : <Add fontSize="small" />)
              }
            >
              {submitting ? 'Saving…' : (editingHospital ? 'Save Changes' : 'Create Hospital')}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── Schedule Configuration Dialog ────────────────────────────────── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>Schedule — {scheduleHospital?.name}</Typography>
            <IconButton onClick={() => setScheduleOpen(false)}><Clear /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {scheduleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <FormControlLabel
                    control={<Switch checked={scheduleData.is24x7} onChange={e => setScheduleData(p => ({ ...p, is24x7: e.target.checked }))} />}
                    label="24/7 Hospital"
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Default Slot Duration</InputLabel>
                    <Select value={scheduleData.defaultSlotDuration} label="Default Slot Duration"
                      onChange={e => setScheduleData(p => ({ ...p, defaultSlotDuration: Number(e.target.value) }))}>
                      {[10, 15, 20, 30, 45, 60].map(m => <MenuItem key={m} value={m}>{m} minutes</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              {!scheduleData.is24x7 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Operating Hours</Typography>
                  </Grid>
                  {DAYS.map(day => {
                    const hours = scheduleData.operatingHours[day];
                    const isClosed = !hours;
                    return (
                      <Grid item xs={12} key={day}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography sx={{ width: 90, fontWeight: 500 }}>{DAY_LABELS[day]}</Typography>
                          <FormControlLabel
                            control={<Switch size="small" checked={!isClosed} onChange={() => toggleDayClosed(day)} />}
                            label={isClosed ? 'Closed' : 'Open'}
                            sx={{ width: 100 }}
                          />
                          {!isClosed && (
                            <>
                              <TextField size="small" type="time" label="Start" value={hours?.start || '09:00'}
                                onChange={e => updateDayHours(day, 'start', e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                              <Typography>to</Typography>
                              <TextField size="small" type="time" label="End" value={hours?.end || '21:00'}
                                onChange={e => updateDayHours(day, 'end', e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                            </>
                          )}
                        </Stack>
                      </Grid>
                    );
                  })}
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Break Times</Typography>
                {scheduleData.breakTimes.map((b, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField size="small" type="time" value={b.start} label="Start" InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], start: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" type="time" value={b.end} label="End" InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], end: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <TextField size="small" value={b.label} label="Label" placeholder="e.g. Lunch" sx={{ width: 150 }}
                      onChange={e => { const bt = [...scheduleData.breakTimes]; bt[i] = { ...bt[i], label: e.target.value }; setScheduleData(p => ({ ...p, breakTimes: bt })); }} />
                    <IconButton size="small" color="error" onClick={() => setScheduleData(p => ({ ...p, breakTimes: p.breakTimes.filter((_, idx) => idx !== i) }))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setScheduleData(p => ({ ...p, breakTimes: [...p.breakTimes, { start: '13:00', end: '14:00', label: 'Lunch' }] }))} sx={{ mt: 1 }}>
                  + Add Break
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Holidays</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  {scheduleData.holidays.map((h, i) => (
                    <Chip key={i} label={h} size="small" onDelete={() => setScheduleData(p => ({ ...p, holidays: p.holidays.filter((_, idx) => idx !== i) }))} />
                  ))}
                </Stack>
                <TextField size="small" type="date" label="Add Holiday" InputLabelProps={{ shrink: true }} sx={{ mt: 1, width: 200 }}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !scheduleData.holidays.includes(val))
                      setScheduleData(p => ({ ...p, holidays: [...p.holidays, val].sort() }));
                    e.target.value = '';
                  }} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setScheduleOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSaveSchedule} variant="contained" disabled={scheduleLoading}
            startIcon={scheduleLoading ? <CircularProgress size={16} /> : <Save />} sx={{ borderRadius: 2, px: 3 }}>
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalManagement;
