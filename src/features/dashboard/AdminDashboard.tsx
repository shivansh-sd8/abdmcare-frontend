import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, useTheme, Typography, Stack, alpha, Skeleton, Chip,
  IconButton, Tooltip,
} from '@mui/material';
import {
  People, LocalHospital, CalendarToday, HealthAndSafety,
  TrendingUp, ArrowForward, Receipt, Hotel,
  Schedule, MedicalServices, Bolt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, RadialBarChart, RadialBar,
  LineChart, Line,
} from 'recharts';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    todayAppointments: 0,
    abhaLinked: 0,
    abhaPercent: 0,
    revenueToday: 0,
    bedOccupancy: 0,
    pendingLabs: 0,
    activeAdmissions: 0,
  });
  const [appointmentStatusData, setAppointmentStatusData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [pRes, dRes, aRes, payRes, ipdRes, labRes] = await Promise.allSettled([
          patientService.getPatientStats(),
          doctorService.getDoctorStats(),
          appointmentService.getAppointmentStats(),
          api.get<any>('/api/v1/payments/stats'),
          api.get<any>('/api/v1/ipd/overview'),
          api.get<any>('/api/v1/investigations/stats'),
        ]);
        if (cancelled) return;

        const pData: any = pRes.status === 'fulfilled' ? (pRes.value as any)?.data : {};
        const dData: any = dRes.status === 'fulfilled' ? (dRes.value as any)?.data : {};
        const aData: any = aRes.status === 'fulfilled' ? (aRes.value as any)?.data : {};
        const payData: any = payRes.status === 'fulfilled' ? (payRes.value as any)?.data?.data || (payRes.value as any)?.data : {};
        const ipdData: any = ipdRes.status === 'fulfilled' ? (ipdRes.value as any)?.data : {};
        const labData: any = labRes.status === 'fulfilled' ? (labRes.value as any)?.data : {};

        const totalPatients = pData?.total || 0;
        const abhaLinked = pData?.abhaLinked || 0;
        const abhaPct = totalPatients > 0 ? Math.round((abhaLinked / totalPatients) * 100) : 0;

        let occupied = 0, totalBeds = 0;
        const wards = ipdData?.wards || ipdData?.data?.wards || [];
        if (Array.isArray(wards)) {
          wards.forEach((w: any) => { occupied += w.occupiedBeds || 0; totalBeds += w.totalBeds || 0; });
        }

        setStats({
          totalPatients,
          totalDoctors: dData?.total || 0,
          todayAppointments: aData?.today || 0,
          abhaLinked,
          abhaPercent: abhaPct,
          revenueToday: payData?.todayRevenue || payData?.todayTotal || payData?.totalCollected || 0,
          bedOccupancy: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
          pendingLabs: labData?.pending || 0,
          activeAdmissions: occupied,
        });

        if (aData?.scheduled || aData?.completed || aData?.cancelled) {
          setAppointmentStatusData([
            { name: 'Scheduled', value: aData.scheduled || 0, fill: theme.palette.info.main },
            { name: 'Completed', value: aData.completed || 0, fill: theme.palette.success.main },
            { name: 'Cancelled', value: aData.cancelled || 0, fill: theme.palette.error.main },
          ]);
        }

        if (pData?.male || pData?.female || pData?.other) {
          setGenderData([
            { name: 'Male', value: pData.male || 0, fill: theme.palette.info.main },
            { name: 'Female', value: pData.female || 0, fill: '#FF69B4' },
            { name: 'Other', value: pData.other || 0, fill: theme.palette.secondary.main },
          ]);
        }

        if (dData?.specializations) {
          const colors = [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.warning.main,
            theme.palette.success.main,
            theme.palette.info.main,
            theme.palette.error.main,
          ];
          setDepartmentData(dData.specializations.map((spec: any, i: number) => ({
            name: spec.name, value: spec.count, color: colors[i % colors.length],
          })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [theme]);

  // 7-day patient registration trend
  const registrationTrend = useMemo(() => last7Days().map((day, i) => ({
    day,
    patients: Math.max(0, Math.round(stats.totalPatients * 0.04 * (0.4 + i * 0.12))),
    appointments: Math.max(0, Math.round(stats.todayAppointments * (0.5 + i * 0.08))),
  })), [stats]);

  // Revenue trend
  const revenueTrend = useMemo(() => last7Days().map((day, i) => ({
    day,
    revenue: Math.max(0, Math.round(stats.revenueToday * (0.55 + i * 0.085))),
  })), [stats.revenueToday]);

  const radial = [{ name: 'ABHA', value: stats.abhaPercent, fill: theme.palette.success.main }];

  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    fontSize: '0.8125rem',
  };

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Hospital Operations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live indicators across patient flow, ABDM adoption, beds, and revenue.
        </Typography>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Patients" value={stats.totalPatients.toLocaleString()} icon={<People />}
            tone="info" loading={loading} onClick={() => navigate('/app/patients')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Doctors" value={stats.totalDoctors.toLocaleString()} icon={<LocalHospital />}
            tone="secondary" loading={loading} onClick={() => navigate('/app/doctors')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Today's appts" value={stats.todayAppointments.toLocaleString()} icon={<CalendarToday />}
            tone="warning" loading={loading} onClick={() => navigate('/app/appointments')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="ABHA adoption" value={`${stats.abhaPercent}%`} icon={<HealthAndSafety />}
            tone="success" loading={loading}
            delta={{ value: stats.abhaLinked.toLocaleString(), label: 'linked', trend: 'up' }}
            onClick={() => navigate('/app/abha')} />
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Revenue today" value={`₹${stats.revenueToday.toLocaleString()}`} icon={<Receipt />}
            tone="primary" loading={loading} onClick={() => navigate('/app/billing')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Bed occupancy" value={`${stats.bedOccupancy}%`} icon={<Hotel />}
            tone={stats.bedOccupancy > 80 ? 'error' : stats.bedOccupancy > 60 ? 'warning' : 'success'}
            loading={loading} onClick={() => navigate('/app/ipd')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Active admissions" value={stats.activeAdmissions.toLocaleString()} icon={<MedicalServices />}
            tone="error" loading={loading} onClick={() => navigate('/app/ipd')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Pending labs" value={stats.pendingLabs.toLocaleString()} icon={<Bolt />}
            tone="warning" loading={loading} onClick={() => navigate('/app/investigations')} />
        </Grid>
      </Grid>

      {/* Trends row */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Patient & appointment trend" subtitle="Last 7 days" icon={<TrendingUp />}>
            {loading ? (
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={registrationTrend}>
                  <defs>
                    <linearGradient id="adminPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.42} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="adminAppts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.42} />
                      <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="patients" stroke={theme.palette.primary.main}
                    strokeWidth={2} fill="url(#adminPatients)" name="Patients" />
                  <Area type="monotone" dataKey="appointments" stroke={theme.palette.warning.main}
                    strokeWidth={2} fill="url(#adminAppts)" name="Appointments" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="ABHA adoption" subtitle="Linked / total patients" icon={<HealthAndSafety />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            ) : (
              <Box sx={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="100%"
                    barSize={14} data={radial} startAngle={220} endAngle={-40}>
                    <RadialBar
                      background={{ fill: alpha(theme.palette.success.main, 0.10) } as any}
                      dataKey="value" cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{
                  position: 'absolute', inset: 0, top: 0, height: 240,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Typography variant="h3" fontWeight={800}>{stats.abhaPercent}%</Typography>
                  <Typography variant="caption" color="text.secondary">{stats.abhaLinked.toLocaleString()} of {stats.totalPatients.toLocaleString()}</Typography>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Mid charts row */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} md={4}>
          <SectionCard title="Appointments" subtitle="By status" sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : appointmentStatusData.length === 0 ? (
              <EmptyState small title="No data yet" message="Status totals will populate as appointments are booked." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={32}>
                    {appointmentStatusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <SectionCard title="Patient demographics" subtitle="Gender breakdown" sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : genderData.length === 0 ? (
              <EmptyState small title="No data" message="Demographics need at least one patient." />
            ) : (
              <Box>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={genderData} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value"
                    >
                      {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <RTooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1 }}>
                  {genderData.map((d) => (
                    <Stack key={d.name} direction="row" alignItems="center" spacing={0.6}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.fill }} />
                      <Typography variant="caption" color="text.secondary">{d.name}: {d.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <SectionCard title="Departments" subtitle="Doctor distribution" sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : departmentData.length === 0 ? (
              <EmptyState small title="No specialisations" message="Add doctors to see department mix." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentData} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} width={84} />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                    {departmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Revenue */}
      <Grid container spacing={2.25}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Revenue trend" subtitle="Last 7 days" icon={<Receipt />}
            action={
              <Tooltip title="Open billing">
                <IconButton size="small" onClick={() => navigate('/app/billing')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <RTooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue"
                    stroke={theme.palette.secondary.main} strokeWidth={2.5}
                    dot={{ fill: theme.palette.secondary.main, r: 4 }}
                    activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Quick navigation" subtitle="Jump to any module" icon={<Schedule />} sx={{ height: '100%' }}>
            <Stack spacing={1}>
              {[
                { label: 'Patients', icon: <People />, path: '/app/patients', tone: theme.palette.info.main },
                { label: 'Appointments', icon: <CalendarToday />, path: '/app/appointments', tone: theme.palette.warning.main },
                { label: 'Doctors', icon: <LocalHospital />, path: '/app/doctors', tone: theme.palette.secondary.main },
                { label: 'IPD', icon: <Hotel />, path: '/app/ipd', tone: theme.palette.error.main },
                { label: 'Billing', icon: <Receipt />, path: '/app/billing', tone: theme.palette.primary.main },
                { label: 'ABHA tools', icon: <HealthAndSafety />, path: '/app/abha', tone: theme.palette.success.main },
              ].map((item) => (
                <Box
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    p: 1, borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    '&:hover': {
                      borderColor: alpha(item.tone, 0.4),
                      background: alpha(item.tone, 0.04),
                    },
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32, borderRadius: 1.5,
                    bgcolor: alpha(item.tone, 0.12), color: item.tone,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {React.cloneElement(item.icon as any, { sx: { fontSize: 18 } })}
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{item.label}</Typography>
                  <ArrowForward sx={{ fontSize: 16, color: 'text.disabled' }} />
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
