import api from './api';

const ipdService = {
  // ── Wards ────────────────────────────────────────────────────────────────
  listWards: () => api.get('/api/v1/ipd/wards'),
  createWard: (data: any) => api.post('/api/v1/ipd/wards', data),
  updateWard: (wardId: string, data: any) => api.put(`/api/v1/ipd/wards/${wardId}`, data),

  // ── Beds ─────────────────────────────────────────────────────────────────
  createBed: (wardId: string, bedNumber: string) =>
    api.post(`/api/v1/ipd/wards/${wardId}/beds`, { bedNumber }),
  updateBedStatus: (bedId: string, status: string) =>
    api.put(`/api/v1/ipd/beds/${bedId}/status`, { status }),

  // ── Admissions ───────────────────────────────────────────────────────────
  listAdmissions: (params?: { status?: string; wardId?: string; page?: number; limit?: number }) =>
    api.get('/api/v1/ipd/admissions', { params }),
  getAdmission: (admissionId: string) => api.get(`/api/v1/ipd/admissions/${admissionId}`),
  admitPatient: (data: any) => api.post('/api/v1/ipd/admissions', data),
  updateAdmission: (admissionId: string, data: any) =>
    api.put(`/api/v1/ipd/admissions/${admissionId}`, data),
  dischargePatient: (admissionId: string, data: any) =>
    api.post(`/api/v1/ipd/admissions/${admissionId}/discharge`, data),
  markDischargeReady: (admissionId: string) =>
    api.post(`/api/v1/ipd/admissions/${admissionId}/discharge-ready`, {}),

  // ── IPD Rounds ───────────────────────────────────────────────────────────
  getAdmissionRounds: (admissionId: string) =>
    api.get(`/api/v1/ipd/admissions/${admissionId}/rounds`),
  createAdmissionRound: (admissionId: string, data: any) =>
    api.post(`/api/v1/ipd/admissions/${admissionId}/rounds`, data),

  // ── Ward overview ────────────────────────────────────────────────────────
  getWardOverview: () => api.get('/api/v1/ipd/overview'),

  // ── Bill preview ─────────────────────────────────────────────────────────
  getAdmissionBill: (admissionId: string) =>
    api.get(`/api/v1/ipd/admissions/${admissionId}/bill`),
};

export default ipdService;
