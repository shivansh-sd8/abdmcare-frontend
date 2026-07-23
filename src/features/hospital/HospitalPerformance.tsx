import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Grid, Stack, Typography, Skeleton, alpha, useTheme,
  Chip, Divider, Button, IconButton, Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Business, ArrowBack, Refresh, OpenInNew, People, LocalHospital,
  CalendarToday, Assignment, Hotel, Receipt, HealthAndSafety, Bolt,
  Hub, Verified, Cancel,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../services/api';
import { GradientHero, StatCard, SectionCard, EmptyState } from '../../components/ui';
import { useAppDispatch } from '../../hooks/redux';
import { setSelectedHospitalId } from '../../store/slices/uiSlice';

interface HospitalPerformanceData {
  hospital: {
    id: string;
    name: string;
    code?: string;
    type?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    status?: string;
    isActive?: boolean;
    abdmEnabled?: boolean;
    hipId?: string;
    hiuId?: string;
    createdAt?: string;
  };
  summary: {
    totalPatients: number;
    abhaLinkedPatients: number;
    abhaPercent: number;
    todayPatients: number;
    totalDoctors: number;
    hprLinkedDoctors: number;
    hprPercent: number;
    totalAppointments: number;
    todayAppointments: number;
    completedAppointments: number;
    totalEncounters: number;
    completedEncounters: number;
    totalAdmissions: number;
    activeAdmissions: number;
    dischargedAdmissions: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyPercent: number;
    revenue30d: number;
    paymentCount30d: number;
  };
  trend: { date: string; patients: number; encounters: number; admissions: number }[];
  specializations: { name: string; count: number }[];
}

