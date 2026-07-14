import api from './axios'

export const facultyApi = {
  getMe: () =>
    api.get('/faculty/me'),

  list: (params?: Record<string, string>) =>
    api.get('/faculty', { params }),

  create: (data: {
    name: string
    faculty_id: string
    email: string
    department: string
    designation: string
    password: string
  }) => api.post('/faculty', data),

  updateProfile: (data: { name: string; department: string; designation: string }) =>
    api.put('/faculty/me', data),

  changePassword: (data: {
    current_password: string
    new_password: string
    confirm_password: string
  }) => api.put('/faculty/me/password', data),
}