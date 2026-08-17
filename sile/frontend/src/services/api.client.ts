import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15-second timeout
});

// Request interceptor to inject JWT bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sile_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to extract a clean, user-friendly error message from any API or network failure
export const formatApiErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;

    if (!axiosErr.response) {
      if (axiosErr.code === 'ECONNABORTED') {
        return 'The request timed out. Please check your internet connection and try again.';
      }
      return 'Unable to connect to the SILE server. Please ensure the backend is running or try again shortly.';
    }

    const status = axiosErr.response.status;
    const errorData = axiosErr.response.data;

    // Check backend standardized error payload
    if (errorData?.error?.message) {
      return errorData.error.message;
    }

    switch (status) {
      case 400:
        return 'The request was invalid. Please verify the submitted information.';
      case 401:
        return 'Your session has expired or authentication failed. Please log in again.';
      case 403:
        return 'You do not have permission to access this resource or perform this action.';
      case 404:
        return 'The requested resource or record could not be found.';
      case 409:
        return 'A record with this information already exists.';
      case 422:
        return errorData?.detail?.[0]?.msg || 'Please correct the highlighted fields and try again.';
      case 500:
      case 502:
      case 503:
        return 'A server error occurred. Our team has been notified. Please try again later.';
      default:
        return `Unexpected error (${status}). Please try again.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

// Response interceptor for unified session and 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token if session is expired or revoked
      localStorage.removeItem('sile_access_token');
      localStorage.removeItem('sile_refresh_token');
    }
    return Promise.reject(error);
  }
);
