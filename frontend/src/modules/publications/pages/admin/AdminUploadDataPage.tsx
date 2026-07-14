// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Upload Data Page
// JournalRankingsAdmin (Scimago) + KRCAdmin panels relocated here
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { AdminCard, SectionHeader, Icon } from './components/ui-kit';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import {
  FileDown, Database, Upload, Trash2, X,
  BarChart3, AlertTriangle, CheckCircle
} from 'lucide-react';

// ── Delete Confirmation ───────────────────────────────────────────
function DeleteConfirm({ open, title, detail, isDeleting, onConfirm, onCancel }: {
  open: boolean; title: string; detail: string; isDeleting: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-4">{detail}</p>
          <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting} className="px-6">Cancel</Button>
            <Button onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Result banner ─────────────────────────────────────────────────
function ResultBanner({ text }: { text: string }) {
  if (!text) return null;
  const isSuccess = text.startsWith('✅');
  const isInfo = text.startsWith('⏳');
  const bg = isSuccess ? 'bg-green-50 text-green-700 border-green-100' : isInfo ? 'bg-[#E5DDC6]/30 text-[#101A24] border-[#E5DDC6]/60' : 'bg-red-50 text-red-700 border-red-100';
  return <p className={`text-xs px-3 py-2 rounded-lg border ${bg}`}>{text}</p>;
}

// ── Journal Rankings (Scimago) Panel ──────────────────────────────
function JournalRankingsPanel() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deletingYear, setDeletingYear] = useState<number | null>(null);
  const [deleteYearResult, setDeleteYearResult] = useState('');
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<{ year: number; count: number } | null>(null);

  const token = () => localStorage.getItem('token') || '';
  const base = '/api';

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${base}/journal-rankings/stats`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setStats(json);
    } catch { /* non-fatal */ }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const handleImport = async () => {
    if (!csvFile) { alert('Please select a CSV file first.'); return; }
    setImporting(true);
    setImportResult('');
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      const res = await fetch(`${base}/journal-rankings/import-csv`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`✅ Imported ${json.inserted.toLocaleString()} journal rankings for ${json.year}`);
        setCsvFile(null); await loadStats();
      } else if (json.alreadyExists) {
        setImportResult(`⚠️ Year ${json.year} already has ${json.existingCount?.toLocaleString()} entries. Delete that year first, then re-import.`);
      } else {
        setImportResult(`❌ ${json.message}`);
      }
    } catch (e: any) {
      setImportResult(`❌ Import failed: ${e.message}. If file too large, check server upload limit.`);
    } finally { setImporting(false); }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult('⏳ Backfill started in background — check server logs for progress.');
    try {
      const res = await fetch(`${base}/journal-rankings/backfill-quartiles`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setBackfillResult(json.success
        ? '✅ Backfill triggered — quartiles will be populated in the background.'
        : `❌ ${json.message}`);
    } catch (e: any) { setBackfillResult(`❌ ${e.message}`); }
    finally { setBackfilling(false); }
  };

  const handleConfirmDeleteYear = async () => {
    if (!confirmDeleteYear) return;
    setDeletingYear(confirmDeleteYear.year);
    setDeleteYearResult('');
    setConfirmDeleteYear(null);
    try {
      const res = await fetch(`${base}/journal-rankings/year/${confirmDeleteYear.year}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setDeleteYearResult(json.success
        ? `✅ Deleted ${json.deleted.toLocaleString()} entries for ${confirmDeleteYear.year}`
        : `❌ ${json.message}`);
      if (json.success) await loadStats();
    } catch (e: any) { setDeleteYearResult(`❌ ${e.message}`); }
    finally { setDeletingYear(null); }
  };

  return (
    <>
      <DeleteConfirm
        open={!!confirmDeleteYear}
        title="Delete Journal Rankings?"
        detail={`${Number(confirmDeleteYear?.count).toLocaleString()} entries for year ${confirmDeleteYear?.year}`}
        isDeleting={deletingYear === confirmDeleteYear?.year}
        onConfirm={handleConfirmDeleteYear}
        onCancel={() => setConfirmDeleteYear(null)}
      />

      <AdminCard className="overflow-hidden">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #101A24, #0e3c3a)' }}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Journal Rankings (Scimago)</h3>
            <p className="text-xs text-slate-500">
              {stats ? `${stats.stats?.total_rows?.toLocaleString() || 0} entries · ${stats.stats?.year_count || 0} years` : 'Loading...'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import CSV */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[var(--brand-600)]" />Import Scimago CSV
            </h4>
            <p className="text-xs text-slate-500">
              Download from{' '}
              <a href="https://www.scimagojr.com/journalrank.php" target="_blank" rel="noopener noreferrer"
                className="text-[var(--brand-700)] underline hover:text-[var(--brand-800)]">scimagojr.com</a>
              {' '}→ "Download data" at the bottom. File is auto-detected by name.
            </p>

            <label className="cursor-pointer block">
              <div className={`border-2 border-dashed rounded-xl px-4 py-3 text-sm transition-colors ${csvFile ? 'border-[var(--brand-400)] bg-[var(--brand-50)] text-[var(--brand-700)]' : 'border-slate-200 text-slate-400 hover:border-[var(--brand-300)]'}`}>
                {csvFile ? `📄 ${csvFile.name}` : 'Click to select CSV file...'}
              </div>
              <input type="file" accept=".csv,.xls" className="hidden"
                onChange={e => { setCsvFile(e.target.files?.[0] || null); setImportResult(''); }} />
            </label>

            <button onClick={handleImport} disabled={importing || !csvFile}
              className="admin-btn admin-btn-primary admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {importing ? (
                <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />Importing...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" />{csvFile ? `Import ${csvFile.name.match(/(\d{4})/)?.[1] || 'CSV'}` : 'Import CSV'}</>
              )}
            </button>
            <ResultBanner text={importResult} />
          </div>

          {/* Backfill + Stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--brand-600)]" />Backfill Existing Publications
            </h4>
            <p className="text-xs text-slate-500">
              Populates quartile, SJR score, and CiteScore for publications with empty quartile fields.
            </p>
            <button onClick={handleBackfill} disabled={backfilling}
              className="admin-btn admin-btn-ghost admin-btn-sm disabled:opacity-50">
              {backfilling ? (
                <><div className="animate-spin w-3.5 h-3.5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full" />Starting...</>
              ) : (
                <><Database className="w-3.5 h-3.5" />Backfill Quartiles</>
              )}
            </button>
            <ResultBanner text={backfillResult} />

            {/* Delete by year */}
            {stats?.byYear?.length > 0 && (
              <div className="border border-red-100 rounded-xl p-3 bg-red-50/50 space-y-2">
                <p className="text-xs font-semibold text-red-700">Delete a Year's Data</p>
                <div className="flex flex-wrap gap-2">
                  {stats.byYear.map((row: any) => (
                    <button key={row.year} disabled={deletingYear === row.year}
                      onClick={() => setConfirmDeleteYear({ year: row.year, count: row.count })}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-red-200 bg-white text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
                      <X className="w-3 h-3" />{row.year}
                      <span className="text-red-400">({Number(row.count).toLocaleString()})</span>
                    </button>
                  ))}
                </div>
                <ResultBanner text={deleteYearResult} />
              </div>
            )}

            {statsLoading && <p className="text-xs text-slate-400">Loading stats...</p>}
            {!statsLoading && stats?.stats?.total_rows === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                ⚠️ No journal rankings imported yet. Import a Scimago CSV to enable quartile auto-population.
              </p>
            )}
          </div>
        </div>
      </AdminCard>
    </>
  );
}

