import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, CircularProgress,
  Alert, alpha, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, IconButton,
} from '@mui/material';
import {
  MeetingRoom, Bed as BedIcon, Person, Add, Refresh, Hotel,
  LocalHospital, Warning,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import ipdService from '../../services/ipdService';

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE:    '#22c55e',
  OCCUPIED:     '#ef4444',
  RESERVED:     '#f59e0b',
  UNDER_MAINTENANCE: '#9ca3af',
};

const WARD_TYPE_LABEL: Record<string, string> = {
  GENERAL:      'General',
  ICU:          'ICU',
  PRIVATE:      'Private',
  SEMI_PRIVATE: 'Semi-Private',
  NICU:         'NICU',
  HDU:          'HDU',
};

interface WardData {
  id: string;
  name: string;
  type: string;
  floor?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  beds: Array<{
    id: string;
    bedNumber: string;
    status: string;
    currentPatient: { firstName: string; lastName: string; uhid: string } | null;
    admittedAt: string | null;
  }>;
}

const WardManager: React.FC = () => {
  const [wards, setWards]     = useState<WardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWard, setShowAddWard] = useState(false);
  const [showAddBed, setShowAddBed]   = useState<string | null>(null); // wardId
  const [newWard, setNewWard] = useState({ name: '', type: 'GENERAL', floor: '', totalBeds: 0, dailyCharges: 0 });
  const [newBedNumber, setNewBedNumber] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await ipdService.getWardOverview() as any;
      setWards(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load ward overview');
    } finally {
      setLoading(false);
    }
  };

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

  const totalBeds     = wards.reduce((s, w) => s + w.totalBeds, 0);
  const totalOccupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const totalFree     = wards.reduce((s, w) => s + w.availableBeds, 0);
  const overallRate   = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Ward Manager</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time bed occupancy and ward overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load}><Refresh /></IconButton>
          <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddWard(true)}>
            Add Ward
          </Button>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Beds',   value: totalBeds,     color: '#4A90E2', icon: <Hotel /> },
          { label: 'Occupied',     value: totalOccupied, color: '#ef4444', icon: <Person /> },
          { label: 'Available',    value: totalFree,     color: '#22c55e', icon: <BedIcon /> },
          { label: 'Occupancy %',  value: `${overallRate}%`, color: '#f59e0b', icon: <Warning /> },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ background: alpha(s.color, 0.08), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                <Box sx={{ bgcolor: s.color, color: 'white', borderRadius: 2, p: 1, display: 'flex' }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : wards.length === 0 ? (
        <Alert severity="info">No wards configured yet. Click "Add Ward" to get started.</Alert>
      ) : (
        <Grid container spacing={3}>
          {wards.map((ward) => (
            <Grid item xs={12} md={6} xl={4} key={ward.id}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MeetingRoom color="primary" />
                      <Typography variant="h6" fontWeight="bold">{ward.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip label={WARD_TYPE_LABEL[ward.type] || ward.type} size="small" variant="outlined" />
                      {ward.floor && <Chip label={`Floor ${ward.floor}`} size="small" variant="outlined" />}
                      {(ward as any).dailyCharges > 0 && (
                        <Chip label={`₹${(ward as any).dailyCharges}/day`} size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  </Box>

                  {/* Occupancy bar */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {ward.occupiedBeds}/{ward.totalBeds} beds occupied
                      </Typography>
                      <Typography variant="caption" fontWeight="bold" color={ward.occupancyRate >= 90 ? 'error.main' : 'text.secondary'}>
                        {ward.occupancyRate}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#000', 0.08) }}>
                      <Box sx={{
                        height: '100%', borderRadius: 3,
                        width: `${ward.occupancyRate}%`,
                        bgcolor: ward.occupancyRate >= 90 ? '#ef4444' : ward.occupancyRate >= 70 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.4s',
                      }} />
                    </Box>
                  </Box>

                  {/* Bed grid */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {ward.beds.map((bed) => (
                      <Tooltip
                        key={bed.id}
                        title={bed.currentPatient
                          ? `${bed.currentPatient.firstName} ${bed.currentPatient.lastName} (${bed.currentPatient.uhid})`
                          : bed.status}
                      >
                        <Box sx={{
                          width: 36, height: 32, borderRadius: 1.5,
                          bgcolor: STATUS_COLOR[bed.status] || '#9ca3af',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'default', border: '2px solid transparent',
                          '&:hover': { borderColor: '#1a3c6e', transform: 'scale(1.1)' },
                          transition: 'all 0.2s',
                        }}>
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                            {bed.bedNumber}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>

                  {/* Legend & add bed button */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {Object.entries(STATUS_COLOR).map(([s, c]) => (
                        <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                            {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button size="small" startIcon={<Add />} onClick={() => setShowAddBed(ward.id)}>
                      Add Bed
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Ward Dialog */}
      <Dialog open={showAddWard} onClose={() => setShowAddWard(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalHospital color="primary" /> Add New Ward
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Ward Name" value={newWard.name}
                onChange={(e) => setNewWard({ ...newWard, name: e.target.value })} />
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
            <Grid item xs={12}>
              <TextField fullWidth type="number" label="Total Beds" value={newWard.totalBeds}
                onChange={(e) => setNewWard({ ...newWard, totalBeds: parseInt(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="number" label="Standard Daily Charges (₹/day)"
                value={newWard.dailyCharges}
                helperText="This will auto-fill when a patient is admitted to this ward"
                onChange={(e) => setNewWard({ ...newWard, dailyCharges: parseFloat(e.target.value) || 0 })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAddWard(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWard} disabled={saving}>
            {saving ? 'Creating…' : 'Create Ward'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={!!showAddBed} onClose={() => setShowAddBed(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Bed</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Bed Number" value={newBedNumber}
            onChange={(e) => setNewBedNumber(e.target.value)}
            placeholder="e.g. A1, B2, 101"
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAddBed(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBed} disabled={saving}>
            {saving ? 'Adding…' : 'Add Bed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WardManager;
