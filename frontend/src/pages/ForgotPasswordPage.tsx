import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPasswordApi } from '../api/authApi'
import { Loader2, KeyRound, ArrowLeft, ShieldAlert } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const role = searchParams.get('role') || 'faculty'
  const isStudent = role === 'student'

  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [genericMsg, setGenericMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGenericMsg('')

    if (!id.trim() || !email.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const res = await forgotPasswordApi(id.trim(), email.trim())
      
      if (res.userId) {
        sessionStorage.setItem('userId', String(res.userId))
        navigate('/verify-otp?purpose=reset')
      } else {
        // Generic response for security if account not found/mismatch
        setGenericMsg(res.message || 'If an account matches those details, a verification code has been sent.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process password reset request.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-[#E5DDC6]/60">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#101A24]/10 rounded-2xl flex items-center justify-center text-[#101A24] mx-auto mb-4 border border-[#E5DDC6]">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#101A24]">Forgot Password?</h1>
          <p className="text-sm text-[#101A24] mt-2 leading-relaxed">
            Enter your {isStudent ? 'Registration Number' : 'Faculty ID'} and registered email address to receive a verification code.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 text-center flex items-center justify-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {genericMsg && (
          <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6] text-[#101A24] px-4 py-3 rounded-xl text-sm mb-6 text-center">
            {genericMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#101A24]">
              {isStudent ? 'Registration Number' : 'Faculty ID'}
            </label>
            <input
              type="text"
              placeholder={isStudent ? 'e.g. 21BCE1234' : 'e.g. 10245'}
              value={id}
              onChange={e => { setId(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setError(''); setGenericMsg(''); }}
              required
              disabled={isLoading}
              className="w-full h-11 px-3.5 bg-[#E5DDC6]/30/60 border border-[#E5DDC6] focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm uppercase transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#101A24]">Registered Email Address</label>
            <input
              type="email"
              placeholder="e.g. yourname@University.in"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); setGenericMsg(''); }}
              required
              disabled={isLoading}
              className="w-full h-11 px-3.5 bg-[#E5DDC6]/30/60 border border-[#E5DDC6] focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !id.trim() || !email.trim()}
            className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code...</> : 'Send Verification Code'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5DDC6]/60 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-[#101A24] hover:text-[#101A24] font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
