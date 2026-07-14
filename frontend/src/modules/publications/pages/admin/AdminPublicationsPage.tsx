// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Publications Table Page
// ALL columns from old dashboard, new glassmorphic UI
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useAdminData } from './AdminLayout';
import {
  AdminCard, AdminSearchInput, QPill,
  AdminFlagDot, Icon, EmptyState
} from './components/ui-kit';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AddPublicationForm } from '../../components/AddPublicationForm';
import { FlagModal } from '../../components/FlagModal';
import { FlagReviewModal } from '../../components/FlagReviewModal';
import { FilterDropdown } from '../../components/FilterDropdown';
import { generateAcademicYears, parseAcademicYear } from '../../utils/academicYears';
import { api } from '../../api/publicationsApi';
import type { Publication } from '../../utils/mockData';
import {
  FileDown, Pencil, Trash2, ExternalLink, Download,
  Flag, AlertTriangle
} from 'lucide-react';
import { ExportPubModal } from './components/AdminExportModals';

// ── Edited Badge (from old monolith) ──────────────────────────────
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Publication?</h3>
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

export function AdminPublicationsPage() {
  const { allPublications, allFlags, allPotentialFlags, loadAllData, getItemFlags } = useAdminData();
  const allAcademicYears = generateAcademicYears();

  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagModalItems, setFlagModalItems] = useState<{ id: string; title: string }[]>([]);
  const [reviewFaculty, setReviewFaculty] = useState<{ name: string; flags: any[] } | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const rows = useMemo(() => allPublications.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (p.title || '').toLowerCase().includes(s) ||
      (p.journal || '').toLowerCase().includes(s) ||
      (Array.isArray(p.authors) ? p.authors : []).some(a => (a || '').toLowerCase().includes(s)) ||
      (p.facultyName || '').toLowerCase().includes(s) ||
      (p.doi || '').toLowerCase().includes(s);
    return matchSearch && (year === 'all' || parseAcademicYear(p.academicYear) === year);
  }), [allPublications, search, year]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.publications.delete(deleteTarget.id);
      if (res.success) { setDeleteTarget(null); await loadAllData(); }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleEditPub = async (data: any) => {
    if (!editingPub) return;
    const res = await api.publications.update(editingPub.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingPub(null); } else throw new Error('Failed');
  };

  const handleApproveFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approvedBy: 'Admin' }),
    });
    await loadAllData();
    setReviewFaculty(prev => prev ? { ...prev, flags: prev.flags.map(f => f.id === flagId ? { ...f, status: 'resolved' } : f) } : null);
  };

  const handleDeleteFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAllData();
  };

  const handleEscalatePotentialFlag = async (pfId: number, pubId: string, title: string) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/potential-flags/${pfId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: `Missing required fields detected at import` }),
    });
    await loadAllData();
  };

  const openBulkFlag = () => {
    const items = Array.from(selected).map(id => {
      const pub = allPublications.find(p => p.id === id);
      return { id, title: pub?.title || '' };
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
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Publications</h2>
          <p className="text-sm text-slate-600 mt-1">All indexed journal entries across University</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsExportOpen(true)} className="admin-btn admin-btn-soft admin-btn-sm">
            <FileDown className="w-4 h-4" />Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <AdminCard padded={false} className="overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/40 flex items-center gap-3 flex-wrap">
          <AdminSearchInput value={search} onChange={setSearch}
            placeholder="Search publications…" className="flex-1 min-w-[220px] max-w-md" />
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
            <span className="font-semibold text-slate-800">{rows.length.toLocaleString()}</span> publications
          </div>
        </div>

        {/* Table — ALL 17 columns from old dashboard */}
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
                  <th className="admin-thead min-w-[150px]">Journal</th>
                  <th className="admin-thead min-w-[70px]">Quartile</th>
                  <th className="admin-thead min-w-[90px]">Impact Factor</th>
                  <th className="admin-thead min-w-[90px]">SJR Score</th>
                  <th className="admin-thead min-w-[90px]">CiteScore</th>
                  <th className="admin-thead min-w-[160px]">Authors</th>
                  <th className="admin-thead min-w-[100px]">Position</th>
                  <th className="admin-thead min-w-[90px]">Volume/Issue</th>
                  <th className="admin-thead min-w-[80px]">Pages</th>
                  <th className="admin-thead min-w-[100px]">Date</th>
                  <th className="admin-thead min-w-[100px]">Academic Year</th>
                  <th className="admin-thead min-w-[130px]">DOI</th>
                  <th className="admin-thead min-w-[70px]">Link</th>
                  <th className="admin-thead min-w-[120px]">Faculty</th>
                  <th className="admin-thead min-w-[80px]">File</th>
                  <th className="admin-thead min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(pub => {
                  const fd = getFileData(pub);
                  const itemFlags = getItemFlags('publication', pub.id);
                  const pf = allPotentialFlags?.find((p: any) => String(p.publication_id) === String(pub.id));
                  return (
                    <tr key={pub.id} className="t-row">
                      {/* Checkbox */}
                      <td className="admin-tcell"><input type="checkbox" className="admin-cb"
                        checked={selected.has(pub.id)} onChange={e => toggleOne(pub.id, e.target.checked)} /></td>
                      {/* Title + flag dot + edited badge + potential flag */}
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
                            <div className="text-[13px] leading-snug line-clamp-2">{pub.title}</div>
                            <EditedBadge by={(pub as any).lastEditedBy} at={(pub as any).lastEditedAt} />
                            {pf && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                  ⚠️ Potential — Missing: {pf.missing_fields?.join(', ')}
                                </span>
                                <button onClick={() => handleEscalatePotentialFlag(pf.id, pub.id, pub.title)}
                                  className="text-[10px] text-red-600 hover:text-red-800 underline font-medium">Escalate</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Journal */}
                      <td className="admin-tcell text-[13px]">{pub.journal}</td>
                      {/* Quartile */}
                      <td className="admin-tcell"><QPill q={pub.quartile} /></td>
                      {/* Impact Factor */}
                      <td className="admin-tcell tnum">{pub.impactFactor || <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* SJR Score */}
                      <td className="admin-tcell tnum">{(pub as any).sjrScore || <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* CiteScore */}
                      <td className="admin-tcell tnum">{pub.citeScore || <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* Authors */}
                      <td className="admin-tcell text-[12px]">{Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors}</td>
                      {/* Position */}
                      <td className="admin-tcell text-[12px]">{pub.positionOfAuthor || <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* Volume/Issue */}
                      <td className="admin-tcell tnum text-[12px]">{pub.volume || pub.issue ? `${pub.volume || ''}${pub.issue ? `(${pub.issue})` : ''}` : <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* Pages */}
                      <td className="admin-tcell tnum text-[12px]">{pub.startPage && pub.lastPage ? `${pub.startPage}-${pub.lastPage}` : <span className="text-xs text-slate-400">N/A</span>}</td>
                      {/* Date */}
                      <td className="admin-tcell text-[12px] whitespace-nowrap">{pub.monthYear}</td>
                      {/* Academic Year */}
                      <td className="admin-tcell text-[12px]">{pub.academicYear}</td>
                      {/* DOI */}
                      <td className="admin-tcell"><span className="font-mono text-[11px]">{pub.doi}</span></td>
                      {/* Link */}
                      <td className="admin-tcell">{pub.link ? <a href={pub.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: '#101A24' }}>
                        <ExternalLink className="w-3 h-3 mr-1" />View</a> : <span className="text-xs text-slate-400">—</span>}</td>
                      {/* Faculty */}
                      <td className="admin-tcell text-[12px]">{pub.facultyName}</td>
                      {/* File */}
                      <td className="admin-tcell">{fd ? (
                        <div className="flex gap-1">
                          <button onClick={() => openFile(fd, (pub as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[#E5DDC6]/30 text-[#101A24] flex items-center justify-center">
                            <ExternalLink className="w-3.5 h-3.5" /></button>
                          <button onClick={() => downloadFile(fd, (pub as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
                            <Download className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : <span className="text-xs text-slate-400">No file</span>}</td>
                      {/* Actions */}
                      <td className="admin-tcell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingPub(pub)}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget({ id: pub.id, title: pub.title || '' })}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <EmptyState icon="file-text" title="No publications found" hint="Try adjusting your search or filters" />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1–{rows.length} of {allPublications.length}</span>
        </div>
      </AdminCard>

      {/* Modals */}
      <DeleteConfirmModal open={!!deleteTarget} title={deleteTarget?.title || ''}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      {editingPub && <AddPublicationForm isOpen={!!editingPub} onClose={() => setEditingPub(null)} onSubmit={handleEditPub} initialData={editingPub} />}
      <FlagModal isOpen={isFlagModalOpen} onClose={() => { setIsFlagModalOpen(false); setSelected(new Set()); }}
        selectedItems={flagModalItems} itemType="publication" onSuccess={loadAllData} />
      <FlagReviewModal isOpen={!!reviewFaculty} onClose={() => setReviewFaculty(null)}
        facultyName={reviewFaculty?.name || ''} flags={reviewFaculty?.flags || []}
        onApprove={handleApproveFlag} onApproveAll={async (ids: number[]) => { for (const id of ids) await handleApproveFlag(id); }}
        onDelete={handleDeleteFlag} onRefresh={loadAllData} />
      <ExportPubModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

export default AdminPublicationsPage;
