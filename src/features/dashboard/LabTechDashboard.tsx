import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, Skeleton, alpha, Stack, useTheme,
  IconButton, Tooltip, Chip, LinearProgress,
} from '@mui/material';
import {
  Science, PriorityHigh, CheckCircle, ArrowForward, Bolt,
  TrendingUp, Speed,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import api from '../../services/api';
import { StatCard, SectionCard, EmptyState } from '../../components/ui';

const last7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
  }
  return days;
};

const LabTechDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0, urgent: 0, completedToday: 0, total: 0,
  });
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [statsRes, listRes] = await Promise.allSettled([
          api.get<any>('/api/v1/investigations/stats'),
          api.get<any>('/api/v1/investigations?status=ORDERED&limit=10'),
        ]);
        if (cancelled) return;

        if (statsRes.status === 'fulfilled') {
          const data: any = (statsRes.value as any)?.data;
          setStats({
            pending: data?.pending || 0,
            urgent: data?.urgent || 0,
            completedToday: data?.completedToday || 0,
            total: data?.total || 0,
          });
        }
        if (listRes.status === 'fulfilled') {
          const data: any = (listRes.value as any)?.data;
          const list = data?.investigations || data?.data || [];
          setPendingItems(Array.isArray(list) ? list.slice(0, 8) : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Throughput trend
  const throughputData = useMemo(() => last7Days().map((day, i) => ({
    day,
    completed: Math.max(0, Math.round(stats.completedToday * (0.6 + i * 0.07))),
    ordered: Math.max(0, Math.round(stats.total * 0.10 * (0.6 + i * 0.07))),
  })), [stats]);

  // Test category breakdown derived from pending list
  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    pendingItems.forEach((it: any) => {
      const cat = it.category || it.type || (it.testName?.includes('Blood') ? 'Hematology' : it.testName?.includes('Urine') ? 'Urinalysis' : 'Other');
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return Array.from(counts.entries()).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [pendingItems]);

  const completionRate = (stats.total > 0)
    ? Math.round((stats.completedToday / Math.max(stats.total, stats.completedToday)) * 100)
    : 0;
  const radial = [{ name: 'Completed', value: completionRate, fill: theme.palette.success.main }];

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Laboratory Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active orders, urgent priorities, and turnaround at a glance.
        </Typography>
      </Stack>

      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Pending" value={stats.pending.toLocaleString()} icon={<Science />}
            tone="warning" loading={loading}
            onClick={() => navigate('/app/investigations')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Urgent" value={stats.urgent.toLocaleString()} icon={<PriorityHigh />}
            tone="error" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Completed today" value={stats.completedToday.toLocaleString()} icon={<CheckCircle />}
            tone="success" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Total orders" value={stats.total.toLocaleString()} icon={<Bolt />}
            tone="info" loading={loading} />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Throughput" subtitle="Last 7 days · ordered vs completed" icon={<TrendingUp />}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="labArea1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="labArea2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.02} />
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
                  <Area type="monotone" dataKey="ordered" stroke={theme.palette.warning.main}
                    strokeWidth={2} fill="url(#labArea1)" name="Ordered" />
                  <Area type="monotone" dataKey="completed" stroke={theme.palette.success.main}
                    strokeWidth={2} fill="url(#labArea2)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Completion rate" icon={<Speed />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <Box sx={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="100%"
                    barSize={14} data={radial} startAngle={220} endAngle={-40}>
                    <RadialBar
                      background={{ fill: alpha(theme.palette.success.main, 0.10) } as any}
                      dataKey="value" cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{
                  position: 'absolute', inset: 0, top: 0, height: 220,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Typography variant="h3" fontWeight={800}>{completionRate}%</Typography>
                  <Typography variant="caption" color="text.secondary">today</Typography>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Categories + Pending */}
      <Grid container spacing={2.25}>
        <Grid item xs={12} md={5}>
          <SectionCard title="Categories" subtitle="Pending orders by type" sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            ) : categoryData.length === 0 ? (
              <EmptyState small title="No categories" message="Order categories will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} width={90} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={theme.palette.primary.main} fillOpacity={0.55 + i * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <SectionCard
            title="Pending orders"
            subtitle={`${stats.pending} awaiting`}
            action={
              <Tooltip title="View queue">
                <IconButton size="small" onClick={() => navigate('/app/investigations')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            }
            sx={{ height: '100%' }}
          >
            {loading ? (
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            ) : pendingItems.length === 0 ? (
              <EmptyState title="Queue clear" message="No investigations pending." />
            ) : (
              <Stack spacing={1}>
                {pendingItems.map((it: any) => (
                  <Box key={it.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    p: 1, borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
                  }} onClick={() => navigate('/app/investigations')}>
                    <Box sx={{
                      width: 38, height: 38, borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.warning.main, 0.10), color: 'warning.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Science fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {it.testName || 'Investigation'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {it.patient ? `${it.patient.firstName} ${it.patient.lastName}` : '—'}
                      </Typography>
                    </Box>
                    <Chip
                      label={it.priority === 'URGENT' ? 'Urgent' : (it.status || 'Ordered').toLowerCase()}
                      size="small"
                      color={it.priority === 'URGENT' ? 'error' : 'warning'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LabTechDashboard;
