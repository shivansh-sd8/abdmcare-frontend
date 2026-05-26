import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper, Button,
  List, ListItem, ListItemText, Chip,
} from '@mui/material';
import {
  LocalPharmacy, CheckCircle, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PharmacistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pendingDispense: 0, completedToday: 0 });
  const [pendingRx, setPendingRx] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const listRes = await api.get<any>('/api/v1/prescriptions?status=PENDING&limit=5');
        const data = listRes?.data;
        const list = data?.prescriptions || data?.data || [];
        const items = Array.isArray(list) ? list : [];
        setPendingRx(items.slice(0, 5));
        setStats({
          pendingDispense: data?.total || items.length,
          completedToday: data?.completedToday || 0,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Pending to Dispense', value: stats.pendingDispense, icon: <LocalPharmacy />, color: '#F39C12' },
    { label: 'Completed Today', value: stats.completedToday, icon: <CheckCircle />, color: '#50C878' },
  ];

  return (
    <Box>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} key={s.label}>
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
          <Typography variant="subtitle1" fontWeight={600}>Pending Prescriptions</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/pharmacy')}>
            View Queue
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : pendingRx.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No pending prescriptions
          </Typography>
        ) : (
          <List disablePadding>
            {pendingRx.map((rx: any, i: number) => (
              <ListItem key={rx.id || i} divider={i < pendingRx.length - 1} sx={{ px: 0 }}>
                <ListItemText
                  primary={rx.medication || rx.drugName || 'Prescription'}
                  secondary={rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}` : ''}
                />
                <Chip label="Pending" size="small" color="warning" variant="outlined" />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default PharmacistDashboard;
