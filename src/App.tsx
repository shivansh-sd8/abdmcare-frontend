import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import MainLayout from './components/layouts/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import AbhaManagement from './features/abha/AbhaManagement';
import PatientList from './features/patient/PatientList';
import PatientRegistration from './features/patient/PatientRegistration';
import DoctorList from './features/doctor/DoctorList';
import DoctorRegistration from './features/doctor/DoctorRegistration';
import AppointmentList from './features/appointment/AppointmentList';
import ConsentManagement from './features/consent/ConsentManagement';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import Notifications from './features/notifications/Notifications';
import AuditLogs from './features/audit/AuditLogs';
import HospitalManagement from './features/hospital/HospitalManagement';
import UserManagement from './features/user/UserManagement';
import QuickRegistration from './features/receptionist/QuickRegistration';
import PaymentManagement from './features/receptionist/PaymentManagement';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';
import LandingPage from './pages/LandingPage';
import PrivateRoute from './components/common/PrivateRoute';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <MainLayout />
            </Box>
          </PrivateRoute>
        }
      >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="abha" element={<AbhaManagement />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/new" element={<PatientRegistration />} />
          <Route path="doctors" element={<DoctorList />} />
          <Route path="doctors/new" element={<DoctorRegistration />} />
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="consent" element={<ConsentManagement />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route 
            path="audit-logs" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AuditLogs />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="hospitals" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                <HospitalManagement />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="users" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                <UserManagement />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="quick-registration" 
            element={
              <RoleProtectedRoute requiredRoles={['RECEPTIONIST', 'ADMIN']}>
                <QuickRegistration />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="payments" 
            element={
              <RoleProtectedRoute requiredRoles={['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN']}>
                <PaymentManagement />
              </RoleProtectedRoute>
            } 
          />
        </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
