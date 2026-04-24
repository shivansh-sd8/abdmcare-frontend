import api from './api';

interface CreatePatientData {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dob: string;
  mobile: string;
  email?: string;
  address?: any;
  bloodGroup?: string;
  emergencyContact?: any;
  abhaId?: string;
}

interface UpdatePatientData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  address?: any;
  bloodGroup?: string;
  emergencyContact?: any;
}

class PatientService {
  async createPatient(data: CreatePatientData) {
    return api.post('/api/v1/patients', data);
  }

  async getPatientById(id: string) {
    return api.get(`/api/v1/patients/${id}`);
  }

  async getPatientByUHID(uhid: string) {
    return api.get(`/api/v1/patients/uhid/${uhid}`);
  }

  async updatePatient(id: string, data: UpdatePatientData) {
    return api.put(`/api/v1/patients/${id}`, data);
  }

  async deletePatient(id: string) {
    return api.delete(`/api/v1/patients/${id}`);
  }

  async searchPatients(params: {
    search?: string;
    abhaLinked?: boolean;
    gender?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get('/api/v1/patients/search', { params });
  }

  async getPatientStats() {
    return api.get('/api/v1/patients/stats');
  }
}

const patientService = new PatientService();
export default patientService;
