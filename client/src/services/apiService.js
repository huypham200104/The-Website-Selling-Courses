import api from './api';

// Auth Services
export const authService = {
  login: async (email, password) => {
    // For demo: direct login with credentials
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('token');
    return response.data;
  },

  addFavorite: async (courseId) => {
    const response = await api.post(`/auth/favorites/${courseId}`);
    return response.data;
  },

  removeFavorite: async (courseId) => {
    const response = await api.delete(`/auth/favorites/${courseId}`);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
};

// Course Services
export const courseService = {
  getAll: async () => {
    const response = await api.get('/courses');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  create: async (courseData) => {
    const response = await api.post('/courses', courseData);
    return response.data;
  },

  update: async (id, courseData) => {
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  addQuiz: async (id, quizData) => {
    const response = await api.post(`/courses/${id}/quizzes`, quizData);
    return response.data;
  },

  deleteQuiz: async (id, quizId) => {
    const response = await api.delete(`/courses/${id}/quizzes/${quizId}`);
    return response.data;
  },

  enroll: async (courseId) => {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  getAdminAll: async () => {
    const response = await api.get('/courses/admin/all');
    return response.data;
  },

  updateStatus: async (courseId, status) => {
    const response = await api.put(`/courses/${courseId}/status`, { status });
    return response.data;
  },

  getStudents: async (id) => {
    const response = await api.get(`/courses/${id}/students`);
    return response.data;
  },

  getReviews: async (id) => {
    const response = await api.get(`/courses/${id}/reviews`);
    return response.data;
  },

  addReview: async (id, payload) => {
    const response = await api.post(`/courses/${id}/reviews`, payload);
    return response.data;
  },

  deleteReview: async (courseId, reviewId) => {
    const response = await api.delete(`/courses/${courseId}/reviews/${reviewId}`);
    return response.data;
  },
};

// User Services (Admin only)
export const userService = {
  getAll: async () => {
    // This would need a new endpoint in backend
    const response = await api.get('/users');
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Video Services
export const videoService = {
  getOne: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },
};

// Order Services
export const orderService = {
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/orders/${id}`, { status });
    return response.data;
  },

  create: async (courseId, paymentMethod = 'chuyển khoản') => {
    const response = await api.post('/orders', { courseId, paymentMethod });
    return response.data;
  },

  uploadProof: async (orderId, formData) => {
    const response = await api.put(`/orders/${orderId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Stats Service (for dashboard)
export const statsService = {
  getDashboardStats: async () => {
    // Combine multiple requests
    const [courses, orders] = await Promise.all([
      courseService.getAll(),
      orderService.getAll(),
    ]);

    return {
      totalCourses: courses.count || courses.data?.length || 0,
      totalOrders: orders.count || orders.data?.length || 0,
      // Add more stats as needed
    };
  },
};

// Chat Services
export const chatService = {
  getPartners: async () => {
    const response = await api.get('/chat/partners');
    return response.data;
  },

  getMessages: async (partnerId) => {
    const response = await api.get(`/chat/messages/${partnerId}`);
    return response.data;
  },

  sendMessage: async (partnerId, text) => {
    const response = await api.post(`/chat/messages/${partnerId}`, { text });
    return response.data;
  },
};

// Quiz Services
export const quizService = {
  submitResult: async (resultData) => {
    const response = await api.post('/quizzes/submit', resultData);
    return response.data;
  },

  getMyResults: async () => {
    const response = await api.get('/quizzes/my-results');
    return response.data;
  },

  getCourseResults: async (courseId) => {
    const response = await api.get(`/quizzes/course/${courseId}`);
    return response.data;
  }
};
