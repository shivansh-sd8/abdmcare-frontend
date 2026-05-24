import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Chip,
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
  AdminPanelSettings,
  Key,
  LocalHospital,
  Verified,
  Shield,
  ArrowForward,
  ArrowBack,
  Person,
  Email,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/* ── tiny decorative blob ─────────────────────────────────── */
const Blob: React.FC<{ color: string; size: number; top?: string | number; bottom?: string | number; left?: string | number; right?: string | number; opacity?: number }> = ({
  color, size, top, bottom, left, right, opacity = 0.2,
}) => (
  <Box sx={{ position: 'absolute', top, bottom, left, right, width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(90px)', opacity, pointerEvents: 'none' }} />
);

/* ── styled dark text field ─────────────────────────────── */
const DarkField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  helperText?: string;
  placeholder?: string;
  startIcon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}> = ({ label, name, value, onChange, type = 'text', required, helperText, placeholder, startIcon, endAdornment }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.68rem' }}>
      {label}{required && ' *'}
    </Typography>
    <TextField
      fullWidth
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      helperText={helperText}
      sx={{
        mt: 0.75,
        '& .MuiOutlinedInput-root': {
          bgcolor: alpha('#fff', 0.04),
          color: 'white',
          borderRadius: 2,
          '& fieldset': { borderColor: alpha('#fff', 0.1) },
          '&:hover fieldset': { borderColor: alpha('#fff', 0.25) },
          '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: 1 },
          '& input::placeholder': { color: alpha('#fff', 0.2) },
        },
        '& .MuiFormHelperText-root': { color: alpha('#fff', 0.35) },
      }}
      InputProps={{
        startAdornment: startIcon
          ? <InputAdornment position="start">{startIcon}</InputAdornment>
          : undefined,
        endAdornment: endAdornment
          ? <InputAdornment position="end">{endAdornment}</InputAdornment>
          : undefined,
      }}
    />
  </Box>
);

const SuperAdminSignup: React.FC = () => {
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '', secretKey: '',
  });
  const [showPassword, setShowPassword]   = useState(false);
  const [showSecret, setShowSecret]       = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [activeStep, setActiveStep]       = useState(0);

  const steps = ['Your Details', 'Credentials', 'Secret Key'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleNext = () => {
    if (activeStep === 0 && (!formData.firstName || !formData.lastName || !formData.username)) {
      setError('Please fill in all required fields'); return;
    }
    if (activeStep === 1) {
      if (!formData.email || !formData.password) { setError('Please fill in all required fields'); return; }
      if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    }
    setError('');
    setActiveStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.secretKey) { setError('Secret key is required'); return; }
    try {
      setLoading(true);
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/super-admin-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName, lastName: formData.lastName,
          username: formData.username, email: formData.email,
          password: formData.password, secretKey: formData.secretKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Signup failed');
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0A0A0F' }}>

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 42%',
            position: 'relative',
            background: 'linear-gradient(150deg, #1a0533 0%, #302B63 55%, #0f172a 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 6,
            overflow: 'hidden',
          }}
        >
          <Blob color="#8B5CF6" size={500} top="-80px" left="-80px" />
          <Blob color="#6366F1" size={400} bottom="-60px" right="-60px" />
          <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${alpha('#8B5CF6', 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#8B5CF6', 0.06)} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/login')}
              sx={{ color: alpha('#fff', 0.45), '&:hover': { color: 'white' }, textTransform: 'none', fontWeight: 500, pl: 0 }}
            >
              Back to sign in
            </Button>
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.35rem" color="white" letterSpacing="-0.5px">
                AbhaAyushman
              </Typography>
            </Stack>

            <Chip
              icon={<AdminPanelSettings sx={{ color: '#C4B5FD !important', fontSize: '15px !important' }} />}
              label="Super Admin Setup"
              sx={{ bgcolor: alpha('#8B5CF6', 0.15), color: '#C4B5FD', fontWeight: 700, fontSize: '0.72rem', mb: 3, border: `1px solid ${alpha('#8B5CF6', 0.3)}` }}
            />

            <Typography variant="h3" fontWeight={800} color="white" sx={{ lineHeight: 1.2, letterSpacing: '-1px', mb: 2 }}>
              Set up your
              <Box component="span" sx={{ display: 'block', background: 'linear-gradient(90deg, #C4B5FD, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                hospital platform
              </Box>
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.55), lineHeight: 1.85, maxWidth: 360 }}>
              Create the first Super Admin account to get your hospital onboarded onto AbhaAyushman.
            </Typography>

            {/* Steps preview */}
            <Stack spacing={1.5} sx={{ mt: 5 }}>
              {[
                'Fill in your personal details',
                'Set secure login credentials',
                'Verify with the secret key',
              ].map((s, i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{
                    width: 26, height: 26, borderRadius: '50%',
                    bgcolor: i <= activeStep ? alpha('#8B5CF6', 0.6) : alpha('#fff', 0.07),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${i <= activeStep ? alpha('#8B5CF6', 0.6) : alpha('#fff', 0.1)}`,
                    flexShrink: 0,
                  }}>
                    <Typography fontSize="0.7rem" fontWeight={700} color={i <= activeStep ? 'white' : alpha('#fff', 0.3)}>{i + 1}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: i <= activeStep ? alpha('#fff', 0.8) : alpha('#fff', 0.35) }}>{s}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
            {[
              { icon: <Shield sx={{ fontSize: 14 }} />, label: 'Secured with encryption', color: '#C4B5FD' },
              { icon: <Verified sx={{ fontSize: 14 }} />, label: 'ABDM Integration Ready', color: '#818CF8' },
            ].map((b) => (
              <Stack key={b.label} direction="row" spacing={0.6} alignItems="center">
                <Box sx={{ color: b.color }}>{b.icon}</Box>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.4) }}>{b.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── RIGHT PANEL — form ────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          bgcolor: '#0D0D14',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 460, py: 2 }}>

          {/* Mobile logo */}
          {isMobile && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 5, justifyContent: 'center' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.2rem" color="white">AbhaAyushman</Typography>
            </Stack>
          )}

          <Typography variant="h4" fontWeight={800} color="white" letterSpacing="-0.5px" gutterBottom>
            Create Super Admin
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.4), mb: 3.5 }}>
            Step {activeStep + 1} of 3 — {steps[activeStep]}
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4, '& .MuiStepLabel-label': { color: alpha('#fff', 0.4), fontSize: '0.75rem' }, '& .MuiStepLabel-label.Mui-active': { color: '#C4B5FD' }, '& .MuiStepLabel-label.Mui-completed': { color: '#4ADE80' }, '& .MuiStepIcon-root': { color: alpha('#fff', 0.15) }, '& .MuiStepIcon-root.Mui-active': { color: '#8B5CF6' }, '& .MuiStepIcon-root.Mui-completed': { color: '#4ADE80' }, '& .MuiStepConnector-line': { borderColor: alpha('#fff', 0.1) } }}>
            {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: `1px solid ${alpha('#EF4444', 0.3)}`, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 0 — personal details */}
            {activeStep === 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DarkField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="Rajesh" startIcon={<Person sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />} />
                  <DarkField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Kumar" />
                </Box>
                <DarkField label="Username" name="username" value={formData.username} onChange={handleChange} required placeholder="rajesh_admin" helperText="Minimum 3 characters" startIcon={<Person sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />} />
              </>
            )}

            {/* Step 1 — credentials */}
            {activeStep === 1 && (
              <>
                <DarkField label="Email Address" name="email" value={formData.email} onChange={handleChange} type="email" required placeholder="admin@hospital.com" startIcon={<Email sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />} />
                <DarkField
                  label="Password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  helperText="Minimum 8 characters"
                  startIcon={<Lock sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />}
                  endAdornment={
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: alpha('#fff', 0.3), '&:hover': { color: alpha('#fff', 0.7) } }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  }
                />
                <DarkField
                  label="Confirm Password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  startIcon={<Lock sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />}
                />
              </>
            )}

            {/* Step 2 — secret key */}
            {activeStep === 2 && (
              <>
                <Alert
                  severity="warning"
                  sx={{ mb: 3, bgcolor: alpha('#F59E0B', 0.08), color: '#FCD34D', border: `1px solid ${alpha('#F59E0B', 0.25)}`, '& .MuiAlert-icon': { color: '#FCD34D' } }}
                >
                  <Typography variant="body2" fontWeight={700} gutterBottom>Secret Key Required</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    You need the Super Admin secret key configured in the backend environment to create this account.
                  </Typography>
                </Alert>
                <DarkField
                  label="Super Admin Secret Key"
                  name="secretKey"
                  value={formData.secretKey}
                  onChange={handleChange}
                  type={showSecret ? 'text' : 'password'}
                  required
                  placeholder="Enter secret key"
                  startIcon={<Key sx={{ color: alpha('#fff', 0.25), fontSize: 18 }} />}
                  endAdornment={
                    <IconButton onClick={() => setShowSecret(!showSecret)} edge="end" sx={{ color: alpha('#fff', 0.3), '&:hover': { color: alpha('#fff', 0.7) } }}>
                      {showSecret ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  }
                />
              </>
            )}

            {/* Navigation buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              {activeStep > 0 && (
                <Button
                  variant="outlined"
                  onClick={() => { setError(''); setActiveStep((s) => s - 1); }}
                  sx={{ flex: '0 0 auto', borderColor: alpha('#fff', 0.12), color: alpha('#fff', 0.5), borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1.5, '&:hover': { borderColor: alpha('#fff', 0.25), color: 'white' } }}
                >
                  Back
                </Button>
              )}
              {activeStep < 2 ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  sx={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: 'white', py: 1.6, fontSize: '0.95rem', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: '0 8px 32px rgba(139,92,246,0.35)', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 12px 40px rgba(139,92,246,0.45)' }, transition: 'all 0.2s' }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  endIcon={!loading && <ArrowForward />}
                  sx={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: 'white', py: 1.6, fontSize: '0.95rem', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: '0 8px 32px rgba(139,92,246,0.35)', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 12px 40px rgba(139,92,246,0.45)' }, '&:disabled': { background: alpha('#8B5CF6', 0.4), color: alpha('#fff', 0.5) }, transition: 'all 0.2s' }}
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
                </Button>
              )}
            </Stack>
          </form>

          <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${alpha('#fff', 0.07)}`, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.3) }}>Already have an account?</Typography>
            <Button onClick={() => navigate('/login')} sx={{ color: '#818CF8', textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', ml: 0.5 }}>
              Sign in
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SuperAdminSignup;
