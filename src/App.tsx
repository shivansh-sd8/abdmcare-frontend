import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import MainLayout from './components/layouts/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import AbhaManagement from './features/abha/AbhaManagement';
import PatientList from './features/patient/PatientList';
import PatientRegistration from './features/patient/PatientRegistration';
import DoctorList from './features/doctor/DoctorList';
import AppointmentList from './features/appointment/AppointmentList';
import ConsentManagement from './features/consent/ConsentManagement';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import Notifications from './features/notifications/Notifications';
import Login from './features/auth/Login';
import PrivateRoute from './components/common/PrivateRoute';

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="abha" element={<AbhaManagement />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/new" element={<PatientRegistration />} />
          <Route path="doctors" element={<DoctorList />} />
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="consent" element={<ConsentManagement />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  );
};

export default App;
