import api from './api';

interface CreateHospitalDTO {
  name: string;
  code?: string;
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
  establishedYear?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  totalBeds?: string;
  icuBeds?: string;
  emergencyBeds?: string;
  operationTheaters?: string;
  plan?: string;
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
  establishedYear?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  totalBeds?: string;
  icuBeds?: string;
  emergencyBeds?: string;
  operationTheaters?: string;
  isActive?: boolean;
  plan?: string;
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
}

const hospitalService = new HospitalService();
export default hospitalService;
