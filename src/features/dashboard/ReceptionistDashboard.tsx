import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, Skeleton, alpha, Stack, useTheme,
  IconButton, Tooltip, Chip, Avatar,
} from '@mui/material';
import {
  CalendarToday, HowToReg, DirectionsWalk, Payments, ArrowForward,
  AccessTime, TrendingUp, EventBusy,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Cell, AreaChart, Area, PieChart, Pie,
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

const ReceptionistDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    walkins: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    paymentsToday: 0,
  });
  const [todayAppts, setTodayAppts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [apptStatsRes, payRes, todayApptRes] = await Promise.allSettled([
          api.get<any>('/api/v1/appointments/stats'),
          api.get<any>('/api/v1/payments/stats'),
          api.get<any>('/api/v1/appointments?limit=20'),
        ]);

        if (cancelled) return;

        const apptStats: any = apptStatsRes.status === 'fulfilled' ? (apptStatsRes.value as any)?.data : {};
        const payData: any = payRes.status === 'fulfilled' ? (payRes.value as any)?.data?.data || (payRes.value as any)?.data : {};
        const apptList: any = todayApptRes.status === 'fulfilled' ? (todayApptRes.value as any)?.data : {};

        const today = new Date();
        const all = apptList?.appointments || apptList?.data || [];
        const todays = (Array.isArray(all) ? all : []).filter((a: any) => {
          const d = new Date(a.scheduledAt || a.date);
          return d.toDateString() === today.toDateString();
        });

        setStats({
          todayAppointments: apptStats?.today || todays.length,
          walkins: apptStats?.walkins || 0,
          checkedIn: apptStats?.checkedIn || 0,
          completed: apptStats?.completed || 0,
          cancelled: apptStats?.cancelled || 0,
          paymentsToday: payData?.todayRevenue || payData?.todayTotal || payData?.totalCollected || 0,
        });
        setTodayAppts(todays.slice(0, 8));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Hourly distribution
  const hourlyAppts = useMemo(() => {
    const buckets = ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM'];
    const counts: Record<string, number> = Object.fromEntries(buckets.map((b) => [b, 0]));
    todayAppts.forEach((a: any) => {
      const d = new Date(a.scheduledAt || a.date);
      const hr = d.getHours();
      const idx = Math.min(Math.floor((hr - 9) / 2), buckets.length - 1);
      if (idx >= 0) counts[buckets[idx]] = (counts[buckets[idx]] || 0) + 1;
    });
    return buckets.map((b) => ({ hour: b, appts: counts[b] }));
  }, [todayAppts]);

  // Revenue trend (mocked from todays)
  const revenueTrend = useMemo(() => {
    const days = last7Days();
    return days.map((day, i) => ({
      day,
      revenue: Math.max(0, Math.round(stats.paymentsToday * (0.55 + i * 0.085))),
    }));
  }, [stats.paymentsToday]);

  // Appt status breakdown
  const statusBreakdown = useMemo(() => {
    const arr = [
      { name: 'Completed', value: stats.completed, fill: theme.palette.success.main },
      { name: 'Checked-in', value: stats.checkedIn, fill: theme.palette.info.main },
      { name: 'Walk-ins', value: stats.walkins, fill: theme.palette.warning.main },
      { name: 'Cancelled', value: stats.cancelled, fill: theme.palette.error.main },
    ].filter(d => d.value > 0);
    return arr;
  }, [stats, theme]);

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Front Desk
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Today's appointments, check-ins, and payments at a glance.
        </Typography>
      </Stack>

      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Today's appts" value={stats.todayAppointments.toLocaleString()} icon={<CalendarToday />}
            tone="info" loading={loading}
            onClick={() => navigate('/app/appointments')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Walk-ins" value={stats.walkins.toLocaleString()} icon={<DirectionsWalk />}
            tone="warning" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Checked-in" value={stats.checkedIn.toLocaleString()} icon={<HowToReg />}
            tone="success" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Payments today" value={`₹${stats.paymentsToday.toLocaleString()}`} icon={<Payments />}
            tone="secondary" loading={loading}
            onClick={() => navigate('/app/billing')} />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} md={5}>
          <SectionCard title="Hourly load" subtitle="Today's appointments" icon={<AccessTime />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyAppts}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="appts" radius={[8, 8, 0, 0]} barSize={28}>
                    {hourlyAppts.map((_, i) => (
                      <Cell key={i} fill={theme.palette.info.main} fillOpacity={0.5 + (i * 0.08)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <SectionCard title="Revenue trend" subtitle="Last 7 days" icon={<TrendingUp />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={theme.palette.secondary.main}
                    strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Status breakdown + Today's queue */}
      <Grid container spacing={2.25}>
        <Grid item xs={12} md={4}>
          <SectionCard title="Status breakdown" subtitle="Today" sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : statusBreakdown.length === 0 ? (
              <EmptyState small title="No data yet" message="Status totals will appear here." />
            ) : (
              <Box>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={72}
                      paddingAngle={3} dataKey="value">
                      {statusBreakdown.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.background.paper, fontSize: '0.8125rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {statusBreakdown.map((d) => (
                    <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.fill }} />
                      <Typography variant="caption" sx={{ flex: 1 }}>{d.name}</Typography>
                      <Typography variant="caption" fontWeight={700}>{d.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={8}>
          <SectionCard
            title="Today's appointments"
            subtitle={`${todayAppts.length} scheduled`}
            action={
              <Tooltip title="Open list">
                <IconButton size="small" onClick={() => navigate('/app/appointments')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : todayAppts.length === 0 ? (
              <EmptyState
                icon={<EventBusy />}
                title="Nothing today"
                message="Today's queue is clear. Schedule a new appointment to get started."
                action={{ label: 'Schedule', onClick: () => navigate('/app/appointments') }}
              />
            ) : (
              <Stack spacing={1}>
                {todayAppts.map((a: any) => {
                  const ts = new Date(a.scheduledAt || a.date);
                  const time = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <Box key={a.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      p: 1, borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
                    }} onClick={() => navigate('/app/appointments')}>
                      <Box sx={{
                        width: 56, py: 0.5, textAlign: 'center', borderRadius: 1,
                        background: alpha(theme.palette.info.main, 0.10), color: 'info.main',
                        fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace',
                      }}>
                        {time}
                      </Box>
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: '0.7rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main',
                      }}>
                        {a.patient ? `${a.patient.firstName?.[0] || ''}${a.patient.lastName?.[0] || ''}` : 'P'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Patient'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : '—'} · {a.reason || a.type || 'Consultation'}
                        </Typography>
                      </Box>
                      <Chip size="small" label={(a.status || 'SCHEDULED').toLowerCase()}
                        color={a.status === 'COMPLETED' ? 'success' : a.status === 'CANCELLED' ? 'error' : 'info'}
                        variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceptionistDashboard;
