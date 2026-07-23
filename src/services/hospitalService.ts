import api from './api';

// Hospital create/update DTOs are aligned with the backend
// `HospitalOnboardingData` / `UpdateHospitalData` shapes. Notably:
//   • `code` is server-generated and not accepted as input.
//   • `ownerName/Email/Phone` are derived from the primary admin block.
//   • ABDM `clientId/Secret/CallbackUrl` are platform-level (env vars).
interface CreateHospitalDTO {
  name: string;
  type?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  landmark?: string;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
  establishedYear?: number | string;
  // Primary admin block (REQUIRED on create)
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  adminUsername: string;
  adminPassword: string;
  totalBeds?: number | string;
  icuBeds?: number | string;
  emergencyBeds?: number | string;
  operationTheaters?: number | string;
  plan?: string;
  defaultOpdCharge?: number;
  hipId?: string;
  hipName?: string;
  hiuId?: string;
  hiuName?: string;
  hfrFacilityId?: string;
}

interface UpdateHospitalDTO {
  name?: string;
  type?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
  establishedYear?: number | string;
  totalBeds?: number | string;
  icuBeds?: number | string;
  emergencyBeds?: number | string;
  operationTheaters?: number | string;
  isActive?: boolean;
  plan?: string;
  defaultOpdCharge?: number;
  // Admin propagation (optional)
  adminFirstName?: string;
  adminLastName?: string;
  adminPhone?: string;
  adminUsername?: string;
  adminPassword?: string;
  // ABDM
  hipId?: string;
  hipName?: string;
  hiuId?: string;
  hiuName?: string;
  hfrFacilityId?: string;
  abdmAutoShare?: boolean;
}

class HospitalService {
  async createHospital(data: CreateHospitalDTO) {
    return api.post('/api/v1/hospitals', data);
  }

  async getAllHospitals(params?: {
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get('/api/v1/hospitals', { params });
  }

  async getHospitalById(id: string) {
    return api.get(`/api/v1/hospitals/${id}`);
  }

  async updateHospital(id: string, data: UpdateHospitalDTO) {
    return api.put(`/api/v1/hospitals/${id}`, data);
  }

  async deleteHospital(id: string) {
    return api.delete(`/api/v1/hospitals/${id}`);
  }

  async getHospitalStats(id: string) {
    return api.get(`/api/v1/hospitals/${id}/stats`);
  }

  async getAllHospitalStats() {
    return api.get('/api/v1/hospitals/stats');
  }

  async getSchedule(id: string) {
    return api.get(`/api/v1/hospitals/${id}/schedule`);
  }

  async updateSchedule(id: string, data: any) {
    return api.put(`/api/v1/hospitals/${id}/schedule`, data);
  }
}

const hospitalService = new HospitalService();
export default hospitalService;
