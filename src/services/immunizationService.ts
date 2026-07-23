import api from './api';

export interface ImmunizationRecord {
  id: string;
  patientId: string;
  encounterId?: string | null;
  vaccineName: string;
  vaccineCode?: string | null;
  manufacturer?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  doseNumber?: number | null;
  totalDoses?: number | null;
  site?: string | null;
  route?: string | null;
  doseQuantity?: number | null;
  doseUnit?: string | null;
  administeredAt: string;
  administeredBy?: string | null;
  reason?: string | null;
  notes?: string | null;
  hospitalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImmunizationData {
  patientId: string;
  encounterId?: string;
  vaccineName: string;
  vaccineCode?: string;
  manufacturer?: string;
  lotNumber?: string;
  expiryDate?: string;
  doseNumber?: number;
  totalDoses?: number;
  site?: string;
  route?: string;
  doseQuantity?: number;
  doseUnit?: string;
  administeredAt: string;
  reason?: string;
  notes?: string;
}

class ImmunizationService {
  async create(data: CreateImmunizationData) {
    return api.post('/api/v1/immunizations', data);
  }

  async getForPatient(patientId: string) {
    return api.get(`/api/v1/immunizations/patient/${patientId}`);
  }

  async delete(id: string) {
    return api.delete(`/api/v1/immunizations/${id}`);
  }
}

const immunizationService = new ImmunizationService();
export default immunizationService;
