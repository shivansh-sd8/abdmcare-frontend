import api from './api';

const HIP_BASE = '/api/v1/hip';

class HipService {
  /** Register the (caller's or specified) hospital as an HIP service with ABDM. */
  async registerHipService(hospitalId?: string) {
    return api.post(`${HIP_BASE}/register`, hospitalId ? { hospitalId } : {});
  }

  /** Register the (caller's or specified) hospital as an HIU service with ABDM. */
  async registerHiuService(hospitalId?: string) {
    return api.post(`${HIP_BASE}/register-hiu`, hospitalId ? { hospitalId } : {});
  }

  async getFacilityQrData() {
    return api.get(`${HIP_BASE}/facility-qr`);
  }

  async getReceivedShares() {
    return api.get(`${HIP_BASE}/received-shares`);
  }

  async getReceivedShareMatchCandidates(shareId: string) {
    return api.get(`${HIP_BASE}/received-shares/${shareId}/match-candidates`);
  }

  async convertReceivedShare(
    shareId: string,
    body: { mode: 'NEW' | 'MERGE' | 'IGNORE'; existingPatientId?: string; notes?: string },
  ) {
    return api.post(`${HIP_BASE}/received-shares/${shareId}/convert`, body);
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

  async getCareContexts(patientId: string) {
    return api.get(`${HIP_BASE}/patients/${patientId}/care-contexts`);
  }

  // Hospital-wide list of linked care contexts (for the Consent Manager
  // "Linked Contexts" tab). Optional status filter: PENDING | LINKED | FAILED.
  async listCareContexts(status?: 'PENDING' | 'LINKED' | 'FAILED') {
    return api.get(`${HIP_BASE}/care-contexts`, { params: status ? { status } : undefined });
  }
}

const hipService = new HipService();
export default hipService;
