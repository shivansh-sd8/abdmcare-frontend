import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Stack,
  Chip,
} from '@mui/material';
import {
  PersonAdd,
  HealthAndSafety,
  CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import patientService from '../../services/patientService';
import abhaService from '../../services/abhaService';

const QuickRegistration: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [hasAbha, setHasAbha] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAbhaDialog, setShowAbhaDialog] = useState(false);

  const [patientData, setPatientData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    mobile: '',
    email: '',
    bloodGroup: '',
    address: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [abhaData, setAbhaData] = useState({
    aadhaarNumber: '',
    abhaAddress: '',
    otp: '',
  });

  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaTxnId, setAbhaTxnId] = useState('');
  const [abhaLinkInput, setAbhaLinkInput] = useState('');
  const [abhaVerifying, setAbhaVerifying] = useState(false);
  const [abhaLinked, setAbhaLinked] = useState(false);
  const [linkedAbhaNumber, setLinkedAbhaNumber] = useState('');

  const steps = ['Patient Details', 'ABHA (Optional)', 'Confirmation'];

  const handlePatientChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setPatientData({
        ...patientData,
        address: {
          ...patientData.address,
          [addressField]: value,
        },
      });
    } else {
      setPatientData({
        ...patientData,
        [field]: value,
      });
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate patient details
      if (!patientData.firstName || !patientData.lastName || !patientData.mobile || !patientData.gender) {
        toast.error('Please fill all required fields (First Name, Last Name, Mobile, Gender)');
        return;
      }
      // Validate mobile format
      if (!/^\d{10}$/.test(patientData.mobile)) {
        toast.error('Mobile number must be 10 digits');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateAbha = async () => {
    try {
      setLoading(true);
      const res: any = await abhaService.generateAadhaarOtp(abhaData.aadhaarNumber);
      const txn = res?.data?.txnId || res?.txnId;
      if (!txn) throw new Error('No txnId received');
      setAbhaTxnId(txn);
      toast.success('OTP sent to Aadhaar-linked mobile');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAbhaOtp = async () => {
    try {
      setLoading(true);
      const res: any = await abhaService.enrolByAadhaar(abhaTxnId, abhaOtp, patientData.mobile);
      const data = res?.data || res;
      const profile = data?.profile || data?.ABHAProfile || data;
      const abhaNum = profile?.ABHANumber || profile?.abhaNumber;
      if (abhaNum) {
        setLinkedAbhaNumber(abhaNum);
        setAbhaLinked(true);
        setShowAbhaDialog(false);
        toast.success('ABHA created and linked successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExistingAbha = async () => {
    if (!abhaLinkInput.trim()) { toast.error('Enter ABHA number or address'); return; }
    try {
      setAbhaVerifying(true);
      const isAddress = abhaLinkInput.includes('@');
      if (isAddress) {
        const res: any = await abhaService.phrSearch(abhaLinkInput);
        if (res?.data || res) {
          setLinkedAbhaNumber(abhaLinkInput);
          setAbhaLinked(true);
          toast.success('ABHA address verified');
        }
      } else {
        const res: any = await abhaService.loginSearch(abhaLinkInput.replace(/-/g, ''));
        if (res?.data || res) {
          setLinkedAbhaNumber(abhaLinkInput);
          setAbhaLinked(true);
          toast.success('ABHA number verified');
        }
      }
    } catch { toast.error('ABHA not found'); }
    finally { setAbhaVerifying(false); }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      await patientService.createPatient({
        ...patientData,
        dob: patientData.dob || new Date().toISOString(),
        ...(abhaLinked && linkedAbhaNumber ? { abhaId: linkedAbhaNumber.replace(/-/g, '') } : {}),
      });
      toast.success('Patient registered successfully!');
      
      // Reset form
      setPatientData({
        firstName: '',
        lastName: '',
        gender: '',
        dob: '',
        mobile: '',
        email: '',
        bloodGroup: '',
        address: {
          line1: '',
          city: '',
          state: '',
          pincode: '',
        },
      });
      setActiveStep(0);
      setHasAbha(null);
      setAbhaLinked(false);
      setLinkedAbhaNumber('');
      setAbhaTxnId('');
      setAbhaOtp('');
      setAbhaLinkInput('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to register patient';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        toast.error('A patient with this mobile number or details already exists. Please search before registering.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <PersonAdd sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Quick Patient Registration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register new patients quickly with optional ABHA creation
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Patient Details */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="First Name"
                  value={patientData.firstName}
                  onChange={(e) => handlePatientChange('firstName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Last Name"
                  value={patientData.lastName}
                  onChange={(e) => handlePatientChange('lastName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={patientData.gender}
                    label="Gender"
                    onChange={(e) => handlePatientChange('gender', e.target.value)}
                  >
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth (Optional)"
                  value={patientData.dob}
                  onChange={(e) => handlePatientChange('dob', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave blank if unknown"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Mobile Number"
                  value={patientData.mobile}
                  onChange={(e) => handlePatientChange('mobile', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email (Optional)"
                  value={patientData.email}
                  onChange={(e) => handlePatientChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Blood Group (Optional)"
                  value={patientData.bloodGroup}
                  onChange={(e) => handlePatientChange('bloodGroup', e.target.value)}
                  placeholder="e.g., A+, B-, O+"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Address
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line"
                  value={patientData.address.line1}
                  onChange={(e) => handlePatientChange('address.line1', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={patientData.address.city}
                  onChange={(e) => handlePatientChange('address.city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={patientData.address.state}
                  onChange={(e) => handlePatientChange('address.state', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={patientData.address.pincode}
                  onChange={(e) => handlePatientChange('address.pincode', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2: ABHA */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              ABHA (Ayushman Bharat Health Account)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Does the patient have an ABHA ID?
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              <Button
                variant={hasAbha === true ? 'contained' : 'outlined'}
                onClick={() => setHasAbha(true)}
                startIcon={<CheckCircle />}
              >
                Yes, Link Existing ABHA
              </Button>
              <Button
                variant={hasAbha === false ? 'contained' : 'outlined'}
                onClick={() => {
                  setHasAbha(false);
                  setShowAbhaDialog(true);
                }}
                startIcon={<HealthAndSafety />}
              >
                No, Create New ABHA
              </Button>
              <Button
                variant={hasAbha === null ? 'contained' : 'outlined'}
                onClick={() => setHasAbha(null)}
              >
                Skip for Now
              </Button>
            </Stack>

            {hasAbha === true && (
              <Box>
                <TextField
                  fullWidth
                  label="ABHA Number or Address"
                  placeholder="e.g., 12-3456-7890-1234 or name@abdm"
                  value={abhaLinkInput}
                  onChange={(e) => setAbhaLinkInput(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" onClick={handleLinkExistingAbha} disabled={abhaVerifying || !abhaLinkInput.trim()}>
                  {abhaVerifying ? 'Verifying...' : 'Verify & Link ABHA'}
                </Button>
                {abhaLinked && (
                  <Chip label={`ABHA Linked: ${linkedAbhaNumber}`} color="success" icon={<CheckCircle />} sx={{ ml: 2 }} />
                )}
              </Box>
            )}

            {hasAbha === null && (
              <Chip
                label="Patient will be registered without ABHA. You can link it later."
                color="info"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        )}

        {/* Step 3: Confirmation */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirm Registration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Name:</strong> {patientData.firstName} {patientData.lastName}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Gender:</strong> {patientData.gender}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>DOB:</strong> {patientData.dob}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Mobile:</strong> {patientData.mobile}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>ABHA Status:</strong>{' '}
                  {abhaLinked ? linkedAbhaNumber : 'Not Linked'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Box>
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Patient'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ABHA Creation Dialog */}
      <Dialog open={showAbhaDialog} onClose={() => setShowAbhaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create ABHA Account</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Aadhaar Number"
            value={abhaData.aadhaarNumber}
            onChange={(e) => setAbhaData({ ...abhaData, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
            inputProps={{ maxLength: 12 }}
            helperText={abhaTxnId ? 'OTP sent to Aadhaar-linked mobile' : `${abhaData.aadhaarNumber.length}/12 digits`}
            sx={{ mt: 2, mb: 2 }}
            disabled={!!abhaTxnId}
          />
          {abhaTxnId && (
            <TextField
              fullWidth
              label="Enter OTP"
              value={abhaOtp}
              onChange={(e) => setAbhaOtp(e.target.value.replace(/\D/g, ''))}
              inputProps={{ maxLength: 6 }}
              helperText={`${abhaOtp.length}/6`}
              sx={{ mb: 2 }}
            />
          )}
          {!abhaTxnId && (
            <Typography variant="caption" color="text.secondary">
              An OTP will be sent to the mobile number linked with this Aadhaar
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowAbhaDialog(false); setAbhaTxnId(''); setAbhaOtp(''); }}>Cancel</Button>
          {!abhaTxnId ? (
            <Button variant="contained" onClick={handleCreateAbha} disabled={loading || abhaData.aadhaarNumber.length !== 12}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleVerifyAbhaOtp} disabled={loading || abhaOtp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Create ABHA'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickRegistration;
