// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Shared UI Primitives
// Ported from reference components.jsx → typed TSX with lucide-react
// ═══════════════════════════════════════════════════════════════════

import { type ReactNode, type CSSProperties, useMemo } from 'react';
import {
  FileText, Users, BookOpen, Award, GraduationCap, Flag,
  TrendingUp, Activity, Search, ChevronRight, Bell, LogOut,
  LayoutDashboard, Database, ArrowRight, ArrowLeft, Filter,
  Download, Pencil, Trash2, ExternalLink, Paperclip, Eye,
  Check, X, AlertCircle, Plus, RefreshCw, Upload, FileDown,
  FilePlus, UserPlus, BookPlus, ChevronLeft, SlidersHorizontal,
  LayoutGrid, List, Inbox, Home, type LucideIcon
} from 'lucide-react';

// ── Icon registry ─────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  'file-text': FileText, 'users': Users, 'book-open': BookOpen,
  'award': Award, 'graduation-cap': GraduationCap, 'flag': Flag,
  'trending-up': TrendingUp, 'activity': Activity, 'search': Search,
  'chevron-right': ChevronRight, 'chevron-left': ChevronLeft,
  'bell': Bell, 'log-out': LogOut, 'layout-dashboard': LayoutDashboard,
  'database': Database, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft,
  'filter': Filter, 'download': Download, 'pencil': Pencil,
  'trash-2': Trash2, 'external-link': ExternalLink, 'paperclip': Paperclip,
  'eye': Eye, 'check': Check, 'x': X, 'alert-circle': AlertCircle,
  'plus': Plus, 'refresh-cw': RefreshCw, 'upload': Upload,
  'file-down': FileDown, 'file-plus': FilePlus, 'user-plus': UserPlus,
  'book-plus': BookPlus, 'sliders-horizontal': SlidersHorizontal,
  'layout-grid': LayoutGrid, 'list': List, 'inbox': Inbox, 'home': Home,
};

export function Icon({ name, className = '', size }: {
  name: string; className?: string; size?: number;
}) {
  const LucideComp = ICON_MAP[name];
  if (!LucideComp) return <span className={className} />;
  return <LucideComp className={className} size={size || 16} strokeWidth={1.75} />;
}

// ── University Logo ────────────────────────────────────────────────
export function UniversityLogo({ tone = 'light', className = '' }: {
  tone?: 'light' | 'dark'; className?: string;
}) {
  const isLight = tone === 'light';
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-[#E5DDC6]/30 flex-shrink-0 bg-[#101A24]">
        <img src="/favicon1.jpg" alt="University Logo" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col justify-center">
        <span className={`text-base font-bold tracking-tight leading-none ${
          isLight ? 'text-[#E5DDC6]' : 'text-[#101A24]'
        }`}>
          University
        </span>
        <span className={`text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${
          isLight ? 'text-[#E5DDC6]/80' : 'text-[#101A24]/70'
        }`}>
          Portal
        </span>
      </div>
    </div>
  );
}
export const GitamLogo = UniversityLogo;


