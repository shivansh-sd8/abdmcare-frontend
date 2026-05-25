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
import api from '../../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactElement;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      height: '100%',
      cursor: onClick ? 'pointer' : 'default',
      background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
      borderRadius: 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: onClick ? 'translateY(-4px)' : 'none',
        boxShadow: onClick ? `0 8px 30px ${alpha(color, 0.2)}` : 'none',
      },
    }}
  >
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500, fontSize: '0.8rem' }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color, borderRadius: 2, p: 1.2,
            display: 'flex', color: 'white',
            boxShadow: `0 4px 12px ${color}40`,
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
  const [hospitalName, setHospitalName] = useState<string>('');
  const [stats, setStats] = useState({
    totalPatients: 0, totalDoctors: 0, totalHospitals: 0,
    todayAppointments: 0, abhaLinked: 0,
    scheduledAppointments: 0, completedAppointments: 0, cancelledAppointments: 0,
  });
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const promises: Promise<any>[] = [];

      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) {
        promises.push(patientService.getPatientStats().catch(() => ({ data: { total: 0, abhaLinked: 0 } })));
      } else {
        promises.push(Promise.resolve({ data: { total: 0, abhaLinked: 0 } }));
      }

      if (permissions.isAdmin || permissions.isSuperAdmin) {
        promises.push(doctorService.getDoctorStats().catch(() => ({ data: { total: 0 } })));
      } else {
        promises.push(Promise.resolve({ data: { total: 0 } }));
      }

      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) {
        promises.push(appointmentService.getAppointmentStats().catch(() => ({ data: { today: 0 } })));
      } else {
        promises.push(Promise.resolve({ data: { today: 0 } }));
      }

      if (permissions.isSuperAdmin) {
        promises.push(hospitalService.getAllHospitalStats().catch(() => ({ data: { data: { total: 0 } } })));
      } else {
        promises.push(Promise.resolve({ data: { data: { total: 0 } } }));
      }

      const [patientStats, doctorStats, appointmentStats, hospitalStats] = await Promise.all(promises);

      const pStats = patientStats as any;
      const dStats = doctorStats as any;
      const aStats = appointmentStats as any;
      const hStats = hospitalStats as any;

      setStats({
        totalPatients: pStats.data?.total || 0,
        totalDoctors: dStats.data?.total || 0,
        totalHospitals: hStats.data?.data?.total || hStats.data?.total || 0,
        todayAppointments: aStats.data?.today || 0,
        abhaLinked: pStats.data?.abhaLinked || 0,
        scheduledAppointments: aStats.data?.scheduled || 0,
        completedAppointments: aStats.data?.completed || 0,
        cancelledAppointments: aStats.data?.cancelled || 0,
      });

      if (permissions.isAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist || permissions.isLabTechnician || permissions.isPharmacist) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.hospitalId) {
              const hospitalResp: any = await api.get(`/api/v1/hospitals/${user.hospitalId}`);
              setHospitalName(hospitalResp.data?.name || '');
            }
          }
        } catch {}
      }

      if (dStats.data?.specializations) {
        const colors = ['#4A90E2', '#50C878', '#9B59B6', '#F39C12', '#E74C3C'];
        setDepartmentData(dStats.data.specializations.map((spec: any, i: number) => ({
          name: spec.name, value: spec.count, color: colors[i % colors.length],
        })));
      }

      if (aStats.data?.scheduled || aStats.data?.completed || aStats.data?.cancelled) {
        setAppointmentStatusData([
          { name: 'Scheduled', value: aStats.data?.scheduled || 0, fill: '#4A90E2' },
          { name: 'Completed', value: aStats.data?.completed || 0, fill: '#50C878' },
          { name: 'Cancelled', value: aStats.data?.cancelled || 0, fill: '#E74C3C' },
        ]);
      }

      if (pStats.data?.male || pStats.data?.female || pStats.data?.other) {
        setGenderData([
          { name: 'Male', value: pStats.data?.male || 0, fill: '#4A90E2' },
          { name: 'Female', value: pStats.data?.female || 0, fill: '#FF69B4' },
          { name: 'Other', value: pStats.data?.other || 0, fill: '#9B59B6' },
        ]);
      }
    } catch (error: any) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardTitle = () => {
    if (permissions.isSuperAdmin) return 'System Dashboard';
    const prefix = hospitalName ? `${hospitalName} — ` : '';
    if (permissions.isAdmin) return `${prefix}Hospital Dashboard`;
    if (permissions.isDoctor) return `${prefix}Practice Dashboard`;
    if (permissions.isNurse) return `${prefix}Ward Dashboard`;
    if (permissions.isReceptionist) return `${prefix}Front Desk`;
    if (permissions.isLabTechnician) return `${prefix}Lab Dashboard`;
    if (permissions.isPharmacist) return `${prefix}Pharmacy Dashboard`;
    return 'Dashboard';
  };

  const getDashboardSubtitle = () => {
    if (permissions.isSuperAdmin) return 'System-wide overview and analytics';
    if (permissions.isAdmin) return "Here's what's happening at your hospital today.";
    if (permissions.isDoctor) return 'Your patients and appointments overview';
    if (permissions.isNurse) return 'Your assigned patients and ward activities';
    if (permissions.isReceptionist) return 'Appointment queue and patient registration';
    if (permissions.isLabTechnician) return 'Pending tests and lab orders';
    if (permissions.isPharmacist) return 'Prescriptions queue for dispensing';
    return 'Welcome back!';
  };

  // Build quick actions based on role — no duplicates
  const quickActions: { label: string; icon: React.ReactElement; path: string }[] = [];

  if (permissions.canCreatePatient) {
    quickActions.push({ label: 'New Patient', icon: <PersonAdd />, path: '/app/patients/new' });
  }
  if (permissions.canCreateAppointment) {
    quickActions.push({ label: 'Schedule Appointment', icon: <EventAvailable />, path: '/app/appointments' });
  }
  if (permissions.canManageABHA) {
    quickActions.push({ label: 'ABHA / Scan & Share', icon: <HealthAndSafety />, path: '/app/abha' });
  }
  if (permissions.isDoctor) {
    quickActions.push({ label: 'My Encounters', icon: <MedicalServices />, path: '/app/encounters' });
  }
  if (permissions.isNurse) {
    quickActions.push({ label: 'Record Vitals', icon: <MedicalServices />, path: '/app/vitals' });
  }
  if (permissions.isLabTechnician) {
    quickActions.push({ label: 'Lab Queue', icon: <MedicalServices />, path: '/app/investigations' });
  }
  if (permissions.isPharmacist) {
    quickActions.push({ label: 'Pharmacy Queue', icon: <MedicalServices />, path: '/app/pharmacy' });
  }

  const showCharts = (permissions.isAdmin || permissions.isSuperAdmin) &&
    (departmentData.length > 0 || appointmentStatusData.length > 0 || genderData.length > 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {getDashboardTitle()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getDashboardSubtitle()}
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          {loading ? <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /> : (
            <StatCard
              title="Total Patients" value={stats.totalPatients.toLocaleString()}
              icon={<People sx={{ fontSize: 28 }} />} color="#4A90E2"
              onClick={() => navigate('/app/patients')}
            />
          )}
        </Grid>

        {permissions.isSuperAdmin && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /> : (
              <StatCard
                title="Hospitals" value={stats.totalHospitals.toLocaleString()}
                icon={<Business sx={{ fontSize: 28 }} />} color="#FF6B6B"
                onClick={() => navigate('/app/hospitals')}
              />
            )}
          </Grid>
        )}

        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isReceptionist) && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /> : (
              <StatCard
                title="ABHA Linked" value={stats.abhaLinked.toLocaleString()}
                icon={<HealthAndSafety sx={{ fontSize: 28 }} />} color="#50C878"
                onClick={() => navigate('/app/abha')}
              />
            )}
          </Grid>
        )}

        {(permissions.isAdmin || permissions.isSuperAdmin) && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /> : (
              <StatCard
                title="Doctors" value={stats.totalDoctors.toLocaleString()}
                icon={<LocalHospital sx={{ fontSize: 28 }} />} color="#9B59B6"
                onClick={() => navigate('/app/doctors')}
              />
            )}
          </Grid>
        )}

        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist) && (
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /> : (
              <StatCard
                title="Today's Appointments" value={stats.todayAppointments.toLocaleString()}
                icon={<CalendarToday sx={{ fontSize: 28 }} />} color="#F39C12"
                onClick={() => navigate('/app/appointments')}
              />
            )}
          </Grid>
        )}
      </Grid>

      {/* Quick Actions + Charts */}
      <Grid container spacing={2.5}>
        {/* Quick Actions — always visible */}
        <Grid item xs={12} lg={showCharts ? 4 : 12}>
          <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: showCharts ? 'column' : 'row', flexWrap: 'wrap', gap: 1 }}>
              {quickActions.map((action) => (
                <Button
                  key={action.path + action.label}
                  variant="outlined"
                  fullWidth={showCharts}
                  startIcon={action.icon}
                  onClick={() => navigate(action.path)}
                  sx={{
                    justifyContent: 'flex-start', py: 1, px: 2,
                    textTransform: 'none', fontWeight: 500, fontSize: '0.85rem',
                    ...(showCharts ? {} : { flex: '1 1 auto', minWidth: 180, maxWidth: 260 }),
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Charts — Admin/SuperAdmin only */}
        {(permissions.isAdmin || permissions.isSuperAdmin) && appointmentStatusData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                Appointment Status
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appointmentStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {(permissions.isAdmin || permissions.isSuperAdmin) && genderData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                Patient Demographics
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={genderData} cx="50%" cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={85} fill="#8884d8" dataKey="value"
                  >
                    {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {(permissions.isAdmin || permissions.isSuperAdmin) && departmentData.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                Department Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData} cx="50%" cy="50%"
                    labelLine={false}
                    label={(entry: any) => entry.name}
                    outerRadius={85} fill="#8884d8" dataKey="value"
                  >
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

export default Dashboard;
