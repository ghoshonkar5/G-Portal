// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Overview Page
// Dashboard with stat cards, charts, flags panel
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from './AdminLayout';
import { AdminCard, StatCard, SectionHeader, Icon, AdminFlagDot, AdminAvatar } from './components/ui-kit';
import { TimeAreaChart, QuartileDonut, FacultyBars, VBarChart } from './components/charts';
import { adminStatsAPI, type OverviewCounts, type TopContributor, type QuartileDistItem, type DeptDistItem } from './api/adminStatsApi';
import { GlobalExportModal } from './components/AdminExportModals';
import type { TimeSeriesData, FacultyBarData } from './components/charts';

// ── Flags Panel ───────────────────────────────────────────────────
function FlagsPanel({ flags, onApprove, onDismiss }: {
  flags: any[];
  onApprove?: (flag: any) => void;
  onDismiss?: (flag: any) => void;
}) {
  const pendingFlags = flags.filter(f => f.status !== 'resolved');

  if (pendingFlags.length === 0) {
    return (
      <AdminCard className="p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
          <Icon name="check" size={20} />
        </div>
        <p className="text-sm font-semibold text-slate-800">All clear!</p>
        <p className="text-xs text-slate-500 mt-1">No pending flags to review</p>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="p-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600" style={{ background: '#fef2f2' }}>
            <Icon name="flag" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Pending flags</h3>
            <p className="text-xs text-slate-500">Awaiting admin review</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-100 tnum">
          {pendingFlags.length} open
        </span>
      </div>
      <div className="divide-y divide-slate-100 scroll-thin overflow-y-auto" style={{ maxHeight: 360 }}>
        {pendingFlags.slice(0, 10).map((f: any) => (
          <div key={f.id} className="px-5 py-3 hover:bg-slate-50/60 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="pt-1 flex-shrink-0">
                <AdminFlagDot color={f.severity === 'critical' ? 'red' : 'amber'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">
                  {f.title || `Flag #${f.id}`}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="admin-chip" style={{ background: '#E5DDC6', color: '#0369a1', borderColor: 'transparent' }}>
                    {f.item_type || 'publication'}
                  </span>
                  <span>·</span>
                  <span className="font-medium text-slate-600">{f.faculty_name || f.flagged_by || 'Unknown'}</span>
                </p>
                {f.reason && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <Icon name="alert-circle" />
                    {f.reason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => onApprove?.(f)} title="Approve"
                  className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Icon name="check" />
                </button>
                <button onClick={() => onDismiss?.(f)} title="Dismiss"
                  className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <Icon name="x" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// ── Overview Page ─────────────────────────────────────────────────
export function AdminOverviewPage() {
  const { allFlags, loadAllData, isLoading: dataLoading } = useAdminData();

  // Stat data from new endpoints
  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesData | null>(null);
  const [quartileDist, setQuartileDist] = useState<QuartileDistItem[]>([]);
  const [topFaculty, setTopFaculty] = useState<TopContributor[]>([]);
  const [deptDist, setDeptDist] = useState<DeptDistItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const [countsRes, tsRes, qRes, topRes, deptRes] = await Promise.all([
          adminStatsAPI.getOverviewCounts(),
          adminStatsAPI.getTimeseries(),
          adminStatsAPI.getQuartileDistribution(),
          adminStatsAPI.getTopContributors(6),
          adminStatsAPI.getDeptDistribution('publications'),
        ]);
        if (countsRes.success) setCounts(countsRes.data);
        if (tsRes.success) setTimeseries(tsRes.data);
        if (qRes.success) setQuartileDist(qRes.data);
        if (topRes.success) setTopFaculty(topRes.data);
        if (deptRes.success) setDeptDist(deptRes.data);
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  // Build sparkline data from timeseries
  const pubSpark = useMemo(() => timeseries?.series[0]?.values.slice(-8) || [], [timeseries]);
  const confSpark = useMemo(() => timeseries?.series[1]?.values.slice(-8) || [], [timeseries]);
  const bookSpark = useMemo(() => timeseries?.series[2]?.values.slice(-8) || [], [timeseries]);

  const pendingFlags = useMemo(() => allFlags.filter(f => f.status !== 'resolved'), [allFlags]);

  const handleApproveFlag = async (flag: any) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flag.id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approvedBy: 'Admin' }),
    });
    await loadAllData();
  };

  const handleDeleteFlag = async (flag: any) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flag.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAllData();
  };

  // Get current date for greeting
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const userName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.name || 'Admin';
    } catch { return 'Admin'; }
  }, []);

  if (statsLoading && dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--brand-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-xs font-semibold text-[var(--brand-700)] uppercase tracking-widest mb-1.5">{dayName} · {dateStr}</p>
        <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">
          Welcome back, {userName.split(' ')[0]}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Here's what's happening across University research today.
          {pendingFlags.length > 0 && (
            <> <span className="text-[var(--brand-700)] font-semibold">{pendingFlags.length} flags</span> need your attention.</>
          )}
        </p>
      </div>

      {/* Stat grid — 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label="Publications" value={counts?.publications || 0}
          spark={pubSpark} icon="file-text" color="#101A24" accent="#0e3c3a" />
        <StatCard label="Q1+Q2 Ratio" value={counts?.q1q2Ratio || 0} suffix="%"
          icon="award" color="#16a34a" accent="#065f46" />
        <StatCard label="Conferences" value={counts?.conferences || 0}
          spark={confSpark} icon="users" color="#2e9686" accent="#055a55" />
        <StatCard label="Books & Chapters" value={counts?.books || 0}
          spark={bookSpark} icon="book-open" color="#f59e0b" accent="#b45309" />
        <StatCard label="Active Faculty" value={counts?.activeFaculty || 0}
          icon="graduation-cap" color="#7c3aed" accent="#4c1d95" />
        <StatCard label="Pending Flags" value={counts?.pendingFlags || 0}
          icon="flag" color="#ef4444" accent="#991b1b" inverted />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Time series (spans 2) */}
        <AdminCard className="xl:col-span-2">
          <SectionHeader icon="trending-up"
            title="Research output over time"
            subtitle="Publications, conferences and books by academic year" />
          {timeseries && <TimeAreaChart data={timeseries} />}
          {!timeseries && <p className="text-sm text-slate-400 py-8 text-center">Loading chart data...</p>}
        </AdminCard>

        {/* Quartile donut */}
        <AdminCard>
          <SectionHeader icon="award"
            title="Quartile distribution"
            subtitle="Publication quality breakdown" />
          {quartileDist.length > 0 && <QuartileDonut data={quartileDist} />}
          {quartileDist.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>}
        </AdminCard>
      </div>

      {/* Second row: top faculty + flags */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top contributors */}
        <AdminCard>
          <SectionHeader icon="graduation-cap"
            title="Top contributing faculty"
            subtitle="By total publication count" />
          {topFaculty.length > 0 && (
            <FacultyBars data={topFaculty.map(f => ({
              name: f.name, dept: f.dept, pubs: f.pubs, q1: f.q1,
            }))} />
          )}
          {topFaculty.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>}
        </AdminCard>

        {/* Flags panel */}
        <FlagsPanel flags={allFlags} onApprove={handleApproveFlag} onDismiss={handleDeleteFlag} />
      </div>

      {/* Department distribution */}
      {deptDist.length > 0 && (
        <AdminCard>
          <SectionHeader icon="database"
            title="Publications by department"
            subtitle="Research output distribution across departments" />
          <VBarChart data={deptDist} height={180} />
        </AdminCard>
      )}

      {/* ── Research Records (recent entries across all types) ──── */}
      <ResearchRecordsSection />
    </div>
  );
}

