// Expandable patient billing row.
//
// Replaces the flat DataGrid row in the patient-wise tab. Each patient now
// gets a header card that summarises their balance + a "% paid" progress bar,
// and expands to show every charge, every discount and every receipt — so
// the user no longer has to open a dialog or jump to the patient profile to
// see the full picture.

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Hotel,
  LocalHospital,
  Medication,
  PercentRounded,
  Person,
  Print,
  Receipt,
  Science,
} from '@mui/icons-material';

const inr = (n: any) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fmtDate = (d: any) => {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const typeMeta: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  OPD:      { label: 'OPD',      color: '#2563eb', icon: <LocalHospital sx={{ fontSize: 13 }} /> },
  IPD:      { label: 'IPD',      color: '#ea580c', icon: <Hotel        sx={{ fontSize: 13 }} /> },
  LAB:      { label: 'Lab',      color: '#7c3aed', icon: <Science      sx={{ fontSize: 13 }} /> },
  PHARMACY: { label: 'Pharmacy', color: '#059669', icon: <Medication   sx={{ fontSize: 13 }} /> },
  PAYMENT:  { label: 'Direct',   color: '#64748b', icon: <Receipt      sx={{ fontSize: 13 }} /> },
};

const statusColor = (s: string): 'success' | 'warning' | 'error' | 'default' => {
  if (s === 'PAID') return 'success';
  if (s === 'PARTIAL') return 'warning';
  if (s === 'PENDING' || s === 'UNPAID') return 'error';
  return 'default';
};

interface Props {
  patientRow: any;
  bills: any[];
  detailBills: any[];
  receipts: any[];
  defaultExpanded?: boolean;
  onCollect: (bill: any) => void;
  onOpenProfile: (patientId: string) => void;
  onPrintStatement?: (patientRow: any) => void;
}

