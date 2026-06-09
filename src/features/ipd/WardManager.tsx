import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, CircularProgress,
  Alert, alpha, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, IconButton, Tab, Tabs, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Switch,
  FormControlLabel, LinearProgress, keyframes, Divider, useTheme,
} from '@mui/material';
import {
  MeetingRoom, Bed as BedIcon, Person, Add, Refresh, Hotel,
  LocalHospital, Warning, Build, CleaningServices, Assessment,
  TrendingUp, SwapHoriz, EventBusy, AirlineSeatFlat,
  MonitorHeart, Air, WaterDrop, Close, Delete, DeleteForever,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import ipdService from '../../services/ipdService';
import { PageHeader, StatCard } from '../../components/ui';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE:         '#10b981',
  OCCUPIED:          '#ef4444',
  RESERVED:          '#f59e0b',
  UNDER_MAINTENANCE: '#6b7280',
  NEEDS_CLEANING:    '#a855f7',
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE:         'Available',
  OCCUPIED:          'Occupied',
  RESERVED:          'Reserved',
  UNDER_MAINTENANCE: 'Maintenance',
  NEEDS_CLEANING:    'Cleaning',
};

const WARD_TYPE_LABEL: Record<string, string> = {
  GENERAL:      'General',
  ICU:          'ICU',
  PRIVATE:      'Private',
  SEMI_PRIVATE: 'Semi-Private',
  NICU:         'NICU',
  HDU:          'HDU',
};

const WARD_TYPE_GRADIENT: Record<string, string> = {
  GENERAL:      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  ICU:          'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  PRIVATE:      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  SEMI_PRIVATE: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  NICU:         'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  HDU:          'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
};

const BED_TYPES = ['STANDARD', 'ICU', 'ELECTRIC', 'PEDIATRIC', 'BARIATRIC', 'ISOLATION', 'BIRTHING'];

interface WardData {
  id: string;
  name: string;
  type: string;
  floor?: string;
  dailyCharges?: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds?: number;
  occupancyRate: number;
  beds: Array<{
    id: string;
    bedNumber: string;
    status: string;
    bedType?: string;
    hasOxygen?: boolean;
    hasVentilator?: boolean;
    hasMonitor?: boolean;
    hasSuction?: boolean;
    cleaningStatus?: string;
    maintenanceNote?: string;
    currentPatient: { firstName: string; lastName: string; uhid: string } | null;
    admittedAt: string | null;
  }>;
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}>{value === index && children}</Box>
);

