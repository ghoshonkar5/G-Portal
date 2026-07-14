
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UniversityLogo } from '../../components/UniversityLogo';
import { useAuth } from '../../../../context/AuthContext';
import {
  ArrowLeft, Flag, CheckCircle, Clock, AlertCircle,
  FileText, Users, BookOpen, RefreshCw, ChevronDown,
  AlertTriangle, Info, RotateCcw, X
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FlagRecord {
  id: number;
  item_type: 'publication' | 'conference' | 'book';
  item_id: number;
  reason: string;
  flagged_at: string;
  flagged_by: string;
  status: 'flagged' | 'pending_review' | 'resolved';
  faculty_note?: string;
  resolved_at?: string;
  approved_at?: string;
  item_title: string;
  reflag_count?: number;
}

interface PotentialFlagRecord {
  id: number;
  publication_id: number;
  missing_fields: string[];
  status: 'open' | 'resolved' | 'escalated';
  faculty_note?: string;
  created_at: string;
  resolved_at?: string;
  title: string;
  journal?: string;
  month_year?: string;
  academic_year?: string;
}

type ActiveTab = 'flags' | 'potential';
type StatusFilter = 'all' | 'action' | 'waiting' | 'resolved';
type TypeFilter   = 'all' | 'publication' | 'conference' | 'book';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FlagStatusBadge({ status }: { status: string }) {
  if (status === 'flagged') return (
    <span style={badge('#fee2e2', '#b91c1c')}>
      <Dot color="#ef4444" /> Action Needed
    </span>
  );
  if (status === 'pending_review') return (
    <span style={badge('#fef3c7', '#92400e')}>
      <Dot color="#f59e0b" /> Waiting Review
    </span>
  );
  if (status === 'resolved') return (
    <span style={badge('#dcfce7', '#166534')}>
      <CheckCircle style={{ width: 11, height: 11 }} /> Resolved
    </span>
  );
  return null;
}

function PotentialStatusBadge({ status }: { status: string }) {
  if (status === 'open') return (
    <span style={badge('#fef3c7', '#92400e')}>
      <Dot color="#f59e0b" /> Action Needed
    </span>
  );
  if (status === 'resolved') return (
    <span style={badge('#dcfce7', '#166534')}>
      <CheckCircle style={{ width: 11, height: 11 }} /> Resolved
    </span>
  );
  if (status === 'escalated') return (
    <span style={badge('#fce7f3', '#9d174d')}>
      <AlertTriangle style={{ width: 11, height: 11 }} /> Escalated
    </span>
  );
  return null;
}

function TypeChip({ type }: { type: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    publication: { label: 'Publication', bg: '#eff6ff', color: '#16222E' },
    conference:  { label: 'Conference',  bg: '#f0fdf4', color: '#166534' },
    book:        { label: 'Book/Chapter', bg: '#faf5ff', color: '#7e22ce' },
  };
  const cfg = map[type] || { label: type, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color,
      padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color,
      display: 'inline-block', flexShrink: 0, animation: 'flagBlink 1.2s infinite' }} />
  );
}

