import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Stack,
  Tabs, Tab, TextField, Switch, FormControlLabel, Button, IconButton, Chip,
  Grid, Paper, Divider, alpha, useTheme, MenuItem, Slider, ToggleButton,
  ToggleButtonGroup, InputAdornment, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import {
  Close, AccessTime, CurrencyRupee, EventAvailable, EventBusy, Person,
  Schedule, AddCircleOutline, RemoveCircleOutline, RestartAlt, AutoAwesome,
} from '@mui/icons-material';
import doctorService from '../../services/doctorService';
import { toast } from 'react-toastify';

/**
 * Doctor profile / fee / schedule editor.
 *
 * One dialog, three tabs:
 *   1. Profile  — name, email, mobile, qualification, isActive
 *   2. Consultation fee — quick-pick chips + freeform input + delta vs. current
 *   3. Schedule — weekly grid with per-day on/off + start/end + slot duration
 *                 + max patients/day + breaks
 *
 * Designed to mirror the rest of the app's theme (gradient header, soft cards,
 * tinted action zones) so admins / doctors don't feel they've left the product.
 */

const DAYS = [
  { key: 'MON', label: 'Mon', short: 'M' },
  { key: 'TUE', label: 'Tue', short: 'T' },
  { key: 'WED', label: 'Wed', short: 'W' },
  { key: 'THU', label: 'Thu', short: 'T' },
  { key: 'FRI', label: 'Fri', short: 'F' },
  { key: 'SAT', label: 'Sat', short: 'S' },
  { key: 'SUN', label: 'Sun', short: 'S' },
] as const;

type DayKey = typeof DAYS[number]['key'];

interface WorkingHoursMap {
  [day: string]: { open: boolean; start: string; end: string };
}

interface BreakItem {
  day: DayKey | 'ALL';
  start: string;
  end: string;
  label?: string;
}

interface DoctorEditDialogProps {
  open: boolean;
  onClose: () => void;
  doctor: any; // current doctor object (from getDoctorProfile)
  /** Tab to open initially: 0=Profile, 1=Fee, 2=Schedule */
  initialTab?: 0 | 1 | 2;
  /** Called after a successful save so the parent can refresh */
  onSaved?: () => void;
}

const DEFAULT_HOURS: WorkingHoursMap = {
  MON: { open: true,  start: '09:00', end: '17:00' },
  TUE: { open: true,  start: '09:00', end: '17:00' },
  WED: { open: true,  start: '09:00', end: '17:00' },
  THU: { open: true,  start: '09:00', end: '17:00' },
  FRI: { open: true,  start: '09:00', end: '17:00' },
  SAT: { open: true,  start: '09:00', end: '13:00' },
  SUN: { open: false, start: '09:00', end: '13:00' },
};

const FEE_PRESETS = [200, 300, 500, 800, 1000, 1500, 2000];

