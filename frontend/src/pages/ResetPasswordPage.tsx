import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPasswordApi } from '../api/authApi'
import { Eye, EyeOff, Loader2, Lock, ShieldAlert } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const resetToken = sessionStorage.getItem('resetToken')

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    new: false, confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!resetToken) {
      navigate('/forgot-password', { replace: true })
    }
  }, [resetToken, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!resetToken) {
      setError('Session expired. Please request a new password reset code.')
      return
    }

    setIsLoading(true)
    try {
      await resetPasswordApi(formData.newPassword, formData.confirmPassword, resetToken)
      sessionStorage.removeItem('resetToken')
      sessionStorage.removeItem('userId')
      
      navigate('/login', {
        state: { message: 'Password reset successful! Please log in with your new password.' }
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Your reset code may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (field: keyof typeof showPasswords) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-[#E5DDC6]/60">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#101A24]/10 rounded-2xl flex items-center justify-center text-[#101A24] mx-auto mb-4 border border-[#E5DDC6]">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#101A24]">Reset Your Password</h1>
          <p className="text-sm text-[#101A24] mt-2 leading-relaxed">
            Please choose a strong, secure password for your portal account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 text-center flex items-center justify-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { key: 'newPassword' as const, label: 'New Password', placeholder: 'Min 8 characters', show: showPasswords.new, toggleKey: 'new' as const },
            { key: 'confirmPassword' as const, label: 'Confirm New Password', placeholder: '••••••••', show: showPasswords.confirm, toggleKey: 'confirm' as const },
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium text-[#101A24]">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  value={formData[field.key]}
                  onChange={e => { setFormData({ ...formData, [field.key]: e.target.value }); setError(''); }}
                  required
                  disabled={isLoading}
                  className="w-full h-11 px-3.5 pr-12 bg-[#E5DDC6]/30/60 border border-[#E5DDC6] focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-[#101A24] transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggle(field.toggleKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#101A24] hover:text-[#101A24]"
                >
                  {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading || !formData.newPassword || !formData.confirmPassword}
            className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving password...</> : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
