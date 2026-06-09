import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  alpha,
  Divider,
  Stack,
} from '@mui/material';
import {
  ExpandMore,
  CloudDownload,
  LocalHospital,
  MedicalServices,
  Science,
  Medication,
  Assessment,
  EventNote,
  InfoOutlined,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import hiuService from '../../services/hiuService';
import consentService from '../../services/consentService';
import { GradientHero, EmptyState, LoadingState } from '../../components/ui';

interface ParsedFHIRData {
  patientInfo: { name: string; gender: string; dob?: string };
  encounters: Array<{ date: string; type: string; status: string }>;
  conditions: Array<{ code: string; display: string; clinicalStatus: string }>;
  observations: Array<{ code: string; display: string; value: string; unit: string; date: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string; status: string }>;
  reports: Array<{ code: string; display: string; status: string; conclusion?: string }>;
  sourceHIP?: string;
  compositionTitle?: string;
}

interface ExternalRecord {
  id: string;
  patientId: string;
  consentId?: string;
  sourceHipId?: string;
  sourceHipName?: string;
  recordType: string;
  recordDate?: string;
  parsedData: ParsedFHIRData;
  receivedAt: string;
}

interface FederatedRecordsProps {
  patientId: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

const SectionChip: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <Chip
    label={`${count} ${label}`}
    size="small"
    sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 500, mr: 0.5, mb: 0.5 }}
  />
);

