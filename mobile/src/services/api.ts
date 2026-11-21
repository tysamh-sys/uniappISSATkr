import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* ==========================================================================
   API CLIENT CONFIGURATION & STORAGE
   Supports process.env.EXPO_PUBLIC_API_URL, dynamic in-app override,
   ngrok header bypass, and secure token persistence.
   ========================================================================== */

const STORAGE_KEY_TOKEN = 'issatk_auth_token';
const STORAGE_KEY_USER = 'issatk_auth_user';
const STORAGE_KEY_API_URL = 'issatk_custom_api_url';

// Default base URL from env or fallback ngrok placeholder
const FALLBACK_API_URL = 'https://YOUR-NGROK-DOMAIN.ngrok-free.app/api';
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL;

// In-memory fallback if SecureStore fails or runs on web
const memoryStore: Record<string, string> = {};

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore[key] || null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return memoryStore[key] || null;
  }
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    memoryStore[key] = value;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    // Memory store already set
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    delete memoryStore[key];
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    // Ignore error
  }
}

// Active API Base URL cache
let cachedBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const stored = await getStorageItem(STORAGE_KEY_API_URL);
  let url = stored || DEFAULT_API_URL;
  // Ensure url ends without trailing slash
  url = url.trim().replace(/\/+$/, '');
  // If user only provided base domain without /api, append /api
  if (!url.endsWith('/api') && !url.includes('/api/')) {
    url = `${url}/api`;
  }
  cachedBaseUrl = url;
  return url;
}

export async function setApiBaseUrl(newUrl: string): Promise<void> {
  let cleanUrl = newUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/api') && !cleanUrl.includes('/api/')) {
    cleanUrl = `${cleanUrl}/api`;
  }
  cachedBaseUrl = cleanUrl;
  await setStorageItem(STORAGE_KEY_API_URL, cleanUrl);
}

export async function resetApiBaseUrl(): Promise<void> {
  cachedBaseUrl = null;
  await removeStorageItem(STORAGE_KEY_API_URL);
}

// Token management
export async function getAuthToken(): Promise<string | null> {
  return await getStorageItem(STORAGE_KEY_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await setStorageItem(STORAGE_KEY_TOKEN, token);
}

export async function removeAuthToken(): Promise<void> {
  await removeStorageItem(STORAGE_KEY_TOKEN);
  await removeStorageItem(STORAGE_KEY_USER);
}

export async function getStoredUser(): Promise<any | null> {
  const raw = await getStorageItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any): Promise<void> {
  await setStorageItem(STORAGE_KEY_USER, JSON.stringify(user));
}

/* ==========================================================================
   NETWORK REQUEST WRAPPER
   - Injects ngrok-skip-browser-warning: "true" to avoid ngrok interstitial
   - Injects Bearer token when present
   - Timeout protection (15 seconds)
   - Proper error wrapping and status code handling
   ========================================================================== */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  errors?: any[];
}

export class ApiError extends Error {
  status: number;
  data?: any;
  isNetworkError: boolean;

  constructor(message: string, status: number = 500, data?: any, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
}

let onUnauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorizedCallback = handler;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  const token = !options.skipAuth ? await getAuthToken() : null;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    // CRITICAL: Tells ngrok to bypass its free-tier warning HTML splash screen
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs || 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      signal: controller.signal,
    };

    if (options.body) {
      fetchOptions.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timer);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      await removeAuthToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      throw new ApiError('Session expirée ou non autorisée. Veuillez vous reconnecter.', 401);
    }

    // Check content type for JSON
    const contentType = response.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      parsedData = await response.json();
    } else {
      const text = await response.text();
      // Ngrok HTML interstitial or error page detection
      if (text.includes('ngrok-skip-browser-warning') || text.includes('ngrok')) {
        throw new ApiError(
          'Tunnel ngrok actif mais réponse inattendue. Assurez-vous que le serveur backend Node.js tourne bien.',
          response.status,
          text,
          true
        );
      }
      throw new ApiError(
        `Réponse serveur inattendue (${response.status}): ${text.slice(0, 150)}`,
        response.status,
        text
      );
    }

    if (!response.ok) {
      const errorMsg = parsedData?.message || parsedData?.error || `Erreur serveur (${response.status})`;
      throw new ApiError(errorMsg, response.status, parsedData);
    }

    // Unpack data if backend returned standard { success: true, data: ... }
    if (parsedData && typeof parsedData === 'object' && 'data' in parsedData) {
      return parsedData.data as T;
    }

    return parsedData as T;
  } catch (error: any) {
    clearTimeout(timer);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new ApiError('Délai d’attente dépassé (timeout). Le serveur backend ngrok ne répond pas.', 408, null, true);
    }
    throw new ApiError(
      error.message || 'Impossible de joindre le serveur. Vérifiez votre connexion et le tunnel ngrok.',
      0,
      null,
      true
    );
  }
}

