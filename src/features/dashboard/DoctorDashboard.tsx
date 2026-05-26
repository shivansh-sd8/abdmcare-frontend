import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, List, ListItem,
  ListItemText, Chip, Skeleton, alpha, Paper, Button,
} from '@mui/material';
import {
  People, Science, MedicalServices, CalendarToday, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactElement;
  color: string;
}

const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayQueue: 0, waiting: 0, pendingLabs: 0 });
  const [recentEncounters, setRecentEncounters] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, encounterRes, labRes] = await Promise.allSettled([
          api.get<any>('/api/v1/appointments/stats'),
          api.get<any>('/api/v1/encounters?limit=5'),
          api.get<any>('/api/v1/investigations/stats'),
        ]);

        const apptData = apptRes.status === 'fulfilled' ? apptRes.value?.data : {};
        const encounterData = encounterRes.status === 'fulfilled' ? encounterRes.value?.data : {};
        const labData = labRes.status === 'fulfilled' ? labRes.value?.data : {};

        setStats({
          todayQueue: apptData?.today || 0,
          waiting: apptData?.scheduled || 0,
          pendingLabs: labData?.pending || 0,
        });

        const encounters = encounterData?.encounters || encounterData?.data || [];
        setRecentEncounters(Array.isArray(encounters) ? encounters.slice(0, 5) : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards: StatItem[] = [
    { label: "Today's Queue", value: stats.todayQueue, icon: <CalendarToday />, color: '#4A90E2' },
    { label: 'Patients Waiting', value: stats.waiting, icon: <People />, color: '#F39C12' },
    { label: 'Pending Lab Results', value: stats.pendingLabs, icon: <Science />, color: '#E74C3C' },
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
          <Typography variant="subtitle1" fontWeight={600}>Recent Encounters</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/encounters')}>
            View All
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : recentEncounters.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No recent encounters
          </Typography>
        ) : (
          <List disablePadding>
            {recentEncounters.map((enc: any, i: number) => (
              <ListItem
                key={enc.id || i}
                divider={i < recentEncounters.length - 1}
                sx={{ px: 0 }}
              >
                <ListItemText
                  primary={enc.patient ? `${enc.patient.firstName} ${enc.patient.lastName}` : 'Patient'}
                  secondary={enc.chiefComplaint || enc.type || 'Consultation'}
                />
                <Chip
                  label={enc.status || 'ACTIVE'}
                  size="small"
                  color={enc.status === 'COMPLETED' ? 'success' : 'warning'}
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

export default DoctorDashboard;
