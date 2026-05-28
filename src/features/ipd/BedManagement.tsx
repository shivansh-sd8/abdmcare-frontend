import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, alpha, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Chip, IconButton,
  CircularProgress, Alert, Tooltip, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, FormControl, InputLabel, Select,
  MenuItem, Switch, FormControlLabel,
} from '@mui/material';
import {
  Add, Refresh, Hotel, Person, Warning, Build, SwapHoriz,
  CleaningServices, LocalHospital, Assessment,
} from '@mui/icons-material';
import ipdService from '../../services/ipdService';

const BED_TYPES = ['STANDARD', 'ICU', 'ELECTRIC', 'PEDIATRIC', 'BARIATRIC', 'ISOLATION', 'BIRTHING'];

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e', OCCUPIED: '#ef4444', RESERVED: '#f59e0b', UNDER_MAINTENANCE: '#6b7280',
};

const CLEANING_COLORS: Record<string, string> = {
  CLEAN: '#22c55e', NEEDS_CLEANING: '#f59e0b', IN_PROGRESS: '#3b82f6',
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>{value === index && children}</Box>
);

const BedManagement: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk create dialog
  const [showBulk, setShowBulk] = useState<string | null>(null);
  const [bulkWardName, setBulkWardName] = useState('');
  const [bulkForm, setBulkForm] = useState({
    prefix: '', startNumber: 1, count: 10, bedType: 'STANDARD',
    hasOxygen: false, hasVentilator: false, hasMonitor: false, hasSuction: false,
  });

  // Bed detail dialog
  const [showBedDetail, setShowBedDetail] = useState<any>(null);
  const [bedDetailForm, setBedDetailForm] = useState<any>({});

  const loadWards = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await ipdService.getWardOverview();
      setWards(res.data?.data || res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const res: any = await ipdService.getBedAnalytics();
      setAnalytics(res.data?.data || res.data || null);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    }
  }, []);

  useEffect(() => { loadWards(); }, [loadWards]);
  useEffect(() => { if (tab === 1) loadAnalytics(); }, [tab, loadAnalytics]);

  const handleBulkCreate = async () => {
    if (!showBulk) return;
    setSaving(true);
    try {
      await ipdService.bulkCreateBeds(showBulk, bulkForm);
      setShowBulk(null);
      loadWards();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Bulk create failed');
    }
    setSaving(false);
  };

  const handleUpdateBed = async () => {
    if (!showBedDetail) return;
    setSaving(true);
    try {
      await ipdService.updateBedDetails(showBedDetail.id, bedDetailForm);
      setShowBedDetail(null);
      loadWards();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Update failed');
    }
    setSaving(false);
  };

  // Compute totals from wards
  const totals = wards.reduce((acc, w) => {
    acc.total += w.totalBeds || 0;
    acc.occupied += w.occupiedBeds || 0;
    acc.available += w.availableBeds || 0;
    acc.maintenance += w.maintenanceBeds || 0;
    return acc;
  }, { total: 0, occupied: 0, available: 0, maintenance: 0 });
  const occupancyPct = totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Bed Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Admin console for wards, beds, transfers, and analytics
          </Typography>
        </Box>
        <IconButton onClick={() => { loadWards(); if (tab === 1) loadAnalytics(); }}><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Beds', value: totals.total, color: '#4A90E2', icon: <Hotel /> },
          { label: 'Occupied', value: totals.occupied, color: '#ef4444', icon: <Person /> },
          { label: 'Available', value: totals.available, color: '#22c55e', icon: <Hotel /> },
          { label: 'Maintenance', value: totals.maintenance, color: '#6b7280', icon: <Build /> },
          { label: 'Occupancy', value: `${occupancyPct}%`, color: '#f59e0b', icon: <Assessment /> },
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

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Ward & Bed Grid" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Tab 0: Ward & Bed Grid */}
        <TabPanel value={tab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : wards.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No wards found. Create wards from Ward Manager first.</Alert>
          ) : (
            wards.map((ward) => (
              <Box key={ward.id} sx={{ mb: 3, px: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital color="primary" fontSize="small" />
                    <Typography variant="h6" fontWeight={600}>{ward.name}</Typography>
                    <Chip label={ward.type} size="small" variant="outlined" />
                    {ward.floor && <Typography variant="caption" color="text.secondary">Floor: {ward.floor}</Typography>}
                    <Chip label={`${ward.occupancyRate}% occupied`} size="small"
                      color={ward.occupancyRate > 80 ? 'error' : ward.occupancyRate > 50 ? 'warning' : 'success'} />
                  </Box>
                  <Button size="small" startIcon={<Add />} variant="outlined"
                    onClick={() => { setShowBulk(ward.id); setBulkWardName(ward.name); setBulkForm({ ...bulkForm, prefix: ward.name.substring(0, 3).toUpperCase() + '-' }); }}>
                    Bulk Add Beds
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(ward.beds || []).map((bed: any) => (
                    <Tooltip key={bed.id} title={
                      <Box>
                        <Typography variant="caption" display="block">Type: {bed.bedType || 'STANDARD'}</Typography>
                        <Typography variant="caption" display="block">Status: {bed.status}</Typography>
                        <Typography variant="caption" display="block">Cleaning: {bed.cleaningStatus || 'CLEAN'}</Typography>
                        {bed.currentPatient && <Typography variant="caption" display="block">Patient: {bed.currentPatient.firstName} {bed.currentPatient.lastName}</Typography>}
                        {bed.maintenanceNote && <Typography variant="caption" display="block">Maint: {bed.maintenanceNote}</Typography>}
                      </Box>
                    }>
                      <Box
                        onClick={() => {
                          setShowBedDetail(bed);
                          setBedDetailForm({
                            bedType: bed.bedType || 'STANDARD',
                            hasOxygen: bed.hasOxygen || false,
                            hasVentilator: bed.hasVentilator || false,
                            hasMonitor: bed.hasMonitor || false,
                            hasSuction: bed.hasSuction || false,
                            cleaningStatus: bed.cleaningStatus || 'CLEAN',
                          });
                        }}
                        sx={{
                          width: 72, height: 56, borderRadius: 2, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          border: `2px solid ${STATUS_COLORS[bed.status] || '#ccc'}`,
                          bgcolor: alpha(STATUS_COLORS[bed.status] || '#ccc', 0.1),
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.08)', boxShadow: 2 },
                          position: 'relative',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                          {bed.bedNumber}
                        </Typography>
                        {bed.currentPatient && (
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bed.currentPatient.firstName}
                          </Typography>
                        )}
                        {bed.cleaningStatus === 'NEEDS_CLEANING' && (
                          <CleaningServices sx={{ position: 'absolute', top: 2, right: 2, fontSize: 12, color: CLEANING_COLORS.NEEDS_CLEANING }} />
                        )}
                        {bed.status === 'UNDER_MAINTENANCE' && (
                          <Build sx={{ position: 'absolute', top: 2, right: 2, fontSize: 12, color: '#6b7280' }} />
                        )}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>

                {/* Legend */}
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  {Object.entries(STATUS_COLORS).map(([k, c]) => (
                    <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
                      <Typography variant="caption" color="text.secondary">{k.replace('_', ' ')}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))
          )}
        </TabPanel>

        {/* Tab 1: Analytics */}
        <TabPanel value={tab} index={1}>
          {!analytics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ px: 2, pb: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Needs Cleaning', value: analytics.summary?.needsCleaning || 0, color: '#f59e0b' },
                  { label: 'Reserved', value: analytics.summary?.reservedBeds || 0, color: '#3b82f6' },
                  { label: 'Transfers (7d)', value: analytics.summary?.recentTransfers || 0, color: '#8b5cf6' },
                  { label: 'Discharges (7d)', value: analytics.summary?.recentDischarges || 0, color: '#22c55e' },
                  { label: 'Turnover Rate', value: analytics.summary?.turnoverRate || 0, color: '#ef4444' },
                ].map((s) => (
                  <Grid item xs={6} sm={2.4} key={s.label}>
                    <Card sx={{ background: alpha(s.color, 0.08), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 2 }}>
                      <CardContent sx={{ py: '8px !important' }}>
                        <Typography variant="h6" fontWeight="bold" color={s.color}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Ward-wise Breakdown</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Ward</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Occupied</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Available</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Maint.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Cleaning</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Occupancy</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Daily Rate (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(analytics.wardStats || []).map((ws: any) => (
                      <TableRow key={ws.wardId} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{ws.wardName}</Typography></TableCell>
                        <TableCell><Chip label={ws.wardType} size="small" variant="outlined" /></TableCell>
                        <TableCell align="center">{ws.totalBeds}</TableCell>
                        <TableCell align="center"><Typography color="error.main" fontWeight={600}>{ws.occupiedBeds}</Typography></TableCell>
                        <TableCell align="center"><Typography color="success.main" fontWeight={600}>{ws.availableBeds}</Typography></TableCell>
                        <TableCell align="center">{ws.maintenanceBeds}</TableCell>
                        <TableCell align="center">{ws.needsCleaning}</TableCell>
                        <TableCell align="center">
                          <Chip label={`${ws.occupancyRate}%`} size="small"
                            color={ws.occupancyRate > 80 ? 'error' : ws.occupancyRate > 50 ? 'warning' : 'success'} />
                        </TableCell>
                        <TableCell align="right">{Number(ws.dailyCharges).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Bulk Create Beds Dialog */}
      <Dialog open={!!showBulk} onClose={() => setShowBulk(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add color="primary" /> Bulk Add Beds — {bulkWardName}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Prefix" value={bulkForm.prefix}
                onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })}
                placeholder="e.g. ICU-" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth type="number" label="Start Number" value={bulkForm.startNumber}
                onChange={(e) => setBulkForm({ ...bulkForm, startNumber: parseInt(e.target.value) || 1 })} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth type="number" label="Count" value={bulkForm.count}
                onChange={(e) => setBulkForm({ ...bulkForm, count: parseInt(e.target.value) || 1 })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Bed Type</InputLabel>
                <Select value={bulkForm.bedType} label="Bed Type"
                  onChange={(e) => setBulkForm({ ...bulkForm, bedType: e.target.value })}>
                  {BED_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Equipment</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel control={<Switch checked={bulkForm.hasOxygen} onChange={(e) => setBulkForm({ ...bulkForm, hasOxygen: e.target.checked })} />} label="Oxygen" />
                <FormControlLabel control={<Switch checked={bulkForm.hasVentilator} onChange={(e) => setBulkForm({ ...bulkForm, hasVentilator: e.target.checked })} />} label="Ventilator" />
                <FormControlLabel control={<Switch checked={bulkForm.hasMonitor} onChange={(e) => setBulkForm({ ...bulkForm, hasMonitor: e.target.checked })} />} label="Monitor" />
                <FormControlLabel control={<Switch checked={bulkForm.hasSuction} onChange={(e) => setBulkForm({ ...bulkForm, hasSuction: e.target.checked })} />} label="Suction" />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                This will create {bulkForm.count} beds: {bulkForm.prefix}{String(bulkForm.startNumber).padStart(3, '0')} to {bulkForm.prefix}{String(bulkForm.startNumber + bulkForm.count - 1).padStart(3, '0')}
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowBulk(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkCreate} disabled={saving || !bulkForm.prefix || bulkForm.count <= 0}>
            {saving ? 'Creating…' : `Create ${bulkForm.count} Beds`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bed Detail / Edit Dialog */}
      <Dialog open={!!showBedDetail} onClose={() => setShowBedDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Hotel color="primary" /> Bed Details — {showBedDetail?.bedNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {showBedDetail && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={showBedDetail.status} size="small"
                    sx={{ bgcolor: alpha(STATUS_COLORS[showBedDetail.status] || '#ccc', 0.15), fontWeight: 700 }} />
                  {showBedDetail.currentPatient && (
                    <Typography variant="body2">
                      Patient: <strong>{showBedDetail.currentPatient.firstName} {showBedDetail.currentPatient.lastName}</strong>
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Bed Type</InputLabel>
                  <Select value={bedDetailForm.bedType || 'STANDARD'} label="Bed Type"
                    onChange={(e) => setBedDetailForm({ ...bedDetailForm, bedType: e.target.value })}>
                    {BED_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Cleaning Status</InputLabel>
                  <Select value={bedDetailForm.cleaningStatus || 'CLEAN'} label="Cleaning Status"
                    onChange={(e) => setBedDetailForm({ ...bedDetailForm, cleaningStatus: e.target.value })}>
                    <MenuItem value="CLEAN">Clean</MenuItem>
                    <MenuItem value="NEEDS_CLEANING">Needs Cleaning</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Equipment</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel control={<Switch checked={bedDetailForm.hasOxygen || false} onChange={(e) => setBedDetailForm({ ...bedDetailForm, hasOxygen: e.target.checked })} />} label="Oxygen" />
                  <FormControlLabel control={<Switch checked={bedDetailForm.hasVentilator || false} onChange={(e) => setBedDetailForm({ ...bedDetailForm, hasVentilator: e.target.checked })} />} label="Ventilator" />
                  <FormControlLabel control={<Switch checked={bedDetailForm.hasMonitor || false} onChange={(e) => setBedDetailForm({ ...bedDetailForm, hasMonitor: e.target.checked })} />} label="Monitor" />
                  <FormControlLabel control={<Switch checked={bedDetailForm.hasSuction || false} onChange={(e) => setBedDetailForm({ ...bedDetailForm, hasSuction: e.target.checked })} />} label="Suction" />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Maintenance Note" value={bedDetailForm.maintenanceNote || ''}
                  onChange={(e) => setBedDetailForm({ ...bedDetailForm, maintenanceNote: e.target.value })}
                  placeholder="e.g. Mattress replacement needed" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Maintenance From" value={bedDetailForm.maintenanceFrom || ''}
                  onChange={(e) => setBedDetailForm({ ...bedDetailForm, maintenanceFrom: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Maintenance To" value={bedDetailForm.maintenanceTo || ''}
                  onChange={(e) => setBedDetailForm({ ...bedDetailForm, maintenanceTo: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowBedDetail(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateBed} disabled={saving}>
            {saving ? 'Saving…' : 'Update Bed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BedManagement;
