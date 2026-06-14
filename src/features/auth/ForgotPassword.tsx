// Forgot-password flow for Abha Ayushman.
//
// Shares the visual language of Login.tsx / LandingPage.tsx — a soft cream
// surface, deep teal/emerald gradient brand and slate text — so password
// recovery feels like one product with the rest of the app.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Email,
  HealthAndSafety,
  Lock,
  Shield,
  Verified,
  Visibility,
  VisibilityOff,
  VpnKey,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import BrandLogo from '../../components/common/BrandLogo';

/* ── theme tokens (kept in sync with Login.tsx / LandingPage.tsx) ─────────── */
const BRAND = {
  primary:    '#0F766E',
  primary600: '#0D9488',
  accent:     '#14B8A6',
  accent2:    '#22D3EE',
  emerald:    '#10B981',
  ink:        '#0F172A',
  ink600:     '#334155',
  ink500:     '#475569',
  bg:         '#F6FBF9',
  surface:    '#FFFFFF',
  hairline:   '#E2E8F0',
};

/** Soft blurred blob — same primitive as on the login / landing pages. */
const Blob: React.FC<{
  color: string;
  size: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  opacity?: number;
}> = ({ color, size, top, left, right, bottom, opacity = 0.35 }) => (
  <Box
    sx={{
      position: 'absolute',
      top, left, right, bottom,
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      filter: 'blur(110px)',
      opacity,
      pointerEvents: 'none',
    }}
  />
);

