import { LogOut, Home } from 'lucide-react'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavbarProps {
  isAdmin?: boolean
}

export default function Navbar({ isAdmin = false }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const roleLabel = isAdmin || user?.role === 'admin' 
    ? 'Admin' 
    : user?.role === 'student' 
    ? 'Student' 
    : 'Faculty'

  let portalTitle = 'G-PORTAL'
  let portalSubtitle = `${roleLabel} Portal`

  if (location.pathname.startsWith('/achievements')) {
    portalTitle = 'ACHIEVEMENTS PORTAL'
    portalSubtitle = `${roleLabel} Achievements & Recognition`
  } else if (location.pathname.startsWith('/placements')) {
    portalTitle = 'PLACEMENTS PORTAL'
    portalSubtitle = `${roleLabel} Placement Prep & Experiences`
  } else if (location.pathname.startsWith('/events')) {
    portalTitle = 'EVENTS PORTAL'
    portalSubtitle = `${roleLabel} Event Management System`
  } else if (location.pathname.startsWith('/publications')) {
    portalTitle = 'RESEARCH PORTAL'
    portalSubtitle = `${roleLabel} Research & Publications`
  }

  return (
    <nav className="sticky top-0 z-50 shadow-md bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            {/* ← Home button */}
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
              aria-label="Back to Home"
            >
              <Home size={16} />
              <span className="hidden sm:inline">Home</span>
            </button>

            <div className="w-px h-6 bg-white/20" />

            {/* Module links */}
            <NavLink to="/achievements"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${isActive ? 'text-white bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10'}`
              }>
              Achievements
            </NavLink>

            {!isAdmin && user?.role !== 'admin' && (
              <>
                <div className="w-px h-6 bg-white/20" />

                <NavLink to="/placements"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${isActive ? 'text-white bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10'}`
                  }>
                  Placements
                </NavLink>
              </>
            )}

            <div className="w-px h-6 bg-white/20" />

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg leading-tight tracking-wide text-white">{portalTitle}</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-[#E5DDC6] px-2 py-0.5 rounded">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-[#BAE6FD] text-[11px] font-medium uppercase tracking-wider opacity-90">
                  {portalSubtitle} • University System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-sm font-semibold text-white">
                {isAdmin ? 'Admin User' : user?.name || 'Authorized User'}
              </div>
              <div className="text-xs text-[#E3D4B1] opacity-90 capitalize">
                {isAdmin ? 'System Administrator' : [user?.faculty_id || user?.UniversityId || roleLabel, user?.department || user?.branch].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="w-px h-8 bg-white/20 hidden md:block" />
            <button
              onClick={logout}
              className="text-[#E3D4B1] hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}