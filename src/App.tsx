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
import ScheduleAppointment from './features/appointment/ScheduleAppointment';
import ConsentManagement from './features/consent/ConsentManagement';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import Notifications from './features/notifications/Notifications';
import AuditLogs from './features/audit/AuditLogs';
import HospitalManagement from './features/hospital/HospitalManagement';
import UserManagement from './features/user/UserManagement';
import QuickRegistration from './features/receptionist/QuickRegistration';
import PaymentManagement from './features/receptionist/PaymentManagement';
import EncounterList from './features/doctor/EncounterList';
import PrescriptionList from './features/doctor/PrescriptionList';
import VitalsManagement from './features/doctor/VitalsManagement';
import InvestigationQueue from './features/lab/InvestigationQueue';
import PrescriptionQueue from './features/pharmacy/PrescriptionQueue';
import BillingDashboard from './features/billing/BillingDashboard';
import Login from './features/auth/Login';
import SuperAdminSignup from './features/auth/SuperAdminSignup';
import LandingPage from './pages/LandingPage';
import PrivateRoute from './components/common/PrivateRoute';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SuperAdminSignup />} />
      <Route path="/super-admin-signup" element={<SuperAdminSignup />} />
      
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
          
          {/* ABHA - SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
          <Route 
            path="abha" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
                <AbhaManagement />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Patients - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST */}
          <Route 
            path="patients" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
                <PatientList />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="patients/new" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
                <PatientRegistration />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Doctors - SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST */}
          <Route 
            path="doctors" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
                <DoctorList />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="doctors/new" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                <DoctorRegistration />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Appointments - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST */}
          <Route 
            path="appointments" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
                <AppointmentList />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="appointments/schedule" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST']}>
                <ScheduleAppointment />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Consent - SUPER_ADMIN, ADMIN, DOCTOR */}
          <Route 
            path="consent" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}>
                <ConsentManagement />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Encounters - SUPER_ADMIN, ADMIN, DOCTOR, NURSE */}
          <Route 
            path="encounters" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE']}>
                <EncounterList />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Prescriptions - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, PHARMACIST */}
          <Route 
            path="prescriptions" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']}>
                <PrescriptionList />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Vitals - SUPER_ADMIN, ADMIN, DOCTOR, NURSE */}
          <Route 
            path="vitals" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE']}>
                <VitalsManagement />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Investigations/Lab - SUPER_ADMIN, ADMIN, DOCTOR, NURSE, LAB_TECHNICIAN */}
          <Route 
            path="investigations" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN']}>
                <InvestigationQueue />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Pharmacy - PHARMACIST */}
          <Route 
            path="pharmacy" 
            element={
              <RoleProtectedRoute requiredRoles={['PHARMACIST', 'SUPER_ADMIN', 'ADMIN']}>
                <PrescriptionQueue />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Billing Dashboard - BILLING_STAFF */}
          <Route 
            path="billing" 
            element={
              <RoleProtectedRoute requiredRoles={['BILLING_STAFF', 'SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']}>
                <BillingDashboard />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Profile, Settings, Notifications - All roles */}
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          
          {/* Audit Logs - SUPER_ADMIN, ADMIN */}
          <Route 
            path="audit-logs" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AuditLogs />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Hospitals - SUPER_ADMIN only */}
          <Route 
            path="hospitals" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                <HospitalManagement />
              </RoleProtectedRoute>
            } 
          />
          
          {/* User Management - SUPER_ADMIN, ADMIN */}
          <Route 
            path="users" 
            element={
              <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
                <UserManagement />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Quick Registration - RECEPTIONIST, ADMIN */}
          <Route 
            path="quick-registration" 
            element={
              <RoleProtectedRoute requiredRoles={['RECEPTIONIST', 'ADMIN']}>
                <QuickRegistration />
              </RoleProtectedRoute>
            } 
          />
          
          {/* Payments - RECEPTIONIST, ADMIN, SUPER_ADMIN */}
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
