import api from './api';

const pharmacyService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardStats: () => api.get('/api/v1/pharmacy/dashboard'),

  // ── Medicine Master ────────────────────────────────────────────────────────
  listMedicines: (params?: { search?: string; category?: string; page?: number; limit?: number }) =>
    api.get('/api/v1/pharmacy/medicines', { params }),
  getMedicine: (medicineId: string) =>
    api.get(`/api/v1/pharmacy/medicines/${medicineId}`),
  createMedicine: (data: any) =>
    api.post('/api/v1/pharmacy/medicines', data),
  updateMedicine: (medicineId: string, data: any) =>
    api.put(`/api/v1/pharmacy/medicines/${medicineId}`, data),
  deleteMedicine: (medicineId: string) =>
    api.delete(`/api/v1/pharmacy/medicines/${medicineId}`),

  // ── Stock Receive (Batch Entry) ────────────────────────────────────────────
  receiveStock: (data: {
    medicineId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    mrp?: number;
  }) => api.post('/api/v1/pharmacy/stock/receive', data),

  // ── Stock Overview & Alerts ────────────────────────────────────────────────
  getStockOverview: () => api.get('/api/v1/pharmacy/stock'),
  getLowStock: () => api.get('/api/v1/pharmacy/stock/low'),
  getExpiringBatches: (days?: number) =>
    api.get('/api/v1/pharmacy/stock/expiring', { params: { days } }),

  // ── Stock Adjustment ───────────────────────────────────────────────────────
  adjustStock: (data: {
    medicineId: string;
    batchId: string;
    adjustment: number;
    reason: string;
  }) => api.post('/api/v1/pharmacy/stock/adjust', data),

  // ── Stock Movements (Audit) ────────────────────────────────────────────────
  getStockMovements: (params?: { medicineId?: string; type?: string; page?: number; limit?: number }) =>
    api.get('/api/v1/pharmacy/stock/movements', { params }),
};

export default pharmacyService;
