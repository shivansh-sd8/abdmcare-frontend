import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Stack,
  Chip,
  alpha,
  useTheme,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
} from '@mui/material';
import {
  LocalHospital,
  ArrowBack,
  ExpandMore,
  CheckCircle,
  Code,
  Security,
  CloudQueue,
  IntegrationInstructions,
  Description,
  VerifiedUser,
  GitHub,
  Article,
  Architecture,
  DataObject,
  Api,
  Shield,
  Storage,
  Speed,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DocumentationPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | false>('panel1');

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const technicalSpecs = [
    {
      category: 'Backend Architecture',
      icon: <Architecture />,
      items: [
        'Node.js 18+ with Express.js 4.21.1',
        'TypeScript for type safety',
        'PostgreSQL 14+ with Sequelize ORM 6.37.0',
        'RESTful API design with OpenAPI 3.0 documentation',
        'JWT-based authentication & authorization',
        'Role-Based Access Control (RBAC) for 10+ user roles',
      ],
    },
    {
      category: 'Frontend Stack',
      icon: <Code />,
      items: [
        'React 18+ with TypeScript',
        'Material-UI (MUI) v5 for consistent UI/UX',
        'React Router v6 for navigation',
        'React Query for server state management',
        'Responsive design for mobile & desktop',
      ],
    },
    {
      category: 'Security & Compliance',
      icon: <Security />,
      items: [
        'Helmet.js for security headers',
        'CORS configuration for API security',
        'Password hashing with bcrypt',
        'Input validation with Joi',
        'Comprehensive audit logging',
        'Data encryption at rest and in transit',
      ],
    },
    {
      category: 'ABDM Integration Framework',
      icon: <IntegrationInstructions />,
      items: [
        'ABHA ID creation module (ready for sandbox integration)',
        'Consent management system architecture',
        'FHIR R4 data models preparation',
        'Health Information Provider (HIP) module structure',
        'Health Information User (HIU) module structure',
        'M1, M2, M3 milestone compliance roadmap',
      ],
    },
    {
      category: 'Observability & Monitoring',
      icon: <Speed />,
      items: [
        'Winston structured logging',
        'OpenTelemetry instrumentation ready',
        'Error tracking and reporting',
        'Performance monitoring hooks',
        'Database query optimization',
      ],
    },
    {
      category: 'Data Management',
      icon: <Storage />,
      items: [
        'PostgreSQL with proper indexing',
        'Database migrations with Sequelize',
        'Backup and recovery procedures',
        'Data retention policies',
        'GDPR-compliant data handling',
      ],
    },
  ];

  const abdmReadiness = [
    {
      milestone: 'M1 - Health Facility Registration',
      status: 'Framework Ready',
      details: [
        'Hospital/Clinic profile management module',
        'Facility registry integration structure',
        'Healthcare professional registry (HPR) preparation',
        'Digital signature framework',
      ],
    },
    {
      milestone: 'M2 - Patient Registration & Linking',
      status: 'Partially Implemented',
      details: [
        'ABHA ID creation workflow (UI/UX complete)',
        'Patient demographics management',
        'ABHA address linking capability',
        'Consent artifact generation structure',
      ],
    },
    {
      milestone: 'M3 - Health Records Exchange',
      status: 'In Development',
      details: [
        'FHIR resource models (Patient, Encounter, Observation)',
        'Health record push/pull architecture',
        'Consent-based data sharing framework',
        'Interoperability standards compliance',
      ],
    },
  ];

  const modules = [
    { name: 'OPD Management', status: 'Production Ready', coverage: '95%' },
    { name: 'IPD Management', status: 'Production Ready', coverage: '90%' },
    { name: 'Laboratory Module', status: 'Production Ready', coverage: '88%' },
    { name: 'Pharmacy Module', status: 'Production Ready', coverage: '85%' },
    { name: 'Billing System', status: 'Production Ready', coverage: '92%' },
    { name: 'ABHA Integration', status: 'Sandbox Ready', coverage: '70%' },
    { name: 'Consent Management', status: 'In Development', coverage: '65%' },
    { name: 'Analytics Dashboard', status: 'Production Ready', coverage: '80%' },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ py: 1, maxWidth: 1400, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
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
            <Chip label="Technical Documentation" size="small" sx={{ ml: 2 }} />
          </Stack>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back to Home
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: 12, pb: 8 }}>
        {/* Hero Section */}
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Chip
            icon={<Article />}
            label="For Government Reviewers & Healthcare Authorities"
            sx={{ mb: 3, bgcolor: alpha('#6366F1', 0.1), color: '#6366F1', fontWeight: 700 }}
          />
          <Typography variant="h2" fontWeight={800} gutterBottom letterSpacing="-1px">
            Technical Documentation
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mb: 4 }}>
            Comprehensive overview of AbhaAyushman HIMS architecture, ABDM integration roadmap,
            and technical specifications for evaluation and certification.
          </Typography>
        </Box>

        {/* Project Overview */}
        <Paper elevation={0} sx={{ p: 4, mb: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Description color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={700}>
              Project Overview
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.9 }}>
            AbhaAyushman is a comprehensive Hospital Information Management System (HIMS) designed specifically
            for Indian healthcare providers. The platform is being developed with ABDM integration as a core
            objective, following the National Health Authority's guidelines and technical specifications.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <GitHub fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Professional Platform
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Enterprise-grade solution with comprehensive documentation
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <VerifiedUser fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Standards Compliant
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Following FHIR R4, HL7, and ABDM technical specifications
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <CloudQueue fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Scalable Architecture
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Designed to handle multi-hospital deployments
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Technical Specifications */}
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
          Technical Specifications
        </Typography>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {technicalSpecs.map((spec, idx) => (
            <Grid item xs={12} md={6} key={idx}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>{spec.icon}</Box>
                  <Typography variant="h6" fontWeight={700}>
                    {spec.category}
                  </Typography>
                </Stack>
                <List dense>
                  {spec.items.map((item, i) => (
                    <ListItem key={i} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* ABDM Integration Roadmap */}
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
          ABDM Integration Roadmap
        </Typography>
        <Paper elevation={0} sx={{ mb: 6, border: '1px solid', borderColor: 'divider' }}>
          {abdmReadiness.map((milestone, idx) => (
            <Accordion
              key={idx}
              expanded={expanded === `panel${idx + 1}`}
              onChange={handleChange(`panel${idx + 1}`)}
              elevation={0}
              sx={{ '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                    {milestone.milestone}
                  </Typography>
                  <Chip
                    label={milestone.status}
                    size="small"
                    color={
                      milestone.status.includes('Ready')
                        ? 'success'
                        : milestone.status.includes('Implemented')
                        ? 'primary'
                        : 'warning'
                    }
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {milestone.details.map((detail, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary={detail} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        {/* Module Status */}
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
          Module Implementation Status
        </Typography>
        <Grid container spacing={2} sx={{ mb: 6 }}>
          {modules.map((module, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {module.name}
                </Typography>
                <Chip
                  label={module.status}
                  size="small"
                  color={module.status.includes('Production') ? 'success' : 'warning'}
                  sx={{ mb: 1.5 }}
                />
                <Typography variant="h4" fontWeight={800} color="primary.main">
                  {module.coverage}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Feature Coverage
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Security & Compliance */}
        <Paper elevation={0} sx={{ p: 4, mb: 6, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Shield color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={700}>
              Security & Compliance Measures
            </Typography>
          </Stack>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Data Security
              </Typography>
              <List dense>
                {[
                  'AES-256 encryption for sensitive data',
                  'TLS 1.3 for data in transit',
                  'Secure password hashing (bcrypt)',
                  'SQL injection prevention',
                  'XSS and CSRF protection',
                ].map((item, i) => (
                  <ListItem key={i}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Lock sx={{ fontSize: 18, color: 'success.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Compliance Standards
              </Typography>
              <List dense>
                {[
                  'ABDM technical specifications adherence',
                  'FHIR R4 resource modeling',
                  'HL7 standards compatibility',
                  'GDPR-compliant data handling',
                  'Comprehensive audit trail logging',
                ].map((item, i) => (
                  <ListItem key={i}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <VerifiedUser sx={{ fontSize: 18, color: 'success.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </Paper>

        {/* API Documentation */}
        <Paper elevation={0} sx={{ p: 4, mb: 6, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Api color="primary" fontSize="large" />
            <Typography variant="h5" fontWeight={700}>
              API & Integration
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" paragraph>
            RESTful API with comprehensive OpenAPI 3.0 documentation. All endpoints follow consistent
            naming conventions, error handling, and response formats.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#6366F1', 0.05), borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={800} color="primary">
                  50+
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  API Endpoints
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.05), borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={800} color="success.main">
                  100%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Type Safety
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#F59E0B', 0.05), borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={800} color="warning.main">
                  JWT
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Authentication
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#EF4444', 0.05), borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={800} color="error.main">
                  RBAC
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Authorization
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Contact & Repository */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#6366F1', 0.05)} 0%, ${alpha(
              '#0EA5E9',
              0.05
            )} 100%)`,
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Need More Information?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            For detailed technical documentation, API specifications, or to review the source code,
            please contact our team or access our repository.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<GitHub />}
              sx={{
                background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Contact for Demo
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<DataObject />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              API Documentation
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default DocumentationPage;
