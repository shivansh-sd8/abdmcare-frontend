import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogContent,
  DialogActions, Grid, IconButton, Tooltip, Divider, TextField,
  CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Tabs, Tab,
  alpha, Skeleton, useTheme, Stack, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Collapse, Pagination, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import {
  Receipt as BillingIcon, CurrencyRupee, CheckCircle, Visibility,
  TrendingUp, AccountBalance, Person, LocalHospital, Science,
  Medication, Hotel, Search, FilterList, Clear, PendingActions,
  ExpandMore, ExpandLess, Link as LinkIcon, LocalOffer, PercentRounded,
  Close as CloseIcon, Print, OpenInNew, CreditCard, AccountBalanceWallet,
  Payments,
} from '@mui/icons-material';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import paymentService from '../../services/paymentService';
import api from '../../services/api';
import BillingAnalytics from './components/BillingAnalytics';
import PatientBillingRow from './components/PatientBillingRow';

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const;

const currency = (n: any) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(Number(n || 0));

const fmtDate = (d: any) => {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  OPD:      { label: 'OPD',      color: '#2563eb', icon: <LocalHospital sx={{ fontSize: 14 }} /> },
  IPD:      { label: 'IPD',      color: '#ea580c', icon: <Hotel sx={{ fontSize: 14 }} /> },
  LAB:      { label: 'Lab',      color: '#7c3aed', icon: <Science sx={{ fontSize: 14 }} /> },
  PHARMACY: { label: 'Pharmacy', color: '#059669', icon: <Medication sx={{ fontSize: 14 }} /> },
  PAYMENT:  { label: 'Payment',  color: '#64748b', icon: <CurrencyRupee sx={{ fontSize: 14 }} /> },
};

const statusChipColor = (s: string): 'success' | 'warning' | 'error' | 'default' => {
  if (s === 'PAID') return 'success';
  if (s === 'PARTIAL') return 'warning';
  if (s === 'PENDING' || s === 'UNPAID') return 'error';
  return 'default';
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 1 }}>{value === index && children}</Box>
);

