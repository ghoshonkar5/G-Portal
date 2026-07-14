// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Conferences Table Page
// ALL columns from old dashboard, new glassmorphic UI
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useAdminData } from './AdminLayout';
import {
  AdminCard, AdminSearchInput, AdminFlagDot, Icon, EmptyState
} from './components/ui-kit';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AddConferenceForm } from '../../components/AddConferenceForm';
import { FlagModal } from '../../components/FlagModal';
import { FilterDropdown } from '../../components/FilterDropdown';
import { generateAcademicYears, parseAcademicYear } from '../../utils/academicYears';
import { api } from '../../api/publicationsApi';
import type { Conference } from '../../utils/mockData';
import {
  FileDown, Pencil, Trash2, ExternalLink, Download,
  Flag, AlertTriangle
} from 'lucide-react';
import { ExportConfModal } from './components/AdminExportModals';

function EditedBadge({ by, at }: { by?: string; at?: string }) {
  if (!by) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-0.5">
      ✏️ {by}{at ? ` · ${new Date(at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
    </span>
  );
}

function DeleteConfirmModal({ open, title, onConfirm, onCancel, isDeleting }: {
  open: boolean; title: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Conference?</h3>
          <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
          <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{title}"</p>
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

export function AdminConferencesPage() {
  const { allConferences, allFlags, loadAllData, getItemFlags } = useAdminData();
  const allAcademicYears = generateAcademicYears();

  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editingConf, setEditingConf] = useState<Conference | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagModalItems, setFlagModalItems] = useState<{ id: string; title: string }[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const rows = useMemo(() => allConferences.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (c.title || '').toLowerCase().includes(s) ||
      (c.conferenceName || '').toLowerCase().includes(s) ||
      (Array.isArray(c.authors) ? c.authors : []).some(a => (a || '').toLowerCase().includes(s)) ||
      (c.facultyName || '').toLowerCase().includes(s) ||
      (c.doi || '').toLowerCase().includes(s);
    return matchSearch && (year === 'all' || parseAcademicYear(c.academicYear) === year);
  }), [allConferences, search, year]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.conferences.delete(deleteTarget.id);
      if (res.success) { setDeleteTarget(null); await loadAllData(); }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleEditConf = async (data: any) => {
    if (!editingConf) return;
    const res = await api.conferences.update(editingConf.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingConf(null); } else throw new Error('Failed');
  };

  const handleDeleteFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAllData();
  };

  const openBulkFlag = () => {
    const items = Array.from(selected).map(id => {
      const conf = allConferences.find(c => c.id === id);
      return { id, title: conf?.title || '' };
    });
    setFlagModalItems(items);
    setIsFlagModalOpen(true);
  };

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.map(r => r.id)) : new Set());
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    checked ? next.add(id) : next.delete(id);
    setSelected(next);
  };

  const getFileData = (item: any) => (item as any).fileUrl || item.fileData;
  const openFile = (fileData: string, fileName: string) => {
    const w = window.open();
    w?.document.write(`<html><body style="margin:0"><iframe src="${fileData}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
  };
  const downloadFile = (fileData: string, fileName: string) => {
    const a = document.createElement('a'); a.href = fileData; a.download = fileName || 'file'; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-[var(--brand-700)] uppercase tracking-widest mb-1.5">Database</p>
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Conferences</h2>
          <p className="text-sm text-slate-600 mt-1">National & international conference papers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsExportOpen(true)} className="admin-btn admin-btn-soft admin-btn-sm">
            <FileDown className="w-4 h-4" />Export CSV
          </button>
        </div>
      </div>

      <AdminCard padded={false} className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/40 flex items-center gap-3 flex-wrap">
          <AdminSearchInput value={search} onChange={setSearch}
            placeholder="Search conferences…" className="flex-1 min-w-[220px] max-w-md" />
          <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
            <FilterDropdown selectedValue={year} onValueChange={setYear} options={allAcademicYears} placeholder="All Years" />
          </div>
          <div className="flex-1" />
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5 pr-1">
              <span className="text-xs text-slate-600">{selected.size} selected</span>
              <button onClick={openBulkFlag} className="admin-btn admin-btn-sm" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fee2e2' }}>
                <Flag className="w-3.5 h-3.5" />Flag Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 ml-1">Clear</button>
            </div>
          )}
          <div className="text-xs text-slate-500 tnum">
            <span className="font-semibold text-slate-800">{rows.length.toLocaleString()}</span> conferences
          </div>
        </div>

        {/* Table — ALL 12 columns from old dashboard */}
        <div className="overflow-x-auto scroll-thin">
          <div style={{ maxHeight: rows.length > 10 ? '520px' : 'none', overflowY: rows.length > 10 ? 'auto' : 'visible' }}>
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="admin-thead w-10">
                    <input type="checkbox" className="admin-cb"
                      checked={rows.length > 0 && rows.every(r => selected.has(r.id))}
                      onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th className="admin-thead min-w-[200px]">Title</th>
                  <th className="admin-thead min-w-[180px]">Conference Name</th>
                  <th className="admin-thead min-w-[100px]">Date</th>
                  <th className="admin-thead min-w-[160px]">Authors</th>
                  <th className="admin-thead min-w-[100px]">Type</th>
                  <th className="admin-thead min-w-[100px]">Academic Year</th>
                  <th className="admin-thead min-w-[120px]">Host</th>
                  <th className="admin-thead min-w-[130px]">DOI</th>
                  <th className="admin-thead min-w-[70px]">Link</th>
                  <th className="admin-thead min-w-[120px]">Faculty</th>
                  <th className="admin-thead min-w-[80px]">File</th>
                  <th className="admin-thead min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(conf => {
                  const fd = getFileData(conf);
                  const itemFlags = getItemFlags('conference', conf.id);
                  return (
                    <tr key={conf.id} className="t-row">
                      {/* Checkbox */}
                      <td className="admin-tcell"><input type="checkbox" className="admin-cb"
                        checked={selected.has(conf.id)} onChange={e => toggleOne(conf.id, e.target.checked)} /></td>
                      {/* Title + flag dot + edited badge */}
                      <td className="admin-tcell font-medium">
                        <div className="flex items-start gap-1.5">
                          {itemFlags.length > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                              <AdminFlagDot color={itemFlags.some((f: any) => f.status === 'flagged') ? 'red' : 'amber'} />
                              <button onClick={() => handleDeleteFlag(itemFlags[0].id)} title="Remove flag"
                                className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center text-[10px] leading-none flex-shrink-0">✕</button>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[13px] leading-snug line-clamp-2">{conf.title}</div>
                            <EditedBadge by={(conf as any).lastEditedBy} at={(conf as any).lastEditedAt} />
                          </div>
                        </div>
                      </td>
                      {/* Conference Name */}
                      <td className="admin-tcell text-[13px]">{conf.conferenceName}</td>
                      {/* Date */}
                      <td className="admin-tcell text-[12px] whitespace-nowrap">
                        {conf.date ? new Date(conf.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-xs text-slate-400">N/A</span>}
                      </td>
                      {/* Authors */}
                      <td className="admin-tcell text-[12px]">{Array.isArray(conf.authors) ? conf.authors.join(', ') : conf.authors}</td>
                      {/* Type */}
                      <td className="admin-tcell">
                        <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: conf.type === 'International' ? '#101A24' : '#10B981' }}>
                          {conf.type}
                        </span>
                      </td>
                      {/* Academic Year */}
                      <td className="admin-tcell text-[12px]">{conf.academicYear}</td>
                      {/* Host */}
                      <td className="admin-tcell text-[12px]">{conf.host}</td>
                      {/* DOI */}
                      <td className="admin-tcell"><span className="font-mono text-[11px]">{conf.doi}</span></td>
                      {/* Link */}
                      <td className="admin-tcell">{conf.link ? <a href={conf.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: '#101A24' }}>
                        <ExternalLink className="w-3 h-3 mr-1" />View</a> : <span className="text-xs text-slate-400">—</span>}</td>
                      {/* Faculty */}
                      <td className="admin-tcell text-[12px]">{conf.facultyName}</td>
                      {/* File */}
                      <td className="admin-tcell">{fd ? (
                        <div className="flex gap-1">
                          <button onClick={() => openFile(fd, (conf as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[#E5DDC6]/30 text-[#101A24] flex items-center justify-center">
                            <ExternalLink className="w-3.5 h-3.5" /></button>
                          <button onClick={() => downloadFile(fd, (conf as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
                            <Download className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : <span className="text-xs text-slate-400">No file</span>}</td>
                      {/* Actions */}
                      <td className="admin-tcell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingConf(conf)}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget({ id: conf.id, title: conf.title || '' })}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <EmptyState icon="users" title="No conferences found" hint="Try adjusting your search or filters" />}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1–{rows.length} of {allConferences.length}</span>
        </div>
      </AdminCard>

      {/* Modals */}
      <DeleteConfirmModal open={!!deleteTarget} title={deleteTarget?.title || ''}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      {editingConf && <AddConferenceForm isOpen={!!editingConf} onClose={() => setEditingConf(null)} onSubmit={handleEditConf} initialData={editingConf} />}
      <FlagModal isOpen={isFlagModalOpen} onClose={() => { setIsFlagModalOpen(false); setSelected(new Set()); }}
        selectedItems={flagModalItems} itemType="conference" onSuccess={loadAllData} />
      <ExportConfModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

export default AdminConferencesPage;
