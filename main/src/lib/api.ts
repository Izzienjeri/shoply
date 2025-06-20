import { getAuthToken, clearAuthToken } from '../contexts/AuthContext'
import { PaginatedNotificationsResponse, Notification as NotificationInterface } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  needsAuth?: boolean;
  isFormData?: boolean;
  params?: Record<string, any>; 
  body?: any; 
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T | null> {
  let url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = options.isFormData ? {} : { 'Content-Type': 'application/json' };
  let body = options.body;

  if (options.params) {
    const queryParams = new URLSearchParams();
    for (const key in options.params) {
      if (options.params[key] !== undefined && options.params[key] !== null) {
        queryParams.append(key, String(options.params[key]));
      }
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  if (options.needsAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('Auth token needed but not found for', endpoint);
       throw new Error("Authentication required.");
    }
  }

  if (body && !options.isFormData && typeof body !== 'string') {
     body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    if (!response.ok) {
      if (response.status === 401) {
         console.error('Unauthorized request to', endpoint);
      }
      let errorData;
      try {
         errorData = await response.json();
      } catch (parseError) {
         errorData = { message: response.statusText || `Request failed with status ${response.status}` };
      }
      console.error(`API Error (${response.status}):`, errorData);
      throw new Error(errorData?.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }
    
    try {
        const jsonData = await response.json();
        return jsonData as T;
    } catch (e) {
        console.warn(`Request to ${endpoint} was OK but response body was not valid JSON or empty.`)
        return null;
    }


  } catch (error) {
    console.error('Network or API request error:', error);
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = void>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  getNotifications: async (params: { page?: number; per_page?: number; unread_only?: boolean } = {}): Promise<PaginatedNotificationsResponse> => {
    const result = await apiClient.get<PaginatedNotificationsResponse>('/api/notifications/', { params, needsAuth: true });
    if (result === null) {
        throw new Error("API returned null when PaginatedNotificationsResponse was expected for getNotifications.");
    }
    return result;
  },

  markNotificationAsRead: async (notificationId: string): Promise<NotificationInterface> => {
    const result = await apiClient.post<NotificationInterface>(`/api/notifications/${notificationId}/read`, {}, { needsAuth: true });
    if (result === null) {
        throw new Error("API returned null when Notification was expected for markNotificationAsRead.");
    }
    return result;
  },

  markAllNotificationsAsRead: async (): Promise<{ message: string, unread_count: number }> => {
    const result = await apiClient.post<{ message: string, unread_count: number }>(`/api/notifications/read-all`, {}, { needsAuth: true });
    if (result === null) {
        throw new Error("API returned null when {message, unread_count} was expected for markAllNotificationsAsRead.");
    }
    return result;
  },
};