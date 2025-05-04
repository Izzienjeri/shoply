import { getAuthToken, clearAuthToken } from '../contexts/AuthContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  needsAuth?: boolean;
  isFormData?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T | null> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = options.isFormData ? {} : { 'Content-Type': 'application/json' };
  let body = options.body;

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

    return await response.json() as T;

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
};