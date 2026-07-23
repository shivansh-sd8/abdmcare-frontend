import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, useTheme, Typography, Stack, alpha, Skeleton, Chip,
  IconButton, Tooltip, Avatar, LinearProgress,
} from '@mui/material';
import {
  People, LocalHospital, CalendarToday, HealthAndSafety,
  TrendingUp, ArrowForward, Receipt, Hotel,
  Schedule, MedicalServices, Bolt, EmojiEvents, Storefront,
  Science, Psychology,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, RadialBarChart, RadialBar,
  LineChart, Line, Legend,
} from 'recharts';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import api from '../../services/api';
import { StatCard, SectionCard, EmptyState } from '../../components/ui';

type TrendRow = {
  date: string;
  label: string;
  patients: number;
  appointments: number;
  encounters: number;
  admissions: number;
  revenue: number;
};

type RevenueSources = {
  consultation: number;
  pharmacy: number;
  labs: number;
  scans: number;
  total: number;
};

type TopDoctor = {
  doctorId: string | null;
  name: string;
  specialization: string | null;
  encounters: number;
  revenue: number;
};

type StaffCollectionRow = {
  collectorId: string | null;
  name: string;
  role: string | null;
  paymentCount: number;
  total: number;
  cash: number;
  digital: number;
};

// Single, compact INR formatter for the dashboard. Larger amounts ride on
// the same locale so the UI never shows mixed conventions ("₹1,200" vs
// "₹1200.00") within the same card.
const formatCurrency = (n: number): string =>
  `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [revenueSources, setRevenueSources] = useState<RevenueSources | null>(null);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [staffCollections, setStaffCollections] = useState<StaffCollectionRow[]>([]);
  const [staffWindow, setStaffWindow] = useState<{ days: number; total: number }>({ days: 7, total: 0 });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [
          pRes, dRes, aRes, payRes, ipdRes, labRes,
          trendsRes, revRes, topDocRes, staffColRes,
        ] = await Promise.allSettled([
          patientService.getPatientStats(),
          doctorService.getDoctorStats(),
          appointmentService.getAppointmentStats(),
          api.get<any>('/api/v1/payments/stats'),
          api.get<any>('/api/v1/ipd/overview'),
          api.get<any>('/api/v1/investigations/stats'),
          api.get<any>('/api/v1/dashboard/trends?days=7'),
          api.get<any>('/api/v1/dashboard/revenue-sources?days=7'),
          api.get<any>('/api/v1/dashboard/top-doctors?days=7&limit=5'),
          api.get<any>('/api/v1/dashboard/staff-collections?days=7'),
        ]);
        if (cancelled) return;

        const pData: any = pRes.status === 'fulfilled' ? (pRes.value as any)?.data : {};
        const dData: any = dRes.status === 'fulfilled' ? (dRes.value as any)?.data : {};
        const aData: any = aRes.status === 'fulfilled' ? (aRes.value as any)?.data : {};
        const payData: any = payRes.status === 'fulfilled' ? (payRes.value as any)?.data?.data || (payRes.value as any)?.data : {};
        const ipdData: any = ipdRes.status === 'fulfilled' ? (ipdRes.value as any)?.data : {};
        const labData: any = labRes.status === 'fulfilled' ? (labRes.value as any)?.data : {};
        const trendData: any = trendsRes.status === 'fulfilled' ? (trendsRes.value as any)?.data?.data || (trendsRes.value as any)?.data : [];
        const revData: any = revRes.status === 'fulfilled' ? (revRes.value as any)?.data?.data || (revRes.value as any)?.data : null;
        const topDocData: any = topDocRes.status === 'fulfilled' ? (topDocRes.value as any)?.data?.data || (topDocRes.value as any)?.data : [];

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

        if (Array.isArray(trendData)) setTrends(trendData);
        if (revData) setRevenueSources(revData);
        if (Array.isArray(topDocData)) setTopDoctors(topDocData);

        const staffColData: any =
          staffColRes.status === 'fulfilled'
            ? (staffColRes.value as any)?.data?.data || (staffColRes.value as any)?.data
            : null;
        if (staffColData?.rows) {
          setStaffCollections(staffColData.rows);
          setStaffWindow({
            days: Number(staffColData.windowDays || 7),
            total: Number(staffColData.totalCollected || 0),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [theme]);

  // Real 7-day trend (already padded server-side with one row per day, even
  // when the count is zero — so the chart never flatlines as "empty" again).
  const registrationTrend = trends.map((t) => ({
    day: t.label,
    patients: t.patients,
    appointments: t.appointments,
  }));

  const trendHasData = trends.some(
    (t) => t.patients > 0 || t.appointments > 0,
  );

  const revenueTrendReal = trends.map((t) => ({
    day: t.label,
    revenue: t.revenue,
  }));

  const revenueHasData = trends.some((t) => t.revenue > 0);

  const revenueSourceChart = useMemo(() => {
    if (!revenueSources) return [];
    const items = [
      { name: 'Consultation', value: revenueSources.consultation, fill: theme.palette.primary.main, icon: <MedicalServices /> },
      { name: 'Pharmacy',     value: revenueSources.pharmacy,     fill: theme.palette.secondary.main, icon: <Storefront /> },
      { name: 'Labs',         value: revenueSources.labs,         fill: theme.palette.warning.main, icon: <Science /> },
      { name: 'Scans',        value: revenueSources.scans,        fill: theme.palette.info.main, icon: <Psychology /> },
    ].filter((it) => it.value > 0);
    return items;
  }, [revenueSources, theme]);

  const revenueSourceTotal = revenueSourceChart.reduce((a, b) => a + b.value, 0);

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
            ) : !trendHasData ? (
              <EmptyState
                small
                title="No activity yet"
                message="Once patients are registered or appointments are booked, the trend will appear here."
                action={{ label: 'Register patient', onClick: () => navigate('/app/patients') }}
              />
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
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} allowDecimals={false} />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="patients" stroke={theme.palette.primary.main}
                    strokeWidth={2} fill="url(#adminPatients)" name="New patients" />
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

      {/* Revenue source split + Top doctors */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} md={5}>
          <SectionCard
            title="Revenue by source"
            subtitle="Last 7 days · paid encounters"
            icon={<Receipt />}
            sx={{ height: '100%' }}
          >
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : revenueSourceChart.length === 0 ? (
              <EmptyState
                small
                title="No revenue yet"
                message="Once a paid consultation is recorded, this breakdown will populate."
              />
            ) : (
              <Box>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={revenueSourceChart}
                      cx="50%" cy="50%"
                      innerRadius={56} outerRadius={86}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {revenueSourceChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {revenueSourceChart.map((d) => {
                    const pct = revenueSourceTotal > 0 ? Math.round((d.value / revenueSourceTotal) * 100) : 0;
                    return (
                      <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.fill }} />
                        <Typography variant="caption" sx={{ flex: 1 }}>{d.name}</Typography>
                        <Typography variant="caption" fontWeight={700}>₹{d.value.toLocaleString()}</Typography>
                        <Chip size="small" label={`${pct}%`} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(d.fill, 0.12), color: d.fill }} />
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <SectionCard
            title="Top doctors"
            subtitle="By completed encounters · last 7 days"
            icon={<EmojiEvents />}
            action={
              <Tooltip title="Open doctors">
                <IconButton size="small" onClick={() => navigate('/app/doctors')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            }
            sx={{ height: '100%' }}
          >
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : topDoctors.length === 0 ? (
              <EmptyState
                small
                title="No completed encounters"
                message="Once your team finishes some consultations, the leaderboard will fill up here."
              />
            ) : (
              <Stack spacing={1.25}>
                {topDoctors.map((d, i) => {
                  const max = topDoctors[0]?.encounters || 1;
                  const pct = Math.round((d.encounters / max) * 100);
                  const tone = i === 0 ? theme.palette.warning.main : i === 1 ? theme.palette.info.main : theme.palette.success.main;
                  return (
                    <Box key={d.doctorId || i} sx={{
                      p: 1.25, borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: d.doctorId ? 'pointer' : 'default',
                      transition: 'all 150ms ease',
                      '&:hover': { borderColor: alpha(tone, 0.4) },
                    }} onClick={() => d.doctorId && navigate(`/app/doctors/${d.doctorId}`)}>
                      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75 }}>
                        <Avatar sx={{
                          width: 36, height: 36, fontSize: '0.78rem', fontWeight: 700,
                          bgcolor: alpha(tone, 0.14), color: tone,
                        }}>
                          {`${i + 1}`}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{d.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {d.specialization || 'General'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={800}>{d.encounters}</Typography>
                          <Typography variant="caption" color="text.secondary">consults</Typography>
                        </Box>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: alpha(tone, 0.10),
                          '& .MuiLinearProgress-bar': { backgroundColor: tone, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Staff collections — who actually rang up the rupees this week */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12}>
          <SectionCard
            title="Collections by staff"
            subtitle={`Last ${staffWindow.days} days · ${formatCurrency(staffWindow.total)} collected`}
            icon={<Receipt />}
            action={
              <Tooltip title="Open hospital reports">
                <IconButton size="small" onClick={() => navigate('/app/reports')}>
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {loading ? (
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            ) : staffCollections.length === 0 ? (
              <EmptyState
                small
                title="No collections yet"
                message="As soon as staff start ringing up payments, you'll see who collected what here."
              />
            ) : (
              <Stack spacing={1.25}>
                {staffCollections.slice(0, 6).map((s, i) => {
                  const max = staffCollections[0]?.total || 1;
                  const pct = Math.round((s.total / max) * 100);
                  const accent =
                    !s.collectorId ? theme.palette.text.disabled
                      : i === 0 ? theme.palette.success.main
                      : i === 1 ? theme.palette.info.main
                      : theme.palette.primary.main;
                  return (
                    <Box key={s.collectorId ?? `unattributed-${i}`}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(accent, 0.18), color: accent, fontSize: 13 }}>
                            {s.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {s.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {s.role || 'Unattributed'} · {s.paymentCount} receipt{s.paymentCount === 1 ? '' : 's'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={`Cash ${formatCurrency(s.cash)}`} sx={{ height: 20 }} />
                          <Chip size="small" label={`Digital ${formatCurrency(s.digital)}`} sx={{ height: 20 }} />
                          <Typography variant="body2" fontWeight={700}>
                            {formatCurrency(s.total)}
                          </Typography>
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(accent, 0.12),
                          '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
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
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} allowDecimals={false} />
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
                  <XAxis type="number" fontSize={11} stroke={theme.palette.text.secondary} allowDecimals={false} />
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
            ) : !revenueHasData ? (
              <EmptyState
                small
                title="No revenue recorded"
                message="Revenue trends fill in as payments are collected. Open billing to record one."
                action={{ label: 'Open billing', onClick: () => navigate('/app/billing') }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueTrendReal}>
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
