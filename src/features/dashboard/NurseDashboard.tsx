import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper, List,
  ListItem, ListItemText, Chip, Button,
} from '@mui/material';
import {
  MeetingRoom, MonitorHeart, Hotel, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NurseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ occupancy: 0, totalBeds: 0, activeAdmissions: 0 });
  const [admissions, setAdmissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, admRes] = await Promise.allSettled([
          api.get<any>('/api/v1/ipd/overview'),
          api.get<any>('/api/v1/ipd/admissions?status=ADMITTED&limit=5'),
        ]);

        if (overviewRes.status === 'fulfilled') {
          const data = overviewRes.value?.data;
          const wards = data?.wards || data || [];
          let occupied = 0;
          let total = 0;
          if (Array.isArray(wards)) {
            wards.forEach((w: any) => {
              occupied += w.occupiedBeds || 0;
              total += w.totalBeds || 0;
            });
          }
          setStats((prev) => ({ ...prev, occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0, totalBeds: total }));
        }

        if (admRes.status === 'fulfilled') {
          const data = admRes.value?.data;
          const list = data?.admissions || data?.data || [];
          setAdmissions(Array.isArray(list) ? list.slice(0, 5) : []);
          setStats((prev) => ({ ...prev, activeAdmissions: data?.total || list.length || 0 }));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Ward Occupancy', value: `${stats.occupancy}%`, icon: <MeetingRoom />, color: '#9B59B6' },
    { label: 'Total Beds', value: String(stats.totalBeds), icon: <Hotel />, color: '#4A90E2' },
    { label: 'Active Admissions', value: String(stats.activeAdmissions), icon: <MonitorHeart />, color: '#E74C3C' },
  ];

  return (
    <Box>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.label}>
            {loading ? (
              <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} />
            ) : (
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                  border: `1px solid ${alpha(s.color, 0.2)}`,
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                        {s.value}
                      </Typography>
                    </Box>
                    <Box sx={{ bgcolor: s.color, borderRadius: 2, p: 1.2, display: 'flex', color: 'white' }}>
                      {s.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Active Admissions</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/ipd')}>
            View All
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : admissions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No active admissions
          </Typography>
        ) : (
          <List disablePadding>
            {admissions.map((adm: any, i: number) => (
              <ListItem key={adm.id || i} divider={i < admissions.length - 1} sx={{ px: 0 }}>
                <ListItemText
                  primary={adm.patient ? `${adm.patient.firstName} ${adm.patient.lastName}` : 'Patient'}
                  secondary={`Ward: ${adm.bed?.ward?.name || 'N/A'} • Bed: ${adm.bed?.bedNumber || 'N/A'}`}
                />
                <Chip
                  label={adm.status || 'ADMITTED'}
                  size="small"
                  color={adm.status === 'DISCHARGED' ? 'success' : 'info'}
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default NurseDashboard;
