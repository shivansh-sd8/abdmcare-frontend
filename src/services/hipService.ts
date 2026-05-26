import api from './api';

const HIP_BASE = '/api/v1/hip';

class HipService {
  async registerHipService() {
    return api.post(`${HIP_BASE}/register`);
  }

  async getFacilityQrData() {
    return api.get(`${HIP_BASE}/facility-qr`);
  }

  async getReceivedShares() {
    return api.get(`${HIP_BASE}/received-shares`);
  }

  async generateLinkToken(data: {
    abhaNumber: string;
    abhaAddress: string;
    name: string;
    gender: string;
    yearOfBirth: number;
  }) {
    return api.post(`${HIP_BASE}/link/generate-token`, data);
  }

  async hipInitiatedLink(data: {
    abhaNumber: string;
    abhaAddress: string;
    patient: Array<{
      referenceNumber: string;
      display: string;
      careContexts: Array<{ referenceNumber: string; display: string }>;
    }>;
  }) {
    return api.post(`${HIP_BASE}/link/carecontext`, data);
  }

  async linkContextNotify(data: {
    abhaAddress: string;
    careContextReference: string;
    patientReference: string;
    hiTypes: string[];
  }) {
    return api.post(`${HIP_BASE}/link/context/notify`, data);
  }

  async smsNotify(phoneNo: string, hipName?: string, hipId?: string) {
    return api.post(`${HIP_BASE}/sms/notify`, { phoneNo, hipName, hipId });
  }

  async addCareContexts(patientId: string, careContexts: Array<{ encounterId: string; display: string }>) {
    return api.post(`${HIP_BASE}/patients/${patientId}/care-contexts`, { careContexts });
  }
}

const hipService = new HipService();
export default hipService;