const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const [tab, setTab] = useState(0);
  const [showDetailRows, setShowDetailRows] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Payment dialog state
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [billDialog, setBillDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');
  const [collecting, setCollecting] = useState(false);

  // Detail dialog state
  const [detailPatient, setDetailPatient] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Patient-wise tab quick filter & pagination
  const [patientFilter, setPatientFilter] = useState<'ALL' | 'DUE' | 'SETTLED' | 'OPD' | 'IPD'>('ALL');
  const [patientPage, setPatientPage] = useState(1);
  const PATIENTS_PER_PAGE = 15;

  // Discount-tab quick filter
  const [discountWindow, setDiscountWindow] = useState<'TODAY' | 'MTD' | 'ALL'>('MTD');

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await paymentService.getConsolidatedBilling();
      setData(res.data?.data || res.data);
    } catch {
      toast.error('Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = data?.stats;
  const allBills: any[] = data?.allBills || [];
  const completedPayments: any[] = data?.completedPayments || [];
  const patientWise: any[] = data?.patientWise || [];

  // ── Filter logic ──
  const activeFilterCount = [
    dateFrom, dateTo, searchQuery, typeFilter !== 'ALL', statusFilter !== 'ALL',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const filterBills = useCallback((bills: any[]) => {
    let list = bills;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) =>
        b.patient?.firstName?.toLowerCase().includes(q) ||
        b.patient?.lastName?.toLowerCase().includes(q) ||
        b.patient?.uhid?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'ALL') list = list.filter((b) => b.type === typeFilter);
    if (statusFilter !== 'ALL') list = list.filter((b) => b.status === statusFilter);

    if (dateFrom || dateTo) {
      list = list.filter((b) => {
        if (!b.date) return false;
        const billDate = new Date(b.date);
        if (dateFrom && billDate < startOfDay(new Date(dateFrom))) return false;
        if (dateTo && billDate > endOfDay(new Date(dateTo))) return false;
        return true;
      });
    }

    return list;
  }, [searchQuery, typeFilter, statusFilter, dateFrom, dateTo]);

  const filteredBills = useMemo(() => {
    const bills = showDetailRows ? allBills : allBills.filter(b => !b.isDetail);
    return filterBills(bills);
  }, [allBills, filterBills, showDetailRows]);

  // ── Patient-wise quick filter (applies on top of the search box) ──
  const filteredPatientWise = useMemo(() => {
    let list = patientWise;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((pw: any) =>
        pw.patient?.firstName?.toLowerCase().includes(q) ||
        pw.patient?.lastName?.toLowerCase().includes(q) ||
        pw.patient?.uhid?.toLowerCase().includes(q)
      );
    }
    if (patientFilter === 'DUE')     list = list.filter((p: any) => (p.balance || 0) > 0);
    if (patientFilter === 'SETTLED') list = list.filter((p: any) => (p.balance || 0) <= 0 && (p.totalBilled || 0) > 0);
    if (patientFilter === 'OPD')     list = list.filter((p: any) => (p.consultation || 0) > 0);
    if (patientFilter === 'IPD')     list = list.filter((p: any) => (p.ward || 0) > 0);

    // Sort: largest balance first so dues surface immediately
    return [...list].sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0));
  }, [patientWise, searchQuery, patientFilter]);

  const pagedPatients = useMemo(
    () => filteredPatientWise.slice(
      (patientPage - 1) * PATIENTS_PER_PAGE,
      patientPage * PATIENTS_PER_PAGE,
    ),
    [filteredPatientWise, patientPage],
  );
  const totalPatientPages = Math.max(1, Math.ceil(filteredPatientWise.length / PATIENTS_PER_PAGE));

  useEffect(() => { setPatientPage(1); }, [searchQuery, patientFilter]);

  // ── Discounts feed ──
  const discountedBills = useMemo(() => {
    const list = allBills.filter((b: any) => !b.isDetail && (b.discount || 0) > 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    let scoped = list;
    if (discountWindow === 'TODAY') {
      scoped = list.filter((b: any) => b.date && new Date(b.date) >= startOfToday);
    } else if (discountWindow === 'MTD') {
      scoped = list.filter((b: any) => b.date && new Date(b.date) >= startOfMonth);
    }
    return [...scoped].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allBills, discountWindow]);

  const discountStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    let today = 0;
    let mtd = 0;
    let mtdCount = 0;
    let totalCount = 0;
    let total = 0;

    allBills.forEach((b: any) => {
      if (b.isDetail) return;
      const d = b.discount || 0;
      if (d <= 0) return;
      total += d; totalCount += 1;
      if (b.date) {
        const dt = new Date(b.date);
        if (dt >= startOfToday) today += d;
        if (dt >= startOfMonth) { mtd += d; mtdCount += 1; }
      }
    });
    return {
      today, mtd, mtdCount, totalCount, total,
      avgPerBill: mtdCount > 0 ? mtd / mtdCount : 0,
    };
  }, [allBills]);

  // ── Payment dialog handlers ──
  const handleOpenBill = (bill: any) => {
    setSelectedBill(bill);
    setPaymentMethod('CASH');
    setTransactionRef('');
    setDiscount(0);
    setDiscountReason('');
    setCollectAmount(bill.outstanding || 0);
    setBillDialog(true);
  };

  // Discount quick-picks shown in the collect dialog so the cashier never has
  // to do the math; values are clamped to the outstanding amount.
  const applyDiscountPick = (kind: 'pct5' | 'pct10' | 'pct20' | 'flat100' | 'flat500' | 'clear') => {
    if (!selectedBill) return;
    const out = selectedBill.outstanding || 0;
    let next = 0;
    if (kind === 'pct5')     next = Math.round(out * 0.05);
    if (kind === 'pct10')    next = Math.round(out * 0.10);
    if (kind === 'pct20')    next = Math.round(out * 0.20);
    if (kind === 'flat100')  next = Math.min(100, out);
    if (kind === 'flat500')  next = Math.min(500, out);
    if (kind === 'clear')    next = 0;
    setDiscount(next);
    setCollectAmount(Math.max(0, out - next));
  };

  // Print a patient statement using a hidden print window. Uses only the
  // already-fetched billing payload so it works offline / no extra API call.
  const printPatientStatement = useCallback((patientRow: any) => {
    if (!patientRow) return;
    const p = patientRow.patient || {};
    const bills = allBills.filter((b: any) => b.patient?.id === p.id && !b.isDetail);
    const receipts = completedPayments.filter((r: any) => r.patient?.id === p.id);
    const totalDiscount = bills.reduce((s: number, b: any) => s + (b.discount || 0), 0);
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const inrFmt = (n: any) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n || 0));

    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) { toast.warning('Pop-up blocked. Allow pop-ups to print the statement.'); return; }

    w.document.write(`<!doctype html><html><head><title>Statement · ${p.firstName || ''} ${p.lastName || ''}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px;margin:0}
        h1{margin:0 0 4px;font-size:18px} .sub{color:#64748b;font-size:12px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}
        .tile{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
        .tile b{display:block;font-size:14px;margin-bottom:2px}
        .tile span{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
        table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
        th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}
        th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569}
        .right{text-align:right}
        .due{color:#dc2626;font-weight:700}.paid{color:#059669;font-weight:600}.disc{color:#d97706}
        .footer{margin-top:32px;font-size:10px;color:#94a3b8}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>Patient Statement</h1>
      <div class="sub">${p.firstName || ''} ${p.lastName || ''} · UHID ${p.uhid || '—'} · Generated ${today}</div>
      <div class="grid">
        <div class="tile"><b>${inrFmt(patientRow.totalBilled)}</b><span>Billed</span></div>
        <div class="tile"><b style="color:#d97706">${inrFmt(totalDiscount)}</b><span>Discount</span></div>
        <div class="tile"><b style="color:#059669">${inrFmt(patientRow.totalPaid)}</b><span>Collected</span></div>
        <div class="tile"><b style="color:${patientRow.balance > 0 ? '#dc2626' : '#059669'}">${inrFmt(patientRow.balance)}</b><span>Balance</span></div>
      </div>
      <table><thead><tr>
        <th>Date</th><th>Type</th><th>Description</th>
        <th class="right">Gross</th><th class="right">Discount</th>
        <th class="right">Paid</th><th class="right">Due</th><th>Status</th>
      </tr></thead><tbody>
      ${bills.map((b: any) => `<tr>
        <td>${b.date ? new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
        <td>${b.type}</td>
        <td>${b.type === 'OPD' && b.doctor ? `Dr. ${b.doctor.firstName} ${b.doctor.lastName}` :
              b.type === 'IPD' ? `${b.ward?.name || 'Ward'} · ${b.days || '—'}d` :
              b.type === 'LAB' ? `${b.testName || ''}` :
              b.type === 'PHARMACY' ? `${b.medCount || 0} med(s)` : b.description || '—'}</td>
        <td class="right">${inrFmt((b.total || 0) + (b.discount || 0))}</td>
        <td class="right disc">${b.discount > 0 ? '-' + inrFmt(b.discount) : '—'}</td>
        <td class="right paid">${b.paid > 0 ? inrFmt(b.paid) : '—'}</td>
        <td class="right ${b.outstanding > 0 ? 'due' : 'paid'}">${b.outstanding > 0 ? inrFmt(b.outstanding) : '✓'}</td>
        <td>${b.status}</td>
      </tr>`).join('')}
      </tbody></table>
      ${receipts.length ? `
        <h3 style="margin-top:32px;font-size:13px">Payment Receipts</h3>
        <table><thead><tr>
          <th>Date</th><th>Receipt #</th><th>Description</th><th>Method</th><th class="right">Amount</th>
        </tr></thead><tbody>
        ${receipts.map((r: any) => `<tr>
          <td>${(r.paidAt || r.createdAt) ? new Date(r.paidAt || r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
          <td>${r.receiptNumber || '—'}</td>
          <td>${r.description || '—'}</td>
          <td>${r.paymentMethod || '—'}</td>
          <td class="right paid">${inrFmt(r.amount)}</td>
        </tr>`).join('')}
        </tbody></table>` : ''}
      <div class="footer">Computer-generated statement. Please contact billing for any clarification.</div>
      <script>window.print();</script>
    </body></html>`);
    w.document.close();
  }, [allBills, completedPayments]);

  const amountAfterDiscount = useMemo(() => {
    if (!selectedBill) return 0;
    return Math.max(0, (selectedBill.outstanding || 0) - discount);
  }, [selectedBill, discount]);

  const paymentStatus = useMemo(() => {
    if (!selectedBill) return 'PENDING';
    return collectAmount >= amountAfterDiscount ? 'FULLY_SETTLED' : 'PARTIAL';
  }, [selectedBill, collectAmount, amountAfterDiscount]);

  const handleCollectPayment = async () => {
    if (!selectedBill) return;
    if (!paymentMethod) { toast.warning('Select a payment method'); return; }
    if (collectAmount <= 0) { toast.warning('Enter a valid amount'); return; }
    if (discount > 0 && !discountReason.trim()) {
      toast.warning('Please provide a reason for the discount');
      return;
    }

    setCollecting(true);
    try {
      // Apply discount first if admin set one
      if (discount > 0 && isAdmin) {
        if (selectedBill.type === 'OPD') {
          await api.patch(`/api/v1/encounters/${selectedBill.id}/discount`, {
            amount: discount,
            reason: discountReason || undefined,
          });
        } else if (selectedBill.type === 'IPD') {
          await api.patch(`/api/v1/ipd/admissions/${selectedBill.id}/discount`, {
            amount: discount,
            reason: discountReason || undefined,
          });
        }
      }

      if (selectedBill.type === 'OPD') {
        await api.patch(`/api/v1/encounters/${selectedBill.id}/collect-payment`, {
          paymentMethod,
          paymentCollected: collectAmount,
          transactionRef: transactionRef || undefined,
        });
      } else if (selectedBill.type === 'IPD') {
        await api.patch(`/api/v1/ipd/admissions/${selectedBill.id}/collect-payment`, {
          amount: collectAmount,
          paymentMethod,
          transactionRef: transactionRef || undefined,
        });
      } else if (selectedBill.type === 'LAB' || selectedBill.type === 'PHARMACY') {
        await paymentService.createPayment({
          patientId: selectedBill.patient?.id,
          hospitalId: user?.hospitalId,
          amount: collectAmount,
          paymentMethod,
          description: selectedBill.type === 'LAB'
            ? `Lab: ${selectedBill.testName || 'Investigation'}`
            : `Pharmacy: ${selectedBill.medCount || 0} medication(s)`,
        });
      } else if (selectedBill.type === 'PAYMENT') {
        await paymentService.markAsPaid(selectedBill.id, transactionRef || undefined);
      }
      toast.success('Payment collected successfully');
      setBillDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setCollecting(false);
    }
  };

  // ── DataGrid column defs ──

  const billColumns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 100,
      valueGetter: (params: any) => params.row.date ? new Date(params.row.date) : null,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">{fmtDate(params.row.date)}</Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) =>
        `${params.row.patient?.firstName || ''} ${params.row.patient?.lastName || ''}`.trim(),
      renderCell: (params: GridRenderCellParams) => {
        const p = params.row.patient;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha('#6366f1', 0.1), color: '#6366f1',
              fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {p?.firstName?.[0]}{p?.lastName?.[0]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {p?.firstName} {p?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{p?.uhid}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const tc = typeConfig[params.value] || typeConfig.PAYMENT;
        return (
          <Chip
            icon={tc.icon} label={tc.label} size="small"
            sx={{ bgcolor: alpha(tc.color, 0.1), color: tc.color, fontWeight: 600, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 120,
      valueGetter: (params: any) => {
        const b = params.row;
        if (b.type === 'OPD' && b.doctor) return `Dr. ${b.doctor.firstName} ${b.doctor.lastName}`;
        if (b.type === 'IPD') return `${b.ward?.name || 'Ward'} · Bed ${b.bed?.bedNumber || '—'}`;
        if (b.type === 'LAB') return `${b.testName || ''} (${b.testType || ''})`;
        if (b.type === 'PHARMACY') return `${b.medCount || 0} medication(s)`;
        return b.description || '—';
      },
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary" noWrap>{params.value}</Typography>
      ),
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 95,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={600}>{currency(params.value)}</Typography>
      ),
    },
    {
      field: 'discount',
      headerName: 'Discount',
      width: 85,
      type: 'number',
      valueGetter: (params: any) => params.row.discount || 0,
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2" color="warning.main">{currency(params.value)}</Typography>
          : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      field: 'paid',
      headerName: 'Paid',
      width: 95,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="success.main">{currency(params.value)}</Typography>
      ),
    },
    {
      field: 'outstanding',
      headerName: 'Due',
      width: 95,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={700} color={params.value > 0 ? 'error.main' : 'success.main'}>
          {currency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 90,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value} size="small"
          color={statusChipColor(params.value)}
          variant={params.value === 'PAID' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const bill = params.row;
        const canCollect = bill.outstanding > 0 && !bill.isDetail;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {canCollect && (
              <Button
                size="small" variant="contained" color="success"
                onClick={() => handleOpenBill(bill)}
                sx={{ fontSize: '0.7rem', textTransform: 'none', borderRadius: 1.5, px: 1.5, minWidth: 0 }}
              >
                Collect
              </Button>
            )}
            {bill.isDetail && bill.outstanding > 0 && (
              <Tooltip title="Included in parent OPD/IPD bill">
                <Chip icon={<LinkIcon sx={{ fontSize: 12 }} />} label="In OPD bill"
                  size="small" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 22, color: 'text.secondary' }} />
              </Tooltip>
            )}
            {bill.patient?.id && (
              <Tooltip title="View Full Bill">
                <IconButton size="small" onClick={() => {
                  const pw = patientWise.find((p: any) => p.patient?.id === bill.patient.id);
                  if (pw) { setDetailPatient(pw); setDetailOpen(true); }
                }}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  const patientWiseColumns: GridColDef[] = [
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 160,
      valueGetter: (params: any) =>
        `${params.row.patient?.firstName || ''} ${params.row.patient?.lastName || ''}`.trim(),
      renderCell: (params: GridRenderCellParams) => {
        const p = params.row.patient;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed',
              fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {p?.firstName?.[0]}{p?.lastName?.[0]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{p?.firstName} {p?.lastName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{p?.uhid}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'consultation', headerName: 'Consult.', width: 95, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'lab', headerName: 'Lab', width: 85, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'medicine', headerName: 'Medicine', width: 90, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'ward', headerName: 'Ward', width: 85, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'scan', headerName: 'Scan', width: 85, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'other', headerName: 'Other', width: 85, type: 'number',
      renderCell: (params: GridRenderCellParams) =>
        params.value > 0
          ? <Typography variant="body2">{currency(params.value)}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'totalBilled', headerName: 'Billed', width: 100, type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={700}>{currency(params.value)}</Typography>
      ),
    },
    {
      field: 'totalPaid', headerName: 'Paid', width: 95, type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={600} color="success.main">{currency(params.value)}</Typography>
      ),
    },
    {
      field: 'balance', headerName: 'Balance', width: 95, type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={700} color={params.value > 0 ? 'error.main' : 'success.main'}>
          {currency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, filterable: false,
      renderCell: (params: GridRenderCellParams) =>
        params.row.patient?.id ? (
          <Button
            size="small" variant="outlined"
            onClick={() => {
              setDetailPatient(params.row);
              setDetailOpen(true);
            }}
            sx={{ fontSize: '0.7rem', textTransform: 'none', borderRadius: 1.5 }}
          >
            Full Bill
          </Button>
        ) : null,
    },
  ];

  const receiptColumns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueGetter: (params: any) => params.row.paidAt || params.row.createdAt,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {fmtDate(params.row.paidAt || params.row.createdAt)}
        </Typography>
      ),
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 180,
      valueGetter: (params: any) =>
        `${params.row.patient?.firstName || ''} ${params.row.patient?.lastName || ''}`.trim(),
      renderCell: (params: GridRenderCellParams) => {
        const p = params.row.patient;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha('#059669', 0.1), color: '#059669',
              fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>
              {p?.firstName?.[0]}{p?.lastName?.[0]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{p?.firstName} {p?.lastName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{p?.uhid}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'receiptNumber',
      headerName: 'Receipt No.',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary" noWrap>{params.value || '—'}</Typography>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={600} color="success.main">{currency(params.value)}</Typography>
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Method',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value || '—'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="success" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
      ),
    },
  ];

  // ── Stat cards ──
  const statCards = [
    { label: 'Revenue (Month)',       value: currency(stats?.monthRevenue),      color: '#059669', icon: <AccountBalance /> },
    { label: "Today's Collections",   value: currency(stats?.todayCollections),  color: '#2563eb', icon: <CurrencyRupee /> },
    { label: 'Total Outstanding',     value: currency(stats?.totalOutstanding),  color: '#ef4444', icon: <TrendingUp /> },
    { label: 'Pending Bills',         value: stats?.pendingCount ?? 0,           color: '#7c3aed', icon: <PendingActions /> },
    { label: 'Discount Given (MTD)',  value: currency(discountStats.mtd),        color: '#d97706', icon: <LocalOffer /> },
  ];

  const dataGridSx = {
    border: 'none',
    '& .MuiDataGrid-columnHeaders': {
      bgcolor: alpha(theme.palette.primary.main, 0.04),
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    '& .MuiDataGrid-cell': {
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiDataGrid-row:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.02),
    },
    '& .MuiDataGrid-footerContainer': {
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };

  const STAT_TONES: Array<'success' | 'info' | 'error' | 'secondary' | 'warning'> = ['success', 'info', 'error', 'secondary', 'warning'];

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Billing & Payments"
        subtitle="Consolidated billing across OPD, IPD, lab, and pharmacy"
        icon={<BillingIcon />}
      />

      {/* ── Stat Cards ── */}
      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} sm={4} md={2.4} key={s.label}>
            <StatCard
              label={s.label}
              value={String(s.value)}
              icon={s.icon as React.ReactElement}
              tone={STAT_TONES[i] || 'info'}
              loading={loading}
              delta={
                i === 4 && discountStats.mtdCount > 0
                  ? { value: `${discountStats.mtdCount} bills`, label: 'this month' }
                  : i === 3 && (stats?.pendingCount ?? 0) > 0
                  ? { value: currency(stats?.totalOutstanding), label: 'open' }
                  : undefined
              }
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Rich analytics row (trend, methods, outstanding by type, aging) ── */}
      <BillingAnalytics
        loading={loading}
        allBills={allBills}
        completedPayments={completedPayments}
      />

      {/* ── Filter Bar ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            placeholder="Search by patient name or UHID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search sx={{ color: 'text.disabled' }} /></InputAdornment>
              ),
              ...(searchQuery ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}><Clear fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
              } : {}),
            }}
          />
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            size="small"
            startIcon={<FilterList />}
            endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ minWidth: 120, borderRadius: 2 }}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </Stack>

        <Collapse in={showFilters}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="From" type="date" size="small" fullWidth
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="To" type="date" size="small" fullWidth
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Bill Type</InputLabel>
                  <Select value={typeFilter} label="Bill Type" onChange={(e) => setTypeFilter(e.target.value)}>
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="OPD">OPD</MenuItem>
                    <MenuItem value="IPD">IPD</MenuItem>
                    <MenuItem value="LAB">Lab</MenuItem>
                    <MenuItem value="PHARMACY">Pharmacy</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={statusFilter} label="Payment Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="PARTIAL">Partial</MenuItem>
                    <MenuItem value="PAID">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained" size="small"
                    onClick={() => {/* filters are applied reactively */}}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Apply
                  </Button>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outlined" size="small" color="inherit"
                      startIcon={<Clear />}
                      onClick={clearFilters}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Reset
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* ── Tabs & Content ── */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2, borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 },
          }}
        >
          <Tab label={`Patient-wise (${filteredPatientWise.length})`} />
          <Tab label={`All Bills (${filteredBills.length})`} />
          <Tab
            icon={<LocalOffer sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Discounts (${discountStats.totalCount})`}
            sx={{ minHeight: 52 }}
          />
          <Tab label={`Payment Receipts (${completedPayments.length})`} />
        </Tabs>

        <Box sx={{ px: 2, pb: 2 }}>
          {/* Tab 0: Patient-wise — expandable rows show every charge / discount /
              receipt inline so users no longer have to open the patient profile. */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ width: '100%' }}>
              {/* Quick filter chips + summary line */}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.25}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                sx={{ pt: 1, pb: 1.5 }}
              >
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {([
                    { id: 'ALL',     label: 'All patients',  count: patientWise.length },
                    { id: 'DUE',     label: 'With balance',  count: patientWise.filter((p: any) => (p.balance || 0) > 0).length },
                    { id: 'SETTLED', label: 'Settled',       count: patientWise.filter((p: any) => (p.balance || 0) <= 0 && (p.totalBilled || 0) > 0).length },
                    { id: 'OPD',     label: 'OPD',           count: patientWise.filter((p: any) => (p.consultation || 0) > 0).length },
                    { id: 'IPD',     label: 'IPD',           count: patientWise.filter((p: any) => (p.ward || 0) > 0).length },
                  ] as const).map((f) => (
                    <Chip
                      key={f.id}
                      label={`${f.label} · ${f.count}`}
                      onClick={() => setPatientFilter(f.id as any)}
                      variant={patientFilter === f.id ? 'filled' : 'outlined'}
                      color={patientFilter === f.id ? 'primary' : 'default'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        borderRadius: 1.5,
                        ...(patientFilter !== f.id && { color: 'text.secondary' }),
                      }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Sorted by balance (largest due first) · Click a patient to expand
                </Typography>
              </Stack>

              {loading ? (
                <Stack spacing={1.25}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={72} />
                  ))}
                </Stack>
              ) : filteredPatientWise.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <EmptyState
                    icon={<Person />}
                    title="No patients match"
                    message={searchQuery ? 'Try a different search or clear the quick filter.' : 'No billing data yet.'}
                  />
                </Box>
              ) : (
                <>
                  <Box>
                    {pagedPatients.map((row: any) => {
                      const pid = row.patient?.id;
                      const bills = allBills.filter((b: any) => b.patient?.id === pid && !b.isDetail);
                      const detailBills = allBills.filter((b: any) => b.patient?.id === pid && b.isDetail);
                      const receipts = completedPayments.filter((r: any) => r.patient?.id === pid);
                      return (
                        <PatientBillingRow
                          key={pid || Math.random()}
                          patientRow={row}
                          bills={bills}
                          detailBills={detailBills}
                          receipts={receipts}
                          onCollect={handleOpenBill}
                          onOpenProfile={(id) => navigate(`/app/patients/${id}`)}
                          onPrintStatement={printPatientStatement}
                        />
                      );
                    })}
                  </Box>
                  {totalPatientPages > 1 && (
                    <Stack alignItems="center" sx={{ py: 2 }}>
                      <Pagination
                        count={totalPatientPages}
                        page={patientPage}
                        onChange={(_, p) => setPatientPage(p)}
                        color="primary"
                        size="small"
                        showFirstButton showLastButton
                      />
                    </Stack>
                  )}
                </>
              )}
            </Box>
          </TabPanel>

          {/* Tab 1: All Bills */}
          <TabPanel value={tab} index={1}>
            <Box sx={{ width: '100%' }}>
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                <Button
                  size="small" variant="text" color="inherit"
                  startIcon={showDetailRows ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShowDetailRows(!showDetailRows)}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {showDetailRows ? 'Hide itemized breakdown' : 'Show itemized breakdown'}
                </Button>
              </Stack>
              <DataGrid
                rows={filteredBills}
                columns={billColumns}
                getRowId={(row) => `${row.type}-${row.id}-${row.date}`}
                loading={loading}
                autoHeight
                rowHeight={60}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={{
                  ...dataGridSx,
                  '& .detail-row': {
                    bgcolor: alpha(theme.palette.action.hover, 0.3),
                    fontStyle: 'italic',
                  },
                }}
                getRowClassName={(params) => params.row.isDetail ? 'detail-row' : ''}
                slots={{
                  noRowsOverlay: () => (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', py: 6 }}>
                      <CheckCircle sx={{ fontSize: 40, color: 'success.light', mb: 1 }} />
                      <Typography color="text.secondary">No bills found</Typography>
                    </Stack>
                  ),
                }}
              />
            </Box>
          </TabPanel>

          {/* Tab 2: Discounts — auditable record of every discount given. */}
          <TabPanel value={tab} index={2}>
            <Box sx={{ width: '100%' }}>
              {/* Discount KPI strip */}
              <Grid container spacing={1.5} sx={{ pt: 1, pb: 2 }}>
                {[
                  { label: 'Today',          value: currency(discountStats.today),       color: '#2563eb' },
                  { label: 'Month-to-date',  value: currency(discountStats.mtd),         color: '#d97706' },
                  { label: 'Bills (MTD)',    value: discountStats.mtdCount,              color: '#7c3aed' },
                  { label: 'Avg / bill',     value: currency(discountStats.avgPerBill),  color: '#059669' },
                ].map((c) => (
                  <Grid item xs={6} sm={3} key={c.label}>
                    <Box sx={{
                      textAlign: 'center', p: 1.5, borderRadius: 2,
                      bgcolor: alpha(c.color as string, 0.06),
                      border: `1px solid ${alpha(c.color as string, 0.18)}`,
                    }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: c.color, lineHeight: 1.1 }}>
                        {c.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        {c.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Window toggle */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Show:
                </Typography>
                <ToggleButtonGroup
                  value={discountWindow}
                  exclusive
                  onChange={(_, v) => v && setDiscountWindow(v)}
                  size="small"
                >
                  <ToggleButton value="TODAY" sx={{ textTransform: 'none', px: 1.5 }}>Today</ToggleButton>
                  <ToggleButton value="MTD"   sx={{ textTransform: 'none', px: 1.5 }}>This month</ToggleButton>
                  <ToggleButton value="ALL"   sx={{ textTransform: 'none', px: 1.5 }}>All</ToggleButton>
                </ToggleButtonGroup>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {discountedBills.length} discount{discountedBills.length === 1 ? '' : 's'} matched
                </Typography>
              </Stack>

              {/* Discounts table */}
              {discountedBills.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <EmptyState
                    icon={<LocalOffer />}
                    title="No discounts"
                    message={discountWindow === 'TODAY' ? 'No discounts given today.' : discountWindow === 'MTD' ? 'No discounts given this month.' : 'No discounts on record.'}
                  />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Patient</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Bill</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Discount</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">% off</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Reason</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discountedBills.map((b: any) => {
                        const tc = typeConfig[b.type] || typeConfig.PAYMENT;
                        const gross = (b.total || 0) + (b.discount || 0);
                        const pct = gross > 0 ? ((b.discount || 0) / gross) * 100 : 0;
                        const desc =
                          b.type === 'OPD' && b.doctor ? `Dr. ${b.doctor.firstName} ${b.doctor.lastName}` :
                          b.type === 'IPD' ? `${b.ward?.name || 'Ward'} · ${b.days || '—'} days` :
                          b.type === 'LAB' ? `${b.testName || ''}` :
                          b.type === 'PHARMACY' ? `${b.medCount || 0} medication(s)` :
                          b.description || '—';
                        return (
                          <TableRow key={`disc-${b.type}-${b.id}`} hover>
                            <TableCell><Typography variant="caption">{fmtDate(b.date)}</Typography></TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{
                                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                                  color: theme.palette.warning.dark,
                                  fontWeight: 700, fontSize: 11,
                                }}>
                                  {b.patient?.firstName?.[0]}{b.patient?.lastName?.[0]}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} fontSize={12} noWrap>
                                    {b.patient?.firstName} {b.patient?.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" fontSize={10} noWrap>
                                    {b.patient?.uhid}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={tc.icon}
                                label={tc.label}
                                size="small"
                                sx={{
                                  bgcolor: alpha(tc.color, 0.1),
                                  color: tc.color,
                                  height: 20, fontSize: 10, fontWeight: 700,
                                  '& .MuiChip-icon': { color: tc.color, ml: 0.5 },
                                }}
                              />
                            </TableCell>
                            <TableCell><Typography variant="body2" fontSize={12} noWrap>{desc}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" fontWeight={600} fontSize={12}>{currency(gross)}</Typography></TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700} color="warning.main" fontSize={12}>
                                -{currency(b.discount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                icon={<PercentRounded sx={{ fontSize: 11 }} />}
                                label={pct.toFixed(0)}
                                sx={{
                                  height: 20, fontSize: 10, fontWeight: 700,
                                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                                  color: theme.palette.warning.dark,
                                  '& .MuiChip-icon': { color: theme.palette.warning.dark, ml: 0.25 },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color={b.discountReason ? 'text.primary' : 'text.disabled'} sx={{ fontStyle: b.discountReason ? 'normal' : 'italic' }}>
                                {b.discountReason || 'No reason recorded'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {b.patient?.id && (
                                <Tooltip title="View patient bill">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const pw = patientWise.find((p: any) => p.patient?.id === b.patient.id);
                                      if (pw) { setDetailPatient(pw); setDetailOpen(true); }
                                    }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          {/* Tab 3: Payment Receipts */}
          <TabPanel value={tab} index={3}>
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={completedPayments}
                columns={receiptColumns}
                getRowId={(row) => row.id}
                loading={loading}
                autoHeight
                rowHeight={56}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={dataGridSx}
                slots={{
                  noRowsOverlay: () => (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', py: 6 }}>
                      <Typography color="text.secondary">No payment receipts</Typography>
                    </Stack>
                  ),
                }}
              />
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* ── Collect Payment Dialog ─────────────────────────────────────────
          Beautified: gradient header · richer patient hero · iconified
          breakdown rows · large amount field with quick-pick chips · icon-led
          payment method buttons · prominent footer CTA. */}
      <Dialog
        open={billDialog}
        onClose={() => !collecting && setBillDialog(false)}
        maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {/* Gradient header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${alpha(theme.palette.success.dark, 0.9)} 100%)`,
            color: '#fff',
            px: 3, pt: 2.5, pb: 2.25,
            position: 'relative',
          }}
        >
          <IconButton
            onClick={() => !collecting && setBillDialog(false)}
            disabled={collecting}
            sx={{
              position: 'absolute', top: 8, right: 8,
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 42, height: 42, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <CurrencyRupee sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                Collect Payment
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {selectedBill ? `${typeConfig[selectedBill.type]?.label || selectedBill.type} bill · ${currency(selectedBill.outstanding)} due` : ''}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, pt: 2.5 }}>
          {selectedBill && (
            <>
              {/* Patient hero card */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75, mb: 2, borderRadius: 2,
                  background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`,
                  borderColor: alpha(theme.palette.primary.main, 0.18),
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    fontWeight: 800, fontSize: 13,
                  }}>
                    {selectedBill.patient?.firstName?.[0]}{selectedBill.patient?.lastName?.[0]}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>
                        {selectedBill.patient?.firstName} {selectedBill.patient?.lastName}
                      </Typography>
                      <Chip
                        size="small"
                        icon={typeConfig[selectedBill.type]?.icon}
                        label={typeConfig[selectedBill.type]?.label || selectedBill.type}
                        sx={{
                          height: 20, fontSize: 10, fontWeight: 700,
                          bgcolor: alpha(typeConfig[selectedBill.type]?.color || '#64748b', 0.12),
                          color: typeConfig[selectedBill.type]?.color || '#64748b',
                          '& .MuiChip-icon': { color: typeConfig[selectedBill.type]?.color || '#64748b', ml: 0.5 },
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {selectedBill.patient?.uhid}
                      {selectedBill.doctor && ` · Dr. ${selectedBill.doctor.firstName} ${selectedBill.doctor.lastName}`}
                      {selectedBill.ward?.name && ` · ${selectedBill.ward.name}`}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Bill Breakdown — iconified rows + emphasized totals */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                  <BillingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
                    Bill Breakdown
                  </Typography>
                </Stack>

                {(() => {
                  const rows: { label: string; value: number; icon: React.ReactElement; color: string }[] = [];
                  if (selectedBill.type === 'OPD') {
                    if (selectedBill.consultation > 0) rows.push({ label: 'Consultation fee', value: selectedBill.consultation, icon: <LocalHospital sx={{ fontSize: 14 }} />, color: '#2563eb' });
                    if (selectedBill.lab > 0)          rows.push({ label: 'Lab / tests',       value: selectedBill.lab,          icon: <Science      sx={{ fontSize: 14 }} />, color: '#7c3aed' });
                    if (selectedBill.medicine > 0)     rows.push({ label: 'Medicines',         value: selectedBill.medicine,     icon: <Medication   sx={{ fontSize: 14 }} />, color: '#059669' });
                    if (selectedBill.scan > 0)         rows.push({ label: 'Scans',             value: selectedBill.scan,         icon: <Science      sx={{ fontSize: 14 }} />, color: '#0ea5e9' });
                  }
                  if (selectedBill.type === 'IPD') {
                    rows.push({ label: `Ward (${selectedBill.ward?.name || '—'}) × ${selectedBill.days || '—'} days`, value: selectedBill.wardCharges, icon: <Hotel sx={{ fontSize: 14 }} />, color: '#ea580c' });
                  }
                  if (selectedBill.type === 'LAB') {
                    rows.push({ label: `${selectedBill.testName || ''}${selectedBill.testType ? ` (${selectedBill.testType})` : ''}`, value: selectedBill.total, icon: <Science sx={{ fontSize: 14 }} />, color: '#7c3aed' });
                  }
                  if (selectedBill.type === 'PHARMACY') {
                    rows.push({ label: `${selectedBill.medCount || 0} medication(s)`, value: selectedBill.total, icon: <Medication sx={{ fontSize: 14 }} />, color: '#059669' });
                  }
                  return (
                    <Stack spacing={0.75}>
                      {rows.map((r) => (
                        <Stack key={r.label} direction="row" alignItems="center" spacing={1}>
                          <Box sx={{
                            width: 24, height: 24, borderRadius: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(r.color, 0.1), color: r.color, flexShrink: 0,
                          }}>
                            {r.icon}
                          </Box>
                          <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">{r.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{currency(r.value)}</Typography>
                        </Stack>
                      ))}
                      {selectedBill.type === 'IPD' && selectedBill.advancePaid > 0 && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{
                            width: 24, height: 24, borderRadius: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main, flexShrink: 0,
                          }}>
                            <CheckCircle sx={{ fontSize: 14 }} />
                          </Box>
                          <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">Advance paid</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">-{currency(selectedBill.advancePaid)}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  );
                })()}

                <Divider sx={{ my: 1.25 }} />

                <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>Total</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {currency(selectedBill.total)}
                  </Typography>
                </Stack>
                {selectedBill.paid > 0 && (
                  <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Already collected</Typography>
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      -{currency(selectedBill.paid)}
                    </Typography>
                  </Stack>
                )}
                <Box sx={{
                  mt: 0.75, py: 0.75, px: 1.25,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.error.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.18)}`,
                  display: 'flex', alignItems: 'center',
                }}>
                  <Typography variant="body2" fontWeight={800} sx={{ flex: 1, color: theme.palette.error.dark }}>
                    Due now
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.error.dark, lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {currency(selectedBill.outstanding)}
                  </Typography>
                </Box>
              </Paper>

              {/* Discount Section — quick picks + reason */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2, mb: 2, borderRadius: 2,
                  borderColor: discount > 0 ? alpha(theme.palette.warning.main, 0.5) : undefined,
                  bgcolor: discount > 0 ? alpha(theme.palette.warning.main, 0.04) : undefined,
                  transition: 'background-color .2s, border-color .2s',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                  <LocalOffer sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>Apply Discount</Typography>
                  {!isAdmin && (
                    <Chip label="Admin only" size="small" variant="outlined"
                      sx={{ height: 18, fontSize: 10 }} />
                  )}
                </Stack>

                {isAdmin ? (
                  <>
                    {/* Quick-pick chips */}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                      {[
                        { id: 'pct5',    label: '5%' },
                        { id: 'pct10',   label: '10%' },
                        { id: 'pct20',   label: '20%' },
                        { id: 'flat100', label: '₹100' },
                        { id: 'flat500', label: '₹500' },
                      ].map((p) => (
                        <Chip
                          key={p.id}
                          label={p.label}
                          size="small"
                          onClick={() => applyDiscountPick(p.id as any)}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            color: theme.palette.warning.dark,
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2) },
                          }}
                        />
                      ))}
                      {discount > 0 && (
                        <Chip
                          label="Clear"
                          size="small"
                          onClick={() => applyDiscountPick('clear')}
                          icon={<Clear sx={{ fontSize: 12 }} />}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 1.5,
                            color: 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                      )}
                    </Stack>

                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="Custom amount"
                          type="number"
                          size="small"
                          fullWidth
                          value={discount || ''}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(Number(e.target.value), selectedBill.outstanding));
                            setDiscount(val);
                            setCollectAmount(Math.max(0, selectedBill.outstanding - val));
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <TextField
                          label={discount > 0 ? 'Reason (required)' : 'Reason'}
                          size="small"
                          fullWidth
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          required={discount > 0}
                          error={discount > 0 && !discountReason.trim()}
                          helperText={discount > 0 && !discountReason.trim() ? 'Please provide a reason' : ''}
                          placeholder="e.g. Senior citizen, charity case, employee"
                        />
                      </Grid>
                    </Grid>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Only an administrator can apply a discount on this bill.
                  </Typography>
                )}

                {discount > 0 && (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.success.main, 0.06),
                      border: `1px dashed ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, display: 'block' }}>
                          Was
                        </Typography>
                        <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                          {currency(selectedBill.outstanding)}
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ color: theme.palette.warning.main, fontWeight: 800 }}>→</Typography>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, display: 'block' }}>
                          Now
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="success.main">
                          {currency(amountAfterDiscount)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, display: 'block' }}>
                          You save
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="warning.dark">
                          {currency(discount)} ({((discount / (selectedBill.outstanding || 1)) * 100).toFixed(0)}%)
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Paper>

              {/* Amount to Collect — large display + quick-amount chips */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2, mb: 2, borderRadius: 2,
                  borderColor: alpha(theme.palette.success.main, 0.35),
                  bgcolor: alpha(theme.palette.success.main, 0.04),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                  <Payments sx={{ fontSize: 16, color: theme.palette.success.dark }} />
                  <Typography variant="subtitle2" fontWeight={700}>Amount to collect</Typography>
                </Stack>

                <TextField
                  type="number"
                  size="medium"
                  fullWidth
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(Math.max(0, Number(e.target.value)))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="h5" fontWeight={800} color="text.disabled" sx={{ mr: 0.5 }}>₹</Typography>
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      letterSpacing: '-0.01em',
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      '& fieldset': { borderColor: alpha(theme.palette.success.main, 0.35) },
                      '&:hover fieldset': { borderColor: theme.palette.success.main },
                      '&.Mui-focused fieldset': { borderColor: `${theme.palette.success.main} !important`, borderWidth: 2 },
                    },
                  }}
                  inputProps={{ style: { padding: '12px 8px' } }}
                  sx={{ mb: 1.25 }}
                />

                {/* Quick-amount picks */}
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                  {(() => {
                    const due = amountAfterDiscount;
                    const half = Math.round(due / 2);
                    const picks = [
                      { id: 'full', label: `Pay full · ${currency(due)}`, value: due,  primary: true },
                      ...(due >= 200  ? [{ id: 'half', label: `Half · ${currency(half)}`, value: half }] : []),
                      ...(due >= 1000 ? [{ id: '500',  label: '₹500',  value: 500  }] : []),
                      ...(due >= 2000 ? [{ id: '1000', label: '₹1,000', value: 1000 }] : []),
                      ...(due >= 5000 ? [{ id: '2000', label: '₹2,000', value: 2000 }] : []),
                    ];
                    return picks.map((p: any) => (
                      <Chip
                        key={p.id}
                        label={p.label}
                        size="small"
                        onClick={() => setCollectAmount(p.value)}
                        sx={{
                          fontWeight: 700,
                          borderRadius: 1.5,
                          bgcolor: collectAmount === p.value
                            ? theme.palette.success.main
                            : (p.primary ? alpha(theme.palette.success.main, 0.14) : 'transparent'),
                          color: collectAmount === p.value
                            ? '#fff'
                            : (p.primary ? theme.palette.success.dark : 'text.secondary'),
                          border: `1px solid ${alpha(theme.palette.success.main, collectAmount === p.value ? 0 : 0.35)}`,
                          '&:hover': {
                            bgcolor: collectAmount === p.value ? theme.palette.success.dark : alpha(theme.palette.success.main, 0.18),
                            color: collectAmount === p.value ? '#fff' : theme.palette.success.dark,
                          },
                        }}
                      />
                    ));
                  })()}
                </Stack>

                {/* Inline status pill (replaces the Alert) */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: paymentStatus === 'FULLY_SETTLED' ? theme.palette.success.main : theme.palette.warning.main,
                  }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: paymentStatus === 'FULLY_SETTLED' ? 'success.dark' : 'warning.dark' }}>
                    {paymentStatus === 'FULLY_SETTLED'
                      ? 'This payment will fully settle the outstanding amount.'
                      : `Partial payment · ${currency(Math.max(0, amountAfterDiscount - collectAmount))} will remain due.`}
                  </Typography>
                </Stack>
              </Paper>

              {/* Payment Method — icon-led toggle group */}
              <Box sx={{ mb: paymentMethod !== 'CASH' ? 2 : 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <CreditCard sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" fontWeight={700}>Payment method</Typography>
                </Stack>
                {(() => {
                  const methodMeta: Record<string, { icon: React.ReactElement; color: string }> = {
                    CASH:          { icon: <Payments              sx={{ fontSize: 16 }} />, color: theme.palette.success.main },
                    UPI:           { icon: <AccountBalanceWallet  sx={{ fontSize: 16 }} />, color: theme.palette.primary.main },
                    CARD:          { icon: <CreditCard            sx={{ fontSize: 16 }} />, color: theme.palette.info.main    },
                    BANK_TRANSFER: { icon: <AccountBalance        sx={{ fontSize: 16 }} />, color: theme.palette.warning.main },
                  };
                  return (
                    <Grid container spacing={1}>
                      {PAYMENT_METHODS.map((m) => {
                        const meta = methodMeta[m] || { icon: <Payments sx={{ fontSize: 16 }} />, color: theme.palette.text.primary };
                        const active = paymentMethod === m;
                        return (
                          <Grid item xs={6} sm={3} key={m}>
                            <Box
                              onClick={() => setPaymentMethod(m)}
                              role="button"
                              sx={{
                                cursor: 'pointer',
                                p: 1.25,
                                borderRadius: 2,
                                textAlign: 'center',
                                border: `1.5px solid ${active ? meta.color : theme.palette.divider}`,
                                bgcolor: active ? alpha(meta.color, 0.08) : 'transparent',
                                color: active ? meta.color : 'text.secondary',
                                transition: 'all .15s ease',
                                userSelect: 'none',
                                '&:hover': {
                                  borderColor: meta.color,
                                  bgcolor: alpha(meta.color, 0.05),
                                  color: meta.color,
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.25 }}>
                                {meta.icon}
                              </Box>
                              <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, letterSpacing: 0.2 }}>
                                {m.replace('_', ' ')}
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  );
                })()}
              </Box>

              {/* Transaction Reference */}
              {paymentMethod !== 'CASH' && (
                <TextField
                  label="Transaction / Reference ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder={
                    paymentMethod === 'UPI' ? 'UPI Ref / UTR' :
                    paymentMethod === 'CARD' ? 'Auth code / last 4 digits' :
                    paymentMethod === 'BANK_TRANSFER' ? 'NEFT/IMPS reference' : ''
                  }
                />
              )}

              {(selectedBill.outstanding || 0) <= 0 && (
                <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                  Amount due is ₹0. Please verify the bill.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          <Button onClick={() => setBillDialog(false)} disabled={collecting} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleCollectPayment}
            disabled={collecting || collectAmount <= 0}
            startIcon={collecting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: `0 6px 20px ${alpha(theme.palette.success.main, 0.35)}`,
            }}
          >
            {collecting ? 'Recording…' : `Collect ${currency(collectAmount)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Patient Bill Detail Dialog ── */}
      <PatientBillDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        patientRow={detailPatient}
        allBills={allBills}
        completedPayments={completedPayments}
        onCollect={(bill: any) => { setDetailOpen(false); handleOpenBill(bill); }}
        isAdmin={isAdmin}
        navigate={navigate}
        onPrintStatement={printPatientStatement}
      />
    </Box>
  );
};

