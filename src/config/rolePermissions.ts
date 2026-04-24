// Role-based permissions configuration

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST';

export interface MenuItem {
  text: string;
  path: string;
  icon: string;
  badge?: string;
  roles: UserRole[];
}

// Define which roles can access which menu items
export const menuPermissions: MenuItem[] = [
  {
    text: 'Dashboard',
    path: '/dashboard',
    icon: 'Dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'],
  },
  {
    text: 'Hospitals',
    path: '/hospitals',
    icon: 'Business',
    roles: ['SUPER_ADMIN'],
  },
  {
    text: 'User Management',
    path: '/users',
    icon: 'ManageAccounts',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    text: 'ABHA Management',
    path: '/abha',
    icon: 'HealthAndSafety',
    badge: 'ABDM',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    text: 'Patients',
    path: '/patients',
    icon: 'People',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Doctors',
    path: '/doctors',
    icon: 'LocalHospital',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    text: 'Appointments',
    path: '/appointments',
    icon: 'CalendarToday',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Encounters',
    path: '/encounters',
    icon: 'MedicalInformation',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
  },
  {
    text: 'Prescriptions',
    path: '/prescriptions',
    icon: 'Medication',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
  },
  {
    text: 'Vitals',
    path: '/vitals',
    icon: 'MonitorHeart',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
  },
  {
    text: 'Lab Queue',
    path: '/investigations',
    icon: 'Science',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'],
  },
  {
    text: 'Pharmacy',
    path: '/pharmacy',
    icon: 'LocalPharmacy',
    roles: ['PHARMACIST'],
  },
  {
    text: 'Payments',
    path: '/payments',
    icon: 'Payment',
    roles: ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    text: 'Consent',
    path: '/consent',
    icon: 'Assignment',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'],
  },
  {
    text: 'Audit Logs',
    path: '/audit-logs',
    icon: 'History',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
];

// Check if user has permission to access a route
export const hasPermission = (userRole: UserRole, path: string): boolean => {
  const menuItem = menuPermissions.find(item => item.path === path);
  if (!menuItem) return false;
  return menuItem.roles.includes(userRole);
};

// Get filtered menu items based on user role
export const getMenuItemsForRole = (userRole: UserRole): MenuItem[] => {
  return menuPermissions.filter(item => item.roles.includes(userRole));
};

// Check if user can perform specific actions
export const canCreatePatient = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);
};

export const canEditPatient = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'].includes(role);
};

export const canDeletePatient = (role: UserRole): boolean => {
  return role === 'SUPER_ADMIN';
};

export const canCreateDoctor = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
};

export const canEditDoctor = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
};

export const canDeleteDoctor = (role: UserRole): boolean => {
  return role === 'SUPER_ADMIN';
};

export const canCreateAppointment = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);
};

export const canEditAppointment = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);
};

export const canCancelAppointment = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);
};

export const canManageUsers = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
};

export const canViewReports = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);
};

export const canManageABHA = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);
};

export const canManageConsent = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);
};
