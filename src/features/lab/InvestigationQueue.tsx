import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Tooltip, CircularProgress, Alert, Grid, alpha, Divider,
  InputAdornment, ToggleButton, ToggleButtonGroup, Avatar, Table,
  TableHead, TableBody, TableRow, TableCell, Select, FormControl,
  InputLabel,
} from '@mui/material';
import {
  Science, CheckCircle, HourglassEmpty, PlayCircle, Refresh,
  Search, ArrowForward, Visibility, Close, Download, Add, Delete,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import investigationService from '../../services/investigationService';
import { generateLabReport, LabParameter } from '../../utils/labReportGenerator';
import documentService from '../../services/documentService';
import { LAB_TEMPLATES, matchTemplate } from '../../utils/labTestTemplates';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { PageHeader, StatCard } from '../../components/ui';

interface Investigation {
  id: string;
  patientId?: string;
  encounterId?: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string; age?: string; gender?: string; mobile?: string };
  doctor?: { firstName: string; lastName: string; department?: { name: string } };
  testName: string;
  testType: string;
  status: string;
  priority?: string;
  instructions?: string;
  results?: {
    parameters?: LabParameter[];
    sampleType?: string;
    sampleCollectedAt?: string;
    labTechnicianName?: string;
    validatedBy?: string;
    notes?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  reportedAt?: string;
  sampleCollectedAt?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ORDERED:          { label: 'Ordered',          color: '#1565c0', bg: '#e3f2fd', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  SAMPLE_COLLECTED: { label: 'Sample Collected',  color: '#e65100', bg: '#fff3e0', icon: <Science sx={{ fontSize: 14 }} /> },
  IN_PROGRESS:      { label: 'In Progress',       color: '#6a1b9a', bg: '#f3e5f5', icon: <PlayCircle sx={{ fontSize: 14 }} /> },
  COMPLETED:        { label: 'Completed',         color: '#2e7d32', bg: '#e8f5e9', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  CANCELLED:        { label: 'Cancelled',         color: '#c62828', bg: '#ffebee', icon: <Close sx={{ fontSize: 14 }} /> },
};

const STATUS_FLOW = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED'];
const NEXT_LABEL: Record<string, string> = {
  ORDERED:          'Collect Sample',
  SAMPLE_COLLECTED: 'Start Processing',
  IN_PROGRESS:      'Mark Complete',
};

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  STAT:    'error',
  URGENT:  'warning',
  ROUTINE: 'default',
};

export default function InvestigationQueue() {
  const permissions = useRolePermissions();
  const authUser    = useSelector((state: any) => state.auth?.user);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const [updateOpen, setUpdateOpen] = useState(false);
  const [viewOpen, setViewOpen]     = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selected, setSelected]     = useState<Investigation | null>(null);
  const [updateData, setUpdateData] = useState({ status: '', notes: '' });
  const [saving, setSaving]         = useState(false);

  // Results entry state
  const emptyParam = (): LabParameter => ({
    name: '', value: '', unit: '', referenceRange: '', flag: 'N', subGroup: '',
  });
  const [resultParams, setResultParams]   = useState<LabParameter[]>([emptyParam()]);
  const [sampleType, setSampleType]       = useState('');
  const [techName, setTechName]           = useState('');
  const [validatedBy, setValidatedBy]     = useState('');
  const [resultNotes, setResultNotes]     = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [testCharge, setTestCharge]       = useState('');

  const applyTemplate = (templateId: string) => {
    const tpl = LAB_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setSampleType(tpl.sampleType);
    setResultParams(tpl.parameters.map(p => ({ ...p, value: '', flag: 'N' as const })));
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 100 };
      const response = await investigationService.getAllInvestigations(params) as any;
      setInvestigations(response.data?.investigations || response.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch investigations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = investigations;
    if (statusFilter === 'ACTIVE')    list = list.filter(i => i.status !== 'COMPLETED' && i.status !== 'CANCELLED');
    else if (statusFilter !== 'ALL')  list = list.filter(i => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        `${i.patient?.firstName} ${i.patient?.lastName}`.toLowerCase().includes(q) ||
        i.patient?.uhid?.toLowerCase().includes(q) ||
        i.testName.toLowerCase().includes(q) ||
        i.doctor?.lastName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [investigations, statusFilter, search]);

  // Group by patient
  const grouped = useMemo(() => {
    const map = new Map<string, { patient: Investigation['patient']; items: Investigation[] }>();
    for (const inv of filtered) {
      const key = inv.patient?.id || 'unknown';
      if (!map.has(key)) map.set(key, { patient: inv.patient, items: [] });
      map.get(key)!.items.push(inv);
    }
    return Array.from(map.values());
  }, [filtered]);

  const stats = useMemo(() => ({
    ordered:     investigations.filter(i => i.status === 'ORDERED').length,
    inProgress:  investigations.filter(i => ['SAMPLE_COLLECTED','IN_PROGRESS'].includes(i.status)).length,
    completed:   investigations.filter(i => i.status === 'COMPLETED').length,
    total:       investigations.length,
  }), [investigations]);

  /**
   * Open the full "Enter Test Results" dialog (template + parameters +
   * charge). Extracted so it can be used both from the "Mark Complete"
   * fast-path on IN_PROGRESS rows and from the manual Advance Status
   * dropdown when the user jumps straight to COMPLETED — both paths must
   * collect results and a charge before saving.
   */
  const openResultsDialog = (inv: Investigation) => {
    setSelected(inv);
    setTechName(authUser ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() : '');
    setResultParams([emptyParam()]);
    setSampleType('');
    setValidatedBy('');
    setResultNotes(inv.instructions || '');
    setTestCharge('');
    const matched = matchTemplate(inv.testName);
    if (matched) {
      setSelectedTemplateId(matched.id);
      setSampleType(matched.sampleType);
      setResultParams(matched.parameters.map(p => ({ ...p, value: '', flag: 'N' as const })));
    } else {
      setSelectedTemplateId('');
    }
    setResultsOpen(true);
  };

  const handleAdvance = (inv: Investigation) => {
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(inv.status) + 1];
    if (inv.status === 'IN_PROGRESS') {
      openResultsDialog(inv);
      return;
    }
    setSelected(inv);
    setUpdateData({ status: next || '', notes: '' });
    setUpdateOpen(true);
  };

  const handleSaveResults = async () => {
    if (!selected) return;
    const validParams = resultParams.filter(p => p.name && p.value);
    setSaving(true);
    try {
      await investigationService.updateInvestigationStatus(selected.id, {
        status: 'COMPLETED',
        results: {
          parameters: validParams,
          sampleType,
          sampleCollectedAt: selected.sampleCollectedAt || selected.createdAt,
          labTechnicianName: techName,
          validatedBy,
          notes: resultNotes,
        },
        notes: resultNotes,
        amount: testCharge ? parseFloat(testCharge) : undefined,
      } as any);
      setResultsOpen(false);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save results');
    } finally { setSaving(false); }
  };

  const handleDownloadReport = (inv: Investigation) => {
    const results = inv.results || {};
    const base64 = generateLabReport({
      hospital: {
        name:               authUser?.hospitalName || 'Hospital',
        labName:            authUser?.hospitalName ? `${authUser.hospitalName} — Pathology Lab` : 'Pathology Laboratory',
        addressLine1:       authUser?.hospitalAddress,
        phone:              authUser?.hospitalPhone,
        email:              authUser?.hospitalEmail,
        registrationNumber: authUser?.hospitalRegistrationNumber,
      },
      patient: {
        name:   `${inv.patient?.firstName} ${inv.patient?.lastName}`,
        uhid:    inv.patient?.uhid || '—',
        age:     inv.patient?.age,
        gender:  inv.patient?.gender,
        mobile:  inv.patient?.mobile,
      },
      doctor: {
        name:       `${inv.doctor?.firstName} ${inv.doctor?.lastName}`,
        department: (inv.doctor as any)?.department?.name,
      },
      report: {
        reportId:            inv.id,
        testName:            inv.testName,
        testType:            inv.testType,
        sampleType:          results.sampleType || sampleType || undefined,
        orderedAt:           inv.createdAt,
        sampleCollectedAt:   results.sampleCollectedAt || inv.sampleCollectedAt || undefined,
        reportedAt:          inv.reportedAt || inv.updatedAt,
        parameters:          results.parameters || [],
        labTechnicianName:   results.labTechnicianName,
        validatedBy:         results.validatedBy,
        notes:               results.notes || inv.notes || undefined,
      },
    });
    if (inv.patientId) {
      documentService.persistDocument({ patientId: inv.patientId, encounterId: inv.encounterId, type: 'LAB_REPORT', content: base64 }).catch(() => {});
    }
  };

  const handleSaveStatus = async () => {
    if (!selected) return;

    // If the lab tech is jumping straight to COMPLETED from the Advance
    // Status dropdown (instead of stepping through IN_PROGRESS first),
    // hand off to the full results dialog so we still collect the
    // template parameters + the test charge. Otherwise the bill never
    // gets the line item and the patient receipt can't show the result.
    if (updateData.status === 'COMPLETED') {
      const inv = selected;
      setUpdateOpen(false);
      openResultsDialog(inv);
      return;
    }

    setSaving(true);
    try {
      await investigationService.updateInvestigationStatus(selected.id, {
        status: updateData.status as any,
        notes: updateData.notes || undefined,
      });
      setUpdateOpen(false);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const m = STATUS_META[status] || { label: status, color: '#666', bg: '#f5f5f5', icon: null };
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
        px: 1, py: 0.3, borderRadius: 2, fontSize: 11, fontWeight: 700,
        color: m.color, bgcolor: m.bg }}>
        {m.icon}{m.label}
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader
        title={permissions.isLabTechnician ? 'Lab Queue' : 'Lab Investigations'}
        subtitle={
          permissions.isLabTechnician
            ? 'Process pending tests and record results'
            : 'All lab tests ordered for your hospital'
        }
        icon={<Science />}
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll} disabled={loading}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2.25} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Awaiting" value={String(stats.ordered)} icon={<HourglassEmpty />}
            tone="info" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="In progress" value={String(stats.inProgress)} icon={<PlayCircle />}
            tone="warning" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Completed" value={String(stats.completed)} icon={<CheckCircle />}
            tone="success" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total tests" value={String(stats.total)} icon={<Science />}
            tone="secondary" loading={loading} />
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search patient, test, doctor…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <ToggleButtonGroup size="small" exclusive value={statusFilter}
          onChange={(_, v) => v && setStatusFilter(v)}>
          {[
            { v: 'ACTIVE',           label: 'Active' },
            { v: 'ALL',              label: 'All' },
            { v: 'ORDERED',          label: 'Ordered' },
            { v: 'SAMPLE_COLLECTED', label: 'Sample Collected' },
            { v: 'IN_PROGRESS',      label: 'Processing' },
            { v: 'COMPLETED',        label: 'Completed' },
          ].map(t => (
            <ToggleButton key={t.v} value={t.v}
              sx={{ px: 1.5, py: 0.5, fontSize: 12, textTransform: 'none' }}>
              {t.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Patient-grouped cards */}
        {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : grouped.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Science sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No investigations found</Typography>
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            {statusFilter === 'ACTIVE' ? 'All tests are complete or no tests have been ordered.' : 'Try a different filter.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {grouped.map(({ patient, items }) => (
            <Paper key={patient?.id || 'unknown'} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* Patient header */}
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha('#1a3c6e', 0.04),
                borderBottom: '1px solid', borderColor: 'divider',
                display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#1a3c6e', fontSize: 14, fontWeight: 700 }}>
                  {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} variant="body1">
                    {patient?.firstName} {patient?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    UHID: {patient?.uhid || '—'}
                  </Typography>
                </Box>
                <Chip label={`${items.length} test${items.length > 1 ? 's' : ''}`}
                  size="small" color="primary" variant="outlined" />
              </Box>

              {/* Tests */}
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {items.map((inv, idx) => (
                  <Box key={inv.id}>
                    {idx > 0 && <Divider sx={{ my: 0.5 }} />}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,
                      px: 1.5, py: 1, borderRadius: 2,
                      bgcolor: inv.status === 'COMPLETED' ? alpha('#2e7d32', 0.03) : 'transparent',
                      '&:hover': { bgcolor: alpha('#1a3c6e', 0.04) } }}>

                      {/* Test icon */}
                      <Box sx={{ width: 36, height: 36, borderRadius: 2,
                        bgcolor: alpha((STATUS_META[inv.status]?.color || '#666'), 0.12),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0 }}>
                        <Science sx={{ fontSize: 18, color: STATUS_META[inv.status]?.color || '#666' }} />
                      </Box>

                      {/* Test name + type */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{inv.testName}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                          <Chip label={inv.testType} size="small" variant="outlined"
                            sx={{ height: 18, fontSize: 10, borderRadius: 1 }} />
                          {inv.priority && inv.priority !== 'ROUTINE' && (
                            <Chip label={inv.priority} size="small"
                              color={PRIORITY_COLOR[inv.priority] || 'default'}
                              sx={{ height: 18, fontSize: 10, borderRadius: 1 }} />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Dr. {inv.doctor?.firstName} {inv.doctor?.lastName}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Date */}
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
                        {format(new Date(inv.createdAt), 'dd MMM, hh:mm a')}
                      </Typography>

                      {/* Status badge */}
                      <Box sx={{ flexShrink: 0 }}>
                        <StatusBadge status={inv.status} />
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => { setSelected(inv); setViewOpen(true); }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                        {inv.status === 'COMPLETED' && inv.results?.parameters?.length ? (
                          <Tooltip title="Download Lab Report">
                            <Button size="small" variant="outlined" disableElevation
                              onClick={() => handleDownloadReport(inv)}
                              startIcon={<Download sx={{ fontSize: '14px !important' }} />}
                              sx={{ fontSize: 11, py: 0.3, px: 1.2, borderRadius: 2,
                                textTransform: 'none', whiteSpace: 'nowrap',
                                borderColor: '#2e7d32', color: '#2e7d32',
                                '&:hover': { bgcolor: alpha('#2e7d32', 0.08) } }}>
                              Report
                            </Button>
                          </Tooltip>
                        ) : null}
                        {permissions.canUpdateInvestigationStatus &&
                          inv.status !== 'COMPLETED' && inv.status !== 'CANCELLED' && (
                          <Tooltip title={NEXT_LABEL[inv.status] || 'Advance'}>
                            <Button size="small" variant="contained" disableElevation
                              onClick={() => handleAdvance(inv)}
                              startIcon={<ArrowForward sx={{ fontSize: '14px !important' }} />}
                              sx={{ fontSize: 11, py: 0.3, px: 1.2, borderRadius: 2,
                                textTransform: 'none', whiteSpace: 'nowrap' }}>
                              {NEXT_LABEL[inv.status] || 'Next'}
                            </Button>
                              </Tooltip>
                            )}
                          </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Advance Status Dialog */}
      <Dialog open={updateOpen} onClose={() => setUpdateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Science color="primary" />
          {NEXT_LABEL[selected?.status || ''] || 'Update Status'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#1565c0', 0.03) }}>
                <Typography fontWeight={700}>{selected.testName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selected.patient?.firstName} {selected.patient?.lastName} · UHID: {selected.patient?.uhid}
                </Typography>
              </Paper>

              <TextField select label="New Status" fullWidth value={updateData.status}
                onChange={e => setUpdateData({ ...updateData, status: e.target.value })}>
                {STATUS_FLOW.filter(s => STATUS_FLOW.indexOf(s) > STATUS_FLOW.indexOf(selected.status)).map(s => (
                  <MenuItem key={s} value={s}>{STATUS_META[s]?.label || s}</MenuItem>
                ))}
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>

              <TextField label="Notes / Results (optional)" fullWidth multiline rows={3}
                value={updateData.notes}
                onChange={e => setUpdateData({ ...updateData, notes: e.target.value })}
                placeholder="Enter test results, observations, or any notes…" />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setUpdateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveStatus}
            disabled={!updateData.status || saving}
            startIcon={saving ? <CircularProgress size={14} /> : <CheckCircle />}>
            {saving ? 'Saving…' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science color="primary" />
            Investigation Details
          </Box>
          <IconButton size="small" onClick={() => setViewOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                ['Patient',    `${selected.patient?.firstName} ${selected.patient?.lastName} (${selected.patient?.uhid})`],
                ['Test Name',  selected.testName],
                ['Test Type',  selected.testType],
                ['Ordered By', `Dr. ${selected.doctor?.firstName} ${selected.doctor?.lastName}`],
                ['Priority',   selected.priority || 'ROUTINE'],
                ['Ordered On', format(new Date(selected.createdAt), 'dd MMM yyyy, hh:mm a')],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{value}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>Status</Typography>
                <StatusBadge status={selected.status} />
              </Box>
              {selected.instructions && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>Instructions</Typography>
                  <Typography variant="body2">{selected.instructions}</Typography>
                </Box>
              )}
              {selected.results?.parameters && selected.results.parameters.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    TEST RESULTS
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#1a3c6e', 0.07) }}>
                        {['Parameter', 'Result', 'Unit', 'Ref Range', 'Flag'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, py: 0.75 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selected.results.parameters.map((p, i) => (
                        <TableRow key={i} sx={{
                          bgcolor: p.flag === 'C' ? alpha('#c62828', 0.07)
                            : (p.flag === 'H' || p.flag === 'L') ? alpha('#e65100', 0.06) : 'transparent',
                        }}>
                          <TableCell sx={{ fontSize: 12 }}>{p.name}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700,
                            color: p.flag === 'C' ? '#c62828' : p.flag === 'H' ? '#e65100' : p.flag === 'L' ? '#1565c0' : 'inherit' }}>
                            {p.value}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{p.unit}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{p.referenceRange}</TableCell>
                          <TableCell>
                            {p.flag && p.flag !== 'N' && (
                              <Chip label={p.flag === 'H' ? 'HIGH' : p.flag === 'L' ? 'LOW' : p.flag === 'C' ? 'CRIT' : p.flag}
                                size="small" color={p.flag === 'C' ? 'error' : p.flag === 'H' ? 'warning' : 'info'}
                                sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {selected.notes && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">NOTES</Typography>
                  <Typography variant="body2" mt={0.5}>{selected.notes}</Typography>
                </Paper>
              )}
              {selected.status === 'COMPLETED' && selected.results?.parameters?.length ? (
                <Button variant="outlined" startIcon={<Download />} onClick={() => { setViewOpen(false); handleDownloadReport(selected); }}
                  sx={{ alignSelf: 'flex-start', borderColor: '#2e7d32', color: '#2e7d32' }}>
                  Download PDF Report
                </Button>
              ) : null}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Enter Results Dialog (Mark Complete) */}
      <Dialog open={resultsOpen} onClose={() => setResultsOpen(false)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          bgcolor: alpha('#1a3c6e', 0.04) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science color="primary" />
            <Box>
              <Typography fontWeight={800}>Enter Test Results</Typography>
              {selected && (
                <Typography variant="caption" color="text.secondary">
                  {selected.testName} · {selected.patient?.firstName} {selected.patient?.lastName} (UHID: {selected.patient?.uhid})
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setResultsOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {/* Sample & Meta info */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2,
                bgcolor: alpha('#1a3c6e', 0.03), borderColor: alpha('#1a3c6e', 0.2) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Science sx={{ color: '#1a3c6e', fontSize: 20, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" fontWeight={700} color="#1a3c6e"
                      sx={{ textTransform: 'uppercase', letterSpacing: .5 }}>
                      Quick Fill from Template
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Select a standard test to auto-populate parameters with reference ranges
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 280 }}>
                    <InputLabel>Select Test Template</InputLabel>
                    <Select label="Select Test Template" value={selectedTemplateId}
                      onChange={e => applyTemplate(e.target.value)}>
                      <MenuItem value=""><em>— Manual Entry —</em></MenuItem>
                      {Object.entries(
                        LAB_TEMPLATES.reduce((acc, t) => {
                          const type = t.testType;
                          if (!acc[type]) acc[type] = [];
                          acc[type].push(t);
                          return acc;
                        }, {} as Record<string, typeof LAB_TEMPLATES>)
                      ).map(([type, templates]) => [
                        <MenuItem key={`header-${type}`} disabled
                          sx={{ fontWeight: 700, fontSize: 11, color: '#1a3c6e',
                            bgcolor: alpha('#1a3c6e', 0.06), '&.Mui-disabled': { opacity: 1 } }}>
                          {type}
                        </MenuItem>,
                        ...templates.map(t => (
                          <MenuItem key={t.id} value={t.id}
                            sx={{ pl: 3, fontSize: 13 }}>
                            {t.name}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>
                  {selectedTemplateId && (
                    <Button size="small" variant="text" color="error"
                      onClick={() => { setSelectedTemplateId(''); setResultParams([emptyParam()]); setSampleType(''); }}
                      sx={{ textTransform: 'none', fontSize: 11 }}>
                      Clear
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Sample Type" fullWidth size="small" value={sampleType}
                onChange={e => setSampleType(e.target.value)}
                placeholder="e.g. Blood - EDTA, Urine, Serum" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Lab Technician Name" fullWidth size="small" value={techName}
                onChange={e => setTechName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Validated / Reviewed By" fullWidth size="small" value={validatedBy}
                onChange={e => setValidatedBy(e.target.value)}
                placeholder="e.g. Dr. Pathologist" />
            </Grid>
          </Grid>

          {/* Parameters table */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Test Parameters
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#1a3c6e', 0.07) }}>
                  {['Group / Sub-test', 'Parameter Name *', 'Result *', 'Unit', 'Reference Range', 'Flag', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {resultParams.map((param, idx) => (
                  <TableRow key={idx} sx={{ '&:hover': { bgcolor: alpha('#1565c0', 0.03) } }}>
                    <TableCell sx={{ p: 0.75, minWidth: 120 }}>
                      <TextField size="small" fullWidth variant="standard"
                        placeholder="e.g. CBC" value={param.subGroup || ''}
                        onChange={e => {
                          const u = [...resultParams]; u[idx] = { ...u[idx], subGroup: e.target.value }; setResultParams(u);
                        }} />
                    </TableCell>
                    <TableCell sx={{ p: 0.75, minWidth: 160 }}>
                      <TextField size="small" fullWidth variant="standard" required
                        placeholder="e.g. Haemoglobin" value={param.name}
                        onChange={e => {
                          const u = [...resultParams]; u[idx] = { ...u[idx], name: e.target.value }; setResultParams(u);
                        }} />
                    </TableCell>
                    <TableCell sx={{ p: 0.75, minWidth: 90 }}>
                      <TextField size="small" fullWidth variant="standard" required
                        placeholder="e.g. 12.4" value={param.value}
                        onChange={e => {
                          const u = [...resultParams]; u[idx] = { ...u[idx], value: e.target.value }; setResultParams(u);
                        }} />
                    </TableCell>
                    <TableCell sx={{ p: 0.75, minWidth: 80 }}>
                      <TextField size="small" fullWidth variant="standard"
                        placeholder="g/dL" value={param.unit}
                        onChange={e => {
                          const u = [...resultParams]; u[idx] = { ...u[idx], unit: e.target.value }; setResultParams(u);
                        }} />
                    </TableCell>
                    <TableCell sx={{ p: 0.75, minWidth: 130 }}>
                      <TextField size="small" fullWidth variant="standard"
                        placeholder="12.0 – 17.0" value={param.referenceRange}
                        onChange={e => {
                          const u = [...resultParams]; u[idx] = { ...u[idx], referenceRange: e.target.value }; setResultParams(u);
                        }} />
                    </TableCell>
                    <TableCell sx={{ p: 0.75, minWidth: 90 }}>
                      <FormControl size="small" variant="standard" fullWidth>
                        <Select value={param.flag || 'N'}
                          onChange={e => {
                            const u = [...resultParams]; u[idx] = { ...u[idx], flag: e.target.value as any }; setResultParams(u);
                          }}
                          sx={{
                            color: param.flag === 'H' ? '#e65100' : param.flag === 'L' ? '#1565c0'
                              : param.flag === 'C' ? '#c62828' : '#2e7d32',
                            fontWeight: 700,
                          }}>
                          <MenuItem value="N">Normal</MenuItem>
                          <MenuItem value="H" sx={{ color: '#e65100', fontWeight: 700 }}>HIGH ↑</MenuItem>
                          <MenuItem value="L" sx={{ color: '#1565c0', fontWeight: 700 }}>LOW ↓</MenuItem>
                          <MenuItem value="C" sx={{ color: '#c62828', fontWeight: 700 }}>CRITICAL !</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      {resultParams.length > 1 && (
                        <IconButton size="small" color="error"
                          onClick={() => setResultParams(resultParams.filter((_, i) => i !== idx))}>
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Button size="small" variant="outlined" startIcon={<Add />}
            onClick={() => setResultParams([...resultParams, emptyParam()])}
            sx={{ mb: 2, textTransform: 'none' }}>
            Add Parameter Row
          </Button>

          <TextField label="Lab Notes / Remarks (optional)" fullWidth multiline rows={2}
            value={resultNotes} onChange={e => setResultNotes(e.target.value)}
            placeholder="Any relevant observations, quality notes, or comments for the referring doctor…" />

          <TextField
            label="Test Charge (₹)" type="number" size="small"
            value={testCharge} onChange={e => setTestCharge(e.target.value)}
            placeholder="0.00"
            sx={{ mt: 2, width: 220 }}
            InputProps={{ startAdornment: <span style={{ marginRight: 4 }}>₹</span> }}
            helperText="Charge will be added to patient's bill"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, bgcolor: alpha('#1a3c6e', 0.03) }}>
          <Button onClick={() => setResultsOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSaveResults}
            disabled={saving || resultParams.every(p => !p.name || !p.value)}
            startIcon={saving ? <CircularProgress size={14} /> : <CheckCircle />}>
            {saving ? 'Saving…' : 'Save Results & Complete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