const steps = ['Enter Email', 'Verify Code', 'New Password'];

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

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
    mt: 0.75,
    '& .MuiOutlinedInput-root': {
      bgcolor: BRAND.surface,
      borderRadius: 2,
      '& fieldset': { borderColor: BRAND.hairline },
      '&:hover fieldset': { borderColor: alpha(BRAND.primary, 0.5) },
      '&.Mui-focused fieldset': { borderColor: BRAND.primary, borderWidth: 1.5 },
    },
  };

  const labelSx = {
    color: BRAND.ink500,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    fontSize: '0.7rem',
  };

  const primaryBtnSx = {
    background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
    color: '#fff',
    py: 1.6,
    fontSize: '0.95rem',
    fontWeight: 700,
    borderRadius: 2,
    textTransform: 'none' as const,
    boxShadow: `0 10px 30px ${alpha(BRAND.primary, 0.35)}`,
    '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 14px 40px ${alpha(BRAND.primary, 0.45)}` },
    transition: 'all 0.2s',
  };

  const features = [
    {
      icon: <CheckCircle sx={{ fontSize: 22 }} />,
      title: 'One system, end-to-end',
      desc: 'OPD, IPD, lab, pharmacy and billing wired together.',
    },
    {
      icon: <HealthAndSafety sx={{ fontSize: 22 }} />,
      title: 'ABDM M1, M2 & M3',
      desc: 'Fully integrated and ready for certification.',
    },
    {
      icon: <Verified sx={{ fontSize: 22 }} />,
      title: 'Role-based access',
      desc: 'Tailored, secure workspaces for every staff type.',
    },
    {
      icon: <Shield sx={{ fontSize: 22 }} />,
      title: 'Secure & audited',
      desc: 'Encryption in transit and a complete audit trail.',
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BRAND.bg }}>
      {/* ── Left: platform details ─────────────────────────────────── */}
      {!isMdDown && (
        <Box
          sx={{
            position: 'relative',
            flex: '0 0 50%',
            maxWidth: '50%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: { md: 6, lg: 8 },
            color: '#fff',
            background: `linear-gradient(150deg, ${BRAND.primary} 0%, ${BRAND.primary600} 45%, ${BRAND.accent} 100%)`,
          }}
        >
          <Blob color="#FFFFFF"       size={420} top={-140} right={-120} opacity={0.10} />
          <Blob color={BRAND.accent2} size={460} bottom={-180} left={-120} opacity={0.28} />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(${alpha('#FFFFFF', 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#FFFFFF', 0.07)} 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse at 30% 30%, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 30% 30%, black 20%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Brand */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <BrandLogo height={64} onDark onClick={() => navigate('/')} />
          </Box>

          {/* Headline + features */}
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
            <Chip
              icon={<Verified sx={{ color: '#FFFFFF !important', fontSize: '14px !important' }} />}
              label="Account security & recovery"
              size="small"
              sx={{
                bgcolor: alpha('#FFFFFF', 0.16),
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.7rem',
                border: `1px solid ${alpha('#FFFFFF', 0.25)}`,
                mb: 3,
              }}
            />
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{ letterSpacing: '-1px', lineHeight: 1.1, mb: 2, fontSize: { md: '2.2rem', lg: '2.7rem' } }}
            >
              Get back into your account, securely.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#FFFFFF', 0.85), lineHeight: 1.7, maxWidth: 440 }}>
              Reset your password with a one-time code — your hospital data stays protected
              every step of the way.
            </Typography>

            <Stack spacing={2.25} sx={{ mt: 4.5 }}>
              {features.map((f) => (
                <Stack key={f.title} direction="row" spacing={1.75} alignItems="flex-start">
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha('#FFFFFF', 0.14),
                      color: '#fff',
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography fontWeight={700} sx={{ lineHeight: 1.3 }}>{f.title}</Typography>
                    <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.75) }}>{f.desc}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Trust footer */}
          <Stack direction="row" spacing={3} sx={{ position: 'relative', zIndex: 1, flexWrap: 'wrap', rowGap: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Shield sx={{ fontSize: 16, color: '#fff' }} />
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.85), fontWeight: 600 }}>
                Encrypted & audited
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <HealthAndSafety sx={{ fontSize: 16, color: '#fff' }} />
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.85), fontWeight: 600 }}>
                ABDM certification-ready
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ── Right: reset form ──────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          px: { xs: 2.5, sm: 4 },
          py: { xs: 6, md: 8 },
        }}
      >
        <Blob color={BRAND.accent2} size={360} top={-120} right={-120} opacity={0.12} />
        <Blob color={BRAND.emerald} size={320} bottom={-120} left={-120} opacity={0.10} />

        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>
          {/* Logo shown here only when the left panel is hidden (mobile/tablet) */}
          {isMdDown && (
            <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
              <BrandLogo height={72} onClick={() => navigate('/')} />
            </Stack>
          )}

        <Chip
          icon={<Verified sx={{ color: `${BRAND.primary600} !important`, fontSize: '14px !important' }} />}
          label="Account recovery"
          size="small"
          sx={{
            bgcolor: alpha(BRAND.primary, 0.08),
            color: BRAND.primary600,
            fontWeight: 700,
            border: `1px solid ${alpha(BRAND.primary, 0.18)}`,
            mb: 2,
          }}
        />

        <Typography variant="h4" fontWeight={800} sx={{ color: BRAND.ink, letterSpacing: '-0.5px', mb: 1 }}>
          {activeStep === 2 ? 'All done!' : 'Forgot password?'}
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND.ink500, mb: 3 }}>
          {activeStep === 0 && "Enter your account email and we'll send you a 6-digit reset code."}
          {activeStep === 1 && 'Enter the code we sent along with your new password.'}
          {activeStep === 2 && 'Your password has been reset successfully.'}
        </Typography>

        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 4,
            '& .MuiStepLabel-label': { color: BRAND.ink500, fontSize: '0.78rem' },
            '& .Mui-active .MuiStepLabel-label': { color: BRAND.primary600, fontWeight: 700 },
            '& .Mui-completed .MuiStepLabel-label': { color: BRAND.emerald },
            '& .MuiStepIcon-root': { color: BRAND.hairline },
            '& .MuiStepIcon-root.Mui-active': { color: BRAND.primary },
            '& .MuiStepIcon-root.Mui-completed': { color: BRAND.emerald },
          }}
        >
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        {/* Step 0: Email */}
        {activeStep === 0 && (
          <form onSubmit={handleSendCode}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={labelSx}>Email address</Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
                placeholder="your@email.com"
                sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: BRAND.ink500, fontSize: 18 }} /></InputAdornment> }}
              />
            </Box>
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} endIcon={!loading && <ArrowForward />} sx={primaryBtnSx}>
              {loading ? 'Sending…' : 'Send reset code'}
            </Button>
          </form>
        )}

        {/* Step 1: OTP + new password */}
        {activeStep === 1 && (
          <form onSubmit={handleResetPassword}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={labelSx}>Reset code (6-digit OTP)</Typography>
              <TextField
                fullWidth
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                required
                placeholder="123456"
                inputProps={{ maxLength: 6 }}
                sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: BRAND.ink500, fontSize: 18 }} /></InputAdornment> }}
              />
            </Box>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={labelSx}>New password</Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                required
                placeholder="••••••••"
                sx={inputSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: BRAND.ink500, fontSize: 18 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: BRAND.ink500 }}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={labelSx}>Confirm password</Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                required
                placeholder="••••••••"
                sx={inputSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: BRAND.ink500, fontSize: 18 }} /></InputAdornment> }}
                error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                helperText={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
              />
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => { setActiveStep(0); setError(''); }}
                sx={{ flex: 1, borderColor: BRAND.hairline, color: BRAND.ink600, py: 1.4, borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: BRAND.surface, '&:hover': { borderColor: BRAND.primary600, color: BRAND.primary600 } }}
              >
                Back
              </Button>
              <Button type="submit" variant="contained" size="large" disabled={loading || otp.length !== 6 || newPassword.length < 6} sx={{ ...primaryBtnSx, flex: 2, py: 1.4 }}>
                {loading ? 'Resetting…' : 'Reset password'}
              </Button>
            </Stack>
          </form>
        )}

        {/* Step 2: Success */}
        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: BRAND.emerald, mb: 2 }} />
            <Typography variant="h6" sx={{ color: BRAND.ink, fontWeight: 700, mb: 1 }}>
              Password reset complete
            </Typography>
            <Typography variant="body2" sx={{ color: BRAND.ink500, mb: 4 }}>
              You can now sign in with your new password.
            </Typography>
            <Button fullWidth variant="contained" size="large" onClick={() => navigate('/login')} endIcon={<ArrowForward />} sx={primaryBtnSx}>
              Go to login
            </Button>
          </Box>
        )}

        {/* Back to login */}
        {activeStep !== 2 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/login')} sx={{ color: BRAND.ink500, textTransform: 'none', fontWeight: 600, '&:hover': { color: BRAND.primary600 } }}>
              Back to login
            </Button>
          </Box>
        )}
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