// ── Research Records mini-table ────────────────────────────────────
function ResearchRecordsSection() {
  const { allPublications, allConferences, allBooksChapters } = useAdminData();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const navigate = useNavigate();

  // Combine all records into a single sorted list
  const recentRecords = useMemo(() => {
    const pubs = allPublications.slice(0, 30).map(p => ({
      id: p.id,
      type: 'Publication' as const,
      title: p.title || '',
      detail: p.journal || '',
      faculty: p.facultyName || '',
      year: p.academicYear || '',
      date: (p as any).createdAt || p.monthYear || '',
    }));
    const confs = allConferences.slice(0, 30).map(c => ({
      id: c.id,
      type: 'Conference' as const,
      title: c.title || '',
      detail: c.conferenceName || '',
      faculty: c.facultyName || '',
      year: c.academicYear || '',
      date: (c as any).createdAt || (c as any).date || '',
    }));
    const books = allBooksChapters.slice(0, 30).map(b => ({
      id: b.id,
      type: 'Book' as const,
      title: b.title || '',
      detail: b.publisher || '',
      faculty: b.facultyName || '',
      year: b.academicYear || '',
      date: (b as any).createdAt || b.monthYear || '',
    }));

    return [...pubs, ...confs, ...books]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 15);
  }, [allPublications, allConferences, allBooksChapters]);

  const typeColors: Record<string, { bg: string; text: string }> = {
    Publication: { bg: '#101A24', text: '#ffffff' },
    Conference: { bg: '#2e9686', text: '#ffffff' },
    Book: { bg: '#f59e0b', text: '#ffffff' },
  };

  return (
    <>
      <AdminCard padded={false} className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-600)]" style={{ background: 'var(--brand-50)' }}>
              <Icon name="database" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Research Records</h3>
              <p className="text-xs text-slate-500">
                Recent entries · {allPublications.length} publications · {allConferences.length} conferences · {allBooksChapters.length} books
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/publications/admin/publications')}
              className="admin-btn admin-btn-soft admin-btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              <Icon name="file-text" size={13} /> Publications
            </button>
            <button
              onClick={() => navigate('/publications/admin/conferences')}
              className="admin-btn admin-btn-soft admin-btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              <Icon name="users" size={13} /> Conferences
            </button>
            <button
              onClick={() => navigate('/publications/admin/books')}
              className="admin-btn admin-btn-soft admin-btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              <Icon name="book-open" size={13} /> Books
            </button>
            <button onClick={() => setIsExportOpen(true)} className="admin-btn admin-btn-soft admin-btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}>
              <Icon name="download" size={13} /> Export All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="admin-thead">Type</th>
                <th className="admin-thead min-w-[280px]">Title</th>
                <th className="admin-thead min-w-[160px]">Journal / Venue</th>
                <th className="admin-thead min-w-[120px]">Faculty</th>
                <th className="admin-thead">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map((r, i) => (
                <tr key={`${r.type}-${r.id}-${i}`} className="t-row">
                  <td className="admin-tcell">
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{
                      backgroundColor: typeColors[r.type]?.bg || '#94a3b8',
                      color: typeColors[r.type]?.text || '#fff',
                    }}>{r.type}</span>
                  </td>
                 <td className="admin-tcell font-medium text-[13px] max-w-[280px]">
  <div className="truncate" title={r.title}>{r.title}</div>
</td>
<td className="admin-tcell text-[12px] text-slate-600 max-w-[160px]">
  <div className="truncate" title={r.detail}>{r.detail}</div>
</td>
                  <td className="admin-tcell text-[12px]">{r.faculty}</td>
                  <td className="admin-tcell text-[12px] tnum">{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentRecords.length === 0 && (
          <div className="py-10 text-center">
            <Icon name="database" />
            <p className="text-sm text-slate-500 mt-2">No research records yet</p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {recentRecords.length} most recent across all types</span>
          <span className="tnum">
            Total: <strong className="text-slate-800">{(allPublications.length + allConferences.length + allBooksChapters.length).toLocaleString()}</strong> records
          </span>
        </div>
      </AdminCard>

      <GlobalExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </>
  );
}

export default AdminOverviewPage;

