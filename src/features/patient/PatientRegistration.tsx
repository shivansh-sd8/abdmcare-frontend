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
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import patientService from '../../services/patientService';
import abhaService from '../../services/abhaService';
import appointmentService from '../../services/appointmentService';
import doctorService from '../../services/doctorService';
import {
  validate,
  validationPatterns,
  validationMessages,
  validateMobile,
  validateEmail,
  validatePincode,
  validateAge,
  validateABHANumber,
} from '../../utils/validation';

const steps = ['Basic Information', 'Contact & Address', 'ABHA Linking', 'Appointment'];

const appointmentTypes = [
  { value: 'OPD',              label: 'OPD — General Consultation' },
  { value: 'FOLLOW_UP',        label: 'Follow-up Visit' },
  { value: 'EMERGENCY',        label: 'Emergency' },
  { value: 'ROUTINE_CHECKUP',  label: 'Routine Health Checkup' },
  { value: 'DIAGNOSTIC',       label: 'Diagnostic Tests' },
  { value: 'VACCINATION',      label: 'Vaccination' },
  { value: 'TELECONSULTATION', label: 'Tele-Consultation' },
];

const timeSlots = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
];

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Patient form ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    gender: '', dob: '', mobile: '', email: '', bloodGroup: '',
    address:          { line1: '', line2: '', city: '', state: '', pincode: '' },
    emergencyContact: { name: '', relationship: '', mobile: '' },
    abhaNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [abhaLinked, setAbhaLinked] = useState(false);

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
      case 'firstName': case 'lastName':
        const nr = validate(value, { required: true, pattern: validationPatterns.name,
          message: field === 'firstName' ? 'First name is required' : 'Last name is required' });
        if (!nr.isValid) error = nr.error;
        else if (value && !validationPatterns.name.test(value)) error = validationMessages.name;
        break;
      case 'mobile':        { const r = validateMobile(value);   if (!r.isValid) error = r.error; break; }
      case 'email':         { const r = validateEmail(value);    if (!r.isValid) error = r.error; break; }
      case 'dob':           { const r = validateAge(value);      if (!r.isValid) error = r.error; break; }
      case 'gender':        { const r = validate(value, { required: true, message: 'Gender is required' }); if (!r.isValid) error = r.error; break; }
      case 'address.pincode': if (value) { const r = validatePincode(value); if (!r.isValid) error = r.error; } break;
      case 'emergencyContact.mobile': if (value) { const r = validateMobile(value); if (!r.isValid) error = r.error; } break;
      case 'abhaNumber':    if (value) { const r = validateABHANumber(value); if (!r.isValid) error = r.error; } break;
    }
    if (error) setErrors(prev => ({ ...prev, [field]: error! }));
    else setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleNext = () => {
    if (activeStep === 0 && (!formData.firstName || !formData.lastName || !formData.gender || !formData.dob)) {
      toast.error('Please fill all required fields'); return;
    }
    if (activeStep === 1 && !formData.mobile) {
      toast.error('Mobile number is required'); return;
    }
    setActiveStep(prev => prev + 1);
  };

  const searchAbha = async () => {
    if (!formData.abhaNumber) { toast.error('Please enter ABHA number'); return; }
    try {
      setLoading(true);
      const response: any = await abhaService.searchAbha({ abhaNumber: formData.abhaNumber });
      if (response.data) { setAbhaLinked(true); toast.success('ABHA found and linked!'); }
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
    if (!apptData.time)                        errs.time     = 'Time is required';
    if (!apptData.reason || apptData.reason.trim().length < 5) errs.reason = 'Reason must be at least 5 characters';
    setApptErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!apptIsValid()) { toast.error('Please fix appointment fields'); return; }
    try {
      setLoading(true);

      // 1. Register patient
      const patientRes: any = await patientService.createPatient({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        gender: formData.gender,
        dob: formData.dob,
        mobile: formData.mobile,
        email: formData.email,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        abhaId: abhaLinked ? formData.abhaNumber : undefined,
      });

      const newPatientId: string = patientRes.data?.data?.id ?? patientRes.data?.id ?? patientRes.data?.data?.data?.id;

      // 2. Optionally create appointment
      if (scheduleAppt && newPatientId) {
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
        navigate('/appointments');
      } else {
        toast.success('Patient registered successfully!');
        navigate('/patients');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonAdd sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">New Patient Registration</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Register a new patient and optionally schedule an appointment
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Stepper activeStep={activeStep} sx={{
        mb: 4,
        '& .MuiStepLabel-root .Mui-completed': { color: '#667eea' },
        '& .MuiStepLabel-root .Mui-active':    { color: '#667eea' },
      }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>

          {/* ── Step 0: Basic Info ──────────────────────────────────────── */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <LocalHospital /> Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="First Name" required value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  onBlur={() => validateField('firstName')} error={!!errors.firstName} helperText={errors.firstName} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Middle Name" value={formData.middleName}
                  onChange={e => handleChange('middleName', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
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
                  onChange={e => handleChange('address.pincode', e.target.value)} />
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
                  onChange={e => handleChange('emergencyContact.mobile', e.target.value)} />
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
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={searchAbha} disabled={loading}><Search /></IconButton>
                      </InputAdornment>
                    ),
                  }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth variant="outlined" size="large" onClick={searchAbha} disabled={loading} sx={{ height: 56 }}>
                  {loading ? <CircularProgress size={24} /> : 'Search ABHA'}
                </Button>
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
                        error={!!apptErrors.time} helperText={apptErrors.time}
                        InputProps={{ startAdornment: <InputAdornment position="start"><AccessTime /></InputAdornment> }}>
                        {timeSlots.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
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
              <Button variant="outlined" onClick={() => navigate('/patients')} sx={{ minWidth: 120 }}>Cancel</Button>
              {activeStep === steps.length - 1 ? (
                <Button variant="contained" onClick={handleSubmit} disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : (scheduleAppt ? <EventAvailable /> : <CheckCircle />)}
                  sx={{ minWidth: 180, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {loading ? 'Saving…' : scheduleAppt ? 'Register & Schedule' : 'Register Patient'}
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
