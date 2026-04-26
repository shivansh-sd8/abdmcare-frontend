import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const HOSPITAL_TYPES = [
  'HOSPITAL',
  'CLINIC',
  'NURSING_HOME',
  'DIAGNOSTIC_CENTER',
  'POLYCLINIC',
  'SPECIALTY_CENTER',
  'MULTI_SPECIALTY',
  'SUPER_SPECIALTY',
];

const PLANS = [
  { value: 'FREE', label: 'Free (14-day trial)', price: '₹0/month' },
  { value: 'BASIC', label: 'Basic', price: '₹2,999/month' },
  { value: 'PROFESSIONAL', label: 'Professional', price: '₹9,999/month' },
  { value: 'ENTERPRISE', label: 'Enterprise', price: 'Custom pricing' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const COMMON_SERVICES = [
  'Emergency Care',
  'ICU',
  'Surgery',
  'Diagnostics',
  'Pharmacy',
  'Laboratory',
  'Radiology',
  'Blood Bank',
  'Ambulance',
  'Physiotherapy',
];

const COMMON_SPECIALTIES = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Oncology',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'ENT',
  'Ophthalmology',
  'Psychiatry',
  'General Medicine',
  'General Surgery',
];

const steps = ['Basic Information', 'Contact & Address', 'Legal Details', 'Facility & Services', 'Admin Account'];

export default function HospitalOnboarding() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    plan: string;
    email: string;
    phone: string;
    alternatePhone: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    landmark: string;
    registrationNumber: string;
    gstNumber: string;
    panNumber: string;
    licenseNumber: string;
    establishedYear: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    adminUsername: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
    totalBeds: string;
    icuBeds: string;
    emergencyBeds: string;
    operationTheaters: string;
    services: string[];
    specialties: string[];
  }>({
    // Basic Information
    name: '',
    type: 'HOSPITAL',
    plan: 'FREE',

    // Contact Information
    email: '',
    phone: '',
    alternatePhone: '',
    website: '',

    // Address Details
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    landmark: '',

    // Legal & Registration
    registrationNumber: '',
    gstNumber: '',
    panNumber: '',
    licenseNumber: '',
    establishedYear: '',

    // Admin/Owner Details
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    adminUsername: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',

    // Facility Details
    totalBeds: '',
    icuBeds: '',
    emergencyBeds: '',
    operationTheaters: '',

    // Services & Specialties
    services: [],
    specialties: [],
  });

  const handleChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        establishedYear: formData.establishedYear ? parseInt(formData.establishedYear) : undefined,
        totalBeds: formData.totalBeds ? parseInt(formData.totalBeds) : undefined,
        icuBeds: formData.icuBeds ? parseInt(formData.icuBeds) : undefined,
        emergencyBeds: formData.emergencyBeds ? parseInt(formData.emergencyBeds) : undefined,
        operationTheaters: formData.operationTheaters ? parseInt(formData.operationTheaters) : undefined,
      };

      const response = await api.post('/hospitals/onboard', payload) as any;

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to onboard hospital');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label="Hospital/Clinic Name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="e.g., Apollo Hospitals"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                select
                label="Type"
                value={formData.type}
                onChange={handleChange('type')}
              >
                {HOSPITAL_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Subscription Plan</InputLabel>
                <Select
                  value={formData.plan}
                  label="Subscription Plan"
                  onChange={handleChange('plan')}
                >
                  {PLANS.map((plan) => (
                    <MenuItem key={plan.value} value={plan.value}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{plan.label}</span>
                        <Chip label={plan.price} size="small" color="primary" />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Contact & Address Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Hospital Email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="admin@hospital.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Primary Phone"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="+91-9876543210"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Alternate Phone"
                value={formData.alternatePhone}
                onChange={handleChange('alternatePhone')}
                placeholder="+91-9876543211"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website"
                value={formData.website}
                onChange={handleChange('website')}
                placeholder="https://hospital.com"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Address Line 1"
                value={formData.addressLine1}
                onChange={handleChange('addressLine1')}
                placeholder="Building No., Street Name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                value={formData.addressLine2}
                onChange={handleChange('addressLine2')}
                placeholder="Area, Locality"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="City"
                value={formData.city}
                onChange={handleChange('city')}
                placeholder="e.g., Mumbai"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                select
                label="State"
                value={formData.state}
                onChange={handleChange('state')}
              >
                {INDIAN_STATES.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Pincode"
                value={formData.pincode}
                onChange={handleChange('pincode')}
                placeholder="400001"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Landmark"
                value={formData.landmark}
                onChange={handleChange('landmark')}
                placeholder="Near Railway Station"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Legal & Registration Details
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Optional but recommended for verification
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={handleChange('registrationNumber')}
                placeholder="REG-2024-001"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="License Number"
                value={formData.licenseNumber}
                onChange={handleChange('licenseNumber')}
                placeholder="LIC-MH-2024-001"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GST Number"
                value={formData.gstNumber}
                onChange={handleChange('gstNumber')}
                placeholder="27AAAAA0000A1Z5"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Number"
                value={formData.panNumber}
                onChange={handleChange('panNumber')}
                placeholder="AAAAA0000A"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Established Year"
                value={formData.establishedYear}
                onChange={handleChange('establishedYear')}
                placeholder="2020"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Owner/Director Details
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Owner Name"
                value={formData.ownerName}
                onChange={handleChange('ownerName')}
                placeholder="Dr. John Doe"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Owner Email"
                value={formData.ownerEmail}
                onChange={handleChange('ownerEmail')}
                placeholder="owner@hospital.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Owner Phone"
                value={formData.ownerPhone}
                onChange={handleChange('ownerPhone')}
                placeholder="+91-9876543210"
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Facility Details
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Beds"
                value={formData.totalBeds}
                onChange={handleChange('totalBeds')}
                placeholder="100"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="ICU Beds"
                value={formData.icuBeds}
                onChange={handleChange('icuBeds')}
                placeholder="10"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Emergency Beds"
                value={formData.emergencyBeds}
                onChange={handleChange('emergencyBeds')}
                placeholder="20"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Operation Theaters"
                value={formData.operationTheaters}
                onChange={handleChange('operationTheaters')}
                placeholder="5"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Services & Specialties
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={COMMON_SERVICES}
                value={formData.services}
                onChange={(_, newValue) => setFormData({ ...formData, services: newValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Services Offered"
                    placeholder="Select services"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={COMMON_SPECIALTIES}
                value={formData.specialties}
                onChange={(_, newValue) => setFormData({ ...formData, specialties: newValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Medical Specialties"
                    placeholder="Select specialties"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
              />
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Create Admin Account
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This will be the primary administrator account for your hospital
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Admin First Name"
                value={formData.adminFirstName}
                onChange={handleChange('adminFirstName')}
                placeholder="John"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Admin Last Name"
                value={formData.adminLastName}
                onChange={handleChange('adminLastName')}
                placeholder="Doe"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Username"
                value={formData.adminUsername}
                onChange={handleChange('adminUsername')}
                placeholder="admin_username"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Password"
                value={formData.adminPassword}
                onChange={handleChange('adminPassword')}
                placeholder="Strong password"
                helperText="Minimum 8 characters"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Review your information:</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  • Hospital: {formData.name || 'Not provided'}
                </Typography>
                <Typography variant="body2">
                  • Email: {formData.email || 'Not provided'}
                </Typography>
                <Typography variant="body2">
                  • Plan: {PLANS.find(p => p.value === formData.plan)?.label}
                </Typography>
                <Typography variant="body2">
                  • Admin: {formData.adminFirstName} {formData.adminLastName}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              🎉 Hospital Onboarded Successfully!
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Your hospital has been registered successfully.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You will be redirected to the login page shortly...
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Hospital Onboarding
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Register your hospital to get started with MediSync ABDM
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3, mb: 3 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Complete Onboarding'}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
