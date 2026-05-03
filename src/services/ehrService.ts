import api from './api';

class EhrService {
  getPatientList(search?: string) {
    return api.get('/api/v1/ehr/patients', { params: search ? { search } : undefined });
  }

  getPatientEHR(patientId: string) {
    return api.get(`/api/v1/ehr/patients/${patientId}`);
  }
}

export default new EhrService();
