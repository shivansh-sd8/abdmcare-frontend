import api from './api';

interface CreateVitalsData {
  patientId: string;
  encounterId?: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

class VitalsService {
  async createVitals(data: CreateVitalsData) {
    return api.post('/api/v1/vitals', data);
  }

  async getAllVitals(params?: {
    page?: number;
    limit?: number;
    patientId?: string;
  }) {
    return api.get('/api/v1/vitals', { params });
  }

  async getVitalsById(id: string) {
    return api.get(`/api/v1/vitals/${id}`);
  }

  async getLatestVitals(patientId: string) {
    return api.get(`/api/v1/vitals/patient/${patientId}/latest`);
  }

  async updateVitals(id: string, data: Partial<CreateVitalsData>) {
    return api.put(`/api/v1/vitals/${id}`, data);
  }

  async deleteVitals(id: string) {
    return api.delete(`/api/v1/vitals/${id}`);
  }
}

const vitalsService = new VitalsService();
export default vitalsService;