/* ==========================================================================
   BACKEND ENDPOINT SERVICES
   ========================================================================== */

export const api = {
  // Test connection to backend
  async ping(): Promise<{ ok: boolean; message: string; url: string }> {
    const url = await getApiBaseUrl();
    try {
      // Ping an endpoint or base URL
      await request('/announcements', { timeoutMs: 8000, skipAuth: true });
      return { ok: true, message: 'Connecté au backend avec succès', url };
    } catch (err: any) {
      // If 401, backend is reached and running!
      if (err.status === 401) {
        return { ok: true, message: 'Backend opérationnel (Authentification requise)', url };
      }
      return { ok: false, message: err.message || 'Connexion échouée', url };
    }
  },

  // Auth endpoints
  auth: {
    async login(email: string, password: string): Promise<{ user: any; token: string }> {
      const res = await request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      if (res?.token) {
        await setAuthToken(res.token);
      }
      if (res?.user) {
        await setStoredUser(res.user);
      }
      return res;
    },

    async getMe(): Promise<any> {
      return await request('/auth/me');
    },

    async logout(): Promise<void> {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // Continue cleanup even if server logout call fails
      }
      await removeAuthToken();
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<any> {
      return await request('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
    },
  },

  // Teacher endpoints
  teacher: {
    async getDashboard(date?: string): Promise<any> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      return await request(`/teacher/dashboard${query}`);
    },

    async getSchedule(date?: string): Promise<any> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      return await request(`/teacher/schedule${query}`);
    },

    async getTodaySchedule(): Promise<any> {
      return await request('/teacher/schedule/today');
    },

    async getSessionRoster(sessionId: string): Promise<any> {
      return await request(`/teacher/roster/${sessionId}`);
    },

    async submitRollCall(sessionId: string, records: { studentId: string; status: 'present' | 'absent' }[]): Promise<any> {
      return await request(`/teacher/rollcall/${sessionId}`, {
        method: 'POST',
        body: { records },
      });
    },

    async createAnnouncement(data: {
      classId?: string;
      className?: string;
      subjectId?: string;
      title: string;
      message: string;
    }): Promise<any> {
      return await request('/teacher/announcements', {
        method: 'POST',
        body: data,
      });
    },

    async getRequests(): Promise<any[]> {
      return await request('/teacher/requests');
    },

    async submitRequest(data: { type: string; date?: string; reason: string }): Promise<any> {
      return await request('/teacher/requests', {
        method: 'POST',
        body: data,
      });
    },
  },

  // Student endpoints
  student: {
    async getDashboard(date?: string): Promise<any> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      return await request(`/student/dashboard${query}`);
    },

    async getTimetable(dayOrDate?: string): Promise<any> {
      const query = dayOrDate ? `?day=${encodeURIComponent(dayOrDate)}` : '';
      return await request(`/student/timetable${query}`);
    },

    async getAttendance(filter?: 'Toutes' | 'Absences' | 'En attente'): Promise<any> {
      const query = filter && filter !== 'Toutes' ? `?filter=${encodeURIComponent(filter)}` : '';
      return await request(`/student/attendance${query}`);
    },

    async getCourseDetails(courseId: string): Promise<any> {
      return await request(`/student/courses/${courseId}`);
    },

    async submitJustification(data: {
      recordId?: string;
      sessionId?: string;
      reason?: string;
      medicalCenter?: string;
      startDate?: string;
      endDate?: string;
      fileData?: string;
      fileName?: string;
    }): Promise<any> {
      return await request('/student/justify', {
        method: 'POST',
        body: data,
      });
    },
  },

  // Notifications & Announcements
  notifications: {
    async getAll(): Promise<any> {
      return await request('/notifications');
    },

    async markAsRead(id: string): Promise<any> {
      return await request(`/notifications/${id}/read`, { method: 'POST' });
    },

    async markAllAsRead(): Promise<any> {
      return await request('/notifications/read-all', { method: 'POST' });
    },
  },

  announcements: {
    async getAll(): Promise<any[]> {
      return await request('/announcements');
    },

    async markAsRead(id: string): Promise<any> {
      return await request(`/announcements/${id}/read`, { method: 'POST' });
    },
  },
};

export default api;
