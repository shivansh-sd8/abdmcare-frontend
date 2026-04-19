import api from './api';

export interface GenerateOtpRequest {
  aadhaar: string;
}

export interface GenerateMobileOtpRequest {
  mobile: string;
  txnId?: string;
}

export interface VerifyOtpRequest {
  txnId: string;
  otp: string;
}

export interface CreateAbhaRequest {
  txnId: string;
  mobile?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
}

export interface AbhaProfile {
  abhaNumber: string;
  abhaAddress?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dob: string;
  mobile: string;
  email?: string;
  address?: any;
  profilePhoto?: string;
  kycStatus?: string;
}

export interface AbhaLoginRequest {
  abhaAddress: string;
  password?: string;
  authMethod: 'AADHAAR_OTP' | 'MOBILE_OTP' | 'PASSWORD';
}

export interface SearchAbhaRequest {
  abhaNumber?: string;
  abhaAddress?: string;
  mobile?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  address?: any;
  profilePhoto?: string;
}

export interface LinkAbhaRequest {
  patientId: string;
  abhaNumber: string;
  abhaAddress?: string;
}

class AbhaService {
  // M1 - ABHA Creation via Aadhaar
  async generateAadhaarOtp(data: GenerateOtpRequest) {
    return api.post('/api/v1/abha/generate-aadhaar-otp', data);
  }

  async verifyAadhaarOtp(data: VerifyOtpRequest) {
    return api.post('/api/v1/abha/verify-aadhaar-otp', data);
  }

  async createAbha(data: CreateAbhaRequest) {
    return api.post('/api/v1/abha/create', data);
  }

  // M1 - ABHA Creation via Mobile
  async generateMobileOtp(data: GenerateMobileOtpRequest) {
    return api.post('/api/v1/abha/generate-mobile-otp', data);
  }

  async verifyMobileOtp(data: VerifyOtpRequest) {
    return api.post('/api/v1/abha/verify-mobile-otp', data);
  }

  // M1 - ABHA Login
  async login(data: AbhaLoginRequest) {
    return api.post('/api/v1/abha/login', data);
  }

  // M1 - Profile Management
  async getProfile(abhaId: string): Promise<AbhaProfile> {
    return api.get(`/api/v1/abha/profile/${abhaId}`);
  }

  async updateProfile(abhaId: string, data: UpdateProfileRequest) {
    return api.put(`/api/v1/abha/profile/${abhaId}`, data);
  }

  async getQrCode(abhaId: string) {
    return api.get(`/api/v1/abha/qr-code/${abhaId}`, {
      responseType: 'blob',
    });
  }

  async downloadAbhaCard(abhaId: string) {
    return api.get(`/api/v1/abha/card/${abhaId}`, {
      responseType: 'blob',
    });
  }

  // M1 - Search & Retrieve
  async searchAbha(data: SearchAbhaRequest) {
    return api.post('/api/v1/abha/search', data);
  }

  async retrieveAbha(data: { aadhaar?: string; mobile?: string }) {
    return api.post('/api/v1/abha/retrieve', data);
  }

  // Patient Linking
  async linkToPatient(data: LinkAbhaRequest) {
    return api.post('/api/v1/abha/link-patient', data);
  }

  async unlinkFromPatient(abhaId: string, patientId: string) {
    return api.delete(`/api/v1/abha/${abhaId}/unlink/${patientId}`);
  }

  // Account Management
  async deactivateAbha(abhaId: string, reason: string) {
    return api.put(`/api/v1/abha/${abhaId}/deactivate`, { reason });
  }

  async reactivateAbha(abhaId: string) {
    return api.put(`/api/v1/abha/${abhaId}/reactivate`);
  }

  async deleteAbha(abhaId: string, reason: string) {
    return api.delete(`/api/v1/abha/${abhaId}`, { data: { reason } });
  }

  // Verification
  async verifyAbha(abhaNumber: string) {
    return api.post('/api/v1/abha/verify', { abhaNumber });
  }

  async checkAbhaExists(abhaNumber: string) {
    return api.get(`/api/v1/abha/exists/${abhaNumber}`);
  }
}

export default new AbhaService();
