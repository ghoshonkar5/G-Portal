import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutAllApi } from '../api/authApi'
import {
  LogOut, User, Calendar, FileText, Trophy, BarChart3, Layers,
  Briefcase, BookOpen, Users, ArrowRight,
  Clock, Shield, Bell, CheckCircle2, MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { UniversityLogo } from '../modules/publications/components/UniversityLogo'

export interface ModuleItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  active: boolean
  path: string
  gradient: string
  borderHover: string
  bgHover: string
  category: 'Academic & Research' | 'Administration' | 'Campus & Career'
}

const getModules = (role: string): ModuleItem[] => {
  if (role === 'admin') {
    return [
      {
        id: 'events',
        title: 'Events Portal',
        description: 'Review, approve, and track all faculty events, workshops, and seminars across University departments.',
        icon: <Calendar className="w-6 h-6" />,
        badge: 'Live',
        active: true,
        path: '/events/admin/dashboard',
        gradient: 'from-[#101A24] to-[#16222E]',
        borderHover: 'hover:border-[#101A24]',
        bgHover: 'group-hover:bg-[#101A24]/10',
        category: 'Administration'
      },
      {
        id: 'publications',
        title: 'Publications Hub',
        description: 'Audit research papers, journal quartiles, Scopus/WoS metrics, and manage compliance flags.',
        icon: <FileText className="w-6 h-6" />,
        badge: 'Live',
        active: true,
        path: '/publications/admin/dashboard',
        gradient: 'from-[#101A24] to-[#16222E]',
        borderHover: 'hover:border-[#101A24]',
        bgHover: 'group-hover:bg-[#101A24]/10',
        category: 'Academic & Research'
      },
      {
        id: 'manage-users',
        title: 'Manage Users',
        description: 'Provision faculty & student accounts, bulk import credentials via CSV, and manage roles.',
        icon: <Users className="w-6 h-6" />,
        badge: 'Admin Only',
        active: true,
        path: '/admin/users',
        gradient: 'from-[#101A24] to-[#16222E]',
        borderHover: 'hover:border-[#101A24]',
        bgHover: 'group-hover:bg-[#101A24]/10',
        category: 'Administration'
      }
    ]
  }

  if (role === 'student') {
    return [
      {
        id: 'achievements',
        title: 'Achievements',
        description: 'Showcase your academic honors, hackathon victories, sports medals, and scholarship awards.',
        icon: <Trophy className="w-6 h-6" />,
        badge: 'Live',
        active: true,
        path: '/achievements',
        gradient: 'from-purple-500 to-indigo-600',
        borderHover: 'hover:border-purple-400',
        bgHover: 'group-hover:bg-purple-500/10',
        category: 'Academic & Research'
      },
      {
        id: 'University-tales',
        title: 'University Tales',
        description: 'Discover campus life articles, inspiring student journeys, creative expressions, and club events.',
        icon: <BookOpen className="w-6 h-6" />,
        badge: 'Community',
        active: false,
        path: '/University-tales',
        gradient: 'from-violet-500 to-fuchsia-600',
        borderHover: 'hover:border-violet-400',
        bgHover: 'group-hover:bg-violet-500/10',
        category: 'Campus & Career'
      },
      {
        id: 'placements',
        title: 'Placements & Career',
        description: 'Access company schedules, interview prep resources, resume builders, and placement tracking.',
        icon: <Briefcase className="w-6 h-6" />,
        badge: 'Live',
        active: true,
        path: '/placements',
        gradient: 'from-[#16222E] to-[#101A24]',
        borderHover: 'hover:border-sky-400',
        bgHover: 'group-hover:bg-sky-500/10',
        category: 'Campus & Career'
      }
    ]
  }

  // Faculty (default)
  return [
    {
      id: 'events',
      title: 'Events Portal',
      description: 'Log and track attended workshops, guest lectures, international conferences, and FDP certifications.',
      icon: <Calendar className="w-6 h-6" />,
      badge: 'Live',
      active: true,
      path: '/events/dashboard',
      gradient: 'from-[#101A24] to-[#16222E]',
      borderHover: 'hover:border-[#101A24]',
      bgHover: 'group-hover:bg-[#101A24]/10',
      category: 'Academic & Research'
    },
    {
      id: 'publications',
      title: 'Publications',
      description: 'Manage journal papers, books, conference proceedings, and auto-sync with Scopus, WoS & Scholar.',
      icon: <FileText className="w-6 h-6" />,
      badge: 'Live',
      active: true,
      path: '/publications/dashboard',
      gradient: 'from-[#101A24] to-[#16222E]',
      borderHover: 'hover:border-[#101A24]',
      bgHover: 'group-hover:bg-[#101A24]/10',
      category: 'Academic & Research'
    }
  ]
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const userRole = user?.role || 'faculty'
  const MODULES = useMemo(() => getModules(userRole), [userRole])

  const handleLogout = async () => {
    try { await logoutAllApi() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const handleModuleClick = (mod: ModuleItem) => {
    if (mod.active) {
      navigate(mod.path)
    } else {
      toast.info(`${mod.title} is coming soon in the upcoming academic update!`, {
        description: 'Our engineering team is actively building and fine-tuning this module.'
      })
    }
  }

  // Time greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  // Dynamic academic year (July–June rule)
  const currentAcademicYear = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() // 0-indexed: 0=Jan, 6=Jul
    return m >= 6 ? `${y}–${y + 1}` : `${y - 1}–${y}`
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#101A24] selection:text-white">

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
                    {userRole === 'admin' ? 'Admin Portal' : userRole === 'student' ? 'Student Portal' : 'Faculty Portal'}
                  </span>
                </div>
                <p className="text-[#BAE6FD] text-[11px] font-medium uppercase tracking-wider opacity-90">
                  University System • Global Campus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-white">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-xs text-[#BAE6FD] capitalize opacity-90">
                  {user?.department ? `${user.department}` : userRole}
                </div>
              </div>
              <div className="w-px h-8 bg-white/20 hidden md:block" />
              <button
                onClick={handleLogout}
                className="text-[#E5DDC6] hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                aria-label="Logout"
                title="Sign out of G-Portal"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Banner Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#101A24] via-[#101A24] to-[#16222E] text-white py-12 px-6 shadow-inner">
        {/* Subtle decorative shapes */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-96 h-96 bg-[#E5DDC6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101A24]/70 backdrop-blur-md border border-[#101A24]/50/30 text-xs font-semibold text-[#E5DDC6] shadow-sm">
              <Calendar className="w-3.5 h-3.5" />
              <span>Academic Year {currentAcademicYear}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {greeting}, {user?.name || 'Welcome'}
            </h2>
            <p className="text-[#E5DDC6] text-sm sm:text-base leading-relaxed font-normal opacity-90">
              {userRole === 'admin'
                ? 'Manage enterprise modules, monitor institutional research output, and provision university users.'
                : userRole === 'student'
                ? 'Track your campus achievements, explore University Tales, and prepare for career placements.'
                : 'Access your research publications, event participations, achievements, and teaching allocations in one unified hub.'}
            </p>
          </div>

          {/* User Profile Card */}
          <div className="bg-[#101A24]/80 backdrop-blur-md border border-[#101A24]/50/20 rounded-2xl p-5 flex items-center gap-4 min-w-[280px] shadow-xl">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-[#101A24]/50/50 shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-[#101A24]/50/50 flex items-center justify-center text-white text-xl font-bold shadow-md">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-white tracking-tight">
                {user?.name || 'Authorized User'}
              </div>
              <div className="text-sm font-medium text-[#E5DDC6] mt-0.5">
                {user?.designation || (userRole === 'student' ? 'Student Scholar' : 'Faculty Member')}
              </div>
              {user?.department && (
                <div className="text-xs text-[#E5DDC6]/80 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[160px]">{user.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Dashboard Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 mt-4 z-20 flex flex-col justify-center">

        {/* Modules Grid */}
        <div className={
          MODULES.length === 2
            ? 'grid grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto gap-8 w-full'
            : MODULES.length === 4
            ? 'grid grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto gap-8 w-full'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-8 w-full'
        }>
          {MODULES.map((mod) => (
            <div
              key={mod.id}
              onClick={() => handleModuleClick(mod)}
              className={`group relative bg-white rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between ${
                mod.active
                  ? `border-gray-200/90 ${mod.borderHover} shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer`
                  : 'border-gray-200/60 bg-gray-50/50 opacity-85 hover:opacity-100 cursor-pointer'
              }`}
            >
              {/* Top Row: Icon & Badge */}
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.gradient} text-white flex items-center justify-center shadow-md shadow-gray-200 group-hover:scale-105 transition-transform duration-300`}>
                    {mod.icon}
                  </div>

                  <span className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full border ${
                    mod.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {mod.badge || (mod.active ? 'Active' : 'Coming Soon')}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className={`text-lg font-bold tracking-tight mb-2 transition-colors ${
                  mod.active ? 'text-gray-900 group-hover:text-[#101A24]' : 'text-gray-700'
                }`}>
                  {mod.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal line-clamp-3">
                  {mod.description}
                </p>
              </div>

              {/* Bottom Row: Action / Status */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-medium">
                  {mod.category}
                </span>

                {mod.active ? (
                  <span className="text-[#101A24] group-hover:text-[#101A24] flex items-center gap-1 transition-transform group-hover:translate-x-1">
                    Open Portal <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> In Development
                  </span>
                )}
              </div>

              {/* Shimmer background on hover */}
              <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-colors duration-300 ${mod.bgHover}`} />
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}