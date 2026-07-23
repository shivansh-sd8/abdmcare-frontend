import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, Skeleton, alpha, Stack, useTheme,
  IconButton, Tooltip, Chip, Avatar, LinearProgress,
} from '@mui/material';
import {
  MeetingRoom, MonitorHeart, Hotel, ArrowForward,
  Bed, Healing, EventAvailable,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell, PieChart, Pie,
} from 'recharts';
import api from '../../services/api';
import { StatCard, SectionCard, EmptyState } from '../../components/ui';

const NurseDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    occupancy: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    activeAdmissions: 0,
    todayAdmissions: 0,
    todayDischarges: 0,
  });
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [overviewRes, admRes] = await Promise.allSettled([
          api.get<any>('/api/v1/ipd/overview'),
          api.get<any>('/api/v1/ipd/admissions?limit=20'),
        ]);
        if (cancelled) return;

        let occupied = 0;
        let total = 0;
        let wardArr: any[] = [];

        if (overviewRes.status === 'fulfilled') {
          const data: any = (overviewRes.value as any)?.data;
          wardArr = data?.wards || data?.data?.wards || data || [];
          if (Array.isArray(wardArr)) {
            wardArr.forEach((w: any) => {
              occupied += w.occupiedBeds || 0;
              total += w.totalBeds || 0;
            });
          } else {
            wardArr = [];
          }
        }
        setWards(wardArr.slice(0, 5));

        let activeAdm = 0;
        let todayAdm = 0;
        let todayDisch = 0;
        let admList: any[] = [];

        if (admRes.status === 'fulfilled') {
          const data: any = (admRes.value as any)?.data;
          admList = data?.admissions || data?.data || [];
          if (!Array.isArray(admList)) admList = [];
          // Bed is still occupied during DISCHARGE_READY — the patient is
          // clinically cleared but hasn't been billed-out yet, so for the
          // nurse station this counts as an active stay. (`IN_PROGRESS`
          // never appears on `Admission.status`; was a leftover bug.)
          activeAdm = admList.filter(a => a.status === 'ADMITTED' || a.status === 'DISCHARGE_READY').length;
          const today = new Date().toDateString();
          todayAdm = admList.filter(a => new Date(a.admissionDate || a.createdAt).toDateString() === today).length;
          todayDisch = admList.filter(a =>
            a.status === 'DISCHARGED' && a.dischargeDate && new Date(a.dischargeDate).toDateString() === today
          ).length;
        }

        setStats({
          occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0,
          totalBeds: total,
          occupiedBeds: occupied,
          activeAdmissions: activeAdm,
          todayAdmissions: todayAdm,
          todayDischarges: todayDisch,
        });
        setAdmissions(admList.filter(a => a.status === 'ADMITTED').slice(0, 6));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const wardChartData = useMemo(() => wards.map((w: any) => ({
    name: w.name || w.wardName || 'Ward',
    occupied: w.occupiedBeds || 0,
    available: Math.max(0, (w.totalBeds || 0) - (w.occupiedBeds || 0)),
  })), [wards]);

  const radialData = [{
    name: 'Occupancy',
    value: stats.occupancy,
    fill: stats.occupancy > 80 ? theme.palette.error.main : stats.occupancy > 60 ? theme.palette.warning.main : theme.palette.success.main,
  }];

  const flowData = useMemo(() => [
    { name: 'Admissions', value: stats.todayAdmissions, fill: theme.palette.info.main },
    { name: 'Discharges', value: stats.todayDischarges, fill: theme.palette.success.main },
  ], [stats, theme]);

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Inpatient Care
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ward occupancy, active admissions, and patient flow today.
        </Typography>
      </Stack>

      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Occupancy" value={`${stats.occupancy}%`} icon={<MeetingRoom />}
            tone={stats.occupancy > 80 ? 'error' : stats.occupancy > 60 ? 'warning' : 'success'}
            loading={loading}
            delta={{ value: `${stats.occupiedBeds}/${stats.totalBeds}`, label: 'beds', trend: 'flat' }}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Total beds" value={stats.totalBeds.toLocaleString()} icon={<Hotel />}
            tone="info" loading={loading}
            onClick={() => navigate('/app/ipd')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Active admissions" value={stats.activeAdmissions.toLocaleString()} icon={<MonitorHeart />}
            tone="error" loading={loading}
            onClick={() => navigate('/app/ipd')} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard label="Admitted today" value={stats.todayAdmissions.toLocaleString()} icon={<EventAvailable />}
            tone="secondary" loading={loading}
            delta={{ value: `${stats.todayDischarges}`, label: 'discharged', trend: 'up' }}
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2.25} sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Grid item xs={12} md={4}>
          <SectionCard title="Bed occupancy" subtitle="System-wide" icon={<Bed />} sx={{ height: '100%' }}>
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
                      background={{ fill: alpha(theme.palette.primary.main, 0.10) } as any}
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
                  <Typography variant="h3" fontWeight={800}>{stats.occupancy}%</Typography>
                  <Typography variant="caption" color="text.secondary">{stats.occupiedBeds} of {stats.totalBeds}</Typography>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <SectionCard title="Ward-wise capacity" icon={<Hotel />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : wardChartData.length === 0 ? (
              <EmptyState title="No wards" message="Configure wards to see capacity." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={wardChartData} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} width={80} />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper, fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="occupied" stackId="a" fill={theme.palette.warning.main} barSize={18} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="available" stackId="a" fill={alpha(theme.palette.success.main, 0.45)} barSize={18} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <SectionCard title="Today's flow" icon={<Healing />} sx={{ height: '100%' }}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <Box>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={flowData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value">
                      {flowData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.background.paper, fontSize: '0.8125rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {flowData.map((d) => (
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
      </Grid>

      {/* Active admissions */}
      <SectionCard
        title="Active admissions"
        subtitle={`${stats.activeAdmissions} patients`}
        action={
          <Tooltip title="View all">
            <IconButton size="small" onClick={() => navigate('/app/ipd')}>
              <ArrowForward fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : admissions.length === 0 ? (
          <EmptyState title="No active admissions" message="Inpatient list is currently empty." />
        ) : (
          <Stack spacing={1.25}>
            {admissions.map((adm: any) => (
              <Box key={adm.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.25, borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
              }} onClick={() => navigate(`/app/ipd/${adm.id}`)}>
                <Avatar sx={{
                  width: 38, height: 38, fontSize: '0.78rem',
                  bgcolor: alpha(theme.palette.error.main, 0.14), color: 'error.main',
                }}>
                  {adm.patient ? `${adm.patient.firstName?.[0] || ''}${adm.patient.lastName?.[0] || ''}` : 'P'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {adm.patient ? `${adm.patient.firstName} ${adm.patient.lastName}` : 'Patient'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {`Ward: ${adm.bed?.ward?.name || 'N/A'} · Bed ${adm.bed?.bedNumber || 'N/A'}`}
                  </Typography>
                </Box>
                <Chip
                  label={adm.status || 'ADMITTED'}
                  size="small"
                  color={adm.status === 'DISCHARGED' ? 'success' : 'info'}
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

export default NurseDashboard;
