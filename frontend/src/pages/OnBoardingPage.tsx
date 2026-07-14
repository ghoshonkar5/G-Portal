import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { onboardingApi } from '../api/authApi'
import { Loader2, X, Plus, AlertTriangle, User, BookOpen, Link } from 'lucide-react'
import { UniversityLogo } from '../modules/publications/components/UniversityLogo'

// ── Constants ─────────────────────────────────────────────
const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Chemical Engineering',
  'Biotechnology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Management Studies',
  'Other'
]

const DESIGNATIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Senior Professor',
  'Professor Emeritus',
  'Visiting Faculty',
  'Adjunct Faculty'
]

// ── TagInput component ────────────────────────────────────
const TagInput = ({
  label, tags, setTags, placeholder
}: {
  label: string
  tags: string[]
  setTags: (tags: string[]) => void
  placeholder: string
}) => {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#101A24]">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="min-h-11 px-3 py-2 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] rounded-lg flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 bg-[#101A24] text-white text-xs px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(i)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-32">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={addTag}
            className="text-[#101A24] hover:text-[#101A24] flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-[#101A24]/80">Press Enter or click + to add</p>
    </div>
  )
}
// ── Compress and resize image to max 200x200, max ~150KB ─────────
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image must be under 5MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let { width, height } = img;
        
        // Center-crop to square logic
        const min = Math.min(width, height);
        const sx = (width - min) / 2;
        const sy = (height - min) / 2;
        
        canvas.width = MAX;
        canvas.height = MAX;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, MAX, MAX);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        if (base64.length > 200000) {
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// ── URL Modal ─────────────────────────────────────────────
const UrlModal = ({
  onFillNow, onSkip
}: {
  onFillNow: () => void
  onSkip: () => void
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Missing Research Profile Links</h3>
          <p className="text-sm text-gray-600">
            Without your Google Scholar, Scopus, or Web of Science profile links, we won't be able to
            automatically sync and fetch your publications in the Publications module.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You can always add these later from the Publications module settings.
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onFillNow}
          className="flex-1 h-10 border border-[#101A24] text-[#101A24] rounded-lg text-sm font-medium hover:bg-[#E5DDC6]/30 transition-colors"
        >
          Fill Now
        </button>
        <button
          onClick={onSkip}
          className="flex-1 h-10 bg-[#101A24] hover:bg-[#16222E] text-white rounded-lg text-sm font-medium transition-colors"
        >
          Skip for Now
        </button>
      </div>
    </div>
  </div>
)

// ── Main page ─────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const urlSectionRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)

  // Tier 1
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [mobile, setMobile] = useState('')
  const [officeRoom, setOfficeRoom] = useState('')
  const [yearsExp, setYearsExp] = useState('')
  const [researchAreas, setResearchAreas] = useState<string[]>([])
  const [coursesTaught, setCoursesTaught] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [photo, setPhoto] = useState<string>('')

  // Tier 2
  const [scholarUrl, setScholarUrl] = useState('')
  const [scopusUrl1, setScopusUrl1] = useState('')
  const [scopusUrl2, setScopusUrl2] = useState('')
  const [scopusUrl3, setScopusUrl3] = useState('')
  const [wosUrl1, setWosUrl1] = useState('')
  const [wosUrl2, setWosUrl2] = useState('')
  const [wosUrl3, setWosUrl3] = useState('')

  useEffect(() => {
    if (user) {
      if (user.department && !department) setDepartment(user.department)
      if (user.designation && !designation) setDesignation(user.designation)
      if (user.mobile && !mobile) setMobile(user.mobile)
      if (user.officeRoom && !officeRoom) setOfficeRoom(user.officeRoom)
      if (user.yearsOfExperience !== undefined && user.yearsOfExperience !== null && !yearsExp) setYearsExp(String(user.yearsOfExperience))
      if (user.researchArea && researchAreas.length === 0) setResearchAreas(user.researchArea.split(',').map(s => s.trim()).filter(Boolean))
      if (user.coursesTaught && coursesTaught.length === 0) setCoursesTaught(user.coursesTaught.split(',').map(s => s.trim()).filter(Boolean))
      if (user.roles && roles.length === 0) setRoles(user.roles.split(',').map(s => s.trim()).filter(Boolean))
      if (user.googleScholarUrl && !scholarUrl) setScholarUrl(user.googleScholarUrl)
      if (user.scopusUrl && !scopusUrl1) setScopusUrl1(user.scopusUrl)
      if (user.scopusUrl2 && !scopusUrl2) setScopusUrl2(user.scopusUrl2)
      if (user.scopusUrl3 && !scopusUrl3) setScopusUrl3(user.scopusUrl3)
      if (user.wosUrl && !wosUrl1) setWosUrl1(user.wosUrl)
      if (user.wosUrl2 && !wosUrl2) setWosUrl2(user.wosUrl2)
      if (user.wosUrl3 && !wosUrl3) setWosUrl3(user.wosUrl3)
    }
  }, [user])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed)
  }

  const validateTier1 = (): string => {
    if (!department) return 'Please select a department'
    if (!designation) return 'Please select a designation'
    if (!mobile) return 'Please enter your mobile number'
    if (!/^[6-9]\d{9}$/.test(mobile)) return 'Mobile must be a valid 10-digit Indian number'
    if (!officeRoom) return 'Please enter your office room'
    if (!yearsExp) return 'Please enter years of experience'
    const y = parseInt(yearsExp)
    if (isNaN(y) || y < 0 || y > 50) return 'Years of experience must be between 0 and 50'
    if (researchAreas.length === 0) return 'Please add at least one research area'
    if (coursesTaught.length === 0) return 'Please add at least one course taught'
    if (roles.length === 0) return 'Please add at least one role or responsibility'
    if (!photo) return 'Please upload a profile photo'
    return ''
  }

  const hasTier2 = () => scholarUrl || scopusUrl1 || wosUrl1

  const submitForm = async () => {
    setIsLoading(true)
    setError('')
    try {
      const payload = {
        department,
        designation,
        mobile,
        office_room: officeRoom,
        years_of_experience: yearsExp,
        research_area: researchAreas.join(', '),
        courses_taught: coursesTaught.join(', '),
        roles: roles.join(', '),
        profile_photo: photo,
        google_scholar_url: scholarUrl || undefined,
        scopus_url: scopusUrl1 || undefined,
        scopus_url_2: scopusUrl2 || undefined,
        scopus_url_3: scopusUrl3 || undefined,
        wos_url: wosUrl1 || undefined,
        wos_url_2: wosUrl2 || undefined,
        wos_url_3: wosUrl3 || undefined,
      }

      const res = await onboardingApi(payload)
      await login(res.token, res.user)
      navigate('/home')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const err = validateTier1()
    if (err) { setError(err); return }
    if (!hasTier2()) {
      setShowUrlModal(true)
      return
    }
    await submitForm()
  }

  const handleFillNow = () => {
    setShowUrlModal(false)
    urlSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => {
      const input = urlSectionRef.current?.querySelector('input')
      input?.focus()
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-[#101A24] selection:text-white pb-12">
      {showUrlModal && (
        <UrlModal onFillNow={handleFillNow} onSkip={() => { setShowUrlModal(false); submitForm() }} />
      )}

      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-50 shadow-sm border-b border-white/10 bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <UniversityLogo tone="light" />
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg leading-tight tracking-wide text-white">G-PORTAL</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-[#E5DDC6] px-2 py-0.5 rounded">
                    Onboarding
                  </span>
                </div>
                <p className="text-[#BAE6FD] text-[11px] font-medium uppercase tracking-wider opacity-90">
                  Required before accessing portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden md:block text-right">
                  <div className="text-sm font-semibold text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-[#BAE6FD] opacity-90">
                    Welcome to G-PORTAL
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#101A24] via-[#101A24] to-[#16222E] text-white py-10 px-6 shadow-inner mb-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Complete Your Profile</h2>
          <p className="text-[#E5DDC6] text-sm opacity-90">Please provide your academic and professional details to get started.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Section 1 — Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#E5DDC6]/60/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E5DDC6]/300"></div>
            <h2 className="text-lg font-semibold text-[#101A24] border-b border-[#E5DDC6]/40 pb-3 flex items-center gap-2">
              <span className="bg-[#E5DDC6]/30 text-[#101A24] p-1.5 rounded-lg"><User className="w-5 h-5" /></span>
              Basic Information
            </h2>

            {/* Photo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Profile Photo <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                {photo
                  ? <img src={photo} className="w-20 h-20 rounded-full object-cover border-2 border-[#E5DDC6]" />
                  : <div className="w-20 h-20 rounded-full bg-[#E5DDC6]/50 flex items-center justify-center text-[#101A24]/70 text-2xl font-bold">?</div>
                }
                <div>
                  <label className="cursor-pointer inline-block px-4 py-2 bg-[#E5DDC6]/30 border border-[#E5DDC6] text-[#101A24] text-sm rounded-lg hover:bg-[#E5DDC6]/50 transition-colors">
                    Choose Photo
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <p className="text-xs text-[#101A24]/80 mt-1">Auto-compressed to 200×200px</p>
                </div>
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm"
              >
                <option value="">Select designation...</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm"
              />
            </div>

            {/* Office Room */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Office Room <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. A-101"
                value={officeRoom}
                onChange={e => setOfficeRoom(e.target.value)}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm"
              />
            </div>

            {/* Years of Experience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">
                Years of Experience <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 5"
                value={yearsExp}
                onChange={e => setYearsExp(e.target.value)}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Section 2 — Academic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#E5DDC6]/60/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E5DDC6]/300"></div>
            <h2 className="text-lg font-semibold text-[#101A24] border-b border-[#E5DDC6]/40 pb-3 flex items-center gap-2">
              <span className="bg-[#E5DDC6]/30 text-[#101A24] p-1.5 rounded-lg"><BookOpen className="w-5 h-5" /></span>
              Academic Information
            </h2>
            <TagInput label="Research Areas" tags={researchAreas} setTags={setResearchAreas} placeholder="e.g. Machine Learning" />
            <TagInput label="Courses Taught" tags={coursesTaught} setTags={setCoursesTaught} placeholder="e.g. Data Structures" />
            <TagInput label="Roles & Responsibilities" tags={roles} setTags={setRoles} placeholder="e.g. Class Advisor" />
          </div>

          {/* Section 3 — Research Profiles */}
          <div ref={urlSectionRef} className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#E5DDC6]/60/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E5DDC6]/300"></div>
            <div className="border-b border-[#E5DDC6]/40 pb-3">
              <h2 className="text-lg font-semibold text-[#101A24] flex items-center gap-2">
                <span className="bg-[#E5DDC6]/30 text-[#101A24] p-1.5 rounded-lg"><Link className="w-5 h-5" /></span>
                Research Profile Links
              </h2>
              <p className="text-xs text-[#101A24]/80 mt-1 ml-9">Optional but recommended — enables automatic publication sync</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#101A24]">Google Scholar URL</label>
              <input type="url" placeholder="https://scholar.google.com/citations?user=..." value={scholarUrl} onChange={e => setScholarUrl(e.target.value)}
                className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm" />
            </div>

            {[
              { label: 'Scopus URL 1', val: scopusUrl1, set: setScopusUrl1 },
              { label: 'Scopus URL 2', val: scopusUrl2, set: setScopusUrl2 },
              { label: 'Scopus URL 3', val: scopusUrl3, set: setScopusUrl3 },
            ].map(f => (
              <div key={f.label} className="space-y-2">
                <label className="text-sm font-medium text-[#101A24]">{f.label}</label>
                <input type="url" placeholder="https://www.scopus.com/authid/..." value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm" />
              </div>
            ))}

            {[
              { label: 'Web of Science URL 1', val: wosUrl1, set: setWosUrl1 },
              { label: 'Web of Science URL 2', val: wosUrl2, set: setWosUrl2 },
              { label: 'Web of Science URL 3', val: wosUrl3, set: setWosUrl3 },
            ].map(f => (
              <div key={f.label} className="space-y-2">
                <label className="text-sm font-medium text-[#101A24]">{f.label}</label>
                <input type="url" placeholder="https://www.webofscience.com/wos/author/..." value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 focus:outline-none rounded-lg text-sm" />
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center transition-colors shadow-md shadow-[#101A24]/20"
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving profile...</>
              : 'Complete Setup & Enter G-PORTAL'
            }
          </button>
        </form>
      </div>
    </div>
  )
}