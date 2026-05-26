import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper,
  List, ListItem, ListItemText, Chip, Button,
} from '@mui/material';
import {
  Business, People, HealthAndSafety, Timer, ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHospitals: 0, totalPatients: 0, abhaTransactions: 0, uptimeHours: 0,
  });
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hospitalRes, patientRes] = await Promise.allSettled([
          api.get<any>('/api/v1/hospitals/stats'),
          api.get<any>('/api/v1/patients/stats'),
        ]);

        const hData = hospitalRes.status === 'fulfilled' ? hospitalRes.value?.data : {};
        const pData = patientRes.status === 'fulfilled' ? patientRes.value?.data : {};

        setStats({
          totalHospitals: hData?.data?.total || hData?.total || 0,
          totalPatients: pData?.total || 0,
          abhaTransactions: pData?.abhaLinked || 0,
          uptimeHours: Math.round(performance.now() / 3600000) || 0,
        });

        try {
          const hListRes: any = await api.get('/api/v1/hospitals');
          const list = hListRes?.data?.data?.hospitals || hListRes?.data?.hospitals || [];
          setHospitals(Array.isArray(list) ? list.slice(0, 5) : []);
        } catch {
          // silent
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
    { label: 'Total Hospitals', value: stats.totalHospitals, icon: <Business />, color: '#FF6B6B' },
    { label: 'Total Patients', value: stats.totalPatients, icon: <People />, color: '#4A90E2' },
    { label: 'ABHA Linked', value: stats.abhaTransactions, icon: <HealthAndSafety />, color: '#50C878' },
    { label: 'System Uptime', value: `${stats.uptimeHours}h`, icon: <Timer />, color: '#9B59B6', isString: true },
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
                        {'isString' in s ? s.value : (s.value as number).toLocaleString()}
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
          <Typography variant="subtitle1" fontWeight={600}>Hospitals</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/app/hospitals')}>
            Manage
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ) : hospitals.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No hospitals registered
          </Typography>
        ) : (
          <List disablePadding>
            {hospitals.map((h: any, i: number) => (
              <ListItem key={h.id || i} divider={i < hospitals.length - 1} sx={{ px: 0 }}>
                <ListItemText
                  primary={h.name || 'Hospital'}
                  secondary={`Code: ${h.code || 'N/A'} • ${h.city || h.address || ''}`}
                />
                <Chip
                  label={h.isActive !== false ? 'Active' : 'Inactive'}
                  size="small"
                  color={h.isActive !== false ? 'success' : 'default'}
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

export default SuperAdminDashboard;