// ── KRC Panel ─────────────────────────────────────────────────────
function KRCPanel() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const token = () => localStorage.getItem('token') || '';
  const base = '/api';

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${base}/krc/stats`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) setStats(json);
    } catch { /* non-fatal */ }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const handleImport = async () => {
    if (!csvFile) { alert('Please select a CSV file first.'); return; }
    setImporting(true);
    setImportResult('');
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      const res = await fetch(`${base}/krc/import-csv`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`✅ Imported ${json.inserted.toLocaleString()} KRC journal entries`);
        setCsvFile(null); await loadStats();
      } else {
        setImportResult(`❌ ${json.message}`);
      }
    } catch (e: any) { setImportResult(`❌ Import failed: ${e.message}`); }
    finally { setImporting(false); }
  };

  const handleClear = async () => {
    if (!confirm('This will delete ALL KRC journal data. Are you sure?')) return;
    setClearing(true);
    setClearResult('');
    try {
      const res = await fetch(`${base}/krc/clear`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) { setClearResult('✅ All KRC data cleared.'); setStats(null); }
      else { setClearResult(`❌ ${json.message}`); }
    } catch (e: any) { setClearResult(`❌ ${e.message}`); }
    finally { setClearing(false); }
  };

  const qLabel: Record<number, string> = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
  const qColor: Record<number, string> = { 1: '#16a34a', 2: '#2563eb', 3: '#f97316', 4: '#ef4444' };

  return (
    <AdminCard className="overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}>
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">KRC Journal List (Scopus)</h3>
          <p className="text-xs text-slate-500">
            {stats?.stats?.total_rows > 0 ? `${Number(stats.stats.distinct_journals).toLocaleString()} journals loaded` : 'No data loaded'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[var(--brand-600)]" />Import KRC CSV
          </h4>
          <p className="text-xs text-slate-500">
            Upload the Scopus KRC list. Upload Q1–Q4 files one by one — each appends.
            Use <span className="font-medium text-red-600">Clear All</span> before re-importing.
          </p>

          <label className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-xl px-4 py-3 text-sm transition-colors ${csvFile ? 'border-[var(--brand-400)] bg-[var(--brand-50)] text-[var(--brand-700)]' : 'border-slate-200 text-slate-400 hover:border-[var(--brand-300)]'}`}>
              {csvFile ? `📄 ${csvFile.name}` : 'Click to select CSV or XLSX file...'}
            </div>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { setCsvFile(e.target.files?.[0] || null); setImportResult(''); }} />
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleImport} disabled={importing || !csvFile}
              className="admin-btn admin-btn-primary admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {importing ? (
                <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />Importing...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" />Import CSV</>
              )}
            </button>
            <button onClick={handleClear} disabled={clearing}
              className="admin-btn admin-btn-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
              {clearing ? 'Clearing...' : 'Clear All KRC Data'}
            </button>
          </div>

          <ResultBanner text={importResult} />
          <ResultBanner text={clearResult} />
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--brand-600)]" />KRC Data Stats
          </h4>

          {statsLoading && <p className="text-xs text-slate-400">Loading stats...</p>}

          {!statsLoading && (!stats || stats.stats?.total_rows === 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
              ⚠️ No KRC data loaded yet. Import a KRC CSV to enable the KRC Publications View for faculty.
            </p>
          )}

          {stats?.stats?.total_rows > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--brand-50)] border border-[var(--brand-100)] rounded-xl px-3 py-3 text-center">
                  <p className="text-xl font-bold text-[var(--brand-700)] tnum">{Number(stats.stats.total_rows).toLocaleString()}</p>
                  <p className="text-xs text-[var(--brand-600)]">Total rows</p>
                </div>
                <div className="bg-[var(--brand-50)] border border-[var(--brand-100)] rounded-xl px-3 py-3 text-center">
                  <p className="text-xl font-bold text-[var(--brand-700)] tnum">{Number(stats.stats.distinct_journals).toLocaleString()}</p>
                  <p className="text-xs text-[var(--brand-600)]">Unique journals</p>
                </div>
              </div>

              {stats.byQuartile?.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">Quartile Breakdown</div>
                  <div className="flex divide-x divide-slate-100">
                    {stats.byQuartile.map((row: any) => (
                      <div key={row.quartile} className="flex-1 text-center px-2 py-2">
                        <span className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold mb-1"
                          style={{ backgroundColor: qColor[row.quartile] || '#6b7280' }}>
                          {qLabel[row.quartile] || `Q${row.quartile}`}
                        </span>
                        <p className="text-xs font-semibold text-slate-700 tnum">{Number(row.count).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.stats.last_uploaded_at && (
                <p className="text-xs text-slate-400">
                  Last uploaded: {new Date(stats.stats.last_uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AdminCard>
  );
}

// ── Upload Data Page ──────────────────────────────────────────────
export function AdminUploadDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-[var(--brand-700)] uppercase tracking-widest mb-1.5">Tools</p>
        <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Upload Data</h2>
        <p className="text-sm text-slate-600 mt-1">
          Import journal rankings and KRC data to enable automated quartile mapping and validations.
        </p>
      </div>
      <JournalRankingsPanel />
      <KRCPanel />
    </div>
  );
}

export default AdminUploadDataPage;
