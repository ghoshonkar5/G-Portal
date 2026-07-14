import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { checkFirstLoginIdApi, verifyOtpApi, resendOtpApi, setFirstLoginPasswordApi } from '../api/authApi'
import { OTPInput } from './VerifyOTPPage'
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { UniversityLogo } from '../modules/publications/components/UniversityLogo'

export default function FirstLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [facultyId, setFacultyId] = useState('')
  const [userId, setUserId] = useState<string | number>('')
  
  // Step 2 OTP states
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Step 3 Password states
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    new: false, confirm: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (searchParams.get('step') === 'set-password' && sessionStorage.getItem('setupToken')) {
      setStep(3)
    }
  }, [searchParams])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // ── STEP 1: Verify ID ──────────────────────────────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanId = facultyId.trim().replace(/[^a-zA-Z0-9]/g, '')
    if (!cleanId) { setError('Please enter a valid ID'); return }
    
    setIsLoading(true)
    try {
      const res = await checkFirstLoginIdApi(cleanId)
      setUserId(res.userId)
      sessionStorage.setItem('userId', String(res.userId))

      if (res.skipOtp) {
        sessionStorage.setItem('skipOtpUserId', String(res.userId))
        setStep(3)
      } else {
        setCooldown(60)
        setStep(2)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'ID not recognized or already initialized')
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 2: Verify OTP ─────────────────────────────────────────────────
  const handleStep2 = async (submittedOtp: string = otp) => {
    if (submittedOtp.length < 6 || !userId) return
    setError('')
    setIsLoading(true)

    try {
      const res = await verifyOtpApi(userId, submittedOtp, 'first_login')
      if (res.setupToken) {
        sessionStorage.setItem('setupToken', res.setupToken)
        setStep(3)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0 || !userId) return
    setError('')
    try {
      await resendOtpApi(userId, 'first_login')
      setCooldown(60)
      setSuccess('A new OTP has been sent to your registered email.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  // ── STEP 3: Set Password ───────────────────────────────────────────────
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required')
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

    setIsLoading(true)
    try {
      const setupToken = sessionStorage.getItem('setupToken') || undefined
      const skipOtpUserId = sessionStorage.getItem('skipOtpUserId') || undefined
      const skipOtp = !!skipOtpUserId

      const res = await setFirstLoginPasswordApi(
        formData.newPassword,
        formData.confirmPassword,
        setupToken,
        skipOtpUserId || userId,
        skipOtp
      )

      setSuccess('Account initialized successfully! Logging you in...')
      sessionStorage.removeItem('setupToken')
      sessionStorage.removeItem('skipOtpUserId')
      sessionStorage.removeItem('userId')

      if (res.token && res.user) {
        await login(res.token, res.user)
        setTimeout(() => {
          const completed = res.user.profileCompleted ?? res.user.profile_completed
          if (!completed && res.user.role === 'faculty') {
            navigate('/onboarding')
          } else {
            navigate('/home')
          }
        }, 1500)
      } else {
        setTimeout(() => navigate('/login'), 1500)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (field: keyof typeof showPasswords) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white bg-gradient-to-br from-[#101A24] via-[#101A24] to-[#16222E]">
        <div className="mb-8">
          <UniversityLogo tone="light" className="scale-150" />
        </div>
        <div className="text-center mt-6">
          <h1 className="text-4xl font-semibold mb-4">First Time Setup</h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Welcome to G-PORTAL. Verify your identity and set up a secure password to activate your portal account.
          </p>
          <div className="mt-10 space-y-4 text-left max-w-sm">
            {[
              ['1', 'Enter your Faculty ID or Registration Number'],
              ['2', 'Verify the 6-digit OTP sent to your email'],
              ['3', 'Set your secure permanent password'],
              ['4', 'Complete your profile and explore the portal'],
            ].map(([num, text]) => (
              <div key={num} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {num}
                </div>
                <p className="text-white/90 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white/40">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-3">
              <UniversityLogo tone="dark" className="scale-125" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">First Time Setup</h1>
          </div>

          <div className="w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-slate-200/80">
            {/* 3-Step Indicator */}
            <div className="flex items-center justify-between mb-8 px-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s
                      ? 'bg-[#101A24] text-white shadow-md shadow-[#101A24]/30'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {s}
                  </div>
                  <span className={`ml-2 text-xs font-medium hidden sm:inline ${step >= s ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s === 1 ? 'Verify ID' : s === 2 ? 'Verify OTP' : 'Set Password'}
                  </span>
                  {s < 3 && <div className={`h-0.5 w-6 sm:w-10 mx-2 sm:mx-4 ${step > s ? 'bg-[#101A24]' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-6 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Step 1: Verify ID */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Enter your ID</h2>
                  <p className="text-xs text-[#101A24] mt-1">We will check if your account is ready for activation.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Faculty ID / Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 10245 or 21BCE1234"
                    value={facultyId}
                    onChange={e => { setFacultyId(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setError('') }}
                    required
                    disabled={isLoading}
                    className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm uppercase transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !facultyId.trim()}
                  className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
                >
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking ID...</> : 'Continue to Verification'}
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-[#E5DDC6]/30 rounded-full flex items-center justify-center text-[#101A24] mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Email Verification</h2>
                  <p className="text-xs text-[#101A24] mt-1">Enter the 6-digit code sent to your registered email.</p>
                </div>

                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  onComplete={val => handleStep2(val)}
                />

                <button
                  onClick={() => handleStep2(otp)}
                  disabled={isLoading || otp.length < 6}
                  className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
                >
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying code...</> : 'Verify & Continue'}
                </button>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    onClick={() => setStep(1)}
                    className="text-[#101A24] hover:underline font-medium"
                  >
                    ← Change ID
                  </button>
                  <button
                    onClick={handleResendOtp}
                    disabled={cooldown > 0}
                    className="text-[#101A24] hover:underline disabled:text-gray-400 font-medium"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Set Password */}
            {step === 3 && (
              <form onSubmit={handleStep3} className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Create Permanent Password</h2>
                  <p className="text-xs text-[#101A24] mt-1">Your identity is verified. Choose a strong secure password.</p>
                </div>

                {[
                  { key: 'newPassword' as const, label: 'New Password', placeholder: 'Min 8 characters', show: showPasswords.new, toggleKey: 'new' as const },
                  { key: 'confirmPassword' as const, label: 'Confirm New Password', placeholder: '••••••••', show: showPasswords.confirm, toggleKey: 'confirm' as const },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        placeholder={field.placeholder}
                        value={formData[field.key]}
                        onChange={e => { setFormData({ ...formData, [field.key]: e.target.value }); setError('') }}
                        required
                        disabled={isLoading}
                        className="w-full h-11 px-3.5 pr-12 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-slate-900 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => toggle(field.toggleKey)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                      >
                        {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
                >
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating account...</> : 'Set Password & Activate'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-xs sm:text-sm text-[#101A24] hover:underline font-medium"
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}