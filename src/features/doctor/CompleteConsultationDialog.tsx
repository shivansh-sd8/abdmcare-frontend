import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, Grid,
  Divider, Chip, Autocomplete, CircularProgress, Tooltip,
  Paper, Alert, Tabs, Tab, Badge, useTheme,
  FormControlLabel, Switch,
} from '@mui/material';
import {
  Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon,
  Save as SaveIcon, CheckCircle as CompleteIcon,
  Medication as MedIcon, Science as LabIcon,
  Person as PersonIcon, MonitorHeart as VitalsIcon,
  Notes as NotesIcon, Vaccines as RxIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import encounterService from '../../services/encounterService';
import vitalsService from '../../services/vitalsService';
import ipdService from '../../services/ipdService';
import {
  COMMON_MEDICINES, FREQUENCIES, DURATIONS, INSTRUCTIONS, DOSAGES,
  COMMON_TESTS, COMMON_COMPLAINTS, COMMON_DIAGNOSES,
  COMMON_PATIENT_INSTRUCTIONS, FOLLOW_UP_DAYS,
  splitChips, joinChips,
} from '../../utils/clinicalDictionaries';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Medicine {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface LabOrder {
  testName: string;
  testType?: string;
  priority?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  encounter: any;
  onSaved: () => void;
}

// ─── Empty templates ──────────────────────────────────────────────────────────

const EMPTY_MED: Medicine = { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' };

// ─── QuickPill: small click-to-fill button ────────────────────────────────────

const QuickPill: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active, onClick }) => {
  const t = useTheme();
  const dark = t.palette.mode === 'dark';
  return (
    <Chip
      label={label}
      size="small"
      onClick={onClick}
      sx={{
        height: 22, fontSize: 11, cursor: 'pointer',
        bgcolor: active
          ? '#1a3c6e'
          : (dark ? 'rgba(255,255,255,0.07)' : '#f0f4f8'),
        color: active ? 'white' : (dark ? 'text.primary' : '#555'),
        border: active ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#dde3ea'}`,
        fontWeight: active ? 700 : 400,
        '&:hover': { bgcolor: active ? '#163260' : (dark ? 'rgba(255,255,255,0.12)' : '#dde3ea') },
      }}
    />
  );
};

// ─── Section label ─────────────────────────────────────────────────────────────

const SLabel: React.FC<{ text: string }> = ({ text }) => (
  <Typography variant="caption" fontWeight={700} color="#1a3c6e" letterSpacing={0.8}
    sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
    {text}
  </Typography>
);

// ─── Vitals banner ────────────────────────────────────────────────────────────

const VitalsBanner: React.FC<{ patientId?: string }> = ({ patientId }) => {
  const t = useTheme();
  const dark = t.palette.mode === 'dark';
  const [vitals, setVitals] = useState<any>(null);

  useEffect(() => {
    if (!patientId) return;
    vitalsService.getLatestVitals(patientId)
      .then((res: any) => {
        const v = res.data?.data || res.data;
        if (v) setVitals(v);
      })
      .catch(() => {/* no vitals yet */});
  }, [patientId]);

  if (!vitals) return null;

  const items = [
    vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic
      ? `BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}` : null,
    vitals.heartRate    ? `Pulse: ${vitals.heartRate} bpm`  : null,
    vitals.temperature  ? `Temp: ${vitals.temperature}°C`   : null,
    vitals.oxygenSaturation ? `SpO₂: ${vitals.oxygenSaturation}%` : null,
    vitals.weight       ? `Wt: ${vitals.weight} kg`         : null,
    vitals.height       ? `Ht: ${vitals.height} cm`         : null,
    vitals.bmi          ? `BMI: ${vitals.bmi}`              : null,
  ].filter(Boolean);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', px: 2, py: 0.75,
      bgcolor: dark ? 'rgba(41,128,185,0.12)' : '#eaf4fb',
      borderBottom: '1px solid',
      borderColor: dark ? 'rgba(190,227,248,0.2)' : '#bee3f8' }}>
      <VitalsIcon sx={{ fontSize: 16, color: '#2980b9', alignSelf: 'center' }} />
      {items.map((item) => (
        <Typography key={item as string} variant="caption" fontWeight={600}
          color={dark ? '#5dade2' : '#1a5276'}>
          {item}
        </Typography>
      ))}
    </Box>
  );
};

// ─── Patient History Panel ─────────────────────────────────────────────────────

