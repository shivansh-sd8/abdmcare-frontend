import React, { useState, useEffect } from 'react';
import {
  Box, Grid, useTheme,
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
import { StatCard, SectionCard } from '../../components/ui';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
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

  const statCards: { label: string; value: number; icon: React.ReactElement; tone: 'info' | 'secondary' | 'warning' | 'success'; path: string }[] = [
    { label: 'Total Patients',       value: stats.totalPatients,       icon: <People />,           tone: 'info',      path: '/app/patients' },
    { label: 'Doctors',              value: stats.totalDoctors,        icon: <LocalHospital />,    tone: 'secondary', path: '/app/doctors' },
    { label: "Today's Appointments", value: stats.todayAppointments,   icon: <CalendarToday />,    tone: 'warning',   path: '/app/appointments' },
    { label: 'ABHA Linked',          value: stats.abhaLinked,          icon: <HealthAndSafety />,  tone: 'success',   path: '/app/abha' },
  ];

  return (
    <Box>
      <Grid container spacing={2.25} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <StatCard
              label={s.label}
              value={s.value.toLocaleString()}
              tone={s.tone}
              icon={s.icon}
              loading={loading}
              onClick={() => navigate(s.path)}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.25}>
        {appointmentStatusData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <SectionCard title="Appointment status" sx={{ height: '100%' }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} stroke={theme.palette.text.secondary} />
                  <YAxis fontSize={11} stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                      fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {appointmentStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>
        )}

        {genderData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <SectionCard title="Patient demographics" sx={{ height: '100%' }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={genderData} cx="50%" cy="50%" labelLine={false}
                    label={(e: any) => `${e.name}: ${e.value}`}
                    outerRadius={85} dataKey="value"
                  >
                    {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                      fontSize: '0.8125rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>
        )}

        {departmentData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <SectionCard title="Department distribution" sx={{ height: '100%' }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData} cx="50%" cy="50%" labelLine={false}
                    label={(e: any) => e.name}
                    outerRadius={85} dataKey="value"
                  >
                    {departmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                      fontSize: '0.8125rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
