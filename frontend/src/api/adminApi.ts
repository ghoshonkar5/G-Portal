import authAxios from './axios'

export interface CreateUserData {
  role: 'faculty' | 'student' | 'admin'
  facultyId: string
  name: string
  email: string
  department?: string
  designation?: string
  mobile?: string
}

export const createUserApi = (data: CreateUserData) =>
  authAxios.post('/api/admin/users', data, { baseURL: '' }).then(r => r.data)

export const bulkCreateUsersApi = (role: string, users: any[]) =>
  authAxios.post('/api/admin/users/bulk', { role, users }, { baseURL: '' }).then(r => r.data)

export const listUsersApi = (params?: { role?: string; search?: string; page?: number; limit?: number }) =>
  authAxios.get('/api/admin/users', { params, baseURL: '' }).then(r => r.data)

export const toggleUserStatusApi = (id: number | string, is_active: boolean) =>
  authAxios.patch(`/api/admin/users/${id}/status`, { is_active }, { baseURL: '' }).then(r => r.data)

export const deleteUserApi = (id: number | string) =>
  authAxios.delete(`/api/admin/users/${id}`, { baseURL: '' }).then(r => r.data)
