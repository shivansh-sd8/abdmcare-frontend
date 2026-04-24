import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility,
  Science,
  Assignment,
  CheckCircle,
  HourglassEmpty,
  PlayCircle,
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import investigationService from '../../services/investigationService';

interface Investigation {
  id: string;
  patient?: { id: string; firstName: string; lastName: string; uhid?: string };
  doctor?: { firstName: string; lastName: string };
  testName: string;
  testType: string;
  status: string;
  priority?: string;
  instructions?: string;
  results?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  ORDERED: 'info',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const statusFlow = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED'];

const InvestigationQueue: React.FC = () => {
  const permissions = useRolePermissions();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState(0);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [updateData, setUpdateData] = useState({ status: '', notes: '' });

  const statusTabs = ['ALL', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED'];

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page: page + 1, limit: rowsPerPage };
      if (statusFilter > 0) params.status = statusTabs[statusFilter];
      const response = await investigationService.getAllInvestigations(params as any) as any;
      setInvestigations(response.data?.investigations || response.data?.data || []);
      setTotalCount(response.data?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch investigations');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => { fetchInvestigations(); }, [fetchInvestigations]);

  const getNextStatus = (current: string): string | null => {
    const idx = statusFlow.indexOf(current);
    if (idx === -1 || idx >= statusFlow.length - 1) return null;
    return statusFlow[idx + 1];
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvestigation) return;
    try {
      await investigationService.updateInvestigationStatus(selectedInvestigation.id, {
        status: updateData.status as any,
        notes: updateData.notes || undefined,
      });
      setUpdateOpen(false);
      setSelectedInvestigation(null);
      fetchInvestigations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openStatusUpdate = (inv: Investigation) => {
    const next = getNextStatus(inv.status);
    setSelectedInvestigation(inv);
    setUpdateData({ status: next || inv.status, notes: '' });
    setUpdateOpen(true);
  };

  const pendingCount = investigations.filter(i => i.status === 'ORDERED').length;
  const inProgressCount = investigations.filter(i => i.status === 'IN_PROGRESS' || i.status === 'SAMPLE_COLLECTED').length;
  const completedCount = investigations.filter(i => i.status === 'COMPLETED').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {permissions.isLabTechnician ? 'Lab Queue' : 'Investigations'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {permissions.isLabTechnician ? 'Process pending lab orders and update results' : 'View and manage investigation orders'}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Pending', value: pendingCount, icon: <HourglassEmpty />, color: '#F39C12' },
          { title: 'In Progress', value: inProgressCount, icon: <PlayCircle />, color: '#4A90E2' },
          { title: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#50C878' },
          { title: 'Total', value: totalCount, icon: <Science />, color: '#9B59B6' },
        ].map((card) => (
          <Grid item xs={6} sm={3} key={card.title}>
            <Card sx={{ background: `linear-gradient(135deg, ${alpha(card.color, 0.08)} 0%, ${alpha(card.color, 0.02)} 100%)`, border: `1px solid ${alpha(card.color, 0.2)}`, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                <Box sx={{ backgroundColor: card.color, borderRadius: 2, p: 1, color: 'white' }}>{card.icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{card.title}</Typography>
                  <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Tabs value={statusFilter} onChange={(_, v) => { setStatusFilter(v); setPage(0); }} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          {statusTabs.map((tab) => (<Tab key={tab} label={tab.replace('_', ' ')} />))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Test</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ordered By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {investigations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box sx={{ py: 4 }}>
                          <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">No investigations found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    investigations.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{inv.patient?.firstName} {inv.patient?.lastName}</Typography>
                          {inv.patient?.uhid && <Typography variant="caption" color="text.secondary">{inv.patient.uhid}</Typography>}
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500}>{inv.testName}</Typography></TableCell>
                        <TableCell><Chip label={inv.testType} size="small" variant="outlined" /></TableCell>
                        <TableCell>Dr. {inv.doctor?.firstName} {inv.doctor?.lastName}</TableCell>
                        <TableCell><Chip label={inv.status.replace('_', ' ')} size="small" color={statusColors[inv.status] || 'default'} /></TableCell>
                        <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => { setSelectedInvestigation(inv); setViewOpen(true); }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {permissions.canUpdateInvestigationStatus && inv.status !== 'COMPLETED' && inv.status !== 'CANCELLED' && (
                              <Tooltip title="Update Status">
                                <IconButton size="small" color="primary" onClick={() => openStatusUpdate(inv)}>
                                  <PlayCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={totalCount} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
          </>
        )}
      </Paper>

      {/* Update Status Dialog */}
      <Dialog open={updateOpen} onClose={() => setUpdateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Investigation Status</DialogTitle>
        <DialogContent>
          {selectedInvestigation && (
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ mb: 2 }}><strong>Test:</strong> {selectedInvestigation.testName} — {selectedInvestigation.patient?.firstName} {selectedInvestigation.patient?.lastName}</Typography>
              <TextField select label="New Status" fullWidth margin="normal" value={updateData.status} onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}>
                {statusFlow.filter(s => statusFlow.indexOf(s) > statusFlow.indexOf(selectedInvestigation.status)).map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
                <MenuItem value="CANCELLED">CANCELLED</MenuItem>
              </TextField>
              <TextField label="Notes / Results" fullWidth margin="normal" multiline rows={3} value={updateData.notes} onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus} disabled={!updateData.status}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Investigation Details</DialogTitle>
        <DialogContent>
          {selectedInvestigation && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography><strong>Patient:</strong> {selectedInvestigation.patient?.firstName} {selectedInvestigation.patient?.lastName}</Typography>
              <Typography><strong>Test:</strong> {selectedInvestigation.testName}</Typography>
              <Typography><strong>Type:</strong> {selectedInvestigation.testType}</Typography>
              <Typography><strong>Ordered By:</strong> Dr. {selectedInvestigation.doctor?.firstName} {selectedInvestigation.doctor?.lastName}</Typography>
              <Typography><strong>Status:</strong> <Chip label={selectedInvestigation.status.replace('_', ' ')} size="small" color={statusColors[selectedInvestigation.status] || 'default'} /></Typography>
              {selectedInvestigation.priority && <Typography><strong>Priority:</strong> {selectedInvestigation.priority}</Typography>}
              {selectedInvestigation.instructions && <Typography><strong>Instructions:</strong> {selectedInvestigation.instructions}</Typography>}
              {selectedInvestigation.notes && <Typography><strong>Notes:</strong> {selectedInvestigation.notes}</Typography>}
              <Typography><strong>Ordered:</strong> {new Date(selectedInvestigation.createdAt).toLocaleString()}</Typography>
              <Typography><strong>Last Updated:</strong> {new Date(selectedInvestigation.updatedAt).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvestigationQueue;
