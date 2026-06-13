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
  canDispensePrescription,
  canRecordVitals,
  canOrderInvestigation,
} from '../config/rolePermissions';

interface UserPermissions {
  role: UserRole | null;
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
  canDispensePrescription: boolean;
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

  const validRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'];
  const role: UserRole | null = validRoles.includes(user.role as UserRole) ? (user.role as UserRole) : null;
  const userId = user.id || '';
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const hospitalId = user.hospitalId || '';

  return useMemo(() => ({
    role,
    userId,
    userName,
    hospitalId,
    
    // Patient permissions
    canCreatePatient: role ? canCreatePatient(role) : false,
    canEditPatient: role ? canEditPatient(role) : false,
    canDeletePatient: role ? canDeletePatient(role) : false,
    canViewAllPatients: role ? ['SUPER_ADMIN', 'ADMIN'].includes(role) : false,
    
    // Doctor permissions
    canCreateDoctor: role ? canCreateDoctor(role) : false,
    canEditDoctor: role ? canEditDoctor(role) : false,
    canDeleteDoctor: role ? canDeleteDoctor(role) : false,
    canViewAllDoctors: role ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role) : false,
    
    // Appointment permissions
    canCreateAppointment: role ? canCreateAppointment(role) : false,
    canEditAppointment: role ? canEditAppointment(role) : false,
    canCancelAppointment: role ? canCancelAppointment(role) : false,
    canViewAllAppointments: role ? ['SUPER_ADMIN', 'ADMIN'].includes(role) : false,
    
    // Clinical permissions
    canCreateEncounter: role ? ['SUPER_ADMIN', 'DOCTOR'].includes(role) : false,
    canViewEncounters: role ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'].includes(role) : false,
    canCreatePrescription: role === 'DOCTOR',
    canDispensePrescription: role ? canDispensePrescription(role) : false,
    canViewPrescriptions: role ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'].includes(role) : false,
    canRecordVitals: role ? canRecordVitals(role) : false,
    // Pharmacist gets read-only on latest vitals (allergies/age/weight)
    // because dispensing decisions sometimes need that context. Aligns
    // with the backend's `GET /vitals/patient/:patientId/latest` policy.
    canViewVitals: role
      ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'].includes(role)
      : false,
    canOrderInvestigation: role ? canOrderInvestigation(role) : false,
    canViewInvestigations: role ? ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'].includes(role) : false,
    canUpdateInvestigationStatus: role ? ['DOCTOR', 'LAB_TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'].includes(role) : false,
    
    // System permissions
    canManageUsers: role ? canManageUsers(role) : false,
    canViewReports: role ? canViewReports(role) : false,
    canManageABHA: role ? canManageABHA(role) : false,
    canManageConsent: role ? canManageConsent(role) : false,
    canAccessAuditLogs: role ? ['SUPER_ADMIN', 'ADMIN'].includes(role) : false,
    
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
