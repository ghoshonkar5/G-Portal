// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Layout Shell
// Wraps all admin pages with header, context bar, gradient backdrop
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader, ContextBar } from './components/AdminHeader';
import { UniversityLogo } from './components/ui-kit';
import { api } from '../../api/publicationsApi';
import type { Publication, Conference, BookChapter } from '../../utils/mockData';
import './theme.css';

// ── Shared admin data context ─────────────────────────────────────
export interface AdminContextValue {
  isLoading: boolean;
  allPublications: Publication[];
  allConferences: Conference[];
  allBooksChapters: BookChapter[];
  allFlags: any[];
  allPotentialFlags: any[];
  loadAllData: () => Promise<void>;
  flagMap: Record<string, any[]>;
  getItemFlags: (type: string, id: string) => any[];
}

export const AdminContext = createContext<AdminContextValue>({
  isLoading: true,
  allPublications: [],
  allConferences: [],
  allBooksChapters: [],
  allFlags: [],
  allPotentialFlags: [],
  loadAllData: async () => {},
  flagMap: {},
  getItemFlags: () => [],
});

export function useAdminData() {
  return useContext(AdminContext);
}

// ── Route mapping ─────────────────────────────────────────────────
const SCREEN_ROUTES: Record<string, string> = {
  'overview': '/publications/admin/dashboard',
  'faculty': '/publications/admin/faculty',
  'publications': '/publications/admin/publications',
  'conferences': '/publications/admin/conferences',
  'books': '/publications/admin/books',
  'upload-data': '/publications/admin/upload-data',
};

// ── Layout component ──────────────────────────────────────────────
interface AdminLayoutProps {
  screen: string;
  children: ReactNode;
  onLogout: () => void;
}

export function AdminLayout({ screen, children, onLogout }: AdminLayoutProps) {
  const navigate = useNavigate();

  // ── Shared data loading ───────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [allPublications, setAllPublications] = useState<Publication[]>([]);
  const [allConferences, setAllConferences] = useState<Conference[]>([]);
  const [allBooksChapters, setAllBooksChapters] = useState<BookChapter[]>([]);
  const [allFlags, setAllFlags] = useState<any[]>([]);
  const [allPotentialFlags, setAllPotentialFlags] = useState<any[]>([]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const [pubsRes, confsRes, booksRes, flagsRes, potentialFlagsRes] = await Promise.all([
        api.publications.getAll(),
        api.conferences.getAll(),
        api.books.getAll(),
        fetch(`/api/flags`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/potential-flags/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pubsRes.success && pubsRes.data) setAllPublications(pubsRes.data);
      if (confsRes.success && confsRes.data) setAllConferences(confsRes.data);
      if (booksRes.success && booksRes.data) setAllBooksChapters(booksRes.data);

      try {
        const flagsJson = await flagsRes.json();
        if (flagsJson.success) setAllFlags(flagsJson.data || []);
      } catch { /* flags endpoint may not exist */ }

      try {
        const pfJson = await potentialFlagsRes.json();
        if (pfJson.success) setAllPotentialFlags(pfJson.data || []);
      } catch { /* potential-flags endpoint may not exist */ }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Flag lookup map ───────────────────────────────────────────
  const flagMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    allFlags.forEach(flag => {
      const key = `${flag.item_type}_${String(flag.item_id)}`;
      if (!map[key]) map[key] = [];
      map[key].push(flag);
    });
    return map;
  }, [allFlags]);

  const getItemFlags = useCallback((type: string, id: string) => {
    const key = `${type}_${String(id)}`;
    return flagMap[key]?.filter(f => f.status !== 'resolved') || [];
  }, [flagMap]);

  // ── Navigation ────────────────────────────────────────────────
  const handleNavigate = useCallback((s: string) => {
    const path = SCREEN_ROUTES[s];
    if (path) navigate(path);
  }, [navigate]);

  // ── Get user name from localStorage ───────────────────────────
  const userName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.name || 'Admin';
    } catch { return 'Admin'; }
  }, []);

  const facultyCount = useMemo(() => {
    const ids = new Set<string>();
    allPublications.forEach(p => { if (p.facultyId) ids.add(String(p.facultyId)); else if (p.facultyName) ids.add(p.facultyName); });
    allConferences.forEach(c => { if (c.facultyId) ids.add(String(c.facultyId)); else if (c.facultyName) ids.add(c.facultyName); });
    allBooksChapters.forEach(b => { if (b.facultyId) ids.add(String(b.facultyId)); else if (b.facultyName) ids.add(b.facultyName); });
    return ids.size > 0 ? ids.size : undefined;
  }, [allPublications, allConferences, allBooksChapters]);

  const ctxValue: AdminContextValue = {
    isLoading,
    allPublications,
    allConferences,
    allBooksChapters,
    allFlags,
    allPotentialFlags,
    loadAllData,
    flagMap,
    getItemFlags,
  };

  return (
    <AdminContext.Provider value={ctxValue}>
      <div className="min-h-screen font-sans text-slate-800 antialiased">
        {/* Gradient backdrop */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[var(--brand-50)] via-emerald-50/60 to-teal-50/40" />
        <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 12% 18%, #b0e2d9 0%, transparent 35%), radial-gradient(circle at 88% 8%, #cdebe3 0%, transparent 40%), radial-gradient(circle at 50% 100%, #d6f1ec 0%, transparent 45%)',
          }} />

        {/* Header + Context Bar */}
        <AdminHeader
          active={screen}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          userName={userName}
          counts={{
            publications: allPublications.length,
            conferences: allConferences.length,
            books: allBooksChapters.length,
            faculty: facultyCount,
          }}
        />
        <ContextBar active={screen} />

        {/* Main content */}
        <main className="max-w-[1480px] mx-auto px-5 lg:px-8 py-6 lg:py-8">
          {children}
        </main>

      </div>
    </AdminContext.Provider>
  );
}

export default AdminLayout;
