import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  Stack,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  useMediaQuery,
  Fade,
  Slide,
  Paper,
} from '@mui/material';
import {
  HealthAndSafety,
  Verified,
  People,
  LocalHospital,
  Assessment,
  CheckCircle,
  ArrowForward,
  Menu as MenuIcon,
  Close,
  Science,
  MedicalServices,
  Payments,
  BedroomParent,
  AccountCircle,
  Biotech,
  Shield,
  AutoAwesome,
  TrendingUp,
  Groups,
  EventNote,
  MonitorHeart,
  Code,
  DataObject,
  Api,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/* ─── tiny floating animated blob ─── */
const Blob: React.FC<{ color: string; size: number; top: string | number; left?: string | number; right?: string | number; opacity?: number }> = ({
  color, size, top, left, right, opacity = 0.15,
}) => (
  <Box
    sx={{
      position: 'absolute',
      top,
      left,
      right,
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      filter: 'blur(80px)',
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/* ─── stat counter card ─── */
const StatCard: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <Box
    sx={{
      textAlign: 'center',
      px: 3,
      py: 2,
      borderRadius: 3,
      bgcolor: alpha('#fff', 0.08),
      backdropFilter: 'blur(12px)',
      border: `1px solid ${alpha('#fff', 0.15)}`,
    }}
  >
    <Typography variant="h3" fontWeight={800} sx={{ color, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), mt: 0.5 }}>
      {label}
    </Typography>
  </Box>
);

/* ─── feature pill ─── */
const FeaturePill: React.FC<{ label: string }> = ({ label }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <CheckCircle sx={{ color: '#4ADE80', fontSize: 18 }} />
    <Typography variant="body2" color="text.secondary">{label}</Typography>
  </Stack>
);

/* ─── module card ─── */
interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  roles: string[];
}
const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, desc, color, roles }) => (
  <Card
    sx={{
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 20px 40px ${alpha(color, 0.18)}`,
        borderColor: color,
      },
    }}
    elevation={0}
  >
    <CardContent sx={{ p: 3.5 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2.5,
          bgcolor: alpha(color, 0.1),
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
        {desc}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {roles.map((r) => (
          <Chip
            key={r}
            label={r}
            size="small"
            sx={{ bgcolor: alpha(color, 0.08), color, fontWeight: 600, fontSize: '0.7rem' }}
          />
        ))}
      </Stack>
    </CardContent>
  </Card>
);


/* ═══════════════════════════════════════════════════════════ MAIN ═══ */
const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const modules: ModuleCardProps[] = [
    {
      icon: <EventNote fontSize="medium" />,
      title: 'OPD & Appointments',
      desc: 'Smart scheduling, consultation notes, prescriptions, and instant billing for outpatient visits.',
      color: '#6366F1',
      roles: ['Doctor', 'Receptionist', 'Nurse'],
    },
    {
      icon: <BedroomParent fontSize="medium" />,
      title: 'IPD Management',
      desc: 'Full inpatient workflow — admissions, daily rounds, vitals, ward allocation, and discharge with itemized billing.',
      color: '#0EA5E9',
      roles: ['Doctor', 'Nurse', 'Admin'],
    },
    {
      icon: <Biotech fontSize="medium" />,
      title: 'Lab & Investigations',
      desc: 'Structured result entry, auto-generated PDF lab reports, reference ranges, and real-time test status updates.',
      color: '#10B981',
      roles: ['Lab Tech', 'Radiologist', 'Doctor'],
    },
    {
      icon: <MedicalServices fontSize="medium" />,
      title: 'Pharmacy',
      desc: 'Prescription queue, medicine dispensing with per-item pricing, and automatic medicine charge integration into bills.',
      color: '#F59E0B',
      roles: ['Pharmacist', 'Admin'],
    },
    {
      icon: <Payments fontSize="medium" />,
      title: 'Billing & Payments',
      desc: 'Transparent itemized billing covering consultation, lab, pharmacy, and ward charges with payment receipt generation.',
      color: '#EF4444',
      roles: ['Receptionist', 'Billing Staff'],
    },
    {
      icon: <HealthAndSafety fontSize="medium" />,
      title: 'ABHA & Consent',
      desc: 'ABHA ID creation framework, health record linking capabilities, and consent management system designed for ABDM integration.',
      color: '#8B5CF6',
      roles: ['Admin', 'Doctor', 'Receptionist'],
    },
    {
      icon: <MonitorHeart fontSize="medium" />,
      title: 'EHR & Vitals',
      desc: 'Complete electronic health records with vitals history, encounter timeline, and downloadable health summaries.',
      color: '#EC4899',
      roles: ['Doctor', 'Nurse'],
    },
    {
      icon: <Assessment fontSize="medium" />,
      title: 'Analytics & Audit',
      desc: 'Dashboard with operational insights, comprehensive audit logs, and reporting capabilities for hospital management.',
      color: '#14B8A6',
      roles: ['Admin', 'Super Admin'],
    },
  ];


  const benefits = [
    'Complete OPD & IPD Workflow',
    'ABHA ID Framework Ready',
    'Role-Based Access Control',
    'Automated Itemized Billing',
    'Structured Lab Report Generation',
    'Prescription & Pharmacy Management',
    'Analytics Dashboard',
    'Multi-Hospital Support',
    'Comprehensive Audit Logs',
    'Mobile-Responsive Interface',
  ];

  const navLinks = [
    { label: 'Features', path: '#features' },
    { label: 'Modules', path: '#modules' },
    { label: 'Benefits', path: '#benefits' },
    { label: 'Documentation', path: '/documentation' },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Sticky Navbar ─────────────────────────────────────────── */}
      <AppBar
        elevation={0}
        sx={{
          bgcolor: scrolled ? alpha(theme.palette.background.paper, 0.92) : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${alpha(theme.palette.divider, 0.6)}` : 'none',
          transition: 'all 0.3s',
          color: scrolled ? 'text.primary' : 'white',
        }}
      >
        <Toolbar sx={{ py: 0.5, maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          {/* Logo */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LocalHospital sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography fontWeight={800} fontSize="1.2rem" letterSpacing="-0.5px">
              AbhaAyushman
            </Typography>
          </Stack>

          {/* Desktop nav */}
          {!isMobile && (
            <Stack direction="row" spacing={4} alignItems="center" sx={{ mr: 4 }}>
              {navLinks.map((link) => (
                <Typography
                  key={link.label}
                  variant="body2"
                  fontWeight={600}
                  onClick={() => {
                    if (link.path.startsWith('/')) {
                      navigate(link.path);
                    } else {
                      const element = document.querySelector(link.path);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  sx={{
                    cursor: 'pointer',
                    opacity: 0.8,
                    '&:hover': { opacity: 1 },
                    transition: 'opacity 0.2s',
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{
                color: scrolled ? 'text.primary' : 'white',
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              Sign In
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                color: 'white',
                fontWeight: 700,
                px: 2.5,
                py: 0.9,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >
              Get Started
            </Button>
            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: scrolled ? 'text.primary' : 'white' }}>
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography fontWeight={800}>AbhaAyushman</Typography>
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
                  if (link.path.startsWith('/')) {
                    navigate(link.path);
                  } else {
                    const element = document.querySelector(link.path);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <ListItemText primary={link.label} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1} sx={{ px: 2, pt: 1 }}>
            <Button fullWidth variant="outlined" onClick={() => navigate('/login')}>Sign In</Button>
            <Button fullWidth variant="contained" onClick={() => navigate('/login')} sx={{ background: 'linear-gradient(135deg,#6366F1,#0EA5E9)' }}>Get Started</Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(150deg, #0F0C29 0%, #302B63 50%, #24243e 100%)',
          overflow: 'hidden',
          pt: 8,
        }}
      >
        {/* Background blobs */}
        <Blob color="#6366F1" size={600} top="-100px" left="-100px" opacity={0.25} />
        <Blob color="#0EA5E9" size={500} top="200px" right="-80px" opacity={0.2} />
        <Blob color="#10B981" size={300} top="60%" left="40%" opacity={0.12} />

        {/* Grid pattern overlay */}
        <Box
          sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(${alpha('#6366F1', 0.07)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha('#6366F1', 0.07)} 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 10, md: 6 } }}>
          <Fade in={visible} timeout={800}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
                {/* Badge */}
              <Chip
                  icon={<Verified sx={{ color: '#818CF8 !important', fontSize: '16px !important' }} />}
                  label="Applying for ABDM Integration"
                sx={{
                    bgcolor: alpha('#818CF8', 0.12),
                    color: '#818CF8',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  mb: 3,
                    border: `1px solid ${alpha('#818CF8', 0.3)}`,
                }}
              />

                {/* Headline */}
              <Typography
                  variant="h1"
                  fontWeight={800}
                  sx={{
                    fontSize: { xs: '2.8rem', md: '4rem', lg: '4.5rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-1.5px',
                    color: 'white',
                    mb: 2.5,
                  }}
                >
                  India's Smartest
                  <Box
                    component="span"
                sx={{
                      display: 'block',
                      background: 'linear-gradient(90deg, #818CF8, #38BDF8, #4ADE80)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Hospital Platform
                </Box>
              </Typography>

              <Typography
                variant="h6"
                  sx={{ color: alpha('#fff', 0.7), lineHeight: 1.8, mb: 4, maxWidth: 560, fontWeight: 400 }}
                >
                  A comprehensive Hospital Information Management System designed to streamline
                  OPD, IPD, Lab, Pharmacy, and Billing workflows — built with ABDM integration
                  capabilities for modern Indian healthcare.
              </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 5 }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/login')}
                  sx={{
                      background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                      color: 'white',
                    px: 4,
                      py: 1.7,
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(99,102,241,0.55)' },
                      transition: 'all 0.25s',
                    }}
                  >
                    Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                      borderColor: alpha('#fff', 0.3),
                      color: alpha('#fff', 0.85),
                    px: 4,
                      py: 1.7,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2.5,
                      backdropFilter: 'blur(8px)',
                      '&:hover': { borderColor: alpha('#fff', 0.6), bgcolor: alpha('#fff', 0.06) },
                    }}
                  >
                    View Demo
                </Button>
              </Stack>

                {/* Trust line */}
                <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
                  {['Cloud-Based', 'ABDM Integration Ready', 'Role-Based Access', 'Secure & Compliant'].map((t) => (
                    <Stack key={t} direction="row" spacing={0.5} alignItems="center">
                      <CheckCircle sx={{ color: '#4ADE80', fontSize: 16 }} />
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.65), fontWeight: 500 }}>{t}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              {/* Hero visual */}
              <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ position: 'relative' }}>
                  {/* Dashboard mockup card */}
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: alpha('#fff', 0.06),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha('#fff', 0.12)}`,
                      borderRadius: 4,
                      p: 3,
                      color: 'white',
                    }}
                  >
                    {/* Mini header */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5F57' }} />
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FFBD2E' }} />
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28CA41' }} />
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip label="Live Dashboard" size="small" sx={{ bgcolor: alpha('#4ADE80', 0.15), color: '#4ADE80', fontWeight: 700, fontSize: '0.65rem' }} />
                    </Stack>

                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), mb: 1.5, fontWeight: 600, letterSpacing: 1, fontSize: '0.7rem', textTransform: 'uppercase' }}>Today's Overview</Typography>

                    {/* Mini stat grid */}
                    <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                      {[
                        { label: 'OPD Patients', value: '124', color: '#818CF8' },
                        { label: 'Admitted', value: '38', color: '#38BDF8' },
                        { label: 'Lab Tests', value: '67', color: '#4ADE80' },
                        { label: 'Revenue', value: '₹1.2L', color: '#FBBF24' },
                      ].map((s) => (
                        <Grid item xs={6} key={s.label}>
                          <Box sx={{ bgcolor: alpha('#fff', 0.05), borderRadius: 2, p: 1.5, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                            <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.4rem', lineHeight: 1 }}>{s.value}</Typography>
                            <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.7rem', mt: 0.3 }}>{s.label}</Typography>
                          </Box>
                        </Grid>
                      ))}
            </Grid>

                    {/* Mini activity */}
                    {[
                      { dot: '#4ADE80', text: 'Lab report ready — Rahul Sharma' },
                      { dot: '#38BDF8', text: 'Medicine dispensed — Bed 12 IPD' },
                      { dot: '#FBBF24', text: 'OPD payment collected — ₹800' },
                    ].map((a, i) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.75, borderBottom: i < 2 ? `1px solid ${alpha('#fff', 0.06)}` : 'none' }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: a.dot, flexShrink: 0 }} />
                        <Typography sx={{ color: alpha('#fff', 0.6), fontSize: '0.72rem' }}>{a.text}</Typography>
                      </Stack>
                    ))}
                  </Paper>

                  {/* Floating role badge */}
                  <Paper
                    elevation={6}
                sx={{
                      position: 'absolute',
                      bottom: -20,
                      left: -24,
                      bgcolor: alpha('#1E1B4B', 0.9),
                      backdropFilter: 'blur(16px)',
                      border: `1px solid ${alpha('#6366F1', 0.4)}`,
                      borderRadius: 3,
                      px: 2,
                      py: 1.25,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Groups sx={{ color: '#818CF8', fontSize: 20 }} />
                      <Box>
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>8 Role Types</Typography>
                        <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.65rem' }}>Doctor · Nurse · Lab · Pharma…</Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Floating ABHA badge */}
                  <Paper
                    elevation={6}
                  sx={{
                      position: 'absolute',
                      top: -16,
                      right: -16,
                      bgcolor: alpha('#1E1B4B', 0.9),
                      backdropFilter: 'blur(16px)',
                      border: `1px solid ${alpha('#818CF8', 0.4)}`,
                      borderRadius: 3,
                      px: 2,
                      py: 1.25,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Shield sx={{ color: '#818CF8', fontSize: 20 }} />
                      <Box>
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>ABDM Integration</Typography>
                        <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.65rem' }}>Application in Progress</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Fade>

          {/* Stats row */}
          <Slide in={visible} direction="up" timeout={1000}>
            <Grid container spacing={2} sx={{ mt: { xs: 6, md: 10 } }}>
              {[
                { value: '8+', label: 'Clinical Modules', color: '#818CF8' },
                { value: '10+', label: 'User Roles', color: '#38BDF8' },
                { value: 'FHIR', label: 'Standards Ready', color: '#4ADE80' },
                { value: '24/7', label: 'Support', color: '#FBBF24' },
              ].map((s) => (
                <Grid item xs={6} md={3} key={s.label}>
                  <StatCard {...s} />
                </Grid>
              ))}
          </Grid>
          </Slide>
        </Container>
      </Box>

      {/* ── MODULES ───────────────────────────────────────────────── */}
      <Box id="modules" sx={{ py: { xs: 10, md: 14 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip
              icon={<AutoAwesome sx={{ fontSize: '14px !important' }} />}
              label="Full-Stack Clinical Modules"
              size="small"
              sx={{ bgcolor: alpha('#6366F1', 0.08), color: '#6366F1', fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" fontWeight={800} gutterBottom letterSpacing="-1px">
              Everything your hospital needs
                  </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 580, mx: 'auto', fontWeight: 400 }}>
              A complete, role-aware platform covering every clinical and administrative
              workflow — from first OPD visit to IPD discharge.
                  </Typography>
                </Box>

          <Grid container spacing={3}>
            {modules.map((mod, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <ModuleCard {...mod} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── WHY US (benefits) ─────────────────────────────────────── */}
      <Box
        id="benefits"
        sx={{
          py: { xs: 10, md: 14 },
          background: `linear-gradient(180deg, ${alpha('#6366F1', 0.03)} 0%, transparent 100%)`,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={5}>
              <Chip label="Why AbhaAyushman" size="small" sx={{ bgcolor: alpha('#10B981', 0.08), color: '#10B981', fontWeight: 700, mb: 2 }} />
              <Typography variant="h3" fontWeight={800} gutterBottom letterSpacing="-1px">
                Designed for
                <Box component="span" sx={{ color: '#6366F1' }}> Indian </Box>
                healthcare
          </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.9 }}>
                AbhaAyushman is being developed to support India's ABDM mission by providing
                a comprehensive HIMS platform. We're building features and workflows designed
                for seamless ABDM integration to help healthcare providers join the digital health ecosystem.
          </Typography>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/login')}
                sx={{
                  background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.4,
                  borderRadius: 2.5,
                  boxShadow: '0 6px 24px rgba(99,102,241,0.35)',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 32px rgba(99,102,241,0.45)' },
                  transition: 'all 0.25s',
                }}
              >
                Get started for free
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={1.5}>
                {benefits.map((b, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Paper
                      elevation={0}
                    sx={{
                        p: 1.75,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                        gap: 1.5,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#6366F1', bgcolor: alpha('#6366F1', 0.03) },
                      }}
                    >
                      <CheckCircle sx={{ color: '#4ADE80', fontSize: 20, flexShrink: 0 }} />
                      <Typography variant="body2" fontWeight={500}>{b}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── ROLES SECTION ─────────────────────────────────────────── */}
      <Box id="features" sx={{ py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip icon={<People sx={{ fontSize: '14px !important' }} />} label="Role-Based Access" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.08), color: '#F59E0B', fontWeight: 700, mb: 2 }} />
            <Typography variant="h3" fontWeight={800} gutterBottom letterSpacing="-1px">
              Right access. Right people.
          </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 540, mx: 'auto', fontWeight: 400 }}>
              Every role sees exactly what they need — nothing more, nothing less.
          </Typography>
        </Box>
          <Grid container spacing={2.5}>
            {[
              { role: 'Doctor', color: '#6366F1', icon: <AccountCircle />, perms: ['OPD Consultations', 'IPD Rounds', 'E-Prescriptions', 'Lab Orders', 'EHR Access'] },
              { role: 'Nurse', color: '#0EA5E9', icon: <MedicalServices />, perms: ['Patient Vitals', 'IPD Care Notes', 'Medication Tracking', 'Admission Support'] },
              { role: 'Receptionist', color: '#10B981', icon: <EventNote />, perms: ['Patient Registration', 'Appointment Booking', 'OPD Billing', 'ABHA ID Assist'] },
              { role: 'Lab Technician', color: '#F59E0B', icon: <Biotech />, perms: ['Investigation Queue', 'Result Entry', 'Lab Report PDF', 'Status Updates'] },
              { role: 'Pharmacist', color: '#EF4444', icon: <Science />, perms: ['Prescription Queue', 'Dispense Medicines', 'Stock Tracking', 'Charge Recording'] },
              { role: 'Admin', color: '#8B5CF6', icon: <Shield />, perms: ['Hospital Config', 'User Management', 'Pricing Controls', 'Analytics & Audit'] },
            ].map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.role}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid', borderColor: 'divider', height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': { borderColor: r.color, boxShadow: `0 8px 32px ${alpha(r.color, 0.15)}` },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: alpha(r.color, 0.12), color: r.color, width: 40, height: 40 }}>
                        {r.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700}>{r.role}</Typography>
                    </Stack>
                    <Stack spacing={0.75}>
                      {r.perms.map((p) => (
                        <FeaturePill key={p} label={p} />
                      ))}
                    </Stack>
                  </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>

      {/* ── TECHNICAL TRANSPARENCY ─────────────────────────────── */}
      <Box sx={{ py: { xs: 10, md: 14 }, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip
              label="For Healthcare Authorities & Reviewers"
              size="small"
              sx={{ bgcolor: alpha('#8B5CF6', 0.08), color: '#8B5CF6', fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" fontWeight={800} gutterBottom letterSpacing="-1px">
              Built with Transparency
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', fontWeight: 400 }}>
              Professional platform designed for ABDM integration with complete technical documentation
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {[
              {
                title: 'Modern Architecture',
                desc: 'Built with latest technologies and best practices for scalability and performance',
                icon: <Code fontSize="large" />,
                color: '#6366F1',
              },
              {
                title: 'FHIR R4 Compliant',
                desc: 'Health records structured using FHIR R4 standards for interoperability',
                icon: <DataObject fontSize="large" />,
                color: '#0EA5E9',
              },
              {
                title: 'Security First',
                desc: 'Enterprise-grade security with encryption, audit logs, and role-based access',
                icon: <Shield fontSize="large" />,
                color: '#10B981',
              },
              {
                title: 'API Documentation',
                desc: 'Complete OpenAPI 3.0 specification with 50+ documented endpoints',
                icon: <Api fontSize="large" />,
                color: '#F59E0B',
              },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: item.color,
                      boxShadow: `0 8px 24px ${alpha(item.color, 0.15)}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha(item.color, 0.1),
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {item.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/documentation')}
              sx={{
                borderColor: alpha('#6366F1', 0.3),
                color: '#6366F1',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 2.5,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#6366F1',
                  bgcolor: alpha('#6366F1', 0.05),
                },
              }}
            >
              View Complete Technical Documentation
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          py: { xs: 10, md: 14 },
          background: 'linear-gradient(150deg, #0F0C29 0%, #302B63 50%, #24243e 100%)',
          overflow: 'hidden',
        }}
      >
        <Blob color="#6366F1" size={500} top="-100px" left="-80px" opacity={0.3} />
        <Blob color="#0EA5E9" size={400} top="50px" right="-60px" opacity={0.25} />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Chip
            icon={<TrendingUp sx={{ color: '#818CF8 !important', fontSize: '16px !important' }} />}
            label="Built for Modern Healthcare"
            sx={{ bgcolor: alpha('#818CF8', 0.12), color: '#818CF8', fontWeight: 700, mb: 3, border: `1px solid ${alpha('#818CF8', 0.3)}` }}
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
          <Typography variant="h6" sx={{ color: alpha('#fff', 0.65), mb: 5, fontWeight: 400 }}>
            Explore our comprehensive HIMS platform designed for Indian healthcare providers.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/login')}
              sx={{
                background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                color: 'white',
                px: 5,
                py: 1.8,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(99,102,241,0.55)' },
                transition: 'all 0.25s',
              }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: alpha('#fff', 0.3),
                color: alpha('#fff', 0.85),
                px: 5,
                py: 1.8,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2.5,
                '&:hover': { borderColor: alpha('#fff', 0.6), bgcolor: alpha('#fff', 0.06) },
              }}
            >
              Contact Sales
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.35), display: 'block', mt: 3 }}>
            Professional HIMS · ABDM Integration in Progress · Secure & Compliant
          </Typography>
        </Container>
      </Box>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#0A0A0F', color: alpha('#fff', 0.6), py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {/* Brand */}
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: 2,
                    background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <LocalHospital sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography fontWeight={800} color="white" fontSize="1.1rem">AbhaAyushman</Typography>
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.9, maxWidth: 280 }}>
                A comprehensive Hospital Information Management System with ABDM integration
                capabilities — built for the future of Indian healthcare.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                <Chip label="ABDM Ready" size="small" sx={{ bgcolor: alpha('#818CF8', 0.1), color: '#818CF8', fontWeight: 600, fontSize: '0.7rem' }} />
                <Chip label="Enterprise Grade" size="small" sx={{ bgcolor: alpha('#38BDF8', 0.1), color: '#38BDF8', fontWeight: 600, fontSize: '0.7rem' }} />
              </Stack>
            </Grid>

            {/* Links */}
            {[
              {
                heading: 'Product',
                links: ['Features', 'Modules', 'Pricing', 'Changelog'],
              },
              {
                heading: 'Company',
                links: ['About Us', 'Careers', 'Blog', 'Contact'],
              },
              {
                heading: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'ABDM Compliance', 'Security'],
              },
            ].map((col) => (
              <Grid item xs={6} sm={4} md={2.5} key={col.heading}>
                <Typography variant="subtitle2" fontWeight={700} color="white" gutterBottom>
                  {col.heading}
                  </Typography>
                <Stack spacing={1}>
                  {col.links.map((l) => (
                    <Typography
                      key={l}
                      variant="body2"
                      sx={{ cursor: 'pointer', '&:hover': { color: 'white' }, transition: 'color 0.2s' }}
                    >
                      {l}
                  </Typography>
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 5 }} />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="caption">
              © 2026 AbhaAyushman. All rights reserved.
            </Typography>
            <Typography variant="caption">
              Built with ♥ for Indian Healthcare · ABDM Integration in Progress
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
