import { useMemo } from 'react';
import {
  UserRole,
  canCreatePatient,
  canEditPatient,
  canDeletePatient,
  canCreateDoctor,
  canEditDoctor,
  canDeleteDoctor,
  canCreateAppointment,
  canEditAppointment,
  canCancelAppointment,
  canManageUsers,
  canViewReports,
  canManageABHA,
  canManageConsent,
} from '../config/rolePermissions';

interface UserPermissions {
  role: UserRole;
  userId: string;
  userName: string;
  hospitalId: string;
  
  // Patient permissions
  canCreatePatient: boolean;
  canEditPatient: boolean;
  canDeletePatient: boolean;
  canViewAllPatients: boolean;
  
  // Doctor permissions
  canCreateDoctor: boolean;
  canEditDoctor: boolean;
  canDeleteDoctor: boolean;
  canViewAllDoctors: boolean;
  
  // Appointment permissions
  canCreateAppointment: boolean;
  canEditAppointment: boolean;
  canCancelAppointment: boolean;
  canViewAllAppointments: boolean;
  
  // Clinical permissions
  canCreateEncounter: boolean;
  canViewEncounters: boolean;
  canCreatePrescription: boolean;
  canViewPrescriptions: boolean;
  canRecordVitals: boolean;
  canViewVitals: boolean;
  canOrderInvestigation: boolean;
  canViewInvestigations: boolean;
  canUpdateInvestigationStatus: boolean;
  
  // System permissions
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageABHA: boolean;
  canManageConsent: boolean;
  canAccessAuditLogs: boolean;
  
  // Helper flags
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDoctor: boolean;
  isNurse: boolean;
  isReceptionist: boolean;
  isLabTechnician: boolean;
  isPharmacist: boolean;
}

export const useRolePermissions = (): UserPermissions => {
  const user = useMemo(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : {};
  }, []);

  const role = (user.role || 'DOCTOR') as UserRole;
  const userId = user.id || '';
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const hospitalId = user.hospitalId || '';

  return useMemo(() => ({
    role,
    userId,
    userName,
    hospitalId,
    
    // Patient permissions
    canCreatePatient: canCreatePatient(role),
    canEditPatient: canEditPatient(role),
    canDeletePatient: canDeletePatient(role),
    canViewAllPatients: ['SUPER_ADMIN', 'ADMIN'].includes(role),
    
    // Doctor permissions
    canCreateDoctor: canCreateDoctor(role),
    canEditDoctor: canEditDoctor(role),
    canDeleteDoctor: canDeleteDoctor(role),
    canViewAllDoctors: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role),
    
    // Appointment permissions
    canCreateAppointment: canCreateAppointment(role),
    canEditAppointment: canEditAppointment(role),
    canCancelAppointment: canCancelAppointment(role),
    canViewAllAppointments: ['SUPER_ADMIN', 'ADMIN'].includes(role),
    
    // Clinical permissions
    canCreateEncounter: ['SUPER_ADMIN', 'DOCTOR'].includes(role),
    canViewEncounters: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'].includes(role),
    canCreatePrescription: role === 'DOCTOR',
    canViewPrescriptions: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'].includes(role),
    canRecordVitals: ['DOCTOR', 'NURSE'].includes(role),
    canViewVitals: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'].includes(role),
    canOrderInvestigation: role === 'DOCTOR',
    canViewInvestigations: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'].includes(role),
    canUpdateInvestigationStatus: ['DOCTOR', 'LAB_TECHNICIAN'].includes(role),
    
    // System permissions
    canManageUsers: canManageUsers(role),
    canViewReports: canViewReports(role),
    canManageABHA: canManageABHA(role),
    canManageConsent: canManageConsent(role),
    canAccessAuditLogs: ['SUPER_ADMIN', 'ADMIN'].includes(role),
    
    // Helper flags
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPER_ADMIN',
    isDoctor: role === 'DOCTOR',
    isNurse: role === 'NURSE',
    isReceptionist: role === 'RECEPTIONIST',
    isLabTechnician: role === 'LAB_TECHNICIAN',
    isPharmacist: role === 'PHARMACIST',
  }), [role, userId, userName, hospitalId]);
};
