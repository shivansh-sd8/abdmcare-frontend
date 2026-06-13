import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Stack,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
  alpha,
  useTheme,
  Skeleton,
  Divider,
  Alert,
} from '@mui/material';
import {
  PictureAsPdf,
  TableView,
  Archive,
  Download,
  Insights,
  People,
  HealthAndSafety,
  LocalHospital,
  CalendarToday,
  Receipt,
  Bolt,
  Hub,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { PageHeader, StatCard, SectionCard, EmptyState } from '../../components/ui';

type Preset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

interface ReportSnapshot {
  header: {
    hospital: { name: string; code: string; type: string; abdmEnabled: boolean } | null;
    range: { preset: string; from: string | null; to: string | null; label: string };
    generatedAtIst: string;
    generatedBy: { name: string; role: string };
  };
  patientKpis: {
    totalLifetime: number; totalInRange: number;
    abhaLinkedLifetime: number; abhaLinkedInRange: number;
    abhaPercentLifetime: number; abhaPercentInRange: number;
    kycVerifiedLifetime: number;
    genderSplit: { gender: string; count: number }[];
    ageBuckets: { bucket: string; count: number }[];
    topCities: { city: string; count: number }[];
  };
  encounters: {
    totalInRange: number; avgPerDay: number;
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
  doctors: Array<{ doctorId: string; name: string; specialization: string; uniquePatients: number; encounters: number; revenueAttributed: number }>;
  appointments: { total: number; completed: number; cancelled: number; noShow: number };
  ipd: { admissionsInRange: number; currentlyAdmitted: number; bedOccupancyPercent: number; totalIpdRevenue: number };
  pharmacy: { dispensedQty: number; pharmacyRevenue: number; lowStockCount: number; expiringSoonCount: number };
  lab: { ordered: number; completed: number; pending: number; avgTatHours: number };
  billing: {
    totalRevenue: number;
    bySource: { consultation: number; pharmacy: number; labs: number; scans: number; ipd: number };
    byStaff?: Array<{
      collectorId: string | null;
      name: string;
      role: string | null;
      paymentCount: number;
      total: number;
      byMethod: { method: string; amount: number; count: number }[];
    }>;
  };
  abdm: { consents: { requested: number; granted: number; revoked: number }; careContextsLinked: number; scanShareCheckIns: number; externalRecordsReceived: number };
}

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'quarter', label: 'Last 90 days' },
  { id: 'year', label: 'Last 365 days' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

function nf(n: number) {
  return new Intl.NumberFormat('en-IN').format(n || 0);
}
function inr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

const HospitalReports: React.FC = () => {
  const theme = useTheme();
  const [preset, setPreset] = useState<Preset>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pdf' | 'xlsx' | 'zip' | null>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { preset };
    if (preset === 'custom') {
      if (from) params.from = from;
      if (to) params.to = to;
    }
    return params;
  }, [preset, from, to]);

  useEffect(() => {
    const customIncomplete = preset === 'custom' && (!from || !to);
    if (customIncomplete) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get<{ data: ReportSnapshot }>('/api/v1/reports/hospital', { params: queryParams })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message || 'Failed to load report preview';
        setError(msg);
        setData(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queryParams, preset, from, to]);

  /**
   * Authenticated binary download. We can't use a plain <a href> because the
   * API requires a Bearer token. Going through axios with `responseType:
   * 'blob'` makes the existing interceptor stamp the auth header for us,
   * then we synthesize a download link from the blob URL.
   */
  const download = async (kind: 'pdf' | 'xlsx' | 'zip') => {
    if (downloading) return;
    if (preset === 'custom' && (!from || !to)) {
      toast.warn('Pick both From and To dates first.');
      return;
    }
    setDownloading(kind);
    try {
      const res: any = await api.get(`/api/v1/reports/hospital.${kind}`, {
        params: queryParams,
        responseType: 'blob',
      });

      // axios's wrapper returns response.data; our `api` exposes data directly.
      const blob = res instanceof Blob ? res : new Blob([res]);

      // Try to honour the server-supplied filename if the response carries
      // one; we may not see Content-Disposition through the wrapper, so fall
      // back to a sensible default.
      const ext = kind === 'zip' ? 'zip' : kind;
      const name = `${data?.header.hospital?.name || 'Hospital'}_report_${preset}.${ext}`
        .replace(/[^a-zA-Z0-9._-]+/g, '-');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Report downloaded (${kind.toUpperCase()})`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Download failed';
      toast.error(msg);
    } finally {
      setDownloading(null);
    }
  };

  const customIncomplete = preset === 'custom' && (!from || !to);
  const accent = theme.palette.primary.main;

  return (
    <Box>
      <PageHeader
        title="Hospital reports"
        subtitle="Download a complete operating report for any time window. Includes patients, ABHA status, doctor performance, IPD, pharmacy, billing and ABDM activity."
        icon={<Insights />}
      />

      {/* Range picker */}
      <SectionCard
        title="Reporting window"
        subtitle="Pick a preset or a custom date range. All boundaries are IST so reports always match dashboards."
      >
        <Stack spacing={2}>
          <ToggleButtonGroup
            value={preset}
            exclusive
            onChange={(_e, v) => { if (v) setPreset(v); }}
            sx={{
              flexWrap: 'wrap',
              gap: 0.75,
              '& .MuiToggleButton-root': {
                px: 1.75, py: 0.75,
                fontSize: '0.78rem',
                textTransform: 'none',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                fontWeight: 600,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                background: alpha(accent, 0.10),
                color: accent,
                borderColor: alpha(accent, 0.40),
              },
            }}
          >
            {PRESETS.map((p) => (
              <ToggleButton key={p.id} value={p.id}>{p.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          {preset === 'custom' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                type="date"
                label="From"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                sx={{ minWidth: 180 }}
              />
              <TextField
                type="date"
                label="To"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                sx={{ minWidth: 180 }}
              />
            </Stack>
          )}

          {data && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                label={`Window: ${data.header.range.label}`}
                sx={{ bgcolor: alpha(accent, 0.10), color: accent, fontWeight: 700 }}
              />
              {data.header.hospital && (
                <Chip
                  size="small"
                  label={data.header.hospital.name}
                  sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.10), fontWeight: 600 }}
                />
              )}
              {data.header.hospital?.abdmEnabled && (
                <Chip
                  size="small"
                  label="ABDM enabled"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
          )}

          <Divider />

          {/* Download buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              color="primary"
              startIcon={downloading === 'pdf' ? <Download /> : <PictureAsPdf />}
              disabled={!!downloading || customIncomplete}
              onClick={() => download('pdf')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              {downloading === 'pdf' ? 'Generating PDF…' : 'Download PDF'}
            </Button>
            <Button
              variant="outlined"
              startIcon={downloading === 'xlsx' ? <Download /> : <TableView />}
              disabled={!!downloading || customIncomplete}
              onClick={() => download('xlsx')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              {downloading === 'xlsx' ? 'Generating Excel…' : 'Download Excel'}
            </Button>
            <Button
              variant="outlined"
              startIcon={downloading === 'zip' ? <Download /> : <Archive />}
              disabled={!!downloading || customIncomplete}
              onClick={() => download('zip')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              {downloading === 'zip' ? 'Bundling CSVs…' : 'Download CSV bundle'}
            </Button>
          </Stack>

          {customIncomplete && (
            <Alert severity="info" sx={{ alignItems: 'center' }}>
              Pick both <strong>From</strong> and <strong>To</strong> dates to enable preview and download.
            </Alert>
          )}
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
        </Stack>
      </SectionCard>

      {/* Preview KPIs */}
      <Box sx={{ mt: 3 }}>
        {loading ? (
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Grid key={i} item xs={6} md={3}><Skeleton variant="rounded" height={108} /></Grid>
            ))}
          </Grid>
        ) : data ? (
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="primary"
                icon={<People />}
                label="Patients (lifetime)"
                value={nf(data.patientKpis.totalLifetime)}
                delta={{ value: `+${nf(data.patientKpis.totalInRange)} in range`, trend: 'up' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="success"
                icon={<HealthAndSafety />}
                label="ABHA-linked"
                value={`${nf(data.patientKpis.abhaLinkedLifetime)} (${data.patientKpis.abhaPercentLifetime}%)`}
                delta={{ value: `${data.patientKpis.kycVerifiedLifetime} KYC verified`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="info"
                icon={<Receipt />}
                label="Revenue (paid, range)"
                value={inr(data.billing.totalRevenue)}
                delta={{ value: `Pharma ${inr(data.pharmacy.pharmacyRevenue)}`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="warning"
                icon={<LocalHospital />}
                label="IPD"
                value={`${nf(data.ipd.currentlyAdmitted)} admitted`}
                delta={{ value: `${data.ipd.bedOccupancyPercent}% occupancy`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="primary"
                icon={<CalendarToday />}
                label="Encounters in range"
                value={nf(data.encounters.totalInRange)}
                delta={{ value: `${nf(data.encounters.avgPerDay)} / day avg`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="secondary"
                icon={<Bolt />}
                label="Appointments"
                value={nf(data.appointments.total)}
                delta={{ value: `${nf(data.appointments.completed)} completed`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="error"
                icon={<TableView />}
                label="Lab tests"
                value={nf(data.lab.ordered)}
                delta={{ value: `${nf(data.lab.pending)} pending`, trend: 'flat' }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                tone="info"
                icon={<Hub />}
                label="ABDM consents"
                value={nf(data.abdm.consents.requested)}
                delta={{ value: `${nf(data.abdm.consents.granted)} granted`, trend: 'flat' }}
              />
            </Grid>
          </Grid>
        ) : (
          <SectionCard>
            <EmptyState
              icon={<Insights />}
              title="No data yet"
              message="Pick a window and we'll preview the report's headline numbers here."
            />
          </SectionCard>
        )}
      </Box>

      {/* Sources / breakdowns */}
      {data && !loading && (
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Revenue by source" subtitle="Paid encounters in the report window">
              <Stack spacing={1}>
                {(
                  [
                    ['Consultation', data.billing.bySource.consultation],
                    ['Pharmacy', data.billing.bySource.pharmacy],
                    ['Labs', data.billing.bySource.labs],
                    ['Scans', data.billing.bySource.scans],
                    ['IPD', data.billing.bySource.ipd],
                  ] as Array<[string, number]>
                ).map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={700}>{inr(v)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard
              title="Top doctors"
              subtitle="By encounter volume in the report window"
            >
              {data.doctors.length === 0 ? (
                <EmptyState
                  icon={<LocalHospital />}
                  title="No doctor activity yet"
                  message="As soon as encounters are recorded against doctors in the window, you'll see them here."
                />
              ) : (
                <Stack spacing={1}>
                  {data.doctors.slice(0, 6).map((d) => (
                    <Stack
                      key={d.doctorId}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{d.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {d.specialization}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end">
                        <Typography variant="body2" fontWeight={700}>{nf(d.encounters)} visits</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {nf(d.uniquePatients)} patients · {inr(d.revenueAttributed)}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="ABDM activity" subtitle="In the report window">
              <Stack spacing={1}>
                {(
                  [
                    ['Consents requested', data.abdm.consents.requested],
                    ['Consents granted', data.abdm.consents.granted],
                    ['Consents revoked', data.abdm.consents.revoked],
                    ['Care contexts linked', data.abdm.careContextsLinked],
                    ['Scan & Share check-ins', data.abdm.scanShareCheckIns],
                    ['HIU records received', data.abdm.externalRecordsReceived],
                  ] as Array<[string, number]>
                ).map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={700}>{nf(v)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Pharmacy snapshot" subtitle="Stock and dispensing in the window">
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Dispensed quantity</Typography>
                  <Typography variant="body2" fontWeight={700}>{nf(data.pharmacy.dispensedQty)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Pharmacy revenue</Typography>
                  <Typography variant="body2" fontWeight={700}>{inr(data.pharmacy.pharmacyRevenue)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Items below reorder level</Typography>
                  <Typography variant="body2" fontWeight={700} color={data.pharmacy.lowStockCount > 0 ? 'warning.main' : undefined}>
                    {nf(data.pharmacy.lowStockCount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Batches expiring within 90d</Typography>
                  <Typography variant="body2" fontWeight={700} color={data.pharmacy.expiringSoonCount > 0 ? 'error.main' : undefined}>
                    {nf(data.pharmacy.expiringSoonCount)}
                  </Typography>
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard
              title="Collections by staff"
              subtitle="Who actually rang up each rupee in the report window"
              icon={<Receipt />}
            >
              {!data.billing.byStaff || data.billing.byStaff.length === 0 ? (
                <EmptyState
                  small
                  icon={<Receipt />}
                  title="No collections yet"
                  message="As soon as staff start collecting payments, attribution will appear here."
                />
              ) : (
                <Stack spacing={1}>
                  {data.billing.byStaff.slice(0, 8).map((s, i) => {
                    const cash = s.byMethod.find((m) => m.method === 'CASH')?.amount || 0;
                    const digital = s.byMethod
                      .filter((m) => m.method !== 'CASH')
                      .reduce((acc, m) => acc + (m.amount || 0), 0);
                    return (
                      <Stack
                        key={s.collectorId ?? `unattributed-${i}`}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{s.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.role || 'Unattributed'} · {nf(s.paymentCount)} receipt{s.paymentCount === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={`Cash ${inr(cash)}`} sx={{ height: 22 }} />
                          <Chip size="small" label={`Digital ${inr(digital)}`} sx={{ height: 22 }} />
                          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 100, textAlign: 'right' }}>
                            {inr(s.total)}
                          </Typography>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}

      {data && !loading && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.disabled">
            Generated by {data.header.generatedBy.name} ({data.header.generatedBy.role}) · {data.header.generatedAtIst} · IST
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default HospitalReports;
