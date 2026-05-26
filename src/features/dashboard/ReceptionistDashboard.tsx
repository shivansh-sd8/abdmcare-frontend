import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper, Button,
} from '@mui/material';
import {
  CalendarToday, HowToReg, DirectionsWalk, Payments, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ReceptionistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0, walkins: 0, checkedIn: 0, paymentsToday: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, payRes] = await Promise.allSettled([
          api.get<any>('/api/v1/appointments/stats'),
          api.get<any>('/api/v1/payments/stats'),
        ]);

        const apptData = apptRes.status === 'fulfilled' ? apptRes.value?.data : {};
        const payData = payRes.status === 'fulfilled' ? payRes.value?.data : {};

        setStats({
          todayAppointments: apptData?.today || 0,
          walkins: apptData?.walkins || 0,
          checkedIn: apptData?.checkedIn || 0,
          paymentsToday: payData?.todayTotal || payData?.totalCollected || 0,
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
    { label: "Today's Appointments", value: stats.todayAppointments, icon: <CalendarToday />, color: '#4A90E2' },
    { label: 'Walk-ins', value: stats.walkins, icon: <DirectionsWalk />, color: '#F39C12' },
    { label: 'Checked In', value: stats.checkedIn, icon: <HowToReg />, color: '#50C878' },
    { label: 'Payments Today', value: stats.paymentsToday, icon: <Payments />, color: '#9B59B6', isCurrency: true },
  ];

  return (
    <Box>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
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
                        {'isCurrency' in s && s.isCurrency ? `₹${s.value.toLocaleString()}` : s.value}
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

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Appointments</Typography>
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/appointments')}>
                View
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Manage today's appointment queue, check-ins, and walk-in registrations from the Appointments page.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Billing</Typography>
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/billing')}>
                View
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Process pending payments, view consolidated bills, and manage payment collections.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceptionistDashboard;
