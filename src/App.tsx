import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import MainLayout from './components/layouts/MainLayout';
import PrivateRoute from './components/common/PrivateRoute';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

const Dashboard = React.lazy(() => import('./features/dashboard/Dashboard'));
const AbhaManagement = React.lazy(() => import('./features/abha/AbhaManagement'));
const ScanAndShare = React.lazy(() => import('./features/abha/ScanAndShare'));
const PatientCheckIn = React.lazy(() => import('./features/abha/PatientCheckIn'));
const PatientList = React.lazy(() => import('./features/patient/PatientList'));
const PatientRegistration = React.lazy(() => import('./features/patient/PatientRegistration'));
const PatientProfile = React.lazy(() => import('./features/patient/PatientProfile'));
const DoctorList = React.lazy(() => import('./features/doctor/DoctorList'));
const DoctorRegistration = React.lazy(() => import('./features/doctor/DoctorRegistration'));
const DoctorProfile = React.lazy(() => import('./features/doctor/DoctorProfile'));
const AppointmentList = React.lazy(() => import('./features/appointment/AppointmentList'));
const ScheduleAppointment = React.lazy(() => import('./features/appointment/ScheduleAppointment'));
const ConsentManagement = React.lazy(() => import('./features/consent/ConsentManagement'));
const Profile = React.lazy(() => import('./features/profile/Profile'));
const Settings = React.lazy(() => import('./features/settings/Settings'));
const Notifications = React.lazy(() => import('./features/notifications/Notifications'));
const AuditLogs = React.lazy(() => import('./features/audit/AuditLogs'));
const HospitalManagement = React.lazy(() => import('./features/hospital/HospitalManagement'));
const UserManagement = React.lazy(() => import('./features/user/UserManagement'));
const PaymentManagement = React.lazy(() => import('./features/receptionist/PaymentManagement'));
const EncounterList = React.lazy(() => import('./features/doctor/EncounterList'));
const PrescriptionList = React.lazy(() => import('./features/doctor/PrescriptionList'));
const VitalsManagement = React.lazy(() => import('./features/doctor/VitalsManagement'));
const EHRList = React.lazy(() => import('./features/ehr/EHRList'));
const AdmissionList = React.lazy(() => import('./features/ipd/AdmissionList'));
const WardManager = React.lazy(() => import('./features/ipd/WardManager'));
const InvestigationQueue = React.lazy(() => import('./features/lab/InvestigationQueue'));
const PrescriptionQueue = React.lazy(() => import('./features/pharmacy/PrescriptionQueue'));
const BillingDashboard = React.lazy(() => import('./features/billing/BillingDashboard'));
const Login = React.lazy(() => import('./features/auth/Login'));
const ForgotPassword = React.lazy(() => import('./features/auth/ForgotPassword'));
const SuperAdminSignup = React.lazy(() => import('./features/auth/SuperAdminSignup'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DocumentationPage = React.lazy(() => import('./pages/DocumentationPage'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<SuperAdminSignup />} />
        <Route path="/super-admin-signup" element={<SuperAdminSignup />} />
        
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <MainLayout />
              </Box>
            </PrivateRoute>
          }
        >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route 
              path="abha" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
                  <AbhaManagement />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Redirects for consolidated routes */}
            <Route path="scan-share" element={<Navigate to="/app/abha" state={{ tab: 'scan' }} replace />} />
            <Route path="patient-checkin" element={<Navigate to="/app/abha" state={{ tab: 'checkin' }} replace />} />

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
            <Route 
              path="patients/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RADIOLOGIST']}>
                  <PatientProfile />
                </RoleProtectedRoute>
              } 
            />
            
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
            <Route 
              path="doctors/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
                  <DoctorProfile />
                </RoleProtectedRoute>
              } 
            />
            
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
            
            <Route 
              path="consent" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}>
                  <ConsentManagement />
                </RoleProtectedRoute>
              } 
            />
            
            <Route 
              path="encounters" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE']}>
                  <EncounterList />
                </RoleProtectedRoute>
              } 
            />

            <Route
              path="ehr"
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RADIOLOGIST']}>
                  <EHRList />
                </RoleProtectedRoute>
              }
            />
            
            <Route 
              path="prescriptions" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']}>
                  <PrescriptionList />
                </RoleProtectedRoute>
              } 
            />
            
            <Route 
              path="vitals" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE']}>
                  <VitalsManagement />
                </RoleProtectedRoute>
              } 
            />
            
            <Route 
              path="investigations" 
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGIST']}>
                  <InvestigationQueue />
                </RoleProtectedRoute>
              } 
            />
            
            <Route 
              path="pharmacy" 
              element={
                <RoleProtectedRoute requiredRoles={['PHARMACIST', 'SUPER_ADMIN', 'ADMIN']}>
                  <PrescriptionQueue />
                </RoleProtectedRoute>
              } 
            />
            
            <Route 
              path="billing" 
              element={
                <RoleProtectedRoute requiredRoles={['BILLING_STAFF', 'SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']}>
                  <BillingDashboard />
                </RoleProtectedRoute>
              } 
            />
            
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
            
            
            <Route path="payments" element={<Navigate to="/app/billing" replace />} />

            <Route
              path="ipd"
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
                  <AdmissionList />
                </RoleProtectedRoute>
              }
            />

            <Route
              path="ward-manager"
              element={
                <RoleProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN', 'NURSE']}>
                  <WardManager />
                </RoleProtectedRoute>
              }
            />
          </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
