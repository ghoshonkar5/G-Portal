import { useState } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import {
  RefreshCw, Check, X, ArrowUpRight, ExternalLink,
  BookOpen, Loader2, ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API_BASE_URL = '/api';
const getToken = () => localStorage.getItem('token');
const DAILY_FETCH_LIMIT = 100;

const getScholarRateLimit = (facultyId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(`scholar_fetch_limit_${facultyId}`);
  if (!raw) return { count: 0, date: today };
  const parsed = JSON.parse(raw);
  return parsed.date !== today ? { count: 0, date: today } : parsed;
};
const incrementScholarRateLimit = (facultyId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const current = getScholarRateLimit(facultyId);
  const next = { date: today, count: current.count + 1 };
  localStorage.setItem(`scholar_fetch_limit_${facultyId}`, JSON.stringify(next));
  return next;
};

interface ScrapedPublication {
  title: string; journal: string; authors: string; citations: number;
  year: string; monthYear: string; academicYear: string;
  volume: string; issue: string; startPage: string; lastPage: string;
  doi: string; link: string; apaFormat: string; indexing: string;
  source: string; selected?: boolean;
}
interface SimilarityFlag {
  imported: ScrapedPublication; skipped: ScrapedPublication;
  reason: string; similarity: number;
}
interface ScholarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (similarityReport?: SimilarityFlag[]) => void;
}

