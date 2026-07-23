import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from '@mui/material';
import {
  HealthAndSafety,
  Refresh,
  Search,
  CheckCircleOutline,
  ErrorOutline,
  CallReceived,
  Hub,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RTooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { format, formatDistanceToNow, subHours } from 'date-fns';
import api from '../../services/api';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';

interface AbdmTransaction {
  id: string;
  apiEndpoint: string;
  method: string;
  success: boolean;
  statusCode?: number | null;
  timestamp: string;
}

interface AbdmConfig {
  gatewayUrl: string;
  hipId?: string;
  hipName?: string;
  hiuId?: string;
  hiuName?: string;
  callbackUrl: string;
  cmId: string;
}

const endpointFamily = (endpoint: string): { label: string; color: string } => {
  const e = (endpoint || '').toLowerCase();
  if (e.includes('/identity') || e.includes('aadhaar') || e.includes('abha-address')) {
    return { label: 'Identity', color: '#7c3aed' };
  }
  if (e.includes('care-context') || e.includes('discovery') || e.includes('link')) {
    return { label: 'HIP Linking', color: '#0891b2' };
  }
  if (e.includes('consent') || e.includes('artefact')) {
    return { label: 'Consent', color: '#059669' };
  }
  if (e.includes('health-information') || e.includes('data-flow')) {
    return { label: 'Data Flow', color: '#dc2626' };
  }
  if (e.includes('bridge') || e.includes('gateway') || e.includes('hpr')) {
    return { label: 'Gateway', color: '#475569' };
  }
  return { label: 'Other', color: '#94a3b8' };
};

const AbdmActivity: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState<{ total: number; successful: number; failed: number; recent: AbdmTransaction[] }>({
    total: 0, successful: 0, failed: 0, recent: [],
  });
  const [config, setConfig] = useState<AbdmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OK' | 'FAIL'>('ALL');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, configRes] = await Promise.all([
        api.get<any>('/api/v1/abdm/diagnostics/transaction-stats').catch(() => ({ data: null })),
        api.get<any>('/api/v1/abdm/diagnostics/config').catch(() => ({ data: null })),
      ]);
      const s = (statsRes as any).data?.data || (statsRes as any).data;
      const c = (configRes as any).data?.data || (configRes as any).data;
      if (s) {
        setStats({
          total: s.total || 0,
          successful: s.successful || 0,
          failed: s.failed || 0,
          recent: Array.isArray(s.recent) ? s.recent : [],
        });
      }
      if (c) setConfig(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0;

  // Build a 24-hour mini-trend by bucketing recent transactions per hour
  const trend = useMemo(() => {
    const buckets: Record<string, { hour: string; success: number; fail: number }> = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const t = subHours(now, i);
      const key = format(t, 'HH:00');
      buckets[key] = { hour: key, success: 0, fail: 0 };
    }
    for (const tx of stats.recent) {
      try {
        const t = new Date(tx.timestamp);
        const key = format(t, 'HH:00');
        if (buckets[key]) {
          if (tx.success) buckets[key].success += 1;
          else buckets[key].fail += 1;
        }
      } catch { /* ignore */ }
    }
    return Object.values(buckets);
  }, [stats.recent]);

  const filteredRecent = useMemo(() => {
    let list = stats.recent;
    if (filter === 'OK') list = list.filter(t => t.success);
    else if (filter === 'FAIL') list = list.filter(t => !t.success);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.apiEndpoint || '').toLowerCase().includes(q) ||
        (t.method || '').toLowerCase().includes(q) ||
        String(t.statusCode || '').includes(q)
      );
    }
    return list;
  }, [stats.recent, filter, search]);

  return (
    <Box>
      <PageHeader
        title="ABDM Activity"
        subtitle="Live ABDM gateway transactions, success rate, and integration health"
        icon={<Hub />}
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll} disabled={loading}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}>
          <StatCard label="Total transactions" value={stats.total.toLocaleString()}
            icon={<Hub />} tone="primary" loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Successful" value={stats.successful.toLocaleString()}
            icon={<CheckCircleOutline />} tone="success" loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Failed" value={stats.failed.toLocaleString()}
            icon={<ErrorOutline />} tone="error" loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Success rate" value={`${successRate}%`}
            icon={<HealthAndSafety />}
            tone={successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error'}
            loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Last 24 hours</Typography>
                <Typography variant="caption" color="text.secondary">
                  Hourly distribution of ABDM gateway calls (rolling window)
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: theme.palette.success.main }} />
                  <Typography variant="caption" color="text.secondary">Success</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: theme.palette.error.main }} />
                  <Typography variant="caption" color="text.secondary">Fail</Typography>
                </Stack>
              </Stack>
            </Stack>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="abdmOk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="abdmFail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.error.main} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={theme.palette.error.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={alpha(theme.palette.divider, 0.4)} strokeDasharray="2 4" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                  <RTooltip />
                  <Area type="monotone" dataKey="success" stroke={theme.palette.success.main} strokeWidth={2}
                    fill="url(#abdmOk)" />
                  <Area type="monotone" dataKey="fail" stroke={theme.palette.error.main} strokeWidth={2}
                    fill="url(#abdmFail)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Integration</Typography>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">Gateway</Typography>
                <Typography variant="body2" fontWeight={600}
                  sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {config?.gatewayUrl || '—'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">HIP</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {config?.hipName || '—'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  {config?.hipId || ''}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">HIU</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {config?.hiuName || '—'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  {config?.hiuId || ''}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">CM</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {config?.cmId || 'sbx'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Callback URL</Typography>
                <Typography variant="body2" fontWeight={600}
                  sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                  {config?.callbackUrl || '—'}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            placeholder="Search endpoint, method, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={filter}
            exclusive
            size="small"
            onChange={(_, v) => v && setFilter(v)}
            sx={{
              '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, fontSize: '0.78rem' },
            }}
          >
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="OK">Success</ToggleButton>
            <ToggleButton value="FAIL">Failed</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Recent transactions
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredRecent.length} of {stats.recent.length}
          </Typography>
        </Stack>
        {filteredRecent.length === 0 ? (
          <EmptyState
            icon={<CallReceived />}
            title={loading ? 'Loading…' : 'No transactions'}
            message={loading
              ? 'Fetching ABDM activity…'
              : 'No ABDM gateway transactions matched your filter.'}
          />
        ) : (
          <Stack divider={<Divider flexItem />}>
            {filteredRecent.map((tx) => {
              const fam = endpointFamily(tx.apiEndpoint);
              return (
                <Box key={tx.id} sx={{
                  p: 1.5,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: 1,
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 100 }}>
                    {tx.success ? (
                      <CheckCircleOutline fontSize="small" sx={{ color: 'success.main' }} />
                    ) : (
                      <ErrorOutline fontSize="small" sx={{ color: 'error.main' }} />
                    )}
                    <Chip
                      size="small"
                      label={tx.method || 'GET'}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 20, minWidth: 50 }}
                    />
                  </Stack>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace', fontSize: '0.78rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {tx.apiEndpoint}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.25 }} alignItems="center" flexWrap="wrap">
                      <Chip
                        size="small"
                        label={fam.label}
                        sx={{
                          height: 18, fontSize: '0.62rem',
                          bgcolor: alpha(fam.color, 0.12), color: fam.color, fontWeight: 700,
                        }}
                      />
                      {tx.statusCode != null && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={String(tx.statusCode)}
                          sx={{ height: 18, fontSize: '0.62rem' }}
                          color={tx.success ? 'success' : 'error'}
                        />
                      )}
                      <Tooltip title={format(new Date(tx.timestamp), 'PP p')}>
                        <Typography variant="caption" color="text.disabled">
                          {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default AbdmActivity;
