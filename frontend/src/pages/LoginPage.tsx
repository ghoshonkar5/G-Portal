import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginApi, googleAuthApi } from '../api/authApi'
import { GoogleLogin } from '@react-oauth/google'
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { UniversityLogo } from '../modules/publications/components/UniversityLogo'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [mode, setMode] = useState<'normal' | 'adminGate' | 'adminForm'>('normal')
  const [adminGoogleVerified, setAdminGoogleVerified] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [formData, setFormData] = useState({ facultyId: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const successBanner = location.state?.message || ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setError('')
  }

  const handleLoginResponse = async (res: any, purpose: string = 'login') => {
    if (res.firstLogin) {
      navigate('/first-login')
      return
    }

    if (res.requiresOtp) {
      sessionStorage.setItem('userId', String(res.userId))
      navigate(`/verify-otp?purpose=${purpose}`)
      return
    }

    if (res.token && res.user) {
      await login(res.token, res.user)
      const role = res.user.role
      const completed = res.user.profileCompleted ?? res.user.profile_completed
      if (role === 'admin') {
        navigate('/home')
      } else if (role === 'faculty' && !completed) {
        navigate('/onboarding')
      } else {
        navigate('/home')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.facultyId || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const isAdmin = mode === 'adminForm'
      const res = await loginApi(formData.facultyId, formData.password, isAdmin ? true : undefined)

      if (isAdmin && res.user && res.user.role !== 'admin') {
        setError('This account is not an admin account')
        return
      }

      await handleLoginResponse(res, isAdmin ? 'admin_login' : 'login')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential?: string, purpose: string = 'user_login') => {
    if (!credential) return
    setError('')
    setIsLoading(true)

    try {
      const res = await googleAuthApi({ credential, purpose })

      if (purpose === 'admin_login' || res.adminGate) {
        if (res.googleVerified || res.adminGate) {
          setAdminGoogleVerified(true)
          setAdminEmail(res.email || 'Verified Admin')
          setMode('adminForm')
        }
        return
      }

      await handleLoginResponse(res, purpose)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white bg-gradient-to-br from-[#101A24] via-[#101A24] to-[#16222E]">
        <div className="mb-8">
          <UniversityLogo tone="light" className="scale-150" />
        </div>
        <div className="text-center mt-6">
          <h1 className="text-4xl font-semibold mb-4">University System</h1>
          <p className="text-xl mb-4 text-white/90">Excellence in Education and Research</p>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            One portal for all academic and administrative activities — events, publications, research, and more.
          </p>
          <div className="mt-12 flex justify-center space-x-8">
            {[['50+', 'Years of Excellence'], ['100K+', 'Alumni Worldwide'], ['200+', 'Programs']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-semibold">{val}</div>
                <div className="text-sm text-white/80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white/40">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-3">
              <UniversityLogo tone="dark" className="scale-125" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">University Portal</h1>
            <p className="text-[#101A24] font-medium">G-PORTAL</p>
          </div>

          <div className="w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-slate-200/80">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">Welcome to G-PORTAL</h2>

            {/* Success Banner */}
            {successBanner && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
                <span>{successBanner}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* ── ADMIN GATE MODE ── */}
            {mode === 'adminGate' && (
              <div className="py-6 text-center space-y-6">
                <div className="p-4 bg-[#E5DDC6]/30/80 rounded-xl border border-[#E5DDC6]/80 text-sm text-[#101A24] leading-relaxed">
                  🔒 <strong>Admin verification</strong><br />
                  Sign in with your authorized Google account to continue.
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={res => handleGoogleSuccess(res.credential, 'admin_login')}
                    onError={() => setError('Google verification failed')}
                    theme="outline"
                    size="large"
                    shape="pill"
                    text="continue_with"
                    width="280"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => { setMode('normal'); setError(''); }}
                    className="text-sm text-[#101A24] hover:text-[#101A24] font-medium hover:underline"
                  >
                    ← Back to regular login
                  </button>
                </div>
              </div>
            )}

            {/* ── ADMIN FORM MODE ── */}
            {mode === 'adminForm' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Google verified: <strong>{adminEmail}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('adminGate');
                      setAdminGoogleVerified(false);
                      setAdminEmail('');
                      setFormData({ facultyId: '', password: '' });
                    }}
                    className="text-green-700 hover:underline text-[11px] font-semibold"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800">Admin ID</label>
                  <input
                    name="facultyId"
                    type="text"
                    placeholder="Enter Admin ID"
                    value={formData.facultyId}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-800">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-[#101A24] hover:text-[#101A24] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full h-11 px-3.5 pr-12 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                  ) : (
                    'Sign in as Admin'
                  )}
                </button>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => { setMode('normal'); setError(''); setFormData({ facultyId: '', password: '' }); }}
                    className="text-xs text-[#101A24] hover:text-[#101A24] font-medium hover:underline"
                  >
                    ← Back to regular login
                  </button>
                </div>
              </form>
            )}

            {/* ── NORMAL MODE (Single Page, No Tabs) ── */}
            {mode === 'normal' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800">
                    ID / Registration Number
                  </label>
                  <input
                    name="facultyId"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 10245 or 21BCE1234"
                    value={formData.facultyId}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-800">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-[#101A24] hover:text-[#101A24] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full h-11 px-3.5 pr-12 bg-slate-50/80 border border-slate-200 focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 focus:outline-none rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-md shadow-[#101A24]/20 transition-all"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                  ) : (
                    'Sign in'
                  )}
                </button>

                <div className="pt-4 border-t border-slate-100/80">
                  <div className="relative flex py-2 items-center mb-4">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Or continue with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={res => handleGoogleSuccess(res.credential, 'user_login')}
                      onError={() => setError('Google login failed')}
                      theme="outline"
                      size="medium"
                      shape="pill"
                      text="signin_with"
                      width="280"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-center space-y-3">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">First time logging in?</p>
                    <button
                      type="button"
                      onClick={() => navigate('/first-login')}
                      className="text-sm text-[#101A24] font-semibold hover:underline"
                    >
                      Set up your account →
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100/60">
                    <button
                      type="button"
                      onClick={() => { setMode('adminGate'); setError(''); }}
                      className="text-xs text-[#101A24] hover:text-[#101A24] hover:underline font-medium"
                    >
                      Admin? Sign in with Google →
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Need help? Contact IT Support</p>
            <p className="mt-0.5">Email: <a href="mailto:support@university.edu" className="text-[#101A24] font-medium hover:underline">support@university.edu</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}