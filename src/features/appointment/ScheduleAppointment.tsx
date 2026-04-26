import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  Person,
  LocalHospital,
  Description,
  CheckCircle,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import { validate } from '../../utils/validation';

const appointmentTypes = [
  { value: 'OPD', label: 'OPD - General Consultation', description: 'Regular out-patient consultation' },
  { value: 'IPD', label: 'IPD - Admission Required', description: 'In-patient department admission' },
  { value: 'EMERGENCY', label: 'Emergency', description: 'Urgent medical attention required' },
  { value: 'FOLLOW_UP', label: 'Follow-up Visit', description: 'Follow-up after previous treatment' },
  { value: 'TELECONSULTATION', label: 'Tele-Consultation', description: 'Remote video/phone consultation' },
  { value: 'ROUTINE_CHECKUP', label: 'Routine Health Checkup', description: 'Regular health screening' },
  { value: 'VACCINATION', label: 'Vaccination', description: 'Immunization appointment' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic Tests', description: 'X-ray, MRI, CT scan, etc.' },
  { value: 'SURGERY_CONSULTATION', label: 'Surgery Consultation', description: 'Pre/Post surgery discussion' },
  { value: 'SECOND_OPINION', label: 'Second Opinion', description: 'Consultation for second opinion' },
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
];

const ScheduleAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [searchingDoctors, setSearchingDoctors] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    type: 'OPD',
    reason: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  useEffect(() => {
    fetchDoctors();
    fetchRecentPatients();
  }, []);

  const fetchRecentPatients = async () => {
    try {
      setSearchingPatients(true);
      const response: any = await patientService.searchPatients({ page: 1, limit: 20 });
      const patientList = response.data?.data || response.data || [];
      setPatients(patientList);
    } catch (error) {
      console.error('Error fetching recent patients:', error);
    } finally {
      setSearchingPatients(false);
    }
  };

  const fetchPatients = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      fetchRecentPatients();
      return;
    }
    
    try {
      setSearchingPatients(true);
      const response: any = await patientService.searchPatients({ search: searchTerm });
      const patientList = response.data?.data || response.data || [];
      setPatients(patientList);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setSearchingPatients(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setSearchingDoctors(true);
      const response: any = await doctorService.searchDoctors({});
      const doctorList = response.data?.data || response.data || [];
      setDoctors(doctorList);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setSearchingDoctors(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    validateField(field);
  };

  const validateField = (field: string) => {
    const value = (formData as any)[field];
    let error: string | undefined;

    switch (field) {
      case 'patientId':
        if (!value) error = 'Please select a patient';
        break;
      case 'doctorId':
        if (!value) error = 'Please select a doctor';
        break;
      case 'date':
        const dateResult = validate(value, {
          required: true,
          message: 'Appointment date is required',
          custom: (val) => {
            const selectedDate = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selectedDate >= today;
          },
        });
        if (!dateResult.isValid) {
          error = dateResult.error || 'Date cannot be in the past';
        }
        break;
      case 'time':
        if (!value) error = 'Please select a time slot';
        break;
      case 'type':
        if (!value) error = 'Please select appointment type';
        break;
      case 'reason':
        if (!value || value.trim().length < 5) {
          error = 'Please provide reason (minimum 5 characters)';
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error! }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const fields = ['patientId', 'doctorId', 'date', 'time', 'type', 'reason'];
    fields.forEach(validateField);

    const newErrors: Record<string, string> = {};
    
    if (!formData.patientId) newErrors.patientId = 'Please select a patient';
    if (!formData.doctorId) newErrors.doctorId = 'Please select a doctor';
    if (!formData.date) newErrors.date = 'Appointment date is required';
    if (!formData.time) newErrors.time = 'Please select a time slot';
    if (!formData.type) newErrors.type = 'Please select appointment type';
    if (!formData.reason || formData.reason.trim().length < 5) {
      newErrors.reason = 'Please provide reason (minimum 5 characters)';
    }

    // Validate date is not in past
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    try {
      setLoading(true);

      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        reason: formData.reason,
        notes: formData.notes,
      };

      await appointmentService.createAppointment(appointmentData);

      toast.success('✅ Appointment scheduled successfully!');
      navigate('/appointments');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to schedule appointment';
      toast.error(errorMessage);
      console.error('Error scheduling appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarToday sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Schedule Appointment
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Book a new appointment for a patient
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/appointments')}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Back
          </Button>
        </Box>
      </Paper>

      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {/* Patient Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                <Person /> Patient Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                loading={searchingPatients}
                getOptionLabel={(option) => 
                  `${option.firstName} ${option.lastName} (UHID: ${option.uhid}) - ${option.mobile}`
                }
                value={selectedPatient}
                onChange={(_, newValue) => {
                  setSelectedPatient(newValue);
                  handleChange('patientId', newValue?.id || '');
                }}
                onInputChange={(_, value) => {
                  if (value) fetchPatients(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Patient"
                    required
                    error={!!errors.patientId}
                    helperText={errors.patientId || 'Search by name, UHID, or mobile number'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <>
                          {searchingPatients ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {selectedPatient && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<CheckCircle />}>
                  <strong>Selected Patient:</strong> {selectedPatient.firstName} {selectedPatient.lastName} | 
                  UHID: {selectedPatient.uhid} | Mobile: {selectedPatient.mobile}
                </Alert>
              </Grid>
            )}

            {/* Doctor Selection */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                <LocalHospital /> Doctor Selection
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                options={doctors}
                loading={searchingDoctors}
                getOptionLabel={(option) => 
                  `Dr. ${option.firstName} ${option.lastName} - ${option.specialization}`
                }
                value={selectedDoctor}
                onChange={(_, newValue) => {
                  setSelectedDoctor(newValue);
                  handleChange('doctorId', newValue?.id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Doctor"
                    required
                    error={!!errors.doctorId}
                    helperText={errors.doctorId || 'Choose a doctor for the appointment'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalHospital />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <>
                          {searchingDoctors ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">
                        Dr. {option.firstName} {option.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.specialization} | {option.qualification}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {selectedDoctor && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<CheckCircle />}>
                  <strong>Selected Doctor:</strong> Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} | 
                  {selectedDoctor.specialization}
                  {selectedDoctor.consultationFee && ` | Fee: ₹${selectedDoctor.consultationFee}`}
                </Alert>
              </Grid>
            )}

            {/* Appointment Details */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                <CalendarToday /> Appointment Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Appointment Date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                onBlur={() => handleBlur('date')}
                error={!!errors.date}
                helperText={errors.date || 'Select appointment date'}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: getTodayDate() }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Time Slot"
                required
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                onBlur={() => handleBlur('time')}
                error={!!errors.time}
                helperText={errors.time || 'Select time slot'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTime />
                    </InputAdornment>
                  ),
                }}
              >
                {timeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Appointment Type"
                required
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                onBlur={() => handleBlur('type')}
                error={!!errors.type}
                helperText={
                  errors.type || 
                  appointmentTypes.find(t => t.value === formData.type)?.description || 
                  'Select appointment type'
                }
              >
                {appointmentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography variant="body1">{type.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for Visit"
                required
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                onBlur={() => handleBlur('reason')}
                error={!!errors.reason}
                helperText={errors.reason || 'Describe the reason for appointment (minimum 5 characters)'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                helperText="Optional notes for the doctor"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/appointments')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    },
                  }}
                >
                  {loading ? 'Scheduling...' : 'Schedule Appointment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScheduleAppointment;
