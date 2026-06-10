// Internal "Compliance & Tech Pack" page.
//
// Audience: SUPER_ADMIN and ADMIN users who occasionally need to show the
// platform's technical and compliance evidence to ABDM auditors, hospital IT
// teams, or enterprise procurement. This page is intentionally NOT exposed on
// the public marketing surface — it lives behind login so we don't leak our
// stack inventory to the open internet.

import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Api,
  Architecture,
  CheckCircle,
  CloudQueue,
  Code,
  ExpandMore,
  Hub,
  IntegrationInstructions,
  Lock,
  Print,
  Security,
  Shield,
  Speed,
  Storage,
  VerifiedUser,
} from '@mui/icons-material';
import { PageHeader } from '../../components/ui';

const CompliancePack: React.FC = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | false>('panel1');
  const handleChange = (panel: string) =>
    (_: React.SyntheticEvent, isExpanded: boolean) =>
      setExpanded(isExpanded ? panel : false);

  const handlePrint = () => window.print();
  const openApiSpec = () => window.open('/api-docs', '_blank');

  return (
    <Box>
      <PageHeader
        icon={<Shield />}
        title="Compliance & Tech Pack"
        subtitle="Internal reference for ABDM auditors, IT due-diligence, and procurement reviewers. Not public-facing."
        eyebrow="Internal evidence"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Api />}
              onClick={openApiSpec}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Open API spec
            </Button>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Print / Save PDF
            </Button>
          </>
        }
      />

      {/* Friendly framing banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
          borderColor: alpha(theme.palette.primary.main, 0.25),
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Shield sx={{ color: 'primary.main', mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              How to use this page
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              Share this page (or its printed PDF) when an evaluator asks about
              architecture, ABDM milestone status, or compliance posture. It is the
              single source of truth — please keep it accurate as the platform
              evolves rather than maintaining separate decks.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Project overview tiles */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Platform overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          {
            icon: <Hub />,
            title: 'Multi-tenant by design',
            desc:
              'Per-hospital ABDM credentials, plan limits, and tenant-scoped queries on every endpoint.',
            color: theme.palette.primary.main,
          },
          {
            icon: <VerifiedUser />,
            title: 'Standards-aligned',
            desc:
              'FHIR R4 resources, ABDM M1/M2/M3 contracts, OpenAPI 3.0 spec, JWT + RBAC.',
            color: theme.palette.info.main,
          },
          {
            icon: <CloudQueue />,
            title: 'Cloud-ready',
            desc:
              'PostgreSQL + Prisma, Redis-backed queues for async jobs, structured logging end-to-end.',
            color: theme.palette.success.main,
          },
        ].map((c) => (
          <Grid item xs={12} md={4} key={c.title}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ color: c.color, display: 'flex' }}>{c.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {c.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {c.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Technical specifications */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Technical specifications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Reflects the current production stack — versions track the live{' '}
        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
          package.json
        </Box>
        .
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          {
            category: 'Backend Architecture',
            icon: <Architecture />,
            color: theme.palette.primary.main,
            items: [
              'Node.js 18+ with Express 4.21',
              'TypeScript 5.9 across the entire backend',
              'PostgreSQL 14+ via Prisma 5.22 (typed client + migrations)',
              'OpenAPI 3.0 served at /api-docs (swagger-jsdoc + swagger-ui-express)',
              'JWT access + refresh tokens, role-based authorization',
              '~213 routes across 22 router modules (audit-logged)',
            ],
          },
          {
            category: 'Frontend Stack',
            icon: <Code />,
            color: theme.palette.info.main,
            items: [
              'React 18 + TypeScript 5.3',
              'Vite 5 for build, MUI v5 for component system',
              'React Router v6 with lazy-loaded route bundles',
              'Redux Toolkit 2 for auth/session state',
              'Recharts 3 for dashboards & analytics',
              'Mobile-responsive across all roles',
            ],
          },
          {
            category: 'Security & Compliance',
            icon: <Security />,
            color: theme.palette.success.main,
            items: [
              'Helmet.js security headers + CORS allowlist',
              'bcrypt password hashing (cost factor 10)',
              'express-rate-limit on /auth/login and refresh',
              'express-validator + structured input checks',
              'Centralised error handler — Prisma errors mapped to safe messages',
              'Audit log middleware on user-mutating routes',
            ],
          },
          {
            category: 'ABDM Integration',
            icon: <IntegrationInstructions />,
            color: '#8B5CF6',
            items: [
              'Per-hospital HIP / HIU credentials (DB-driven, not env-global)',
              'M1: facility registration & service register endpoints',
              'M2: ABHA enrolment, link-token & care-context linking',
              'M3: consent request, fetch artefact, data-flow callbacks',
              'FHIR R4 resources: Patient, Encounter, Observation, MedicationRequest, DiagnosticReport',
              'BullMQ-backed health data push worker for async data flow',
            ],
          },
          {
            category: 'Observability',
            icon: <Speed />,
            color: theme.palette.warning.main,
            items: [
              'Winston structured JSON logging with request IDs',
              'Per-endpoint access logs (status, IP, userId)',
              'Prisma query logs in development',
              'Health check at /health and Redis liveness probe',
              'Audit trail (Audit table) for write operations',
            ],
          },
          {
            category: 'Data Management',
            icon: <Storage />,
            color: '#EC4899',
            items: [
              'Prisma migrations — every schema change is reproducible',
              'Soft-delete + tenant scoping on patients, hospitals, etc.',
              'JSONB columns for medical history, vitals snapshots, etc.',
              'Redis for session blacklist & queue backing',
              'Daily automated backups (managed Postgres)',
            ],
          },
        ].map((spec) => (
          <Grid item xs={12} md={6} key={spec.category}>
            <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: alpha(spec.color, 0.1),
                    color: spec.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {spec.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {spec.category}
                </Typography>
              </Stack>
              <List dense disablePadding>
                {spec.items.map((item) => (
                  <ListItem key={item} sx={{ px: 0, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 26, mt: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 15, color: spec.color }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item}
                      primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.55 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ABDM milestone status */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        ABDM milestone status
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        What's wired end-to-end today, what's behind a feature flag, and what's still ahead.
      </Typography>

      <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        {[
          {
            milestone: 'M1 — Facility & service registration',
            status: 'Implemented',
            tone: 'success' as const,
            details: [
              'Per-hospital HIP and HIU service registration via /api/v1/hip/register and /register-hiu',
              'Hospital model stores facility-level identifiers: hipId, hiuId, hfrFacilityId, abdmClientId, abdmClientSecret',
              'Per-doctor HPR ID lives on the Doctor row (used by FHIR Practitioner builder)',
              'SUPER_ADMIN can register HIP/HIU for any hospital; ADMIN locked to their own',
              'abdmEnabled + abdmRegisteredAt flags drive UI badges on the hospital list',
              'Facility QR uses hfrFacilityId / hipId as the hip-id parameter — strictly DB-driven, no env fallback',
            ],
          },
          {
            milestone: 'M2 — Patient registration & care-context linking',
            status: 'Implemented',
            tone: 'success' as const,
            details: [
              'ABHA enrolment via mobile / aadhaar with OTP flows',
              'AbhaRecord auto-created when a patient is registered with abhaNumber/abhaAddress',
              'Care-context creation on encounter check-in (falls back to Patient.abhaNumber when AbhaRecord missing)',
              'Link-token + HIP-initiated link endpoints scoped per hospital',
              'Care contexts visible on the Patient 360 timeline',
            ],
          },
          {
            milestone: 'M3 — Consent & health-record exchange',
            status: 'Implemented',
            tone: 'success' as const,
            details: [
              'Consent request, status fetch, artefact fetch and revoke — all tenant-scoped',
              'BullMQ "health data push" worker for async data-flow callbacks',
              'FHIR R4 bundle generation: Patient, Encounter, Observation, MedicationRequest, DiagnosticReport',
              'Consent expiry sweeper runs every 15 minutes',
              'Federated record retrieval (HIU side) plus consent status chips in Patient 360',
            ],
          },
          {
            milestone: 'M4 — Production hardening',
            status: 'In progress',
            tone: 'warning' as const,
            details: [
              'Webhook signature verification with rotated keys',
              'Configurable retention policies for consent artefacts',
              'Multi-region replication for HA',
              'Sandbox vs live environment toggle per hospital',
            ],
          },
        ].map((m, idx) => (
          <Accordion
            key={m.milestone}
            expanded={expanded === `panel${idx + 1}`}
            onChange={handleChange(`panel${idx + 1}`)}
            elevation={0}
            disableGutters
            sx={{
              '&:before': { display: 'none' },
              bgcolor: 'transparent',
              borderBottom: idx < 3 ? `1px solid ${theme.palette.divider}` : 'none',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                  {m.milestone}
                </Typography>
                <Chip
                  label={m.status}
                  size="small"
                  color={m.tone === 'success' ? 'success' : 'warning'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
              <List dense disablePadding>
                {m.details.map((d) => (
                  <ListItem key={d} sx={{ px: 0, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                      <CheckCircle
                        sx={{
                          fontSize: 16,
                          color:
                            m.tone === 'success'
                              ? theme.palette.success.main
                              : theme.palette.warning.main,
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={d}
                      primaryTypographyProps={{ sx: { fontSize: '0.9rem', lineHeight: 1.6 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Module coverage */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Module coverage
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A self-honest read on each module's depth — coverage reflects feature
        completeness against the documented spec, not lines of code.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { name: 'OPD & Appointments',  coverage: 95, color: theme.palette.primary.main },
          { name: 'IPD & Admissions',    coverage: 92, color: theme.palette.info.main },
          { name: 'Lab Investigations',  coverage: 90, color: theme.palette.success.main },
          { name: 'Pharmacy & Stock',    coverage: 88, color: theme.palette.warning.main },
          { name: 'Billing & Payments',  coverage: 93, color: theme.palette.error.main },
          { name: 'ABHA / HIP / HIU',    coverage: 85, color: '#8B5CF6' },
          { name: 'Consent (M3)',        coverage: 80, color: '#EC4899' },
          { name: 'EHR & Vitals',        coverage: 90, color: '#14B8A6' },
          { name: 'Analytics Dashboard', coverage: 85, color: theme.palette.primary.dark },
          { name: 'Audit Logs',          coverage: 95, color: theme.palette.info.dark },
          { name: 'Document Management', coverage: 80, color: theme.palette.success.dark },
          { name: 'Multi-tenant Admin',  coverage: 88, color: theme.palette.warning.dark },
        ].map((m) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={m.name}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {m.name}
                </Typography>
                <Chip label="Production" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Feature coverage</Typography>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: m.color, lineHeight: 1 }}>
                  {m.coverage}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={m.coverage}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(m.color, 0.12),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${m.color}, ${alpha(m.color, 0.7)})`,
                  },
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Security & Compliance */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Security &amp; compliance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Posture summary — share with auditors and IT due-diligence teams as needed.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Data protection
            </Typography>
            <List dense disablePadding>
              {[
                'TLS 1.2+ enforced for all transport',
                'bcrypt password hashing (cost factor 10)',
                'JWT signed with RSA key pair (rotation supported)',
                'Refresh-token rotation on each /auth/refresh',
                'Parameterised queries via Prisma — no string SQL',
                'CSP / Helmet headers on all responses',
              ].map((it) => (
                <ListItem key={it} sx={{ px: 0, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 26, mt: 0.5 }}>
                    <Lock sx={{ fontSize: 15, color: theme.palette.success.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={it}
                    primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Compliance posture
            </Typography>
            <List dense disablePadding>
              {[
                'ABDM technical specification adherence (M1–M3)',
                'FHIR R4 resource modelling',
                'Comprehensive audit trail (who, what, when, from-IP)',
                'Tenant isolation on every query (hospitalId scope)',
                'Configurable consent expiry + automatic revocation',
                'Per-hospital data deletion / soft-delete primitives',
              ].map((it) => (
                <ListItem key={it} sx={{ px: 0, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 26, mt: 0.5 }}>
                    <VerifiedUser sx={{ fontSize: 15, color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={it}
                    primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* API surface metrics */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        API &amp; integration surface
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        REST surface served at{' '}
        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
          /api/v1
        </Box>
        . All routes return a uniform{' '}
        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
          {'{ success, message, data, timestamp }'}
        </Box>{' '}
        envelope and document themselves through the live OpenAPI 3.0 spec at{' '}
        <Box
          component="a"
          href="/api-docs"
          target="_blank"
          rel="noreferrer"
          sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}
        >
          /api-docs
        </Box>
        .
      </Typography>

      <Grid container spacing={2}>
        {[
          { value: '210+',  label: 'Documented endpoints',     color: theme.palette.primary.main },
          { value: '22',    label: 'Router modules',           color: theme.palette.info.main },
          { value: '100%',  label: 'TypeScript across stack',  color: theme.palette.success.main },
          { value: 'JWT',   label: 'Auth + refresh rotation',  color: theme.palette.warning.main },
          { value: 'RBAC',  label: '7 distinct user roles',    color: '#8B5CF6' },
          { value: 'M1–M3', label: 'ABDM milestone coverage',  color: '#EC4899' },
        ].map((s) => (
          <Grid item xs={6} sm={4} md={2} key={s.label}>
            <Box
              sx={{
                textAlign: 'center',
                p: 1.75,
                bgcolor: alpha(s.color, 0.05),
                border: `1px solid ${alpha(s.color, 0.2)}`,
                borderRadius: 2,
                height: '100%',
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ color: s.color, lineHeight: 1.1 }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {s.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CompliancePack;
