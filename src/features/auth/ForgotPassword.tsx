import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Stack,
  alpha,
  useMediaQuery,
  useTheme,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  LocalHospital,
  ArrowBack,
  ArrowForward,
  VpnKey,
  CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const steps = ['Enter Email', 'Verify Code', 'New Password'];

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8082';

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Reset code sent! Check your email/console.');
        if (data.data?.otp) {
          toast.info(`Dev mode — OTP: ${data.data.otp}`, { autoClose: 15000 });
        }
        setActiveStep(1);
      } else {
        setError(data.message || 'Failed to send reset code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) { setError('Please enter the reset code'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Password reset successfully!');
        setActiveStep(2);
        toast.success('Password updated! You can now login.');
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: alpha('#fff', 0.04),
      color: 'white',
      borderRadius: 2,
      '& fieldset': { borderColor: alpha('#fff', 0.1) },
      '&:hover fieldset': { borderColor: alpha('#fff', 0.25) },
      '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: 1 },
      '& input::placeholder': { color: alpha('#fff', 0.25) },
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0A0A0F' }}>
      {/* Left panel */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 46%',
            position: 'relative',
            background: 'linear-gradient(150deg, #0F0C29 0%, #302B63 55%, #24243e 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 6,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -80, left: -80, width: 500, height: 500, borderRadius: '50%', background: '#6366F1', filter: 'blur(90px)', opacity: 0.2 }} />
          <Box sx={{ position: 'absolute', bottom: -60, right: -60, width: 400, height: 400, borderRadius: '50%', background: '#0EA5E9', filter: 'blur(90px)', opacity: 0.2 }} />

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.35rem" color="white" letterSpacing="-0.5px">
                AbhaAyushman
              </Typography>
            </Stack>
            <Typography variant="h4" fontWeight={800} color="white" sx={{ mb: 2 }}>
              Reset Your Password
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), maxWidth: 380 }}>
              Don't worry, we'll help you get back into your account securely.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Right panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, md: 6 }, bgcolor: '#0D0D14' }}>
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          {isMobile && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4, justifyContent: 'center' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.2rem" color="white">AbhaAyushman</Typography>
            </Stack>
          )}

          <Typography variant="h4" fontWeight={800} color="white" letterSpacing="-0.5px" gutterBottom>
            {activeStep === 2 ? 'All Done!' : 'Forgot Password'}
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.45), mb: 3 }}>
            {activeStep === 0 && 'Enter your email to receive a reset code'}
            {activeStep === 1 && 'Enter the code and your new password'}
            {activeStep === 2 && 'Your password has been reset successfully'}
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4, '& .MuiStepLabel-label': { color: alpha('#fff', 0.4) }, '& .Mui-active .MuiStepLabel-label': { color: '#818CF8' }, '& .Mui-completed .MuiStepLabel-label': { color: '#4ade80' }, '& .MuiStepIcon-root': { color: alpha('#fff', 0.1) }, '& .MuiStepIcon-root.Mui-active': { color: '#6366F1' }, '& .MuiStepIcon-root.Mui-completed': { color: '#4ade80' } }}>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: `1px solid ${alpha('#EF4444', 0.3)}`, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, bgcolor: alpha('#22C55E', 0.1), color: '#86EFAC', border: `1px solid ${alpha('#22C55E', 0.3)}`, '& .MuiAlert-icon': { color: '#86EFAC' } }}>
              {success}
            </Alert>
          )}

          {/* Step 0: Email */}
          {activeStep === 0 && (
            <form onSubmit={handleSendCode}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  required
                  placeholder="your@email.com"
                  sx={{ mt: 0.75, ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} /></InputAdornment> }}
                />
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={!loading && <ArrowForward />}
                sx={{ background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', py: 1.6, fontSize: '0.95rem', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.35)', '&:hover': { transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>
          )}

          {/* Step 1: OTP + New Password */}
          {activeStep === 1 && (
            <form onSubmit={handleResetPassword}>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Reset Code (6-digit OTP)
                </Typography>
                <TextField
                  fullWidth
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  required
                  placeholder="123456"
                  inputProps={{ maxLength: 6 }}
                  sx={{ mt: 0.75, ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} /></InputAdornment> }}
                />
              </Box>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  New Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setError(''); }}
                  required
                  placeholder="••••••••"
                  sx={{ mt: 0.75, ...inputSx }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: alpha('#fff', 0.3) }}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Confirm Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  required
                  placeholder="••••••••"
                  sx={{ mt: 0.75, ...inputSx }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} /></InputAdornment> }}
                  error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                  helperText={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
                />
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => { setActiveStep(0); setError(''); }}
                  sx={{ flex: 1, borderColor: alpha('#fff', 0.12), color: alpha('#fff', 0.6), py: 1.4, borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: alpha('#6366F1', 0.6) } }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || otp.length !== 6 || newPassword.length < 6}
                  sx={{ flex: 2, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', py: 1.4, fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </Stack>
            </form>
          )}

          {/* Step 2: Success */}
          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#4ade80', mb: 2 }} />
              <Typography variant="h6" color="white" fontWeight={600} sx={{ mb: 1 }}>
                Password Reset Complete
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), mb: 4 }}>
                You can now sign in with your new password.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                endIcon={<ArrowForward />}
                sx={{ background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', py: 1.6, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
              >
                Go to Login
              </Button>
            </Box>
          )}

          {/* Back to login link */}
          {activeStep !== 2 && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login')}
                sx={{ color: alpha('#fff', 0.4), textTransform: 'none', '&:hover': { color: '#818CF8' } }}
              >
                Back to Login
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
