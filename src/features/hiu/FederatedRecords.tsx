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
  CircularProgress,
  alpha,
  Divider,
  Stack,
  Tooltip,
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
  Description,
  HealingOutlined,
  VaccinesOutlined,
  WarningAmber,
  PictureAsPdf,
  Image as ImageIcon,
  OpenInNew,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import DOMPurify from 'dompurify';
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
  procedures?: Array<{ code: string; display: string; status: string; date?: string }>;
  immunizations?: Array<{ code: string; display: string; status: string; date?: string }>;
  allergies?: Array<{ code: string; display: string; criticality?: string; reaction?: string }>;
  narrative?: string;
  sections?: Array<{ title: string; html: string }>;
  documents?: Array<{
    title: string;
    contentType: string;
    url?: string;
    data?: string;
    size?: number;
    creation?: string;
  }>;
  sourceHIP?: string;
  compositionTitle?: string;
  compositionDate?: string;
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

  const startPolling = useCallback(() => {
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
      }
    }, 120_000);
  }, [patientId, records.length]);

  // One-click pull: fire health-information requests for every granted
  // consent for this patient. The backend already auto-pulls on consent
  // grant, so this button is a manual fallback for when records didn't
  // arrive (slow HIP, transient failure, etc.). No more date-pickers and
  // no more consent selector — the dateRange and consent are derivable
  // from the consent artefact body itself.
  const handlePullRecords = async () => {
    try {
      setRequesting(true);
      const res = (await consentService.getPatientConsents(patientId)) as any;
      const granted = (res.data || []).filter((c: any) => c.status === 'GRANTED');
      if (!granted.length) {
        toast.info('No granted consents — request consent first.');
        return;
      }
      let dispatched = 0;
      let failed = 0;
      for (const c of granted) {
        try {
          await hiuService.requestHealthInformation({ consentId: c.id });
          dispatched++;
        } catch {
          failed++;
        }
      }
      if (dispatched > 0) {
        toast.success(
          dispatched === 1
            ? 'Pulling records from ABDM. They\'ll appear in a few seconds.'
            : `Pulling records from ${dispatched} consent(s). They'll appear in a few seconds.`,
        );
        startPolling();
      } else if (failed > 0) {
        toast.error('Failed to pull records — try again in a moment.');
      }
    } catch {
      toast.error('Failed to load consents.');
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
            <Tooltip title="Records arrive automatically when consent is granted. Use this to pull again under existing granted consents.">
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={requesting ? <CircularProgress size={14} /> : <CloudDownload />}
                  onClick={handlePullRecords}
                  disabled={requesting}
                  sx={{
                    bgcolor: '#fff',
                    color: 'primary.main',
                    fontWeight: 700,
                    '&:hover': { bgcolor: alpha('#fff', 0.9) },
                  }}
                >
                  {requesting ? 'Pulling…' : 'Pull from ABDM'}
                </Button>
              </span>
            </Tooltip>
          </>
        }
      />
      <Box sx={{ height: 16 }} />

      {records.length === 0 ? (
        <Paper variant="outlined" sx={{ borderStyle: 'dashed', py: 1 }}>
          <EmptyState
            icon={<InfoOutlined />}
            title="No external records yet"
            message="Records from other hospitals appear here automatically as soon as the patient grants consent on their PHR app. If a consent is already granted but no records show, click Pull from ABDM to retry."
            action={{ label: requesting ? 'Pulling…' : 'Pull from ABDM', onClick: handlePullRecords, icon: <CloudDownload /> }}
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
                          {(p.procedures?.length ?? 0) > 0 && <SectionChip label="Procedures" count={p.procedures!.length} color="#1ABC9C" />}
                          {(p.immunizations?.length ?? 0) > 0 && <SectionChip label="Immunizations" count={p.immunizations!.length} color="#3498DB" />}
                          {(p.allergies?.length ?? 0) > 0 && <SectionChip label="Allergies" count={p.allergies!.length} color="#E67E22" />}
                          {(p.documents?.length ?? 0) > 0 && <SectionChip label="Attachments" count={p.documents!.length} color="#34495E" />}
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      {/* Composition narrative — the rendered "document body".
                          Most ABDM HIPs send a CDA-like Composition with a
                          full text.div narrative; that's the closest the
                          patient's PHR comes to a real prescription /
                          discharge letter. We render it inline (DOMPurified)
                          BEFORE the structured tables so clinicians see the
                          document first and tables second. */}
                      {p.narrative && (
                        <Box
                          sx={{
                            mb: 2,
                            p: 2,
                            bgcolor: alpha('#4A90E2', 0.04),
                            borderLeft: '3px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1,
                            '& div': { fontFamily: 'inherit' },
                            '& table': { borderCollapse: 'collapse', width: '100%', mb: 1 },
                            '& th, & td': { border: '1px solid #e0e0e0', padding: '4px 8px', textAlign: 'left' },
                            '& h1, & h2, & h3, & h4': { mt: 1, mb: 0.5 },
                            '& p': { my: 0.5 },
                          }}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(p.narrative, {
                              USE_PROFILES: { html: true },
                              FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                              FORBID_ATTR: ['onerror', 'onload', 'onclick'],
                            }),
                          }}
                        />
                      )}

                      {/* Per-section narratives — when the Composition has
                          multiple sections (e.g. "Chief Complaints", "Medications
                          on Discharge") each one comes with its own rendered
                          text.div. Show those after the main narrative if it
                          existed, else as the main view. */}
                      {p.sections && p.sections.length > 0 && p.sections.map((s, i) => (
                        <Box
                          key={i}
                          sx={{
                            mb: 1.5,
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            '& table': { borderCollapse: 'collapse', width: '100%', mb: 1 },
                            '& th, & td': { border: '1px solid #e0e0e0', padding: '4px 8px', textAlign: 'left' },
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {s.title}
                          </Typography>
                          <Box
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(s.html, {
                                USE_PROFILES: { html: true },
                                FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                                FORBID_ATTR: ['onerror', 'onload', 'onclick'],
                              }),
                            }}
                          />
                        </Box>
                      ))}

                      {/* Document attachments (DocumentReference) — scanned
                          reports, prescriptions, lab PDFs. Either inline
                          base64 or external URL. We render a viewer pill per
                          attachment that opens the binary in a new tab. */}
                      {p.documents && p.documents.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Description sx={{ fontSize: 18, color: '#34495E' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Attached Documents</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ ml: 3.5 }} useFlexGap>
                            {p.documents.map((doc, i) => {
                              const isPdf = /pdf/i.test(doc.contentType);
                              const isImg = /^image\//i.test(doc.contentType);
                              const onOpen = () => {
                                let href: string | undefined = doc.url;
                                if (!href && doc.data) {
                                  href = `data:${doc.contentType};base64,${doc.data}`;
                                }
                                if (!href) {
                                  toast.warning('This attachment has no inline data or URL.');
                                  return;
                                }
                                window.open(href, '_blank', 'noopener');
                              };
                              const sizeKb = doc.size ? `${Math.round(doc.size / 1024)} KB` : '';
                              return (
                                <Button
                                  key={i}
                                  variant="outlined"
                                  size="small"
                                  startIcon={isPdf ? <PictureAsPdf /> : isImg ? <ImageIcon /> : <OpenInNew />}
                                  onClick={onOpen}
                                  sx={{ textTransform: 'none' }}
                                >
                                  {doc.title}
                                  {sizeKb && (
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                      ({sizeKb})
                                    </Typography>
                                  )}
                                </Button>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}
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

                      {(p.procedures?.length ?? 0) > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <HealingOutlined sx={{ fontSize: 18, color: '#1ABC9C' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Procedures</Typography>
                          </Box>
                          {p.procedures!.map((pr, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {pr.display || pr.code}
                                {pr.date && (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    ({formatDate(pr.date)})
                                  </Typography>
                                )}
                                <Chip label={pr.status} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {(p.immunizations?.length ?? 0) > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <VaccinesOutlined sx={{ fontSize: 18, color: '#3498DB' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Immunizations</Typography>
                          </Box>
                          {p.immunizations!.map((im, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {im.display || im.code}
                                {im.date && (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    ({formatDate(im.date)})
                                  </Typography>
                                )}
                                <Chip label={im.status} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {(p.allergies?.length ?? 0) > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <WarningAmber sx={{ fontSize: 18, color: '#E67E22' }} />
                            <Typography variant="subtitle2" fontWeight={600}>Allergies</Typography>
                          </Box>
                          {p.allergies!.map((a, i) => (
                            <Box key={i} sx={{ ml: 3.5, mb: 0.5 }}>
                              <Typography variant="body2">
                                {a.display || a.code}
                                {a.criticality && (
                                  <Chip label={a.criticality} size="small" color="warning" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                                )}
                                {a.reaction && (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    Reaction: {a.reaction}
                                  </Typography>
                                )}
                              </Typography>
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
    </Box>
  );
};

export default FederatedRecords;
