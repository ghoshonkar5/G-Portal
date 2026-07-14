import api from './axios'
import type { Achievement, AchievementUserProfile } from '../types'

// ── Own profile (student-specific fields not in JWT) ──────────────────────
export const getMyProfile = (): Promise<AchievementUserProfile> =>
  api.get('/api/users/me').then(r => r.data)

// ── Own achievements (student + faculty) ─────────────────────────────────
export const getMyAchievements = (): Promise<Achievement[]> =>
  api.get('/api/achievements/mine').then(r => r.data)

// ── Submit new achievement ────────────────────────────────────────────────
export const submitAchievement = (formData: FormData): Promise<Achievement> =>
  api.post('/api/achievements', formData).then(r => r.data)

// ── Update achievement ────────────────────────────────────────────────────
export const updateAchievement = (id: string, formData: FormData): Promise<Achievement> =>
  api.put(`/api/achievements/${id}`, formData).then(r => r.data)

// ── Delete achievement ────────────────────────────────────────────────────
export const deleteAchievement = (id: string): Promise<void> =>
  api.delete(`/api/achievements/${id}`).then(r => r.data)

// ── Faculty: view assigned students' achievements (with optional filters) ─
export const getStudentAchievements = (
  params?: Record<string, string>
): Promise<Achievement[]> =>
  api.get('/api/achievements/students', { params }).then(r => r.data)

// ── Admin: view all achievements (with optional filters) ──────────────────
export const getAllAchievements = (
  params?: Record<string, string>
): Promise<Achievement[]> =>
  api.get('/api/achievements/all', { params }).then(r => r.data)

// ── Exports ───────────────────────────────────────────────────────────────
export const exportMyAchievements = (params?: Record<string, string>): Promise<Blob> =>
  api.get('/api/export/my-achievements', { params, responseType: 'blob' }).then(r => r.data)

export const exportStudentAchievements = (params?: Record<string, string>): Promise<Blob> =>
  api.get('/api/export/my-students', { params, responseType: 'blob' }).then(r => r.data)

export const exportAllAchievements = (
  role: 'student' | 'faculty',
  params?: Record<string, string>
): Promise<Blob> =>
  api.get('/api/export/all', {
    params: { role, ...params },
    responseType: 'blob',
  }).then(r => r.data)