const DoctorEditDialog: React.FC<DoctorEditDialogProps> = ({
  open, onClose, doctor, initialTab = 0, onSaved,
}) => {
  const theme = useTheme();
  const [tab, setTab] = useState<number>(initialTab);
  const [saving, setSaving] = useState(false);

  // ---------- Profile tab ----------
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [qualification,setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [mobile,       setMobile]       = useState('');
  const [email,        setEmail]        = useState('');
  const [isActive,     setIsActive]     = useState(true);

  // ---------- Fee tab ----------
  const [fee, setFee] = useState<number>(0);

  // ---------- Schedule tab ----------
  const [hours, setHours] = useState<WorkingHoursMap>(DEFAULT_HOURS);
  const [slotDuration, setSlotDuration] = useState<number>(15);
  const [maxPatients, setMaxPatients]   = useState<number>(30);
  const [breaks, setBreaks] = useState<BreakItem[]>([]);

  // Reset state whenever dialog opens or doctor changes
  useEffect(() => {
    if (!open || !doctor) return;
    setTab(initialTab);
    setFirstName(doctor.firstName || '');
    setLastName(doctor.lastName || '');
    setQualification(doctor.qualification || '');
    setSpecialization(doctor.specialization || '');
    setMobile(doctor.mobile || '');
    setEmail(doctor.email || '');
    setIsActive(!!doctor.isActive);
    setFee(Number(doctor.consultationFee || 0));

    // The schema stores workingHours / breakTimes as opaque JSON. We try to be
    // forgiving about shape — accept either { MON: { open, start, end } } (our
    // canonical), or { mon: { start, end } } (legacy / hospital), or null.
    const wh = doctor.workingHours;
    if (wh && typeof wh === 'object') {
      const out: WorkingHoursMap = { ...DEFAULT_HOURS };
      for (const d of DAYS) {
        const k = d.key;
        const lk = k.toLowerCase();
        const item = wh[k] ?? wh[lk];
        if (item && typeof item === 'object') {
          out[k] = {
            open:  item.open !== undefined ? !!item.open : !!(item.start && item.end),
            start: item.start || '09:00',
            end:   item.end   || '17:00',
          };
        }
      }
      setHours(out);
    } else {
      setHours(DEFAULT_HOURS);
    }
    setSlotDuration(Number(doctor.slotDuration) > 0 ? Number(doctor.slotDuration) : 15);
    setMaxPatients(Number(doctor.maxPatientsPerDay) > 0 ? Number(doctor.maxPatientsPerDay) : 30);
    const bt = Array.isArray(doctor.breakTimes) ? doctor.breakTimes : [];
    setBreaks(bt.map((b: any) => ({
      day:   (b.day || 'ALL').toString().toUpperCase(),
      start: b.start || '13:00',
      end:   b.end   || '14:00',
      label: b.label || 'Lunch',
    })));
  }, [open, doctor, initialTab]);

  // ---- Save handlers ------------------------------------------------------

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.replace(/[^0-9]/g, '').slice(-10))) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    try {
      setSaving(true);
      await doctorService.updateDoctor(doctor.id, {
        firstName, lastName, qualification, specialization,
        mobile, email, isActive,
      } as any);
      toast.success('Profile updated');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const saveFee = async () => {
    const value = Number(fee);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Consultation fee must be a non-negative number');
      return;
    }
    try {
      setSaving(true);
      await doctorService.updateDoctor(doctor.id, { consultationFee: value } as any);
      toast.success('Consultation fee updated');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update fee');
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async () => {
    // Basic validation: every "open" day needs a valid start < end window
    for (const d of DAYS) {
      const h = hours[d.key];
      if (h.open) {
        if (!h.start || !h.end || h.start >= h.end) {
          toast.error(`${d.label}: end time must be after start time`);
          return;
        }
      }
    }
    try {
      setSaving(true);
      await doctorService.updateSchedule(doctor.id, {
        workingHours: hours,
        slotDuration,
        maxPatientsPerDay: maxPatients,
        breakTimes: breaks,
      });
      toast.success('Schedule updated');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  // ---- Derived ------------------------------------------------------------

  const currentFee = Number(doctor?.consultationFee || 0);
  const feeDelta   = fee - currentFee;
  const feeIsHigher = feeDelta > 0;
  const feeIsLower  = feeDelta < 0;

  const totalOpenHours = useMemo(() => {
    let total = 0;
    for (const d of DAYS) {
      const h = hours[d.key];
      if (!h.open) continue;
      const [sh, sm] = h.start.split(':').map(Number);
      const [eh, em] = h.end.split(':').map(Number);
      total += (eh + em / 60) - (sh + sm / 60);
    }
    return total;
  }, [hours]);

  const slotsPerWeek = Math.floor((totalOpenHours * 60) / Math.max(1, slotDuration));

  // ---- Render -------------------------------------------------------------

  const tone = theme.customGradients?.brand
    || `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <Box sx={{ background: tone, color: '#fff', px: 3, py: 2.25, position: 'relative' }}>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}>
          <Close />
        </IconButton>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: 2, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: alpha('#ffffff', 0.18), border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <AutoAwesome />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
              Edit doctor — Dr. {doctor?.firstName} {doctor?.lastName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Update profile, consultation fee or weekly schedule. Changes apply
              instantly to new bookings.
            </Typography>
          </Box>
        </Stack>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          TabIndicatorProps={{ sx: { background: '#fff', height: 3, borderRadius: 1.5 } }}
          sx={{ mt: 1.5, '& .MuiTab-root': { color: alpha('#fff', 0.85), textTransform: 'none', fontWeight: 700, minHeight: 40 } }}
        >
          <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Profile" />
          <Tab icon={<CurrencyRupee sx={{ fontSize: 18 }} />} iconPosition="start" label="Consultation fee" />
          <Tab icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" label="Schedule" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: theme.palette.background.default }}>
        {/* ----- TAB 0 — PROFILE ----- */}
        {tab === 0 && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last name" value={lastName}
                  onChange={(e) => setLastName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Specialization" value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Qualification" value={qualification}
                  onChange={(e) => setQualification(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Mobile" value={mobile}
                  onChange={(e) => setMobile(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {isActive ? 'Active — accepting new bookings' : 'Inactive — hidden from booking'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Inactive doctors are hidden from the appointment screen and OPD queue,
                    but their existing patients and records remain accessible.
                  </Typography>
                </Box>
                <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* ----- TAB 1 — FEE ----- */}
        {tab === 1 && (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{
              p: 2.5, borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Current fee
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    ₹{currentFee.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    New fee
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    ₹{Number(fee || 0).toLocaleString('en-IN')}
                  </Typography>
                  {feeDelta !== 0 && (
                    <Chip
                      size="small"
                      label={`${feeIsHigher ? '▲' : '▼'} ₹${Math.abs(feeDelta).toLocaleString('en-IN')} (${
                        currentFee > 0 ? Math.round((feeDelta / currentFee) * 100) : 100
                      }%)`}
                      color={feeIsHigher ? 'success' : feeIsLower ? 'warning' : 'default'}
                      sx={{ mt: 0.5, fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Stack>
            </Paper>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Quick set</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {FEE_PRESETS.map((p) => (
                  <Chip
                    key={p}
                    label={`₹${p}`}
                    onClick={() => setFee(p)}
                    color={fee === p ? 'primary' : 'default'}
                    variant={fee === p ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 700, fontSize: 13 }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              fullWidth
              type="number"
              label="Consultation fee"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start"><CurrencyRupee fontSize="small" /></InputAdornment>,
              }}
              helperText="Charged once per OPD encounter. The patient's bill collects this first; pharmacy and lab charges are tracked separately."
            />
          </Stack>
        )}

        {/* ----- TAB 2 — SCHEDULE ----- */}
        {tab === 2 && (
          <Stack spacing={2}>
            {/* Summary strip */}
            <Paper variant="outlined" sx={{
              p: 2, borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)} 0%, ${alpha(theme.palette.info.main, 0.01)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
            }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Open days</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {DAYS.filter((d) => hours[d.key].open).length} / 7
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Hours / week</Typography>
                  <Typography variant="h6" fontWeight={800}>{totalOpenHours.toFixed(1)} h</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Slot length</Typography>
                  <Typography variant="h6" fontWeight={800}>{slotDuration} min</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Max slots / week</Typography>
                  <Typography variant="h6" fontWeight={800}>{slotsPerWeek}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Working hours weekly grid */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Weekly working hours</Typography>
              <Stack spacing={1}>
                {DAYS.map((d) => {
                  const h = hours[d.key];
                  return (
                    <Paper key={d.key} variant="outlined" sx={{
                      p: 1.25, borderRadius: 2,
                      borderColor: h.open ? alpha(theme.palette.success.main, 0.3) : 'divider',
                      background: h.open ? alpha(theme.palette.success.main, 0.04) : 'transparent',
                    }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5}>
                        <FormControlLabel
                          sx={{ minWidth: 110, m: 0 }}
                          control={<Switch
                            size="small"
                            checked={h.open}
                            onChange={(e) => setHours({ ...hours, [d.key]: { ...h, open: e.target.checked } })}
                          />}
                          label={<Typography fontWeight={700}>{d.label}</Typography>}
                        />
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, opacity: h.open ? 1 : 0.5 }}>
                          <TextField
                            size="small"
                            type="time"
                            label="From"
                            value={h.start}
                            disabled={!h.open}
                            onChange={(e) => setHours({ ...hours, [d.key]: { ...h, start: e.target.value } })}
                            sx={{ width: 130 }}
                            InputLabelProps={{ shrink: true }}
                          />
                          <Typography variant="body2" color="text.secondary">to</Typography>
                          <TextField
                            size="small"
                            type="time"
                            label="To"
                            value={h.end}
                            disabled={!h.open}
                            onChange={(e) => setHours({ ...hours, [d.key]: { ...h, end: e.target.value } })}
                            sx={{ width: 130 }}
                            InputLabelProps={{ shrink: true }}
                          />
                          {h.open ? (
                            <Chip size="small" icon={<EventAvailable />} label="Open" color="success" />
                          ) : (
                            <Chip size="small" icon={<EventBusy />} label="Closed" />
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>

            {/* Slot config */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Slot length</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={slotDuration}
                  onChange={(_, v) => v && setSlotDuration(v)}
                  sx={{ flexWrap: 'wrap', gap: 0.5 }}
                >
                  {[10, 15, 20, 30, 45, 60].map((m) => (
                    <ToggleButton key={m} value={m} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      {m} min
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Max patients / day — <Box component="span" color="primary.main">{maxPatients}</Box>
                </Typography>
                <Slider
                  min={1} max={100} step={1}
                  value={maxPatients}
                  onChange={(_, v) => setMaxPatients(v as number)}
                  marks={[{ value: 10, label: '10' }, { value: 30, label: '30' }, { value: 60, label: '60' }, { value: 100, label: '100' }]}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Breaks */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Daily breaks</Typography>
                <Button
                  size="small"
                  startIcon={<AddCircleOutline />}
                  onClick={() => setBreaks([...breaks, { day: 'ALL', start: '13:00', end: '14:00', label: 'Lunch' }])}
                  sx={{ textTransform: 'none' }}
                >
                  Add break
                </Button>
              </Stack>
              {breaks.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No breaks configured. The OPD queue will run uninterrupted across each day's working hours.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {breaks.map((b, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                          select size="small" label="Day"
                          value={b.day}
                          onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, day: e.target.value as any } : x))}
                          sx={{ width: 130 }}
                        >
                          <MenuItem value="ALL">All days</MenuItem>
                          {DAYS.map((d) => <MenuItem key={d.key} value={d.key}>{d.label}</MenuItem>)}
                        </TextField>
                        <TextField
                          size="small" type="time" label="From"
                          value={b.start}
                          onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
                          sx={{ width: 130 }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          size="small" type="time" label="To"
                          value={b.end}
                          onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
                          sx={{ width: 130 }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          size="small" label="Label"
                          value={b.label || ''}
                          onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                          sx={{ flex: 1 }}
                        />
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => setBreaks(breaks.filter((_, j) => j !== i))}>
                            <RemoveCircleOutline />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Reset to defaults */}
            <Stack direction="row" justifyContent="flex-end">
              <Button
                size="small"
                startIcon={<RestartAlt />}
                onClick={() => { setHours(DEFAULT_HOURS); setSlotDuration(15); setMaxPatients(30); setBreaks([]); }}
                sx={{ textTransform: 'none' }}
              >
                Reset to defaults
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AccessTime />}
          disabled={saving}
          onClick={tab === 0 ? saveProfile : tab === 1 ? saveFee : saveSchedule}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {tab === 0 ? 'Save profile' : tab === 1 ? 'Save fee' : 'Save schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoctorEditDialog;
