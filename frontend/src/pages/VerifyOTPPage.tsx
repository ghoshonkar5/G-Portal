import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyOtpApi, resendOtpApi } from '../api/authApi'
import { Loader2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'

// ── Reusable 6-Box OTP Input ──────────────────────────────────────────────
export interface OTPInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  onComplete?: (val: string) => void
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  onComplete
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.slice(-1).replace(/[^0-9]/g, '')
    if (!char && e.target.value !== '') return

    const valArr = value.split('')
    while (valArr.length < length) valArr.push('')
    valArr[idx] = char

    const newVal = valArr.join('')
    onChange(newVal)

    if (char && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus()
    }

    if (newVal.length === length && !newVal.includes('') && onComplete) {
      onComplete(newVal)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      if (pasted.length === length && onComplete) {
        onComplete(pasted)
        inputRefs.current[length - 1]?.focus()
      } else {
        inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()
      }
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputRefs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          disabled={disabled}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-[#101A24] transition-all disabled:opacity-50"
        />
      ))}
    </div>
  )
}

// ── Verify OTP Page ───────────────────────────────────────────────────────
export default function VerifyOTPPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const purpose = searchParams.get('purpose') || 'login'
  const userId = sessionStorage.getItem('userId')

  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [cooldown, setCooldown] = useState(60)

  useEffect(() => {
    if (!userId && !sessionStorage.getItem('token') && !localStorage.getItem('token')) {
      navigate('/login', { replace: true })
    }
  }, [userId, navigate])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const purposeHeadings: Record<string, string> = {
    login: 'Verify your login',
    first_login: 'Verify your identity',
    admin_login: 'Admin verification',
    reset: 'Verify to reset password',
    google_login: 'Verify your Google login',
    student_login: 'Verify your Google login',
  }

  const handleVerify = async (submittedOtp: string = otp) => {
    if (submittedOtp.length < 6 || !userId) return
    setError('')
    setSuccessMsg('')
    setIsLoading(true)

    try {
      const res = await verifyOtpApi(userId, submittedOtp, purpose)
      
      if (purpose === 'first_login') {
        if (res.setupToken) {
          sessionStorage.setItem('setupToken', res.setupToken)
          navigate('/first-login?step=set-password')
        }
        return
      }

      if (purpose === 'reset') {
        if (res.resetToken) {
          sessionStorage.setItem('resetToken', res.resetToken)
          navigate('/reset-password')
        }
        return
      }

      // Normal login purposes (login, admin_login, google_login, student_login)
      if (res.token && res.user) {
        await login(res.token, res.user)
        const role = res.user.role
        const completed = res.user.profileCompleted ?? res.user.profile_completed
        if (role === 'faculty' && !completed) {
          navigate('/onboarding')
        } else {
          navigate('/home')
        }
        setTimeout(() => sessionStorage.removeItem('userId'), 500)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !userId) return
    setError('')
    setSuccessMsg('')
    try {
      await resendOtpApi(userId, purpose)
      setCooldown(60)
      setSuccessMsg('A new OTP has been sent to your registered email.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Try again later.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-[#E5DDC6]/60">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#101A24]/10 rounded-2xl flex items-center justify-center text-[#101A24] mx-auto mb-4 border border-[#E5DDC6]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#101A24]">{purposeHeadings[purpose] || 'Verification Required'}</h1>
          <p className="text-sm text-[#101A24] mt-2 leading-relaxed">
            Please enter the 6-digit verification code sent to your registered email address.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6] text-[#101A24] px-4 py-3 rounded-xl text-sm mb-6 text-center">
            {successMsg}
          </div>
        )}

        <div className="space-y-6">
          <OTPInput
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
            onComplete={val => handleVerify(val)}
          />

          <button
            onClick={() => handleVerify(otp)}
            disabled={isLoading || otp.length < 6}
            className="w-full h-12 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying code...</> : 'Verify & Continue'}
          </button>

          <div className="pt-4 border-t border-[#E5DDC6]/60 flex items-center justify-between text-sm">
            <button
              onClick={() => navigate('/login')}
              className="text-[#101A24] hover:text-[#101A24] font-medium flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>

            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-[#101A24] hover:underline disabled:text-gray-400 disabled:no-underline font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cooldown > 0 ? '' : 'hover:rotate-180 transition-transform'}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
