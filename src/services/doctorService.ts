import api from './api';

interface CreateDoctorData {
  hprId?: string;
  firstName: string;
  lastName: string;
  specialization: string;
  qualification: string;
  registrationNo: string;
  mobile: string;
  email?: string;
  consultationFee?: number;
  experience?: number;
}

class DoctorService {
  async createDoctor(data: CreateDoctorData) {
    return api.post('/api/v1/doctors', data);
  }

  async getDoctorById(id: string) {
    return api.get(`/api/v1/doctors/${id}`);
  }

  async updateDoctor(id: string, data: Partial<CreateDoctorData>) {
    return api.put(`/api/v1/doctors/${id}`, data);
  }

  async deleteDoctor(id: string) {
    return api.delete(`/api/v1/doctors/${id}`);
  }

  async searchDoctors(params: {
    search?: string;
    specialization?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get('/api/v1/doctors/search', { params });
  }

  async getDoctorStats() {
    return api.get('/api/v1/doctors/stats');
  }
}

export default new DoctorService();
