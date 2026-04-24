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
  Business,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import hospitalService from '../../services/hospitalService';
import { useRolePermissions } from '../../hooks/useRolePermissions';
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
  const navigate = useNavigate();
  const permissions = useRolePermissions();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalHospitals: 0,
    todayAppointments: 0,
    abhaLinked: 0,
    malePatients: 0,
    femalePatients: 0,
    otherPatients: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
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
      
      // Fetch data based on user permissions
      const promises: Promise<any>[] = [];
      
      // Patient stats - Only SUPER_ADMIN, ADMIN, DOCTOR
      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor) {
        promises.push(
          patientService.getPatientStats().catch(() => ({ data: { total: 0, abhaLinked: 0 } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { total: 0, abhaLinked: 0 } }));
      }
      
      // Doctor stats - Only SUPER_ADMIN and ADMIN
      if (permissions.isAdmin || permissions.isSuperAdmin) {
        promises.push(
          doctorService.getDoctorStats().catch(() => ({ data: { total: 0 } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { total: 0 } }));
      }
      
      // Appointment stats - Only SUPER_ADMIN, ADMIN, and DOCTOR
      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor) {
        promises.push(
          appointmentService.getAppointmentStats().catch(() => ({ data: { today: 0 } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { today: 0 } }));
      }

      // Hospital stats - Only SUPER_ADMIN
      if (permissions.isSuperAdmin) {
        promises.push(
          hospitalService.getAllHospitals().catch(() => ({ data: { total: 0 } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { total: 0 } }));
      }

      const [patientStats, doctorStats, appointmentStats, hospitalStats] = await Promise.all(promises);

      const pStats = patientStats as any;
      const dStats = doctorStats as any;
      const aStats = appointmentStats as any;
      const hStats = hospitalStats as any;

      const totalPatients = pStats.data?.total || 0;
      const totalDoctors = dStats.data?.total || 0;
      const totalHospitals = hStats.data?.total || 0;
      const todayAppointments = aStats.data?.today || 0;
      const abhaLinked = pStats.data?.abhaLinked || 0;

      setStats({
        totalPatients,
        totalDoctors,
        totalHospitals,
        todayAppointments,
        abhaLinked,
        malePatients: pStats.data?.male || 0,
        femalePatients: pStats.data?.female || 0,
        otherPatients: pStats.data?.other || 0,
        scheduledAppointments: aStats.data?.scheduled || 0,
        completedAppointments: aStats.data?.completed || 0,
        cancelledAppointments: aStats.data?.cancelled || 0,
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
      // Silently handle errors - permission errors are already caught above
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Role-specific dashboard titles
  const getDashboardTitle = () => {
    if (permissions.isSuperAdmin) return 'System Dashboard';
    if (permissions.isAdmin) return 'Hospital Dashboard';
    if (permissions.isDoctor) return 'My Practice Dashboard';
    if (permissions.isNurse) return 'Ward Dashboard';
    if (permissions.isReceptionist) return 'Front Desk Dashboard';
    return 'Dashboard';
  };

  const getDashboardSubtitle = () => {
    if (permissions.isSuperAdmin) return 'System-wide overview and analytics';
    if (permissions.isAdmin) return "Welcome back! Here's what's happening with your hospital today.";
    if (permissions.isDoctor) return 'Your patients and appointments overview';
    if (permissions.isNurse) return 'Your assigned patients and ward activities';
    if (permissions.isReceptionist) return 'Appointment queue and patient registration';
    return 'Welcome back!';
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
            {getDashboardTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getDashboardSubtitle()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isReceptionist) && (
            <Button variant="outlined" startIcon={<EventAvailable />} onClick={() => navigate('/appointments')}>
              {permissions.isReceptionist ? 'Appointment Queue' : 'View Calendar'}
            </Button>
          )}
          {permissions.canCreatePatient && (
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => navigate('/patients/new')}>
              New Patient
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* All roles can see patient stats */}
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title={permissions.isDoctor ? "My Patients" : permissions.isNurse ? "Assigned Patients" : "Total Patients"}
              value={stats.totalPatients.toLocaleString()}
              icon={<People sx={{ fontSize: 32 }} />}
              color="#4A90E2"
            />
          )}
        </Grid>

        {/* Hospital stats - SUPER_ADMIN only */}
        {permissions.isSuperAdmin && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? (
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            ) : (
              <StatCard
                title="Total Hospitals"
                value={stats.totalHospitals.toLocaleString()}
                icon={<Business sx={{ fontSize: 32 }} />}
                color="#FF6B6B"
              />
            )}
          </Grid>
        )}

        {/* ABHA stats - visible to SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isReceptionist) && (
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
        )}

        {/* Doctor stats - only SUPER_ADMIN and ADMIN */}
        {(permissions.isAdmin || permissions.isSuperAdmin) && (
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
        )}

        {/* Appointment stats - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST */}
        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? (
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            ) : (
              <StatCard
                title={permissions.isDoctor ? "My Appointments" : permissions.isReceptionist ? "Today's Queue" : "Today's Appointments"}
                value={stats.todayAppointments.toLocaleString()}
                icon={<CalendarToday sx={{ fontSize: 32 }} />}
                color="#F39C12"
              />
            )}
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Department Distribution - Only for ADMIN and SUPER_ADMIN */}
        {(permissions.isAdmin || permissions.isSuperAdmin) && departmentData.length > 0 && (
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
        )}

        <Grid item xs={12} lg={(permissions.isAdmin || permissions.isSuperAdmin) && departmentData.length > 0 ? 4 : 12}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Register Patient - SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
              {permissions.canCreatePatient && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PersonAdd />}
                  onClick={() => navigate('/patients/new')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Register New Patient
                </Button>
              )}

              {/* Schedule Appointment - SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
              {permissions.canCreateAppointment && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<EventAvailable />}
                  onClick={() => navigate('/appointments')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Schedule Appointment
                </Button>
              )}

              {/* Create ABHA - SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
              {permissions.canManageABHA && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<MedicalServices />}
                  onClick={() => navigate('/abha')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Create ABHA
                </Button>
              )}

              {/* View Patients - All roles */}
              <Button
                variant="outlined"
                fullWidth
                startIcon={<People />}
                onClick={() => navigate('/patients')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {permissions.isDoctor ? 'My Patients' : permissions.isNurse ? 'Assigned Patients' : 'View Patients'}
              </Button>

              {/* View Appointments - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST */}
              {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CalendarToday />}
                  onClick={() => navigate('/appointments')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  {permissions.isReceptionist ? 'Appointment Queue' : permissions.isDoctor ? 'My Appointments' : 'View Appointments'}
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
