// Landing page for AbhaAyushman.
//
// Design language (shared with Login.tsx): a clean, light healthcare aesthetic —
// soft cream surfaces, deep teal/emerald gradient as the brand, slate text, and
// generous radii. Distinct from the older purple-night theme; both pages now
// feel like one product.

/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EnquiryDialog from '../features/landing/EnquiryDialog';
import BrandLogo from '../components/common/BrandLogo';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Drawer,
  Fade,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountCircle,
  ArrowForward,
  AutoAwesome,
  BedroomParent,
  Biotech,
  CheckCircle,
  Close,
  EventNote,
  Groups,
  HealthAndSafety,
  LocalHospital,
  MedicalServices,
  Menu as MenuIcon,
  MonitorHeart,
  Payments,
  People,
  Science,
  Shield,
  TrendingUp,
  Verified,
} from '@mui/icons-material';

/* ── theme tokens (shared with Login.tsx) ─────────────────────────── */
const BRAND = {
  primary:    '#0F766E', // teal-700
  primary600: '#0D9488', // teal-600
  accent:     '#14B8A6', // teal-400
  accent2:    '#22D3EE', // sky-300/cyan
  emerald:    '#10B981',
  ink:        '#0F172A', // slate-900
  ink600:     '#334155', // slate-700
  ink500:     '#475569', // slate-600
  bg:         '#F6FBF9', // very light teal-tinted cream
  surface:    '#FFFFFF',
  hairline:   '#E2E8F0', // slate-200
};

/** Soft blurred blob used as ambient background decoration. */
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

/** Tiny icon-prefixed feature line. */
const FeatureLine: React.FC<{ label: string }> = ({ label }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <CheckCircle sx={{ color: BRAND.emerald, fontSize: 18 }} />
    <Typography variant="body2" sx={{ color: BRAND.ink500 }}>{label}</Typography>
  </Stack>
);