function badge(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 700, backgroundColor: bg, color,
    padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Flag History Expander (inline previous cycles)
// ─────────────────────────────────────────────────────────────────────────────

function FlagCycleHistory({ flagId }: { flagId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = async () => {
    if (history.length > 0) { setExpanded(true); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/flags/${flagId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } finally {
      setLoading(false);
      setExpanded(true);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      {!expanded ? (
        <button onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
            fontWeight: 600, color: '#b45309', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0 }}>
          <RotateCcw style={{ width: 12, height: 12 }} />
          {loading ? 'Loading history…' : 'View previous flag cycles'}
          <ChevronDown style={{ width: 11, height: 11 }} />
        </button>
      ) : (
        <div style={{ borderRadius: 8, border: '1px solid #fed7aa', overflow: 'hidden' }}>
          <button onClick={() => setExpanded(false)}
            style={{ width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 11,
              fontWeight: 700, display: 'flex', justifyContent: 'space-between',
              backgroundColor: '#fff7ed', color: '#c2410c', border: 'none', cursor: 'pointer' }}>
            <span>📋 {history.length} previous cycle{history.length !== 1 ? 's' : ''}</span>
            <span>▲</span>
          </button>
          {history.map((h, i) => (
            <div key={h.id} style={{ padding: '10px 12px', backgroundColor: 'white',
              borderTop: i > 0 ? '1px solid #fff7ed' : 'none' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>
                Round {i + 1}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ backgroundColor: '#fff7ed', borderRadius: 6, padding: '5px 8px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 2 }}>Admin reason:</p>
                  <p style={{ fontSize: 11, color: '#374151' }}>{h.reason}</p>
                </div>
                {h.faculty_note && (
                  <div style={{ backgroundColor: '#f0fdf4', borderRadius: 6, padding: '5px 8px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 2 }}>Your response:</p>
                    <p style={{ fontSize: 11, color: '#374151' }}>{h.faculty_note}</p>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>
                {fmtDate(h.reflagged_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Actual Flag Card
// ─────────────────────────────────────────────────────────────────────────────

function FlagCard({ flag }: { flag: FlagRecord }) {
  const accentMap: Record<string, string> = {
    flagged: '#ef4444', pending_review: '#f59e0b', resolved: '#22c55e',
  };
  const bgMap: Record<string, string> = {
    flagged: '#fff5f5', pending_review: '#fffbeb', resolved: '#f0fdf4',
  };
  const borderMap: Record<string, string> = {
    flagged: '#fca5a5', pending_review: '#fcd34d', resolved: '#86efac',
  };

  const accent = accentMap[flag.status] || '#9ca3af';
  const bg     = bgMap[flag.status]     || '#f9fafb';
  const border = borderMap[flag.status] || '#e5e7eb';

  return (
    <div style={{ display: 'flex', borderRadius: 14, border: `1px solid ${border}`,
      backgroundColor: bg, overflow: 'hidden', marginBottom: 12 }}>

      {/* Accent bar */}
      <div style={{ width: 4, flexShrink: 0, backgroundColor: accent }} />

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <TypeChip type={flag.item_type} />
              {flag.reflag_count && flag.reflag_count > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c',
                  backgroundColor: '#ffedd5', border: '1px solid #fed7aa',
                  padding: '2px 8px', borderRadius: 999 }}>
                  🔁 Reflagged {flag.reflag_count}×
                </span>
              ) : null}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
              {flag.item_title}
            </p>
          </div>
          <FlagStatusBadge status={flag.status} />
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Reason flagged
          </p>
          <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '8px 10px',
            border: '1px solid #e5e7eb', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
            {flag.reason}
          </div>
        </div>

        {/* Faculty note (if submitted) */}
        {flag.faculty_note && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Your response
            </p>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: '8px 10px',
              border: '1px solid #bbf7d0', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
              {flag.faculty_note}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 8 }}>
          <TimelineItem icon={<Flag style={{ width: 11, height: 11 }} />}
            label="Flagged" value={fmtDateTime(flag.flagged_at)} color="#dc2626" />
          {flag.resolved_at && (
            <TimelineItem icon={<CheckCircle style={{ width: 11, height: 11 }} />}
              label="Submitted" value={fmtDateTime(flag.resolved_at)} color="#d97706" />
          )}
          {flag.approved_at && (
            <TimelineItem icon={<CheckCircle style={{ width: 11, height: 11 }} />}
              label="Approved" value={fmtDateTime(flag.approved_at)} color="#16a34a" />
          )}
        </div>

        {/* Previous cycles */}
        {flag.reflag_count && flag.reflag_count > 0 ? (
          <FlagCycleHistory flagId={flag.id} />
        ) : null}

        {/* Pending notice */}
        {flag.status === 'pending_review' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
            backgroundColor: '#fef3c7', borderRadius: 8, padding: '8px 10px' }}>
            <Clock style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#92400e', fontWeight: 500, margin: 0 }}>
              Your resolution is submitted and awaiting admin approval.
            </p>
          </div>
        )}

        {/* Flagged notice */}
        {flag.status === 'flagged' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
            backgroundColor: '#fee2e2', borderRadius: 8, padding: '8px 10px' }}>
            <AlertCircle style={{ width: 13, height: 13, color: '#dc2626', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#991b1b', fontWeight: 500, margin: 0 }}>
              This item needs your attention. Go to the relevant page to resolve it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Potential Flag Card
// ─────────────────────────────────────────────────────────────────────────────

function PotentialFlagCard({ pf }: { pf: PotentialFlagRecord }) {
  const bgMap: Record<string, string> = {
    open: '#fffbeb', resolved: '#f0fdf4', escalated: '#fdf4ff',
  };
  const borderMap: Record<string, string> = {
    open: '#fcd34d', resolved: '#86efac', escalated: '#e9d5ff',
  };
  const accentMap: Record<string, string> = {
    open: '#f59e0b', resolved: '#22c55e', escalated: '#a855f7',
  };

  return (
    <div style={{ display: 'flex', borderRadius: 14,
      border: `1px solid ${borderMap[pf.status] || '#e5e7eb'}`,
      backgroundColor: bgMap[pf.status] || '#f9fafb', overflow: 'hidden', marginBottom: 12 }}>

      <div style={{ width: 4, flexShrink: 0, backgroundColor: accentMap[pf.status] || '#9ca3af' }} />

      <div style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              <TypeChip type="publication" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
              {pf.title}
            </p>
            {pf.journal && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{pf.journal}</p>
            )}
          </div>
          <PotentialStatusBadge status={pf.status} />
        </div>

        {/* Missing fields */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Missing fields detected
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pf.missing_fields.map(f => (
              <span key={f} style={{ fontSize: 11, fontWeight: 600,
                backgroundColor: pf.status === 'resolved' ? '#f0fdf4' : '#fff7ed',
                color: pf.status === 'resolved' ? '#166534' : '#b45309',
                border: `1px solid ${pf.status === 'resolved' ? '#bbf7d0' : '#fde68a'}`,
                padding: '3px 10px', borderRadius: 999,
                textDecoration: pf.status === 'resolved' ? 'line-through' : 'none' }}>
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Faculty note if resolved */}
        {pf.faculty_note && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              What you fixed
            </p>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: '8px 10px',
              border: '1px solid #bbf7d0', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
              {pf.faculty_note}
            </div>
          </div>
        )}

        {/* Escalated notice */}
        {pf.status === 'escalated' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
            backgroundColor: '#fdf4ff', borderRadius: 8, padding: '8px 10px',
            border: '1px solid #e9d5ff' }}>
            <Info style={{ width: 13, height: 13, color: '#a855f7', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#7e22ce', fontWeight: 500, margin: 0 }}>
              Admin converted this into a formal flag for further review.
            </p>
          </div>
        )}

        {/* Timeline */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 8 }}>
          <TimelineItem icon={<AlertTriangle style={{ width: 11, height: 11 }} />}
            label="Detected" value={fmtDateTime(pf.created_at)} color="#d97706" />
          {pf.resolved_at && (
            <TimelineItem icon={<CheckCircle style={{ width: 11, height: 11 }} />}
              label="Resolved" value={fmtDateTime(pf.resolved_at)} color="#16a34a" />
          )}
        </div>

        {/* Open notice */}
        {pf.status === 'open' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
            backgroundColor: '#fef3c7', borderRadius: 8, padding: '8px 10px' }}>
            <AlertCircle style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#92400e', fontWeight: 500, margin: 0 }}>
              Go to Publications and fill in the missing fields to resolve this.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline item (inline metadata)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineItem({ icon, label, value, color }:
  { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>{label}:</span>
      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ value, label, sublabel, bg, color }:
  { value: number; label: string; sublabel?: string; bg: string; color: string }) {
  return (
    <div style={{ borderRadius: 14, padding: '16px 18px', backgroundColor: bg,
      border: '1px solid transparent', flex: '1 1 0', minWidth: 100, textAlign: 'center' }}>
      <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color, marginTop: 2, opacity: 0.85 }}>{label}</p>
      {sublabel && <p style={{ fontSize: 10, color, marginTop: 1, opacity: 0.6 }}>{sublabel}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter pill button
// ─────────────────────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick, count }:
  { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        border: active ? '2px solid #101A24' : '1.5px solid #d1d5db',
        backgroundColor: active ? '#101A24' : 'white',
        color: active ? 'white' : '#374151',
        cursor: 'pointer', transition: 'all 0.15s',
      }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
          borderRadius: '50%', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', padding: '0 4px',
          backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
          color: active ? 'white' : '#6b7280',
        }}>{count}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%',
        backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 14px' }}>
        <CheckCircle style={{ width: 26, height: 26, color: '#101A24' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>
        {message}
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
        Nothing to show for the current filter combination.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function FlagHistoryPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const authToken   = localStorage.getItem('token') || '';

  // ── Data ──────────────────────────────────────────────────────────────────
  const [flags,          setFlags]          = useState<FlagRecord[]>([]);
  const [potentialFlags, setPotentialFlags] = useState<PotentialFlagRecord[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [lastRefresh,    setLastRefresh]    = useState<Date | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<ActiveTab>('flags');
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all');
  const [typeFilter,     setTypeFilter]     = useState<TypeFilter>('all');

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.facultyId) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user?.facultyId) return;
    setLoading(true);
    setError('');
    try {
      const [flagsRes, potentialRes] = await Promise.all([
        fetch(`/api/flags/faculty/${user.facultyId}/history`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`/api/potential-flags/faculty/${user.facultyId}/history`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const [flagsJson, potentialJson] = await Promise.all([
        flagsRes.json(), potentialRes.json(),
      ]);

      if (flagsJson.success)    setFlags(flagsJson.data || []);
      if (potentialJson.success) setPotentialFlags(potentialJson.data || []);
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load flag history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Computed counts ───────────────────────────────────────────────────────
  const flagCounts = {
    all:     flags.length,
    action:  flags.filter(f => f.status === 'flagged').length,
    waiting: flags.filter(f => f.status === 'pending_review').length,
    resolved:flags.filter(f => f.status === 'resolved').length,
  };

  const potCounts = {
    all:     potentialFlags.length,
    action:  potentialFlags.filter(p => p.status === 'open').length,
    waiting: 0,
    resolved:potentialFlags.filter(p => p.status === 'resolved' || p.status === 'escalated').length,
  };

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredFlags = flags.filter(f => {
    const statusOk =
      statusFilter === 'all'      ? true :
      statusFilter === 'action'   ? f.status === 'flagged' :
      statusFilter === 'waiting'  ? f.status === 'pending_review' :
      statusFilter === 'resolved' ? f.status === 'resolved' : true;

    const typeOk =
      typeFilter === 'all' ? true : f.item_type === typeFilter;

    return statusOk && typeOk;
  });

  const filteredPotential = potentialFlags.filter(p => {
    const statusOk =
      statusFilter === 'all'      ? true :
      statusFilter === 'action'   ? p.status === 'open' :
      statusFilter === 'resolved' ? (p.status === 'resolved' || p.status === 'escalated') :
      statusFilter === 'waiting'  ? false : true;

    // Potential flags are always publications, so type filter respected
    const typeOk = typeFilter === 'all' || typeFilter === 'publication';

    return statusOk && typeOk;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Stats for header cards
  // ─────────────────────────────────────────────────────────────────────────
  const totalActive =
    flags.filter(f => f.status !== 'resolved').length +
    potentialFlags.filter(p => p.status === 'open').length;

  const totalResolved =
    flags.filter(f => f.status === 'resolved').length +
    potentialFlags.filter(p => p.status === 'resolved' || p.status === 'escalated').length;

  const totalWaiting  = flags.filter(f => f.status === 'pending_review').length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'rgb(240,253,250)' }}>

      {/* ── Styles ── */}
      <style>{`
        @keyframes flagBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ backgroundColor: '#101A24', borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24, position: 'relative', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>

            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => navigate('/publications/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                <ArrowLeft style={{ width: 16, height: 16 }} /> Back
              </button>
              <div style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <UniversityLogo className="w-8 h-8" />
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>
                  Flag History
                </h1>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  All your flags across publications, conferences &amp; books
                </p>
              </div>
            </div>

            {/* Right */}
            <button onClick={loadAll} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600,
                color: 'white', backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                padding: '6px 14px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1 }}>
              <RefreshCw style={{ width: 14, height: 14,
                animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>{error}</p>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none',
              border: 'none', cursor: 'pointer', color: '#dc2626' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* ── Summary stats ── */}
        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatCard value={flags.length + potentialFlags.length} label="Total Flags"
              sublabel="all time" bg="#E6F5F4" color="#101A24" />
            <StatCard value={totalActive} label="Need Action"
              sublabel="unresolved" bg="#fee2e2" color="#b91c1c" />
            <StatCard value={totalWaiting} label="Awaiting Admin"
              sublabel="submitted by you" bg="#fef3c7" color="#92400e" />
            <StatCard value={totalResolved} label="Resolved"
              sublabel="all approved" bg="#dcfce7" color="#166534" />
            <StatCard value={potentialFlags.length} label="Potential Flags"
              sublabel="missing fields" bg="#faf5ff" color="#7e22ce" />
          </div>
        )}

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20,
          borderBottom: '2px solid #e5e7eb' }}>
          {(['flags', 'potential'] as ActiveTab[]).map(tab => {
            const isActive = activeTab === tab;
            const label    = tab === 'flags' ? 'Actual Flags' : 'Potential Flags';
            const count    = tab === 'flags' ? flags.length : potentialFlags.length;
            const hasAlert = tab === 'flags' ? flagCounts.action > 0 : potCounts.action > 0;
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setStatusFilter('all'); setTypeFilter('all'); }}
                style={{
                  padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  color: isActive ? '#101A24' : '#6b7280',
                  borderBottom: isActive ? '3px solid #101A24' : '3px solid transparent',
                  marginBottom: -2, background: 'none', border: 'none',
                  borderBottomStyle: 'solid',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'color 0.15s',
                }}>
                {label}
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  backgroundColor: hasAlert ? '#fee2e2' : '#e5e7eb',
                  color: hasAlert ? '#b91c1c' : '#6b7280',
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Filter row ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 12, marginBottom: 20 }}>

          {/* Status filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
            <FilterPill label="All"          active={statusFilter === 'all'}      onClick={() => setStatusFilter('all')}
              count={activeTab === 'flags' ? flagCounts.all : potCounts.all} />
            <FilterPill label="Action Needed" active={statusFilter === 'action'}  onClick={() => setStatusFilter('action')}
              count={activeTab === 'flags' ? flagCounts.action : potCounts.action} />
            {activeTab === 'flags' && (
              <FilterPill label="Waiting Review" active={statusFilter === 'waiting'} onClick={() => setStatusFilter('waiting')}
                count={flagCounts.waiting} />
            )}
            <FilterPill label="Resolved"    active={statusFilter === 'resolved'}  onClick={() => setStatusFilter('resolved')}
              count={activeTab === 'flags' ? flagCounts.resolved : potCounts.resolved} />
          </div>

          {/* Divider */}
          {activeTab === 'flags' && (
            <div style={{ width: 1, height: 22, backgroundColor: '#e5e7eb' }} />
          )}

          {/* Type filters — only for actual flags */}
          {activeTab === 'flags' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
              {(['all', 'publication', 'conference', 'book'] as TypeFilter[]).map(t => (
                <FilterPill key={t}
                  label={t === 'all' ? 'All' : t === 'book' ? 'Books' :
                    t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  count={t === 'all' ? flags.length : flags.filter(f => f.item_type === t).length}
                />
              ))}
            </div>
          )}

          {/* Results count */}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
            {activeTab === 'flags'
              ? `${filteredFlags.length} flag${filteredFlags.length !== 1 ? 's' : ''}`
              : `${filteredPotential.length} potential flag${filteredPotential.length !== 1 ? 's' : ''}`
            } shown
          </div>
        </div>

        {/* Last refresh */}
        {lastRefresh && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
            Last updated: {fmtDateTime(lastRefresh.toISOString())}
          </p>
        )}

        {/* ── Content ── */}
        {loading ? (
          <LoadingState />
        ) : activeTab === 'flags' ? (
          filteredFlags.length === 0 ? (
            <EmptyState message={
              statusFilter === 'all' && typeFilter === 'all'
                ? 'No flags found — great work!'
                : 'No flags match the current filters'
            } />
          ) : (
            <div>
              {/* Group by type if type filter is 'all' */}
              {typeFilter === 'all' ? (
                <>
                  {(['publication', 'conference', 'book'] as const).map(type => {
                    const group = filteredFlags.filter(f => f.item_type === type);
                    if (group.length === 0) return null;
                    const icons: Record<string, React.ReactNode> = {
                      publication: <FileText style={{ width: 15, height: 15, color: '#16222E' }} />,
                      conference:  <Users    style={{ width: 15, height: 15, color: '#166534' }} />,
                      book:        <BookOpen style={{ width: 15, height: 15, color: '#7e22ce' }} />,
                    };
                    const labels: Record<string, string> = {
                      publication: 'Publications',
                      conference:  'Conferences',
                      book:        'Books & Chapters',
                    };
                    return (
                      <div key={type} style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8,
                            backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {icons[type]}
                          </div>
                          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                            {labels[type]}
                          </h3>
                          <span style={{ fontSize: 11, fontWeight: 600,
                            backgroundColor: '#e5e7eb', color: '#6b7280',
                            padding: '2px 8px', borderRadius: 999 }}>
                            {group.length}
                          </span>
                        </div>
                        {group.map(f => <FlagCard key={f.id} flag={f} />)}
                      </div>
                    );
                  })}
                </>
              ) : (
                filteredFlags.map(f => <FlagCard key={f.id} flag={f} />)
              )}
            </div>
          )
        ) : (
          /* Potential flags tab */
          filteredPotential.length === 0 ? (
            <EmptyState message={
              statusFilter === 'all'
                ? 'No potential flags found'
                : 'No potential flags match the current filters'
            } />
          ) : (
            <div>
              {/* Info banner */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <Info style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: '0 0 3px' }}>
                    About potential flags
                  </p>
                  <p style={{ fontSize: 12, color: '#b45309', margin: 0, lineHeight: 1.5 }}>
                    These are auto-detected when publications are imported with missing required fields
                    (title, journal, or month/year). Edit the publication to fill the missing fields,
                    then submit your fix. The system verifies the fields are filled before marking resolved.
                  </p>
                </div>
              </div>
              {filteredPotential.map(p => <PotentialFlagCard key={p.id} pf={p} />)}
            </div>
          )
        )}

        {/* ── Navigate shortcuts ── */}
        {!loading && (
          <div style={{ marginTop: 32, padding: '16px 20px', backgroundColor: 'white',
            borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, margin: '0 0 12px' }}>
              Go to
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Publications', icon: <FileText style={{ width: 14, height: 14 }} />, path: '/publications/publications' },
                { label: 'Conferences',  icon: <Users    style={{ width: 14, height: 14 }} />, path: '/publications/conferences'  },
                { label: 'Books',        icon: <BookOpen style={{ width: 14, height: 14 }} />, path: '/publications/books'        },
                { label: 'Dashboard',    icon: <ArrowLeft style={{ width: 14, height: 14 }} />, path: '/publications/dashboard'  },
              ].map(({ label, icon, path }) => (
                <button key={path} onClick={() => navigate(path)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontSize: 13, fontWeight: 600, color: '#101A24',
                    backgroundColor: '#E6F5F4', border: '1.5px solid #b2e0db',
                    borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ borderRadius: 14, border: '1px solid #e5e7eb',
          backgroundColor: 'white', overflow: 'hidden', display: 'flex', height: 110 }}>
          <div style={{ width: 4, backgroundColor: '#e5e7eb' }} />
          <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ height: 13, width: '55%', borderRadius: 6,
                backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: 22, width: 90, borderRadius: 999,
                backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ height: 11, width: '80%', borderRadius: 6,
              backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 11, width: '40%', borderRadius: 6,
              backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default FlagHistoryPage;