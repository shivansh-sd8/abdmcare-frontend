import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  Alert,
  Collapse,
} from '@mui/material';
import {
  PersonAdd,
  Phone,
  Email,
  Home,
  LocalHospital,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  Search,
  CalendarToday,
  AccessTime,
  Description,
  EventAvailable,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import patientService from '../../services/patientService';
import { PageHeader } from '../../components/ui';
import abhaService from '../../services/abhaService';
import appointmentService from '../../services/appointmentService';
import doctorService from '../../services/doctorService';
import {
  validate,
  validationPatterns,
  validateMobile,
  validateEmail,
  validatePincode,
  validateAge,
} from '../../utils/validation';

const ALL_STEPS = ['Basic Information', 'Contact & Address', 'ABHA Linking', 'Appointment'];
const EDIT_STEPS = ['Basic Information', 'Contact & Address', 'ABHA Linking'];

const appointmentTypes = [
  { value: 'OPD',              label: 'OPD — General Consultation' },
  { value: 'FOLLOW_UP',        label: 'Follow-up Visit' },
  { value: 'EMERGENCY',        label: 'Emergency' },
  { value: 'ROUTINE_CHECKUP',  label: 'Routine Health Checkup' },
  { value: 'DIAGNOSTIC',       label: 'Diagnostic Tests' },
  { value: 'VACCINATION',      label: 'Vaccination' },
  { value: 'TELECONSULTATION', label: 'Tele-Consultation' },
];

const FALLBACK_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00',
];

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const abhaData = (location.state as any)?.abhaData;
  const editPatient = (location.state as any)?.editPatient;
  const isEditMode = !!editPatient;
  const steps = isEditMode ? EDIT_STEPS : ALL_STEPS;
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Patient form ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: '', lastName: '',
    gender: '', dob: '', mobile: '', email: '', bloodGroup: '',
    address:          { line1: '', line2: '', city: '', state: '', pincode: '' },
    emergencyContact: { name: '', relationship: '', mobile: '' },
    abhaNumber: '',
    abhaAddress: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [abhaLinked, setAbhaLinked] = useState(false);

  // Pre-populate from ABHA data if navigating from ABHA creation/verification
  const populateFromAbha = (data: any) => {
    if (!data) return;

    const genderMap: Record<string, string> = {
      M: 'MALE', F: 'FEMALE', O: 'OTHER',
      MALE: 'MALE', FEMALE: 'FEMALE', OTHER: 'OTHER',
    };

    // Parse name — ABDM may return split or combined
    const nameParts = data.name?.split(' ').filter(Boolean) || [];
    const firstName = [data.firstName, data.middleName].filter(Boolean).join(' ')
      || nameParts.slice(0, -1).join(' ')
      || nameParts[0]
      || '';
    const lastName = data.lastName
      || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '')
      || '';

    // Parse DOB — ABDM V3 returns day/month/year separately or dob as string
    let dob = '';
    if (data.yearOfBirth) {
      const y = data.yearOfBirth;
      const m = String(data.monthOfBirth || '01').padStart(2, '0');
      const d = String(data.dayOfBirth || '01').padStart(2, '0');
      dob = `${y}-${m}-${d}`;
    } else if (data.dob) {
      // Could be DD-MM-YYYY or YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(data.dob)) {
        const [dd, mm, yyyy] = data.dob.split('-');
        dob = `${yyyy}-${mm}-${dd}`;
      } else {
        dob = data.dob;
      }
    } else if (data.dateOfBirth) {
      dob = data.dateOfBirth;
    }

    // Build address from all available ABDM fields
    const addrParts = [
      data.address || data.addressLine || '',
      data.villageOrTownName || data.townName || data.villageName || '',
      data.subdistrictName || data.subDistrictName || '',
    ].filter(Boolean);
    const line1 = addrParts.join(', ');

    setFormData(prev => ({
      ...prev,
      firstName,
      lastName,
      gender: genderMap[data.gender?.toUpperCase()] || data.gender || '',
      dob,
      mobile: data.mobile || data.phoneNumber || '',
      email: data.email || data.emailId || '',
      bloodGroup: data.bloodGroup || '',
      address: {
        line1,
        line2: prev.address.line2,
        city: data.districtName || data.district || data.city || '',
        state: data.stateName || data.state || '',
        pincode: data.pincode || data.pinCode || '',
      },
      emergencyContact: prev.emergencyContact,
      abhaNumber: data.ABHANumber || data.abhaNumber || data.healthIdNumber || '',
      // ABHA address (name@sbx) is REQUIRED for ABDM M2 care-context linking and
      // M3 consent. Without it, linked care contexts never reach the CM and the
      // patient sees "no facility available to share health records" at consent.
      abhaAddress:
        data.preferredAbhaAddress ||
        data.phrAddress?.[0] ||
        data.abhaAddress ||
        prev.abhaAddress ||
        '',
    }));
    setAbhaLinked(true);
  };

  useEffect(() => {
    if (abhaData) populateFromAbha(abhaData);
    if (editPatient) {
      const addr = typeof editPatient.address === 'object' && editPatient.address
        ? editPatient.address
        : {};
      const ec = typeof editPatient.emergencyContact === 'object' && editPatient.emergencyContact
        ? editPatient.emergencyContact
        : {};
      setFormData({
        firstName: editPatient.firstName || '',
        lastName: editPatient.lastName || '',
        gender: editPatient.gender || '',
        dob: editPatient.dob ? new Date(editPatient.dob).toISOString().split('T')[0] : '',
        mobile: editPatient.mobile || '',
        email: editPatient.email || '',
        bloodGroup: editPatient.bloodGroup || '',
        address: {
          line1: addr.line1 || addr.line || addr.addressLine || '',
          line2: addr.line2 || '',
          city: addr.city || addr.district || '',
          state: addr.state || '',
          pincode: addr.pincode || addr.pinCode || '',
        },
        emergencyContact: {
          name: ec.name || '',
          relationship: ec.relationship || '',
          mobile: ec.mobile || '',
        },
        abhaNumber: editPatient.abhaNumber || editPatient.abhaRecord?.abhaNumber || '',
        abhaAddress: editPatient.abhaAddress || editPatient.abhaRecord?.abhaAddress || '',
      });
      if (editPatient.abhaNumber || editPatient.abhaRecord?.abhaNumber) {
        setAbhaLinked(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Appointment form ──────────────────────────────────────────────────────
  const [scheduleAppt, setScheduleAppt] = useState(true); // checkbox default ON
  const [apptData, setApptData] = useState({
    doctorId: '',
    date:     new Date().toISOString().split('T')[0],
    time:     '10:00',
    type:     'OPD',
    reason:   '',
    notes:    '',
  });
  const [apptErrors, setApptErrors] = useState<Record<string, string>>({});
  const [allDoctors, setAllDoctors]         = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [specFilter, setSpecFilter]         = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [dynamicSlots, setDynamicSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);

  const specializations = useMemo(() => {
    const s = new Set<string>(allDoctors.map(d => d.specialization).filter(Boolean));
    return Array.from(s).sort();
  }, [allDoctors]);

  const filteredDoctors = useMemo(() =>
    specFilter ? allDoctors.filter(d => d.specialization === specFilter) : allDoctors,
  [allDoctors, specFilter]);

  // Load doctors when we reach the appointment step
  useEffect(() => {
    if (activeStep === 3 && allDoctors.length === 0) {
      setLoadingDoctors(true);
      doctorService.searchDoctors({})
        .then((res: any) => setAllDoctors(res.data?.data ?? res.data ?? []))
        .catch(() => toast.error('Failed to load doctors'))
        .finally(() => setLoadingDoctors(false));
    }
  }, [activeStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Patient handlers ──────────────────────────────────────────────────────
  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validateField = (field: string) => {
    const value = field.includes('.')
      ? field.split('.').reduce((obj: any, k) => obj?.[k], formData)
      : (formData as any)[field];
    let error: string | undefined;
    switch (field) {
      case 'firstName': case 'lastName': {
        const nr = validate(value, { required: true, pattern: validationPatterns.name,
          message: field === 'firstName' ? 'First name is required' : 'Last name is required' });
        if (!nr.isValid) error = nr.error;
        break;
      }
      case 'mobile':        { const r = validateMobile(value);   if (!r.isValid) error = r.error; break; }
      case 'email':         { const r = validateEmail(value);    if (!r.isValid) error = r.error; break; }
      case 'dob':           { const r = validateAge(value);      if (!r.isValid) error = r.error; break; }
      case 'gender':        { const r = validate(value, { required: true, message: 'Gender is required' }); if (!r.isValid) error = r.error; break; }
      case 'address.pincode': if (value) { const r = validatePincode(value); if (!r.isValid) error = r.error; } break;
      case 'emergencyContact.mobile': if (value) { const r = validateMobile(value); if (!r.isValid) error = r.error; } break;
    }
    if (error) setErrors(prev => ({ ...prev, [field]: error! }));
    else setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const errs: Record<string, string> = {};
      if (!formData.firstName.trim()) errs.firstName = 'First name is required';
      if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
      if (!formData.gender) errs.gender = 'Gender is required';
      if (!formData.dob) errs.dob = 'Date of birth is required';
      else { const a = validateAge(formData.dob); if (!a.isValid) errs.dob = a.error!; }
      if (Object.keys(errs).length > 0) { setErrors(prev => ({ ...prev, ...errs })); toast.error('Please fix all required fields'); return; }
    }
    if (activeStep === 1) {
      if (!formData.mobile) { setErrors(prev => ({ ...prev, mobile: 'Mobile number is required' })); toast.error('Mobile number is required'); return; }
      const m = validateMobile(formData.mobile);
      if (!m.isValid) { setErrors(prev => ({ ...prev, mobile: m.error! })); toast.error('Please enter a valid mobile number'); return; }
    }
    setActiveStep(prev => prev + 1);
  };

  const searchAbha = async () => {
    if (!formData.abhaNumber) { toast.error('Please enter ABHA number'); return; }
    try {
      setLoading(true);
      const response: any = await abhaService.loginSearch(formData.abhaNumber.replace(/-/g, ''));
      const data = response?.data?.data || response?.data || response;
      if (data) {
        populateFromAbha(data);
        toast.success('ABHA found! Details auto-filled.');
      }
    } catch { toast.error('ABHA not found'); }
    finally { setLoading(false); }
  };

  // ── Appointment validation ────────────────────────────────────────────────
  const validateApptField = (field: string) => {
    const value = (apptData as any)[field];
    let error: string | undefined;
    if (field === 'doctorId'  && !value) error = 'Please select a doctor';
    if (field === 'date'      && !value) error = 'Appointment date is required';
    if (field === 'time'      && !value) error = 'Please select a time slot';
    if (field === 'reason'    && (!value || value.trim().length < 5)) error = 'Reason must be at least 5 characters';
    if (error) setApptErrors(prev => ({ ...prev, [field]: error! }));
    else setApptErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const apptIsValid = () => {
    if (!scheduleAppt) return true;
    const errs: Record<string, string> = {};
    if (!apptData.doctorId)                    errs.doctorId = 'Please select a doctor';
    if (!apptData.date)                        errs.date     = 'Date is required';
    else {
      const selDate = new Date(apptData.date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (selDate < today) errs.date = 'Date cannot be in the past';
    }
    if (!apptData.time)                        errs.time     = 'Time is required';
    else if (dynamicSlots.length > 0 && !dynamicSlots.includes(apptData.time))
      errs.time = 'Selected slot is no longer available';
    if (!apptData.reason || apptData.reason.trim().length < 5) errs.reason = 'Reason must be at least 5 characters';
    setApptErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
  const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSubmit = async () => {
    if (loading) return;

    const patientErrs: Record<string, string> = {};

    // Required: firstName
    if (!formData.firstName.trim()) patientErrs.firstName = 'First name is required';

    // Required: lastName
    if (!formData.lastName.trim()) patientErrs.lastName = 'Last name is required';

    // Required: gender — must be in enum
    if (!formData.gender || !VALID_GENDERS.includes(formData.gender))
      patientErrs.gender = 'Please select a valid gender';

    // Required: dob — must be valid date, not in the future
    if (!formData.dob) patientErrs.dob = 'Date of birth is required';
    else {
      const dobDate = new Date(formData.dob);
      if (isNaN(dobDate.getTime())) patientErrs.dob = 'Invalid date format';
      else if (dobDate > new Date()) patientErrs.dob = 'Date of birth cannot be in the future';
    }

    // Required: mobile — Indian mobile format
    if (!formData.mobile) patientErrs.mobile = 'Mobile number is required';
    else { const m = validateMobile(formData.mobile); if (!m.isValid) patientErrs.mobile = m.error!; }

    // Optional: email — if provided must be valid
    if (formData.email) { const e = validateEmail(formData.email); if (!e.isValid) patientErrs.email = e.error!; }

    // Optional: bloodGroup — if provided must be in enum
    if (formData.bloodGroup && !VALID_BLOOD_GROUPS.includes(formData.bloodGroup))
      patientErrs.bloodGroup = 'Invalid blood group';

    // Optional: pincode — if provided must be 6 digits
    if (formData.address.pincode) { const p = validatePincode(formData.address.pincode); if (!p.isValid) patientErrs['address.pincode'] = p.error!; }

    if (Object.keys(patientErrs).length > 0) {
      setErrors(patientErrs);
      toast.error('Please fix patient information errors');
      const firstErrField = Object.keys(patientErrs)[0];
      if (['firstName', 'lastName', 'gender', 'dob', 'bloodGroup'].includes(firstErrField)) setActiveStep(0);
      else if (['mobile', 'email', 'address.pincode'].includes(firstErrField)) setActiveStep(1);
      return;
    }
    if (!isEditMode && !apptIsValid()) { toast.error('Please fix appointment fields'); setActiveStep(3); return; }
    try {
      setLoading(true);

      const patientPayload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dob: formData.dob,
        mobile: formData.mobile,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
      };
      if (formData.email?.trim())      patientPayload.email = formData.email.trim();
      if (formData.bloodGroup)         patientPayload.bloodGroup = formData.bloodGroup;
      // Persist BOTH the 14-digit ABHA number and the ABHA address. The backend
      // stores abhaNumber/abhaAddress separately; sending only abhaId left
      // patient.abhaNumber empty and the patient un-linkable to ABDM.
      if (formData.abhaNumber?.trim()) {
        const digits = formData.abhaNumber.replace(/-/g, '');
        patientPayload.abhaId = digits;
        patientPayload.abhaNumber = formData.abhaNumber.trim();
      }
      if (formData.abhaAddress?.trim()) patientPayload.abhaAddress = formData.abhaAddress.trim();

      if (isEditMode) {
        await patientService.updatePatient(editPatient.id, patientPayload);
        toast.success('Patient updated successfully!');
        navigate(`/app/patients/${editPatient.id}`);
      } else {
        const patientRes: any = await patientService.createPatient(patientPayload);
        const newPatientId: string = patientRes.data?.data?.id ?? patientRes.data?.id ?? patientRes.data?.data?.data?.id;

        if (scheduleAppt && newPatientId) {
          try {
            await appointmentService.createAppointment({
              patientId: newPatientId,
              doctorId:  apptData.doctorId,
              date:      apptData.date,
              time:      apptData.time,
              type:      apptData.type,
              reason:    apptData.reason,
              notes:     apptData.notes,
            });
            toast.success('Patient registered & appointment scheduled!');
            navigate('/app/appointments');
          } catch (apptErr: any) {
            const msg = apptErr.response?.data?.message || 'Failed to schedule appointment';
            toast.warning(`Patient registered successfully, but appointment failed: ${msg}. You can schedule from the Appointments page.`);
            navigate('/app/patients');
          }
        } else {
          toast.success('Patient registered successfully!');
          navigate('/app/patients');
        }
      }
    } catch (error: any) {
      const res = error.response?.data;
      const fieldErrors = res?.errors || res?.error;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        const stepFields: Record<string, number> = {
          firstName: 0, lastName: 0, gender: 0, dob: 0, bloodGroup: 0,
          mobile: 1, email: 1, 'address.pincode': 1,
        };
        let firstStep = activeStep;
        fieldErrors.forEach((e: any) => {
          const field = e.field || e.path || 'unknown';
          mapped[field] = e.message || e.msg || 'Invalid value';
          if (stepFields[field] !== undefined && stepFields[field] < firstStep) {
            firstStep = stepFields[field];
          }
        });
        setErrors(mapped);
        setActiveStep(firstStep);
        const messages = fieldErrors.map((e: any) => e.message || e.msg).filter(Boolean);
        toast.error(messages.join(', ') || 'Validation failed');
      } else {
        toast.error(res?.message || (isEditMode ? 'Failed to update patient' : 'Failed to register patient'));
      }
    } finally {
      setLoading(false);
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];

  // Fetch available slots from API when doctor + date are selected
  useEffect(() => {
    if (!apptData.doctorId || !apptData.date) {
      setDynamicSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    appointmentService.getAvailableSlots(apptData.doctorId, apptData.date)
      .then((res: any) => {
        if (cancelled) return;
        const data = res.data || res;
        setDynamicSlots(data.slots || []);
        if (data.slotDuration) setSlotDuration(data.slotDuration);
      })
      .catch(() => {
        if (cancelled) return;
        const now = new Date();
        const cm = now.getHours() * 60 + now.getMinutes();
        const fb = apptData.date === todayDate
          ? FALLBACK_SLOTS.filter(s => { const [h, m] = s.split(':').map(Number); return h * 60 + m > cm; })
          : FALLBACK_SLOTS;
        setDynamicSlots(fb);
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [apptData.doctorId, apptData.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (apptData.time && dynamicSlots.length > 0 && !dynamicSlots.includes(apptData.time)) {
      setApptData(p => ({ ...p, time: dynamicSlots[0] || '' }));
    }
  }, [dynamicSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <PageHeader
        title={isEditMode ? 'Edit Patient' : 'New Patient Registration'}
        subtitle={isEditMode ? 'Update patient information' : 'Register a new patient and optionally schedule an appointment'}
        icon={<PersonAdd />}
      />

      <Stepper activeStep={activeStep} sx={{
        mb: 4,
        '& .MuiStepLabel-root .Mui-completed': { color: '#667eea' },
        '& .MuiStepLabel-root .Mui-active':    { color: '#667eea' },
      }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>

          {abhaData && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Patient details pre-filled from ABHA profile ({abhaData.ABHANumber || abhaData.abhaNumber}). Review and complete registration.
            </Alert>
          )}

          {/* ── Step 0: Basic Info ──────────────────────────────────────── */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <LocalHospital /> Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="First Name" required value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  onBlur={() => validateField('firstName')} error={!!errors.firstName} helperText={errors.firstName} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Last Name" required value={formData.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  onBlur={() => validateField('lastName')} error={!!errors.lastName} helperText={errors.lastName} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Gender" required value={formData.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  onBlur={() => validateField('gender')} error={!!errors.gender} helperText={errors.gender}>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} required
                  value={formData.dob} onChange={e => handleChange('dob', e.target.value)}
                  onBlur={() => validateField('dob')} error={!!errors.dob} helperText={errors.dob}
                  inputProps={{ max: todayDate }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Blood Group" value={formData.bloodGroup}
                  onChange={e => handleChange('bloodGroup', e.target.value)}>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <MenuItem key={bg} value={bg}>{bg}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          )}

          {/* ── Step 1: Contact & Address ───────────────────────────────── */}
          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <Phone /> Contact & Address Details
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Mobile Number" required value={formData.mobile}
                  onChange={e => handleChange('mobile', e.target.value)}
                  onBlur={() => validateField('mobile')} error={!!errors.mobile}
                  helperText={errors.mobile || 'Enter 10-digit mobile'}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Phone /></InputAdornment> }}
                  inputProps={{ maxLength: 10 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Email" type="email" value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => validateField('email')} error={!!errors.email}
                  helperText={errors.email || 'Optional'}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address Line 1" value={formData.address.line1}
                  onChange={e => handleChange('address.line1', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Home /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address Line 2" value={formData.address.line2}
                  onChange={e => handleChange('address.line2', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="City" value={formData.address.city}
                  onChange={e => handleChange('address.city', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="State" value={formData.address.state}
                  onChange={e => handleChange('address.state', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Pincode" value={formData.address.pincode}
                  onChange={e => handleChange('address.pincode', e.target.value)}
                  onBlur={() => validateField('address.pincode')}
                  error={!!errors['address.pincode']}
                  helperText={errors['address.pincode']}
                  inputProps={{ maxLength: 6 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>Emergency Contact</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Contact Name" value={formData.emergencyContact.name}
                  onChange={e => handleChange('emergencyContact.name', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Relationship" value={formData.emergencyContact.relationship}
                  onChange={e => handleChange('emergencyContact.relationship', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Contact Mobile" value={formData.emergencyContact.mobile}
                  onChange={e => handleChange('emergencyContact.mobile', e.target.value)}
                  onBlur={() => validateField('emergencyContact.mobile')}
                  error={!!errors['emergencyContact.mobile']}
                  helperText={errors['emergencyContact.mobile']}
                  inputProps={{ maxLength: 10 }} />
              </Grid>
            </Grid>
          )}

          {/* ── Step 2: ABHA Linking ────────────────────────────────────── */}
          {activeStep === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <CheckCircle /> ABHA Linking (Optional)
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: '#f8f9ff', border: '1px dashed #667eea' }}>
                  <Typography variant="body2" color="text.secondary">
                    Link the patient's Ayushman Bharat Health Account for seamless health data sharing
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField fullWidth label="ABHA Number" value={formData.abhaNumber}
                  onChange={e => handleChange('abhaNumber', e.target.value)}
                  placeholder="14-1234-5678-9012"
                  disabled={!!abhaData && abhaLinked}
                  InputProps={{
                    endAdornment: !abhaLinked ? (
                      <InputAdornment position="end">
                        <IconButton onClick={searchAbha} disabled={loading}><Search /></IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }} />
              </Grid>
              {!abhaLinked && (
                <Grid item xs={12} md={4}>
                  <Button fullWidth variant="outlined" size="large" onClick={searchAbha} disabled={loading} sx={{ height: 56 }}>
                    {loading ? <CircularProgress size={24} /> : 'Search ABHA'}
                  </Button>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField fullWidth label="ABHA Address" value={formData.abhaAddress}
                  onChange={e => handleChange('abhaAddress', e.target.value)}
                  placeholder="name@sbx"
                  error={!!errors.abhaAddress}
                  helperText={errors.abhaAddress || 'Required for ABDM linking & consent (e.g. name@sbx). Auto-filled from ABHA when available.'} />
              </Grid>
              {abhaLinked && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#4caf50' }} />
                      <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>ABHA Linked Successfully!</Typography>
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}

          {/* ── Step 3: Appointment (Optional) ──────────────────────────── */}
          {activeStep === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <EventAvailable /> Schedule Appointment
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={scheduleAppt}
                        onChange={e => setScheduleAppt(e.target.checked)}
                        color="primary"
                        size="medium"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Schedule an appointment for this patient right away
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uncheck to skip — you can always schedule later from the Appointments page
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Collapse in={scheduleAppt}>
                  <Grid container spacing={3}>
                    {/* Doctor selection */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalHospital fontSize="small" /> Doctor
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={specializations}
                        value={specFilter}
                        onChange={(_, v) => { setSpecFilter(v || ''); setSelectedDoctor(null); setApptData(p => ({ ...p, doctorId: '' })); }}
                        freeSolo
                        renderInput={params => <TextField {...params} label="Filter by Specialization" size="small" />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <Autocomplete
                        options={filteredDoctors}
                        loading={loadingDoctors}
                        getOptionLabel={o => `Dr. ${o.firstName} ${o.lastName} — ${o.specialization || ''}`}
                        value={selectedDoctor}
                        onChange={(_, v) => { setSelectedDoctor(v); setApptData(p => ({ ...p, doctorId: v?.id || '' })); }}
                        renderInput={params => (
                          <TextField {...params} label="Select Doctor" required
                            error={!!apptErrors.doctorId} helperText={apptErrors.doctorId}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: <InputAdornment position="start"><LocalHospital /></InputAdornment>,
                              endAdornment: <>{loadingDoctors ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>,
                            }} />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box>
                              <Typography variant="body2">Dr. {option.firstName} {option.lastName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.specialization}{option.consultationFee ? ` · ₹${option.consultationFee}` : ''}
                              </Typography>
                            </Box>
                          </li>
                        )}
                      />
                    </Grid>

                    {selectedDoctor && (
                      <Grid item xs={12}>
                        <Alert severity="success" icon={<CheckCircle />}>
                          Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} — {selectedDoctor.specialization}
                          {selectedDoctor.consultationFee ? ` · Fee: ₹${selectedDoctor.consultationFee}` : ''}
                        </Alert>
                      </Grid>
                    )}

                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" /> Date, Time & Type
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Appointment Date" type="date" required
                        value={apptData.date} onChange={e => setApptData(p => ({ ...p, date: e.target.value }))}
                        onBlur={() => validateApptField('date')}
                        error={!!apptErrors.date} helperText={apptErrors.date}
                        InputLabelProps={{ shrink: true }} inputProps={{ min: todayDate }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday /></InputAdornment> }} />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField fullWidth select label="Time Slot" required
                        value={apptData.time} onChange={e => setApptData(p => ({ ...p, time: e.target.value }))}
                        onBlur={() => validateApptField('time')}
                        error={!!apptErrors.time}
                        disabled={loadingSlots || dynamicSlots.length === 0}
                        helperText={
                          !apptData.doctorId || !apptData.date ? 'Select doctor and date first'
                            : loadingSlots ? 'Loading slots...'
                            : dynamicSlots.length === 0 ? 'No slots available — try another date'
                            : (apptErrors.time || `${dynamicSlots.length} slot(s) · ${slotDuration} min`)
                        }
                        InputProps={{ startAdornment: <InputAdornment position="start">{loadingSlots ? <CircularProgress size={20} /> : <AccessTime />}</InputAdornment> }}>
                        {dynamicSlots.length === 0
                          ? <MenuItem disabled value="">No slots available</MenuItem>
                          : dynamicSlots.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField fullWidth select label="Appointment Type" value={apptData.type}
                        onChange={e => setApptData(p => ({ ...p, type: e.target.value }))}>
                        {appointmentTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField fullWidth label="Reason for Visit" required multiline rows={2}
                        value={apptData.reason} onChange={e => setApptData(p => ({ ...p, reason: e.target.value }))}
                        onBlur={() => validateApptField('reason')}
                        error={!!apptErrors.reason} helperText={apptErrors.reason || 'Min 5 characters'}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Description /></InputAdornment> }} />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField fullWidth label="Additional Notes" multiline rows={2}
                        value={apptData.notes} onChange={e => setApptData(p => ({ ...p, notes: e.target.value }))}
                        helperText="Optional notes for the doctor" />
                    </Grid>
                  </Grid>
                </Collapse>

                {!scheduleAppt && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Patient will be registered without an appointment. You can schedule one anytime from the Appointments page.
                  </Alert>
                )}
              </Grid>
            </Grid>
          )}

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
            <Button variant="outlined" onClick={() => setActiveStep(p => p - 1)} disabled={activeStep === 0} startIcon={<ArrowBack />} sx={{ minWidth: 120 }}>
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/app/patients')} sx={{ minWidth: 120 }}>Cancel</Button>
              {activeStep === steps.length - 1 ? (
                <Button variant="contained" onClick={handleSubmit} disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : (scheduleAppt ? <EventAvailable /> : <CheckCircle />)}
                  sx={{ minWidth: 180, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {loading ? 'Saving…' : isEditMode ? 'Update Patient' : scheduleAppt ? 'Register & Schedule' : 'Register Patient'}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext} endIcon={<ArrowForward />}
                  sx={{ minWidth: 120, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PatientRegistration;