const PatientHistoryPanel: React.FC<{ patientId?: string; currentEncounterId?: string }> = ({ patientId, currentEncounterId }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    encounterService.getAllEncounters({ patientId, limit: 10 })
      .then((res: any) => {
        const data = res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : (data.encounters || data.data || []);
        setHistory(list.filter((e: any) => e.id !== currentEncounterId).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId, currentEncounterId]);

  if (loading) return <Box sx={{ p: 1.5 }}><CircularProgress size={16} /></Box>;
  if (history.length === 0) return null;

  return (
    <Box sx={{
      width: 260, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider',
      overflowY: 'auto', p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fafbfc',
      display: { xs: 'none', lg: 'block' },
    }}>
      <Typography variant="caption" fontWeight={700} color="#1a3c6e" display="block" mb={1}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
        Past Visits ({history.length})
      </Typography>
      {history.map((h: any, idx: number) => (
        <Paper key={h.id || idx} elevation={0} sx={{
          p: 1, mb: 1, borderRadius: 1.5,
          border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize={10}>
            {h.visitDate ? new Date(h.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            {h.type ? ` · ${h.type}` : ''}
          </Typography>
          {(h.finalDiagnosis || h.diagnosis) && (
            <Typography variant="body2" fontSize={11} fontWeight={600} color="#1a3c6e" sx={{ mt: 0.25 }}>
              {h.finalDiagnosis || h.diagnosis}
            </Typography>
          )}
          {h.chiefComplaint && (
            <Typography variant="caption" color="text.secondary" fontSize={10} display="block" sx={{ mt: 0.25 }}>
              CC: {h.chiefComplaint.substring(0, 60)}{h.chiefComplaint.length > 60 ? '...' : ''}
            </Typography>
          )}
          <Chip label={h.status?.replace(/_/g, ' ')} size="small"
            sx={{ height: 16, fontSize: 9, mt: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f4f8' }} />
        </Paper>
      ))}
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ConsultationDialog: React.FC<Props> = ({ open, onClose, encounter, onSaved }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Centralised theme-aware colours
  const C = {
    cardBg:        isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    cardBorder:    isDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0',
    rowBg:         isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
    rowBgAlt:      isDark ? 'rgba(255,255,255,0.05)' : 'white',
    headerBg:      isDark ? 'rgba(255,255,255,0.06)' : '#f0f4f8',
    selectedBg:    isDark ? 'rgba(26,60,110,0.40)'  : '#eef2f9',
    orderedBg:     isDark ? 'rgba(26,60,110,0.20)'  : '#f0f4fa',
    orderedBorder: isDark ? '#1a3c6e'               : '#bee0f0',
    checkboxBg:    isDark ? 'rgba(255,255,255,0.06)' : 'white',
    activeBorder:  '#1a3c6e',
  };

  const [tab, setTab] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loadingEnc, setLoadingEnc] = useState(false);
  const [autoSaved,  setAutoSaved]  = useState<Date | null>(null);

  // Clinical fields
  const [chiefComplaint,          setChiefComplaint]          = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [physicalExamination,     setPhysicalExamination]     = useState('');
  const [provisionalDiagnosis,    setProvisionalDiagnosis]    = useState('');
  const [finalDiagnosis,          setFinalDiagnosis]          = useState('');
  const [notes,                   setNotes]                   = useState('');
  const [followUpDays,            setFollowUpDays]            = useState('');
  // Doctor's "Recommend admission" toggle. When true, the encounter carries
  // an admissionRequired flag + reason, which surfaces a clear "ADMISSION
  // RECOMMENDED" badge on the appointment row, patient profile and IPD admit
  // dialog so the receptionist / admin doesn't need to chase the doctor.
  const [admissionRequired,  setAdmissionRequired]  = useState(false);
  const [admissionReason,    setAdmissionReason]    = useState('');

  // Whether this patient is _already_ admitted (active IPD admission
  // somewhere). When true, we hide the "Recommend admission" disposition
  // toggle entirely — it would be both confusing UI and a no-op for the
  // receptionist who already has the patient on a bed.
  // We detect this from three signals, in order of cheapness:
  //   1. The encounter object itself: type === 'IPD', or it has an
  //      admissionId (this encounter is an IPD daily round), or it
  //      already has an originating admission attached.
  //   2. A best-effort lookup against active admissions by patient id.
  const [alreadyAdmitted, setAlreadyAdmitted] = useState(false);

  // Rx + investigations
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);

  // Focused medicine row for quick-picks
  const [focusedMedIdx, setFocusedMedIdx] = useState<number | null>(null);
  const [focusedMedField, setFocusedMedField] = useState<keyof Medicine | null>(null);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load encounter ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !encounter?.id) return;
    setLoadingEnc(true);
    setTab(0);
    encounterService.getEncounterById(encounter.id)
      .then((res: any) => {
        const e = res.data?.data || res.data || encounter;
        setChiefComplaint(e.chiefComplaint || '');
        setHistoryOfPresentIllness(e.historyOfPresentIllness || '');
        setPhysicalExamination(e.physicalExamination || '');
        setProvisionalDiagnosis(e.provisionalDiagnosis || '');
        setFinalDiagnosis(e.finalDiagnosis || e.diagnosis || '');
        setNotes(e.notes || '');
        setFollowUpDays('');
        setAdmissionRequired(!!e.admissionRequired);
        setAdmissionReason(e.admissionReason || '');
        setMedicines(
          (e.prescriptions || []).map((rx: any) => ({
            medicineName: rx.medicineName || '',
            dosage:       rx.dosage       || '',
            frequency:    rx.frequency    || '',
            duration:     rx.duration     || '',
            instructions: rx.instructions || '',
          }))
        );
        setLabOrders(
          (e.labOrders || []).map((o: any) => ({
            testName: o.testName || '',
            testType: o.testType,
            priority: o.priority || 'ROUTINE',
          }))
        );
      })
      .catch(() => {
        setChiefComplaint(encounter.chiefComplaint || '');
        setFinalDiagnosis(encounter.diagnosis      || '');
        setNotes(encounter.notes                   || '');
      })
      .finally(() => setLoadingEnc(false));
  }, [open, encounter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build payload ───────────────────────────────────────────────────────────

  const buildPayload = useCallback(() => ({
    chiefComplaint,
    historyOfPresentIllness,
    physicalExamination,
    provisionalDiagnosis,
    finalDiagnosis,
    notes,
    followUpDate: followUpDays
      ? new Date(Date.now() + parseInt(followUpDays) * 86400000).toISOString()
      : undefined,
    // If the patient is already admitted, never send a stale
    // `admissionRequired` flag — even if the encounter previously had
    // one set, the situation no longer applies.
    admissionRequired: alreadyAdmitted ? false : admissionRequired,
    admissionReason: alreadyAdmitted
      ? undefined
      : (admissionRequired ? admissionReason : undefined),
    prescriptions: medicines.filter((m) => m.medicineName.trim()),
    labOrders:     labOrders.filter((l) => l.testName.trim()),
  }), [chiefComplaint, historyOfPresentIllness, physicalExamination,
       provisionalDiagnosis, finalDiagnosis, notes, followUpDays,
       admissionRequired, admissionReason, medicines, labOrders,
       alreadyAdmitted]);

  // ── Auto-save ───────────────────────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    if (!encounter?.id) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await encounterService.updateConsultation(encounter.id, buildPayload());
        setAutoSaved(new Date());
      } catch (e: any) {
        console.warn('[AutoSave] Failed to save draft:', e?.response?.data?.message ?? e?.message);
        // Non-blocking: show toast only for persistent failures, not transient ones
      }
    }, 4000);
  }, [encounter?.id, buildPayload]);

  useEffect(() => { triggerAutoSave(); }, [
    chiefComplaint, historyOfPresentIllness, physicalExamination,
    provisionalDiagnosis, finalDiagnosis, notes, followUpDays,
    admissionRequired, admissionReason, medicines, labOrders,
    triggerAutoSave,
  ]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  // ── Detect whether the patient is already admitted ──────────────────────────
  useEffect(() => {
    if (!open || !encounter?.patient?.id) { setAlreadyAdmitted(false); return; }
    // Cheap signals straight from the encounter payload first.
    const cheap = Boolean(
      encounter?.type === 'IPD' ||
      (encounter as any)?.admissionId ||
      (encounter as any)?.ipdAdmission?.id ||
      (Array.isArray((encounter as any)?.admissions) && (encounter as any).admissions.length > 0)
    );
    if (cheap) { setAlreadyAdmitted(true); return; }

    let cancelled = false;
    const patientId = encounter.patient.id;
    Promise.all([
      ipdService.listAdmissions({ status: 'ADMITTED' }).catch(() => null),
      ipdService.listAdmissions({ status: 'DISCHARGE_READY' }).catch(() => null),
    ]).then((results) => {
      if (cancelled) return;
      const all = results.flatMap((r: any) =>
        r?.data?.data?.admissions || r?.data?.admissions || []
      );
      setAlreadyAdmitted(all.some((a: any) => a?.patient?.id === patientId));
    });
    return () => { cancelled = true; };
  }, [open, encounter?.id, encounter?.patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Medicine helpers ────────────────────────────────────────────────────────

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { ...EMPTY_MED }]);
    setTimeout(() => setFocusedMedIdx(medicines.length), 50);
  };

  const removeMedicine = (i: number) => {
    setMedicines((prev) => prev.filter((_, idx) => idx !== i));
    if (focusedMedIdx === i) setFocusedMedIdx(null);
  };

  const updateMedicine = (i: number, field: keyof Medicine, value: string) =>
    setMedicines((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });

  // Apply quick-pick to the focused field of the focused row
  const applyQuickPick = (value: string) => {
    if (focusedMedIdx !== null && focusedMedField !== null) {
      updateMedicine(focusedMedIdx, focusedMedField, value);
    }
  };

  // ── Lab order helpers ───────────────────────────────────────────────────────

  const toggleTest = (test: { name: string; type: string }) => {
    const exists = labOrders.findIndex((l) => l.testName === test.name);
    if (exists >= 0) {
      setLabOrders((prev) => prev.filter((_, i) => i !== exists));
    } else {
      setLabOrders((prev) => [...prev, { testName: test.name, testType: test.type, priority: 'ROUTINE' }]);
    }
  };

  const isTestSelected = (name: string) => labOrders.some((l) => l.testName === name);

  const addCustomTest = () =>
    setLabOrders((prev) => [...prev, { testName: '', testType: '', priority: 'ROUTINE' }]);

  const removeLabOrder = (i: number) =>
    setLabOrders((prev) => prev.filter((_, idx) => idx !== i));

  // ── Save / Complete ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      await encounterService.updateConsultation(encounter.id, buildPayload());
      setAutoSaved(new Date());
      toast.success('Consultation saved');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!finalDiagnosis.trim()) {
      toast.warning('Enter the final diagnosis before completing');
      setTab(0);
      return;
    }
    setCompleting(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      await encounterService.updateConsultation(encounter.id, buildPayload());
      await encounterService.completeEncounter(encounter.id, {
        diagnosis: finalDiagnosis,
        notes,
        prescription:     medicines.filter((m) => m.medicineName.trim()),
        labTestsOrdered:  labOrders.filter((l) => l.testName.trim()),
        followUpDate: followUpDays
          ? new Date(Date.now() + parseInt(followUpDays) * 86400000)
          : undefined,
      } as any);
      toast.success('Consultation completed!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    } finally { setCompleting(false); }
  };

  // ── Quick-pick panel (shown when a medicine row is focused) ─────────────────

  const QuickPickPanel = () => {
    if (focusedMedIdx === null) return null;
    const field = focusedMedField;
    return (
      <Box sx={{ p: 1.5, bgcolor: C.cardBg, border: '1px solid', borderColor: C.cardBorder, borderRadius: 2, mb: 1.5 }}>
        {(field === null || field === 'frequency') && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
              Frequency:
            </Typography>
            {FREQUENCIES.map((f) => (
              <QuickPill key={f} label={f}
                active={field === 'frequency' && medicines[focusedMedIdx]?.frequency === f}
                onClick={() => { updateMedicine(focusedMedIdx, 'frequency', f); setFocusedMedField('frequency'); }}
              />
            ))}
          </Box>
        )}
        {(field === null || field === 'duration') && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
              Duration:
            </Typography>
            {DURATIONS.map((d) => (
              <QuickPill key={d} label={d}
                active={field === 'duration' && medicines[focusedMedIdx]?.duration === d}
                onClick={() => { updateMedicine(focusedMedIdx, 'duration', d); setFocusedMedField('duration'); }}
              />
            ))}
          </Box>
        )}
        {(field === null || field === 'instructions') && (
          <Box sx={{ mb: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
              Instructions:
            </Typography>
            {INSTRUCTIONS.map((ins) => (
              <QuickPill key={ins} label={ins}
                active={field === 'instructions' && medicines[focusedMedIdx]?.instructions === ins}
                onClick={() => { updateMedicine(focusedMedIdx, 'instructions', ins); setFocusedMedField('instructions'); }}
              />
            ))}
          </Box>
        )}
        {field === 'dosage' && (
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 1 }}>
              Dosage:
            </Typography>
            {DOSAGES.map((d) => (
              <QuickPill key={d} label={d}
                active={medicines[focusedMedIdx]?.dosage === d}
                onClick={() => applyQuickPick(d)}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  if (loadingEnc) {
    return (
      <Dialog open={open} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const patientName = `${encounter?.patient?.firstName || ''} ${encounter?.patient?.lastName || ''}`.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth
      PaperProps={{ sx: { maxHeight: '95vh', height: '95vh' } }}>

      {/* ── Title bar ── */}
      <DialogTitle sx={{ bgcolor: '#1a3c6e', color: 'white', py: 1.25, px: 2.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {patientName || 'Patient Consultation'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25 }}>
              {encounter?.patient?.uhid && (
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {encounter.patient.uhid}
                </Typography>
              )}
              <Chip label={encounter?.status?.replace(/_/g, ' ')} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', height: 18, fontSize: 10 }} />
              {encounter?.type && (
                <Chip label={encounter.type} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white', height: 18, fontSize: 10 }} />
              )}
              {/* Quick visual cue when this consult already carries an
                  admission recommendation. Saves the doctor from looking down
                  at the disposition panel just to know what they decided.
                  Suppressed once the patient is already admitted — at that
                  point the recommendation is meaningless. */}
              {admissionRequired && !alreadyAdmitted && (
                <Chip
                  label="ADMIT RECOMMENDED"
                  size="small"
                  sx={{
                    bgcolor: '#F39C12',
                    color: 'white',
                    fontWeight: 700,
                    height: 18,
                    fontSize: 10,
                    letterSpacing: 0.4,
                  }}
                />
              )}
              {alreadyAdmitted && (
                <Chip
                  label="ADMITTED"
                  size="small"
                  sx={{
                    bgcolor: '#27AE60',
                    color: 'white',
                    fontWeight: 700,
                    height: 18,
                    fontSize: 10,
                    letterSpacing: 0.4,
                  }}
                />
              )}
              {autoSaved && (
                <Chip
                  size="small"
                  icon={<SaveIcon sx={{ fontSize: 12, color: 'inherit !important' }} />}
                  label={`Auto-saved ${autoSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  sx={{
                    bgcolor: 'rgba(80,200,120,0.22)',
                    color: 'white',
                    height: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    '& .MuiChip-icon': { color: 'white', ml: 0.5, mr: -0.5 },
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Vitals banner ── */}
      <VitalsBanner patientId={encounter?.patient?.id || encounter?.patientId} />

      {/* ── Tab bar ── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40 }}>
          <Tab icon={<NotesIcon sx={{ fontSize: 16 }} />} iconPosition="start"
            label="Clinical Notes" sx={{ minHeight: 40, fontSize: 12, textTransform: 'none' }} />
          <Tab
            icon={<RxIcon sx={{ fontSize: 16 }} />} iconPosition="start"
            label={
              <Badge badgeContent={medicines.length || null} color="primary" sx={{ mr: 1 }}>
                Prescription
              </Badge>
            }
            sx={{ minHeight: 40, fontSize: 12, textTransform: 'none' }}
          />
          <Tab
            icon={<LabIcon sx={{ fontSize: 16 }} />} iconPosition="start"
            label={
              <Badge badgeContent={labOrders.length || null} color="warning" sx={{ mr: 1 }}>
                Investigations
              </Badge>
            }
            sx={{ minHeight: 40, fontSize: 12, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* ── Content ── */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', flex: 1, display: 'flex' }}>

        {/* ═══ TAB 0: CLINICAL NOTES ══════════════════════════════════════════ */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
          <Grid container spacing={2}>
              {/* Chief Complaint — multi-select chips. Doctors typically
                  list two or three concurrent complaints (e.g. "Fever",
                  "Cough", "Body ache"); chip UI captures that natively
                  while still allowing free typing. Persisted as a single
                  string joined with `; ` so the backend column stays the
                  same. */}
            <Grid item xs={12}>
                <SLabel text="Chief Complaint" />
                <Autocomplete
                  multiple freeSolo
                  options={COMMON_COMPLAINTS}
                  value={splitChips(chiefComplaint)}
                  onChange={(_, v) => setChiefComplaint(joinChips(v as string[]))}
                  filterSelectedOptions
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        size="small" variant="filled" color="primary"
                        label={option}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth size="small"
                      placeholder={
                        splitChips(chiefComplaint).length === 0
                          ? 'Add complaints — pick or type and press Enter…'
                          : 'Add another complaint…'
                      }
                    />
                  )}
                />
              </Grid>

              {/* HPI gets the most narrative space — 8/12 cols and 5 rows
                  — because it is where the doctor actually thinks. The
                  examination column is documented more briefly in
                  primary care (4/12). Both stay free-text multi-line
                  (no chips) since they are paragraphs, not enumerable. */}
              <Grid item xs={12} md={8}>
                <SLabel text="History of Present Illness" />
                <TextField fullWidth multiline rows={5} size="small"
                  placeholder="Duration, onset, progression, associated symptoms, aggravating/relieving factors…"
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <SLabel text="Physical Examination" />
                <TextField fullWidth multiline rows={5} size="small"
                  placeholder="General + systemic examination findings…"
                  value={physicalExamination}
                  onChange={(e) => setPhysicalExamination(e.target.value)} />
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Diagnosis — multi-select chips. A patient may have a
                  primary + comorbidity diagnosis (e.g. "Type 2 DM —
                  uncontrolled" + "Hypertension — controlled"). Free text
                  remains supported. */}
              <Grid item xs={12} md={6}>
                <SLabel text="Provisional Diagnosis" />
                <Autocomplete
                  multiple freeSolo
                  options={COMMON_DIAGNOSES}
                  value={splitChips(provisionalDiagnosis)}
                  onChange={(_, v) => setProvisionalDiagnosis(joinChips(v as string[]))}
                  filterSelectedOptions
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip size="small" variant="outlined"
                        label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small"
                      placeholder="Working diagnosis — pick or type, press Enter to add another" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SLabel text="Final Diagnosis ✱" />
                <Autocomplete
                  multiple freeSolo
                  options={COMMON_DIAGNOSES}
                  value={splitChips(finalDiagnosis)}
                  onChange={(_, v) => setFinalDiagnosis(joinChips(v as string[]))}
                  filterSelectedOptions
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip size="small" variant="filled" color="success"
                        label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth size="small"
                      placeholder="Confirmed diagnosis (required to complete)"
                      error={!finalDiagnosis.trim()}
                      helperText={!finalDiagnosis.trim() ? 'Required before finalising' : ''}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Patient instructions — multi-select chips. Most plans
                  combine 2–4 short instructions ("Steam inhalation 2–3
                  times a day" + "Salt-restricted diet" + "Return if
                  breathlessness"). Chips make this fast and prescription
                  prints render each chip as a bullet. */}
              <Grid item xs={12} md={8}>
                <SLabel text="Notes / Instructions for Patient" />
                <Autocomplete
                  multiple freeSolo
                  options={COMMON_PATIENT_INSTRUCTIONS}
                  value={splitChips(notes)}
                  onChange={(_, v) => setNotes(joinChips(v as string[]))}
                  filterSelectedOptions
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip size="small" variant="outlined"
                        label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth size="small"
                      placeholder="Pick a suggestion or type a custom instruction…"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <SLabel text="Follow-up After (days)" />
                <TextField fullWidth type="number" size="small"
                  placeholder="e.g. 7"
                value={followUpDays}
                  onChange={(e) => setFollowUpDays(e.target.value)} />
                {/* Quick-pick chips — saves the doctor a keystroke for the
                    common follow-up windows (3 / 7 / 14 / 30 days). */}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                  {FOLLOW_UP_DAYS.map((d) => (
                    <Chip
                      key={d}
                      label={`${d}d`}
                      size="small"
                      variant={String(d) === String(followUpDays) ? 'filled' : 'outlined'}
                      color={String(d) === String(followUpDays) ? 'primary' : 'default'}
                      onClick={() => setFollowUpDays(String(d))}
                      sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
                {followUpDays && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Follow-up on:{' '}
                    {new Date(Date.now() + parseInt(followUpDays) * 86400000)
                      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
              </Grid>

              {/* ─── Plan & Disposition ────────────────────────────────────
                  The doctor's "what next?" decision. Recommending admission
                  here flips Encounter.admissionRequired = true with a reason,
                  which surfaces a clear "ADMISSION RECOMMENDED" badge on the
                  appointment row, patient profile and IPD admit dialog so
                  whoever picks up the next step (admin / receptionist) sees
                  it without asking the doctor again.

                  Hidden once the patient is already admitted — at that
                  point the recommendation is meaningless and confusing. */}
              {!alreadyAdmitted && (
                <>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12}>
                    <SLabel text="Disposition" />
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: admissionRequired ? 'warning.main' : 'divider',
                        bgcolor: admissionRequired ? 'warning.light' : 'transparent',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={admissionRequired}
                            onChange={(e) => setAdmissionRequired(e.target.checked)}
                            color="warning"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              Recommend admission
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              The receptionist will see "Admission recommended" on this patient
                              and can admit them from the appointment list, encounter list, or patient profile.
                            </Typography>
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', m: 0 }}
                      />
                      {admissionRequired && (
                        <TextField
                          fullWidth multiline rows={2} size="small"
                          sx={{ mt: 1.5 }}
                          placeholder="Clinical reason for admission (e.g. moderate dehydration needing IV fluids, fever > 102°F unresponsive to OPD treatment)"
                          value={admissionReason}
                          onChange={(e) => setAdmissionReason(e.target.value)}
                          label="Reason for admission"
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>

            {encounter?.status !== 'IN_PROGRESS' && encounter?.status !== 'ACTIVE' && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<PersonIcon />}>
                Encounter status is <strong>{encounter?.status}</strong>. You can still edit and save.
              </Alert>
            )}
          </Box>
          <PatientHistoryPanel patientId={encounter?.patient?.id || encounter?.patientId} currentEncounterId={encounter?.id} />
          </Box>
        )}

        {/* ═══ TAB 1: PRESCRIPTION ════════════════════════════════════════════ */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left: medicine rows */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {/* Quick-pick panel */}
              <QuickPickPanel />

              {/* Medicine table header */}
              {medicines.length > 0 && (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: '2.4fr 1fr 1fr 1fr 1.2fr 34px',
                  gap: 0.5, px: 1, py: 0.5,
                  bgcolor: C.headerBg, borderRadius: 1, mb: 0.5,
                }}>
                  {['Medicine', 'Dosage', 'Freq', 'Duration', 'Instructions', ''].map((h) => (
                    <Typography key={h} variant="caption" fontWeight={700} color="text.secondary">{h}</Typography>
                  ))}
                </Box>
              )}

              {/* Medicine rows */}
              {medicines.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <MedIcon sx={{ fontSize: 44, mb: 1, opacity: 0.3 }} />
                  <Typography variant="body2">No medicines prescribed yet</Typography>
                  <Typography variant="caption">Click "Add Medicine" or press the button below</Typography>
                </Box>
              ) : (
                medicines.map((med, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2.4fr 1fr 1fr 1fr 1.2fr 34px',
                      gap: 0.5, px: 1, py: 0.75, mb: 0.5,
                      borderRadius: 1.5,
                      border: '1.5px solid',
                      borderColor: focusedMedIdx === idx ? '#1a3c6e' : C.cardBorder,
                      bgcolor: focusedMedIdx === idx ? C.selectedBg : (idx % 2 ? C.rowBg : C.rowBgAlt),
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFocusedMedIdx(idx)}
                  >
                    {/* Medicine name */}
                    <Autocomplete freeSolo options={COMMON_MEDICINES}
                      value={med.medicineName}
                      onChange={(_, v) => updateMedicine(idx, 'medicineName', v || '')}
                      onInputChange={(_, v) => updateMedicine(idx, 'medicineName', v)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Medicine name" size="small"
                          onFocus={() => { setFocusedMedIdx(idx); setFocusedMedField('medicineName'); }}
                          sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                      )}
                    />

                    {/* Dosage */}
                    <Autocomplete freeSolo options={DOSAGES}
                      value={med.dosage}
                      onChange={(_, v) => updateMedicine(idx, 'dosage', v || '')}
                      onInputChange={(_, v) => updateMedicine(idx, 'dosage', v)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Dosage" size="small"
                          onFocus={() => { setFocusedMedIdx(idx); setFocusedMedField('dosage'); }}
                          sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                      )}
                    />

                    {/* Frequency */}
                    <Autocomplete freeSolo options={FREQUENCIES}
                      value={med.frequency}
                      onChange={(_, v) => updateMedicine(idx, 'frequency', v || '')}
                      onInputChange={(_, v) => updateMedicine(idx, 'frequency', v)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="e.g. OD" size="small"
                          onFocus={() => { setFocusedMedIdx(idx); setFocusedMedField('frequency'); }}
                          sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                      )}
                    />

                    {/* Duration */}
                    <Autocomplete freeSolo options={DURATIONS}
                      value={med.duration}
                      onChange={(_, v) => updateMedicine(idx, 'duration', v || '')}
                      onInputChange={(_, v) => updateMedicine(idx, 'duration', v)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="e.g. 5 days" size="small"
                          onFocus={() => { setFocusedMedIdx(idx); setFocusedMedField('duration'); }}
                          sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                      )}
                    />

                    {/* Instructions */}
                    <Autocomplete freeSolo options={INSTRUCTIONS}
                      value={med.instructions}
                      onChange={(_, v) => updateMedicine(idx, 'instructions', v || '')}
                      onInputChange={(_, v) => updateMedicine(idx, 'instructions', v)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="e.g. After food" size="small"
                          onFocus={() => { setFocusedMedIdx(idx); setFocusedMedField('instructions'); }}
                          sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                      )}
                    />

                    <Tooltip title="Remove">
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); removeMedicine(idx); }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                ))
              )}

              <Button startIcon={<AddIcon />} onClick={addMedicine} fullWidth
                variant="outlined" size="small"
                sx={{
                  mt: 1, borderStyle: 'dashed', border: '1.5px dashed #b0bec5',
                  color: 'text.secondary', borderRadius: 1.5, py: 1,
                  '&:hover': { borderColor: '#1a3c6e', color: '#1a3c6e', bgcolor: C.cardBg },
                }}>
                Add Medicine
              </Button>
            </Box>
            
            {/* Right: quick-pick sidebar (always visible on desktop) */}
            <Box sx={{
              width: 200, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider',
              overflowY: 'auto', p: 1.5, bgcolor: C.cardBg, display: { xs: 'none', md: 'block' },
            }}>
              <Typography variant="caption" fontWeight={700} color="#1a3c6e" display="block" mb={1}>
                QUICK FREQUENCY
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {FREQUENCIES.map((f) => (
                  <QuickPill key={f} label={f}
                    active={focusedMedIdx !== null && medicines[focusedMedIdx]?.frequency === f}
                    onClick={() => { if (focusedMedIdx !== null) updateMedicine(focusedMedIdx, 'frequency', f); }}
                  />
                ))}
          </Box>

              <Typography variant="caption" fontWeight={700} color="#1a3c6e" display="block" mb={1}>
                QUICK DURATION
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {DURATIONS.map((d) => (
                  <QuickPill key={d} label={d}
                    active={focusedMedIdx !== null && medicines[focusedMedIdx]?.duration === d}
                    onClick={() => { if (focusedMedIdx !== null) updateMedicine(focusedMedIdx, 'duration', d); }}
                  />
                ))}
            </Box>
            
              <Typography variant="caption" fontWeight={700} color="#1a3c6e" display="block" mb={1}>
                INSTRUCTIONS
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {INSTRUCTIONS.map((ins) => (
                  <QuickPill key={ins} label={ins}
                    active={focusedMedIdx !== null && medicines[focusedMedIdx]?.instructions === ins}
                    onClick={() => { if (focusedMedIdx !== null) updateMedicine(focusedMedIdx, 'instructions', ins); }}
                  />
                ))}
                  </Box>
                </Box>
          </Box>
        )}

        {/* ═══ TAB 2: INVESTIGATIONS ══════════════════════════════════════════ */}
        {tab === 2 && (
          <Box sx={{ p: 2, overflowY: 'auto', width: '100%' }}>
            {/* Common tests checkbox grid */}
            <SLabel text="Common Tests — click to add/remove" />
            <Grid container spacing={0.75} sx={{ mb: 2 }}>
              {COMMON_TESTS.map((test) => {
                const selected = isTestSelected(test.name);
                return (
                  <Grid item xs={12} sm={6} md={4} key={test.name}>
                    <Paper
                      elevation={0}
                      onClick={() => toggleTest(test)}
                      sx={{
                      p: 1, cursor: 'pointer', borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: selected ? C.activeBorder : C.cardBorder,
                        bgcolor: selected ? C.selectedBg : C.checkboxBg,
                        display: 'flex', alignItems: 'center', gap: 1,
                        '&:hover': { borderColor: C.activeBorder, bgcolor: selected ? C.selectedBg : C.cardBg },
                      }}
                    >
                      <Box sx={{
                        width: 16, height: 16, borderRadius: 0.5,
                        border: '2px solid', borderColor: selected ? '#1a3c6e' : (isDark ? 'rgba(255,255,255,0.3)' : '#b0bec5'),
                        bgcolor: selected ? '#1a3c6e' : C.checkboxBg,
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <Typography sx={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</Typography>}
                      </Box>
          <Box>
                        <Typography variant="body2" fontSize={12} lineHeight={1.2}>{test.name}</Typography>
                        <Typography variant="caption" color="text.disabled" fontSize={10}>{test.type}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            {/* Custom / other tests */}
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <SLabel text="Custom / Other Tests" />
              <Button size="small" startIcon={<AddIcon />} onClick={addCustomTest}
                variant="outlined" sx={{ fontSize: 11, py: 0.25 }}>
                Add
              </Button>
            </Box>
            
            {labOrders.filter((l) => !COMMON_TESTS.find((t) => t.name === l.testName)).map((lab, idx) => {
              const realIdx = labOrders.indexOf(lab);
              return (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <Autocomplete freeSolo options={[]}
                    value={lab.testName}
                    onInputChange={(_, v) => {
                      setLabOrders((prev) => {
                        const u = [...prev]; u[realIdx] = { ...u[realIdx], testName: v }; return u;
                      });
                    }}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Test name" size="small"
                        sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                    )}
                  />
                  <IconButton size="small" color="error" onClick={() => removeLabOrder(realIdx)}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
              );
            })}

            {/* Summary of all ordered */}
            {labOrders.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: C.orderedBg, borderRadius: 2, border: '1px solid', borderColor: C.orderedBorder }}>
                <Typography variant="caption" fontWeight={700} color="#1a3c6e" display="block" mb={0.75}>
                  ORDERED ({labOrders.length} test{labOrders.length !== 1 ? 's' : ''})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {labOrders.map((l, i) => (
                    <Chip key={i} label={l.testName} size="small"
                      onDelete={() => removeLabOrder(i)}
                      sx={{ height: 22, fontSize: 11 }} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* ── Action bar ── */}
      <DialogActions sx={{ px: 2.5, py: 1.25, gap: 1, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {tab !== 1 && (
            <Button size="small" startIcon={<RxIcon />} onClick={() => setTab(1)}
              sx={{ fontSize: 11 }} color="primary" variant="outlined">
              {medicines.length > 0 ? `Rx (${medicines.length})` : 'Add Rx'}
            </Button>
          )}
          {tab !== 2 && (
            <Button size="small" startIcon={<LabIcon />} onClick={() => setTab(2)}
              sx={{ fontSize: 11 }} color="warning" variant="outlined">
              {labOrders.length > 0 ? `Labs (${labOrders.length})` : 'Add Labs'}
            </Button>
          )}
        </Box>

        <Button onClick={onClose} disabled={saving || completing} size="small" color="inherit">
          Close
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={saving ? <CircularProgress size={13} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || completing}
        >
          {saving ? 'Saving…' : 'Save Progress'}
        </Button>
        <Button 
          variant="contained" 
          size="small"
          color="success"
          startIcon={completing ? <CircularProgress size={13} color="inherit" /> : <CompleteIcon />}
          onClick={handleComplete}
          disabled={saving || completing}
        >
          {completing ? 'Completing…' : 'Complete & Finalise'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsultationDialog;
