import api from './api';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface CreatePrescriptionData {
  patientId: string;
  doctorId: string;
  encounterId?: string;
  medications: Medication[];
  diagnosis?: string;
  notes?: string;
}

interface UpdatePrescriptionData {
  medications?: Medication[];
  diagnosis?: string;
  notes?: string;
}

class PrescriptionService {
  async createPrescription(data: CreatePrescriptionData) {
    return api.post('/api/v1/prescriptions', data);
  }

  async getAllPrescriptions(params?: {
    page?: number;
    limit?: number;
    patientId?: string;
    doctorId?: string;
  }) {
    return api.get('/api/v1/prescriptions', { params });
  }

  async getPrescriptionById(id: string) {
    return api.get(`/api/v1/prescriptions/${id}`);
  }

  async updatePrescription(id: string, data: UpdatePrescriptionData) {
    return api.put(`/api/v1/prescriptions/${id}`, data);
  }

  async deletePrescription(id: string) {
    return api.delete(`/api/v1/prescriptions/${id}`);
  }
}

const prescriptionService = new PrescriptionService();
export default prescriptionService;
