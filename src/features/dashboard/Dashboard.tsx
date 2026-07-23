import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import {
  PersonAdd,
  EventAvailable,
  HealthAndSafety,
  MedicalServices,
  WavingHand,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import api from '../../services/api';
import DoctorDashboard from './DoctorDashboard';
import NurseDashboard from './NurseDashboard';
import ReceptionistDashboard from './ReceptionistDashboard';
import LabTechDashboard from './LabTechDashboard';
import PharmacistDashboard from './PharmacistDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import { SectionTitle } from '../../components/ui';

const dashboardMap: Record<string, React.FC> = {
  DOCTOR: DoctorDashboard,
  NURSE: NurseDashboard,
  RECEPTIONIST: ReceptionistDashboard,
  LAB_TECHNICIAN: LabTechDashboard,
  PHARMACIST: PharmacistDashboard,
  SUPER_ADMIN: SuperAdminDashboard,
  ADMIN: AdminDashboard,
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const permissions = useRolePermissions();
  const [hospitalName, setHospitalName] = useState<string>('');
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }})();
  const firstName = user.firstName || 'there';

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    if (permissions.isAdmin || permissions.isDoctor || permissions.isNurse || permissions.isReceptionist || permissions.isLabTechnician || permissions.isPharmacist) {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.hospitalId) {
            api.get(`/api/v1/hospitals/${user.hospitalId}`).then((resp: any) => {
              setHospitalName(resp.data?.name || '');
            }).catch(() => {});
          }
        }
      } catch {}
    }
  }, [permissions]);

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

  const RoleDashboard = permissions.role ? dashboardMap[permissions.role] : undefined;

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            right: -90, top: -90,
            width: 220, height: 220, borderRadius: '50%',
            background: theme.customGradients.brandSoft,
            opacity: 0.6,
          },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ position: 'relative' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 52, height: 52,
                background: theme.customGradients.brand,
                color: '#fff',
                boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <WavingHand />
            </Avatar>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ display: 'block', mb: 0.25, fontWeight: 700 }}>
                {greet}, {firstName} 👋
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {getDashboardTitle()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {getDashboardSubtitle()}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {RoleDashboard ? (
        <RoleDashboard />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">Welcome back!</Typography>
        </Paper>
      )}

      {quickActions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionTitle title="Quick actions" />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {quickActions.map((action) => (
              <Button
                key={action.path + action.label}
                variant="outlined"
                startIcon={action.icon}
                onClick={() => navigate(action.path)}
                sx={{
                  fontWeight: 600,
                  flex: '1 1 auto',
                  minWidth: 200,
                  maxWidth: 280,
                  justifyContent: 'flex-start',
                  py: 1.25, px: 2,
                  background: 'background.paper',
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.06),
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.16)}`,
                  },
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
