// Role-based permissions configuration

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST'
  | 'BILLING_STAFF'
  | 'RADIOLOGIST';

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
    path: '/app/dashboard',
    icon: 'Dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'BILLING_STAFF', 'RADIOLOGIST'],
  },
  {
    text: 'Hospitals',
    path: '/app/hospitals',
    icon: 'Business',
    roles: ['SUPER_ADMIN'],
  },
  {
    text: 'User Management',
    path: '/app/users',
    icon: 'ManageAccounts',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    text: 'ABHA Management',
    path: '/app/abha',
    icon: 'HealthAndSafety',
    badge: 'ABDM',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Scan & Share',
    path: '/app/scan-share',
    icon: 'QrCodeScanner',
    badge: 'M1',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Patient Check-In',
    path: '/app/patient-checkin',
    icon: 'HowToReg',
    badge: 'M1',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Patients',
    path: '/app/patients',
    icon: 'People',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Doctors',
    path: '/app/doctors',
    icon: 'LocalHospital',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    text: 'Appointments',
    path: '/app/appointments',
    icon: 'CalendarToday',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Encounters',
    path: '/app/encounters',
    icon: 'MedicalInformation',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
  },
  {
    text: 'EHR',
    path: '/app/ehr',
    icon: 'HealthAndSafety',
    badge: 'NEW',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RADIOLOGIST'],
  },
  {
    text: 'Prescriptions',
    path: '/app/prescriptions',
    icon: 'Medication',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
  },
  {
    text: 'Vitals',
    path: '/app/vitals',
    icon: 'MonitorHeart',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
  },
  {
    text: 'Lab Queue',
    path: '/app/investigations',
    icon: 'Science',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGIST'],
  },
  {
    text: 'Pharmacy',
    path: '/app/pharmacy',
    icon: 'LocalPharmacy',
    roles: ['PHARMACIST', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    text: 'Quick Register',
    path: '/app/quick-registration',
    icon: 'PersonAdd',
    roles: ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    text: 'IPD / Admissions',
    path: '/app/ipd',
    icon: 'LocalHospital',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    text: 'Ward Manager',
    path: '/app/ward-manager',
    icon: 'MeetingRoom',
    roles: ['SUPER_ADMIN', 'ADMIN', 'NURSE'],
  },
  {
    text: 'Billing',
    path: '/app/billing',
    icon: 'Receipt',
    roles: ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN', 'BILLING_STAFF'],
  },
  {
    text: 'Payments',
    path: '/app/payments',
    icon: 'Payment',
    roles: ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN', 'BILLING_STAFF'],
  },
  {
    text: 'Consent',
    path: '/app/consent',
    icon: 'Assignment',
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'],
  },
  {
    text: 'Audit Logs',
    path: '/app/audit-logs',
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
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(role);
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

export const canDispensePrescription = (role: UserRole): boolean => {
  return ['PHARMACIST', 'ADMIN', 'SUPER_ADMIN'].includes(role);
};

export const canRecordVitals = (role: UserRole): boolean => {
  return ['DOCTOR', 'NURSE'].includes(role);
};

export const canOrderInvestigation = (role: UserRole): boolean => {
  return role === 'DOCTOR';
};

export const canManageConsent = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);
};
