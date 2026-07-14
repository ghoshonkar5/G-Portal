// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Faculty Directory Page
// Grid/list view with search, department filter, detail modal
// Full flag review system (approve, reflag, history) from old code
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useAdminData } from './AdminLayout';
import {
  AdminCard, AdminAvatar, AdminFlagDot, AdminSearchInput,
  Segmented, Icon, EmptyState
} from './components/ui-kit';
import { adminStatsAPI } from './api/adminStatsApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { FlagReviewModal } from '../../components/FlagReviewModal';
import {
  Mail, Phone, MapPin, BookOpen, Globe, GraduationCap,
  Briefcase, FileText, ExternalLink, Edit, Save, X, CheckCircle,
  AlertTriangle, Users, Flag
} from 'lucide-react';

interface FacultyMember {
  id: string;
  facultyId: string;
  facultyProfileId?: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  mobile?: string;
  researchArea?: string;
  officeRoom?: string;
  officeHours?: string;
  coursesTaught?: string;
  roles?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  googleScholarUrl?: string;
  scopusUrl?: string;
  wosUrl?: string;
  yearsOfExperience?: number;
  profilePhoto?: string;
  publicationsCount: number;
  conferencesCount: number;
  booksCount: number;
}

// ── Faculty Card (with flag badge) ───────────────────────────────
function FacultyCard({ f, onOpen, activeFlags, hasPending, onReview }: {
  f: FacultyMember;
  onOpen?: (f: FacultyMember) => void;
  activeFlags: any[];
  hasPending: boolean;
  onReview?: (name: string, flags: any[]) => void;
}) {
  return (
    <button onClick={() => onOpen?.(f)} className="text-left group w-full">
      <AdminCard className="p-5 h-full hover:shadow-float hover:border-[var(--brand-200)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-3 mb-3">
          <AdminAvatar name={f.name} photo={f.profilePhoto} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate group-hover:text-[var(--brand-700)] transition-colors">{f.name}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{f.designation || 'Faculty'}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {f.department && <span className="admin-chip">{f.department}</span>}
              <span className="text-[10px] text-slate-400 font-mono">{f.facultyId}</span>
            </div>
          </div>
        </div>

        {f.researchArea && (
          <p className="text-[11px] text-slate-600 line-clamp-2 mb-3 leading-relaxed border-l-2 border-[var(--brand-100)] pl-2.5">
            {f.researchArea}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900 tnum leading-none">{f.publicationsCount}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Pubs</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-lg font-bold text-slate-900 tnum leading-none">{f.conferencesCount}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Confs</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--brand-700)] tnum leading-none">{f.booksCount}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Books</p>
          </div>
        </div>

        {/* Flag indicator button — opens FlagReviewModal */}
        {activeFlags.length > 0 && onReview ? (
          <div
            onClick={e => { e.stopPropagation(); onReview(f.name, activeFlags); }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <AdminFlagDot color={hasPending ? 'amber' : 'red'} />
            <span className="text-xs font-medium text-red-700">
              {activeFlags.length} flag{activeFlags.length > 1 ? 's' : ''} — click to review
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-emerald-50">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">All clear</span>
          </div>
        )}
      </AdminCard>
    </button>
  );
}

// ── Faculty Detail Modal ──────────────────────────────────────────
function FacultyDetailModal({ faculty, open, onClose, onDeactivate }: {
  faculty: FacultyMember | null; open: boolean; onClose: () => void;
  onDeactivate?: (f: FacultyMember) => void;
}) {
  if (!faculty) return null;

  const links = [
    { url: faculty.googleScholarUrl, label: 'Google Scholar', icon: GraduationCap },
    { url: faculty.scopusUrl, label: 'Scopus', icon: BookOpen },
    { url: faculty.wosUrl, label: 'Web of Science', icon: Globe },
    { url: faculty.linkedinUrl, label: 'LinkedIn', icon: Briefcase },
    { url: faculty.websiteUrl, label: 'Website', icon: Globe },
  ].filter(l => l.url);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-4">
          <AdminAvatar name={faculty.name} photo={faculty.profilePhoto} size="xl" />
          <h2 className="text-xl font-bold text-slate-900 mt-3">{faculty.name}</h2>
          <p className="text-sm text-slate-500">{faculty.designation}</p>
          {faculty.department && <span className="admin-chip mt-2 inline-flex">{faculty.department}</span>}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 tnum">{faculty.publicationsCount}</p>
            <p className="text-xs text-slate-500">Publications</p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-2xl font-bold text-slate-900 tnum">{faculty.conferencesCount}</p>
            <p className="text-xs text-slate-500">Conferences</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 tnum">{faculty.booksCount}</p>
            <p className="text-xs text-slate-500">Books</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2 mb-4">
          {faculty.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{faculty.email}</span>
            </div>
          )}
          {faculty.mobile && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{faculty.mobile}</span>
            </div>
          )}
          {faculty.researchArea && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="text-slate-700">{faculty.researchArea}</span>
            </div>
          )}
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {links.map(l => (
              <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer"
                className="admin-btn admin-btn-ghost admin-btn-sm text-xs">
                <l.icon className="w-3.5 h-3.5" />
                {l.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        {/* Deactivate button */}
        {onDeactivate && (
          <div className="border-t border-slate-100 pt-4 mt-4">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to deactivate ${faculty.name}'s account? This will prevent them from logging in.`)) {
                  onDeactivate(faculty);
                }
              }}
              className="admin-btn admin-btn-sm text-red-600 hover:bg-red-50 border border-red-200 w-full justify-center"
            >
              <AlertTriangle className="w-4 h-4" />
              Deactivate Account
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Faculty Screen ────────────────────────────────────────────────
export function AdminFacultyPage() {
  const { allFlags, loadAllData } = useAdminData();

  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [view, setView] = useState('grid');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);

  // ── Flag Review state ──────────────────────────────────────────
  const [reviewFaculty, setReviewFaculty] = useState<{ name: string; flags: any[] } | null>(null);

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/auth/faculty', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.success && json.data) {
        setFaculty(json.data);
      }
    } catch (error) {
      console.error('Failed to load faculty:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFaculty(); }, []);

  // ── Build flagsPerFaculty map ──────────────────────────────────
  const flagsPerFaculty = useMemo(() => {
    const map: Record<string, any[]> = {};
    allFlags.forEach(flag => {
      const code = flag.faculty_code || flag.facultyCode || flag.faculty_id;
      if (!code) return;
      if (!map[code]) map[code] = [];
      map[code].push(flag);
    });
    return map;
  }, [allFlags]);

  const depts = useMemo(() => {
    const set = new Set(faculty.map(f => f.department).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [faculty]);

  const rows = useMemo(() => faculty.filter(f => {
    const t = search.toLowerCase();
    const matchesSearch = !t ||
      f.name.toLowerCase().includes(t) ||
      (f.researchArea || '').toLowerCase().includes(t) ||
      (f.department || '').toLowerCase().includes(t) ||
      (f.email || '').toLowerCase().includes(t);
    return matchesSearch && (dept === 'all' || f.department === dept);
  }), [faculty, search, dept]);

  const handleDeactivate = async (f: FacultyMember) => {
    const id = f.facultyProfileId || f.id;
    const res = await adminStatsAPI.deactivateFaculty(id);
    if (res.success) {
      setSelectedFaculty(null);
      await loadFaculty();
    } else {
      alert(res.message || 'Failed to deactivate');
    }
  };

  // ── Flag handlers (full approve/reflag/delete) ─────────────────
  const handleApproveFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approvedBy: 'Admin' }),
    });
    await loadAllData();
    setReviewFaculty(prev =>
      prev ? { ...prev, flags: prev.flags.map(f => f.id === flagId ? { ...f, status: 'resolved' } : f) } : null
    );
  };

  const handleApproveAll = async (flagIds: number[]) => {
    for (const id of flagIds) await handleApproveFlag(id);
  };

  const handleDeleteFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAllData();
  };

  const openFlagReview = (name: string, flags: any[]) => {
    setReviewFaculty({ name, flags });
  };

  // ── Helper: get flags for a faculty member ─────────────────────
  const getFacultyFlags = (f: FacultyMember) => {
    const flags = flagsPerFaculty[f.facultyId] || [];
    const active = flags.filter((fl: any) => fl.status !== 'resolved');
    const hasPending = active.some((fl: any) => fl.status === 'pending_review');
    return { allFlags: flags, activeFlags: active, hasPending };
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-[var(--brand-700)] uppercase tracking-widest mb-1.5">Directory</p>
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Faculty</h2>
          <p className="text-sm text-slate-600 mt-1">
            {faculty.length} researchers across {new Set(faculty.map(f => f.department).filter(Boolean)).size} departments
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <AdminCard padded={false} className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AdminSearchInput value={search} onChange={setSearch}
            placeholder="Search by name, research area, department…" className="flex-1 min-w-[260px]" />
          <select value={dept} onChange={e => setDept(e.target.value)}
            className="admin-in w-auto" style={{ paddingLeft: 12 }}>
            {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>)}
          </select>
          <Segmented value={view} onChange={setView} options={[
            { value: 'grid', label: 'Grid', icon: 'layout-grid' },
            { value: 'list', label: 'List', icon: 'list' },
          ]} />
          <div className="text-xs text-slate-500 tnum">
            <span className="font-semibold text-slate-800">{rows.length}</span> shown
          </div>
        </div>
      </AdminCard>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-3 border-[var(--brand-600)] border-t-transparent rounded-full" />
        </div>
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map(f => {
            const { activeFlags, hasPending } = getFacultyFlags(f);
            return (
              <FacultyCard
                key={f.id || f.facultyId}
                f={f}
                onOpen={setSelectedFaculty}
                activeFlags={activeFlags}
                hasPending={hasPending}
                onReview={openFlagReview}
              />
            );
          })}
          {rows.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon="users" title="No faculty found" hint="Try adjusting your search or filters" />
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && (
        <AdminCard padded={false} className="overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="admin-thead">Faculty</th>
                  <th className="admin-thead">Department</th>
                  <th className="admin-thead">Designation</th>
                  <th className="admin-thead">Research area</th>
                  <th className="admin-thead text-right">Pubs</th>
                  <th className="admin-thead text-right">Confs</th>
                  <th className="admin-thead text-right">Books</th>
                  <th className="admin-thead text-center">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(f => {
                  const { activeFlags, hasPending } = getFacultyFlags(f);
                  return (
                    <tr key={f.id || f.facultyId} className="t-row cursor-pointer" onClick={() => setSelectedFaculty(f)}>
                      <td className="admin-tcell">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar name={f.name} photo={f.profilePhoto} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900 text-[13px]">{f.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{f.facultyId} · {f.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="admin-tcell"><span className="admin-chip">{f.department || '—'}</span></td>
                      <td className="admin-tcell text-slate-700 text-[12px]">{f.designation || '—'}</td>
                      <td className="admin-tcell text-slate-600 text-[12px] max-w-[260px] line-clamp-1">{f.researchArea || '—'}</td>
                      <td className="admin-tcell text-right tnum font-semibold text-slate-800">{f.publicationsCount}</td>
                      <td className="admin-tcell text-right tnum text-slate-700">{f.conferencesCount}</td>
                      <td className="admin-tcell text-right tnum text-slate-700">{f.booksCount}</td>
                      <td className="admin-tcell text-center">
                        {activeFlags.length > 0 ? (
                          <button
                            onClick={e => { e.stopPropagation(); openFlagReview(f.name, flagsPerFaculty[f.facultyId] || []); }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <AdminFlagDot color={hasPending ? 'amber' : 'red'} />
                            <span className="text-xs font-medium text-red-700">{activeFlags.length}</span>
                          </button>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Detail modal */}
      <FacultyDetailModal
        faculty={selectedFaculty}
        open={!!selectedFaculty}
        onClose={() => setSelectedFaculty(null)}
        onDeactivate={handleDeactivate}
      />

      {/* Flag Review Modal — full approve / reflag / history */}
      <FlagReviewModal
        isOpen={!!reviewFaculty}
        onClose={() => setReviewFaculty(null)}
        facultyName={reviewFaculty?.name || ''}
        flags={reviewFaculty?.flags || []}
        onApprove={handleApproveFlag}
        onApproveAll={handleApproveAll}
        onDelete={handleDeleteFlag}
        onRefresh={loadAllData}
      />
    </div>
  );
}

export default AdminFacultyPage;
