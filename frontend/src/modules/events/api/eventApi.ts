import api from './axios'

export const eventApi = {
  getMine: (params?: Record<string, string>) =>
    api.get('/events/mine', { params }),

  create: (formData: FormData) =>
    api.post('/events', formData),

  update: (id: number, formData: FormData) =>
    api.put(`/events/${id}`, formData),

  delete: (id: number) =>
    api.delete(`/events/${id}`),

  bulkImport: (formData: FormData, params?: Record<string, string>) =>
    api.post('/events/bulk-import', formData, { params }),

  setBatchDeadline: (batchId: string, hours: number) =>
    api.put(`/events/batch/${batchId}/deadline`, { hours }),

  setSingleDeadline: (id: number, hours: number) =>
    api.put(`/events/${id}/deadline`, { hours }),

  mineExport: (params?: Record<string, string>) =>
    api.get('/events/mine/export', { params, responseType: 'blob' }),

  getAll: (params?: Record<string, string>) =>
    api.get('/events/all', { params }),

  adminExport: (params?: Record<string, string>) =>
    api.get('/events/export', { params, responseType: 'blob' }),
}