import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, alpha, Paper,
} from '@mui/material';
import {
  People, LocalHospital, CalendarToday, HealthAndSafety,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0, totalDoctors: 0, todayAppointments: 0, abhaLinked: 0,
  });
  const [appointmentStatusData, setAppointmentStatusData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, dRes, aRes] = await Promise.allSettled([
          patientService.getPatientStats(),
          doctorService.getDoctorStats(),
          appointmentService.getAppointmentStats(),
        ]);

        const pData: any = pRes.status === 'fulfilled' ? (pRes.value as any)?.data : {};
        const dData: any = dRes.status === 'fulfilled' ? (dRes.value as any)?.data : {};
        const aData: any = aRes.status === 'fulfilled' ? (aRes.value as any)?.data : {};

        setStats({
          totalPatients: pData?.total || 0,
          totalDoctors: dData?.total || 0,
          todayAppointments: aData?.today || 0,
          abhaLinked: pData?.abhaLinked || 0,
        });

        if (aData?.scheduled || aData?.completed || aData?.cancelled) {
          setAppointmentStatusData([
            { name: 'Scheduled', value: aData.scheduled || 0, fill: '#4A90E2' },
            { name: 'Completed', value: aData.completed || 0, fill: '#50C878' },
            { name: 'Cancelled', value: aData.cancelled || 0, fill: '#E74C3C' },
          ]);
        }

        if (pData?.male || pData?.female || pData?.other) {
          setGenderData([
            { name: 'Male', value: pData.male || 0, fill: '#4A90E2' },
            { name: 'Female', value: pData.female || 0, fill: '#FF69B4' },
            { name: 'Other', value: pData.other || 0, fill: '#9B59B6' },
          ]);
        }

        if (dData?.specializations) {
          const colors = ['#4A90E2', '#50C878', '#9B59B6', '#F39C12', '#E74C3C'];
          setDepartmentData(dData.specializations.map((spec: any, i: number) => ({
            name: spec.name, value: spec.count, color: colors[i % colors.length],
          })));
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
    { label: 'Total Patients', value: stats.totalPatients, icon: <People />, color: '#4A90E2', path: '/app/patients' },
    { label: 'Doctors', value: stats.totalDoctors, icon: <LocalHospital />, color: '#9B59B6', path: '/app/doctors' },
    { label: "Today's Appointments", value: stats.todayAppointments, icon: <CalendarToday />, color: '#F39C12', path: '/app/appointments' },
    { label: 'ABHA Linked', value: stats.abhaLinked, icon: <HealthAndSafety />, color: '#50C878', path: '/app/abha' },
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
                onClick={() => navigate(s.path)}
                sx={{
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                  border: `1px solid ${alpha(s.color, 0.2)}`,
                  borderRadius: 3,
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${alpha(s.color, 0.2)}` },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                        {s.value.toLocaleString()}
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
        {appointmentStatusData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Appointment Status</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appointmentStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {genderData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Patient Demographics</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" labelLine={false}
                    label={(e: any) => `${e.name}: ${e.value}`}
                    outerRadius={85} dataKey="value">
                    {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {departmentData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Department Distribution</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={departmentData} cx="50%" cy="50%" labelLine={false}
                    label={(e: any) => e.name}
                    outerRadius={85} dataKey="value">
                    {departmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
