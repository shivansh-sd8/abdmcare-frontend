import api from './api';

interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  reason?: string;
  notes?: string;
}

interface UpdateAppointmentData {
  status?: string;
  notes?: string;
  reason?: string;
}

class AppointmentService {
  async createAppointment(data: CreateAppointmentData) {
    return api.post('/api/v1/appointments', data);
  }

  async getAllAppointments(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    return api.get('/api/v1/appointments/search', { params });
  }

  async getAppointmentById(id: string) {
    return api.get(`/api/v1/appointments/${id}`);
  }

  async updateAppointment(id: string, data: UpdateAppointmentData) {
    return api.put(`/api/v1/appointments/${id}`, data);
  }

  async cancelAppointment(id: string, reason?: string) {
    return api.post(`/api/v1/appointments/${id}/cancel`, { reason });
  }

  async searchAppointments(params: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get('/api/v1/appointments/search', { params });
  }

  async getAppointmentStats() {
    return api.get('/api/v1/appointments/stats');
  }
}

export default new AppointmentService();
