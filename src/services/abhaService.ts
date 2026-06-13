import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// ABHA Service V3 — Maps to backend /api/v1/abha/* routes
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/abha';

class AbhaService {
  // ══════════════════════════════════════════════════════════════════════════
  // M1: ENROLLMENT — Aadhaar OTP
  // ══════════════════════════════════════════════════════════════════════════
  async generateAadhaarOtp(aadhaar: string) {
    return api.post(`${BASE}/enrollment/aadhaar/send-otp`, { aadhaar });
  }

  async resendAadhaarOtp(txnId: string, aadhaar: string) {
    return api.post(`${BASE}/enrollment/aadhaar/resend-otp`, { txnId, aadhaar });
  }

  async enrolByAadhaar(txnId: string, otp: string, mobile: string) {
    return api.post(`${BASE}/enrollment/aadhaar/enrol`, { txnId, otp, mobile });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: ENROLLMENT — Mobile verification (after Aadhaar enrol)
  // ══════════════════════════════════════════════════════════════════════════
  async sendMobileVerifyOtp(txnId: string, mobile: string) {
    return api.post(`${BASE}/enrollment/mobile/send-otp`, { txnId, mobile });
  }

  async verifyMobileOtp(txnId: string, otp: string) {
    return api.post(`${BASE}/enrollment/mobile/verify-otp`, { txnId, otp });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: ABHA ADDRESS
  // ══════════════════════════════════════════════════════════════════════════
  async getAbhaAddressSuggestions(txnId: string) {
    return api.get(`${BASE}/enrollment/abha-address/suggestions`, { params: { txnId } });
  }

  async createAbhaAddress(txnId: string, abhaAddress: string) {
    return api.post(`${BASE}/enrollment/abha-address`, { txnId, abhaAddress });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: ENROLLMENT — Driving License
  // ══════════════════════════════════════════════════════════════════════════
  async dlSendMobileOtp(mobile: string) {
    return api.post(`${BASE}/enrollment/dl/send-otp`, { mobile });
  }

  async dlVerifyMobileOtp(txnId: string, otp: string) {
    return api.post(`${BASE}/enrollment/dl/verify-otp`, { txnId, otp });
  }

  async enrolByDrivingLicense(data: {
    txnId: string;
    dlNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dob: string;
    gender: string;
    state?: string;
    district?: string;
    pinCode?: string;
  }) {
    return api.post(`${BASE}/enrollment/dl/enrol`, data);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: LOGIN / VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  async loginRequestOtp(params: {
    scope: string[];
    loginHint: string;
    loginId: string;
    otpSystem: 'aadhaar' | 'abdm';
    txnId?: string;
  }) {
    return api.post(`${BASE}/login/request-otp`, params);
  }

  async loginVerifyOtp(scope: string[], txnId: string, otp: string) {
    return api.post(`${BASE}/login/verify-otp`, { scope, txnId, otp });
  }

  async loginVerifyPassword(scope: string[], abhaNumber: string, password: string) {
    return api.post(`${BASE}/login/verify-password`, { scope, abhaNumber, password });
  }

  async loginVerifyUser(abhaNumber: string, txnId: string) {
    return api.post(`${BASE}/login/verify-user`, { abhaNumber, txnId });
  }

  async loginSearch(abhaNumber: string) {
    return api.post(`${BASE}/login/search`, { abhaNumber });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: FIND ABHA
  // ══════════════════════════════════════════════════════════════════════════
  async findAbhaByMobile(mobile: string) {
    return api.post(`${BASE}/find`, { mobile });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: PROFILE (requires X-token from login)
  // ══════════════════════════════════════════════════════════════════════════
  async getProfile(xToken: string) {
    return api.get(`${BASE}/profile`, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  async updateProfile(xToken: string, updates: Record<string, any>) {
    return api.patch(`${BASE}/profile`, updates, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  async getQrCode(xToken: string) {
    return api.get(`${BASE}/profile/qr`, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  async getAbhaCard(xToken: string) {
    return api.get(`${BASE}/profile/card`, {
      headers: { 'X-token': `Bearer ${xToken}` },
      responseType: 'blob',
    });
  }

  async logout(xToken: string) {
    return api.get(`${BASE}/profile/logout`, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M1: PHR / ABHA Address Verification
  // ══════════════════════════════════════════════════════════════════════════
  async phrSearch(abhaAddress: string) {
    return api.post(`${BASE}/phr/search`, { abhaAddress });
  }

  async phrRequestOtp(abhaAddress: string, scope: string[], otpSystem: 'aadhaar' | 'abdm') {
    return api.post(`${BASE}/phr/request-otp`, { abhaAddress, scope, otpSystem });
  }

  async phrVerifyOtp(scope: string[], txnId: string, otp: string) {
    return api.post(`${BASE}/phr/verify-otp`, { scope, txnId, otp });
  }

  async phrGetProfile(xToken: string) {
    return api.get(`${BASE}/phr/profile`, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  async phrGetCard(xToken: string) {
    return api.get(`${BASE}/phr/card`, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATIENT LINKING
  // ══════════════════════════════════════════════════════════════════════════
  async linkToPatient(
    abhaNumber: string,
    patientId: string,
    abhaAddress?: string,
    opts?: { verified?: boolean; profile?: any },
  ) {
    return api.post(`${BASE}/link`, {
      abhaNumber,
      patientId,
      abhaAddress,
      ...(opts?.verified ? { verified: true } : {}),
      ...(opts?.profile ? { profile: opts.profile } : {}),
    });
  }

  async unlinkFromPatient(abhaNumber: string, patientId: string) {
    return api.post(`${BASE}/unlink`, { abhaNumber, patientId });
  }

  async getLocalRecord(abhaNumber: string) {
    return api.get(`${BASE}/record/${abhaNumber}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE OTP OPERATIONS (mobile/email change)
  // ══════════════════════════════════════════════════════════════════════════
  async profileRequestOtp(params: {
    scope: string[];
    loginHint: string;
    loginId: string;
    otpSystem: 'aadhaar' | 'abdm';
  }, xToken: string) {
    return api.post(`${BASE}/profile/request-otp`, params, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  async profileVerifyOtp(scope: string[], txnId: string, otp: string, xToken: string) {
    return api.post(`${BASE}/profile/verify-otp`, { scope, txnId, otp }, { headers: { 'X-token': `Bearer ${xToken}` } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NEW vs RETURNING PATIENT LOOKUP
  // ══════════════════════════════════════════════════════════════════════════
  async lookupPatient(identifier: string) {
    return api.get(`${BASE}/patient/lookup`, { params: { identifier } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HIP — FACILITY QR & RECEIVED SHARES
  // ══════════════════════════════════════════════════════════════════════════
  async getFacilityQrData() {
    return api.get('/api/v1/hip/facility-qr');
  }

  async getReceivedShares() {
    return api.get('/api/v1/hip/received-shares');
  }
}

const abhaService = new AbhaService();
export default abhaService;