const formatINR = (n: number): string => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const HospitalPerformance: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HospitalPerformanceData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const res: any = await api.get(`/api/v1/hospitals/${id}/stats`);
      const payload: HospitalPerformanceData = res?.data?.data || res?.data || null;
      setData(payload);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const SPEC_COLORS = useMemo(() => [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
  ], [theme]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 3, mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState
          icon={<Business />}
          title="Hospital not found"
          message="Either this hospital doesn't exist, or you don't have access to view it."
          action={{
            label: 'Back to hospitals',
            onClick: () => navigate('/app/hospitals'),
            icon: <ArrowBack />,
          }}
        />
      </Box>
    );
  }

  const { hospital, summary, trend, specializations } = data;
  const adoptionPie = [
    { name: 'ABHA Linked', value: summary.abhaLinkedPatients },
    { name: 'Not Linked', value: Math.max(0, summary.totalPatients - summary.abhaLinkedPatients) },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header / hero */}
      <GradientHero
        icon={<Business />}
        title={hospital.name}
        subtitle={
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ gap: 0.75 }}>
            {hospital.code && (
              <Chip
                size="small"
                label={hospital.code}
                sx={{ bgcolor: alpha('#fff', 0.18), color: '#fff', height: 22, fontSize: '0.7rem', fontWeight: 700 }}
              />
            )}
            {hospital.type && (
              <Chip
                size="small"
                label={hospital.type.replace(/_/g, ' ')}
                sx={{ bgcolor: alpha('#fff', 0.18), color: '#fff', height: 22, fontSize: '0.7rem', fontWeight: 700 }}
              />
            )}
            {(hospital.city || hospital.state) && (
              <Typography variant="caption" sx={{ color: '#fff', opacity: 0.92 }}>
                {[hospital.city, hospital.state].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Stack>
        }
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/app/hospitals')}
              sx={{
                color: '#fff',
                borderColor: alpha('#fff', 0.45),
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { borderColor: '#fff', background: alpha('#fff', 0.12) },
              }}
            >
              All hospitals
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<OpenInNew />}
              onClick={() => {
                dispatch(setSelectedHospitalId(hospital.id));
                navigate('/app/dashboard');
              }}
              sx={{
                bgcolor: '#fff',
                color: theme.palette.primary.main,
                textTransform: 'none',
                fontWeight: 800,
                '&:hover': { bgcolor: alpha('#fff', 0.92) },
              }}
            >
              View as this hospital
            </Button>
            <Tooltip title="Refresh">
              <IconButton
                onClick={load}
                disabled={refreshing}
                size="small"
                sx={{ color: '#fff', border: `1px solid ${alpha('#fff', 0.4)}` }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        badge={
          <Stack direction="row" spacing={0.5}>
            {hospital.abdmEnabled ? (
              <Chip
                size="small"
                icon={<Verified sx={{ fontSize: 14 }} />}
                label="ABDM Active"
                sx={{ bgcolor: alpha('#fff', 0.22), color: '#fff', height: 22, fontSize: '0.7rem', fontWeight: 800, '& .MuiChip-icon': { color: '#fff' } }}
              />
            ) : (
              <Chip
                size="small"
                icon={<Cancel sx={{ fontSize: 14 }} />}
                label="ABDM Off"
                sx={{ bgcolor: alpha('#fff', 0.18), color: '#fff', height: 22, fontSize: '0.7rem', fontWeight: 700, '& .MuiChip-icon': { color: '#fff' } }}
              />
            )}
          </Stack>
        }
      />

      {refreshing && <LinearProgress sx={{ mt: 1.25, borderRadius: 1 }} />}

      {/* Top stat row — most important numbers a CFO/admin wants to see first. */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<People />}
            label="Patients"
            value={summary.totalPatients.toLocaleString('en-IN')}
            tone="primary"
            delta={{ value: `+${summary.todayPatients} today`, trend: summary.todayPatients > 0 ? 'up' : 'flat' }}
            hint="Total registered patients in this hospital"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<HealthAndSafety />}
            label="ABHA Linked"
            value={`${summary.abhaPercent}%`}
            tone="success"
            delta={{ value: `${summary.abhaLinkedPatients.toLocaleString('en-IN')} of ${summary.totalPatients.toLocaleString('en-IN')}`, trend: 'flat' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<LocalHospital />}
            label="Doctors"
            value={summary.totalDoctors.toLocaleString('en-IN')}
            tone="info"
            delta={{ value: `${summary.hprLinkedDoctors} HPR-linked (${summary.hprPercent}%)`, trend: 'flat' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Receipt />}
            label="Revenue (30d)"
            value={formatINR(summary.revenue30d)}
            tone="warning"
            delta={{ value: `${summary.paymentCount30d} payments`, trend: 'flat' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CalendarToday />}
            label="Appointments"
            value={summary.totalAppointments.toLocaleString('en-IN')}
            tone="primary"
            delta={{ value: `+${summary.todayAppointments} today`, trend: summary.todayAppointments > 0 ? 'up' : 'flat' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Assignment />}
            label="Encounters"
            value={summary.totalEncounters.toLocaleString('en-IN')}
            tone="info"
            delta={{ value: `${summary.completedEncounters} completed`, trend: 'flat' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Hotel />}
            label="Admissions"
            value={summary.totalAdmissions.toLocaleString('en-IN')}
            tone="success"
            delta={{ value: `${summary.activeAdmissions} active`, trend: summary.activeAdmissions > 0 ? 'up' : 'flat' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Bolt />}
            label="Bed Occupancy"
            value={`${summary.occupancyPercent}%`}
            tone="warning"
            delta={{ value: `${summary.occupiedBeds} of ${summary.totalBeds} beds`, trend: 'flat' }}
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        {/* 7-day activity */}
        <Grid item xs={12} md={8}>
          <SectionCard
            title="7-day activity"
            subtitle="Patients registered, encounters opened, admissions opened"
          >
            <Box sx={{ height: 280, mx: -1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-patients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="g-enc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.info.main} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={theme.palette.info.main} stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="g-adm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={alpha(theme.palette.text.secondary, 0.10)} vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${theme.palette.divider}`,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone" dataKey="patients" name="Patients"
                    stroke={theme.palette.primary.main} strokeWidth={2}
                    fill="url(#g-patients)"
                  />
                  <Area
                    type="monotone" dataKey="encounters" name="Encounters"
                    stroke={theme.palette.info.main} strokeWidth={2}
                    fill="url(#g-enc)"
                  />
                  <Area
                    type="monotone" dataKey="admissions" name="Admissions"
                    stroke={theme.palette.success.main} strokeWidth={2}
                    fill="url(#g-adm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>

        {/* ABHA adoption donut */}
        <Grid item xs={12} md={4}>
          <SectionCard title="ABHA adoption" subtitle="Patients with a linked ABHA ID">
            <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {summary.totalPatients === 0 ? (
                <EmptyState
                  icon={<HealthAndSafety />}
                  title="No patients yet"
                  message="Once patients are registered the adoption breakdown will appear here."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adoptionPie}
                      cx="50%" cy="50%"
                      innerRadius={70} outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill={theme.palette.success.main} />
                      <Cell fill={alpha(theme.palette.text.secondary, 0.18)} />
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: `1px solid ${theme.palette.divider}`,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>
            {summary.totalPatients > 0 && (
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: -3, mb: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="caption" fontWeight={700}>{summary.abhaPercent}% linked</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: alpha(theme.palette.text.secondary, 0.4) }} />
                  <Typography variant="caption" color="text.secondary">{100 - summary.abhaPercent}% not linked</Typography>
                </Stack>
              </Stack>
            )}
          </SectionCard>
        </Grid>

        {/* Specialisation mix */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Doctor specialisations" subtitle="Top specialities at this hospital">
            {specializations.length === 0 ? (
              <Box sx={{ py: 4 }}>
                <EmptyState
                  icon={<LocalHospital />}
                  title="No specialisations yet"
                  message="Add doctors with specialisations to see this breakdown."
                />
              </Box>
            ) : (
              <Box sx={{ height: 280, mx: -1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={specializations} layout="vertical" margin={{ top: 8, right: 16, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke={alpha(theme.palette.text.secondary, 0.08)} horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={130} />
                    <RTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: `1px solid ${theme.palette.divider}`,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {specializations.map((_, i) => (
                        <Cell key={i} fill={SPEC_COLORS[i % SPEC_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* Hospital info card */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Hospital details" subtitle="Onboarding & ABDM identifiers">
            <Stack divider={<Divider flexItem />} spacing={1.5} sx={{ p: 0.5 }}>
              <InfoRow label="Status">
                <Chip
                  size="small"
                  label={hospital.status || 'TRIAL'}
                  color={hospital.status === 'ACTIVE' ? 'success' : (hospital.status === 'SUSPENDED' ? 'error' : 'warning')}
                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                />
              </InfoRow>
              <InfoRow label="Email">{hospital.email || '—'}</InfoRow>
              <InfoRow label="Phone">{hospital.phone || '—'}</InfoRow>
              <InfoRow label="Location">
                {[hospital.city, hospital.state].filter(Boolean).join(', ') || '—'}
              </InfoRow>
              <InfoRow label="HIP ID">
                {hospital.hipId
                  ? <Chip size="small" label={hospital.hipId} sx={{ height: 20, fontSize: '0.65rem' }} />
                  : <Chip size="small" label="Not registered" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />}
              </InfoRow>
              <InfoRow label="HIU ID">
                {hospital.hiuId
                  ? <Chip size="small" label={hospital.hiuId} sx={{ height: 20, fontSize: '0.65rem' }} />
                  : <Chip size="small" label="Not registered" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />}
              </InfoRow>
              <InfoRow label="Onboarded">
                {hospital.createdAt
                  ? new Date(hospital.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </InfoRow>
            </Stack>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Hub />}
                onClick={() => navigate(`/app/hospitals?openId=${hospital.id}`)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Manage hospital
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<Business />}
                onClick={() => {
                  dispatch(setSelectedHospitalId(hospital.id));
                  navigate('/app/patients');
                }}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Browse patients
              </Button>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minHeight: 28 }}>
    <Typography
      variant="caption"
      sx={{
        width: 100,
        color: 'text.secondary',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontSize: '0.66rem',
      }}
    >
      {label}
    </Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {typeof children === 'string'
        ? <Typography variant="body2" fontWeight={600}>{children}</Typography>
        : children}
    </Box>
  </Stack>
);

export default HospitalPerformance;