// ── Avatar with initials gradient ─────────────────────────────────
export function AdminAvatar({ name, photo, size = 'md' }: {
  name: string; photo?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const dims: Record<string, number> = { sm: 32, md: 40, lg: 56, xl: 72 };
  const px = dims[size] || 40;
  const fs = size === 'xl' ? 20 : size === 'lg' ? 16 : size === 'sm' ? 11 : 13;
  const initials = (name || 'FA')
    .split(' ')
    .filter(w => w && !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const grad = `linear-gradient(135deg, hsl(${(hue + 160) % 360} 28% 32%) 0%, hsl(${(hue + 180) % 360} 38% 22%) 100%)`;

  if (photo) {
    return <img src={photo} alt={name} style={{ width: px, height: px }}
      className="rounded-full object-cover border-2 border-white shadow-card flex-shrink-0" />;
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 shadow-card border-2 border-white"
      style={{ width: px, height: px, fontSize: fs, background: grad, letterSpacing: '0.03em' }}>
      {initials || 'FA'}
    </div>
  );
}

// ── Quartile Pill ─────────────────────────────────────────────────
export function QPill({ q }: { q?: string | null }) {
  if (!q || q === 'N/A') return <span className="q-pill qna">N/A</span>;
  return <span className={`q-pill ${q.toLowerCase()}`}>{q}</span>;
}

// ── Delta Badge ───────────────────────────────────────────────────
export function DeltaBadge({ value, inverted = false }: {
  value?: number | null; inverted?: boolean;
}) {
  if (value == null) return null;
  const isUp = value > 0;
  const cls = value === 0 ? 'flat' : (inverted ? (isUp ? 'down' : 'up') : (isUp ? 'up' : 'down'));
  const arrow = value === 0 ? '–' : isUp ? '▲' : '▼';
  return (
    <span className={`admin-delta ${cls} tnum`}>
      <span style={{ fontSize: 8, marginRight: 1 }}>{arrow}</span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Flag Dot ──────────────────────────────────────────────────────
export function AdminFlagDot({ color = 'red' }: { color?: 'red' | 'amber' }) {
  return <span className={`admin-flag-dot ${color}`} />;
}

// ── Sparkline ─────────────────────────────────────────────────────
export function Sparkline({ data, color = '#101A24', width = 96, height = 32 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - 2 - ((v - min) / range) * (height - 6)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  const gid = useMemo(() => `sp-${Math.random().toString(36).slice(2, 7)}`, []);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} stroke="white" strokeWidth={1.5} />
      )}
    </svg>
  );
}

// ── Segmented Control ─────────────────────────────────────────────
export function Segmented({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: string }[];
}) {
  return (
    <div className="seg">
      {options.map(opt => (
        <button key={opt.value} data-active={value === opt.value ? 'true' : undefined}
          onClick={() => onChange(opt.value)}>
          {opt.icon && <Icon name={opt.icon} className="text-current" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Nav Pill ──────────────────────────────────────────────────────
export function NavPill({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active?: boolean;
  onClick?: () => void; badge?: number | string | null;
}) {
  return (
    <button onClick={onClick}
      className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 whitespace-nowrap hover:bg-white/20 hover:text-white"
      style={
        active
          ? { background: '#ffffff', color: '#101A24', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
          : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }
      }>
      <Icon name={icon} />
      <span>{label}</span>
      {badge != null && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tnum ${active ? 'bg-[#101A24] text-white' : 'bg-white/15 text-white'}`}>{badge}</span>
      )}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────
export function AdminCard({ className = '', children, padded = true, ...rest }: {
  className?: string; children: ReactNode; padded?: boolean;
  [key: string]: any;
}) {
  return (
    <div className={`admin-card relative admin-card-shine overflow-hidden ${padded ? 'p-5' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action, icon }: {
  title: string; subtitle?: string; action?: ReactNode; icon?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-700)]"
            style={{ background: 'rgba(0,107,100,0.08)' }}>
            <Icon name={icon} />
          </div>
        )}
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title, hint }: {
  icon?: string; title: string; hint?: string;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center mb-3">
        <Icon name={icon} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────────
export function AdminSearchInput({ placeholder, value, onChange, className = '' }: {
  placeholder?: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Icon name="search" />
      </span>
      <input className="admin-in" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────
export function StatCard({ label, value, suffix = '', delta, prev, spark, icon, color = '#101A24', accent, inverted = false }: {
  label: string; value: number | string; suffix?: string;
  delta?: number | null; prev?: number | string;
  spark?: number[]; icon: string; color?: string;
  accent?: string; inverted?: boolean;
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <AdminCard padded={false} className="gradient-mesh p-4 sm:p-5 hover:shadow-float transition-shadow duration-200 cursor-default group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-card"
            style={{ background: `linear-gradient(135deg, ${color} 0%, ${accent || color} 100%)` }}>
            <Icon name={icon} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            {prev != null && <p className="text-[10px] text-slate-400 tnum">vs {typeof prev === 'number' ? prev.toLocaleString() : prev} last year</p>}
          </div>
        </div>
        <DeltaBadge value={delta} inverted={inverted} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold text-slate-900 tnum leading-none tracking-tight">
          {display}{suffix}
        </p>
        {spark && spark.length > 0 && <Sparkline data={spark} color={color} width={88} height={32} />}
      </div>
    </AdminCard>
  );
}
