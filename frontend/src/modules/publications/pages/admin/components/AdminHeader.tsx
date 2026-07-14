// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Header + Context Bar
// Updated UI theme (#101A24) matching the rest of the portal navbars
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, UniversityLogo as UniversityLogo, AdminAvatar, NavPill } from './ui-kit';

interface AdminHeaderProps {
  active: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  userName?: string;
  counts?: {
    publications?: number;
    conferences?: number;
    books?: number;
    faculty?: number;
  };
}

export function AdminHeader({ active, onNavigate, onLogout, userName = 'Admin', counts }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (screen: string) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 shadow-md bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Home + Logo + Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/home')}
              title="Back to Portal Home"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              aria-label="Back to Portal Home"
            >
              <Icon name="home" size={16} />
              <span className="hidden sm:inline">Home</span>
            </button>

            <div className="hidden sm:block w-px h-6 bg-white/20" />

            <UniversityLogo tone="light" />

            <div className="hidden xl:block ml-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base leading-tight tracking-wide text-white">RESEARCH ADMIN</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-[#BAE6FD] px-2 py-0.5 rounded">Admin</span>
              </div>
              <p className="text-[#BAE6FD] text-[10px] font-medium uppercase tracking-wider opacity-90">Publications Portal</p>
            </div>
          </div>

          {/* Center / Desktop Navigation — Sleek subtle scrollbar when overflowing */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto navbar-scrollbar py-1 mx-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.25) transparent' }}>
            <NavPill icon="layout-dashboard" label="Overview"
              active={active === 'overview'} onClick={() => handleNavClick('overview')} />
            <NavPill icon="graduation-cap" label="Faculty"
              active={active === 'faculty'} onClick={() => handleNavClick('faculty')}
              badge={counts?.faculty} />
            <NavPill icon="file-text" label="Publications"
              active={active === 'publications'} onClick={() => handleNavClick('publications')}
              badge={counts?.publications} />
            <NavPill icon="users" label="Conferences"
              active={active === 'conferences'} onClick={() => handleNavClick('conferences')}
              badge={counts?.conferences} />
            <NavPill icon="book-open" label="Books"
              active={active === 'books'} onClick={() => handleNavClick('books')}
              badge={counts?.books} />
            <NavPill icon="upload" label="Upload Data"
              active={active === 'upload-data'} onClick={() => handleNavClick('upload-data')} />
          </nav>

          {/* Right: Mobile Menu + User Info + Logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-white leading-tight">{userName}</div>
                <div className="text-xs text-[#BAE6FD] opacity-90">System Administrator</div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-white/90 hover:text-white p-2"
            >
              <Icon name="menu" size={24} />
            </button>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-[#BAE6FD] hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0"
              aria-label="Logout"
            >
              <Icon name="log-out" size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Dropdown Drawer (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/15 bg-[#0D4036] px-5 py-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5 mb-4">
            <NavPill icon="layout-dashboard" label="Overview"
              active={active === 'overview'} onClick={() => handleNavClick('overview')} />
            <NavPill icon="graduation-cap" label="Faculty Directory"
              active={active === 'faculty'} onClick={() => handleNavClick('faculty')}
              badge={counts?.faculty} />
            <NavPill icon="file-text" label="Publications"
              active={active === 'publications'} onClick={() => handleNavClick('publications')}
              badge={counts?.publications} />
            <NavPill icon="users" label="Conferences"
              active={active === 'conferences'} onClick={() => handleNavClick('conferences')}
              badge={counts?.conferences} />
            <NavPill icon="book-open" label="Books & Chapters"
              active={active === 'books'} onClick={() => handleNavClick('books')}
              badge={counts?.books} />
            <NavPill icon="upload" label="Upload Data"
              active={active === 'upload-data'} onClick={() => handleNavClick('upload-data')} />
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-xl mb-2">
              <AdminAvatar name={userName} size="md" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{userName}</div>
                <p className="text-[10px] text-[#101A24]">System Administrator</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-xs"
            >
              <Icon name="home" />
              <span>Portal Home</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Context Bar (breadcrumb + status) ─────────────────────────────
export function ContextBar({ active }: { active: string }) {
  const navMeta: Record<string, { crumb: string[]; status: string }> = {
    'overview':      { crumb: ['University Research', 'Admin', 'Overview'],           status: '◐ Live' },
    'faculty':       { crumb: ['University Research', 'Admin', 'Faculty Directory'],  status: '◐ Cached' },
    'publications':  { crumb: ['University Research', 'Admin', 'Publications'],       status: '◐ Live' },
    'conferences':   { crumb: ['University Research', 'Admin', 'Conferences'],        status: '◐ Live' },
    'books':         { crumb: ['University Research', 'Admin', 'Books & Chapters'],   status: '◐ Live' },
    'upload-data':   { crumb: ['University Research', 'Admin', 'Upload Data'],        status: '◐ Ready' },
  };
  const t = navMeta[active] || navMeta['overview'];

  return (
    <div className="border-b border-white/10" style={{ backgroundColor: '#101A24' }}>
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-[11px] text-white/80">
        <div className="flex items-center gap-1.5">
          {t.crumb.map((c, i) => (
            <span key={i}>
              <span className={i === t.crumb.length - 1 ? 'text-white font-semibold' : ''}>{c}</span>
              {i < t.crumb.length - 1 && <span className="mx-1.5 opacity-60">›</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            {t.status}
          </span>
        </div>
      </div>
    </div>
  );
}
