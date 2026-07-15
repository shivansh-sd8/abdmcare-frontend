import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { getSelectedHospitalIdFromStorage } from '../store/slices/uiSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

/**
 * URL prefixes where we MUST NOT inject `?hospitalId=` even when a SUPER_ADMIN
 * has selected a hospital scope. These endpoints are either:
 *   - about hospitals themselves (the entity, not data inside them), or
 *   - inherently global (auth, refresh, health, public docs, etc.)
 */
const SCOPE_INJECT_DENYLIST: ReadonlyArray<string> = [
  '/api/v1/hospitals',         // list / get / create / update of hospitals
  '/api/v1/auth',              // login, refresh, logout
  '/api/v1/users',             // platform user management
  '/api/v1/enquiry',           // public enquiry form
  '/health',                   // service health check
];

const shouldInjectHospitalScope = (url: string | undefined): boolean => {
  if (!url) return false;
  // Anything not under /api/v1 (assets, static) → don't inject.
  if (!url.startsWith('/api/')) return false;
  return !SCOPE_INJECT_DENYLIST.some((prefix) => url.startsWith(prefix));
};

const readCurrentUserRole = (): string | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.role || null;
  } catch {
    return null;
  }
};

class ApiService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(token);
    });
    this.failedQueue = [];
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // ── SUPER_ADMIN hospital scope injection ──────────────────────────
        // When a Super Admin picks a hospital from the global scope selector,
        // we transparently propagate it as ?hospitalId=<id> on every API call
        // so all list / chart / detail screens reflect just that hospital.
        // The caller can always override by passing its own hospitalId in
        // params or in the URL — we never clobber an explicit value.
        const selectedHospitalId = getSelectedHospitalIdFromStorage();
        const role = readCurrentUserRole();
        if (
          role === 'SUPER_ADMIN' &&
          selectedHospitalId &&
          shouldInjectHospitalScope(config.url)
        ) {
          // axios merges params with URL query string at send time; respect
          // an explicit hospitalId already supplied by the caller.
          const params = (config.params || {}) as Record<string, unknown>;
          const urlHasParam = (config.url || '').includes('hospitalId=');
          if (!urlHasParam && params.hospitalId === undefined) {
            config.params = { ...params, hospitalId: selectedHospitalId };
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (token && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.axiosInstance(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const res = await axios.post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refreshToken: refreshToken || undefined },
              { withCredentials: true }
            );
            const newToken = res.data?.data?.token;
            if (newToken) {
              localStorage.setItem('token', newToken);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
            }
            this.processQueue(null, newToken);
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('hospital');
            // Use hash-based flag to prevent redirect loops
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Some screens surface API errors through their own inline notices
        // (e.g. the ABHA management flows use useInlineNotice), so firing the
        // global toast here would show a duplicate popup. Skip the toast when
        // the caller opts out via `skipErrorToast`, or for endpoints that are
        // always handled inline.
        const requestUrl = (originalRequest?.url || '') as string;
        const handledInline =
          (originalRequest as { skipErrorToast?: boolean })?.skipErrorToast === true ||
          requestUrl.includes('/api/v1/abha');

        if (!handledInline) {
          const message = error.response?.data?.message || 'An error occurred';
          const status = error.response?.status || 0;
          const toastId = `api-error-${status}-${message.substring(0, 30)}`;
          if (!toast.isActive(toastId)) {
            toast.error(message, { toastId });
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