// ─── V1 Design System (mirrors ScopusSyncModal) ───────────────────────────────
const V1Styles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap');

    .scholar-v1 {
      --teal: #0F5C58; --amber: #B08A3E; --amber-soft: #F2EADA; --paper: #FBF8F1;
      --ink: #1A1F1E; --ink-2: #3D4744; --ink-3: #6B7572; --ink-4: #98A09D;
      --rule: #D9D2C0; --rule-2: #E8E2D2; --rose: #8B3A2F; --rose-soft: #F4E4DE;
      font-family: 'Inter Tight', system-ui, sans-serif;
      background: var(--paper); color: var(--ink);
    }
    .dark .scholar-v1 {
      --teal: #4DB8B0; --amber: #D4A855; --amber-soft: #2A2116; --paper: #1A1916;
      --ink: #F0EDE6; --ink-2: #C8C3BB; --ink-3: #8A857E; --ink-4: #504C48;
      --rule: #2E2C28; --rule-2: #3A3630; --rose: #E07070; --rose-soft: #2A1515;
    }

    .scholar-v1 .serif { font-family: 'Source Serif 4', Georgia, serif; }
    .scholar-v1 .mono  { font-family: 'JetBrains Mono', monospace; }

    .scholar-v1 .v-rule { width: 1px; background: var(--rule); align-self: stretch; }
    .scholar-v1 .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

    .scholar-v1 .btn { transition: all 0.15s ease; cursor: pointer; }
    .scholar-v1 .btn:hover:not(:disabled) { transform: translateY(-1px); }
    .scholar-v1 .btn:active:not(:disabled) { transform: translateY(0); }
    .scholar-v1 .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    .scholar-v1 .scroll::-webkit-scrollbar { width: 6px; }
    .scholar-v1 .scroll::-webkit-scrollbar-track { background: transparent; }
    .scholar-v1 .scroll::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 4px; }
    .scholar-v1 .scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }

    .scholar-v1 input[type="checkbox"].sq {
      appearance: none; -webkit-appearance: none;
      width: 14px; height: 14px; border: 1px solid var(--ink-4);
      border-radius: 2px; background: var(--paper); cursor: pointer;
      position: relative; flex-shrink: 0; margin: 0;
    }
    .scholar-v1 input[type="checkbox"].sq:checked { background: var(--teal); border-color: var(--teal); }
    .scholar-v1 input[type="checkbox"].sq:checked::after {
      content: ""; position: absolute; left: 4px; top: 1px;
      width: 4px; height: 8px; border: solid var(--paper);
      border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
    }

    @keyframes barShift { 0% { background-position: 0 0; } 100% { background-position: 32px 0; } }
    .scholar-v1 .shimmer-bar { height: 4px; border-radius: 0; overflow: hidden; background: var(--rule-2); position: relative; }
    .scholar-v1 .shimmer-bar > i {
      position: absolute; inset: 0;
      background: repeating-linear-gradient(45deg, var(--teal) 0 6px, var(--ink-3) 6px 12px);
      background-size: 32px 4px; animation: barShift 1.2s linear infinite; width: 100%;
    }

    .scholar-v1 .usage-bar-track { height: 4px; background: var(--rule-2); border-radius: 0; overflow: hidden; }
    .scholar-v1 .usage-bar-fill  { height: 100%; transition: width 0.7s ease; }
  ` }} />
);

const MonoLabel = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)', textTransform: 'uppercase', ...style }}>
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export function ScholarSyncModal({ isOpen, onClose, onImportComplete }: ScholarSyncModalProps) {
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [step, setStep] = useState<'idle' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const [previews, setPreviews] = useState<ScrapedPublication[]>([]);
  const [similarityReport, setSimilarityReport] = useState<SimilarityFlag[]>([]);
  const [importStats, setImportStats] = useState({ imported: 0, skipped: 0, duration: '0.0s' });

  const [fetchCount, setFetchCount] = useState(() =>
    facultyId ? getScholarRateLimit(facultyId).count : 0
  );

  const attemptsLeft = DAILY_FETCH_LIMIT - fetchCount;
  const limitReached = fetchCount >= DAILY_FETCH_LIMIT;
  const usagePct = Math.min((fetchCount / DAILY_FETCH_LIMIT) * 100, 100);
  const usageColor = limitReached
    ? 'linear-gradient(90deg,#f87171,#ef4444)'
    : fetchCount >= 70
    ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
    : 'linear-gradient(90deg,#34d399,#10b981)';

  const selectedCount = previews.filter(p => p.selected).length;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const fetchPreview = async () => {
    if (!facultyId) return;
    if (limitReached) { setErrorMsg(`Daily fetch limit of ${DAILY_FETCH_LIMIT} reached. Try again tomorrow.`); setStep('error'); return; }
    setLoadingFetch(true); setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/scholar/preview/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.success) { setErrorMsg(data.message || 'Failed to fetch from Google Scholar'); setStep('error'); return; }
      if (data.count === 0) { setErrorMsg('No publications found on this Google Scholar profile.'); setStep('error'); return; }
      const updated = incrementScholarRateLimit(facultyId);
      setFetchCount(updated.count);
      setPreviews(data.data.map((p: ScrapedPublication) => ({ ...p, selected: true })));
      setStep('preview');
    } catch (e: any) {
      setErrorMsg('Network error: ' + e.message); setStep('error');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleImport = async () => {
    if (!facultyId) return;
    const selected = previews.filter(p => p.selected);
    if (selected.length === 0) return;
    setStep('importing');
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/scholar/import/${facultyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ publications: selected }),
      });
      const data = await res.json();
      if (data.success) {
        const report: SimilarityFlag[] = data.similarityReport || [];
        setDoneMsg(data.message);
        setSimilarityReport(report);
        setImportStats({
  imported: data.imported,
  skipped: data.skipped,
  duration: ((Date.now() - start) / 1000).toFixed(1) + 's',
});
        setStep('done');
        onImportComplete(report);
      } else {
        setErrorMsg(data.message || 'Import failed'); setStep('error');
      }
    } catch (e: any) {
      setErrorMsg('Import failed: ' + e.message); setStep('error');
    }
  };

  const togglePub  = (i: number) => setPreviews(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p));
  const toggleAll  = (val: boolean) => setPreviews(prev => prev.map(p => ({ ...p, selected: val })));

  const handleClose = () => {
    setStep('idle'); setPreviews([]); setErrorMsg(''); setDoneMsg('');
    setSimilarityReport([]); onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[880px] p-0 border-0 bg-transparent shadow-none overflow-hidden [&>button]:hidden">
        <V1Styles />

        <div className="scholar-v1 flex flex-col rounded shadow-2xl border border-[var(--rule)] relative">

          {/* ── Top band ── */}
          <div style={{ borderBottom: '1px solid var(--rule)' }}>
            <div style={{ height: 4, background: 'var(--teal)' }} />
            <div style={{ padding: '22px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Catalog · Publications Database
                </div>
                <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.1, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Sync from <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>Google Scholar</em>
                </h1>
              </div>
              <button onClick={handleClose} aria-label="Close"
                style={{ width: 36, height: 36, border: '1px solid var(--rule)', background: 'transparent', borderRadius: 2, cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ padding: '28px 32px 32px' }}>

            {/* ──────── IDLE ──────── */}
            {step === 'idle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1px 1fr', gap: 32 }}>

                {/* Left — profile + usage */}
                <div>
                  <MonoLabel>Scholar profile</MonoLabel>
                  <div style={{ marginTop: 14 }}>
                    {user?.googleScholarUrl ? (
                      <a href={user.googleScholarUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--rule)', background: 'var(--paper)', textDecoration: 'none', color: 'var(--ink)', borderRadius: 2 }}>
                        <span className="dot" style={{ background: 'var(--teal)' }} />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{user.googleScholarUrl}</span>
                        <ArrowUpRight size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                      </a>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--amber)', background: 'var(--amber-soft)', borderRadius: 2 }}>
                        <span className="dot" style={{ background: 'var(--amber)' }} />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', flex: 1 }}>
                          No profile connected —{' '}
                          <a href="/edit-profile" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>add in Profile Settings</a>
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <MonoLabel>Daily usage</MonoLabel>
                      <span className="mono" style={{ fontSize: 11, color: limitReached ? 'var(--rose)' : 'var(--ink-3)' }}>
                        {fetchCount} / {DAILY_FETCH_LIMIT}
                        {!limitReached && <span style={{ color: 'var(--ink-4)' }}> · {attemptsLeft} left</span>}
                      </span>
                    </div>
                    <div className="usage-bar-track">
                      <div className="usage-bar-fill" style={{ width: `${usagePct}%`, background: usageColor }} />
                    </div>
                    {limitReached && (
                      <p className="mono" style={{ fontSize: 10, color: 'var(--rose)', marginTop: 6, letterSpacing: '0.06em' }}>Resets at midnight</p>
                    )}
                  </div>

                  <div style={{ marginTop: 22, padding: '14px 16px', borderLeft: '2px solid var(--amber)', background: 'var(--amber-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <BookOpen size={13} style={{ color: 'var(--amber)' }} />
                      <MonoLabel style={{ color: 'var(--amber)' }}>Notice</MonoLabel>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                      Your Scholar profile must be <strong>public</strong>. Private profiles cannot be scraped.
                    </p>
                  </div>
                </div>

                <div className="v-rule" />

                {/* Right — actions */}
                <div>
                  <MonoLabel>Manual actions</MonoLabel>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn" onClick={fetchPreview}
                      disabled={loadingFetch || !user?.googleScholarUrl || limitReached}
                      style={{ padding: '14px 18px', background: 'var(--teal)', color: 'var(--paper)', border: '1px solid var(--teal)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {loadingFetch
                          ? <><Loader2 size={16} className="animate-spin" /> Fetching publications…</>
                          : limitReached
                          ? 'Limit reached — try again tomorrow'
                          : <><RefreshCw size={16} /> Fetch &amp; preview publications</>}
                      </span>
                      {!loadingFetch && !limitReached && <ArrowRight size={14} />}
                    </button>
                  </div>

                  <div style={{ marginTop: 24, padding: '18px', border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)' }}>
                    <MonoLabel style={{ marginBottom: 14 }}>How it works</MonoLabel>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
                      {[
                        'We scrape your public Google Scholar profile.',
                        'Preview and choose which publications to import.',
                        'Duplicates are detected by title similarity and flagged.',
                      ].map((t, i) => (
                        <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, borderBottom: i < 2 ? '1px dotted var(--rule)' : 'none', paddingBottom: i < 2 ? 12 : 0 }}>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── PREVIEW ──────── */}
            {step === 'preview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
                  {[
                    { label: 'Fetched', value: previews.length },
                    { label: 'Selected', value: selectedCount },
                    { label: 'Fetch uses today', value: fetchCount },
                  ].map((s, i) => (
                    <div key={s.label} style={{ padding: '18px 20px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                      <MonoLabel>{s.label}</MonoLabel>
                      <div className="serif" style={{ fontSize: 28, fontWeight: 400, marginTop: 4, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    <span className="serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{selectedCount}</span> of {previews.length} selected for import
                  </div>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <button onClick={() => toggleAll(true)} className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: 0, color: 'var(--teal)', cursor: 'pointer' }}>
                      Select all
                    </button>
                    <button onClick={() => toggleAll(false)} className="mono"
                      style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer' }}>
                      Deselect all
                    </button>
                  </div>
                </div>

                <div className="scroll" style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--rule)' }}>
                  {previews.map((pub, i) => (
                    <div key={i} onClick={() => togglePub(i)}
                      style={{ display: 'grid', gridTemplateColumns: '24px 60px 1fr auto', gap: 16, padding: '16px 20px', cursor: 'pointer', borderBottom: i < previews.length - 1 ? '1px solid var(--rule-2)' : 'none', background: pub.selected ? 'rgba(15,92,88,0.04)' : 'transparent' }}>
                      <input type="checkbox" className="sq" checked={pub.selected} onChange={() => togglePub(i)} onClick={e => e.stopPropagation()} style={{ marginTop: 4 }} />
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', paddingTop: 3 }}>{String(i + 1).padStart(2, '0')}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--ink)', fontWeight: 400 }}>{pub.title}</div>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                          {pub.journal && <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)' }} className="serif">{pub.journal}</span>}
                          {pub.year && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-4)' }}>{pub.year}</span>}
                          {pub.citations > 0 && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--teal)' }}>{pub.citations} citations</span>}
                        </div>
                        {pub.authors && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.authors}</div>}
                      </div>
                      {pub.link && (
                        <a href={pub.link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--ink-4)', alignSelf: 'flex-start', paddingTop: 4 }}>
                          <ArrowUpRight size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
                  <button onClick={() => setStep('idle')} className="btn"
                    style={{ background: 'transparent', border: '1px solid var(--rule)', padding: '10px 18px', borderRadius: 2, fontSize: 13, color: 'var(--ink-2)' }}>
                    ← Back
                  </button>
                  <button onClick={handleImport} disabled={selectedCount === 0} className="btn"
                    style={{ background: 'var(--teal)', color: 'var(--paper)', border: '1px solid var(--teal)', padding: '10px 22px', borderRadius: 2, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    Import {selectedCount} publication{selectedCount !== 1 ? 's' : ''} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ──────── IMPORTING ──────── */}
            {step === 'importing' && (
              <div style={{ padding: '32px 0 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--teal)' }} />
                  <div>
                    <MonoLabel style={{ color: 'var(--teal)' }}>In progress</MonoLabel>
                    <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>
                      Importing publications from Google Scholar…
                    </h2>
                  </div>
                </div>

                <div className="shimmer-bar" style={{ marginBottom: 24 }}><i /></div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--rule)' }}>
                  {[
                    { label: 'Fetched from Scholar', value: 'Authorized', status: 'done' },
                    { label: 'Similarity check', value: 'In progress', status: 'active' },
                    { label: 'Writing to database', value: 'Pending', status: 'pending' },
                  ].map((s, i) => (
                    <div key={s.label} style={{ padding: '18px 20px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none', borderBottom: '1px solid var(--rule)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {s.status === 'done'    && <Check size={12} style={{ color: 'var(--teal)' }} />}
                        {s.status === 'active'  && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--teal)' }} />}
                        {s.status === 'pending' && <span className="dot" style={{ background: 'var(--ink-4)' }} />}
                        <MonoLabel>{s.label}</MonoLabel>
                      </div>
                      <div className="serif" style={{ fontSize: 15, color: s.status === 'pending' ? 'var(--ink-4)' : 'var(--ink)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 18, letterSpacing: '0.04em' }}>
                  Please don't close this window. Imports typically complete in 5–20 seconds.
                </p>
              </div>
            )}

            {/* ──────── DONE ──────── */}
            {step === 'done' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 36, alignItems: 'start', paddingBottom: similarityReport.length > 0 ? 0 : 8 }}>
                  <div>
                    <MonoLabel style={{ color: 'var(--teal)' }}>Import complete</MonoLabel>
                    <h2 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: '12px 0 12px', color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                      {importStats.imported > 0
                        ? <>{importStats.imported} publication{importStats.imported !== 1 ? 's' : ''}<br /><em style={{ color: 'var(--teal)', fontStyle: 'italic' }}>added to your catalog.</em></>
                        : 'Catalog up to date.'}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                      {doneMsg || 'Duplicates were detected by title similarity and flagged below. Your profile statistics have been updated.'}
                    </p>
                    <button onClick={handleClose} className="btn"
                      style={{ marginTop: 24, background: 'var(--teal)', color: 'var(--paper)', border: '1px solid var(--teal)', padding: '11px 24px', borderRadius: 2, fontSize: 13, fontWeight: 500 }}>
                      Done
                    </button>
                  </div>

                  <div className="v-rule" />

                  <div>
                    <MonoLabel>This import</MonoLabel>
                    <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                      {[
                        ['Imported', importStats.imported.toString()],
                        ['Skipped (near-duplicates)', importStats.skipped.toString()],
                        ['Duration', importStats.duration],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dotted var(--rule)', paddingBottom: 6 }}>
                          <MonoLabel>{k}</MonoLabel>
                          <span className="serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Similarity report */}
                {similarityReport.length > 0 && (
                  <div style={{ marginTop: 28, borderTop: '1px solid var(--rule)', paddingTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <AlertCircle size={14} style={{ color: 'var(--amber)' }} />
                      <MonoLabel style={{ color: 'var(--amber)' }}>
                        {similarityReport.length} potential duplicate{similarityReport.length > 1 ? 's' : ''} detected
                      </MonoLabel>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                      One from each pair was imported. Add the skipped entry manually if it's a distinct paper.
                    </p>

                    <div className="scroll" style={{ maxHeight: 280, overflowY: 'auto', display: 'grid', gap: 10 }}>
                      {similarityReport.map((flag, i) => (
                        <div key={i} style={{ border: '1px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                          {/* Imported row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'rgba(15,92,88,0.05)' }}>
                            <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', background: 'rgba(15,92,88,0.15)', color: 'var(--teal)', padding: '2px 6px', borderRadius: 2, whiteSpace: 'nowrap', marginTop: 2 }}>✓ IMPORTED</span>
                            <p className="serif" style={{ fontSize: 14, margin: 0, flex: 1, color: 'var(--ink)', lineHeight: 1.4 }}>{flag.imported.title}</p>
                            {flag.imported.link && (
                              <a href={flag.imported.link} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', flexShrink: 0 }}>
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                          {/* Match band */}
                          <div style={{ padding: '5px 16px', borderTop: '1px solid var(--rule-2)', borderBottom: '1px solid var(--rule-2)', background: 'var(--amber-soft)' }}>
                            <span className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '0.08em' }}>
                              {flag.similarity}% title match
                              {flag.imported.year === flag.skipped.year && flag.imported.year ? ` · both ${flag.imported.year}` : ''}
                            </span>
                          </div>
                          {/* Skipped row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'rgba(139,58,47,0.04)' }}>
                            <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', background: 'rgba(139,58,47,0.12)', color: 'var(--rose)', padding: '2px 6px', borderRadius: 2, whiteSpace: 'nowrap', marginTop: 2 }}>✗ SKIPPED</span>
                            <p className="serif" style={{ fontSize: 14, margin: 0, flex: 1, color: 'var(--ink-2)', lineHeight: 1.4 }}>{flag.skipped.title}</p>
                            {flag.skipped.link && (
                              <a href={flag.skipped.link} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', flexShrink: 0 }}>
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────── ERROR ──────── */}
            {step === 'error' && (
              <div>
                <div style={{ borderLeft: '3px solid var(--rose)', padding: '20px 24px', background: 'var(--rose-soft)' }}>
                  <MonoLabel style={{ color: 'var(--rose)' }}>Fetch error · Google Scholar</MonoLabel>
                  <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: '6px 0 10px', color: 'var(--ink)' }}>
                    Could not fetch publications.
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 600 }}>
                    The request failed with message: <span className="mono" style={{ fontWeight: 600 }}>{errorMsg}</span>
                  </p>
                </div>

                <div style={{ marginTop: 24 }}>
                  <MonoLabel>Troubleshooting</MonoLabel>
                  <ol style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                    {[
                      'Confirm your Google Scholar profile is set to Public.',
                      'Check that your Scholar URL is saved correctly in Profile Settings.',
                      'Make sure you have not exceeded your daily fetch limit.',
                      'If the problem persists, contact the research office with the reference below.',
                    ].map((t, i) => (
                      <li key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px dotted var(--rule)' }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{t}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mono" style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-4)' }}>
                    ref: scholar-sync · {new Date().toISOString()} · faculty {facultyId}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 26 }}>
                  <button onClick={() => setStep('idle')} className="btn"
                    style={{ background: 'transparent', border: '1px solid var(--rule)', padding: '10px 18px', borderRadius: 2, fontSize: 13, color: 'var(--ink-2)' }}>
                    Cancel
                  </button>
                  <button onClick={fetchPreview} disabled={limitReached || !user?.googleScholarUrl} className="btn"
                    style={{ background: 'var(--teal)', color: 'var(--paper)', border: '1px solid var(--teal)', padding: '10px 22px', borderRadius: 2, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}