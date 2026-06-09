import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, CircularProgress, Alert,
  Grid, Card, CardContent, alpha, TextField, MenuItem, InputAdornment, Divider,
  FormControl, InputLabel, Select, Tab, Tabs, LinearProgress, useTheme,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Inventory, Warning,
  LocalPharmacy, ShoppingCart, TrendingDown, Build,
  MedicalServices, Science, BarChart, Timeline, DeleteForever,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import pharmacyService from '../../services/pharmacyService';
import { PageHeader, StatCard } from '../../components/ui';

const CATEGORIES = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT',
  'DROPS', 'INHALER', 'POWDER', 'SURGICAL', 'CONSUMABLE', 'OTHER',
];

const CATEGORY_LABEL: Record<string, string> = {
  TABLET: 'Tablet', CAPSULE: 'Capsule', SYRUP: 'Syrup', INJECTION: 'Injection',
  OINTMENT: 'Ointment', DROPS: 'Drops', INHALER: 'Inhaler', POWDER: 'Powder',
  SURGICAL: 'Surgical', CONSUMABLE: 'Consumable', OTHER: 'Other',
};

const CATEGORY_COLOR: Record<string, string> = {
  TABLET: '#3b82f6', CAPSULE: '#8b5cf6', SYRUP: '#ec4899', INJECTION: '#ef4444',
  OINTMENT: '#f59e0b', DROPS: '#06b6d4', INHALER: '#10b981', POWDER: '#6366f1',
  SURGICAL: '#64748b', CONSUMABLE: '#84cc16', OTHER: '#9ca3af',
};

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  IN: 'Stock In', OUT: 'Dispensed', ADJUSTMENT: 'Adjustment',
  RETURN: 'Return', EXPIRED: 'Expired',
};

const MOVEMENT_TYPE_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  IN: 'success', OUT: 'error', ADJUSTMENT: 'warning',
  RETURN: 'info', EXPIRED: 'default',
};

const emptyMedicine = {
  name: '', genericName: '', brand: '', manufacturer: '',
  category: 'TABLET', formulation: '', strength: '', unit: 'pcs',
  hsnCode: '', gstPercent: 0, mrp: 0, sellingPrice: 0,
  reorderLevel: 10, schedule: '', storageCondition: '',
};

const emptyStockReceive = {
  batchNumber: '', expiryDate: '', quantity: 0,
  costPrice: 0, sellingPrice: 0, mrp: 0,
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}>{value === index && children}</Box>
);

