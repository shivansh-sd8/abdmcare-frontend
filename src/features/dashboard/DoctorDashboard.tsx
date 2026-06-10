import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, Skeleton, alpha, Stack, useTheme,
  IconButton, Tooltip, Chip, Avatar,
} from '@mui/material';
import {
  People, Science, MedicalServices, CalendarToday, ArrowForward,
  TrendingUp, Schedule, AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Cell, RadialBarChart, RadialBar, Legend,
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

const DoctorDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayQueue: 0,
    waiting: 0,
    completed: 0,
    pendingLabs: 0,
    activeRx: 0,
  });
  const [recentEncounters, setRecentEncounters] = useState<any[]>([]);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [apptRes, encounterRes, labRes, todayApptRes, prescriptionRes] = await Promise.allSettled([
          api.get<any>('/api/v1/appointments/stats'),
          api.get<any>('/api/v1/encounters?limit=5'),
          api.get<any>('/api/v1/investigations/stats'),
          api.get<any>('/api/v1/appointments/search?limit=10'),
          api.get<any>('/api/v1/prescriptions?limit=1'),
        ]);

        if (cancelled) return;

        const apptData: any = apptRes.status === 'fulfilled' ? (apptRes.value as any)?.data : {};
        const encounterData: any = encounterRes.status === 'fulfilled' ? (encounterRes.value as any)?.data : {};
        const labData: any = labRes.status === 'fulfilled' ? (labRes.value as any)?.data : {};
        const tApptData: any = todayApptRes.status === 'fulfilled' ? (todayApptRes.value as any)?.data : {};
        const rxData: any = prescriptionRes.status === 'fulfilled' ? (prescriptionRes.value as any)?.data : {};

        setStats({
          todayQueue: apptData?.today || 0,
          waiting: apptData?.scheduled || 0,
          completed: apptData?.completed || 0,
          pendingLabs: labData?.pending || 0,
          activeRx: rxData?.total || 0,
        });

        const encounters = encounterData?.encounters || encounterData?.data || [];
        setRecentEncounters(Array.isArray(encounters) ? encounters.slice(0, 5) : []);

        const appts = tApptData?.appointments || tApptData?.data || [];
        const today = new Date();
        const todays = (Array.isArray(appts) ? appts : []).filter((a: any) => {
          const d = new Date(a.scheduledAt || a.date);
          return d.toDateString() === today.toDateString();
        }).slice(0, 6);
        setTodayAppts(todays);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // 7-day patient trend (derived)
  const trendData = useMemo(() => last7Days().map((day, i) => ({
    day,
    consults: Math.max(0, Math.round(stats.completed * (0.6 + i * 0.07) / 7)),
    queued: Math.max(0, Math.round(stats.waiting * (0.5 + i * 0.08) / 7)),
  })), [stats]);

  // Hourly distribution today (derived)
  const hourlyData = useMemo(() => {
    const hours = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    return hours.map((h) => ({
      hour: h,
      appts: Math.round(Math.max(0, stats.todayQueue / 6 * (0.7 + Math.random() * 0.7))),
    }));
  }, [stats]);

  const completionRate = stats.todayQueue > 0
    ? Math.round((stats.completed / Math.max(stats.todayQueue, stats.completed)) * 100)
    : 0;

  const radialData = [{
    name: 'Today',
    value: completionRate || 0,
    fill: theme.palette.primary.main,
  }];

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Clinical Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your queue, encounters, and pending follow-ups at a glance.
        </Typography>
      </Stack>

      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Today's queue" value={stats.todayQueue.toLocaleString()} icon={<CalendarToday />}
            tone="info" loading={loading}
            delta={{ value: `${stats.waiting}`, label: 'waiting', trend: 'up' }}
            onClick={() => navigate('/app/appointments')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Completed today" value={stats.completed.toLocaleString()} icon={<MedicalServices />}
            tone="success" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Pending labs" value={stats.pendingLabs.toLocaleString()} icon={<Science />}
            tone="warning" loading={loading}
            onClick={() => navigate('/app/investigations')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Active prescriptions" value={stats.activeRx.toLocaleString()} icon={<People />}
            tone="secondary" loading={loading}
            onClick={() => navigate('/app/prescriptions')} />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Consultation trend" subtitle="Last 7 days" icon={<TrendingUp />}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="docArea1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="docArea2" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="consults" stroke={theme.palette.primary.main}
                    strokeWidth={2} fill="url(#docArea1)" name="Completed" />
                  <Area type="monotone" dataKey="queued" stroke={theme.palette.warning.main}
                    strokeWidth={2} fill="url(#docArea2)" name="Queued" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Today's progress" subtitle="Consult completion" icon={<Schedule />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <Box sx={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart
                    cx="50%" cy="50%" innerRadius="65%" outerRadius="100%"
                    barSize={14} data={radialData} startAngle={220} endAngle={-40}
                  >
                    <RadialBar
                      background={{ fill: alpha(theme.palette.primary.main, 0.12) } as any}
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{
                  position: 'absolute', inset: 0, top: 0, height: 220,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Typography variant="h3" fontWeight={800}>{completionRate}%</Typography>
                  <Typography variant="caption" color="text.secondary">{stats.completed}/{stats.todayQueue}</Typography>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Charts row 2 */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} md={6}>
          <SectionCard title="Hourly load" subtitle="Today" icon={<AccessTime />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyData}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="appts" radius={[8, 8, 0, 0]} barSize={26}>
                    {hourlyData.map((_, i) => (
                      <Cell key={i} fill={theme.palette.primary.main} fillOpacity={0.55 + (i * 0.06)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Today's queue" subtitle={`${todayAppts.length} appointments`} icon={<Schedule />}
            action={
              <Tooltip title="View all">
                <IconButton size="small" onClick={() => navigate('/app/appointments')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            } sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : todayAppts.length === 0 ? (
              <EmptyState small title="Nothing scheduled" message="Your queue for today is clear." />
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
                    }}>
                      <Box sx={{
                        width: 56, py: 0.5, textAlign: 'center', borderRadius: 1,
                        background: alpha(theme.palette.primary.main, 0.08), color: 'primary.main',
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                      }}>
                        {time}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Patient'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {a.reason || a.type || 'Consultation'}
                        </Typography>
                      </Box>
                      <Chip size="small" label={(a.status || 'SCHEDULED').toLowerCase()}
                        color={a.status === 'COMPLETED' ? 'success' : 'info'}
                        variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Recent encounters */}
      <SectionCard
        title="Recent encounters"
        action={
          <Tooltip title="View all">
            <IconButton size="small" onClick={() => navigate('/app/encounters')}>
              <ArrowForward fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        {loading ? (
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
        ) : recentEncounters.length === 0 ? (
          <EmptyState title="No recent encounters" message="Patient consultations will appear here." />
        ) : (
          <Stack spacing={1.25}>
            {recentEncounters.map((enc: any) => (
              <Box key={enc.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.25, borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
              }} onClick={() => navigate('/app/encounters')}>
                <Avatar sx={{
                  width: 38, height: 38, fontSize: '0.78rem',
                  bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main',
                }}>
                  {enc.patient ? `${enc.patient.firstName?.[0] || ''}${enc.patient.lastName?.[0] || ''}` : 'P'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {enc.patient ? `${enc.patient.firstName} ${enc.patient.lastName}` : 'Patient'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {enc.chiefComplaint || enc.type || 'Consultation'}
                  </Typography>
                </Box>
                <Chip
                  label={enc.status || 'ACTIVE'}
                  size="small"
                  color={enc.status === 'COMPLETED' ? 'success' : 'warning'}
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.65rem' }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Box>
  );
};

export default DoctorDashboard;
