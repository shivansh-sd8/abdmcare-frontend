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
  deleteBed: (bedId: string) =>
    api.delete(`/api/v1/ipd/beds/${bedId}`),
  deleteWard: (wardId: string) =>
    api.delete(`/api/v1/ipd/wards/${wardId}`),

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

  // ── Discharge summary data (for PDF generation) ────────────────────────
  getDischargeSummary: (admissionId: string) =>
    api.get(`/api/v1/ipd/admissions/${admissionId}/discharge-summary`),

  // ── Discount (admin-only) ──────────────────────────────────────────────
  applyDiscount: (admissionId: string, data: { amount: number; reason?: string }) =>
    api.patch(`/api/v1/ipd/admissions/${admissionId}/discount`, data),

  // ── Collect partial payment during stay ────────────────────────────────
  collectPayment: (admissionId: string, data: { amount: number; paymentMethod: string; transactionRef?: string }) =>
    api.patch(`/api/v1/ipd/admissions/${admissionId}/collect-payment`, data),

  // ── Bed Management (Admin) ────────────────────────────────────────────────
  bulkCreateBeds: (wardId: string, data: any) =>
    api.post(`/api/v1/ipd/wards/${wardId}/beds/bulk`, data),
  updateBedDetails: (bedId: string, data: any) =>
    api.put(`/api/v1/ipd/beds/${bedId}/details`, data),
  transferBed: (data: any) =>
    api.post('/api/v1/ipd/beds/transfer', data),
  getTransferHistory: (admissionId: string) =>
    api.get(`/api/v1/ipd/admissions/${admissionId}/transfers`),
  getBedAnalytics: () =>
    api.get('/api/v1/ipd/analytics/beds'),
};

export default ipdService;
