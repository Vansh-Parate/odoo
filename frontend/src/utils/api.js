import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response;
  },
  (error) => {
    // Log errors for debugging
    if (error.response) {
      // Server responded with error status
      console.error('[API Error]', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response (network error)
      console.error('[API Network Error]', {
        url: error.config?.url,
        message: 'No response from server. Is the server running?',
      });
    } else {
      // Something else happened
      console.error('[API Error]', error.message);
    }
    // Re-throw to let caller handle
    return Promise.reject(error);
  }
);

// Health check
export async function fetchHealth() {
  const response = await api.get('/health');
  return response.data;
}

// Data fetch
export async function fetchData() {
  const response = await api.get('/data');
  return response.data;
}

// Auth API functions
export const authAPI = {
  signup: async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
  },

  verifyOTP: async (email, otp, purpose = 'signup') => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp, purpose });
      // Axios automatically parses JSON and returns response.data
      // response.status will be 200 for success, axios throws for 4xx/5xx
      return response.data;
    } catch (error) {
      // Re-throw to let caller handle it
      // error.response.data contains the backend error response
      throw error;
    }
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  resendOTP: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetOTP: async (email, otp, newPassword) => {
    const response = await api.post('/auth/verify-reset-otp', { email, otp, newPassword });
    return response.data;
  },
};

// Products API
export async function fetchProducts() {
  const response = await api.get('/products');
  return response.data;
}

export async function createProduct(product) {
  const response = await api.post('/products', product);
  return response.data;
}

export async function updateProduct(id, product) {
  const response = await api.put(`/products/${id}`, product);
  return response.data;
}

export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`);
  return response.data;
}

// Receipts API
export async function fetchReceipts() {
  const response = await api.get('/receipts');
  return response.data;
}

export async function createReceipt(receipt) {
  const response = await api.post('/receipts', receipt);
  return response.data;
}

export async function updateReceipt(id, receipt) {
  const response = await api.put(`/receipts/${id}`, receipt);
  return response.data;
}

export async function validateReceipt(id) {
  const response = await api.post(`/receipts/${id}/validate`);
  return response.data;
}

export async function deleteReceipt(id) {
  const response = await api.delete(`/receipts/${id}`);
  return response.data;
}

// Deliveries API
export async function fetchDeliveries() {
  const response = await api.get('/deliveries');
  return response.data;
}

export async function createDelivery(delivery) {
  const response = await api.post('/deliveries', delivery);
  return response.data;
}

export async function updateDelivery(id, delivery) {
  const response = await api.put(`/deliveries/${id}`, delivery);
  return response.data;
}

export async function deleteDelivery(id) {
  const response = await api.delete(`/deliveries/${id}`);
  return response.data;
}

export default api;
