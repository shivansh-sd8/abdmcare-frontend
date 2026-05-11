import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, Grid,
  Divider, Chip, Autocomplete, CircularProgress, Tooltip,
  Paper, Alert, Tabs, Tab, Badge, useTheme,
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

// ─── Quick-pick data ──────────────────────────────────────────────────────────

const COMMON_MEDICINES = [
  'Paracetamol 500mg', 'Paracetamol 650mg', 'Ibuprofen 400mg', 'Ibuprofen 600mg',
  'Amoxicillin 500mg', 'Amoxicillin 250mg', 'Azithromycin 500mg', 'Azithromycin 250mg',
  'Cetirizine 10mg', 'Levocetirizine 5mg', 'Montelukast 10mg',
  'Omeprazole 20mg', 'Pantoprazole 40mg', 'Rabeprazole 20mg',
  'Metformin 500mg', 'Metformin 1000mg', 'Glimepiride 1mg', 'Glimepiride 2mg',
  'Aspirin 75mg', 'Clopidogrel 75mg',
  'Atorvastatin 10mg', 'Atorvastatin 20mg', 'Rosuvastatin 10mg',
  'Amlodipine 5mg', 'Amlodipine 10mg', 'Telmisartan 40mg', 'Telmisartan 80mg',
  'Metoprolol 25mg', 'Metoprolol 50mg', 'Atenolol 50mg',
  'Doxycycline 100mg', 'Ciprofloxacin 500mg', 'Norfloxacin 400mg',
  'Prednisolone 10mg', 'Prednisolone 20mg', 'Methylprednisolone 4mg',
  'Vitamin D3 60000IU', 'Vitamin B12 500mcg', 'Calcium + Vitamin D',
  'Iron + Folic Acid', 'Multivitamin', 'Zinc 50mg',
];

const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'PRN', 'HS', 'Stat', 'OD AM', 'OD PM'];
const DURATIONS   = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '2 months', '3 months', 'Ongoing'];
const INSTRUCTIONS = ['After food', 'Before food', 'With food', 'Empty stomach', 'At bedtime', 'With warm water', 'Sublingual', 'As needed'];
const DOSAGES     = ['100mg', '250mg', '500mg', '1g', '5mg', '10mg', '20mg', '40mg', '80mg',
                     '1 tablet', '2 tablets', '½ tablet', '5ml', '10ml', '15ml'];

const COMMON_TESTS = [
  { name: 'Complete Blood Count (CBC)',   type: 'HAEMATOLOGY' },
  { name: 'Blood Sugar Fasting',          type: 'BIOCHEMISTRY' },
  { name: 'Blood Sugar Random',           type: 'BIOCHEMISTRY' },
  { name: 'HbA1c',                        type: 'BIOCHEMISTRY' },
  { name: 'Lipid Profile',                type: 'BIOCHEMISTRY' },
  { name: 'Liver Function Test (LFT)',    type: 'BIOCHEMISTRY' },
  { name: 'Kidney Function Test (KFT)',   type: 'BIOCHEMISTRY' },
  { name: 'Serum Creatinine',             type: 'BIOCHEMISTRY' },
  { name: 'Uric Acid',                    type: 'BIOCHEMISTRY' },
  { name: 'Thyroid Profile (T3/T4/TSH)', type: 'BIOCHEMISTRY' },
  { name: 'Vitamin D',                    type: 'BIOCHEMISTRY' },
  { name: 'Vitamin B12',                  type: 'BIOCHEMISTRY' },
  { name: 'Urine Routine & Microscopy',   type: 'MICROBIOLOGY' },
  { name: 'Stool Routine',                type: 'MICROBIOLOGY' },
  { name: 'Electrolytes (Na/K/Cl)',       type: 'BIOCHEMISTRY' },
  { name: 'ECG',                          type: 'CARDIOLOGY'  },
  { name: 'Chest X-Ray PA View',          type: 'RADIOLOGY'   },
  { name: 'Ultrasound Abdomen',           type: 'RADIOLOGY'   },
  { name: 'Blood Culture & Sensitivity',  type: 'MICROBIOLOGY' },
  { name: 'Urine Culture & Sensitivity',  type: 'MICROBIOLOGY' },
];

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
    prescriptions: medicines.filter((m) => m.medicineName.trim()),
    labOrders:     labOrders.filter((l) => l.testName.trim()),
  }), [chiefComplaint, historyOfPresentIllness, physicalExamination,
       provisionalDiagnosis, finalDiagnosis, notes, followUpDays, medicines, labOrders]);

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
    provisionalDiagnosis, finalDiagnosis, notes, followUpDays, medicines, labOrders,
    triggerAutoSave,
  ]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

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
              {autoSaved && (
                <Typography variant="caption" sx={{ opacity: 0.7, fontStyle: 'italic' }}>
                  Auto-saved {autoSaved.toLocaleTimeString()}
                </Typography>
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
          <Box sx={{ p: 2.5, overflowY: 'auto', width: '100%' }}>
          <Grid container spacing={2}>
              {/* Chief Complaint */}
            <Grid item xs={12}>
                <SLabel text="Chief Complaint" />
                <TextField fullWidth multiline rows={2} size="small"
                  placeholder="Primary reason for visit — what is the patient complaining of?"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)} />
              </Grid>

              {/* HPI + Examination side by side */}
              <Grid item xs={12} md={6}>
                <SLabel text="History of Present Illness" />
                <TextField fullWidth multiline rows={4} size="small"
                  placeholder="Duration, onset, progression, associated symptoms, aggravating/relieving factors..."
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <SLabel text="Physical Examination" />
                <TextField fullWidth multiline rows={4} size="small"
                  placeholder="General examination, systemic examination findings..."
                  value={physicalExamination}
                  onChange={(e) => setPhysicalExamination(e.target.value)} />
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Diagnosis */}
              <Grid item xs={12} md={6}>
                <SLabel text="Provisional Diagnosis" />
                <TextField fullWidth size="small"
                  placeholder="Initial working diagnosis..."
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <SLabel text="Final Diagnosis ✱" />
                <TextField fullWidth size="small"
                  placeholder="Confirmed diagnosis (required to complete)"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  error={!finalDiagnosis.trim()}
                  helperText={!finalDiagnosis.trim() ? 'Required before finalising' : ''}
              />
            </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Notes + follow-up */}
              <Grid item xs={12} md={8}>
                <SLabel text="Notes / Instructions for Patient" />
                <TextField fullWidth multiline rows={3} size="small"
                  placeholder="Lifestyle advice, diet modifications, activity restrictions..."
                value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
            </Grid>
              <Grid item xs={12} md={4}>
                <SLabel text="Follow-up After (days)" />
                <TextField fullWidth type="number" size="small"
                  placeholder="e.g. 7"
                value={followUpDays}
                  onChange={(e) => setFollowUpDays(e.target.value)} />
                {followUpDays && (
                  <Typography variant="caption" color="text.secondary">
                    Follow-up on:{' '}
                    {new Date(Date.now() + parseInt(followUpDays) * 86400000)
                      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
              </Grid>
            </Grid>

            {encounter?.status !== 'IN_PROGRESS' && encounter?.status !== 'ACTIVE' && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<PersonIcon />}>
                Encounter status is <strong>{encounter?.status}</strong>. You can still edit and save.
              </Alert>
            )}
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
