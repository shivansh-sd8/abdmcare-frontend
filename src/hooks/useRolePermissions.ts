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
  
  // System permissions
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageABHA: boolean;
  canManageConsent: boolean;
  canAccessAuditLogs: boolean;
  
  // Helper functions
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDoctor: boolean;
  isNurse: boolean;
  isReceptionist: boolean;
}

export const useRolePermissions = (): UserPermissions => {
  const user = useMemo(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : {};
  }, []);

  const role = (user.role || 'DOCTOR') as UserRole;
  const userId = user.id || '';
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

  return useMemo(() => ({
    role,
    userId,
    userName,
    
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
  }), [role, userId, userName]);
};
