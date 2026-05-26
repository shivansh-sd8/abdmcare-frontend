import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  PersonAdd,
  EventAvailable,
  HealthAndSafety,
  MedicalServices,
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
  const permissions = useRolePermissions();
  const [hospitalName, setHospitalName] = useState<string>('');

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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {getDashboardTitle()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getDashboardSubtitle()}
        </Typography>
      </Box>

      {RoleDashboard ? (
        <RoleDashboard />
      ) : (
        <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">Welcome back!</Typography>
        </Paper>
      )}

      {quickActions.length > 0 && (
        <Paper sx={{ p: 2.5, mt: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Quick Actions</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {quickActions.map((action) => (
              <Button
                key={action.path + action.label}
                variant="outlined"
                startIcon={action.icon}
                onClick={() => navigate(action.path)}
                sx={{
                  textTransform: 'none', fontWeight: 500, fontSize: '0.85rem',
                  flex: '1 1 auto', minWidth: 180, maxWidth: 260,
                  justifyContent: 'flex-start', py: 1, px: 2,
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
