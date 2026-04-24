import api from './api';

interface CreateConsentRequestData {
  patientAbhaId: string;
  purpose: string;
  hiTypes: string[];
  dateRangeFrom: string;
  dateRangeTo: string;
  requesterName: string;
  requesterId: string;
}

class ConsentService {
  async createConsentRequest(data: CreateConsentRequestData) {
    return api.post('/api/v1/consents/request', data);
  }

  async getPatientConsents(patientId: string) {
    return api.get(`/api/v1/consents/patient/${patientId}`);
  }

  async fetchConsentArtefact(consentId: string) {
    return api.get(`/api/v1/consents/${consentId}/artefact`);
  }

  async revokeConsent(consentId: string) {
    return api.post(`/api/v1/consents/${consentId}/revoke`);
  }

  async getConsentStats() {
    return api.get('/api/v1/consents/stats');
  }

  async getAllConsents() {
    return api.get('/api/v1/consents');
  }
}

const consentService = new ConsentService();
export default consentService;