const WardManager: React.FC = () => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [wards, setWards] = useState<WardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  // Ward dialog
  const [showAddWard, setShowAddWard] = useState(false);
  const [newWard, setNewWard] = useState({ name: '', type: 'GENERAL', floor: '', totalBeds: 0, dailyCharges: 0 });

  // Single bed dialog
  const [showAddBed, setShowAddBed] = useState<string | null>(null);
  const [newBedNumber, setNewBedNumber] = useState('');

  // Bulk bed dialog
  const [showBulk, setShowBulk] = useState<string | null>(null);
  const [bulkWardName, setBulkWardName] = useState('');
  const [bulkForm, setBulkForm] = useState({
    prefix: '', startNumber: 1, count: 10, bedType: 'STANDARD',
    hasOxygen: false, hasVentilator: false, hasMonitor: false, hasSuction: false,
  });

  // Bed detail dialog
  const [showBedDetail, setShowBedDetail] = useState<any>(null);
  const [bedDetailForm, setBedDetailForm] = useState<any>({});

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'bed' | 'ward'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ipdService.getWardOverview() as any;
      setWards(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load ward overview');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const res: any = await ipdService.getBedAnalytics();
      setAnalytics(res.data?.data || res.data || null);
    } catch {
      toast.error('Failed to load analytics');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 1) loadAnalytics(); }, [tab, loadAnalytics]);

  const handleCreateWard = async () => {
    if (!newWard.name) { toast.error('Ward name is required'); return; }
    try {
      setSaving(true);
      await ipdService.createWard(newWard);
      toast.success('Ward created');
      setShowAddWard(false);
      setNewWard({ name: '', type: 'GENERAL', floor: '', totalBeds: 0, dailyCharges: 0 });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create ward');
    } finally { setSaving(false); }
  };

  const handleCreateBed = async () => {
    if (!newBedNumber || !showAddBed) { toast.error('Bed number required'); return; }
    try {
      setSaving(true);
      await ipdService.createBed(showAddBed, newBedNumber);
      toast.success('Bed added');
      setShowAddBed(null);
      setNewBedNumber('');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add bed');
    } finally { setSaving(false); }
  };

  const handleBulkCreate = async () => {
    if (!showBulk) return;
    setSaving(true);
    try {
      const res: any = await ipdService.bulkCreateBeds(showBulk, bulkForm);
      toast.success(`Created ${res.data?.data?.created || bulkForm.count} beds`);
      setShowBulk(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Bulk create failed');
    }
    setSaving(false);
  };

  const handleUpdateBed = async () => {
    if (!showBedDetail) return;
    setSaving(true);
    try {
      await ipdService.updateBedDetails(showBedDetail.id, bedDetailForm);
      toast.success('Bed updated');
      setShowBedDetail(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === 'bed') {
        await ipdService.deleteBed(deleteConfirm.id);
        toast.success(`Bed ${deleteConfirm.label} deleted`);
        setShowBedDetail(null);
      } else {
        await ipdService.deleteWard(deleteConfirm.id);
        toast.success(`Ward "${deleteConfirm.label}" deleted`);
      }
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || `Cannot delete ${deleteConfirm.type}`);
    }
    setDeleting(false);
  };

  const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
  const totalOccupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const totalFree = wards.reduce((s, w) => s + w.availableBeds, 0);
  const totalMaint = wards.reduce((s, w) => s + (w.maintenanceBeds || 0), 0);
  const overallRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  const filteredWards = selectedWard ? wards.filter(w => w.id === selectedWard) : wards;

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      <PageHeader
        title="Ward & Bed Manager"
        subtitle="Real-time occupancy tracking, bed configuration & analytics"
        icon={<Hotel />}
        actions={
          <>
            <IconButton onClick={() => { load(); if (tab === 1) loadAnalytics(); }}>
              <Refresh />
            </IconButton>
            <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddWard(true)}>
              New ward
            </Button>
          </>
        }
      />

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Total beds" value={String(totalBeds)} icon={<AirlineSeatFlat />} tone="primary" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Occupied" value={String(totalOccupied)} icon={<Person />} tone="warning" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Available" value={String(totalFree)} icon={<BedIcon />} tone="success" />
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <StatCard label="Maintenance" value={String(totalMaint)} icon={<Build />} tone="info" />
        </Grid>
        <Grid item xs={12} sm={2.4}>
          <StatCard label="Occupancy" value={`${overallRate}%`} icon={<TrendingUp />} tone="secondary" />
        </Grid>
      </Grid>

      {/* ── Tab Navigation ───────────────────────────────────────────────── */}
      <Paper sx={{
        borderRadius: 3, overflow: 'hidden',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: isDark ? 'background.paper' : alpha('#667eea', 0.03) }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.95rem', minHeight: 56 },
            '& .Mui-selected': { color: '#667eea' },
            '& .MuiTabs-indicator': { bgcolor: '#667eea', height: 3, borderRadius: '3px 3px 0 0' },
          }}>
            <Tab icon={<MeetingRoom sx={{ fontSize: 20 }} />} iconPosition="start" label="Wards & Beds" />
            <Tab icon={<Assessment sx={{ fontSize: 20 }} />} iconPosition="start" label="Analytics" />
          </Tabs>
        </Box>

        {/* ── Tab 0: Wards & Beds ──────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          {loading ? (
            <Box sx={{ p: 4 }}>
              <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: alpha('#667eea', 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Loading ward data...
              </Typography>
            </Box>
          ) : wards.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Hotel sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>No Wards Yet</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                Get started by creating your first ward
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddWard(true)}
                sx={{ borderRadius: 2.5, px: 3 }}>
                Create First Ward
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {/* Ward filter chips */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
                  FILTER:
                </Typography>
                <Chip label="All Wards" size="small"
                  variant={selectedWard === null ? 'filled' : 'outlined'}
                  color={selectedWard === null ? 'primary' : 'default'}
                  onClick={() => setSelectedWard(null)}
                  sx={{ fontWeight: 600, borderRadius: 2 }} />
                {wards.map(w => (
                  <Chip key={w.id} label={w.name} size="small"
                    variant={selectedWard === w.id ? 'filled' : 'outlined'}
                    color={selectedWard === w.id ? 'primary' : 'default'}
                    onClick={() => setSelectedWard(w.id)}
                    sx={{ fontWeight: 600, borderRadius: 2 }} />
                ))}
              </Box>

              {filteredWards.map((ward) => (
                <Card key={ward.id} sx={{
                  mb: 3, borderRadius: 3, overflow: 'hidden',
                  border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
                  boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'all 0.3s',
                  '&:hover': { boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' },
                }}>
                  {/* Ward header with gradient strip */}
                  <Box sx={{
                    background: WARD_TYPE_GRADIENT[ward.type] || WARD_TYPE_GRADIENT.GENERAL,
                    px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LocalHospital sx={{ color: 'white', fontSize: 22 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>{ward.name}</Typography>
                      <Chip label={WARD_TYPE_LABEL[ward.type] || ward.type} size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }} />
                      {ward.floor && (
                        <Chip label={`Floor ${ward.floor}`} size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '0.7rem' }} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {(ward.dailyCharges || 0) > 0 && (
                        <Chip label={`₹${Number(ward.dailyCharges).toLocaleString('en-IN')}/day`} size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }} />
                      )}
                      <Button size="small" startIcon={<Add />}
                        onClick={() => setShowAddBed(ward.id)}
                        sx={{ color: 'white', fontSize: '0.75rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
                        Add
                      </Button>
                      <Button size="small" startIcon={<Add />} variant="outlined"
                        onClick={() => {
                          setShowBulk(ward.id);
                          setBulkWardName(ward.name);
                          setBulkForm({ ...bulkForm, prefix: ward.name.substring(0, 3).toUpperCase() + '-' });
                        }}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', fontSize: '0.75rem',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'white' } }}>
                        Bulk
                      </Button>
                      {ward.occupiedBeds === 0 && (
                        <Tooltip title="Delete ward (no occupied beds)">
                          <IconButton size="small"
                            onClick={() => setDeleteConfirm({ type: 'ward', id: ward.id, label: ward.name })}
                            sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { bgcolor: 'rgba(255,77,77,0.3)', color: 'white' } }}>
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Occupancy progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{ward.occupiedBeds}</strong> of <strong>{ward.totalBeds}</strong> beds occupied
                        </Typography>
                        <Chip label={`${ward.occupancyRate}%`} size="small"
                          sx={{
                            fontWeight: 800, fontSize: '0.75rem', height: 22,
                            bgcolor: alpha(ward.occupancyRate >= 90 ? '#ef4444' : ward.occupancyRate >= 60 ? '#f59e0b' : '#10b981', 0.12),
                            color: ward.occupancyRate >= 90 ? '#ef4444' : ward.occupancyRate >= 60 ? '#f59e0b' : '#10b981',
                          }} />
                      </Box>
                      <LinearProgress variant="determinate" value={ward.occupancyRate}
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: ward.occupancyRate >= 90
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : ward.occupancyRate >= 60
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #10b981, #059669)',
                          },
                        }} />
                    </Box>

                    {/* Bed grid — visual floor plan style */}
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
                      gap: 0.75, mb: 2,
                    }}>
                      {ward.beds.map((bed) => {
                        const bedColor = STATUS_COLOR[bed.status] || '#9ca3af';
                        return (
                          <Tooltip key={bed.id} arrow placement="top" title={
                            <Box sx={{ p: 0.5 }}>
                              <Typography variant="caption" fontWeight={700} display="block">
                                {bed.bedNumber}
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                                {STATUS_LABEL[bed.status] || bed.status}
                              </Typography>
                              {bed.bedType && bed.bedType !== 'STANDARD' && (
                                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                                  Type: {bed.bedType}
                                </Typography>
                              )}
                              {bed.currentPatient && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.3 }}>
                                  {bed.currentPatient.firstName} {bed.currentPatient.lastName}
                                  <br /><span style={{ opacity: 0.7 }}>{bed.currentPatient.uhid}</span>
                                </Typography>
                              )}
                              {bed.maintenanceNote && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.3, fontStyle: 'italic' }}>
                                  {bed.maintenanceNote}
                                </Typography>
                              )}
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
                                height: 44, borderRadius: 2, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                bgcolor: alpha(bedColor, isDark ? 0.2 : 0.1),
                                border: `2px solid ${alpha(bedColor, 0.5)}`,
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: `0 4px 12px ${alpha(bedColor, 0.35)}`,
                                  borderColor: bedColor,
                                },
                                ...(bed.status === 'OCCUPIED' && {
                                  animation: `${pulse} 3s ease-in-out infinite`,
                                }),
                              }}
                            >
                              <Typography variant="caption" fontWeight={800}
                                sx={{ fontSize: '0.62rem', color: bedColor, lineHeight: 1 }}>
                                {bed.bedNumber}
                              </Typography>
                              {bed.currentPatient && (
                                <Typography variant="caption"
                                  sx={{
                                    fontSize: '0.5rem', color: 'text.secondary', lineHeight: 1.1,
                                    maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                  {bed.currentPatient.firstName}
                                </Typography>
                              )}
                              {/* Equipment indicators */}
                              <Box sx={{ position: 'absolute', top: 1, right: 1, display: 'flex', gap: '1px' }}>
                                {bed.hasOxygen && <Air sx={{ fontSize: 8, color: '#3b82f6' }} />}
                                {bed.hasMonitor && <MonitorHeart sx={{ fontSize: 8, color: '#10b981' }} />}
                              </Box>
                              {bed.cleaningStatus === 'NEEDS_CLEANING' && (
                                <CleaningServices sx={{ position: 'absolute', bottom: 1, right: 1, fontSize: 10, color: '#a855f7' }} />
                              )}
                              {bed.status === 'UNDER_MAINTENANCE' && (
                                <Build sx={{ position: 'absolute', bottom: 1, right: 1, fontSize: 10, color: '#6b7280' }} />
                              )}
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {Object.entries(STATUS_COLOR).map(([s, c]) => (
                        <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                            {STATUS_LABEL[s] || s}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* ── Tab 1: Analytics ─────────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          {!analytics ? (
            <Box sx={{ p: 4 }}>
              <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: alpha('#667eea', 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }} />
            </Box>
          ) : (
            <Box sx={{ p: 2.5 }}>
              {/* Analytics cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Needs Cleaning', value: analytics.summary?.needsCleaning || 0, color: '#a855f7', icon: <CleaningServices /> },
                  { label: 'Reserved', value: analytics.summary?.reservedBeds || 0, color: '#3b82f6', icon: <EventBusy /> },
                  { label: 'Transfers (7d)', value: analytics.summary?.recentTransfers || 0, color: '#8b5cf6', icon: <SwapHoriz /> },
                  { label: 'Discharges (7d)', value: analytics.summary?.recentDischarges || 0, color: '#10b981', icon: <Person /> },
                  { label: 'Turnover Rate', value: analytics.summary?.turnoverRate || 0, color: '#ef4444', icon: <TrendingUp /> },
                ].map((s) => (
                  <Grid item xs={6} sm={2.4} key={s.label}>
                    <Card sx={{
                      borderRadius: 2.5, border: `1px solid ${alpha(s.color, 0.2)}`,
                      background: `linear-gradient(135deg, ${alpha(s.color, 0.05)} 0%, ${alpha(s.color, 0.12)} 100%)`,
                    }}>
                      <CardContent sx={{ py: '12px !important', px: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ color: s.color, opacity: 0.7 }}>{s.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={800} sx={{ color: s.color, lineHeight: 1.1 }}>
                            {s.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {s.label}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Ward breakdown table */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment sx={{ fontSize: 20, color: '#667eea' }} /> Ward-wise Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? alpha('#667eea', 0.08) : alpha('#667eea', 0.04) }}>
                      {['Ward', 'Type', 'Total', 'Occupied', 'Available', 'Maint.', 'Cleaning', 'Occupancy', 'Rate (₹/day)'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}
                          align={['Total', 'Occupied', 'Available', 'Maint.', 'Cleaning', 'Occupancy'].includes(h) ? 'center' : h === 'Rate (₹/day)' ? 'right' : 'left'}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(analytics.wardStats || []).map((ws: any) => (
                      <TableRow key={ws.wardId} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 6, height: 24, borderRadius: 3,
                              background: WARD_TYPE_GRADIENT[ws.wardType] || WARD_TYPE_GRADIENT.GENERAL,
                            }} />
                            <Typography variant="body2" fontWeight={600}>{ws.wardName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={WARD_TYPE_LABEL[ws.wardType] || ws.wardType} size="small" variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.7rem', borderRadius: 1.5 }} />
                        </TableCell>
                        <TableCell align="center"><Typography fontWeight={600}>{ws.totalBeds}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color="error.main">{ws.occupiedBeds}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={700} color="success.main">{ws.availableBeds}</Typography>
                        </TableCell>
                        <TableCell align="center">{ws.maintenanceBeds}</TableCell>
                        <TableCell align="center">{ws.needsCleaning}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                            <Box sx={{ flex: 1, maxWidth: 60 }}>
                              <LinearProgress variant="determinate" value={ws.occupancyRate}
                                sx={{
                                  height: 6, borderRadius: 3,
                                  bgcolor: alpha('#000', 0.06),
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    bgcolor: ws.occupancyRate > 80 ? '#ef4444' : ws.occupancyRate > 50 ? '#f59e0b' : '#10b981',
                                  },
                                }} />
                            </Box>
                            <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30 }}>
                              {ws.occupancyRate}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>₹{Number(ws.dailyCharges).toLocaleString('en-IN')}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* ── Add Ward Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showAddWard} onClose={() => setShowAddWard(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: 2, p: 0.8, display: 'flex',
            }}>
              <LocalHospital sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Create New Ward</Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Ward Name" value={newWard.name}
                onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
                placeholder="e.g. General Ward A" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ward Type</InputLabel>
                <Select value={newWard.type} label="Ward Type"
                  onChange={(e) => setNewWard({ ...newWard, type: e.target.value })}>
                  {Object.entries(WARD_TYPE_LABEL).map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Floor" value={newWard.floor}
                onChange={(e) => setNewWard({ ...newWard, floor: e.target.value })}
                placeholder="e.g. Ground, 1st, 2nd" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Total Beds" value={newWard.totalBeds}
                onChange={(e) => setNewWard({ ...newWard, totalBeds: parseInt(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Daily Charges (₹)"
                value={newWard.dailyCharges}
                onChange={(e) => setNewWard({ ...newWard, dailyCharges: parseFloat(e.target.value) || 0 })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowAddWard(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWard} disabled={saving}
            sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            {saving ? 'Creating…' : 'Create Ward'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Single Bed Dialog ────────────────────────────────────────── */}
      <Dialog open={!!showAddBed} onClose={() => setShowAddBed(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BedIcon color="primary" /> Add Single Bed
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Bed Number" value={newBedNumber}
            onChange={(e) => setNewBedNumber(e.target.value)}
            placeholder="e.g. A1, B2, 101"
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAddBed(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBed} disabled={saving} sx={{ borderRadius: 2 }}>
            {saving ? 'Adding…' : 'Add Bed'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Create Beds Dialog ──────────────────────────────────────── */}
      <Dialog open={!!showBulk} onClose={() => setShowBulk(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 2, p: 0.8, display: 'flex' }}>
              <Add sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Bulk Add Beds</Typography>
              <Typography variant="caption" color="text.secondary">{bulkWardName}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Prefix" value={bulkForm.prefix}
                onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })}
                placeholder="e.g. ICU-" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth type="number" label="Start #" value={bulkForm.startNumber}
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
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { key: 'hasOxygen', label: 'O₂', icon: <Air sx={{ fontSize: 16 }} /> },
                  { key: 'hasVentilator', label: 'Vent', icon: <WaterDrop sx={{ fontSize: 16 }} /> },
                  { key: 'hasMonitor', label: 'Monitor', icon: <MonitorHeart sx={{ fontSize: 16 }} /> },
                  { key: 'hasSuction', label: 'Suction', icon: <WaterDrop sx={{ fontSize: 16 }} /> },
                ].map(eq => (
                  <Chip key={eq.key} icon={eq.icon} label={eq.label} size="small"
                    variant={(bulkForm as any)[eq.key] ? 'filled' : 'outlined'}
                    color={(bulkForm as any)[eq.key] ? 'primary' : 'default'}
                    onClick={() => setBulkForm({ ...bulkForm, [eq.key]: !(bulkForm as any)[eq.key] })}
                    sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2 }} />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Creates <strong>{bulkForm.count}</strong> beds: {bulkForm.prefix}{String(bulkForm.startNumber).padStart(3, '0')} → {bulkForm.prefix}{String(bulkForm.startNumber + bulkForm.count - 1).padStart(3, '0')}
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowBulk(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkCreate} disabled={saving || !bulkForm.prefix || bulkForm.count <= 0}
            sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {saving ? 'Creating…' : `Create ${bulkForm.count} Beds`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bed Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!showBedDetail} onClose={() => setShowBedDetail(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                background: WARD_TYPE_GRADIENT.GENERAL,
                borderRadius: 2, p: 0.8, display: 'flex',
              }}>
                <Hotel sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>Bed {showBedDetail?.bedNumber}</Typography>
                {showBedDetail && (
                  <Chip label={showBedDetail.status} size="small"
                    sx={{
                      bgcolor: alpha(STATUS_COLOR[showBedDetail.status] || '#ccc', 0.15),
                      color: STATUS_COLOR[showBedDetail.status],
                      fontWeight: 700, fontSize: '0.65rem', height: 20,
                    }} />
                )}
              </Box>
            </Box>
            <IconButton onClick={() => setShowBedDetail(null)} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {showBedDetail && (
            <Grid container spacing={2}>
              {showBedDetail.currentPatient && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Patient: <strong>{showBedDetail.currentPatient.firstName} {showBedDetail.currentPatient.lastName}</strong>
                    {showBedDetail.currentPatient.uhid && ` (${showBedDetail.currentPatient.uhid})`}
                  </Alert>
                </Grid>
              )}
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
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    { key: 'hasOxygen', label: 'Oxygen Supply', icon: <Air sx={{ fontSize: 16 }} /> },
                    { key: 'hasVentilator', label: 'Ventilator', icon: <WaterDrop sx={{ fontSize: 16 }} /> },
                    { key: 'hasMonitor', label: 'Monitor', icon: <MonitorHeart sx={{ fontSize: 16 }} /> },
                    { key: 'hasSuction', label: 'Suction', icon: <WaterDrop sx={{ fontSize: 16 }} /> },
                  ].map(eq => (
                    <Chip key={eq.key} icon={eq.icon} label={eq.label} size="small"
                      variant={bedDetailForm[eq.key] ? 'filled' : 'outlined'}
                      color={bedDetailForm[eq.key] ? 'primary' : 'default'}
                      onClick={() => setBedDetailForm({ ...bedDetailForm, [eq.key]: !bedDetailForm[eq.key] })}
                      sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: 2 }} />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Maintenance Note" value={bedDetailForm.maintenanceNote || ''}
                  onChange={(e) => setBedDetailForm({ ...bedDetailForm, maintenanceNote: e.target.value })}
                  placeholder="e.g. Mattress replacement needed" multiline rows={2} />
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
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
          <Box>
            {showBedDetail && showBedDetail.status !== 'OCCUPIED' && (
              <Button color="error" startIcon={<Delete />} size="small"
                onClick={() => setDeleteConfirm({ type: 'bed', id: showBedDetail.id, label: showBedDetail.bedNumber })}
                sx={{ borderRadius: 2 }}>
                Delete Bed
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setShowBedDetail(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateBed} disabled={saving}
              sx={{ borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              {saving ? 'Saving…' : 'Update Bed'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ bgcolor: alpha('#ef4444', 0.1), borderRadius: 2, p: 0.8, display: 'flex' }}>
              <DeleteForever sx={{ color: '#ef4444', fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Confirm Delete</Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {deleteConfirm?.type === 'ward' ? (
              <>
                This will permanently delete ward <strong>&quot;{deleteConfirm?.label}&quot;</strong> and
                all its beds. This action cannot be undone.
              </>
            ) : (
              <>
                This will permanently delete bed <strong>{deleteConfirm?.label}</strong>.
                This action cannot be undone.
              </>
            )}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirm(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={<DeleteForever />}
            sx={{ borderRadius: 2, px: 3 }}>
            {deleting ? 'Deleting…' : `Delete ${deleteConfirm?.type === 'ward' ? 'Ward' : 'Bed'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WardManager;