const FederatedRecords: React.FC<FederatedRecordsProps> = ({ patientId }) => {
  const [records, setRecords] = useState<ExternalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [consents, setConsents] = useState<any[]>([]);
  const [selectedConsentId, setSelectedConsentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = (await hiuService.getPatientHealthRecords(patientId)) as any;
      setRecords(response.data || []);
    } catch {
      toast.error('Failed to load external health records');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecords();
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [fetchRecords]);

  const openRequestDialog = async () => {
    try {
      const res = (await consentService.getPatientConsents(patientId)) as any;
      const granted = (res.data || []).filter((c: any) => c.status === 'GRANTED');
      setConsents(granted);
    } catch {
      toast.error('Failed to load consents');
    }
    setRequestDialogOpen(true);
  };

  const handleRequestRecords = async () => {
    if (!selectedConsentId || !dateFrom || !dateTo) {
      toast.warning('Please fill in all fields');
      return;
    }
    try {
      setRequesting(true);
      await hiuService.requestHealthInformation({
        consentId: selectedConsentId,
        dateRangeFrom: new Date(dateFrom).toISOString(),
        dateRangeTo: new Date(dateTo).toISOString(),
      });
      toast.success('Health information request sent. Records will appear shortly.');
      setRequestDialogOpen(false);
      setSelectedConsentId('');
      setDateFrom('');
      setDateTo('');

      // Start auto-polling for new records
      prevCountRef.current = records.length;
      setPolling(true);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = (await hiuService.getPatientHealthRecords(patientId)) as any;
          const newRecords = res.data || [];
          if (newRecords.length > prevCountRef.current) {
            setRecords(newRecords);
            setPolling(false);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            toast.success(`${newRecords.length - prevCountRef.current} new record(s) received!`);
          }
        } catch { /* silent */ }
      }, 5000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPolling(false);
          toast.info(
            'No records arrived in 2 minutes. The HIP may be slow or has nothing to send for this date range — click Refresh to check again.',
            { autoClose: 8000 },
          );
        }
      }, 120_000);
    } catch {
      toast.error('Failed to request health information');
    } finally {
      setRequesting(false);
    }
  };

  // Group records by date
  const grouped = records.reduce<Record<string, ExternalRecord[]>>((acc, rec) => {
    const dateKey = rec.recordDate ? formatDate(rec.recordDate) : 'Unknown Date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(rec);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'Unknown Date') return 1;
    if (b === 'Unknown Date') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  if (loading) {
    return <LoadingState message="Loading external records" hint="Fetching health information shared via ABDM…" />;
  }

  return (
    <Box>
      <GradientHero
        title="External Health Records"
        subtitle="Records fetched from other hospitals via ABDM"
        icon={<LocalHospital />}
        badge={
          polling && (
            <Chip
              icon={<CircularProgress size={12} sx={{ color: '#fff !important' }} />}
              label="Waiting for records…"
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.22),
                color: '#fff',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          )
        }
        actions={
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={fetchRecords}
              disabled={loading}
              sx={{
                color: '#fff',
                borderColor: alpha('#fff', 0.55),
                '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.12) },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<CloudDownload />}
              onClick={openRequestDialog}
              sx={{
                bgcolor: '#fff',
                color: 'primary.main',
                fontWeight: 700,
                '&:hover': { bgcolor: alpha('#fff', 0.9) },
              }}
            >
              Request Records
            </Button>
          </>
        }
      />
      <Box sx={{ height: 16 }} />

      {records.length === 0 ? (
        <Paper variant="outlined" sx={{ borderStyle: 'dashed', py: 1 }}>
          <EmptyState
            icon={<InfoOutlined />}
            title="No external records yet"
            message="External records from other hospitals will appear here once a consent is granted and data is pulled via ABDM. Click Request Records to fetch under an existing granted consent."
            action={{ label: 'Request Records', onClick: openRequestDialog, icon: <CloudDownload /> }}
          />
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sortedDates.map((dateKey) => (
            <Box key={dateKey}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <EventNote sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                  {dateKey}
                </Typography>
                <Chip label={`${grouped[dateKey].length} record(s)`} size="small" variant="outlined" />
              </Box>

              {grouped[dateKey].map((rec) => {
                const p = rec.parsedData;
                return (
                  <Accordion
                    key={rec.id}
                    sx={{
                      mb: 1,
                      borderRadius: '12px !important',
                      '&:before': { display: 'none' },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%' }}>
                        <LocalHospital sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={600} noWrap>
                            {p.compositionTitle || rec.recordType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rec.sourceHipName || 'Unknown Source'} &middot; Received {formatDateTime(rec.receivedAt)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                          {p.conditions.length > 0 && <SectionChip label="Diagnoses" count={p.conditions.length} color="#E74C3C" />}
                          {p.medications.length > 0 && <SectionChip label="Medications" count={p.medications.length} color="#2ECC71" />}
                          {p.observations.length > 0 && <SectionChip label="Observations" count={p.observations.length} color="#F39C12" />}
                          {p.reports.length > 0 && <SectionChip label="Reports" count={p.reports.length} color="#9B59B6" />}
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      {p.conditions.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <MedicalServices sx={{ fontSize: 18, color: '#E74C3C' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Diagnoses</Typography>
                          </Box>
                          {p.conditions.map((c, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {c.display || c.code}
                                <Chip label={c.clinicalStatus} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {p.medications.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Medication sx={{ fontSize: 18, color: '#2ECC71' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Medications</Typography>
                          </Box>
                          {p.medications.map((m, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                <strong>{m.name}</strong>
                                {m.dosage && ` — ${m.dosage}`}
                                {m.frequency && ` (${m.frequency})`}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {p.observations.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Science sx={{ fontSize: 18, color: '#F39C12' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Observations</Typography>
                          </Box>
                          {p.observations.map((o, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {o.display || o.code}: <strong>{o.value}{o.unit && ` ${o.unit}`}</strong>
                                {o.date && (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    ({formatDate(o.date)})
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {p.reports.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Assessment sx={{ fontSize: 18, color: '#9B59B6' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Diagnostic Reports</Typography>
                          </Box>
                          {p.reports.map((r, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {r.display || r.code}
                                <Chip label={r.status} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                              </Typography>
                              {r.conclusion && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0 }}>
                                  Conclusion: {r.conclusion}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}

                      {p.encounters.length > 0 && (
                        <Box>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            Encounter(s): {p.encounters.map(e => `${e.type} (${e.status}) — ${formatDate(e.date)}`).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          ))}
        </Stack>
      )}

      {/* Request Records Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Health Records via ABDM</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a granted consent and specify a date range to fetch health records from the external HIP.
          </Typography>

          <TextField
            select
            fullWidth
            label="Select Granted Consent"
            value={selectedConsentId}
            onChange={(e) => setSelectedConsentId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            <option value="">-- Select a consent --</option>
            {consents.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.consentId} — {c.purpose} ({formatDate(c.createdAt)})
              </option>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRequestRecords}
            disabled={requesting || !selectedConsentId || !dateFrom || !dateTo}
            startIcon={requesting ? <CircularProgress size={16} /> : <CloudDownload />}
          >
            {requesting ? 'Requesting...' : 'Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FederatedRecords;
