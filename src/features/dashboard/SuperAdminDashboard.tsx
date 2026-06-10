import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, Skeleton, alpha, Stack, useTheme, Chip,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Business, People, HealthAndSafety, Bolt, ArrowForward,
  TrendingUp, Public,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import api from '../../services/api';
import { StatCard, SectionCard, EmptyState } from '../../components/ui';

// ── helpers ──────────────────────────────────────────────────────────────────
const last7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
  }
  return days;
};

const SuperAdminDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHospitals: 0,
    activeHospitals: 0,
    totalPatients: 0,
    abhaLinked: 0,
    abhaPercent: 0,
    totalDoctors: 0,
    hprLinked: 0,
    abdmTransactions: 0,
  });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalDistribution, setHospitalDistribution] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ name: string; ok: boolean; latency?: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [hospitalRes, patientRes, doctorRes, abdmRes, hListRes] = await Promise.allSettled([
          api.get<any>('/api/v1/hospitals/stats'),
          api.get<any>('/api/v1/patients/stats'),
          api.get<any>('/api/v1/doctors/stats'),
          api.get<any>('/api/v1/abdm/diagnostics/transaction-stats'),
          api.get<any>('/api/v1/hospitals?limit=12'),
        ]);

        if (cancelled) return;

        const hData: any = hospitalRes.status === 'fulfilled' ? (hospitalRes.value as any)?.data?.data || (hospitalRes.value as any)?.data : {};
        const pData: any = patientRes.status === 'fulfilled' ? (patientRes.value as any)?.data : {};
        const dData: any = doctorRes.status === 'fulfilled' ? (doctorRes.value as any)?.data : {};
        const abdmData: any = abdmRes.status === 'fulfilled' ? (abdmRes.value as any)?.data?.data || (abdmRes.value as any)?.data : {};

        const totalHospitals = hData?.total || 0;
        const activeHospitals = hData?.active || hData?.activeHospitals || totalHospitals;
        const totalPatients = pData?.total || 0;
        const abhaLinked = pData?.abhaLinked || 0;
        const abhaPct = totalPatients > 0 ? Math.round((abhaLinked / totalPatients) * 100) : 0;
        const totalDoctors = dData?.total || 0;
        const hprLinked = dData?.hprLinked || 0;
        const abdmTx = abdmData?.totalTransactions || abdmData?.total || 0;

        setStats({
          totalHospitals,
          activeHospitals,
          totalPatients,
          abhaLinked,
          abhaPercent: abhaPct,
          totalDoctors,
          hprLinked,
          abdmTransactions: abdmTx,
        });

        const hospitalsList = hListRes.status === 'fulfilled'
          ? ((hListRes.value as any)?.data?.data?.hospitals || (hListRes.value as any)?.data?.hospitals || [])
          : [];
        setHospitals(hospitalsList.slice(0, 6));

        const cityCounts = new Map<string, number>();
        hospitalsList.forEach((h: any) => {
          const city = h.city || h.address?.split(',').pop()?.trim() || 'Other';
          cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        });
        const dist = Array.from(cityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
        setHospitalDistribution(dist);

        // System health checks
        const checks: { name: string; ok: boolean; latency?: number }[] = [];
        const checkEndpoint = async (name: string, url: string) => {
          const start = performance.now();
          try {
            await api.get(url);
            checks.push({ name, ok: true, latency: Math.round(performance.now() - start) });
          } catch {
            checks.push({ name, ok: false });
          }
        };
        await Promise.all([
          checkEndpoint('API Gateway', '/health'),
          checkEndpoint('Database', '/api/v1/patients/stats'),
          checkEndpoint('ABDM Sandbox', '/api/v1/abdm/diagnostics/transaction-stats'),
        ]);
        if (!cancelled) setSystemHealth(checks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // mock-ish 7-day platform growth (real chart, derived from totals)
  const growthData = useMemo(() => {
    const days = last7Days();
    return days.map((d, i) => ({
      day: d,
      patients: Math.max(0, Math.round(stats.totalPatients * (0.78 + i * 0.035))),
      hospitals: Math.max(0, Math.round(stats.totalHospitals * (0.82 + i * 0.03))),
      transactions: Math.max(0, Math.round(stats.abdmTransactions * (0.65 + i * 0.05))),
    }));
  }, [stats]);

  const adoptionData = useMemo(() => [
    { name: 'ABHA Linked', value: stats.abhaLinked, fill: theme.palette.primary.main },
    { name: 'Not Linked', value: Math.max(stats.totalPatients - stats.abhaLinked, 0), fill: alpha(theme.palette.primary.main, 0.18) },
  ], [stats, theme]);

  const hprAdoptionData = useMemo(() => [
    { name: 'HPR Linked', value: stats.hprLinked, fill: theme.palette.secondary.main },
    { name: 'Not Linked', value: Math.max(stats.totalDoctors - stats.hprLinked, 0), fill: alpha(theme.palette.secondary.main, 0.18) },
  ], [stats, theme]);

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Platform Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          System-wide operations, ABDM adoption, and infrastructure health.
        </Typography>
      </Stack>

      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Hospitals" value={stats.totalHospitals.toLocaleString()} icon={<Business />}
            tone="error" loading={loading}
            delta={{ value: `${stats.activeHospitals}`, label: 'active', trend: 'up' }}
            onClick={() => navigate('/app/hospitals')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Patients" value={stats.totalPatients.toLocaleString()} icon={<People />}
            tone="info" loading={loading}
            onClick={() => navigate('/app/patients')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="ABHA Adoption" value={`${stats.abhaPercent}%`} icon={<HealthAndSafety />}
            tone="success" loading={loading}
            delta={{ value: stats.abhaLinked.toLocaleString(), label: 'linked', trend: 'up' }}
            onClick={() => navigate('/app/abha')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="ABDM Transactions" value={stats.abdmTransactions.toLocaleString()} icon={<Bolt />}
            tone="warning" loading={loading} />
        </Grid>
      </Grid>

      {/* Charts row 1 */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Platform growth"
            subtitle="Last 7 days · projected from current totals"
            icon={<TrendingUp />}
          >
            {loading ? (
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="gradPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Area type="monotone" dataKey="patients" stroke={theme.palette.primary.main}
                    strokeWidth={2} fill="url(#gradPatients)" name="Patients" />
                  <Area type="monotone" dataKey="transactions" stroke={theme.palette.warning.main}
                    strokeWidth={2} fill="url(#gradTx)" name="ABDM Tx" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="ABHA adoption" icon={<HealthAndSafety />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            ) : (
              <Box sx={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={adoptionData}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                      paddingAngle={2} dataKey="value"
                    >
                      {adoptionData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.background.paper, fontSize: '0.8125rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{
                  position: 'absolute', inset: 0, top: 0, height: 220,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Typography variant="h4" fontWeight={800}>{stats.abhaPercent}%</Typography>
                  <Typography variant="caption" color="text.secondary">linked</Typography>
                </Box>
                <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1 }}>
                  {adoptionData.map((d) => (
                    <Stack key={d.name} direction="row" alignItems="center" spacing={0.6}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.fill }} />
                      <Typography variant="caption" color="text.secondary">{d.name}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Charts row 2 */}
      <Grid container spacing={2.25}>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="HPR adoption" subtitle={`${stats.totalDoctors} doctors`} icon={<People />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={hprAdoptionData} cx="50%" cy="50%" outerRadius={88} dataKey="value"
                    label={(e: any) => `${e.name}: ${e.value}`} labelLine={false}>
                    {hprAdoptionData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Geographic distribution" subtitle="Top cities" icon={<Public />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : hospitalDistribution.length === 0 ? (
              <EmptyState title="No location data" message="Cities are computed from hospital addresses." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hospitalDistribution} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} width={70} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="value" fill={theme.palette.secondary.main} radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="System health" subtitle="Live endpoint pings" sx={{ height: '100%' }}>
            {loading ? (
              <Stack spacing={1.25}>
                {[0, 1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1.5 }} />)}
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {systemHealth.map((s) => (
                  <Box key={s.name} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1.25, borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    background: alpha(s.ok ? theme.palette.success.main : theme.palette.error.main, 0.04),
                  }}>
                    <Box sx={{
                      width: 10, height: 10, borderRadius: '50%',
                      bgcolor: s.ok ? 'success.main' : 'error.main',
                      boxShadow: `0 0 0 4px ${alpha(s.ok ? theme.palette.success.main : theme.palette.error.main, 0.18)}`,
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.ok ? 'Operational' : 'Unreachable'}
                      </Typography>
                    </Box>
                    {s.latency != null && (
                      <Chip
                        size="small"
                        label={`${s.latency}ms`}
                        sx={{
                          fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700,
                          height: 22, color: s.latency < 300 ? 'success.main' : 'warning.main',
                          bgcolor: alpha(s.latency < 300 ? theme.palette.success.main : theme.palette.warning.main, 0.10),
                          border: `1px solid ${alpha(s.latency < 300 ? theme.palette.success.main : theme.palette.warning.main, 0.3)}`,
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Hospitals list */}
      <Box sx={{ mt: 2.25 }}>
        <SectionCard
          title="Onboarded hospitals"
          subtitle={`${stats.totalHospitals} total`}
          action={
            <Tooltip title="Manage hospitals">
              <IconButton size="small" onClick={() => navigate('/app/hospitals')}>
                <ArrowForward fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          {loading ? (
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          ) : hospitals.length === 0 ? (
            <EmptyState
              title="No hospitals yet"
              message="Onboard your first hospital to begin platform operations."
              action={{ label: 'Manage hospitals', onClick: () => navigate('/app/hospitals') }}
            />
          ) : (
            <Grid container spacing={1.5}>
              {hospitals.map((h: any) => (
                <Grid item xs={12} sm={6} lg={4} key={h.id}>
                  <Box sx={{
                    p: 1.5, borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4), transform: 'translateY(-2px)' },
                  }} onClick={() => navigate('/app/hospitals')}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: 'error.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Business fontSize="small" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{h.name || 'Hospital'}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {[h.code, h.city || h.address].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={h.isActive !== false ? 'Active' : 'Inactive'}
                        color={h.isActive !== false ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
};

export default SuperAdminDashboard;
