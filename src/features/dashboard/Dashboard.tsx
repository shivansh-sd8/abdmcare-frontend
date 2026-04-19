import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  People,
  LocalHospital,
  CalendarToday,
  HealthAndSafety,
  TrendingUp,
  PersonAdd,
  EventAvailable,
  MedicalServices,
} from '@mui/icons-material';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import { toast } from 'react-toastify';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactElement;
  color: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, trendUp }) => (
  <Card
    sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
      borderRadius: 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: `0 12px 40px ${alpha(color, 0.25)}`,
        border: `1px solid ${alpha(color, 0.4)}`,
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 1, color }}>
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingUp
                sx={{
                  fontSize: 16,
                  color: trendUp ? '#2e7d32' : '#d32f2f',
                  transform: trendUp ? 'none' : 'rotate(180deg)',
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: trendUp ? '#2e7d32' : '#d32f2f', fontWeight: 600 }}
              >
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: 3,
            p: 1.5,
            display: 'flex',
            color: 'white',
            boxShadow: `0 4px 12px ${color}60`,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    todayAppointments: 0,
    abhaLinked: 0,
    patientTrend: '',
    doctorTrend: '',
    appointmentTrend: '',
  });
  const [departmentData, setDepartmentData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [patientStats, doctorStats, appointmentStats] = await Promise.all([
        patientService.getPatientStats(),
        doctorService.getDoctorStats(),
        appointmentService.getAppointmentStats(),
      ]);

      const pStats = patientStats as any;
      const dStats = doctorStats as any;
      const aStats = appointmentStats as any;

      const totalPatients = pStats.data?.total || 0;
      const totalDoctors = dStats.data?.total || 0;
      const todayAppointments = aStats.data?.today || 0;
      const abhaLinked = pStats.data?.abhaLinked || 0;

      setStats({
        totalPatients,
        totalDoctors,
        todayAppointments,
        abhaLinked,
        patientTrend: '',
        doctorTrend: '',
        appointmentTrend: '',
      });

      if (dStats.data?.specializations) {
        const peacefulColors = ['#4A90E2', '#50C878', '#9B59B6', '#F39C12', '#E74C3C'];
        const deptData = dStats.data.specializations.map((spec: any, index: number) => ({
          name: spec.name,
          value: spec.count,
          color: peacefulColors[index % peacefulColors.length],
        }));
        setDepartmentData(deptData);
      }
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 4,
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            Hospital Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your hospital today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<EventAvailable />}>
            View Calendar
          </Button>
          <Button variant="contained" startIcon={<PersonAdd />}>
            New Patient
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Total Patients"
              value={stats.totalPatients.toLocaleString()}
              icon={<People sx={{ fontSize: 32 }} />}
              color="#4A90E2"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="ABHA Linked"
              value={stats.abhaLinked.toLocaleString()}
              icon={<HealthAndSafety sx={{ fontSize: 32 }} />}
              color="#50C878"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Total Doctors"
              value={stats.totalDoctors.toLocaleString()}
              icon={<LocalHospital sx={{ fontSize: 32 }} />}
              color="#9B59B6"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Today's Appointments"
              value={stats.todayAppointments.toLocaleString()}
              icon={<CalendarToday sx={{ fontSize: 32 }} />}
              color="#F39C12"
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="600">
                Department Distribution
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => entry.name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<PersonAdd />}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                Register New Patient
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EventAvailable />}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                Schedule Appointment
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<MedicalServices />}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                Create ABHA
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
