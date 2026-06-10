// Rich analytics row shown above the Billing tabs.
//
// Surfaces four at-a-glance insights so users don't have to dig:
//   1. Collection trend (last 30 days) — sparkline + delta vs prior period
//   2. Payment methods mix — donut over completed payments
//   3. Outstanding by service type — horizontal bars (OPD/IPD/Lab/Pharmacy)
//   4. Aging buckets — how old is the outstanding money (0–7 / 8–30 / 31–60 / 60+)
//
// All charts read from `allBills` and `completedPayments` already returned by
// the consolidated billing endpoint — no new backend calls.

import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tooltip as MuiTooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import {
  AccessTime,
  CurrencyRupee,
  LocalHospital,
  Hotel,
  Science,
  Medication,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';

const inr = (n: any) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const compactInr = (n: any) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

interface Props {
  loading: boolean;
  allBills: any[];
  completedPayments: any[];
}

const BillingAnalytics: React.FC<Props> = ({ loading, allBills, completedPayments }) => {
  const theme = useTheme();

  // ── 1. Collection trend (last 30 days) ───────────────────────────────────
  const { trend, todayTotal, periodTotal, previousTotal } = useMemo(() => {
    const now = new Date();
    const series: { date: string; label: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      series.push({
        date: dayKey(d),
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        amount: 0,
      });
    }
    const map = new Map(series.map((s) => [s.date, s]));

    let periodSum = 0;
    let previousSum = 0;
    let todaySum = 0;
    const periodStart = new Date(now); periodStart.setDate(now.getDate() - 29); periodStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(now); previousStart.setDate(now.getDate() - 59); previousStart.setHours(0, 0, 0, 0);
    const previousEnd = new Date(now); previousEnd.setDate(now.getDate() - 30); previousEnd.setHours(23, 59, 59, 999);
    const todayStr = dayKey(new Date(new Date().setHours(0, 0, 0, 0)));

    completedPayments.forEach((p: any) => {
      const ts = p.paidAt || p.createdAt;
      if (!ts) return;
      const d = new Date(ts);
      const amt = parseFloat(p.amount || '0');
      if (d >= periodStart && d <= now) {
        const k = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        const slot = map.get(k);
        if (slot) slot.amount += amt;
        periodSum += amt;
        if (k === todayStr) todaySum += amt;
      } else if (d >= previousStart && d <= previousEnd) {
        previousSum += amt;
      }
    });

    return {
      trend: series,
      todayTotal: todaySum,
      periodTotal: periodSum,
      previousTotal: previousSum,
    };
  }, [completedPayments]);

  const trendDelta = previousTotal > 0
    ? ((periodTotal - previousTotal) / previousTotal) * 100
    : periodTotal > 0 ? 100 : 0;

  // ── 2. Payment methods mix ───────────────────────────────────────────────
  const methodData = useMemo(() => {
    const agg: Record<string, number> = {};
    completedPayments.forEach((p: any) => {
      const m = (p.paymentMethod || 'OTHER').toUpperCase();
      const amt = parseFloat(p.amount || '0');
      agg[m] = (agg[m] || 0) + amt;
    });
    const tones: Record<string, string> = {
      CASH:          theme.palette.success.main,
      UPI:           theme.palette.primary.main,
      CARD:          theme.palette.info.main,
      BANK_TRANSFER: theme.palette.warning.main,
      CHEQUE:        theme.palette.secondary.main,
      OTHER:         theme.palette.text.disabled,
    };
    return Object.entries(agg)
      .map(([name, value]) => ({ name, value, color: tones[name] || theme.palette.text.disabled }))
      .sort((a, b) => b.value - a.value);
  }, [completedPayments, theme]);

  const methodTotal = methodData.reduce((s, m) => s + m.value, 0);

  // ── 3. Outstanding by service type ────────────────────────────────────────
  const outstandingByType = useMemo(() => {
    const agg = { OPD: 0, IPD: 0, LAB: 0, PHARMACY: 0, OTHER: 0 };
    allBills.forEach((b: any) => {
      if (b.isDetail) return;
      const due = b.outstanding || 0;
      if (due <= 0) return;
      if (b.type === 'OPD' || b.type === 'IPD' || b.type === 'LAB' || b.type === 'PHARMACY') {
        agg[b.type as keyof typeof agg] += due;
      } else {
        agg.OTHER += due;
      }
    });
    const total = Object.values(agg).reduce((s, v) => s + v, 0);
    const meta: { key: keyof typeof agg; label: string; color: string; icon: React.ReactElement }[] = [
      { key: 'OPD',      label: 'OPD',      color: '#2563eb', icon: <LocalHospital sx={{ fontSize: 14 }} /> },
      { key: 'IPD',      label: 'IPD',      color: '#ea580c', icon: <Hotel        sx={{ fontSize: 14 }} /> },
      { key: 'LAB',      label: 'Lab',      color: '#7c3aed', icon: <Science      sx={{ fontSize: 14 }} /> },
      { key: 'PHARMACY', label: 'Pharmacy', color: '#059669', icon: <Medication   sx={{ fontSize: 14 }} /> },
    ];
    return { rows: meta.map((m) => ({ ...m, value: agg[m.key] })), total, other: agg.OTHER };
  }, [allBills]);

  // ── 4. Aging buckets ─────────────────────────────────────────────────────
  const aging = useMemo(() => {
    const buckets: Record<string, { label: string; amount: number; count: number; color: string }> = {
      b07:   { label: '0–7 days',   amount: 0, count: 0, color: theme.palette.success.main },
      b830:  { label: '8–30 days',  amount: 0, count: 0, color: theme.palette.info.main },
      b3160: { label: '31–60 days', amount: 0, count: 0, color: theme.palette.warning.main },
      b60:   { label: '60+ days',   amount: 0, count: 0, color: theme.palette.error.main },
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    allBills.forEach((b: any) => {
      if (b.isDetail) return;
      const due = b.outstanding || 0;
      if (due <= 0 || !b.date) return;
      const ageDays = Math.floor((today.getTime() - new Date(b.date).getTime()) / 86400000);
      const slot =
        ageDays <= 7  ? buckets.b07 :
        ageDays <= 30 ? buckets.b830 :
        ageDays <= 60 ? buckets.b3160 : buckets.b60;
      slot.amount += due; slot.count += 1;
    });
    const total = Object.values(buckets).reduce((s, b) => s + b.amount, 0);
    return { buckets: Object.values(buckets), total };
  }, [allBills, theme]);

  if (loading) {
    return (
      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid item xs={12} md={6} lg={3} key={i}>
            <Skeleton variant="rounded" height={200} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const cardSx = {
    p: 2.25,
    height: '100%',
    borderRadius: 2.5,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
  };

  return (
    <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
      {/* 1. Collection trend */}
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={0} sx={cardSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
              Collections · 30 days
            </Typography>
            <MuiTooltip
              title={`${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(0)}% vs previous 30 days (${inr(previousTotal)})`}
            >
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 999,
                  bgcolor: alpha(trendDelta >= 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                  color: trendDelta >= 0 ? 'success.main' : 'error.main',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {trendDelta >= 0 ? <TrendingUp sx={{ fontSize: 13 }} /> : <TrendingDown sx={{ fontSize: 13 }} />}
                <span>{trendDelta >= 0 ? '+' : ''}{trendDelta.toFixed(0)}%</span>
              </Stack>
            </MuiTooltip>
          </Stack>

          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.25 }}>
            {inr(periodTotal)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Today: <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{inr(todayTotal)}</Box>
          </Typography>

          <Box sx={{ height: 70, mt: 1.5, mx: -0.75 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="billing-collection-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <Tooltip
                  cursor={{ stroke: theme.palette.divider, strokeWidth: 1 }}
                  contentStyle={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                    fontSize: 12,
                    background: theme.palette.background.paper,
                  }}
                  formatter={(v: any) => [inr(v), 'Collected']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  fill="url(#billing-collection-grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      {/* 2. Payment methods donut */}
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
            Payment methods · MTD
          </Typography>
          {methodTotal === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: 140, color: 'text.disabled' }}>
              <CurrencyRupee sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="caption">No payments yet</Typography>
            </Stack>
          ) : (
            <Grid container spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Grid item xs={6} sx={{ position: 'relative' }}>
                <Box sx={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={56}
                        stroke="none"
                        paddingAngle={2}
                      >
                        {methodData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any, n: any) => [inr(v), String(n).replace('_', ' ')]}
                        contentStyle={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          fontSize: 12,
                          background: theme.palette.background.paper,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>Total</Typography>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1 }}>
                      {compactInr(methodTotal)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Stack spacing={0.5}>
                  {methodData.slice(0, 4).map((m) => {
                    const pct = methodTotal > 0 ? (m.value / methodTotal) * 100 : 0;
                    return (
                      <Stack key={m.name} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color, flexShrink: 0 }} />
                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
                          {m.name.replace('_', ' ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Grid>

      {/* 3. Outstanding by service type */}
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
            Outstanding by service
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1.25 }}>
            {inr(outstandingByType.total + outstandingByType.other)}
          </Typography>
          <Stack spacing={1}>
            {outstandingByType.rows.map((r) => {
              const pct = outstandingByType.total > 0 ? (r.value / outstandingByType.total) * 100 : 0;
              return (
                <Box key={r.key}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Box sx={{ color: r.color, display: 'flex' }}>{r.icon}</Box>
                    <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>{r.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{compactInr(r.value)}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(r.color, 0.1),
                      '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 3 },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Grid>

      {/* 4. Aging buckets */}
      <Grid item xs={12} md={6} lg={3}>
        <Paper elevation={0} sx={cardSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
              Outstanding aging
            </Typography>
            <AccessTime sx={{ color: 'text.disabled', fontSize: 16 }} />
          </Stack>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1.25 }}>
            {inr(aging.total)}
          </Typography>
          <Stack spacing={1}>
            {aging.buckets.map((b) => {
              const pct = aging.total > 0 ? (b.amount / aging.total) * 100 : 0;
              return (
                <Box key={b.label}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: b.color, flexShrink: 0 }} />
                    <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>{b.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.count > 0 ? `${b.count} · ` : ''}{compactInr(b.amount)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(b.color, 0.1),
                      '& .MuiLinearProgress-bar': { bgcolor: b.color, borderRadius: 3 },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default BillingAnalytics;
