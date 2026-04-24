import api from './api';

interface CreateHospitalDTO {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
}

interface UpdateHospitalDTO {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
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
}

const hospitalService = new HospitalService();
export default hospitalService;
