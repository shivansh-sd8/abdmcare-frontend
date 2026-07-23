import api from './api';

const HIU_BASE = '/api/v1/hiu';

class HiuService {
  async requestHealthInformation(data: { consentId: string; dateRangeFrom?: string; dateRangeTo?: string }) {
    return api.post(`${HIU_BASE}/request`, data);
  }

  async getPatientHealthRecords(patientId: string) {
    return api.get(`${HIU_BASE}/patient/${patientId}/records`);
  }
}

const hiuService = new HiuService();
export default hiuService;
