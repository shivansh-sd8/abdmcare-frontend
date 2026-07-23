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
  CheckCircle,
  Email,
  HealthAndSafety,
  Lock,
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
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));

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
          <Blob color="#FFFFFF"      size={420} top={-140} right={-120} opacity={0.10} />
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
              label="Hospital Information Management System"
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
              Run your entire hospital on one platform.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#FFFFFF', 0.85), lineHeight: 1.7, maxWidth: 440 }}>
              OPD, IPD, lab, pharmacy, billing and ABDM — wired together end-to-end so your
              team spends less time on paperwork and more on care.
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

      {/* ── Right: sign-in form ────────────────────────────────────── */}
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
        {/* Subtle ambience on the form side */}
        <Blob color={BRAND.accent2} size={360} top={-120} right={-120} opacity={0.12} />
        <Blob color={BRAND.emerald} size={320} bottom={-120} left={-120} opacity={0.10} />

        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          {/* Logo shown here only when the left panel is hidden (mobile/tablet) */}
          {isMdDown && (
            <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
              <BrandLogo height={72} onClick={() => navigate('/')} />
            </Stack>
          )}

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

          {/* Footer microcopy */}
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${BRAND.hairline}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: BRAND.ink500, display: 'block', mb: 0.5 }}>
              New to Abha Ayushman?
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
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
