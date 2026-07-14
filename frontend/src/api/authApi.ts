import authAxios from './axios'
import type { AuthResponse } from '../types/index'

export const loginApi = async (facultyId: string, password: string, googleVerified?: boolean): Promise<any> => {
    const res = await authAxios.post('/login', { facultyId, password, google_verified: googleVerified })
    return res.data
}

export const verifyOtpApi = async (userId: number | string, otp: string, purpose: string): Promise<any> => {
    const res = await authAxios.post('/verify-otp', { userId, otp, purpose })
    return res.data
}

export const resendOtpApi = async (userId: number | string, purpose: string): Promise<any> => {
    const res = await authAxios.post('/resend-otp', { userId, purpose })
    return res.data
}

export const googleAuthApi = async (params: { credential?: string; purpose: string }): Promise<any> => {
    const res = await authAxios.post('/google', params)
    return res.data
}

export const unlinkGoogleApi = async (): Promise<any> => {
    const res = await authAxios.post('/google/unlink')
    return res.data
}

export const forgotPasswordApi = async (id: string, email: string): Promise<any> => {
    const res = await authAxios.post('/forgot-password', { id, email })
    return res.data
}

export const resetPasswordApi = async (newPassword: string, confirmPassword: string, resetToken: string): Promise<any> => {
    const res = await authAxios.post('/reset-password', { newPassword, confirmPassword }, {
        headers: { Authorization: `Bearer ${resetToken}` }
    })
    return res.data
}

export const getMeApi = async (): Promise<{ success: boolean; user: AuthResponse['user'] }> => {
    const res = await authAxios.get('/me')
    return res.data
}

export const logoutAllApi = async (): Promise<{ success: boolean; message: string }> => {
    const res = await authAxios.post('/logout-all')
    return res.data
}

export const checkFirstLoginIdApi = async (facultyId: string): Promise<any> => {
    const res = await authAxios.post('/first-login/check-id', { facultyId })
    return res.data
}

export const setFirstLoginPasswordApi = async (
    newPassword: string,
    confirmPassword: string,
    setupToken?: string,
    userId?: number | string,
    skipOtp?: boolean
): Promise<any> => {
    const headers: Record<string, string> = {}
    if (setupToken) {
        headers.Authorization = `Bearer ${setupToken}`
    }
    const res = await authAxios.post('/first-login/set-password', {
        newPassword,
        confirmPassword,
        userId,
        skipOtp
    }, { headers })
    return res.data
}

export const onboardingApi = async (data: any): Promise<AuthResponse> => {
    const res = await authAxios.put('/api/profile/onboarding', data, {
        baseURL: ''
    })
    return res.data
}