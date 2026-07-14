import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import {
  RefreshCw, Check, X, ArrowUpRight, GitMerge, Wifi,
  ListFilter, ArrowRight, Loader2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API_BASE_URL = '/api';
const getToken = () => localStorage.getItem('token');

interface WosPublication {
  title: string; journal: string; authors: string[] | string; citations: number;
  year: string; monthYear: string; academicYear: string;
  volume: string; issue: string; startPage: string; lastPage: string;
  doi: string; link: string; docType: string; source: string; uid: string; selected?: boolean;
}

interface AuthorProfile { hIndex: number; citationCount: number; documentCount: number; }
interface WosSyncModalProps { isOpen: boolean; onClose: () => void; onImportComplete: () => void; }

// --- V1 Theme Injector (Adapted for Web of Science Green) ---
const V1Styles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap');
    
    .wos-v1 {
      --brand: #166534; /* WoS Green */
      --brass: #B08A3E; --brass-soft: #F2EADA; --paper: #FBF8F1;
      --ink: #1A1F1E; --ink-2: #3D4744; --ink-3: #6B7572; --ink-4: #98A09D;
      --rule: #D9D2C0; --rule-2: #E8E2D2; --rose: #8B3A2F; --rose-soft: #F4E4DE;
      font-family: 'Inter Tight', system-ui, sans-serif;
      background: var(--paper); color: var(--ink);
    }
    .dark .wos-v1 {
      --brand: #4ade80; /* Dark Mode WoS Green */
      --brass: #D4A855; --brass-soft: #2A2116; --paper: #1A1916;
      --ink: #F0EDE6; --ink-2: #C8C3BB; --ink-3: #8A857E; --ink-4: #504C48;
      --rule: #2E2C28; --rule-2: #3A3630; --rose: #E07070; --rose-soft: #2A1515;
    }
    
    .wos-v1 .serif { font-family: 'Source Serif 4', Georgia, serif; }
    .wos-v1 .mono { font-family: 'JetBrains Mono', monospace; }
    
    .wos-v1 .v-rule { width: 1px; background: var(--rule); align-self: stretch; }
    .wos-v1 .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    
    .wos-v1 .btn { transition: all 0.15s ease; cursor: pointer; }
    .wos-v1 .btn:hover:not(:disabled) { transform: translateY(-1px); }
    .wos-v1 .btn:active:not(:disabled) { transform: translateY(0); }
    .wos-v1 .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    .wos-v1 .scroll::-webkit-scrollbar { width: 6px; }
    .wos-v1 .scroll::-webkit-scrollbar-track { background: transparent; }
    .wos-v1 .scroll::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 4px; }
    .wos-v1 .scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }

    .wos-v1 input[type="checkbox"].sq {
      appearance: none; -webkit-appearance: none;
      width: 14px; height: 14px; border: 1px solid var(--ink-4);
      border-radius: 2px; background: var(--paper); cursor: pointer;
      position: relative; flex-shrink: 0; margin: 0;
    }
    .wos-v1 input[type="checkbox"].sq:checked { background: var(--brand); border-color: var(--brand); }
    .wos-v1 input[type="checkbox"].sq:checked::after {
      content: ""; position: absolute; left: 4px; top: 1px;
      width: 4px; height: 8px; border: solid var(--paper);
      border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
    }

    @keyframes barShift { 0% { background-position: 0 0; } 100% { background-position: 32px 0; } }
    .wos-v1 .shimmer-bar { height: 4px; border-radius: 0; overflow: hidden; background: var(--rule-2); position: relative; }
    .wos-v1 .shimmer-bar > i {
      position: absolute; inset: 0;
      background: repeating-linear-gradient(45deg, var(--brand) 0 6px, var(--ink-3) 6px 12px);
      background-size: 32px 4px; animation: barShift 1.2s linear infinite; width: 100%;
    }
  `}} />
);

const MonoLabel = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)', textTransform: 'uppercase', ...style }}>
    {children}
  </div>
);

export function WosSyncModal({ isOpen, onClose, onImportComplete }: WosSyncModalProps) {
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [step, setStep]         = useState<'idle' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneMsg, setDoneMsg]   = useState('');
  
  const [publications, setPublications]   = useState<WosPublication[]>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [lastSynced, setLastSynced]       = useState<string | null>(null);

  // Sync state tracking for "importing" view
  const [importStats, setImportStats] = useState({ new: 0, updated: 0, skipped: 0, duration: '0.0s' });

  const allWosUrls = useMemo(() => [(user as any)?.wosUrl, (user as any)?.wosUrl2, (user as any)?.wosUrl3].filter(Boolean) as string[], [user]);

  useEffect(() => { if (isOpen && facultyId) fetchLastSynced(); }, [isOpen, facultyId]);

  const fetchLastSynced = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/wos/last-synced/${facultyId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success && data.lastSynced) {
        setLastSynced(new Date(data.lastSynced).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }));
      }
    } catch {}
  };

  const authorsDisplay = (authors: string[] | string) => Array.isArray(authors) ? authors.join(', ') : (authors || '');

  const handleManualSync = async () => {
    if (!facultyId) { setErrorMsg('Faculty ID not found.'); setStep('error'); return; }
    setStep('importing');
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/wos/sync/${facultyId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setDoneMsg(data.message);
        setImportStats({ new: data.new || 0, updated: data.updated || 0, skipped: data.skipped || 0, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' });
        setStep('done');
        onImportComplete();
      } else {
        const errDetail = data.errors?.map((e: any) => e.error || e).join('; ') || '';
        setErrorMsg((data.message || `Sync failed (HTTP ${res.status})`) + (errDetail ? `: ${errDetail}` : ''));
        setStep('error');
      }
    } catch (e: any) { setErrorMsg('Network error: ' + e.message); setStep('error'); }
  };

  const fetchPreview = async () => {
    if (!facultyId) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/wos/preview/${facultyId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success && data.count > 0) {
        setPublications(data.data.map((p: any) => ({ ...p, selected: true })));
        setAuthorProfile(data.authorProfile || null);
        setStep('preview');
      } else {
        setErrorMsg(data.message || 'No publications found.'); setStep('error');
      }
    } catch (e: any) { setErrorMsg('Network error: ' + e.message); setStep('error'); }
    finally { setLoadingPreview(false); }
  };

  const handleImport = async () => {
    const selected = publications.filter(p => p.selected);
    if (!facultyId || selected.length === 0) return;
    setStep('importing');
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/wos/import/${facultyId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ publications: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setDoneMsg(data.message);
        setImportStats({ new: selected.length, updated: 0, skipped: 0, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' });
        setStep('done');
        onImportComplete();
      } else {
        const errDetail = Array.isArray(data.errors) ? data.errors.join('; ') : '';
        setErrorMsg((data.message || 'Import failed') + (errDetail ? `: ${errDetail}` : ''));
        setStep('error');
      }
    } catch (e: any) { setErrorMsg('Import failed: ' + e.message); setStep('error'); }
  };

  const handleClose = () => {
    setStep('idle'); setPublications([]); setErrorMsg(''); setDoneMsg(''); onClose();
  };

  const togglePub = (i: number) => setPublications(prev => prev.map((p, idx) => i === idx ? { ...p, selected: !p.selected } : p));
  const toggleAll = (val: boolean) => setPublications(prev => prev.map(p => ({ ...p, selected: val })));
  const selectedCount = publications.filter(p => p.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[880px] p-0 border-0 bg-transparent shadow-none overflow-hidden [&>button]:hidden">
        <V1Styles />
        
        <div className="wos-v1 flex flex-col rounded shadow-2xl border border-[var(--rule)] relative">
          
          {/* Top band */}
          <div style={{ borderBottom: '1px solid var(--rule)' }}>
            <div style={{ height: 4, background: 'var(--brand)' }} />
            <div style={{ padding: '22px 32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Catalog · Publications Database
                </div>
                <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.1, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Sync from <em style={{ fontStyle: 'italic', color: 'var(--brand)' }}>Web of Science</em>
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {lastSynced && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Last synced</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{lastSynced}</div>
                  </div>
                )}
                <button onClick={handleClose} aria-label="Close"
                  style={{ width: 36, height: 36, border: '1px solid var(--rule)', background: 'transparent', borderRadius: 2, cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 32px 32px' }}>
            
            {/* ──────── IDLE STATE ──────── */}
            {step === 'idle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1px 1fr', gap: 32 }}>
                <div>
                  <MonoLabel>Connected WoS profiles · {allWosUrls.length}</MonoLabel>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allWosUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--rule)', background: 'var(--paper)', textDecoration: 'none', color: 'var(--ink)', borderRadius: 2 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="dot" style={{ background: 'var(--brand)' }} />
                        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{url.slice(0, 50)}{url.length > 50 ? '…' : ''}</span>
                        <ArrowUpRight size={14} style={{ color: 'var(--ink-4)' }} />
                      </a>
                    ))}
                    {allWosUrls.length === 0 && (
                       <div className="mono" style={{ fontSize: 12, color: 'var(--rose)', padding: '12px', border: '1px solid var(--rose-soft)', background: 'var(--rose-soft)' }}>No profile connected. Update settings.</div>
                    )}
                  </div>
                  {allWosUrls.length > 1 && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GitMerge size={12} style={{ color: 'var(--brand)' }} />
                      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand)' }}>Merged · Deduplicated on DOI</span>
                    </div>
                  )}
                  <div style={{ marginTop: 22, padding: '14px 16px', borderLeft: '2px solid var(--brass)', background: 'var(--brass-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Wifi size={14} style={{ color: 'var(--brass)' }} />
                      <MonoLabel style={{ color: 'var(--brass)' }}>Notice</MonoLabel>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                      You must be connected to the <strong>college network or VPN</strong>. The Web of Science API requires institutional access.
                    </p>
                  </div>
                </div>

                <div className="v-rule" />

                <div>
                  <MonoLabel>Automatic Schedule</MonoLabel>
                  <div style={{ marginTop: 14, padding: '18px 18px', border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="dot" style={{ background: 'var(--brand)', boxShadow: '0 0 0 4px rgba(22,101,52,0.12)' }} />
                      <span className="serif" style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--ink)' }}>Auto-sync active</span>
                    </div>
                    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div><MonoLabel>Cadence</MonoLabel><div className="serif" style={{ fontSize: 15, marginTop: 4, color: 'var(--ink)' }}>Nightly</div></div>
                      <div><MonoLabel>Window</MonoLabel><div className="serif" style={{ fontSize: 15, marginTop: 4, color: 'var(--ink)' }}>03:30 IST</div></div>
                      <div><MonoLabel>Previous run</MonoLabel><div className="mono" style={{ fontSize: 12, marginTop: 4, color: 'var(--ink-2)' }}>{lastSynced || 'Never'}</div></div>
                      <div><MonoLabel>Next run</MonoLabel><div className="mono" style={{ fontSize: 12, marginTop: 4, color: 'var(--ink-2)' }}>Tonight · 03:30</div></div>
                    </div>
                  </div>

                  <MonoLabel style={{ marginTop: 22 }}>Manual actions</MonoLabel>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn" onClick={handleManualSync} disabled={allWosUrls.length === 0}
                      style={{ padding: '14px 18px', background: 'var(--brand)', color: 'var(--paper)', border: '1px solid var(--brand)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RefreshCw size={16} /> Quick sync — import everything
                      </span>
                      <ArrowRight size={14} />
                    </button>
                    <button className="btn" onClick={fetchPreview} disabled={loadingPreview || allWosUrls.length === 0}
                      style={{ padding: '14px 18px', background: 'transparent', color: 'var(--brand)', border: '1px solid var(--brand)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {loadingPreview ? <Loader2 size={16} className="animate-spin" /> : <ListFilter size={16} />} 
                        Preview &amp; choose what to import
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── PREVIEW STATE ──────── */}
            {step === 'preview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
                  {[
                    { label: 'Documents', value: authorProfile?.documentCount || 0 },
                    { label: 'Citations', value: authorProfile?.citationCount || 0 },
                    { label: 'h-index', value: authorProfile?.hIndex || 0 },
                    { label: 'Fetched', value: `${publications.length}` },
                  ].map((s, i) => (
                    <div key={s.label} style={{ padding: '18px 20px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                      <MonoLabel>{s.label}</MonoLabel>
                      <div className="serif" style={{ fontSize: 28, fontWeight: 400, marginTop: 4, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    <span className="serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{selectedCount}</span> of {publications.length} selected for import
                  </div>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <button onClick={() => toggleAll(true)} className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: 0, color: 'var(--brand)', cursor: 'pointer' }}>Select all</button>
                    <button onClick={() => toggleAll(false)} className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer' }}>Deselect all</button>
                  </div>
                </div>

                <div className="scroll" style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--rule)' }}>
                  {publications.map((p, i) => (
                    <div key={i} onClick={() => togglePub(i)}
                      style={{ display: 'grid', gridTemplateColumns: '24px 60px 1fr auto', gap: 16, padding: '16px 20px', cursor: 'pointer', borderBottom: i < publications.length - 1 ? '1px solid var(--rule-2)' : 'none', background: p.selected ? 'rgba(22,101,52,0.04)' : 'transparent' }}>
                      <input type="checkbox" className="sq" checked={p.selected} onChange={() => togglePub(i)} onClick={e => e.stopPropagation()} style={{ marginTop: 4 }} />
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', paddingTop: 3 }}>{String(i + 1).padStart(2, '0')}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--ink)', fontWeight: 400 }}>{p.title}</div>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)' }} className="serif">{p.journal}</span>
                          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-4)' }}>{p.year}</span>
                          {p.docType && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>{p.docType}</span>}
                          {p.citations > 0 && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--brand)' }}>{p.citations} citations</span>}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authorsDisplay(p.authors)}</div>
                      </div>
                      {p.link && (
                        <a href={p.link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" style={{ color: 'var(--ink-4)', alignSelf: 'flex-start', paddingTop: 4 }}>
                          <ArrowUpRight size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
                  <button onClick={() => setStep('idle')} className="btn" style={{ background: 'transparent', border: '1px solid var(--rule)', padding: '10px 18px', borderRadius: 2, fontSize: 13, color: 'var(--ink-2)' }}>← Back</button>
                  <button onClick={handleImport} disabled={selectedCount === 0} className="btn" style={{ background: 'var(--brand)', color: 'var(--paper)', border: '1px solid var(--brand)', padding: '10px 22px', borderRadius: 2, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    Import {selectedCount} publication{selectedCount !== 1 ? 's' : ''} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ──────── IMPORTING STATE ──────── */}
            {step === 'importing' && (
              <div style={{ padding: '32px 0 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brand)' }} />
                  <div>
                    <MonoLabel style={{ color: 'var(--brand)' }}>In progress</MonoLabel>
                    <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, margin: '4px 0 0', color: 'var(--ink)' }}>Importing publications from WoS…</h2>
                  </div>
                </div>

                <div className="shimmer-bar" style={{ marginBottom: 24 }}><i /></div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--rule)' }}>
                  {[
                    { label: 'Fetched from API', value: 'Authorized', status: 'done' },
                    { label: 'Deduplicating', value: 'In progress', status: 'active' },
                    { label: 'Writing to database', value: 'Pending', status: 'pending' },
                  ].map((s, i) => (
                    <div key={s.label} style={{ padding: '18px 20px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none', borderBottom: '1px solid var(--rule)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {s.status === 'done' && <Check size={12} style={{ color: 'var(--brand)' }} />}
                        {s.status === 'active' && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--brand)' }} />}
                        {s.status === 'pending' && <span className="dot" style={{ background: 'var(--ink-4)' }} />}
                        <MonoLabel>{s.label}</MonoLabel>
                      </div>
                      <div className="serif" style={{ fontSize: 15, color: s.status === 'pending' ? 'var(--ink-4)' : 'var(--ink)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 18, letterSpacing: '0.04em' }}>
                  Please don't close this window. Imports typically complete in 5–20 seconds depending on dataset size.
                </p>
              </div>
            )}

            {/* ──────── DONE STATE ──────── */}
            {step === 'done' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 36, alignItems: 'center', padding: '24px 0' }}>
                <div>
                  <MonoLabel style={{ color: 'var(--brand)' }}>Sync complete</MonoLabel>
                  <h2 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: '12px 0 12px', color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                    {importStats.new > 0 ? `${importStats.new} publications` : 'Catalog up to date.'}<br />
                    {importStats.new > 0 && <em style={{ color: 'var(--brand)', fontStyle: 'italic' }}>added to your catalog.</em>}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                    {doneMsg || "We deduplicated against your existing records on DOI. Your profile statistics have been updated."}
                  </p>
                  <button onClick={handleClose} className="btn" style={{ marginTop: 24, background: 'var(--brand)', color: 'var(--paper)', border: '1px solid var(--brand)', padding: '11px 24px', borderRadius: 2, fontSize: 13, fontWeight: 500 }}>
                    Done
                  </button>
                </div>

                <div className="v-rule" />

                <div>
                  <MonoLabel>This sync</MonoLabel>
                  <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                    {[
                      ['New publications', importStats.new.toString()],
                      ['Updated (citations bumped)', importStats.updated.toString()],
                      ['Skipped (duplicates)', importStats.skipped.toString()],
                      ['Duration', importStats.duration],
                      ['Next auto-sync', 'Tonight · 03:30 IST'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dotted var(--rule)', paddingBottom: 6 }}>
                        <MonoLabel>{k}</MonoLabel>
                        <span className="serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ──────── ERROR STATE ──────── */}
            {step === 'error' && (
              <div>
                <div style={{ borderLeft: '3px solid var(--rose)', padding: '20px 24px', background: 'var(--rose-soft)' }}>
                  <MonoLabel style={{ color: 'var(--rose)' }}>Network error · Validation</MonoLabel>
                  <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: '6px 0 10px', color: 'var(--ink)' }}>Could not complete Web of Science sync.</h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 600 }}>
                    The request failed with message: <span className="mono font-semibold">{errorMsg}</span>. This usually means you are off the college network. Connect to college Wi-Fi or VPN, then retry.
                  </p>
                </div>

                <div style={{ marginTop: 24 }}>
                  <MonoLabel>Troubleshooting</MonoLabel>
                  <ol style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                    {['Confirm you are on the institutional network or VPN.', 'Open webofscience.com in a new tab — it should load without prompting for a login.', 'If you recently changed your ResearcherID profile URL, save it in Profile Settings.', 'If the problem persists, contact the research office with the timestamp below.'].map((t, i) => (
                      <li key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px dotted var(--rule)' }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{t}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mono" style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-4)' }}>
                    ref: wos-sync · {new Date().toISOString()} · faculty {facultyId}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 26 }}>
                  <button onClick={() => setStep('idle')} className="btn" style={{ background: 'transparent', border: '1px solid var(--rule)', padding: '10px 18px', borderRadius: 2, fontSize: 13, color: 'var(--ink-2)' }}>Cancel</button>
                  <button onClick={handleManualSync} className="btn" style={{ background: 'var(--brand)', color: 'var(--paper)', border: '1px solid var(--brand)', padding: '10px 22px', borderRadius: 2, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
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