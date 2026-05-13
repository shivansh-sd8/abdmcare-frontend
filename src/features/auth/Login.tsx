import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Stack,
  Chip,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  LocalHospital,
  Verified,
  Shield,
  Groups,
  ArrowForward,
  ArrowBack,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

/* ── tiny decorative blob ─────────────────────────────────── */
const Blob: React.FC<{ color: string; size: number; top?: string | number; bottom?: string | number; left?: string | number; right?: string | number; opacity?: number }> = ({
  color, size, top, bottom, left, right, opacity = 0.2,
}) => (
  <Box sx={{ position: 'absolute', top, bottom, left, right, width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(90px)', opacity, pointerEvents: 'none' }} />
);

const Login: React.FC = () => {
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const msg = data.message || 'Invalid credentials';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0A0A0F' }}>

      {/* ── LEFT PANEL — branding ─────────────────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 46%',
            position: 'relative',
            background: 'linear-gradient(150deg, #0F0C29 0%, #302B63 55%, #24243e 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 6,
            overflow: 'hidden',
          }}
        >
          <Blob color="#6366F1" size={500} top="-80px" left="-80px" />
          <Blob color="#0EA5E9" size={400} bottom="-60px" right="-60px" />

          {/* Grid overlay */}
          <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${alpha('#6366F1', 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#6366F1', 0.06)} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

          {/* Back to home */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/landing')}
              sx={{ color: alpha('#fff', 0.5), '&:hover': { color: 'white' }, textTransform: 'none', fontWeight: 500, pl: 0 }}
            >
              Back to home
            </Button>
          </Box>

          {/* Center content */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.35rem" color="white" letterSpacing="-0.5px">
                AbhaAyushman
              </Typography>
            </Stack>

            <Chip
              icon={<Verified sx={{ color: '#818CF8 !important', fontSize: '15px !important' }} />}
              label="ABDM Integration Ready"
              sx={{ bgcolor: alpha('#818CF8', 0.12), color: '#818CF8', fontWeight: 700, fontSize: '0.72rem', mb: 3, border: `1px solid ${alpha('#818CF8', 0.25)}` }}
            />

            <Typography variant="h3" fontWeight={800} color="white" sx={{ lineHeight: 1.2, letterSpacing: '-1px', mb: 2 }}>
              India's Smartest
              <Box component="span" sx={{ display: 'block', background: 'linear-gradient(90deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Hospital Platform
              </Box>
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), lineHeight: 1.8, maxWidth: 380 }}>
              Unified OPD, IPD, Lab, Pharmacy, and Billing — built for modern Indian healthcare with ABDM integration capabilities.
            </Typography>

            {/* Mini stats */}
            <Stack direction="row" spacing={2} sx={{ mt: 5 }}>
              {[
                { v: '8+', l: 'Modules' },
                { v: '10+', l: 'Roles' },
                { v: 'FHIR', l: 'Ready' },
              ].map((s) => (
                <Box key={s.l} sx={{ textAlign: 'center', px: 2.5, py: 1.5, borderRadius: 2, bgcolor: alpha('#fff', 0.06), border: `1px solid ${alpha('#fff', 0.1)}` }}>
                  <Typography fontWeight={800} color="white" fontSize="1.3rem" lineHeight={1}>{s.v}</Typography>
                  <Typography fontSize="0.7rem" sx={{ color: alpha('#fff', 0.5), mt: 0.3 }}>{s.l}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Bottom trust badges */}
          <Stack direction="row" spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
            {[
              { icon: <Shield sx={{ fontSize: 14 }} />, label: 'Secure & Compliant', color: '#818CF8' },
              { icon: <Groups sx={{ fontSize: 14 }} />, label: 'Enterprise Grade', color: '#38BDF8' },
            ].map((b) => (
              <Stack key={b.label} direction="row" spacing={0.6} alignItems="center">
                <Box sx={{ color: b.color }}>{b.icon}</Box>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.45) }}>{b.label}</Typography>
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
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>

          {/* Mobile logo */}
          {isMobile && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 5, justifyContent: 'center' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LocalHospital sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography fontWeight={800} fontSize="1.2rem" color="white">AbhaAyushman</Typography>
            </Stack>
          )}

          {/* Heading */}
          <Typography variant="h4" fontWeight={800} color="white" letterSpacing="-0.5px" gutterBottom>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.45), mb: 4 }}>
            Sign in to continue to your dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: `1px solid ${alpha('#EF4444', 0.3)}`, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Email Address
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                placeholder="doctor@hospital.com"
                sx={{
                  mt: 0.75,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha('#fff', 0.04),
                    color: 'white',
                    borderRadius: 2,
                    '& fieldset': { borderColor: alpha('#fff', 0.1) },
                    '&:hover fieldset': { borderColor: alpha('#fff', 0.25) },
                    '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: 1 },
                    '& input::placeholder': { color: alpha('#fff', 0.25) },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Password
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                placeholder="••••••••"
                sx={{
                  mt: 0.75,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha('#fff', 0.04),
                    color: 'white',
                    borderRadius: 2,
                    '& fieldset': { borderColor: alpha('#fff', 0.1) },
                    '&:hover fieldset': { borderColor: alpha('#fff', 0.25) },
                    '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: 1 },
                    '& input::placeholder': { color: alpha('#fff', 0.25) },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: alpha('#fff', 0.3), '&:hover': { color: alpha('#fff', 0.7) } }}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ textAlign: 'right', mb: 3.5 }}>
              <Link to="/forgot-password" style={{ color: '#818CF8', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              endIcon={!loading && <ArrowForward />}
              sx={{
                background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                color: 'white',
                py: 1.6,
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 12px 40px rgba(99,102,241,0.45)' },
                '&:disabled': { background: alpha('#6366F1', 0.4), color: alpha('#fff', 0.5) },
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ mt: 5, pt: 4, borderTop: `1px solid ${alpha('#fff', 0.07)}` }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.3), display: 'block', textAlign: 'center', mb: 2 }}>
              First time here?
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/super-admin-signup')}
              sx={{
                borderColor: alpha('#fff', 0.12),
                color: alpha('#fff', 0.6),
                py: 1.3,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: alpha('#6366F1', 0.6), color: '#818CF8', bgcolor: alpha('#6366F1', 0.05) },
              }}
            >
              Create Super Admin Account
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
