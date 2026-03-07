import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// User APIs
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Course APIs
export const courseAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getOne: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  uploadThumbnail: (id, formData) =>
    api.put(`/courses/${id}/thumbnail`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Video APIs
export const videoAPI = {
  getOne: (id) => api.get(`/videos/${id}`),
  uploadChunk: (formData) => api.post('/videos/upload-chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  mergeChunks: (data) => api.post('/videos/merge-chunks', data),
  delete: (id) => api.delete(`/videos/${id}`),
  getStreamUrl: (id) => `${API_URL}/videos/${id}/stream`,
};

// Order APIs
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
};

// Health check
export const healthCheck = () => api.get('/health');

// Admin stats
export const adminAPI = {
  getStats: (params) => api.get('/admin/stats', { params }),
};

export default api;