const MedicineList: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);

  // ── Catalog state ──────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Stock overview state ───────────────────────────────────────────────
  const [overview, setOverview] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [expiryDays, setExpiryDays] = useState(90);
  const [movements, setMovements] = useState<any[]>([]);
  const [movementType, setMovementType] = useState('');
  const [movementTotal, setMovementTotal] = useState(0);

  // ── Dialogs ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMedicine);
  const [saving, setSaving] = useState(false);

  const [showReceive, setShowReceive] = useState<string | null>(null);
  const [receiveMedName, setReceiveMedName] = useState('');
  const [receiveForm, setReceiveForm] = useState(emptyStockReceive);

  const [showAdjust, setShowAdjust] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ adjustment: 0, reason: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await pharmacyService.listMedicines({
        search: search || undefined,
        category: category || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      setMedicines(res.data?.medicines || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load medicines');
    }
    setLoading(false);
  }, [search, category, page, rowsPerPage]);

  const loadOverview = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getStockOverview();
      setOverview(res.data);
    } catch {
      toast.error('Failed to load stock overview');
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getLowStock();
      setLowStock(res.data || []);
    } catch {
      toast.error('Failed to load low stock');
    }
  }, []);

  const loadExpiring = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getExpiringBatches(expiryDays);
      setExpiring(res.data || []);
    } catch {
      toast.error('Failed to load expiring batches');
    }
  }, [expiryDays]);

  const loadMovements = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getStockMovements({
        type: movementType || undefined, limit: 100,
      });
      setMovements(res.data?.movements || []);
      setMovementTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load movements');
    }
  }, [movementType]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { if (tab === 1) loadOverview(); }, [tab, loadOverview]);
  useEffect(() => { if (tab === 2) loadLowStock(); }, [tab, loadLowStock]);
  useEffect(() => { if (tab === 3) loadExpiring(); }, [tab, loadExpiring]);
  useEffect(() => { if (tab === 4) loadMovements(); }, [tab, loadMovements]);

  const reload = () => {
    loadCatalog();
    if (tab === 1) loadOverview();
    if (tab === 2) loadLowStock();
    if (tab === 3) loadExpiring();
    if (tab === 4) loadMovements();
  };

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await pharmacyService.updateMedicine(editId, form);
        toast.success('Medicine updated');
      } else {
        await pharmacyService.createMedicine(form);
        toast.success('Medicine created');
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyMedicine);
      loadCatalog();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleEdit = (med: any) => {
    setEditId(med.id);
    setForm({
      name: med.name || '', genericName: med.genericName || '',
      brand: med.brand || '', manufacturer: med.manufacturer || '',
      category: med.category || 'TABLET', formulation: med.formulation || '',
      strength: med.strength || '', unit: med.unit || 'pcs',
      hsnCode: med.hsnCode || '', gstPercent: Number(med.gstPercent) || 0,
      mrp: Number(med.mrp) || 0, sellingPrice: Number(med.sellingPrice) || 0,
      reorderLevel: med.reorderLevel || 10, schedule: med.schedule || '',
      storageCondition: med.storageCondition || '',
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await pharmacyService.deleteMedicine(deleteConfirm.id);
      toast.success(`${deleteConfirm.name} deactivated`);
      setDeleteConfirm(null);
      loadCatalog();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const handleReceiveStock = async () => {
    if (!showReceive) return;
    setSaving(true);
    try {
      await pharmacyService.receiveStock({
        medicineId: showReceive,
        batchNumber: receiveForm.batchNumber,
        expiryDate: receiveForm.expiryDate,
        quantity: receiveForm.quantity,
        costPrice: receiveForm.costPrice,
        sellingPrice: receiveForm.sellingPrice,
        mrp: receiveForm.mrp || undefined,
      });
      toast.success('Stock received successfully');
      setShowReceive(null);
      setReceiveForm(emptyStockReceive);
      loadCatalog();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Stock receive failed');
    }
    setSaving(false);
  };

  const handleAdjust = async () => {
    if (!showAdjust) return;
    setSaving(true);
    try {
      await pharmacyService.adjustStock({
        medicineId: showAdjust.medicineId,
        batchId: showAdjust.id,
        adjustment: adjustForm.adjustment,
        reason: adjustForm.reason,
      });
      toast.success('Stock adjusted');
      setShowAdjust(null);
      setAdjustForm({ adjustment: 0, reason: '' });
      if (tab === 1) loadOverview();
      if (tab === 2) loadLowStock();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Adjustment failed');
    }
    setSaving(false);
  };

  const lowStockCount = medicines.filter((m) => m.isLowStock).length;
  const outOfStock = medicines.filter((m) => m.totalStock === 0).length;
  const summary = overview?.summary || {};

  return (
    <Box>
      <PageHeader
        title="Pharmacy Manager"
        subtitle="Medicine catalog, inventory tracking, stock alerts & movements"
        icon={<MedicalServices />}
        actions={
          <>
            <IconButton onClick={reload}><Refresh /></IconButton>
            <Button variant="contained" startIcon={<Add />}
              onClick={() => { setEditId(null); setForm(emptyMedicine); setShowForm(true); }}>
              Add medicine
            </Button>
          </>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Medicines" value={String(total)}
            icon={<LocalPharmacy />} tone="primary" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="In stock" value={String(total - outOfStock)}
            icon={<Inventory />} tone="success" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Low stock" value={String(lowStockCount)}
            icon={<Warning />} tone="warning" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Out of stock" value={String(outOfStock)}
            icon={<TrendingDown />} tone="error" />
        </Grid>
        <Grid item xs={12} sm={2.4}>
          <StatCard
            label="Stock value"
            value={summary.totalStockValue ? `₹${Number(summary.totalStockValue).toLocaleString('en-IN')}` : '—'}
            icon={<BarChart />}
            tone="info"
          />
        </Grid>
      </Grid>

      {/* ── Tab Navigation ───────────────────────────────────────────── */}
      <Paper sx={{
        borderRadius: 3, overflow: 'hidden',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: isDark ? 'background.paper' : alpha('#10b981', 0.03) }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.9rem', minHeight: 52 },
            '& .Mui-selected': { color: '#10b981' },
            '& .MuiTabs-indicator': { bgcolor: '#10b981', height: 3, borderRadius: '3px 3px 0 0' },
          }}>
            <Tab icon={<LocalPharmacy sx={{ fontSize: 18 }} />} iconPosition="start" label="Catalog" />
            <Tab icon={<Inventory sx={{ fontSize: 18 }} />} iconPosition="start" label="Stock Overview" />
            <Tab icon={<Warning sx={{ fontSize: 18 }} />} iconPosition="start" label={`Low Stock (${lowStockCount})`} />
            <Tab icon={<Science sx={{ fontSize: 18 }} />} iconPosition="start" label="Expiring" />
            <Tab icon={<Timeline sx={{ fontSize: 18 }} />} iconPosition="start" label="Movement Log" />
          </Tabs>
        </Box>

        {/* ── Tab 0: Catalog ──────────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small" placeholder="Search medicines…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                sx={{ minWidth: 260 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Category</InputLabel>
                <Select value={category} label="Category" onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
                  <MenuItem value="">All</MenuItem>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{CATEGORY_LABEL[c]}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {total} medicines
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ py: 3 }}>
                <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: alpha('#10b981', 0.1),
                  '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
              </Box>
            ) : medicines.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <LocalPharmacy sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>No Medicines Found</Typography>
                <Button variant="contained" startIcon={<Add />}
                  onClick={() => { setEditId(null); setForm(emptyMedicine); setShowForm(true); }}
                  sx={{ borderRadius: 2.5, mt: 1 }}>
                  Add First Medicine
                </Button>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? alpha('#10b981', 0.06) : alpha('#10b981', 0.03) }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Medicine</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Strength</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }} align="right">MRP (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }} align="right">Price (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }} align="center">Stock</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }} align="center">Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {medicines.map((med) => (
                        <TableRow key={med.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{med.name}</Typography>
                            {med.genericName && (
                              <Typography variant="caption" color="text.secondary">{med.genericName}</Typography>
                            )}
                            {med.brand && (
                              <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: '0.65rem' }}>
                                {med.brand} {med.manufacturer ? `• ${med.manufacturer}` : ''}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={CATEGORY_LABEL[med.category] || med.category} size="small"
                              sx={{
                                fontWeight: 600, fontSize: '0.7rem', borderRadius: 1.5,
                                bgcolor: alpha(CATEGORY_COLOR[med.category] || '#9ca3af', 0.1),
                                color: CATEGORY_COLOR[med.category] || '#9ca3af',
                                border: `1px solid ${alpha(CATEGORY_COLOR[med.category] || '#9ca3af', 0.3)}`,
                              }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{med.strength || '—'}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{Number(med.mrp).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>{Number(med.sellingPrice).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={700}
                              color={med.totalStock === 0 ? 'error.main' : med.isLowStock ? 'warning.main' : 'success.main'}>
                              {med.totalStock} {med.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {med.totalStock === 0 ? (
                              <Chip label="Out" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }} />
                            ) : med.isLowStock ? (
                              <Chip label="Low" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }} />
                            ) : (
                              <Chip label="OK" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                              <Tooltip title="Receive Stock">
                                <IconButton size="small" onClick={() => {
                                  setShowReceive(med.id);
                                  setReceiveMedName(med.name);
                                  setReceiveForm({ ...emptyStockReceive, sellingPrice: Number(med.sellingPrice), mrp: Number(med.mrp) });
                                }} sx={{ color: '#10b981' }}>
                                  <ShoppingCart sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleEdit(med)} sx={{ color: '#3b82f6' }}>
                                  <Edit sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deactivate">
                                <IconButton size="small" onClick={() => setDeleteConfirm({ id: med.id, name: med.name })}
                                  sx={{ color: '#ef4444' }}>
                                  <Delete sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div" count={total} page={page} rowsPerPage={rowsPerPage}
                  onPageChange={(_, p) => setPage(p)}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab 1: Stock Overview ───────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          {!overview ? (
            <Box sx={{ p: 4 }}>
              <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: alpha('#10b981', 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {/* Overview analytics cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Stock Units', value: summary.totalStock || 0, color: '#10b981', icon: <Inventory /> },
                  { label: 'Stock Value', value: `₹${(summary.totalStockValue || 0).toLocaleString('en-IN')}`, color: '#8b5cf6', icon: <BarChart /> },
                  { label: 'Low Stock Items', value: summary.lowStockCount || 0, color: '#f59e0b', icon: <Warning /> },
                  { label: 'Out of Stock', value: summary.outOfStockCount || 0, color: '#ef4444', icon: <TrendingDown /> },
                ].map((s) => (
                  <Grid item xs={6} sm={3} key={s.label}>
                    <Card sx={{
                      borderRadius: 2.5, border: `1px solid ${alpha(s.color, 0.2)}`,
                      background: `linear-gradient(135deg, ${alpha(s.color, 0.04)} 0%, ${alpha(s.color, 0.1)} 100%)`,
                    }}>
                      <CardContent sx={{ py: '12px !important', px: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ color: s.color, opacity: 0.7 }}>{s.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={800} sx={{ color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.label}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? alpha('#10b981', 0.06) : alpha('#10b981', 0.03) }}>
                      {['Medicine', 'Category', 'Price (₹)', 'Stock', 'Value (₹)', 'Nearest Expiry', 'Status'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                          align={['Price (₹)', 'Value (₹)'].includes(h) ? 'right' : ['Stock', 'Status'].includes(h) ? 'center' : 'left'}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(overview?.items || []).map((item: any) => (
                      <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          {item.genericName && <Typography variant="caption" color="text.secondary">{item.genericName}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={CATEGORY_LABEL[item.category] || item.category} size="small"
                            sx={{
                              fontWeight: 600, fontSize: '0.65rem', borderRadius: 1.5,
                              bgcolor: alpha(CATEGORY_COLOR[item.category] || '#9ca3af', 0.1),
                              color: CATEGORY_COLOR[item.category] || '#9ca3af',
                            }} />
                        </TableCell>
                        <TableCell align="right">{Number(item.sellingPrice).toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={700}
                            color={item.isOutOfStock ? 'error.main' : item.isLowStock ? 'warning.main' : 'success.main'}>
                            {item.totalStock} {item.unit}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.stockValue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {item.nearestExpiry ? (
                            <Typography variant="caption"
                              color={new Date(item.nearestExpiry) < new Date(Date.now() + 90 * 86400000) ? 'error.main' : 'text.secondary'}>
                              {new Date(item.nearestExpiry).toLocaleDateString('en-IN')}
                            </Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          {item.isOutOfStock
                            ? <Chip label="Out" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }} />
                            : item.isLowStock
                            ? <Chip label="Low" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }} />
                            : <Chip label="OK" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>

        {/* ── Tab 2: Low Stock ────────────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            {lowStock.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Inventory sx={{ fontSize: 56, color: '#10b981', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary">All Stocked Up!</Typography>
                <Typography variant="body2" color="text.disabled">All medicines are above reorder level</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#f59e0b', 0.05) }}>
                      {['Medicine', 'Category', 'Current Stock', 'Reorder Level', 'Deficit', 'Action'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                          align={['Current Stock', 'Reorder Level', 'Deficit', 'Action'].includes(h) ? 'center' : 'left'}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStock.map((m: any) => (
                      <TableRow key={m.id} hover
                        sx={{ bgcolor: m.totalStock === 0 ? alpha('#ef4444', 0.03) : 'inherit', '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                          {m.genericName && <Typography variant="caption" color="text.secondary">{m.genericName}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={CATEGORY_LABEL[m.category] || m.category} size="small"
                            sx={{ fontWeight: 600, fontSize: '0.65rem', borderRadius: 1.5,
                              bgcolor: alpha(CATEGORY_COLOR[m.category] || '#9ca3af', 0.1),
                              color: CATEGORY_COLOR[m.category] || '#9ca3af',
                            }} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color={m.totalStock === 0 ? 'error.main' : 'warning.main'}>
                            {m.totalStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{m.reorderLevel}</TableCell>
                        <TableCell align="center">
                          <Chip label={`-${m.reorderLevel - m.totalStock}`} size="small"
                            sx={{ fontWeight: 700, bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              setShowReceive(m.id);
                              setReceiveMedName(m.name);
                              setReceiveForm({ ...emptyStockReceive, sellingPrice: Number(m.sellingPrice), mrp: Number(m.mrp) });
                            }}
                            sx={{ fontSize: '0.7rem', borderRadius: 2, textTransform: 'none' }}>
                            Receive
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab 3: Expiring ─────────────────────────────────────────── */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Expiring within:</Typography>
              {[30, 60, 90, 180].map((d) => (
                <Chip key={d} label={`${d} days`} size="small"
                  variant={expiryDays === d ? 'filled' : 'outlined'}
                  color={expiryDays === d ? 'primary' : 'default'}
                  onClick={() => setExpiryDays(d)}
                  sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2 }} />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {expiring.length} batches
              </Typography>
            </Box>

            {expiring.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Science sx={{ fontSize: 56, color: '#10b981', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary">All Clear!</Typography>
                <Typography variant="body2" color="text.disabled">No batches expiring within {expiryDays} days</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#ef4444', 0.04) }}>
                      {['Medicine', 'Batch', 'Expiry', 'Qty Available', 'Days Left', 'Action'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                          align={['Qty Available', 'Days Left', 'Action'].includes(h) ? 'center' : 'left'}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiring.map((b: any) => {
                      const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
                      const isExpired = daysLeft <= 0;
                      return (
                        <TableRow key={b.id} hover
                          sx={{
                            bgcolor: isExpired ? alpha('#ef4444', 0.04) : daysLeft <= 30 ? alpha('#f59e0b', 0.03) : 'inherit',
                            '&:last-child td': { borderBottom: 0 },
                          }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{b.medicine?.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.batchNumber}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2"
                              color={isExpired ? 'error.main' : daysLeft <= 30 ? 'warning.main' : 'text.primary'}>
                              {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight={600}>{b.quantityAvailable}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={isExpired ? 'EXPIRED' : `${daysLeft}d`} size="small"
                              sx={{
                                fontWeight: 700, fontSize: '0.65rem',
                                bgcolor: isExpired ? alpha('#ef4444', 0.1) : daysLeft <= 30 ? alpha('#f59e0b', 0.1) : alpha('#6b7280', 0.1),
                                color: isExpired ? '#ef4444' : daysLeft <= 30 ? '#f59e0b' : '#6b7280',
                              }} />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Adjust / Write-off">
                              <IconButton size="small" onClick={() => {
                                setShowAdjust(b);
                                setAdjustForm({ adjustment: -b.quantityAvailable, reason: isExpired ? 'Expired batch write-off' : '' });
                              }} sx={{ color: '#f59e0b' }}>
                                <Build sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
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

        {/* ── Tab 4: Movement Log ─────────────────────────────────────── */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select value={movementType} label="Type" onChange={(e) => setMovementType(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(MOVEMENT_TYPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">{movementTotal} records</Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? alpha('#8b5cf6', 0.06) : alpha('#8b5cf6', 0.03) }}>
                    {['Date', 'Medicine', 'Type', 'Qty', 'Batch', 'Reason', 'Balance'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                        align={['Qty', 'Balance'].includes(h) ? 'center' : 'left'}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.disabled">No movement records found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : movements.map((mv: any) => (
                    <TableRow key={mv.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell>
                        <Typography variant="caption">{new Date(mv.createdAt).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{mv.medicine?.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={MOVEMENT_TYPE_LABEL[mv.type] || mv.type} size="small"
                          color={MOVEMENT_TYPE_COLOR[mv.type] || 'default'}
                          sx={{ fontWeight: 600, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700} color={mv.quantity > 0 ? 'success.main' : 'error.main'}>
                          {mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {mv.batch?.batchNumber || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{mv.reason || mv.referenceType || '—'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={600}>{mv.balanceAfter ?? '—'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* ── Add/Edit Medicine Dialog ─────────────────────────────────── */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: 2, p: 0.8, display: 'flex',
            }}>
              <LocalPharmacy sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {editId ? 'Edit Medicine' : 'Add New Medicine'}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Medicine Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Paracetamol 500mg" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Generic Name" value={form.genericName}
                onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                placeholder="e.g. Acetaminophen" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Brand" value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Manufacturer" value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category"
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{CATEGORY_LABEL[c]}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Strength" value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                placeholder="e.g. 500mg, 10ml" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Unit" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs, strips, bottles" />
            </Grid>

            <Grid item xs={12}><Divider sx={{ my: 0.5 }}>Pricing</Divider></Grid>

            <Grid item xs={12} sm={3}>
              <TextField fullWidth type="number" label="MRP (₹)" value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth type="number" label="Selling Price (₹)" value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth type="number" label="GST (%)" value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="HSN Code" value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Divider sx={{ my: 0.5 }}>Other</Divider></Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Reorder Level" value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: parseInt(e.target.value) || 10 })}
                helperText="Alert when stock falls below" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Schedule" value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                placeholder="H, H1, X, OTC" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Storage" value={form.storageCondition}
                onChange={(e) => setForm({ ...form, storageCondition: e.target.value })}
                placeholder="Room Temp, 2-8°C" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowForm(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name}
            sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {saving ? 'Saving…' : editId ? 'Update Medicine' : 'Create Medicine'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Receive Stock Dialog ─────────────────────────────────────── */}
      <Dialog open={!!showReceive} onClose={() => setShowReceive(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: 2, p: 0.8, display: 'flex' }}>
              <ShoppingCart sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Receive Stock</Typography>
              <Typography variant="caption" color="text.secondary">{receiveMedName}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Batch Number" value={receiveForm.batchNumber}
                onChange={(e) => setReceiveForm({ ...receiveForm, batchNumber: e.target.value })}
                placeholder="e.g. B2026-001" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type="date" label="Expiry Date" value={receiveForm.expiryDate}
                onChange={(e) => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required type="number" label="Quantity" value={receiveForm.quantity || ''}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: parseInt(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required type="number" label="Cost Price (₹)" value={receiveForm.costPrice || ''}
                onChange={(e) => setReceiveForm({ ...receiveForm, costPrice: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required type="number" label="Selling Price (₹)" value={receiveForm.sellingPrice || ''}
                onChange={(e) => setReceiveForm({ ...receiveForm, sellingPrice: parseFloat(e.target.value) || 0 })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowReceive(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleReceiveStock}
            disabled={saving || !receiveForm.batchNumber || !receiveForm.expiryDate || receiveForm.quantity <= 0}
            sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            {saving ? 'Receiving…' : 'Receive Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Stock Adjustment Dialog ──────────────────────────────────── */}
      <Dialog open={!!showAdjust} onClose={() => setShowAdjust(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 2, p: 0.8, display: 'flex' }}>
              <Build sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Stock Adjustment</Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {showAdjust && (
            <Box>
              <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                <strong>{showAdjust.medicine?.name}</strong> — Batch: {showAdjust.batchNumber}
                <br />Current available: <strong>{showAdjust.quantityAvailable}</strong>
              </Alert>
              <TextField fullWidth type="number" label="Adjustment (+/-)" value={adjustForm.adjustment}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: parseInt(e.target.value) || 0 })}
                helperText="Positive to add, negative to deduct"
                sx={{ mb: 2 }} />
              <TextField fullWidth required label="Reason" value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g. Expired batch write-off, Physical count correction" />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowAdjust(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjust}
            disabled={saving || adjustForm.adjustment === 0 || !adjustForm.reason}
            sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            {saving ? 'Applying…' : 'Apply Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ bgcolor: alpha('#ef4444', 0.1), borderRadius: 2, p: 0.8, display: 'flex' }}>
              <DeleteForever sx={{ color: '#ef4444', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Deactivate Medicine</Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Deactivate <strong>{deleteConfirm?.name}</strong>? This will hide it from active catalog.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirm(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}
            startIcon={<DeleteForever />} sx={{ borderRadius: 2, px: 3 }}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicineList;
