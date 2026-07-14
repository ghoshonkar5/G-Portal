import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { UniversityLogo as UniversityLogo } from "../../components/UniversityLogo";
import {
  ArrowLeft, Search, Download, RefreshCw, Calendar, ExternalLink, Plus,
  Database, Pencil, Trash2, CheckCircle, AlertTriangle, FileDown,
  CheckSquare, Square, AlertCircle,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { FilterDropdown } from "../../components/FilterDropdown";
import { FlagDetailPopup } from "../../components/FlagDetailPopup";
import { FlagNotificationBanner } from "../../components/FlagNotificationBanner";
import { useAuth } from "../../../../context/AuthContext";
import { api } from "../../api/publicationsApi";
import { generateAcademicYears, parseAcademicYear } from "../../utils/academicYears";
import type { Conference } from "../../utils/mockData";
import { AddConferenceForm } from "../../components/AddConferenceForm";
import { ScopusSyncModal } from "../../components/ScopusSyncModal";
import { WosSyncModal } from "../../components/WosSyncModal";
import { ImportCSVModal } from "../../components/ImportCSVModal";
import { ScholarSyncModal } from "../../components/ScholarSyncModal";

// ── Blinking Dot ──────────────────────────────────────────────────────────────
function BlinkingDot({ color }: { color: 'red' | 'amber' }) {
  return (
    <>
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color === 'red' ? 'bg-red-500' : 'bg-amber-500'
          }`}
        style={{ animation: 'pulse 1s infinite' }}
      />
      <style>{`
        @keyframes flagBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}

// ── Edited Badge ──────────────────────────────────────────────────────────────
function EditedBadge({ by, at }: { by?: string | null; at?: string | null }) {
  if (!by || !at) return null;
  const normalized = at.includes('T') ? at : at.replace(' ', 'T');
  const utc = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : normalized + 'Z';
  const date = new Date(utc);
  const formatted = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      <span className="text-[10px] text-gray-400">Edited by {by} · {formatted}</span>
    </div>
  );
}

// ── Export Columns ────────────────────────────────────────────────────────────
const CONFERENCE_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'conferenceName', label: 'Conference Name' },
  { key: 'date', label: 'Date' },
  { key: 'authors', label: 'Authors' },
  { key: 'type', label: 'Type' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'host', label: 'Host' },
  { key: 'doi', label: 'DOI' },
  { key: 'indexing', label: 'Indexing' },
  { key: 'link', label: 'Link' },
];


