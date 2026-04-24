import api from './api';

interface CreatePaymentData {
  patientId: string;
  hospitalId: string;
  appointmentId?: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  items?: any;
}

interface UpdatePaymentData {
  status?: string;
  transactionId?: string;
}

class PaymentService {
  async createPayment(data: CreatePaymentData) {
    return api.post('/api/v1/payments', data);
  }

  async getAllPayments(params?: {
    hospitalId?: string;
    patientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get('/api/v1/payments', { params });
  }

  async getPaymentById(id: string) {
    return api.get(`/api/v1/payments/${id}`);
  }

  async updatePayment(id: string, data: UpdatePaymentData) {
    return api.put(`/api/v1/payments/${id}`, data);
  }

  async markAsPaid(id: string, transactionId?: string) {
    return api.post(`/api/v1/payments/${id}/mark-paid`, { transactionId });
  }

  async getPaymentStats(hospitalId?: string) {
    return api.get('/api/v1/payments/stats', { params: { hospitalId } });
  }
}

const paymentService = new PaymentService();
export default paymentService;
