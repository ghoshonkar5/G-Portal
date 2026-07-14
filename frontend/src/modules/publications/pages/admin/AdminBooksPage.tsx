// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Books & Chapters Table Page
// ALL columns from old dashboard, new glassmorphic UI
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useAdminData } from './AdminLayout';
import {
  AdminCard, AdminSearchInput, AdminFlagDot, Icon, EmptyState
} from './components/ui-kit';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AddBookForm } from '../../components/AddBookForm';
import { FlagModal } from '../../components/FlagModal';
import { FilterDropdown } from '../../components/FilterDropdown';
import { generateAcademicYears, parseAcademicYear } from '../../utils/academicYears';
import { api } from '../../api/publicationsApi';
import type { BookChapter } from '../../utils/mockData';
import {
  FileDown, Pencil, Trash2, ExternalLink, Download,
  Flag, AlertTriangle
} from 'lucide-react';
import { ExportBookModal } from './components/AdminExportModals';

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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Book/Chapter?</h3>
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

export function AdminBooksPage() {
  const { allBooksChapters, allFlags, loadAllData, getItemFlags } = useAdminData();
  const allAcademicYears = generateAcademicYears();

  const [search, setSearch] = useState('');
  const [year, setYear] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editingBook, setEditingBook] = useState<BookChapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagModalItems, setFlagModalItems] = useState<{ id: string; title: string }[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const rows = useMemo(() => allBooksChapters.filter(b => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (b.title || '').toLowerCase().includes(s) ||
      (b.authorName || '').toLowerCase().includes(s) ||
      (b.publisher || '').toLowerCase().includes(s) ||
      (b.facultyName || '').toLowerCase().includes(s) ||
      ((b as any).isbnIssn || '').toLowerCase().includes(s);
    return matchSearch && (year === 'all' || parseAcademicYear(b.academicYear) === year);
  }), [allBooksChapters, search, year]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.books.delete(deleteTarget.id);
      if (res.success) { setDeleteTarget(null); await loadAllData(); }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleEditBook = async (data: any) => {
    if (!editingBook) return;
    const res = await api.books.update(editingBook.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingBook(null); } else throw new Error('Failed');
  };

  const handleDeleteFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAllData();
  };

  const openBulkFlag = () => {
    const items = Array.from(selected).map(id => {
      const book = allBooksChapters.find(b => b.id === id);
      return { id, title: book?.title || '' };
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
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-[var(--brand-700)] uppercase tracking-widest mb-1.5">Database</p>
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Books & Chapters</h2>
          <p className="text-sm text-slate-600 mt-1">Authored books, book chapters, edited volumes & monographs</p>
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
            placeholder="Search books & chapters…" className="flex-1 min-w-[220px] max-w-md" />
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
            <span className="font-semibold text-slate-800">{rows.length.toLocaleString()}</span> entries
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
                  <th className="admin-thead min-w-[150px]">Author</th>
                  <th className="admin-thead min-w-[150px]">Department</th>
                  <th className="admin-thead min-w-[130px]">ISBN/ISSN</th>
                  <th className="admin-thead min-w-[140px]">Publisher</th>
                  <th className="admin-thead min-w-[120px]">Month/Year</th>
                  <th className="admin-thead min-w-[100px]">Academic Year</th>
                  <th className="admin-thead min-w-[100px]">Type</th>
                  <th className="admin-thead min-w-[70px]">Link</th>
                  <th className="admin-thead min-w-[120px]">Faculty</th>
                  <th className="admin-thead min-w-[80px]">File</th>
                  <th className="admin-thead min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(item => {
                  const fd = getFileData(item);
                  const itemFlags = getItemFlags('book', item.id);
                  return (
                    <tr key={item.id} className="t-row">
                      {/* Checkbox */}
                      <td className="admin-tcell"><input type="checkbox" className="admin-cb"
                        checked={selected.has(item.id)} onChange={e => toggleOne(item.id, e.target.checked)} /></td>
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
                            <div className="text-[13px] leading-snug line-clamp-2">{item.title}</div>
                            <EditedBadge by={(item as any).lastEditedBy} at={(item as any).lastEditedAt} />
                          </div>
                        </div>
                      </td>
                      {/* Author */}
                      <td className="admin-tcell text-[12px]">{item.authorName}</td>
                      {/* Department */}
                      <td className="admin-tcell text-[12px]">{item.departmentAffiliation}</td>
                      {/* ISBN/ISSN */}
                      <td className="admin-tcell"><span className="font-mono text-[11px]">{(item as any).isbnIssn}</span></td>
                      {/* Publisher */}
                      <td className="admin-tcell text-[12px]">{item.publisher}</td>
                      {/* Month/Year */}
                      <td className="admin-tcell text-[12px]">{item.monthYear}</td>
                      {/* Academic Year */}
                      <td className="admin-tcell text-[12px]">{item.academicYear}</td>
                      {/* Type */}
                      <td className="admin-tcell">
                        <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: item.type === 'Book' ? '#101A24' : '#10B981' }}>
                          {item.type}
                        </span>
                      </td>
                      {/* Link */}
                      <td className="admin-tcell">{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: '#101A24' }}>
                        <ExternalLink className="w-3 h-3 mr-1" />View</a> : <span className="text-xs text-slate-400">—</span>}</td>
                      {/* Faculty */}
                      <td className="admin-tcell text-[12px]">{item.facultyName}</td>
                      {/* File */}
                      <td className="admin-tcell">{fd ? (
                        <div className="flex gap-1">
                          <button onClick={() => openFile(fd, (item as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[#E5DDC6]/30 text-[#101A24] flex items-center justify-center">
                            <ExternalLink className="w-3.5 h-3.5" /></button>
                          <button onClick={() => downloadFile(fd, (item as any).fileName || '')}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
                            <Download className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : <span className="text-xs text-slate-400">No file</span>}</td>
                      {/* Actions */}
                      <td className="admin-tcell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingBook(item)}
                            className="w-7 h-7 rounded-lg hover:bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget({ id: item.id, title: item.title || '' })}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <EmptyState icon="book-open" title="No books or chapters found" hint="Try adjusting your search or filters" />}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1–{rows.length} of {allBooksChapters.length}</span>
        </div>
      </AdminCard>

      <DeleteConfirmModal open={!!deleteTarget} title={deleteTarget?.title || ''}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      {editingBook && <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBook} initialData={editingBook} />}
      <FlagModal isOpen={isFlagModalOpen} onClose={() => { setIsFlagModalOpen(false); setSelected(new Set()); }}
        selectedItems={flagModalItems} itemType="book" onSuccess={loadAllData} />
      <ExportBookModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

export default AdminBooksPage;