const PatientBillingRow: React.FC<Props> = ({
  patientRow,
  bills,
  detailBills,
  receipts,
  defaultExpanded,
  onCollect,
  onOpenProfile,
  onPrintStatement,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(!!defaultExpanded);

  const p = patientRow.patient || {};
  const totalBilled = patientRow.totalBilled || 0;
  const totalPaid   = patientRow.totalPaid   || 0;
  const balance     = patientRow.balance     || 0;
  const paidPct     = totalBilled > 0 ? Math.min(100, (totalPaid / totalBilled) * 100) : 0;

  // Discount totals (across all bills + receipt-side discount-only entries)
  const totalDiscount = useMemo(
    () => bills.reduce((s, b) => s + (b.discount || 0), 0),
    [bills],
  );

  const dueBills = bills.filter((b) => b.outstanding > 0);
  const hasDue = dueBills.length > 0;

  const accent = balance > 0 ? theme.palette.error.main : theme.palette.success.main;

  // Category strip — small chip-row replicating the cards inside the Full Bill
  // dialog so the same info is visible without expanding.
  const categories = [
    { label: 'Consult', value: patientRow.consultation, color: '#2563eb' },
    { label: 'Lab',     value: patientRow.lab,          color: '#7c3aed' },
    { label: 'Medi.',   value: patientRow.medicine,     color: '#059669' },
    { label: 'Ward',    value: patientRow.ward,         color: '#ea580c' },
    { label: 'Scans',   value: patientRow.scan,         color: '#0ea5e9' },
    { label: 'Other',   value: patientRow.other,        color: '#64748b' },
  ].filter((c) => c.value > 0);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        mb: 1.25,
        overflow: 'hidden',
        borderColor: open ? alpha(theme.palette.primary.main, 0.35) : theme.palette.divider,
        transition: 'border-color .2s ease, box-shadow .2s ease',
        boxShadow: open ? `0 6px 20px ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
      }}
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 1.5, md: 2.25 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.025) },
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(accent, 0.12), color: accent,
            fontWeight: 700, fontSize: 13,
          }}
        >
          {p.firstName?.[0]}{p.lastName?.[0]}
        </Box>

        {/* Name + categories */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {p.firstName} {p.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }} noWrap>
              {p.uhid}
            </Typography>
            {totalDiscount > 0 && (
              <Tooltip title={`Total discount given: ${inr(totalDiscount)}`}>
                <Chip
                  size="small"
                  icon={<PercentRounded sx={{ fontSize: 11 }} />}
                  label={inr(totalDiscount)}
                  sx={{
                    height: 18, fontSize: 10, fontWeight: 700,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    color: theme.palette.warning.dark,
                    '& .MuiChip-icon': { color: theme.palette.warning.dark, ml: 0.25 },
                  }}
                />
              </Tooltip>
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
            {categories.length > 0 ? categories.map((c) => (
              <Chip
                key={c.label}
                size="small"
                label={`${c.label}: ${inr(c.value)}`}
                sx={{
                  height: 18, fontSize: 10, fontWeight: 600,
                  bgcolor: alpha(c.color, 0.08),
                  color: c.color,
                  border: 'none',
                }}
              />
            )) : (
              <Typography variant="caption" color="text.disabled">No charges</Typography>
            )}
          </Stack>
        </Box>

        {/* Money column — Billed / Paid / Balance + progress */}
        <Box sx={{ minWidth: 200, display: { xs: 'none', sm: 'block' } }}>
          <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, display: 'block' }}>
                Billed
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                {inr(totalBilled)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, display: 'block' }}>
                Collected
              </Typography>
              <Typography variant="body2" fontWeight={700} color="success.main" sx={{ lineHeight: 1.1 }}>
                {inr(totalPaid)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, display: 'block' }}>
                Due
              </Typography>
              <Typography
                variant="body2"
                fontWeight={800}
                color={balance > 0 ? 'error.main' : 'success.main'}
                sx={{ lineHeight: 1.1 }}
              >
                {inr(balance)}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={`${paidPct.toFixed(0)}% collected`}>
            <LinearProgress
              variant="determinate"
              value={paidPct}
              sx={{
                height: 5, borderRadius: 3,
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                '& .MuiLinearProgress-bar': {
                  bgcolor: paidPct >= 100 ? theme.palette.success.main : theme.palette.primary.main,
                  borderRadius: 3,
                },
              }}
            />
          </Tooltip>
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {hasDue && (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => onCollect(dueBills[0])}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.75, fontSize: 12, px: 1.25 }}
            >
              Collect
            </Button>
          )}
          {onPrintStatement && (
            <Tooltip title="Print statement">
              <IconButton size="small" onClick={() => onPrintStatement(patientRow)}>
                <Print sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Open patient profile">
            <IconButton size="small" onClick={() => p.id && onOpenProfile(p.id)}>
              <Person sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" sx={{ ml: 0.25 }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>

      {/* ── Expandable detail ───────────────────────────────────────────── */}
      <Collapse in={open} unmountOnExit>
        <Divider />
        <Box sx={{ p: { xs: 1.5, md: 2.25 }, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
          {/* Summary tiles */}
          <Grid container spacing={1.25} sx={{ mb: 2 }}>
            {[
              { label: 'Total billed',     value: totalBilled,    color: theme.palette.text.primary },
              { label: 'Discount given',   value: totalDiscount,  color: theme.palette.warning.main },
              { label: 'Total collected',  value: totalPaid,      color: theme.palette.success.main },
              { label: 'Balance due',      value: balance,        color: balance > 0 ? theme.palette.error.main : theme.palette.success.main },
            ].map((c) => (
              <Grid item xs={6} sm={3} key={c.label}>
                <Box sx={{
                  textAlign: 'center', p: 1.25, borderRadius: 2,
                  bgcolor: alpha(c.color, 0.06),
                  border: `1px solid ${alpha(c.color, 0.18)}`,
                }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: c.color, lineHeight: 1.1 }}>
                    {inr(c.value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {c.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Bills table */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              All charges ({bills.length})
            </Typography>
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: receipts.length > 0 ? 2 : 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Gross</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Discount</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Paid</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Due</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="caption" color="text.secondary" sx={{ py: 2, display: 'block' }}>
                        No charges
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : bills.map((b: any) => {
                  const tm = typeMeta[b.type] || typeMeta.PAYMENT;
                  const desc =
                    b.type === 'OPD' && b.doctor ? `Dr. ${b.doctor.firstName} ${b.doctor.lastName}` :
                    b.type === 'IPD' ? `${b.ward?.name || 'Ward'} · ${b.days || '—'} days` :
                    b.type === 'LAB' ? `${b.testName || ''} (${b.testType || ''})` :
                    b.type === 'PHARMACY' ? `${b.medCount || 0} medication(s)` :
                    b.description || '—';
                  return (
                    <React.Fragment key={`${b.type}-${b.id}`}>
                      <TableRow hover>
                        <TableCell><Typography variant="caption">{fmtDate(b.date)}</Typography></TableCell>
                        <TableCell>
                          <Chip
                            icon={tm.icon}
                            label={tm.label}
                            size="small"
                            sx={{
                              bgcolor: alpha(tm.color, 0.1),
                              color: tm.color,
                              height: 20, fontSize: 10, fontWeight: 700,
                              '& .MuiChip-icon': { color: tm.color, ml: 0.5 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize={12}>{desc}</Typography>
                          {b.diagnosis && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                              {b.diagnosis}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} fontSize={12}>
                            {inr((b.total || 0) + (b.discount || 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {b.discount > 0
                            ? <Typography variant="body2" color="warning.main" fontSize={12}>-{inr(b.discount)}</Typography>
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          {b.paid > 0
                            ? <Typography variant="body2" color="success.main" fontSize={12} fontWeight={600}>{inr(b.paid)}</Typography>
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            fontSize={12}
                            color={b.outstanding > 0 ? 'error.main' : 'success.main'}
                          >
                            {b.outstanding > 0 ? inr(b.outstanding) : '✓'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={b.status}
                            size="small"
                            color={statusColor(b.status)}
                            variant={b.status === 'PAID' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {b.outstanding > 0 ? (
                            <Button
                              size="small" variant="contained" color="success"
                              onClick={() => onCollect(b)}
                              sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 11, fontWeight: 700, px: 1, py: 0.25, minWidth: 0 }}
                            >
                              Collect
                            </Button>
                          ) : (
                            <Tooltip title="Settled">
                              <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Itemised detail rows (lab/pharmacy linked to OPD/IPD) */}
                      {detailBills
                        .filter((d: any) => d.parentEncounterId === b.id || d.parentAdmissionId === b.id)
                        .map((d: any) => (
                          <TableRow key={`d-${d.type}-${d.id}`} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.4) }}>
                            <TableCell />
                            <TableCell>
                              <Chip
                                size="small"
                                label={(typeMeta[d.type] || typeMeta.PAYMENT).label}
                                variant="outlined"
                                sx={{ fontSize: 9, height: 18, color: 'text.secondary' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <ChevronRight sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {d.type === 'LAB' ? d.testName : `${d.medCount} med(s)`}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="text.secondary">{inr(d.total)}</Typography>
                            </TableCell>
                            <TableCell colSpan={5}>
                              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                Included in {b.type} bill above
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Receipts table */}
          {receipts.length > 0 && (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                  Payment receipts ({receipts.length})
                </Typography>
              </Stack>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Receipt #</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receipts.map((r: any) => (
                      <TableRow key={r.id} hover>
                        <TableCell><Typography variant="caption">{fmtDate(r.paidAt || r.createdAt)}</Typography></TableCell>
                        <TableCell><Typography variant="caption" fontFamily="monospace">{r.receiptNumber || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontSize={12}>{r.description || '—'}</Typography></TableCell>
                        <TableCell>
                          <Chip
                            label={r.paymentMethod || '—'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="success.main" fontSize={12}>
                            {inr(r.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PatientBillingRow;
