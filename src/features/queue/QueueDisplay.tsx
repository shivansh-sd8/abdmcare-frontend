import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TvIcon from '@mui/icons-material/Tv';
import ViewListIcon from '@mui/icons-material/ViewList';
import RefreshIcon from '@mui/icons-material/Refresh';
import apiService from '../../services/api';

interface QueuePatient {
  id: string;
  tokenNumber: number;
  patientName: string;
  patientUHID: string;
  doctorName: string;
  department: string;
  appointmentType: string;
  status: 'WAITING' | 'IN_CONSULTATION' | 'LAB_PENDING' | 'PHARMACY_PENDING' | 'COMPLETED';
  checkInTime: string;
  estimatedWaitMinutes?: number;
}

interface QueueResponse {
  data: QueuePatient[];
  stats: {
    waiting: number;
    inConsultation: number;
    labPending: number;
    pharmacyPending: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: 'warning' | 'success' | 'info' | 'secondary' | 'default' }> = {
  WAITING: { label: 'Waiting', color: 'warning' },
  IN_CONSULTATION: { label: 'In Consultation', color: 'success' },
  LAB_PENDING: { label: 'Lab Pending', color: 'info' },
  PHARMACY_PENDING: { label: 'Pharmacy Pending', color: 'secondary' },
  COMPLETED: { label: 'Completed', color: 'default' },
};

const REFRESH_INTERVAL_MS = 15_000;

const QueueDisplay: React.FC = () => {
  const theme = useTheme();
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [stats, setStats] = useState({ waiting: 0, inConsultation: 0, labPending: 0, pharmacyPending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'tv'>('compact');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchQueue = useCallback(async () => {
    try {
      const response = await apiService.get<QueueResponse>('/api/v1/appointments/search?status=CHECKED_IN&today=true');
      const data = (response as any)?.data;

      if (Array.isArray(data)) {
        const mapped: QueuePatient[] = data.map((apt: any, idx: number) => ({
          id: apt.id,
          tokenNumber: apt.tokenNumber || idx + 1,
          patientName: `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.trim(),
          patientUHID: apt.patient?.uhid || '-',
          doctorName: `Dr. ${apt.doctor?.user?.firstName || ''} ${apt.doctor?.user?.lastName || ''}`.trim(),
          department: apt.doctor?.department || 'General',
          appointmentType: apt.type || 'OPD',
          status: mapStatus(apt.status, apt),
          checkInTime: apt.checkInTime || apt.updatedAt || apt.date,
          estimatedWaitMinutes: apt.estimatedWaitMinutes,
        }));

        setPatients(mapped);
        setStats({
          waiting: mapped.filter((p) => p.status === 'WAITING').length,
          inConsultation: mapped.filter((p) => p.status === 'IN_CONSULTATION').length,
          labPending: mapped.filter((p) => p.status === 'LAB_PENDING').length,
          pharmacyPending: mapped.filter((p) => p.status === 'PHARMACY_PENDING').length,
        });
      }

      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const filteredPatients =
    statusFilter === 'ALL' ? patients : patients.filter((p) => p.status === statusFilter);

  const isTv = viewMode === 'tv';

  return (
    <Box sx={{ p: isTv ? 4 : 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant={isTv ? 'h3' : 'h5'} fontWeight={700}>
            OPD Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Auto-refreshes every 15s · Last updated{' '}
            {lastRefreshed.toLocaleTimeString()}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="compact">
            <ViewListIcon sx={{ mr: 0.5 }} /> Compact
          </ToggleButton>
          <ToggleButton value="tv">
            <TvIcon sx={{ mr: 0.5 }} /> TV Display
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Waiting', value: stats.waiting, color: theme.palette.warning.main },
          { label: 'In Consultation', value: stats.inConsultation, color: theme.palette.success.main },
          { label: 'Lab Pending', value: stats.labPending, color: theme.palette.info.main },
          { label: 'Pharmacy Pending', value: stats.pharmacyPending, color: theme.palette.secondary.main },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { borderColor: s.color },
              }}
              onClick={() =>
                setStatusFilter(
                  statusFilter === s.label.toUpperCase().replace(/ /g, '_')
                    ? 'ALL'
                    : s.label.toUpperCase().replace(/ /g, '_'),
                )
              }
            >
              <CardContent sx={{ textAlign: 'center', py: isTv ? 3 : 2 }}>
                <Typography
                  variant={isTv ? 'h2' : 'h4'}
                  fontWeight={700}
                  sx={{ color: s.color }}
                >
                  {s.value}
                </Typography>
                <Typography variant={isTv ? 'h6' : 'body2'} color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          variant={statusFilter === 'ALL' ? 'filled' : 'outlined'}
          onClick={() => setStatusFilter('ALL')}
        />
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Chip
            key={key}
            label={cfg.label}
            color={cfg.color}
            variant={statusFilter === key ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(statusFilter === key ? 'ALL' : key)}
          />
        ))}
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredPatients.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="h6" color="text.secondary">
            No patients in queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patients appear here once they check in for their appointment.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <List disablePadding>
            {filteredPatients.map((patient, idx) => (
              <React.Fragment key={patient.id}>
                {idx > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: isTv ? 3 : 1.5,
                    px: isTv ? 4 : 2,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: STATUS_CONFIG[patient.status]?.color === 'warning'
                          ? 'warning.light'
                          : STATUS_CONFIG[patient.status]?.color === 'success'
                          ? 'success.light'
                          : 'primary.light',
                        color: 'white',
                        width: isTv ? 64 : 40,
                        height: isTv ? 64 : 40,
                        fontSize: isTv ? 28 : 16,
                        fontWeight: 700,
                        mr: 1,
                      }}
                    >
                      {patient.tokenNumber}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant={isTv ? 'h5' : 'subtitle1'} fontWeight={600}>
                        {patient.patientName}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant={isTv ? 'body1' : 'body2'} color="text.secondary">
                          UHID: {patient.patientUHID}
                        </Typography>
                        <Typography variant={isTv ? 'body1' : 'body2'} color="text.secondary">
                          {patient.doctorName}
                        </Typography>
                        <Typography variant={isTv ? 'body1' : 'body2'} color="text.secondary">
                          {patient.department}
                        </Typography>
                        {patient.estimatedWaitMinutes != null && (
                          <Typography variant={isTv ? 'body1' : 'body2'} color="text.secondary">
                            ~{patient.estimatedWaitMinutes} min wait
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip
                    label={STATUS_CONFIG[patient.status]?.label || patient.status}
                    color={STATUS_CONFIG[patient.status]?.color || 'default'}
                    size={isTv ? 'medium' : 'small'}
                    sx={{ fontWeight: 600, fontSize: isTv ? 16 : 12 }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

function mapStatus(
  aptStatus: string,
  apt: any,
): QueuePatient['status'] {
  if (aptStatus === 'IN_PROGRESS') return 'IN_CONSULTATION';
  if (aptStatus === 'CHECKED_IN') return 'WAITING';
  if (apt?.labPending) return 'LAB_PENDING';
  if (apt?.pharmacyPending) return 'PHARMACY_PENDING';
  if (aptStatus === 'COMPLETED') return 'COMPLETED';
  return 'WAITING';
}

export default QueueDisplay;
