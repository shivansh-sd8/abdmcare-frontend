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

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouped sidebar menu — collapsible sections
// ─────────────────────────────────────────────────────────────────────────────

export const menuGroups: MenuGroup[] = [
  {
    label: '',
    items: [
      {
        text: 'Dashboard',
        path: '/app/dashboard',
        icon: 'Dashboard',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'],
      },
    ],
  },
  {
    label: 'ABDM Services',
    items: [
      {
        text: 'ABHA Management',
        path: '/app/abha',
        icon: 'HealthAndSafety',
        badge: 'ABDM',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
      },
      {
        text: 'Consent Manager',
        path: '/app/consent',
        icon: 'Assignment',
        badge: 'M2',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'],
      },
    ],
  },
  {
    label: 'Patient Management',
    items: [
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
    ],
  },
  {
    label: 'Clinical',
    items: [
      {
        text: 'Encounters',
        path: '/app/encounters',
        icon: 'MedicalInformation',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
      },
      {
        text: 'Prescriptions',
        path: '/app/prescriptions',
        icon: 'Medication',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
      },
      {
        text: 'Lab & Radiology',
        path: '/app/investigations',
        icon: 'Science',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'],
      },
      {
        text: 'Dispense Queue',
        path: '/app/pharmacy',
        icon: 'LocalPharmacy',
        roles: ['PHARMACIST', 'SUPER_ADMIN', 'ADMIN'],
      },
      {
        text: 'Pharmacy Manager',
        path: '/app/pharmacy/medicines',
        icon: 'Inventory',
        roles: ['PHARMACIST', 'SUPER_ADMIN', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Inpatient',
    items: [
      {
        text: 'IPD / Admissions',
        path: '/app/ipd',
        icon: 'LocalHospital',
        roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
      },
      {
        text: 'Ward & Bed Manager',
        path: '/app/ward-manager',
        icon: 'Hotel',
        roles: ['SUPER_ADMIN', 'ADMIN', 'NURSE'],
      },
    ],
  },
  {
    label: 'Administration',
    items: [
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
        text: 'Billing & Payments',
        path: '/app/billing',
        icon: 'Receipt',
        roles: ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'],
      },
    ],
  },
];

// Flat list for backward compat (route guards, etc.)
export const menuPermissions: MenuItem[] = menuGroups.flatMap(g => g.items);

export const hasPermission = (userRole: UserRole, path: string): boolean => {
  const menuItem = menuPermissions.find(item => item.path === path);
  if (!menuItem) return false;
  return menuItem.roles.includes(userRole);
};

export const getMenuItemsForRole = (userRole: UserRole): MenuItem[] => {
  return menuPermissions.filter(item => item.roles.includes(userRole));
};

export const getMenuGroupsForRole = (userRole: UserRole): MenuGroup[] => {
  return menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(userRole)),
    }))
    .filter(group => group.items.length > 0);
};

// Action-level permission helpers
export const canCreatePatient = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);

export const canEditPatient = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(role);

export const canDeletePatient = (role: UserRole): boolean =>
  role === 'SUPER_ADMIN';

export const canCreateDoctor = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN'].includes(role);

export const canEditDoctor = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN'].includes(role);

export const canDeleteDoctor = (role: UserRole): boolean =>
  role === 'SUPER_ADMIN';

export const canCreateAppointment = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);

export const canEditAppointment = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);

export const canCancelAppointment = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);

export const canManageUsers = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN'].includes(role);

export const canViewReports = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);

export const canManageABHA = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role);

export const canDispensePrescription = (role: UserRole): boolean =>
  ['PHARMACIST', 'ADMIN', 'SUPER_ADMIN'].includes(role);

export const canRecordVitals = (role: UserRole): boolean =>
  ['DOCTOR', 'NURSE'].includes(role);

export const canOrderInvestigation = (role: UserRole): boolean =>
  role === 'DOCTOR';

export const canManageConsent = (role: UserRole): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);
