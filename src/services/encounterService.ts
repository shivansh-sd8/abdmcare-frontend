import api from './api';

interface CreateEncounterData {
  patientId: string;
  doctorId: string;
  type: 'OPD' | 'IPD' | 'EMERGENCY';
  chiefComplaint: string;
  notes?: string;
}

interface UpdateEncounterData {
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  vitalSigns?: Record<string, unknown>;
  prescription?: Record<string, unknown>;
}

class EncounterService {
  async createEncounter(data: CreateEncounterData) {
    return api.post('/api/v1/encounters', data);
  }

  async getAllEncounters(params?: {
    page?: number;
    limit?: number;
    patientId?: string;
    doctorId?: string;
    status?: string;
    type?: string;
  }) {
    return api.get('/api/v1/encounters', { params });
  }

  async getEncounterById(id: string) {
    return api.get(`/api/v1/encounters/${id}`);
  }

  async updateEncounter(id: string, data: UpdateEncounterData) {
    return api.put(`/api/v1/encounters/${id}`, data);
  }

  async completeEncounter(id: string, data: { diagnosis: string; notes?: string }) {
    return api.post(`/api/v1/encounters/${id}/complete`, data);
  }

  async getDoctorEncounters(doctorId: string, status?: string) {
    return api.get(`/api/v1/encounters/doctor/${doctorId}`, { params: { status } });
  }

  async updateConsultation(id: string, data: any) {
    return api.put(`/api/v1/encounters/${id}/consultation`, data);
  }

  async completeConsultation(id: string) {
    return api.post(`/api/v1/encounters/${id}/complete`);
  }

  async getEncounterStats() {
    return api.get('/api/v1/encounters/stats');
  }
}

const encounterService = new EncounterService();
export default encounterService;
