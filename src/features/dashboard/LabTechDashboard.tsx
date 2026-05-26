import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper, Button,
  List, ListItem, ListItemText, Chip,
} from '@mui/material';
import {
  Science, PriorityHigh, CheckCircle, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const LabTechDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, urgent: 0, completedToday: 0 });
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, listRes] = await Promise.allSettled([
          api.get<any>('/api/v1/investigations/stats'),
          api.get<any>('/api/v1/investigations?status=ORDERED&limit=5'),
        ]);

        if (statsRes.status === 'fulfilled') {
          const data = statsRes.value?.data;
          setStats({
            pending: data?.pending || 0,
            urgent: data?.urgent || 0,
            completedToday: data?.completedToday || 0,
          });
        }

        if (listRes.status === 'fulfilled') {
          const data = listRes.value?.data;
          const list = data?.investigations || data?.data || [];
          setPendingItems(Array.isArray(list) ? list.slice(0, 5) : []);
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
    { label: 'Pending Investigations', value: stats.pending, icon: <Science />, color: '#F39C12' },
    { label: 'Urgent Orders', value: stats.urgent, icon: <PriorityHigh />, color: '#E74C3C' },
    { label: 'Completed Today', value: stats.completedToday, icon: <CheckCircle />, color: '#50C878' },
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
          <Typography variant="subtitle1" fontWeight={600}>Pending Orders</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/investigations')}>
            View Queue
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : pendingItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No pending investigations
          </Typography>
        ) : (
          <List disablePadding>
            {pendingItems.map((item: any, i: number) => (
              <ListItem key={item.id || i} divider={i < pendingItems.length - 1} sx={{ px: 0 }}>
                <ListItemText
                  primary={item.testName || 'Investigation'}
                  secondary={item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : ''}
                />
                <Chip
                  label={item.priority === 'URGENT' ? 'Urgent' : item.status || 'Ordered'}
                  size="small"
                  color={item.priority === 'URGENT' ? 'error' : 'warning'}
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

export default LabTechDashboard;
