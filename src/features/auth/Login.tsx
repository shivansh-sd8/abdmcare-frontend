// Login page for AbhaAyushman.
//
// Shares the visual language of LandingPage.tsx — soft cream surface, deep
// teal/emerald gradient brand, slate text. The form lives in a single centred
// glass card so the page feels welcoming on any screen size and matches the
// rest of the marketing/brand surface.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowForward,
  Email,
  HealthAndSafety,
  Lock,
  LocalHospital,
  Verified,
  Visibility,
  VisibilityOff,
  Shield,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import BrandLogo from '../../components/common/BrandLogo';

/* ── theme tokens (kept in sync with LandingPage.tsx) ─────────── */
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

/** Soft blurred blob — same primitive as on the landing page. */
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

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        // Send/receive httpOnly cookies so the axios interceptor can fall back
        // to cookie-based refresh too.
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.data.token);
        // Persist refresh token so the api interceptor can silently refresh
        // expired access tokens instead of bouncing the user back to /login.
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.data.user));
        dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
        toast.success('Welcome back!');
        navigate('/app/dashboard');
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

  const fieldStyles = {
    mt: 0.75,
    '& .MuiOutlinedInput-root': {
      bgcolor: BRAND.surface,
      color: BRAND.ink,
      borderRadius: 2,
      transition: 'border-color .2s ease, box-shadow .2s ease',
      '& fieldset': { borderColor: BRAND.hairline },
      '&:hover fieldset': { borderColor: alpha(BRAND.primary600, 0.5) },
      '&.Mui-focused fieldset': {
        borderColor: BRAND.primary600,
        borderWidth: 1.5,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 4px ${alpha(BRAND.primary600, 0.12)}`,
      },
      '& input::placeholder': { color: alpha(BRAND.ink, 0.35) },
    },
  } as const;

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: BRAND.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        px: 2,
        py: { xs: 6, md: 8 },
      }}
    >
      {/* Ambient background — same vocabulary as LandingPage hero */}
      <Blob color={BRAND.primary}  size={520} top={-160} left={-160} opacity={0.18} />
      <Blob color={BRAND.accent2}  size={460} top={120}  right={-120} opacity={0.18} />
      <Blob color={BRAND.emerald}  size={380} bottom={-120} left="35%" opacity={0.12} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${alpha(BRAND.primary, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(BRAND.primary, 0.06)} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          bgcolor: alpha(BRAND.surface, 0.85),
          backdropFilter: 'blur(18px)',
          border: `1px solid ${BRAND.hairline}`,
          borderRadius: 4,
          p: { xs: 3.5, sm: 5 },
          boxShadow: `0 30px 60px -20px ${alpha(BRAND.primary, 0.25)}`,
        }}
      >
        {/* Brand row */}
        <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
          <BrandLogo height={64} onClick={() => navigate('/')} />
        </Stack>

        <Chip
          icon={<Verified sx={{ color: `${BRAND.primary600} !important`, fontSize: '14px !important' }} />}
          label="Secure sign in"
          size="small"
          sx={{
            bgcolor: alpha(BRAND.primary, 0.08),
            color: BRAND.primary600,
            fontWeight: 700,
            fontSize: '0.7rem',
            border: `1px solid ${alpha(BRAND.primary, 0.18)}`,
            mb: 2,
          }}
        />

        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: BRAND.ink, letterSpacing: '-0.5px', mb: 1, fontSize: { xs: '1.7rem', sm: '2rem' } }}
        >
          Welcome back
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND.ink500, mb: 3.5 }}>
          Sign in to continue to your hospital workspace.
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2.5,
              bgcolor: alpha('#EF4444', 0.06),
              color: '#B91C1C',
              border: `1px solid ${alpha('#EF4444', 0.25)}`,
              '& .MuiAlert-icon': { color: '#EF4444' },
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              sx={{ color: BRAND.ink500, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              Email address
            </Typography>
            <TextField
              fullWidth
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
              placeholder="you@hospital.com"
              sx={fieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: BRAND.ink500, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                variant="caption"
                sx={{ color: BRAND.ink500, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: '0.7rem' }}
              >
                Password
              </Typography>
              <Link
                to="/forgot-password"
                style={{
                  color: BRAND.primary600,
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                Forgot?
              </Link>
            </Stack>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              placeholder="Enter your password"
              sx={fieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: BRAND.ink500, fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{ color: BRAND.ink500, '&:hover': { color: BRAND.ink } }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            endIcon={!loading && <ArrowForward />}
            sx={{
              mt: 2.5,
              background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
              color: 'white',
              py: 1.55,
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 2.5,
              textTransform: 'none',
              boxShadow: `0 10px 30px ${alpha(BRAND.primary, 0.35)}`,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: `0 14px 38px ${alpha(BRAND.primary, 0.45)}`,
              },
              '&:disabled': {
                background: alpha(BRAND.primary, 0.4),
                color: alpha('#FFFFFF', 0.7),
              },
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Footer microcopy — replaces the old Super-Admin signup CTA */}
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: `1px solid ${BRAND.hairline}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: BRAND.ink500, display: 'block', mb: 0.5 }}>
            New to AbhaAyushman?
          </Typography>
          <Typography variant="body2" sx={{ color: BRAND.ink600, fontWeight: 500 }}>
            Accounts are provisioned by your hospital administrator.{' '}
            <Box
              component="span"
              onClick={() => navigate('/')}
              sx={{
                color: BRAND.primary600,
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Learn more
            </Box>
            .
          </Typography>
        </Box>

        {/* Trust badges */}
        {!isSmall && (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            {[
              { icon: <Shield sx={{ fontSize: 14, color: BRAND.primary600 }} />, label: 'Encrypted & audited' },
              { icon: <HealthAndSafety sx={{ fontSize: 14, color: BRAND.emerald }} />, label: 'ABDM integration' },
            ].map((b) => (
              <Stack key={b.label} direction="row" spacing={0.6} alignItems="center">
                {b.icon}
                <Typography variant="caption" sx={{ color: BRAND.ink500, fontWeight: 500 }}>
                  {b.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Login;
