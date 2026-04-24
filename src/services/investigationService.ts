import api from './api';

interface CreateInvestigationData {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  encounterId?: string;
  testName: string;
  testType: string;
  instructions?: string;
  priority?: string;
}

interface UpdateInvestigationStatusData {
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  results?: Record<string, unknown>;
  notes?: string;
}

class InvestigationService {
  async createInvestigation(data: CreateInvestigationData) {
    return api.post('/api/v1/investigations', data);
  }

  async getAllInvestigations(params?: {
    page?: number;
    limit?: number;
    patientId?: string;
    doctorId?: string;
    status?: string;
    hospitalId?: string;
  }) {
    return api.get('/api/v1/investigations', { params });
  }

  async getInvestigationById(id: string) {
    return api.get(`/api/v1/investigations/${id}`);
  }

  async updateInvestigationStatus(id: string, data: UpdateInvestigationStatusData) {
    return api.put(`/api/v1/investigations/${id}/status`, data);
  }

  async getInvestigationStats() {
    return api.get('/api/v1/investigations/stats');
  }
}

const investigationService = new InvestigationService();
export default investigationService;
