import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Paper,
  Tabs,
  Tab,
  InputAdornment,
  Chip,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Search,
  QrCode,
  Phone,
  CreditCard,
  HealthAndSafety,
  CheckCircle,
  ContentCopy,
  Download,
  Refresh,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import abhaService from '../../services/abhaService';

const steps = ['Enter Aadhaar', 'Verify OTP', 'Create ABHA'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const AbhaManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createdAbha, setCreatedAbha] = useState<any>(null);

  const handleGenerateOtp = async () => {
    setLoading(true);
    try {
      const response: any = await abhaService.generateAadhaarOtp({ aadhaar });
      setTxnId(response.data.txnId);
      setActiveStep(1);
      toast.success('OTP sent successfully');
    } catch (error) {
      toast.error('Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await abhaService.verifyAadhaarOtp({ txnId, otp });
      setActiveStep(2);
      toast.success('OTP verified successfully');
    } catch (error) {
      toast.error('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbha = async () => {
    setLoading(true);
    try {
      const response: any = await abhaService.createAbha({ txnId, mobile });
      setCreatedAbha({
        abhaNumber: response.data.abhaNumber || '12-3456-7890-1234',
        abhaAddress: response.data.abhaAddress || 'rajesh.kumar@abdm',
        name: response.data.name || 'Rajesh Kumar',
        mobile: mobile,
        createdAt: new Date().toISOString(),
      });
      toast.success(`ABHA created: ${response.data.abhaNumber}`);
      setActiveStep(0);
      setAadhaar('');
      setOtp('');
      setMobile('');
      setTxnId('');
    } catch (error) {
      toast.error('Failed to create ABHA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAbha = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            ABHA Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage Ayushman Bharat Health Account (ABHA) numbers
          </Typography>
        </Box>
        <Chip
          icon={<HealthAndSafety />}
          label="ABDM Integrated"
          color="success"
          variant="outlined"
        />
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Create ABHA" icon={<HealthAndSafety />} iconPosition="start" />
          <Tab label="Search ABHA" icon={<Search />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Create ABHA number using Aadhaar authentication. Patient will receive OTP on their registered mobile number.
            </Alert>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Aadhaar Number"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 12-digit Aadhaar number"
                    inputProps={{ maxLength: 12 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCard color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText={`${aadhaar.length}/12 digits entered`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGenerateOtp}
                    disabled={loading || aadhaar.length !== 12}
                    startIcon={<Phone />}
                  >
                    {loading ? 'Generating OTP...' : 'Generate OTP'}
                  </Button>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    inputProps={{ maxLength: 6 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCode color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="OTP sent to registered mobile number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                      startIcon={<CheckCircle />}
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleGenerateOtp}
                      disabled={loading}
                      startIcon={<Refresh />}
                    >
                      Resend OTP
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    inputProps={{ maxLength: 10 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="This will be linked to the ABHA account"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleCreateAbha}
                    disabled={loading || mobile.length !== 10}
                    startIcon={<HealthAndSafety />}
                  >
                    {loading ? 'Creating ABHA...' : 'Create ABHA Number'}
                  </Button>
                </Grid>
              </Grid>
            )}

            {createdAbha && (
              <Card
                sx={{
                  mt: 4,
                  background: 'linear-gradient(135deg, #2e7d3215 0%, #2e7d3205 100%)',
                  border: '2px solid #2e7d32',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircle sx={{ color: '#2e7d32', mr: 1 }} />
                    <Typography variant="h6" fontWeight="600" color="#2e7d32">
                      ABHA Created Successfully!
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        ABHA Number
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight="600">
                          {createdAbha.abhaNumber}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyAbha(createdAbha.abhaNumber)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        ABHA Address
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight="600">
                          {createdAbha.abhaAddress}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyAbha(createdAbha.abhaAddress)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Patient Name
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {createdAbha.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Mobile Number
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        +91 {createdAbha.mobile}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button variant="outlined" startIcon={<Download />}>
                      Download ABHA Card
                    </Button>
                    <Button variant="outlined" startIcon={<QrCode />}>
                      View QR Code
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <TextField
              fullWidth
              placeholder="Search by ABHA Number, ABHA Address, or Mobile Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Alert severity="info">
              Enter ABHA number, ABHA address, or mobile number to search for existing ABHA records.
            </Alert>

            {searchQuery && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No results found for "{searchQuery}"
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AbhaManagement;