// ── Export CSV Modal ──────────────────────────────────────────────────────────
function ExportConferenceCSVModal({
  isOpen, onClose, facultyId, authToken,
}: {
  isOpen: boolean; onClose: () => void; facultyId: string; authToken: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));

  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(CONFERENCE_EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleType = (val: string) =>
    setSelectedType(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const toggleColumn = (key: string) =>
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('facultyId', facultyId);
      if (fromYear) params.set('fromYear', fromYear);
      if (toYear) params.set('toYear', toYear);
      if (selectedType.length === 1) params.set('type', selectedType[0]);
      params.set('columns', selectedColumns.join(','));

      const response = await fetch(
        `/api/conferences/export/csv?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conferences_${facultyId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-5">
            <FileDown className="w-5 h-5 text-[#101A24]" />
            <h2 className="text-lg font-semibold text-gray-900">Export Conferences to CSV</h2>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Year Range</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">From Year</label>
                <select value={fromYear} onChange={e => setFromYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span className="text-gray-400 mt-5">—</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">To Year</label>
                <select value={toYear} onChange={e => setToYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Type</p>
            <div className="flex gap-2">
              {['International', 'National'].map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedType.includes(t) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                    }`}>{t}</button>
              ))}
            </div>
            {selectedType.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all types included</p>}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Select Columns to Export</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedColumns(CONFERENCE_EXPORT_COLUMNS.map(c => c.key))} className="text-xs text-[#101A24] hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setSelectedColumns([])} className="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
              {CONFERENCE_EXPORT_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="w-3.5 h-3.5 accent-teal-600" />
                  <span className={`text-xs ${selectedColumns.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedColumns.length} of {CONFERENCE_EXPORT_COLUMNS.length} columns selected</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              <FileDown className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ConferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingConference, setEditingConference] = useState<Conference | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isScholarSyncOpen, setIsScholarSyncOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);
  // Single delete states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // ── Multi-select delete states ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiDeleteConfirm, setIsMultiDeleteConfirm] = useState(false);
  const [isMultiDeleting, setIsMultiDeleting] = useState(false);

  // ── Flag states ────────────────────────────────────────────────────────────
  const [myFlags, setMyFlags] = useState<any[]>([]);
  const [isFlagPopupOpen, setIsFlagPopupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [focusedFlagItemId, setFocusedFlagItemId] = useState<string | null>(null);
  const [flagBriefingItem, setFlagBriefingItem] = useState<Conference | null>(null);
  const [flagBriefingFlags, setFlagBriefingFlags] = useState<any[]>([]);
  const [pendingResolveAfterEdit, setPendingResolveAfterEdit] = useState<{ itemId: string; flagIds: number[] } | null>(null);
  const [autoConfirmedFlagIds, setAutoConfirmedFlagIds] = useState<Set<number>>(new Set());

  const authToken = localStorage.getItem('token') || '';

  useEffect(() => {
    if (user?.facultyId) {
      loadConferences();
      loadMyFlags();
    }
  }, [user]);

  const loadConferences = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.conferences.getByFaculty(user.facultyId);
      if (response.success && response.data) setConferences(response.data);
    } catch (error) {
      console.error('Failed to load conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyFlags = async () => {
    if (!user?.facultyId) return;
    try {
      const res = await fetch(
        `/api/flags/faculty/${user.facultyId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const json = await res.json();
      if (json.success) setMyFlags(json.data);
    } catch (err) {
      console.error('Failed to load flags:', err);
    }
  };

  const handleMarkResolved = async (flagId: number, note?: string) => {
    try {
      await fetch(`/api/flags/${flagId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ facultyNote: note || '' }),
      });
      await loadMyFlags();
    } catch (err) {
      console.error('Failed to mark resolved:', err);
    }
  };

  // Flags for conferences only
  const confFlags = myFlags.filter(f => f.item_type === 'conference' && f.status !== 'resolved');
  const getItemFlags = (confId: string) => confFlags.filter(f => String(f.item_id) === confId);

  // All active flags (all types) for the banner
  const allActiveFlags = myFlags.filter(f => f.status !== 'resolved');
  const confActiveFlags = allActiveFlags.filter(f => f.item_type === 'conference');
  const crossTypeFlags = allActiveFlags.filter(f => f.item_type !== 'conference');

  const syncConferences = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.syncData(user.facultyId, '');
      if (response.success) { await loadConferences(); setLastSync(new Date()); }
    } catch (error) {
      console.error('Failed to sync conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConference = async (conferenceData: any) => {
    try {
      const response = await api.conferences.create(conferenceData);
      if (response.success) await loadConferences();
      else throw new Error(response.message || 'Failed to add conference');
    } catch (error) {
      console.error('Failed to add conference:', error);
      throw error;
    }
  };

  const handleEditConference = async (conferenceData: any) => {
    if (!editingConference) return;
    try {
      const enrichedData = { ...conferenceData, lastEditedBy: user?.name || user?.facultyId || 'Unknown' };
      const response = await api.conferences.update(editingConference.id, enrichedData);
      if (response.success) {
        await loadConferences();
        setEditingConference(null);
        if (pendingResolveAfterEdit) {
          setFocusedFlagItemId(pendingResolveAfterEdit.itemId);
          setAutoConfirmedFlagIds(new Set(pendingResolveAfterEdit.flagIds));
          setIsFlagPopupOpen(true);
          setPendingResolveAfterEdit(null);
        }
      }
      else throw new Error(response.message || 'Failed to update conference');
    } catch (error) {
      console.error('Failed to edit conference:', error);
      throw error;
    }
  };

  const confirmDelete = (conference: Conference) => {
    setDeleteTargetId(conference.id);
    setDeleteTargetTitle(conference.title);
  };

  const handleDeleteConference = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const response = await api.conferences.delete(deleteTargetId);
      if (response.success) {
        setDeleteTargetId(null);
        setDeleteTargetTitle('');
        await loadConferences();
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      } else {
        alert('Failed to delete conference. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete conference:', error);
      alert('Failed to delete conference. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Multi-select helpers ───────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredConferences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConferences.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMultiDelete = async () => {
    setIsMultiDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => api.conferences.delete(id)));
      setSelectedIds(new Set());
      setIsMultiDeleteConfirm(false);
      await loadConferences();
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (error) {
      alert('Failed to delete some conferences. Please try again.');
    } finally {
      setIsMultiDeleting(false);
    }
  };

  const allAcademicYears = generateAcademicYears();

  const filteredConferences = conferences.filter(conference => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (conference.title || '').toLowerCase().includes(s) ||
      (conference.conferenceName || '').toLowerCase().includes(s) ||
      (Array.isArray(conference.authors) ? conference.authors : []).some(a => (a || '').toLowerCase().includes(s));
    const matchesYear = selectedAcademicYear === 'all' || parseAcademicYear(conference.academicYear) === selectedAcademicYear;
    return matchesSearch && matchesYear;
  });

  const allSelected = filteredConferences.length > 0 && selectedIds.size === filteredConferences.length;
  const someSelected = selectedIds.size > 0;

  const handleDownloadFile = (conference: Conference) => {
    const fileData = (conference as any).fileUrl || conference.fileData;
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = conference.fileName || 'conference.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const googleScholarUrl = user?.googleScholarUrl || '';
  const scopusUrl = user?.scopusUrl || '';
  const wosUrl = user?.wosUrl || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCF7] via-[#F8F6F0] to-[#E5DDC6]/20">

      {/* ── Flag Detail Popup ── */}
      <FlagDetailPopup
        isOpen={isFlagPopupOpen}
        onClose={() => { setIsFlagPopupOpen(false); setFocusedFlagItemId(null); setAutoConfirmedFlagIds(new Set()); }}
        flags={focusedFlagItemId ? allActiveFlags.filter(f => String(f.item_id) === focusedFlagItemId) : allActiveFlags}
        onMarkResolved={handleMarkResolved}
        initialEditConfirmed={autoConfirmedFlagIds}
        onEditItem={(itemId) => {
          setIsFlagPopupOpen(false);
          setFocusedFlagItemId(null);
          const conf = conferences.find(c => String(c.id) === String(itemId));
          if (conf) {
            const flags = getItemFlags(conf.id);
            setFlagBriefingItem(conf);
            setFlagBriefingFlags(flags);
          }
        }}
      />

      {/* ── Single Delete Confirmation Modal ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Conference?</h3>
            <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
            <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{deleteTargetTitle}"</p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }} disabled={isDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleDeleteConference} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Multi Delete Confirmation Modal ── */}
      <Dialog open={isMultiDeleteConfirm} onOpenChange={setIsMultiDeleteConfirm}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {selectedIds.size} Conferences?</h3>
            <p className="text-gray-500 text-sm mb-4">
              You are about to permanently delete <span className="font-semibold text-red-600">{selectedIds.size}</span> selected conference{selectedIds.size !== 1 ? 's' : ''}.
            </p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsMultiDeleteConfirm(false)} disabled={isMultiDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleMultiDelete} disabled={isMultiDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
                {isMultiDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.size}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Success Modal ── */}
      <Dialog open={showDeleteSuccess} onOpenChange={setShowDeleteSuccess}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deleted Successfully!</h3>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export CSV Modal ── */}
      <ExportConferenceCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        facultyId={user?.facultyId || ''}
        authToken={authToken}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B] rounded-b-[24px] relative z-10 shadow-md overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/publications/dashboard')}
                className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <div className="w-px h-5 bg-white/20" />
              <UniversityLogo tone="light" />
              <h1 className="text-base font-semibold text-white">Conferences Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsScopusSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scopus
              </Button>
              <Button onClick={() => setIsWosSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync WoS
              </Button>
              <Button onClick={() => setIsImportCSVOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <FileDown className="w-3.5 h-3.5 mr-2" />Import CSV
              </Button>


              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Conference
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>

        {/* ── Flag Notification Banner — conferences only ── */}
        {confActiveFlags.length > 0 && !bannerDismissed && (
          <FlagNotificationBanner
            flags={confActiveFlags}
            onViewDetails={() => setIsFlagPopupOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* ── Cross-type flag notice ── */}
        {crossTypeFlags.length > 0 && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-1 bg-orange-400 flex-shrink-0" />
              <div className="flex items-center gap-4 px-4 py-3 flex-1">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-900">Unresolved flags in other sections</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {[
                      crossTypeFlags.some(f => f.item_type === 'publication') && `${crossTypeFlags.filter(f => f.item_type === 'publication').length} publication flag${crossTypeFlags.filter(f => f.item_type === 'publication').length > 1 ? 's' : ''}`,
                      crossTypeFlags.some(f => f.item_type === 'book') && `${crossTypeFlags.filter(f => f.item_type === 'book').length} book flag${crossTypeFlags.filter(f => f.item_type === 'book').length > 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ')} need your attention
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {crossTypeFlags.some(f => f.item_type === 'publication') && (
                    <button
                      onClick={() => navigate('/publications/publications')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-white hover:bg-orange-50 border border-orange-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                      Publications
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {crossTypeFlags.filter(f => f.item_type === 'publication').length}
                      </span>
                    </button>
                  )}
                  {crossTypeFlags.some(f => f.item_type === 'book') && (
                    <button
                      onClick={() => navigate('/publications/books')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-white hover:bg-orange-50 border border-orange-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                      Books
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {crossTypeFlags.filter(f => f.item_type === 'book').length}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl text-black mb-2">Conference Presentations</h2>
          <p style={{ color: "#101A24" }}>Your conference presentations are automatically synced from academic databases and conference proceedings.</p>
          {lastSync && <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>}
        </div>

        {/* Search & Filter Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-4" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search by title, conference, or author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-[#101A24]/50 focus:ring-[#101A24]/20" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* ── Multi-select delete bar ── */}
                {someSelected && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-red-700">{selectedIds.size} selected</span>
                    <Button size="sm" onClick={() => setIsMultiDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Delete Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-red-500 hover:bg-red-100 h-7 px-2 text-xs">Clear</Button>
                  </div>
                )}
                <Button onClick={() => setIsExportModalOpen(true)} variant="outline" size="sm" className="border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 h-9 px-3 text-sm">
                  <FileDown className="w-4 h-4 mr-1.5" />Export CSV
                </Button>
                <div className="text-xs text-gray-500">{filteredConferences.length} conference{filteredConferences.length !== 1 ? 's' : ''} found</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conferences Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)" }}>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Conferences Database</span>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{filteredConferences.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConferences.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2 font-medium">No conferences found</div>
                <div className="text-sm text-gray-400 mb-6">Import from an academic database or add manually</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => setIsScholarSyncOpen(true)} className="bg-[#101A24] hover:bg-[#16222E] text-white text-sm h-9 px-4">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scholar
                  </Button>
                  <Button onClick={() => setIsScopusSyncOpen(true)} className="bg-[#101A24] hover:bg-[#16222E] text-white text-sm h-9 px-4">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scopus
                  </Button>
                  <Button onClick={() => setIsWosSyncOpen(true)} className="bg-[#101A24] hover:bg-[#16222E] text-white text-sm h-9 px-4">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync WoS
                  </Button>
                  <Button onClick={() => setIsImportCSVOpen(true)} variant="outline" className="border-[#101A24] text-[#101A24] hover:bg-[#E5DDC6]/30 text-sm h-9 px-4">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Import CSV
                  </Button>
                  <Button onClick={() => setIsAddFormOpen(true)} variant="outline" className="text-sm h-9 px-4">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {/* ── Select-all checkbox ── */}
                      <TableHead className="w-[48px] text-center">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center w-full text-[#101A24] hover:text-[#101A24] transition-colors"
                          title={allSelected ? 'Deselect all' : 'Select all'}
                        >
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[280px] font-semibold text-gray-700">Conference Name</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Date</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Host</TableHead>
                      <TableHead className="w-[180px] font-semibold text-gray-700">DOI</TableHead>
                      <TableHead className="w-[140px] font-semibold text-gray-700">Indexing</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConferences.map((conference) => {
                      const fileData = (conference as any).fileUrl || conference.fileData;
                      const isSelected = selectedIds.has(conference.id);
                      const itemFlags = getItemFlags(conference.id);
                      const isFlagged = itemFlags.length > 0;
                      const flagColor = itemFlags.some(f => f.status === 'flagged') ? 'red' : 'amber';
                      return (
                        <TableRow
                          key={conference.id}
                          className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-[#E5DDC6]/30 hover:bg-[#E5DDC6]/30' : ''} ${isFlagged ? 'bg-red-50/30' : ''}`}
                        >
                          {/* ── Row checkbox ── */}
                          <TableCell className="text-center">
                            <button onClick={() => toggleSelect(conference.id)} className="flex items-center justify-center w-full text-[#101A24] hover:text-[#101A24] transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-1.5">
                              {isFlagged && <div className="mt-1 flex-shrink-0"><BlinkingDot color={flagColor} /></div>}
                              <div>
                                <div className="text-sm leading-tight">{conference.title}</div>
                                <EditedBadge by={(conference as any).lastEditedBy} at={(conference as any).lastEditedAt} />
                                {isFlagged && (
                                  <button
                                    onClick={() => { setFocusedFlagItemId(conference.id); setIsFlagPopupOpen(true); }}
                                    className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
                                  >
                                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: flagColor === 'red' ? '#ef4444' : '#f59e0b', animation: 'pulse 1s infinite' }} />
                                    {itemFlags.length} flag{itemFlags.length > 1 ? 's' : ''} — view & resolve
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.conferenceName}</div></TableCell>
                          <TableCell>{formatDate(conference.date)}</TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.authors.join(', ')}</div></TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: conference.type === 'International' ? '#101A24' : '#10B981' }}>
                              {conference.type}
                            </span>
                          </TableCell>
                          <TableCell><div className="text-sm">{conference.academicYear}</div></TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.host}</div></TableCell>
                          <TableCell>
                            <a href={`https://doi.org/${conference.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs" style={{ color: "#101A24" }}>
                              {conference.doi}
                            </a>
                          </TableCell>
                          <TableCell><div className="text-sm">{conference.indexing}</div></TableCell>
                          <TableCell>
                            <a href={conference.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#101A24" }}>
                              <ExternalLink className="w-3 h-3 mr-1" />View
                            </a>
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { const w = window.open(); w?.document.write(`<html><head><title>${conference.fileName || 'Document'}</title></head><body style="margin:0;">${conference.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;height:auto;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }} className="text-[#101A24] hover:text-[#101A24] hover:bg-[#E5DDC6]/30" title="View file">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(conference)} className="text-[#101A24] hover:text-[#101A24] hover:bg-[#E5DDC6]/30" title="Download file">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No file uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                const flags = getItemFlags(conference.id);
                                if (flags.length > 0) {
                                  setFlagBriefingItem(conference);
                                  setFlagBriefingFlags(flags);
                                } else {
                                  setEditingConference(conference);
                                }
                              }} className="text-[#101A24] hover:text-[#101A24] hover:bg-[#E5DDC6]/30" title="Edit conference">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(conference)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete conference">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {filteredConferences.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader><CardTitle style={{ color: "#101A24" }}>Conference Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                  <p className="text-2xl" style={{ color: "#101A24" }}>{conferences.filter(c => c.type === 'International').length}</p>
                  <p className="text-sm" style={{ color: "#16222E" }}>International</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                  <p className="text-2xl" style={{ color: "#101A24" }}>{conferences.filter(c => c.type === 'National').length}</p>
                  <p className="text-sm" style={{ color: "#16222E" }}>National</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                  <p className="text-2xl" style={{ color: "#101A24" }}>{conferences.length}</p>
                  <p className="text-sm" style={{ color: "#16222E" }}>Total Conferences</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                  <p className="text-2xl" style={{ color: "#101A24" }}>{new Date().getFullYear()}</p>
                  <p className="text-sm" style={{ color: "#16222E" }}>Current Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Database Profiles */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" style={{ color: "#101A24" }} />
              <span style={{ color: "#101A24" }}>Academic Database Profiles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { url: googleScholarUrl, label: 'Google Scholar', desc: 'H-index and comprehensive citations', colorClass: 'from-orange-50 to-orange-100', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
                { url: scopusUrl, label: 'Scopus', desc: 'Publications, citations, and indexing data', colorClass: 'from-blue-50 to-blue-100', textColor: 'text-[#101A24]', iconColor: 'text-[#101A24]' },
                { url: wosUrl, label: 'Web of Science', desc: 'Impact factors and citation metrics', colorClass: 'from-green-50 to-green-100', textColor: 'text-green-700', iconColor: 'text-green-600' },
              ].map(({ url, label, desc, colorClass, textColor, iconColor }) => (
                url ? (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} hover:shadow-md transition-shadow cursor-pointer group`}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className={`text-lg font-semibold ${textColor}`}>{label}</div>
                      <ExternalLink className={`w-4 h-4 ${iconColor} group-hover:translate-x-1 transition-transform`} />
                    </div>
                    <div className={`text-xs ${iconColor}`}>{desc}</div>
                  </a>
                ) : (
                  <div key={label} className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} opacity-50`}>
                    <div className={`text-lg font-semibold ${textColor} mb-1`}>{label}</div>
                    <div className={`text-xs ${iconColor}`}>URL not set — update in profile settings</div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Flag Briefing Modal ── */}
        <Dialog open={!!flagBriefingItem} onOpenChange={() => { setFlagBriefingItem(null); setFlagBriefingFlags([]); }}>
          <DialogContent className="max-w-lg">
            <div className="p-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Review flag before editing</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Understand what needs to be fixed, then proceed to edit</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 border border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Conference</p>
                <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{flagBriefingItem?.title}</p>
              </div>

              <div className="space-y-3 mb-5">
                {flagBriefingFlags.map((flag, i) => (
                  <div key={i} className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-red-100 bg-red-100/60">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" style={{ animation: 'pulse 1s infinite' }} />
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">
                        Flag {flagBriefingFlags.length > 1 ? i + 1 : ''} — {flag.status === 'pending_review' ? 'Pending Review' : 'Action Required'}
                      </span>
                      {flag.created_at && (
                        <span className="text-[10px] text-red-400 ml-auto">
                          {new Date(flag.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-red-800 leading-relaxed">{flag.reason || flag.message || 'No reason provided.'}</p>
                      {flag.flagged_by_name && (
                        <p className="text-[10px] text-red-400 mt-1.5">Flagged by {flag.flagged_by_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6] rounded-lg px-3 py-2.5 mb-5">
                <p className="text-xs text-[#101A24] font-medium mb-1">What to do:</p>
                <ol className="text-xs text-[#101A24] space-y-1 list-decimal list-inside">
                  <li>
                    Edit and fix:{' '}
                    <span className="font-bold text-[#101A24]">
                      {flagBriefingFlags[0]?.reason || 'see flag reason above'}
                    </span>
                  </li>
                  <li>Save your changes</li>
                  <li>A resolve box will open automatically — type what you fixed and submit</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setFlagBriefingItem(null); setFlagBriefingFlags([]); }} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const item = flagBriefingItem;
                    const flags = flagBriefingFlags;
                    setFlagBriefingItem(null);
                    setFlagBriefingFlags([]);
                    if (item) {
                      setPendingResolveAfterEdit({ itemId: item.id, flagIds: flags.map((f: any) => f.id) });
                      setEditingConference(item);
                    }
                  }}
                  className="flex-1 bg-[#101A24] hover:bg-[#16222E] text-white"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Start Editing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AddConferenceForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddConference} />
        {editingConference && (
          <AddConferenceForm isOpen={!!editingConference} onClose={() => setEditingConference(null)} onSubmit={handleEditConference} initialData={editingConference} />
        )}

        {/* ── Scopus Sync Modal ── */}
        <ScopusSyncModal
          isOpen={isScopusSyncOpen}
          onClose={() => setIsScopusSyncOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />

        {/* ── WoS Sync Modal ── */}
        <WosSyncModal
          isOpen={isWosSyncOpen}
          onClose={() => setIsWosSyncOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />
        <ImportCSVModal
          isOpen={isImportCSVOpen}
          onClose={() => setIsImportCSVOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />
        <ScholarSyncModal
          isOpen={isScholarSyncOpen}
          onClose={() => setIsScholarSyncOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />
      </main>

    </div>
  );
}

export default ConferencesPage;