/** Module card on the modules grid. */
const ModuleCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  roles: string[];
}> = ({ icon, title, desc, color, roles }) => (
  <Card
    elevation={0}
    sx={{
      height: '100%',
      borderRadius: 4,
      border: `1px solid ${BRAND.hairline}`,
      bgcolor: BRAND.surface,
      transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: alpha(color, 0.4),
        boxShadow: `0 18px 40px ${alpha(color, 0.18)}`,
      },
    }}
  >
    <CardContent sx={{ p: 3.5 }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2.5,
          bgcolor: alpha(color, 0.1),
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ color: BRAND.ink, mb: 0.75 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: BRAND.ink500, lineHeight: 1.7, mb: 2 }}>
        {desc}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {roles.map((r) => (
          <Chip
            key={r}
            label={r}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.08),
              color,
              fontWeight: 600,
              fontSize: '0.7rem',
              border: 'none',
            }}
          />
        ))}
      </Stack>
    </CardContent>
  </Card>
);

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquirySource, setEnquirySource] = useState<string>('landing');

  const openEnquiry = useCallback((source: string) => {
    setEnquirySource(source);
    setEnquiryOpen(true);
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/app/dashboard', { replace: true });
      return;
    }
    setVisible(true);
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [navigate]);

  // Replace placeholders so the file parses without ESLint complaints from the
  // template-literal scanner (this is content that is rendered statically).
  const heroEyebrow = 'ABDM M1 · M2 · M3 — Integration Complete';

  const navLinks = [
    { label: 'Modules',      path: '#modules' },
    { label: 'Capabilities', path: '#capabilities' },
    { label: 'Roles',        path: '#roles' },
    { label: 'Why us',       path: '#trust' },
  ];

  const heroStats = [
    { value: '8+',   label: 'Clinical modules' },
    { value: '7',    label: 'Staff roles supported' },
    { value: 'M1–M3', label: 'ABDM milestones integrated' },
    { value: '24/7', label: 'Operational reliability' },
  ];

  const modules = [
    {
      icon: <EventNote />,
      title: 'OPD & Appointments',
      desc: 'Smart scheduling, consultation notes, prescriptions and instant billing for outpatient visits.',
      color: BRAND.primary600,
      roles: ['Doctor', 'Receptionist', 'Nurse'],
    },
    {
      icon: <BedroomParent />,
      title: 'IPD Management',
      desc: 'Admissions, daily rounds, vitals tracking, ward allocation and discharge with itemized billing.',
      color: '#0EA5E9',
      roles: ['Doctor', 'Nurse', 'Admin'],
    },
    {
      icon: <Biotech />,
      title: 'Lab & Investigations',
      desc: 'Structured result entry, auto-generated lab PDFs, reference ranges and live test status updates.',
      color: BRAND.emerald,
      roles: ['Lab Tech', 'Doctor'],
    },
    {
      icon: <MedicalServices />,
      title: 'Pharmacy',
      desc: 'Prescription queue, real-time stock visibility and automatic medicine charges added to the patient bill.',
      color: '#F59E0B',
      roles: ['Pharmacist', 'Admin'],
    },
    {
      icon: <Payments />,
      title: 'Billing & Payments',
      desc: 'Transparent itemized billing across consultation, lab, pharmacy and ward charges with receipts.',
      color: '#EF4444',
      roles: ['Receptionist', 'Billing'],
    },
    {
      icon: <HealthAndSafety />,
      title: 'ABHA & Consent',
      desc: 'ABHA ID creation, care-context linking and consent flows — fully ABDM compliant per hospital.',
      color: '#8B5CF6',
      roles: ['Admin', 'Doctor'],
    },
    {
      icon: <MonitorHeart />,
      title: 'EHR & Vitals',
      desc: 'Complete electronic records with vitals timeline, encounter history and downloadable summaries.',
      color: '#EC4899',
      roles: ['Doctor', 'Nurse'],
    },
    {
      icon: <People />,
      title: 'Multi-Hospital Admin',
      desc: 'Run multiple facilities under one roof with separate ABDM identities, plan limits and audit history.',
      color: '#14B8A6',
      roles: ['Super Admin', 'Admin'],
    },
  ];

  const capabilities = [
    'End-to-end OPD + IPD workflow',
    'ABDM M1, M2 & M3 integrated per hospital',
    'Granular role-based access',
    'Automated itemized billing',
    'Lab reports as ready-to-share PDFs',
    'Real-time pharmacy stock visibility',
    'Live analytics & operational dashboards',
    'Multi-hospital from day one',
    'Complete audit trail for every action',
    'Works beautifully on mobile',
  ];

  const roles = [
    { role: 'Doctor',         color: BRAND.primary600, icon: <AccountCircle />,    perms: ['OPD consults', 'IPD rounds', 'E-prescriptions', 'Lab orders', 'EHR access'] },
    { role: 'Nurse',          color: '#0EA5E9',        icon: <MedicalServices />,  perms: ['Vitals', 'Care notes', 'Medication tracking', 'Admission support'] },
    { role: 'Receptionist',   color: BRAND.emerald,    icon: <EventNote />,        perms: ['Registration', 'Appointments', 'OPD billing', 'ABHA assist'] },
    { role: 'Lab Technician', color: '#F59E0B',        icon: <Biotech />,          perms: ['Investigation queue', 'Result entry', 'Lab PDFs', 'Status updates'] },
    { role: 'Pharmacist',     color: '#EF4444',        icon: <Science />,          perms: ['Prescription queue', 'Dispense', 'Stock tracking', 'Charge capture'] },
    { role: 'Admin',          color: '#8B5CF6',        icon: <Shield />,           perms: ['Hospital config', 'Users', 'Pricing', 'Analytics & audit'] },
  ];

  return (
    <Box sx={{ bgcolor: BRAND.bg, minHeight: '100vh', overflowX: 'hidden', color: BRAND.ink }}>

      {/* ── Sticky navbar ──────────────────────────────────────────── */}
      <AppBar
        elevation={0}
        sx={{
          bgcolor: scrolled ? alpha('#FFFFFF', 0.85) : 'transparent',
          backdropFilter: scrolled ? 'blur(18px)' : 'none',
          borderBottom: scrolled ? `1px solid ${BRAND.hairline}` : 'none',
          color: BRAND.ink,
          transition: 'background-color .25s ease, border-color .25s ease',
        }}
      >
        <Toolbar sx={{ py: 0.75, maxWidth: 1240, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          <Stack direction="row" alignItems="center" sx={{ flexGrow: 1 }}>
            <BrandLogo height={64} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          </Stack>

          {!isMobile && (
            <Stack direction="row" spacing={4} alignItems="center" sx={{ mr: 4 }}>
              {navLinks.map((link) => (
                <Typography
                  key={link.label}
                  variant="body2"
                  fontWeight={600}
                  onClick={() => {
                    if (link.path.startsWith('/')) navigate(link.path);
                    else document.querySelector(link.path)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{
                    cursor: 'pointer',
                    color: BRAND.ink600,
                    '&:hover': { color: BRAND.primary600 },
                    transition: 'color 0.2s',
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={1.25} alignItems="center">
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{
                color: BRAND.ink600,
                fontWeight: 600,
                textTransform: 'none',
                display: { xs: 'none', sm: 'flex' },
                '&:hover': { color: BRAND.primary600, background: 'transparent' },
              }}
            >
              Sign in
            </Button>
            <Button
              variant="contained"
              onClick={() => openEnquiry('navbar')}
              endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                color: 'white',
                fontWeight: 700,
                px: 2.5,
                py: 0.9,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: `0 6px 20px ${alpha(BRAND.primary, 0.3)}`,
                '&:hover': { boxShadow: `0 10px 28px ${alpha(BRAND.primary, 0.4)}`, transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >
              Request access
            </Button>
            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: BRAND.ink }}>
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <BrandLogo height={40} />
            <IconButton onClick={() => setDrawerOpen(false)}><Close /></IconButton>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <List>
            {navLinks.map((link) => (
              <ListItem
                key={link.label}
                button
                onClick={() => {
                  setDrawerOpen(false);
                  if (link.path.startsWith('/')) navigate(link.path);
                  else document.querySelector(link.path)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ListItemText primary={link.label} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1} sx={{ px: 2, pt: 1 }}>
            <Button fullWidth variant="outlined" onClick={() => { setDrawerOpen(false); navigate('/login'); }}>
              Sign in
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => openEnquiry('mobile-drawer')}
              sx={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}
            >
              Request access
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 14, md: 18 },
          pb: { xs: 10, md: 14 },
          overflow: 'hidden',
        }}
      >
        <Blob color={BRAND.primary} size={520} top={-160} left={-160} opacity={0.18} />
        <Blob color={BRAND.accent2} size={460} top={140} right={-120} opacity={0.18} />
        <Blob color={BRAND.emerald} size={380} bottom={-120} left="30%" opacity={0.12} />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(${alpha(BRAND.primary, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(BRAND.primary, 0.06)} 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Fade in={visible} timeout={700}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={7}>
                <Chip
                  icon={<Verified sx={{ color: `${BRAND.primary600} !important`, fontSize: '15px !important' }} />}
                  label={heroEyebrow}
                  sx={{
                    bgcolor: alpha(BRAND.primary, 0.08),
                    color: BRAND.primary600,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    border: `1px solid ${alpha(BRAND.primary, 0.18)}`,
                    mb: 3,
                  }}
                />

                <Typography
                  variant="h1"
                  fontWeight={800}
                  sx={{
                    fontSize: { xs: '2.6rem', md: '3.7rem', lg: '4.2rem' },
                    lineHeight: 1.05,
                    letterSpacing: '-1.5px',
                    color: BRAND.ink,
                    mb: 2.5,
                  }}
                >
                  Modern HIMS for
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      background: `linear-gradient(90deg, ${BRAND.primary} 0%, ${BRAND.accent} 60%, ${BRAND.accent2} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    India's hospitals
                  </Box>
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ color: BRAND.ink500, lineHeight: 1.75, mb: 4, maxWidth: 580, fontWeight: 400 }}
                >
                  One system to run OPD, IPD, lab, pharmacy, billing and ABDM — wired together
                  end-to-end. ABDM Milestones M1, M2 and M3 are fully integrated and ready for
                  certification, so your team spends less time on paperwork and more on care.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/login')}
                    sx={{
                      background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                      color: 'white',
                      px: 3.5,
                      py: 1.6,
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      boxShadow: `0 10px 30px ${alpha(BRAND.primary, 0.35)}`,
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 14px 40px ${alpha(BRAND.primary, 0.45)}` },
                      transition: 'all 0.25s',
                    }}
                  >
                    Sign in to dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => document.querySelector('#trust')?.scrollIntoView({ behavior: 'smooth' })}
                    sx={{
                      borderColor: BRAND.hairline,
                      color: BRAND.ink600,
                      px: 3.5,
                      py: 1.6,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      bgcolor: BRAND.surface,
                      '&:hover': { borderColor: BRAND.primary600, color: BRAND.primary600, bgcolor: alpha(BRAND.primary, 0.04) },
                    }}
                  >
                    See why hospitals pick us
                  </Button>
                </Stack>

                <Stack direction="row" spacing={2.5} flexWrap="wrap" rowGap={1}>
                  {['Cloud-hosted', 'ABDM M1·M2·M3 integrated', 'Bank-grade security', 'Certification-ready'].map((t) => (
                    <Stack key={t} direction="row" spacing={0.75} alignItems="center">
                      <CheckCircle sx={{ color: BRAND.emerald, fontSize: 16 }} />
                      <Typography variant="caption" sx={{ color: BRAND.ink500, fontWeight: 500 }}>{t}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              {/* Hero visual: a stylised dashboard preview card */}
              <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ position: 'relative' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: BRAND.surface,
                      border: `1px solid ${BRAND.hairline}`,
                      borderRadius: 4,
                      p: 3,
                      boxShadow: `0 30px 60px -20px ${alpha(BRAND.primary, 0.25)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#EF4444' }} />
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: BRAND.emerald }} />
                      <Box sx={{ flex: 1 }} />
                      <Chip
                        label="LIVE"
                        size="small"
                        sx={{ bgcolor: alpha(BRAND.emerald, 0.12), color: BRAND.emerald, fontWeight: 700, fontSize: '0.62rem', height: 20 }}
                      />
                    </Stack>

                    <Typography
                      variant="caption"
                      sx={{ color: BRAND.ink500, fontWeight: 600, letterSpacing: 1, fontSize: '0.68rem', textTransform: 'uppercase' }}
                    >
                      Today's Overview
                    </Typography>

                    <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
                      {[
                        { label: 'OPD',     value: '124',   color: BRAND.primary600 },
                        { label: 'Admitted',value: '38',    color: '#0EA5E9' },
                        { label: 'Lab',     value: '67',    color: BRAND.emerald },
                        { label: 'Revenue', value: '₹1.2L', color: '#F59E0B' },
                      ].map((s) => (
                        <Grid item xs={6} key={s.label}>
                          <Box
                            sx={{
                              bgcolor: alpha(s.color, 0.06),
                              borderRadius: 2,
                              p: 1.5,
                              border: `1px solid ${alpha(s.color, 0.15)}`,
                            }}
                          >
                            <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.4rem', lineHeight: 1 }}>
                              {s.value}
                            </Typography>
                            <Typography sx={{ color: BRAND.ink500, fontSize: '0.7rem', mt: 0.4 }}>{s.label}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {[
                      { dot: BRAND.emerald, text: 'Lab report ready — Rahul Sharma' },
                      { dot: '#0EA5E9',     text: 'Medicine dispensed — Bed 12 IPD' },
                      { dot: '#F59E0B',     text: 'OPD payment collected — ₹800' },
                    ].map((a, i, arr) => (
                      <Stack
                        key={i}
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{ py: 0.85, borderBottom: i < arr.length - 1 ? `1px solid ${BRAND.hairline}` : 'none' }}
                      >
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: a.dot, flexShrink: 0 }} />
                        <Typography sx={{ color: BRAND.ink600, fontSize: '0.75rem' }}>{a.text}</Typography>
                      </Stack>
                    ))}
                  </Paper>

                  {/* Floating role badge */}
                  <Paper
                    elevation={0}
                    sx={{
                      position: 'absolute',
                      bottom: -22,
                      left: -22,
                      bgcolor: BRAND.surface,
                      border: `1px solid ${BRAND.hairline}`,
                      borderRadius: 3,
                      px: 2,
                      py: 1.25,
                      boxShadow: `0 12px 32px ${alpha(BRAND.primary, 0.15)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Groups sx={{ color: BRAND.primary600, fontSize: 22 }} />
                      <Box>
                        <Typography sx={{ color: BRAND.ink, fontWeight: 700, fontSize: '0.82rem', lineHeight: 1 }}>
                          8 role types
                        </Typography>
                        <Typography sx={{ color: BRAND.ink500, fontSize: '0.7rem', mt: 0.25 }}>
                          Doctor · Nurse · Lab · Pharma…
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Floating ABDM badge */}
                  <Paper
                    elevation={0}
                    sx={{
                      position: 'absolute',
                      top: -16,
                      right: -16,
                      bgcolor: BRAND.surface,
                      border: `1px solid ${BRAND.hairline}`,
                      borderRadius: 3,
                      px: 2,
                      py: 1.25,
                      boxShadow: `0 12px 32px ${alpha(BRAND.primary, 0.15)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Shield sx={{ color: BRAND.emerald, fontSize: 22 }} />
                      <Box>
                        <Typography sx={{ color: BRAND.ink, fontWeight: 700, fontSize: '0.82rem', lineHeight: 1 }}>
                          ABDM ready
                        </Typography>
                        <Typography sx={{ color: BRAND.ink500, fontSize: '0.7rem', mt: 0.25 }}>
                          ABHA · Consent · Records
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Fade>

          {/* Stats strip */}
          <Grid container spacing={2} sx={{ mt: { xs: 7, md: 10 } }}>
            {heroStats.map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: BRAND.surface,
                    border: `1px solid ${BRAND.hairline}`,
                    textAlign: 'center',
                  }}
                >
                  <Typography fontWeight={800} sx={{ color: BRAND.primary600, fontSize: '1.7rem', lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: BRAND.ink500, mt: 0.5 }}>{s.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── MODULES ───────────────────────────────────────────────── */}
      <Box id="modules" sx={{ py: { xs: 9, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              icon={<AutoAwesome sx={{ fontSize: '14px !important' }} />}
              label="Full-stack clinical modules"
              size="small"
              sx={{ bgcolor: alpha(BRAND.primary, 0.08), color: BRAND.primary600, fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" fontWeight={800} sx={{ color: BRAND.ink, letterSpacing: '-1px', mb: 1.5 }}>
              Everything your hospital needs
            </Typography>
            <Typography variant="h6" sx={{ color: BRAND.ink500, fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
              A complete, role-aware platform covering every clinical and administrative
              workflow — from first OPD visit to IPD discharge.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {modules.map((m) => (
              <Grid item xs={12} sm={6} md={3} key={m.title}>
                <ModuleCard {...m} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CAPABILITIES ─────────────────────────────────────────── */}
      <Box
        id="capabilities"
        sx={{
          py: { xs: 9, md: 12 },
          background: `linear-gradient(180deg, ${alpha(BRAND.primary, 0.04)} 0%, transparent 100%)`,
          borderTop: `1px solid ${BRAND.hairline}`,
          borderBottom: `1px solid ${BRAND.hairline}`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={5}>
              <Chip
                label="Built for Indian healthcare"
                size="small"
                sx={{ bgcolor: alpha(BRAND.emerald, 0.08), color: BRAND.emerald, fontWeight: 700, mb: 2 }}
              />
              <Typography variant="h3" fontWeight={800} sx={{ color: BRAND.ink, letterSpacing: '-1px', mb: 2 }}>
                Designed for the way
                <Box component="span" sx={{ color: BRAND.primary600 }}> Indian </Box>
                hospitals run
              </Typography>
              <Typography variant="body1" sx={{ color: BRAND.ink500, lineHeight: 1.85, mb: 4 }}>
                AbhaAyushman is engineered around the realities of Indian healthcare —
                multi-hospital tenancy, ABDM HIP/HIU per facility, granular role-based access,
                and an opinionated workflow that keeps your staff in the system instead of in spreadsheets.
              </Typography>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/login')}
                sx={{
                  background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                  color: 'white',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.4,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.3)}`,
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${alpha(BRAND.primary, 0.4)}` },
                  transition: 'all 0.25s',
                }}
              >
                Sign in to your account
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={1.5}>
                {capabilities.map((c) => (
                  <Grid item xs={12} sm={6} key={c}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.85,
                        bgcolor: BRAND.surface,
                        border: `1px solid ${BRAND.hairline}`,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: BRAND.primary600, bgcolor: alpha(BRAND.primary, 0.03) },
                      }}
                    >
                      <CheckCircle sx={{ color: BRAND.emerald, fontSize: 20, flexShrink: 0 }} />
                      <Typography variant="body2" fontWeight={500} sx={{ color: BRAND.ink600 }}>{c}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── ROLES ─────────────────────────────────────────────────── */}
      <Box id="roles" sx={{ py: { xs: 9, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              icon={<People sx={{ fontSize: '14px !important' }} />}
              label="Role-based access"
              size="small"
              sx={{ bgcolor: alpha('#F59E0B', 0.08), color: '#F59E0B', fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" fontWeight={800} sx={{ color: BRAND.ink, letterSpacing: '-1px', mb: 1.5 }}>
              Right access. Right people.
            </Typography>
            <Typography variant="h6" sx={{ color: BRAND.ink500, fontWeight: 400, maxWidth: 540, mx: 'auto' }}>
              Every role sees exactly what they need — nothing more, nothing less.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {roles.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.role}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: `1px solid ${BRAND.hairline}`,
                    borderRadius: 3,
                    bgcolor: BRAND.surface,
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: alpha(r.color, 0.45),
                      boxShadow: `0 14px 32px ${alpha(r.color, 0.15)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: alpha(r.color, 0.12), color: r.color, width: 42, height: 42 }}>
                        {r.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} sx={{ color: BRAND.ink }}>{r.role}</Typography>
                    </Stack>
                    <Stack spacing={0.85}>
                      {r.perms.map((p) => (
                        <FeatureLine key={p} label={p} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── WHY US (TRUST SIGNALS) ────────────────────────────────── */}
      <Box id="trust" sx={{ py: { xs: 9, md: 12 }, bgcolor: alpha(BRAND.primary, 0.025) }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              label="Why hospitals pick us"
              size="small"
              sx={{ bgcolor: alpha('#8B5CF6', 0.08), color: '#8B5CF6', fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" fontWeight={800} sx={{ color: BRAND.ink, letterSpacing: '-1px', mb: 1.5 }}>
              Built to be trusted
            </Typography>
            <Typography variant="h6" sx={{ color: BRAND.ink500, fontWeight: 400, maxWidth: 640, mx: 'auto' }}>
              Compliance, security and operations covered — so your team can focus on
              patients, not paperwork.
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 5 }}>
            {[
              {
                title: 'ABDM M1, M2 & M3',
                desc:
                  'ABHA creation, care-context linking and consent-driven record exchange — all three milestones fully integrated and ready for ABDM certification.',
                icon: <Shield fontSize="medium" />,
                color: BRAND.primary600,
              },
              {
                title: 'Your data, isolated',
                desc:
                  'Each hospital is fully isolated with its own ABDM identity and access policies. Nothing leaks across tenants.',
                icon: <Verified fontSize="medium" />,
                color: '#0EA5E9',
              },
              {
                title: 'Security you can audit',
                desc:
                  'Encryption in transit, role-based access, complete audit trail of every clinical and financial action.',
                icon: <HealthAndSafety fontSize="medium" />,
                color: BRAND.emerald,
              },
              {
                title: 'Live support',
                desc:
                  'Dedicated onboarding, staff training and India-hours support. Your team is never on its own.',
                icon: <Groups fontSize="medium" />,
                color: '#F59E0B',
              },
            ].map((it) => (
              <Grid item xs={12} sm={6} md={3} key={it.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    border: `1px solid ${BRAND.hairline}`,
                    bgcolor: BRAND.surface,
                    borderRadius: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: alpha(it.color, 0.4),
                      boxShadow: `0 12px 28px ${alpha(it.color, 0.15)}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2.5,
                      bgcolor: alpha(it.color, 0.1),
                      color: it.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {it.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: BRAND.ink, mb: 0.5 }}>{it.title}</Typography>
                  <Typography variant="body2" sx={{ color: BRAND.ink500, lineHeight: 1.7 }}>{it.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: BRAND.ink500, mb: 2 }}>
              Evaluating us for your hospital? We're happy to walk you through a live demo.
            </Typography>
            <Button
              variant="outlined"
              size="large"
              onClick={() => openEnquiry('why-us')}
              sx={{
                borderColor: BRAND.hairline,
                color: BRAND.primary600,
                px: 4,
                py: 1.4,
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: 2.5,
                textTransform: 'none',
                bgcolor: BRAND.surface,
                '&:hover': { borderColor: BRAND.primary600, bgcolor: alpha(BRAND.primary, 0.05) },
              }}
            >
              Request a demo
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          py: { xs: 10, md: 13 },
          background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
          overflow: 'hidden',
        }}
      >
        <Blob color="#FFFFFF" size={420} top={-120} left={-80} opacity={0.18} />
        <Blob color="#FFFFFF" size={360} top={60} right={-60} opacity={0.12} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Chip
            icon={<TrendingUp sx={{ color: 'white !important', fontSize: '15px !important' }} />}
            label="Built for modern healthcare"
            sx={{
              bgcolor: alpha('#FFFFFF', 0.14),
              color: 'white',
              fontWeight: 700,
              border: `1px solid ${alpha('#FFFFFF', 0.25)}`,
              mb: 3,
            }}
          />
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{ color: 'white', mb: 2, fontSize: { xs: '2.2rem', md: '3rem' }, letterSpacing: '-1px' }}
          >
            Ready to modernise
            <br />
            your hospital?
          </Typography>
          <Typography variant="h6" sx={{ color: alpha('#FFFFFF', 0.85), mb: 5, fontWeight: 400 }}>
            Sign in with your hospital credentials and pick up exactly where your team left off.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/login')}
              sx={{
                bgcolor: 'white',
                color: BRAND.primary,
                px: 4.5,
                py: 1.7,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 2.5,
                textTransform: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 36px rgba(0,0,0,0.2)', bgcolor: '#F8FAFC' },
                transition: 'all 0.25s',
              }}
            >
              Sign in
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => openEnquiry('cta-banner')}
              sx={{
                borderColor: alpha('#FFFFFF', 0.5),
                color: 'white',
                px: 4.5,
                py: 1.7,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2.5,
                textTransform: 'none',
                '&:hover': { borderColor: 'white', bgcolor: alpha('#FFFFFF', 0.08) },
              }}
            >
              Request a demo
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.6), display: 'block', mt: 3 }}>
            Need access? Contact your hospital administrator.
          </Typography>
        </Container>
      </Box>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: BRAND.ink, color: alpha('#FFFFFF', 0.65), py: 7 }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
                <BrandLogo height={64} onDark />
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.85, maxWidth: 320 }}>
                Hospital Information Management built for India — multi-tenant ABDM, end-to-end
                workflows, and a clean operational layer your staff actually wants to use.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                <Chip label="ABDM ready"      size="small" sx={{ bgcolor: alpha(BRAND.accent, 0.18), color: BRAND.accent, fontWeight: 600, fontSize: '0.7rem' }} />
                <Chip label="Enterprise"      size="small" sx={{ bgcolor: alpha('#0EA5E9', 0.18), color: '#7DD3FC', fontWeight: 600, fontSize: '0.7rem' }} />
              </Stack>
            </Grid>

            {[
              { heading: 'Product', links: ['Modules', 'Capabilities', 'Roles', 'Why us'] },
              { heading: 'Company', links: ['About', 'Contact', 'Blog'] },
              { heading: 'Legal',   links: ['Privacy', 'Terms', 'ABDM compliance', 'Security'] },
            ].map((col) => (
              <Grid item xs={6} sm={4} md={2.66} key={col.heading}>
                <Typography variant="subtitle2" fontWeight={700} color="white" sx={{ mb: 1.25 }}>
                  {col.heading}
                </Typography>
                <Stack spacing={1}>
                  {col.links.map((l) => (
                    <Typography
                      key={l}
                      variant="body2"
                      sx={{
                        cursor: 'pointer',
                        color: alpha('#FFFFFF', 0.6),
                        '&:hover': { color: 'white' },
                        transition: 'color 0.2s',
                      }}
                    >
                      {l}
                    </Typography>
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ borderColor: alpha('#FFFFFF', 0.1), my: 4 }} />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              © 2026 Abha Ayushman. All rights reserved.
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Built for Indian healthcare · ABDM M1, M2 & M3 integration complete
            </Typography>
          </Stack>
        </Container>
      </Box>

      <EnquiryDialog
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        source={enquirySource}
      />
    </Box>
  );
};

export default LandingPage;
