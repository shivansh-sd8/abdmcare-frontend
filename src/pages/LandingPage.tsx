import React from 'react';
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
} from '@mui/material';
import {
  HealthAndSafety,
  Security,
  Speed,
  CloudDone,
  Verified,
  TrendingUp,
  People,
  LocalHospital,
  Assessment,
  CheckCircle,
  ArrowForward,
  Star,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const features = [
    {
      icon: <HealthAndSafety sx={{ fontSize: 48 }} />,
      title: 'ABDM Compliant',
      description: 'Fully integrated with Ayushman Bharat Digital Mission for seamless health data exchange',
      color: '#4CAF50',
    },
    {
      icon: <Security sx={{ fontSize: 48 }} />,
      title: 'Bank-Grade Security',
      description: 'End-to-end encryption, RBAC, and comprehensive audit trails for complete data protection',
      color: '#2196F3',
    },
    {
      icon: <Speed sx={{ fontSize: 48 }} />,
      title: 'Lightning Fast',
      description: 'Optimized performance with sub-2 second response times for all operations',
      color: '#FF9800',
    },
    {
      icon: <CloudDone sx={{ fontSize: 48 }} />,
      title: 'Cloud-Native',
      description: 'Scalable infrastructure that grows with your hospital, from 10 to 10,000 patients',
      color: '#9C27B0',
    },
    {
      icon: <People sx={{ fontSize: 48 }} />,
      title: 'Multi-Tenant',
      description: 'Manage multiple hospitals and branches from a single unified platform',
      color: '#F44336',
    },
    {
      icon: <Assessment sx={{ fontSize: 48 }} />,
      title: 'Smart Analytics',
      description: 'Real-time dashboards and insights to make data-driven decisions',
      color: '#00BCD4',
    },
  ];

  const benefits = [
    'Complete Patient Management',
    'ABHA Integration & Consent Management',
    'Role-Based Access Control',
    'Real-Time Analytics Dashboard',
    'Appointment Scheduling',
    'Doctor & Staff Management',
    'Audit Logs & Compliance',
    'Mobile-Responsive Design',
  ];

  const stats = [
    { value: '100%', label: 'ABDM Compliant' },
    { value: '< 2s', label: 'Response Time' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          pt: 12,
          pb: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="ABDM Certified Platform"
                icon={<Verified />}
                sx={{
                  bgcolor: alpha('#fff', 0.2),
                  color: 'white',
                  mb: 3,
                  fontWeight: 600,
                }}
              />
              <Typography
                variant="h2"
                fontWeight="bold"
                gutterBottom
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.2,
                }}
              >
                India's Most Advanced
                <br />
                <Box component="span" sx={{ color: '#FFD700' }}>
                  ABDM-Native HIMS
                </Box>
              </Typography>
              <Typography
                variant="h6"
                sx={{ mb: 4, opacity: 0.95, lineHeight: 1.6 }}
              >
                Transform your healthcare facility with our intelligent, cloud-based
                Hospital Information Management System. Built for the future of
                Indian healthcare.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/login')}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      bgcolor: alpha('#fff', 0.9),
                      transform: 'translateY(-2px)',
                      boxShadow: 6,
                    },
                    transition: 'all 0.3s',
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: alpha('#fff', 0.1),
                    },
                  }}
                >
                  Watch Demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  position: 'relative',
                  display: { xs: 'none', md: 'block' },
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: 400,
                    bgcolor: alpha('#fff', 0.1),
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${alpha('#fff', 0.2)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LocalHospital sx={{ fontSize: 200, opacity: 0.3 }} />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Stats */}
          <Grid container spacing={3} sx={{ mt: 8 }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h3"
            fontWeight="bold"
            gutterBottom
            color="text.primary"
          >
            Why Choose MediSync?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            Built from the ground up for Indian healthcare, with ABDM compliance
            at its core
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8,
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 3,
                      bgcolor: alpha(feature.color, 0.1),
                      color: feature.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), py: 12 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Everything You Need,
                <br />
                <Box component="span" color="primary.main">
                  Out of the Box
                </Box>
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                No complex setup. No hidden costs. Just a complete hospital
                management solution ready to use from day one.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {benefits.map((benefit, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircle color="success" />
                      <Typography variant="body1">{benefit}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  height: 400,
                  bgcolor: 'background.paper',
                  borderRadius: 4,
                  boxShadow: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp sx={{ fontSize: 200, color: 'primary.main', opacity: 0.2 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Trusted by Healthcare Leaders
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Join hundreds of hospitals transforming patient care
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} md={4} key={item}>
              <Card sx={{ height: '100%', p: 3 }}>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} sx={{ color: '#FFD700' }} />
                  ))}
                </Box>
                <Typography variant="body1" paragraph>
                  "MediSync has transformed how we manage patient data. The ABDM
                  integration is seamless and our staff loves the intuitive
                  interface."
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold">
                  Dr. Rajesh Kumar
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Medical Director, City Hospital
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: 12,
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Ready to Transform Your Hospital?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.95 }}>
            Start your free trial today. No credit card required.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/login')}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.9),
                },
              }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: alpha('#fff', 0.1),
                },
              }}
            >
              Contact Sales
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 6, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                MediSync ABDM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                India's most advanced ABDM-native Hospital Information Management
                System
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Product
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Pricing
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Security
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Company
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    About Us
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Careers
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Resources
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Documentation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    API Reference
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Support
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Legal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Privacy Policy
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Terms of Service
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compliance
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © 2026 MediSync ABDM. All rights reserved. | ABDM Certified Platform
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
