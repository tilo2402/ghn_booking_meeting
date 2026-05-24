import api from './axios';

export const authApi = {
  login: (email, fullName) =>
    api.post('/auth/login', { email, full_name: fullName }),

  getMe: () => api.get('/auth/me'),
};

export const roomsApi = {
  getAll: (params) => api.get('/rooms', { params }),

  search: (params) => api.get('/rooms/search', { params }),

  getById: (id) => api.get(`/rooms/${id}`),

  create: (data) => api.post('/rooms', data),

  update: (id, data) => api.put(`/rooms/${id}`, data),

  delete: (id) => api.delete(`/rooms/${id}`),
};

export const bookingsApi = {
  getMyBookings: (params) => api.get('/bookings', { params }),

  getRoomBookings: (roomId, startDate, endDate) =>
    api.get(`/bookings/room/${roomId}`, { params: { start_date: startDate, end_date: endDate } }),

  getById: (id) => api.get(`/bookings/${id}`),

  create: (data) => api.post('/bookings', data),

  update: (id, data) => api.put(`/bookings/${id}`, data),

  cancel: (id) => api.delete(`/bookings/${id}`),

  checkIn: (id) => api.post(`/bookings/${id}/checkin`),
};

export const dashboardApi = {
  getMetrics: (params) => api.get('/dashboard/metrics', { params }),
  getReport:  (params) => api.get('/dashboard/report',  { params }),
};