// ── Patient Bill Detail Dialog ──────────────────────────────────────────────
// Beautified: gradient hero header with progress · iconified summary tiles ·
// segmented "charges by category" bar · refined charges & receipts tables.

const PatientBillDetailDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  patientRow: any;
  allBills: any[];
  completedPayments: any[];
  onCollect: (bill: any) => void;
  isAdmin: boolean;
  navigate: any;
  onPrintStatement?: (patientRow: any) => void;
}> = ({ open, onClose, patientRow, allBills, completedPayments, onCollect, navigate, onPrintStatement }) => {
  const theme = useTheme();
  if (!patientRow) return null;

  const p = patientRow.patient;
  const patientId = p?.id;

  const bills = allBills.filter(b => b.patient?.id === patientId && !b.isDetail);
  const detailBills = allBills.filter(b => b.patient?.id === patientId && b.isDetail);
  const receipts = completedPayments.filter((r: any) => r.patient?.id === patientId);

  const totalBilled = patientRow.totalBilled || 0;
  const totalPaid = patientRow.totalPaid || 0;
  const totalDiscount = bills.reduce((s: number, b: any) => s + (b.discount || 0), 0);
  const balance = patientRow.balance || 0;
  const paidPct = totalBilled > 0 ? Math.min(100, (totalPaid / totalBilled) * 100) : 0;

  const categoryMeta: Record<string, { color: string; icon: React.ReactElement }> = {
    OPD:      { color: '#2563eb', icon: <LocalHospital sx={{ fontSize: 14 }} /> },
    IPD:      { color: '#ea580c', icon: <Hotel        sx={{ fontSize: 14 }} /> },
    LAB:      { color: '#7c3aed', icon: <Science      sx={{ fontSize: 14 }} /> },
    PHARMACY: { color: '#059669', icon: <Medication   sx={{ fontSize: 14 }} /> },
    PAYMENT:  { color: '#64748b', icon: <BillingIcon  sx={{ fontSize: 14 }} /> },
  };

  // Category segments for the "Charges by category" mini bar
  const segments = [
    { key: 'consultation', label: 'Consultation', value: patientRow.consultation || 0, color: '#2563eb', icon: <LocalHospital sx={{ fontSize: 13 }} /> },
    { key: 'lab',          label: 'Lab',          value: patientRow.lab || 0,          color: '#7c3aed', icon: <Science      sx={{ fontSize: 13 }} /> },
    { key: 'medicine',     label: 'Medicine',     value: patientRow.medicine || 0,     color: '#059669', icon: <Medication   sx={{ fontSize: 13 }} /> },
    { key: 'ward',         label: 'Ward (IPD)',   value: patientRow.ward || 0,         color: '#ea580c', icon: <Hotel        sx={{ fontSize: 13 }} /> },
    { key: 'scan',         label: 'Scans',        value: patientRow.scan || 0,         color: '#0ea5e9', icon: <Science      sx={{ fontSize: 13 }} /> },
    { key: 'other',        label: 'Other',        value: patientRow.other || 0,        color: '#64748b', icon: <BillingIcon  sx={{ fontSize: 13 }} /> },
  ].filter((s) => s.value > 0);
  const segmentTotal = segments.reduce((s, x) => s + x.value, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh', overflow: 'hidden' } }}
    >
      {/* Gradient hero header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: '#fff',
          px: { xs: 2.5, sm: 3 },
          pt: 2.5, pb: 2.25,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute', top: 8, right: 8,
            color: 'rgba(255,255,255,0.85)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.3)',
            fontWeight: 800, fontSize: 18,
          }}>
            {p?.firstName?.[0]}{p?.lastName?.[0]}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              {p?.firstName} {p?.lastName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.25 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p?.uhid}</Typography>
              {p?.mobile && <>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)' }} />
                <Typography variant="caption">{p.mobile}</Typography>
              </>}
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)' }} />
              <Typography variant="caption">{bills.length} charge{bills.length === 1 ? '' : 's'}</Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)' }} />
              <Typography variant="caption">{receipts.length} receipt{receipts.length === 1 ? '' : 's'}</Typography>
            </Stack>

            {/* % paid progress */}
            {totalBilled > 0 && (
              <Box sx={{ mt: 1.25, maxWidth: 360 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    {paidPct.toFixed(0)}% collected
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    {currency(totalPaid)} of {currency(totalBilled)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={paidPct}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.18)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: paidPct >= 100 ? theme.palette.success.light : '#fff',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Hero actions */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {onPrintStatement && (
              <Tooltip title="Print statement">
                <IconButton
                  size="small"
                  onClick={() => onPrintStatement(patientRow)}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <Print sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <Button
              size="small"
              variant="contained"
              endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
              onClick={() => { onClose(); navigate(`/app/patients/${patientId}`); }}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.18)',
                color: '#fff',
                borderRadius: 1.75,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: 'none' },
              }}
            >
              Open profile
            </Button>
          </Stack>
        </Stack>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
        {/* Summary tiles */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {[
            { label: 'Total billed',    value: totalBilled,   icon: <BillingIcon sx={{ fontSize: 16 }} />, color: theme.palette.text.primary },
            { label: 'Discount given',  value: totalDiscount, icon: <LocalOffer  sx={{ fontSize: 16 }} />, color: theme.palette.warning.main },
            { label: 'Total collected', value: totalPaid,     icon: <CheckCircle sx={{ fontSize: 16 }} />, color: theme.palette.success.main },
            { label: 'Balance due',     value: balance,       icon: <Payments    sx={{ fontSize: 16 }} />, color: balance > 0 ? theme.palette.error.main : theme.palette.success.main },
          ].map((c) => (
            <Grid item xs={6} sm={3} key={c.label}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  borderColor: alpha(c.color as string, 0.22),
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    insetInline: 0, top: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${c.color}, ${alpha(c.color as string, 0)})`,
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.color, bgcolor: alpha(c.color as string, 0.12),
                  }}>
                    {c.icon}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {c.label}
                  </Typography>
                </Stack>
                <Typography variant="h6" fontWeight={800} sx={{ color: c.color, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                  {currency(c.value)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charges by Category — segmented bar + legend */}
        {segments.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
                Charges by category
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {segments.length} categor{segments.length === 1 ? 'y' : 'ies'}
              </Typography>
            </Stack>

            {/* Segmented horizontal bar */}
            <Box sx={{
              display: 'flex',
              height: 10,
              borderRadius: 999,
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.text.primary, 0.05),
              mb: 1.25,
            }}>
              {segments.map((s) => {
                const w = segmentTotal > 0 ? (s.value / segmentTotal) * 100 : 0;
                return (
                  <Tooltip key={s.key} title={`${s.label} · ${currency(s.value)} (${w.toFixed(0)}%)`}>
                    <Box sx={{ width: `${w}%`, bgcolor: s.color, transition: 'width .3s ease' }} />
                  </Tooltip>
                );
              })}
            </Box>

            {/* Legend chips */}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {segments.map((s) => {
                const pct = segmentTotal > 0 ? (s.value / segmentTotal) * 100 : 0;
                return (
                  <Box
                    key={s.key}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1, py: 0.5,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(s.color, 0.22)}`,
                      bgcolor: alpha(s.color, 0.06),
                    }}
                  >
                    <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>·</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
                      {currency(s.value)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                      {pct.toFixed(0)}%
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* All Charges */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
            All charges
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {bills.length} bill{bills.length === 1 ? '' : 's'}
          </Typography>
        </Stack>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2, mb: receipts.length > 0 ? 2.5 : 0, overflow: 'hidden' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }} align="right">Gross</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }} align="right">Discount</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }} align="right">Paid</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }} align="right">Due</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="caption" color="text.secondary" sx={{ py: 3, display: 'block' }}>
                      No charges
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : bills.map((b: any) => {
                const meta = categoryMeta[b.type] || categoryMeta.PAYMENT;
                const desc =
                  b.type === 'OPD' && b.doctor ? `Dr. ${b.doctor.firstName} ${b.doctor.lastName}` :
                  b.type === 'IPD' ? `${b.ward?.name || 'Ward'} · ${b.days || '—'} days` :
                  b.type === 'LAB' ? b.testName :
                  b.type === 'PHARMACY' ? `${b.medCount} med(s)` :
                  b.description || '—';
                return (
                  <React.Fragment key={`${b.type}-${b.id}`}>
                    <TableRow hover>
                      <TableCell><Typography variant="caption">{fmtDate(b.date)}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          icon={meta.icon}
                          label={typeConfig[b.type]?.label || b.type}
                          size="small"
                          sx={{
                            bgcolor: alpha(meta.color, 0.1),
                            color: meta.color,
                            fontWeight: 700, fontSize: 10, height: 20,
                            '& .MuiChip-icon': { color: meta.color, ml: 0.5 },
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
                          {currency((b.total || 0) + (b.discount || 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {(b.discount || 0) > 0
                          ? <Typography variant="body2" color="warning.main" fontSize={12} fontWeight={600}>-{currency(b.discount)}</Typography>
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        {b.paid > 0
                          ? <Typography variant="body2" color="success.main" fontSize={12} fontWeight={600}>{currency(b.paid)}</Typography>
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontSize={12}
                          color={b.outstanding > 0 ? 'error.main' : 'success.main'}
                        >
                          {b.outstanding > 0 ? currency(b.outstanding) : '✓'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={b.status}
                          size="small"
                          color={statusChipColor(b.status)}
                          variant={b.status === 'PAID' ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {b.outstanding > 0 ? (
                          <Button
                            size="small" variant="contained" color="success"
                            onClick={() => onCollect(b)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 1.5,
                              fontSize: 11, fontWeight: 700, px: 1.25, py: 0.25,
                              minWidth: 0,
                              boxShadow: 'none',
                              '&:hover': { boxShadow: `0 4px 10px ${alpha(theme.palette.success.main, 0.35)}` },
                            }}
                          >
                            Collect
                          </Button>
                        ) : (
                          <Tooltip title="Settled"><CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} /></Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Linked detail rows (lab/pharmacy nested under OPD/IPD) */}
                    {detailBills
                      .filter((d: any) => d.parentEncounterId === b.id || d.parentAdmissionId === b.id)
                      .map((d: any) => (
                        <TableRow key={`detail-${d.type}-${d.id}`} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.4) }}>
                          <TableCell />
                          <TableCell>
                            <Chip
                              size="small"
                              label={typeConfig[d.type]?.label || d.type}
                              variant="outlined"
                              sx={{ fontSize: 9, height: 18, color: 'text.secondary' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontStyle: 'italic' }}>
                              ↳ {d.type === 'LAB' ? d.testName : `${d.medCount} med(s)`}
                            </Typography>
                          </TableCell>
                          <TableCell align="right"><Typography variant="caption" color="text.secondary">{currency(d.total)}</Typography></TableCell>
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

        {/* Payment Receipts */}
        {receipts.length > 0 && (
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
                Payment receipts
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
              </Typography>
            </Stack>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }} align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((r: any) => (
                    <TableRow key={r.id} hover>
                      <TableCell><Typography variant="caption">{fmtDate(r.paidAt || r.createdAt)}</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace" color="text.secondary">{r.receiptNumber || '—'}</Typography></TableCell>
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
                          {currency(r.amount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.75, bgcolor: alpha(theme.palette.background.default, 0.5), gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Close</Button>
        <Box sx={{ flex: 1 }} />
        {onPrintStatement && (
          <Button
            onClick={() => onPrintStatement(patientRow)}
            startIcon={<Print />}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Print statement
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => { onClose(); navigate(`/app/patients/${patientId}`); }}
          endIcon={<OpenInNew />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2.25 }}
        >
          Open patient profile
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillingDashboard;
