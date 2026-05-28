import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, Alert,
  Grid, Card, CardContent, alpha, TextField, Tab, Tabs, Tooltip,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Refresh, Warning, Inventory, TrendingDown, History,
  LocalPharmacy, Build,
} from '@mui/icons-material';
import pharmacyService from '../../services/pharmacyService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  IN: 'Stock In', OUT: 'Dispensed', ADJUSTMENT: 'Adjustment',
  RETURN: 'Return', EXPIRED: 'Expired',
};

const MOVEMENT_TYPE_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  IN: 'success', OUT: 'error', ADJUSTMENT: 'warning',
  RETURN: 'info', EXPIRED: 'default',
};

const StockOverview: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Overview data
  const [overview, setOverview] = useState<any>(null);

  // Low stock
  const [lowStock, setLowStock] = useState<any[]>([]);

  // Expiring batches
  const [expiring, setExpiring] = useState<any[]>([]);
  const [expiryDays, setExpiryDays] = useState(90);

  // Movements
  const [movements, setMovements] = useState<any[]>([]);
  const [movementType, setMovementType] = useState('');
  const [movementTotal, setMovementTotal] = useState(0);

  // Adjust dialog
  const [showAdjust, setShowAdjust] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ adjustment: 0, reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await pharmacyService.getStockOverview();
      setOverview(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }, []);

  const loadLowStock = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getLowStock();
      setLowStock(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
  }, []);

  const loadExpiring = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getExpiringBatches(expiryDays);
      setExpiring(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
  }, [expiryDays]);

  const loadMovements = useCallback(async () => {
    try {
      const res: any = await pharmacyService.getStockMovements({
        type: movementType || undefined, limit: 100,
      });
      setMovements(res.data?.movements || []);
      setMovementTotal(res.data?.total || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
  }, [movementType]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === 1) loadLowStock(); }, [tab, loadLowStock]);
  useEffect(() => { if (tab === 2) loadExpiring(); }, [tab, loadExpiring]);
  useEffect(() => { if (tab === 3) loadMovements(); }, [tab, loadMovements]);

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
      setShowAdjust(null);
      setAdjustForm({ adjustment: 0, reason: '' });
      loadOverview();
      if (tab === 1) loadLowStock();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Adjustment failed');
    }
    setSaving(false);
  };

  const reload = () => { loadOverview(); if (tab === 1) loadLowStock(); if (tab === 2) loadExpiring(); if (tab === 3) loadMovements(); };

  const summary = overview?.summary || {};

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Stock & Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time stock levels, alerts, and movement history
          </Typography>
        </Box>
        <IconButton onClick={reload}><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      {!loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Medicines', value: summary.totalMedicines || 0, color: '#4A90E2', icon: <LocalPharmacy /> },
            { label: 'Total Stock', value: summary.totalStock || 0, color: '#22c55e', icon: <Inventory /> },
            { label: 'Low Stock', value: summary.lowStockCount || 0, color: '#f59e0b', icon: <Warning /> },
            { label: 'Out of Stock', value: summary.outOfStockCount || 0, color: '#ef4444', icon: <TrendingDown /> },
            { label: 'Stock Value', value: `₹${(summary.totalStockValue || 0).toLocaleString('en-IN')}`, color: '#8b5cf6', icon: <LocalPharmacy /> },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Card sx={{ background: alpha(s.color, 0.08), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important', px: 2 }}>
                  <Box sx={{ bgcolor: s.color, color: 'white', borderRadius: 2, p: 0.8, display: 'flex' }}>{s.icon}</Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color={s.color}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="All Stock" />
          <Tab label={`Low Stock (${summary.lowStockCount || 0})`} />
          <Tab label="Expiring Soon" />
          <Tab label="Movement Log" />
        </Tabs>

        {/* Tab 0: All Stock */}
        <TabPanel value={tab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Medicine</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Price (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Value (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nearest Expiry</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(overview?.items || []).map((item: any) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                        {item.genericName && <Typography variant="caption" color="text.secondary">{item.genericName}</Typography>}
                      </TableCell>
                      <TableCell><Chip label={item.category} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">{Number(item.sellingPrice).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700}
                          color={item.isOutOfStock ? 'error.main' : item.isLowStock ? 'warning.main' : 'success.main'}>
                          {item.totalStock} {item.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        {item.nearestExpiry ? (
                          <Typography variant="caption"
                            color={new Date(item.nearestExpiry) < new Date(Date.now() + 90 * 86400000) ? 'error.main' : 'text.secondary'}>
                            {new Date(item.nearestExpiry).toLocaleDateString('en-IN')}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {item.isOutOfStock ? <Chip label="Out" size="small" color="error" />
                          : item.isLowStock ? <Chip label="Low" size="small" color="warning" />
                          : <Chip label="OK" size="small" color="success" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 1: Low Stock */}
        <TabPanel value={tab} index={1}>
          {lowStock.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>All medicines are above reorder level!</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Medicine</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Current Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Reorder Level</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Deficit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.map((m: any) => (
                    <TableRow key={m.id} hover sx={{ bgcolor: m.totalStock === 0 ? alpha('#ef4444', 0.05) : 'inherit' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                        {m.genericName && <Typography variant="caption" color="text.secondary">{m.genericName}</Typography>}
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700} color={m.totalStock === 0 ? 'error.main' : 'warning.main'}>
                          {m.totalStock}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{m.reorderLevel}</TableCell>
                      <TableCell align="center">
                        <Chip label={`-${m.reorderLevel - m.totalStock}`} size="small" color="error" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 2: Expiring Soon */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2">Show batches expiring within</Typography>
            {[30, 60, 90, 180].map((d) => (
              <Button key={d} size="small" variant={expiryDays === d ? 'contained' : 'outlined'}
                onClick={() => setExpiryDays(d)}>{d} days</Button>
            ))}
          </Box>
          {expiring.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>No batches expiring within {expiryDays} days!</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Medicine</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Qty Available</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Days Left</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiring.map((b: any) => {
                    const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
                    const isExpired = daysLeft <= 0;
                    return (
                      <TableRow key={b.id} hover sx={{ bgcolor: isExpired ? alpha('#ef4444', 0.05) : daysLeft <= 30 ? alpha('#f59e0b', 0.05) : 'inherit' }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{b.medicine?.name}</Typography>
                        </TableCell>
                        <TableCell>{b.batchNumber}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color={isExpired ? 'error.main' : daysLeft <= 30 ? 'warning.main' : 'text.primary'}>
                            {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{b.quantityAvailable}</TableCell>
                        <TableCell align="center">
                          <Chip label={isExpired ? 'EXPIRED' : `${daysLeft}d`} size="small"
                            color={isExpired ? 'error' : daysLeft <= 30 ? 'warning' : 'default'} />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Adjust / Write-off">
                            <IconButton size="small" onClick={() => {
                              setShowAdjust(b);
                              setAdjustForm({ adjustment: -b.quantityAvailable, reason: isExpired ? 'Expired batch write-off' : '' });
                            }}>
                              <Build fontSize="small" />
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
        </TabPanel>

        {/* Tab 3: Movement Log */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select value={movementType} label="Type" onChange={(e) => setMovementType(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {Object.entries(MOVEMENT_TYPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">{movementTotal} records</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Medicine</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((mv: any) => (
                  <TableRow key={mv.id} hover>
                    <TableCell>
                      <Typography variant="caption">{new Date(mv.createdAt).toLocaleString('en-IN')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{mv.medicine?.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={MOVEMENT_TYPE_LABEL[mv.type] || mv.type} size="small"
                        color={MOVEMENT_TYPE_COLOR[mv.type] || 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700} color={mv.quantity > 0 ? 'success.main' : 'error.main'}>
                        {mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>{mv.batch?.batchNumber || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{mv.reason || mv.referenceType || '—'}</Typography>
                    </TableCell>
                    <TableCell align="center">{mv.balanceAfter ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!showAdjust} onClose={() => setShowAdjust(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build color="primary" /> Stock Adjustment
          </Box>
        </DialogTitle>
        <DialogContent>
          {showAdjust && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>{showAdjust.medicine?.name}</strong> — Batch: {showAdjust.batchNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current available: {showAdjust.quantityAvailable}
              </Typography>
              <TextField fullWidth type="number" label="Adjustment (+/-)" value={adjustForm.adjustment}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: parseInt(e.target.value) || 0 })}
                helperText="Positive to add, negative to deduct"
                sx={{ mt: 2 }} />
              <TextField fullWidth required label="Reason" value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g. Expired batch write-off, Physical count correction"
                sx={{ mt: 2 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAdjust(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjust}
            disabled={saving || adjustForm.adjustment === 0 || !adjustForm.reason}>
            {saving ? 'Saving…' : 'Apply Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockOverview;
