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
  register: (payload) => api.post('/auth/register', payload),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data),
  addFavorite: (courseId) => api.post(`/auth/favorites/${courseId}`),
  removeFavorite: (courseId) => api.delete(`/auth/favorites/${courseId}`),
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Course APIs
export const courseAPI = {
  getAll: () => api.get('/courses'),
  getOne: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  getAdminAll: () => api.get('/courses/admin/all'),
  updateStatus: (id, status) => api.put(`/courses/${id}/status`, { status }),
  addQuiz: (id, quizData) => api.post(`/courses/${id}/quizzes`, quizData),
  deleteQuiz: (id, quizId) => api.delete(`/courses/${id}/quizzes/${quizId}`),
};

// Video APIs
export const videoAPI = {
  getOne: (id) => api.get(`/videos/${id}`),
  uploadChunk: (formData, signal) => api.post('/videos/upload-chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  }),
  mergeChunks: (data, signal) => api.post('/videos/merge-chunks', data, { signal }),
  delete: (id) => api.delete(`/videos/${id}`),
  getStreamUrl: (id) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/videos/${id}/stream${token ? `?token=${token}` : ''}`;
  },
};

// Order APIs
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  summary: () => api.get('/orders/summary'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
