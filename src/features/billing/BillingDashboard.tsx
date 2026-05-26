import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, IconButton, Tooltip, Divider, TextField,
  CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Tabs, Tab,
  alpha, Skeleton, useTheme, Stack, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Collapse,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import {
  Receipt as BillingIcon, CurrencyRupee, CheckCircle, Visibility,
  TrendingUp, AccountBalance, Person, LocalHospital, Science,
  Medication, Hotel, Search, FilterList, Clear, PendingActions,
  ExpandMore, ExpandLess, Link as LinkIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import paymentService from '../../services/paymentService';
import api from '../../services/api';

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
    { label: 'Total Revenue (Month)', value: currency(stats?.monthRevenue), color: '#059669', icon: <AccountBalance /> },
    { label: "Today's Collections", value: currency(stats?.todayCollections), color: '#2563eb', icon: <CurrencyRupee /> },
    { label: 'Total Outstanding', value: currency(stats?.totalOutstanding), color: '#ef4444', icon: <TrendingUp /> },
    { label: 'Pending Bills', value: stats?.pendingCount ?? 0, color: '#7c3aed', icon: <PendingActions /> },
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

  return (
    <Box sx={{ width: '100%' }}>
      {/* ── Gradient Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#1a2e1a' : '#059669'} 0%, ${theme.palette.mode === 'dark' ? '#1e1b4b' : '#0891b2'} 100%)`,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BillingIcon sx={{ fontSize: 40, opacity: 0.9 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Billing & Payments</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                Consolidated billing overview across all services
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Stat Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            {loading ? (
              <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2.5 }} />
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`,
                  display: 'flex', alignItems: 'center', gap: 2,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: `0 4px 20px ${alpha(s.color, 0.15)}` },
                }}
              >
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(s.color, 0.1), color: s.color,
                }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        ))}
      </Grid>

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
          <Tab label={`Patient-wise (${patientWise.length})`} />
          <Tab label={`All Bills (${filteredBills.length})`} />
          <Tab label={`Payment Receipts (${completedPayments.length})`} />
        </Tabs>

        <Box sx={{ px: 2, pb: 2 }}>
          {/* Tab 0: Patient-wise Summary */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={patientWise}
                columns={patientWiseColumns}
                getRowId={(row) => row.patient?.id || Math.random().toString()}
                loading={loading}
                autoHeight
                rowHeight={60}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={dataGridSx}
                slots={{
                  noRowsOverlay: () => (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', py: 6 }}>
                      <Typography color="text.secondary">No billing data</Typography>
                    </Stack>
                  ),
                }}
              />
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

          {/* Tab 2: Payment Receipts */}
          <TabPanel value={tab} index={2}>
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

      {/* ── Collect Payment Dialog ── */}
      <Dialog
        open={billDialog}
        onClose={() => !collecting && setBillDialog(false)}
        maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CurrencyRupee color="success" /> Collect Payment
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedBill && (
            <>
              {/* Patient Info */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedBill.patient?.firstName} {selectedBill.patient?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedBill.patient?.uhid} &nbsp;|&nbsp;
                  {typeConfig[selectedBill.type]?.label || selectedBill.type}
                  {selectedBill.doctor && ` · Dr. ${selectedBill.doctor.firstName} ${selectedBill.doctor.lastName}`}
                </Typography>
              </Paper>

              {/* Bill Breakdown */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bill Breakdown</Typography>

                {selectedBill.type === 'OPD' && (
                  <>
                    {[
                      { label: 'Consultation Fee', value: selectedBill.consultation },
                      { label: 'Lab / Tests', value: selectedBill.lab },
                      { label: 'Medicines', value: selectedBill.medicine },
                      { label: 'Scans', value: selectedBill.scan },
                    ].filter(r => r.value > 0).map(row => (
                      <Grid container key={row.label} sx={{ mb: 0.5 }}>
                        <Grid item xs={8}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2">{currency(row.value)}</Typography>
                        </Grid>
                      </Grid>
                    ))}
                  </>
                )}

                {selectedBill.type === 'IPD' && (
                  <>
                    <Grid container sx={{ mb: 0.5 }}>
                      <Grid item xs={8}>
                        <Typography variant="body2" color="text.secondary">
                          Ward ({selectedBill.ward?.name}) x {selectedBill.days} days
                        </Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">{currency(selectedBill.wardCharges)}</Typography>
                      </Grid>
                    </Grid>
                    {selectedBill.advancePaid > 0 && (
                      <Grid container sx={{ mb: 0.5 }}>
                        <Grid item xs={8}>
                          <Typography variant="body2" color="text.secondary">Advance Paid</Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="success.main">-{currency(selectedBill.advancePaid)}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </>
                )}

                {selectedBill.type === 'LAB' && (
                  <Grid container sx={{ mb: 0.5 }}>
                    <Grid item xs={8}>
                      <Typography variant="body2" color="text.secondary">
                        {selectedBill.testName} ({selectedBill.testType})
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{currency(selectedBill.total)}</Typography>
                    </Grid>
                  </Grid>
                )}

                {selectedBill.type === 'PHARMACY' && (
                  <Grid container sx={{ mb: 0.5 }}>
                    <Grid item xs={8}>
                      <Typography variant="body2" color="text.secondary">
                        {selectedBill.medCount} medication(s)
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{currency(selectedBill.total)}</Typography>
                    </Grid>
                  </Grid>
                )}

                <Divider sx={{ my: 1 }} />
                <Grid container>
                  <Grid item xs={6}><Typography fontWeight={700}>Total</Typography></Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={700} color="primary">{currency(selectedBill.total)}</Typography>
                  </Grid>
                </Grid>
                {selectedBill.paid > 0 && (
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Already Paid</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="success.main">{currency(selectedBill.paid)}</Typography>
                    </Grid>
                  </Grid>
                )}
                <Grid container>
                  <Grid item xs={6}>
                    <Typography fontWeight={700} color="error.main">Due Now</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={700} color="error.main">{currency(selectedBill.outstanding)}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Discount Section */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Discount</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Discount Amount"
                      type="number"
                      size="small"
                      fullWidth
                      value={discount || ''}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(Number(e.target.value), selectedBill.outstanding));
                        setDiscount(val);
                        setCollectAmount(Math.max(0, selectedBill.outstanding - val));
                      }}
                      disabled={!isAdmin}
                      helperText={!isAdmin ? 'Only admin can apply discounts' : ''}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    {discount > 0 && (
                      <TextField
                        label="Discount Reason"
                        size="small"
                        fullWidth
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                      />
                    )}
                  </Grid>
                </Grid>
                {discount > 0 && (
                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: alpha('#059669', 0.06) }}>
                    <Grid container>
                      <Grid item xs={6}>
                        <Typography variant="body2" fontWeight={600}>Amount After Discount</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {currency(amountAfterDiscount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>

              {/* IPD Advance */}
              {selectedBill.type === 'IPD' && selectedBill.advancePaid > 0 && (
                <TextField
                  label="Advance Paid"
                  size="small"
                  fullWidth
                  value={currency(selectedBill.advancePaid)}
                  InputProps={{ readOnly: true }}
                  sx={{ mb: 2 }}
                />
              )}

              {/* Amount to Collect */}
              <TextField
                label="Amount to Collect"
                type="number"
                size="small"
                fullWidth
                value={collectAmount || ''}
                onChange={(e) => setCollectAmount(Math.max(0, Number(e.target.value)))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />

              {/* Payment Status Indicator */}
              <Alert
                severity={paymentStatus === 'FULLY_SETTLED' ? 'success' : 'warning'}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                {paymentStatus === 'FULLY_SETTLED'
                  ? 'This will fully settle the outstanding amount.'
                  : 'This is a partial payment. Balance will remain outstanding.'}
              </Alert>

              {/* Payment Method */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Payment Method</Typography>
              <ToggleButtonGroup
                value={paymentMethod} exclusive
                onChange={(_, v) => v && setPaymentMethod(v)}
                size="small" fullWidth sx={{ mb: 2 }}
              >
                {PAYMENT_METHODS.map(m => (
                  <ToggleButton key={m} value={m} sx={{ fontSize: 12, fontWeight: 600 }}>
                    {m.replace('_', ' ')}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Transaction Reference */}
              {paymentMethod !== 'CASH' && (
                <TextField
                  label="Transaction / Reference ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  fullWidth size="small"
                />
              )}

              {(selectedBill.outstanding || 0) <= 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>Amount due is ₹0. Please verify the bill.</Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBillDialog(false)} disabled={collecting} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained" color="success"
            onClick={handleCollectPayment}
            disabled={collecting || collectAmount <= 0}
            startIcon={collecting ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {collecting ? 'Recording...' : `Collect ${currency(collectAmount)}`}
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
      />
    </Box>
  );
};

// ── Patient Bill Detail Dialog ──────────────────────────────────────────────

const PatientBillDetailDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  patientRow: any;
  allBills: any[];
  completedPayments: any[];
  onCollect: (bill: any) => void;
  isAdmin: boolean;
  navigate: any;
}> = ({ open, onClose, patientRow, allBills, completedPayments, onCollect, isAdmin, navigate }) => {
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

  const categoryColors: Record<string, string> = {
    OPD: '#2563eb', IPD: '#ea580c', LAB: '#7c3aed', PHARMACY: '#059669', PAYMENT: '#64748b',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700, fontSize: 14,
          }}>
            {p?.firstName?.[0]}{p?.lastName?.[0]}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{p?.firstName} {p?.lastName}</Typography>
            <Typography variant="caption" color="text.secondary">{p?.uhid}</Typography>
          </Box>
        </Box>
        <Button size="small" variant="text" onClick={() => { onClose(); navigate(`/app/patients/${patientId}`); }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
          Open Profile →
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3 }}>
        {/* Summary Cards */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {[
            { label: 'Total Billed', value: totalBilled, color: '#1a3c6e' },
            { label: 'Discount Given', value: totalDiscount, color: '#F39C12' },
            { label: 'Total Collected', value: totalPaid, color: '#27ae60' },
            { label: 'Balance Due', value: balance, color: balance > 0 ? '#e74c3c' : '#27ae60' },
          ].map(c => (
            <Grid item xs={6} sm={3} key={c.label}>
              <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: `${c.color}0A`, border: `1px solid ${c.color}1A` }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: c.color }}>{currency(c.value)}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Category Breakdown */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Charges by Category</Typography>
        <Grid container spacing={1} sx={{ mb: 2.5 }}>
          {[
            { label: 'Consultation', value: patientRow.consultation },
            { label: 'Lab', value: patientRow.lab },
            { label: 'Medicine', value: patientRow.medicine },
            { label: 'Ward (IPD)', value: patientRow.ward },
            { label: 'Scans', value: patientRow.scan },
            { label: 'Other', value: patientRow.other },
          ].filter(c => c.value > 0).map(c => (
            <Grid item xs={4} sm={2} key={c.label}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: '#f8f9fa', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={700}>{currency(c.value)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{c.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* Individual Bills */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>All Charges</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Discount</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Collected</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Due</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No charges</Typography></TableCell></TableRow>
              ) : bills.map((b: any) => (
                <React.Fragment key={`${b.type}-${b.id}`}>
                  <TableRow hover>
                    <TableCell><Typography variant="caption">{fmtDate(b.date)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={typeConfig[b.type]?.label || b.type} size="small"
                        sx={{ bgcolor: `${categoryColors[b.type] || '#64748b'}15`, color: categoryColors[b.type] || '#64748b', fontWeight: 600, fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontSize={12}>
                        {b.type === 'OPD' && b.doctor ? `Dr. ${b.doctor.firstName} ${b.doctor.lastName}` :
                         b.type === 'IPD' ? `${b.ward?.name || 'Ward'} · ${b.days || '—'} days` :
                         b.type === 'LAB' ? b.testName : b.type === 'PHARMACY' ? `${b.medCount} med(s)` : b.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={600} fontSize={12}>{currency(b.total + (b.discount || 0))}</Typography></TableCell>
                    <TableCell align="right">
                      {(b.discount || 0) > 0
                        ? <Typography variant="body2" color="warning.main" fontSize={12}>-{currency(b.discount)}</Typography>
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2" color="success.main" fontWeight={500} fontSize={12}>{b.paid > 0 ? currency(b.paid) : '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} fontSize={12} color={b.outstanding > 0 ? 'error.main' : 'success.main'}>
                        {b.outstanding > 0 ? currency(b.outstanding) : '₹0'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={b.status} size="small" color={statusChipColor(b.status)} variant={b.status === 'PAID' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: 10, height: 20 }} />
                    </TableCell>
                    <TableCell>
                      {b.outstanding > 0 && (
                        <Button size="small" variant="contained" color="success" onClick={() => onCollect(b)}
                          sx={{ fontSize: '0.65rem', textTransform: 'none', borderRadius: 1.5, px: 1, py: 0.25, minWidth: 0 }}>
                          Collect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {/* Show linked detail items for this bill */}
                  {detailBills.filter((d: any) =>
                    (b.type === 'OPD' && d.type === 'LAB' && d.isDetail) ||
                    (b.type === 'OPD' && d.type === 'PHARMACY' && d.isDetail)
                  ).map((d: any) => (
                    <TableRow key={`detail-${d.type}-${d.id}`} sx={{ bgcolor: '#fafbfc' }}>
                      <TableCell></TableCell>
                      <TableCell>
                        <Chip label={typeConfig[d.type]?.label || d.type} size="small" variant="outlined"
                          sx={{ fontSize: 9, height: 18, color: 'text.secondary' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                          ↳ {d.type === 'LAB' ? d.testName : `${d.medCount} med(s)`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right"><Typography variant="caption" color="text.secondary">{currency(d.total)}</Typography></TableCell>
                      <TableCell colSpan={5}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>Included in {b.type} bill</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Payment Receipts */}
        {receipts.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Payment Receipts</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Receipt No.</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((r: any) => (
                    <TableRow key={r.id} hover>
                      <TableCell><Typography variant="caption">{fmtDate(r.paidAt || r.createdAt)}</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace">{r.receiptNumber || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontSize={12}>{r.description || '—'}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} color="success.main" fontSize={12}>{currency(r.amount)}</Typography></TableCell>
                      <TableCell><Chip label={r.paymentMethod || '—'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillingDashboard;
