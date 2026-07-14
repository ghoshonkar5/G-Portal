import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { UniversityLogo as UniversityLogo } from "../../components/UniversityLogo";
import { ImportCSVModal } from "../../components/ImportCSVModal";
import {
  ArrowLeft, Search, Download, RefreshCw, Database, Plus, ExternalLink,
  Pencil, Trash2, CheckCircle, AlertTriangle, CheckSquare, Square,
  AlertCircle, X, FileDown, Filter, GitMerge, Link2
} from "lucide-react";

interface SimilarityFlag {
  imported: { title: string; journal: string; year: string; citations: number; link: string };
  skipped: { title: string; journal: string; year: string; citations: number; link: string };
  reason: string;
  similarity: number;
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { AddPublicationForm } from "../../components/AddPublicationForm";
import { FilterDropdown } from "../../components/FilterDropdown";
import { ScholarSyncModal } from "../../components/ScholarSyncModal";
import { FlagDetailPopup } from "../../components/FlagDetailPopup";
import { FlagNotificationBanner } from "../../components/FlagNotificationBanner";
import { useAuth } from "../../../../context/AuthContext";
import { api } from "../../api/publicationsApi";
import { generateAcademicYears, parseAcademicYear } from "../../utils/academicYears";
import type { Publication } from "../../utils/mockData";
import { ScopusSyncModal } from "../../components/ScopusSyncModal";
import { WosSyncModal } from "../../components/WosSyncModal";

interface PublicationsPageProps {
  onBackToDashboard: () => void;
}

// ── Blinking Dot ──────────────────────────────────────────────────────────────
function BlinkingDot({ color }: { color: 'red' | 'amber' }) {
  return (
    <>
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
          color === 'red' ? 'bg-red-500' : 'bg-amber-500'
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

// ── All exportable columns ────────────────────────────────────────────────────
const EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'journal', label: 'Journal' },
  { key: 'quartile', label: 'Quartile' },
  { key: 'impactFactor', label: 'Impact Factor' },
  { key: 'sjrScore', label: 'SJR Score' },
  { key: 'citeScore', label: 'Cite Score' },
  { key: 'wosCitations', label: 'WoS Citations' },
  { key: 'scopusCitations', label: 'Scopus Citations' },
  { key: 'googleCitations', label: 'Google Citations' },
  { key: 'authors', label: 'Authors' },
  { key: 'indexing', label: 'Indexing' },
  { key: 'source', label: 'Source' },
  { key: 'areaOfPaper', label: 'Area of Paper' },
  { key: 'positionOfAuthor', label: 'Author Position' },
  { key: 'volume', label: 'Volume' },
  { key: 'issue', label: 'Issue' },
  { key: 'startPage', label: 'Start Page' },
  { key: 'lastPage', label: 'Last Page' },
  { key: 'monthYear', label: 'Month Year' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'doi', label: 'DOI' },
  { key: 'link', label: 'Link' },
  { key: 'apaFormat', label: 'APA Format' },
];

// ── Indexing options ──────────────────────────────────────────────────────────
const INDEXING_OPTIONS = [
  { value: 'all', label: 'All Indexing' },
  { value: 'Scopus', label: 'Scopus' },
  { value: 'Google Scholar', label: 'Google Scholar' },
  { value: 'Web of Science', label: 'Web of Science' },
  { value: 'PubMed', label: 'PubMed' },
  { value: 'IEEE', label: 'IEEE' },
  { value: 'DBLP', label: 'DBLP' },
];

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

// ── Export CSV Modal ──────────────────────────────────────────────────────────
function ExportCSVModal({
  isOpen,
  onClose,
  facultyId,
  authToken,
}: {
  isOpen: boolean;
  onClose: () => void;
  facultyId: string;
  authToken: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const academicYearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const start = currentYear - i;
    const end = String(start + 1).slice(2);
    return { value: `${start}-${end}`, label: `${start}-${end}` };
  });

  const [filterMode, setFilterMode] = useState<'range' | 'academic'>('range');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedAcademicYearExport, setSelectedAcademicYearExport] = useState('');
  const [selectedIndexing, setSelectedIndexing] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedQuartiles, setSelectedQuartiles] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleIndexing = (val: string) =>
    setSelectedIndexing(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleSource = (val: string) =>
    setSelectedSources(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleQuartile = (val: string) =>
    setSelectedQuartiles(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleColumn = (key: string) =>
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const selectAllColumns = () => setSelectedColumns(EXPORT_COLUMNS.map(c => c.key));
  const clearAllColumns = () => setSelectedColumns([]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      const resolvedFacultyId = facultyId || localStorage.getItem('facultyId') || '';
      if (resolvedFacultyId) params.set('facultyId', resolvedFacultyId);

      if (filterMode === 'range') {
        if (fromYear) params.set('fromYear', fromYear);
        if (toYear) params.set('toYear', toYear);
      } else {
        if (selectedAcademicYearExport) {
          const startYear = selectedAcademicYearExport.split('-')[0];
          params.set('fromYear', startYear);
          params.set('toYear', startYear);
        }
      }

      const activeIndexing = selectedIndexing.filter(x => x !== 'all');
      if (activeIndexing.length > 0) params.set('indexing', activeIndexing.join(','));
      if (selectedSources.length > 0) params.set('source', selectedSources.join(','));
      if (selectedQuartiles.length > 0) params.set('quartile', selectedQuartiles.join(','));
      params.set('columns', selectedColumns.join(','));

      const currentToken = localStorage.getItem('token') || authToken;
      const response = await fetch(
        `/api/publications/export/csv?${params.toString()}`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `publications_${facultyId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
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
            <h2 className="text-lg font-semibold text-gray-900">Export Publications to CSV</h2>
          </div>

          {/* Year Filter Mode Toggle */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Year</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setFilterMode('range'); setSelectedAcademicYearExport(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterMode === 'range'
                    ? 'bg-[#101A24] text-white border-[#101A24]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                }`}
              >
                Year Range
              </button>
              <button
                onClick={() => { setFilterMode('academic'); setFromYear(''); setToYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterMode === 'academic'
                    ? 'bg-[#101A24] text-white border-[#101A24]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                }`}
              >
                Academic Year
              </button>
            </div>

            {filterMode === 'range' ? (
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
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Select Academic Year</label>
                <select value={selectedAcademicYearExport} onChange={e => setSelectedAcademicYearExport(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                  <option value="">All Academic Years</option>
                  {academicYearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Quartile Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Quartile</p>
            <div className="flex flex-wrap gap-2">
             {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
  const activeColors: Record<string, string> = {
    Q1: '#16a34a', Q2: '#2563eb', Q3: '#f97316', Q4: '#ef4444'
  };
  const isActive = selectedQuartiles.includes(q);
  return (
    <button
      key={q}
      onClick={() => toggleQuartile(q)}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={isActive
        ? { backgroundColor: activeColors[q], color: 'white', borderColor: activeColors[q] }
        : { backgroundColor: 'white', color: '#4b5563', borderColor: '#d1d5db' }
      }
    >{q}</button>
  );
})}
            </div>
            {selectedQuartiles.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all quartiles included</p>}
          </div>

          {/* Indexing Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Indexing</p>
            <div className="flex flex-wrap gap-2">
              {['Scopus', 'Google Scholar', 'Web of Science'].map(idx => (
                <button key={idx} onClick={() => toggleIndexing(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedIndexing.includes(idx)
                      ? 'bg-[#101A24] text-white border-[#101A24]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                  }`}>{idx}</button>
              ))}
            </div>
            {selectedIndexing.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all indexing included</p>}
          </div>

          {/* Source Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Import Source</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'google_scholar', label: 'Google Scholar' },
                { value: 'scopus', label: 'Scopus' },
                { value: 'web_of_science', label: 'Web of Science' },
                { value: 'manual', label: 'Manually Added' },
              ].map(src => (
                <button key={src.value} onClick={() => toggleSource(src.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedSources.includes(src.value)
                      ? 'bg-[#101A24] text-white border-[#101A24]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                  }`}>{src.label}</button>
              ))}
            </div>
            {selectedSources.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all sources included</p>}
          </div>

          {/* Column Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Select Columns to Export</p>
              <div className="flex gap-2">
                <button onClick={selectAllColumns} className="text-xs text-[#101A24] hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAllColumns} className="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
              {EXPORT_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="w-3.5 h-3.5 accent-teal-600" />
                  <span className={`text-xs ${selectedColumns.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedColumns.length} of {EXPORT_COLUMNS.length} columns selected</p>
          </div>

          {/* Actions */}
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
export function PublicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
const [selectedIndexingFilter, setSelectedIndexingFilter] = useState<string[]>([]);



  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [isScholarModalOpen, setIsScholarModalOpen] = useState(false);
const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);

  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // Single delete states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Multi-select delete states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiDeleteConfirm, setIsMultiDeleteConfirm] = useState(false);
  const [isMultiDeleting, setIsMultiDeleting] = useState(false);

  // Similarity warnings state
  const [similarityWarnings, setSimilarityWarnings] = useState<SimilarityFlag[]>([]);

  // ── Flag states ────────────────────────────────────────────────────────────
  const [myFlags, setMyFlags] = useState<any[]>([]);
  const [isFlagPopupOpen, setIsFlagPopupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [potentialFlags, setPotentialFlags] = useState<any[]>([]);
  const [potentialFlagNotes, setPotentialFlagNotes] = useState<Record<number, string>>({});
  const [submittingPotential, setSubmittingPotential] = useState<number | null>(null);
const [potentialFlagErrors, setPotentialFlagErrors] = useState<Record<number, string>>({});
const [focusedFlagItemId, setFocusedFlagItemId] = useState<string | null>(null);
const [flagBriefingPub, setFlagBriefingPub] = useState<Publication | null>(null);
const [flagBriefingFlags, setFlagBriefingFlags] = useState<any[]>([]);
const [pendingResolveAfterEdit, setPendingResolveAfterEdit] = useState<{ pubId: string; flagIds: number[] } | null>(null);
const [autoConfirmedFlagIds, setAutoConfirmedFlagIds] = useState<Set<number>>(new Set());
const [flagBriefingIsPotential, setFlagBriefingIsPotential] = useState(false);
const [pendingResolveAfterEditPF, setPendingResolveAfterEditPF] = useState<number | null>(null);
const [pfEditConfirmed, setPfEditConfirmed] = useState<Set<number>>(new Set());


  const [expandedPotential, setExpandedPotential] = useState<number | null>(null);
  const authToken = localStorage.getItem('token') || '';

   useEffect(() => {
    if (user?.facultyId) {
      loadPublications();
      loadMyFlags();
      loadPotentialFlags();
    }
  }, [user]);

  const loadPublications = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.publications.getByFaculty(user.facultyId);
      if (response.success && response.data) setPublications(response.data);
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Load flags for this faculty ───────────────────────────────────────────
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

// FIND:
  // ── Mark a flag resolved ──────────────────────────────────────────────────

// REPLACE WITH:
  // ── Load potential flags ──────────────────────────────────────────────────
  const loadPotentialFlags = async () => {
    if (!user?.facultyId) return;
    try {
      const res = await fetch(
        `/api/potential-flags/faculty/${user.facultyId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const json = await res.json();
      if (json.success) setPotentialFlags(json.data);
    } catch (err) {
      console.error('Failed to load potential flags:', err);
    }
  };

  // ── Submit potential flag fix ─────────────────────────────────────────────
 const handlePotentialFlagSubmit = async (pfId: number) => {
    setSubmittingPotential(pfId);
    setPotentialFlagErrors(prev => ({ ...prev, [pfId]: '' }));
    try {
      const res = await fetch(
        `/api/potential-flags/${pfId}/resolve`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ facultyNote: 'auto-verified' }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setPotentialFlags(prev => prev.filter(pf => pf.id !== pfId));
        setPotentialFlagNotes(prev => { const n = { ...prev }; delete n[pfId]; return n; });
        setPotentialFlagErrors(prev => { const n = { ...prev }; delete n[pfId]; return n; });
        setPfEditConfirmed(prev => { const n = new Set(prev); n.delete(pfId); return n; });
        setExpandedPotential(null);
        await loadPublications();
      } else {
        setPotentialFlagErrors(prev => ({
          ...prev,
          [pfId]: json.message || 'Fields still missing. Please edit the publication first.',
        }));
      }
    } catch (err) {
      setPotentialFlagErrors(prev => ({ ...prev, [pfId]: 'Failed to verify. Please try again.' }));
    } finally {
      setSubmittingPotential(null);
    }
  };

  // ── Mark a flag resolved ──────────────────────────────────────────────────
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

  // ── Flags for publications only ───────────────────────────────────────────
  const pubFlags = myFlags.filter(f => f.item_type === 'publication' && f.status !== 'resolved');
  const flaggedPubIds = new Set(pubFlags.map(f => String(f.item_id)));

  const getItemFlags = (pubId: string) =>
    pubFlags.filter(f => String(f.item_id) === pubId);

  const handleAddPublication = async (publicationData: any) => {
    try {
      const enrichedData = { ...publicationData, apaFormat: generateAPAFormat(publicationData) };
      const response = await api.publications.create(enrichedData);
      if (response.success) await loadPublications();
      else throw new Error(response.message || 'Failed to add publication');
    } catch (error: any) {
      console.error('Failed to add publication:', error);
      throw error;
    }
  };

  const handleEditPublication = async (publicationData: any) => {
    if (!editingPublication) return;
    try {
      const enrichedData = {
        ...publicationData,
        apaFormat: generateAPAFormat(publicationData),
        lastEditedBy: user?.name || user?.facultyId || 'Unknown',
      };
      const response = await api.publications.update(editingPublication.id, enrichedData);
if (response.success) {
        await loadPublications();
        setEditingPublication(null);
        if (pendingResolveAfterEdit) {
          setFocusedFlagItemId(pendingResolveAfterEdit.pubId);
          setAutoConfirmedFlagIds(new Set(pendingResolveAfterEdit.flagIds));
          setIsFlagPopupOpen(true);
          setPendingResolveAfterEdit(null);
        }
        if (pendingResolveAfterEditPF !== null) {
          setExpandedPotential(pendingResolveAfterEditPF);
          setPfEditConfirmed(prev => new Set([...prev, pendingResolveAfterEditPF]));
          setPendingResolveAfterEditPF(null);
        }
      }

      else throw new Error(response.message || 'Failed to update publication');
    } catch (error) {
      console.error('Failed to edit publication:', error);
      throw error;
    }
  };

  const confirmDelete = (publication: Publication) => {
    setDeleteTargetId(publication.id);
    setDeleteTargetTitle(publication.title);
  };

  const handleDeletePublication = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const response = await api.publications.delete(deleteTargetId);
      if (response.success) {
        setDeleteTargetId(null);
        setDeleteTargetTitle('');
        await loadPublications();
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      } else {
        alert('Failed to delete publication. Please try again.');
      }
    } catch (error) {
      alert('Failed to delete publication. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPublications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPublications.map(p => p.id)));
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
      await Promise.all([...selectedIds].map(id => api.publications.delete(id)));
      setSelectedIds(new Set());
      setIsMultiDeleteConfirm(false);
      await loadPublications();
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (error) {
      alert('Failed to delete some publications. Please try again.');
    } finally {
      setIsMultiDeleting(false);
    }
  };

  const generateAPAFormat = (data: any): string => {
    const authors = Array.isArray(data.authors) ? data.authors.join(', ') : data.authors;
    const year = data.monthYear?.split(' ')?.[1] || new Date().getFullYear();
    let apa = `${authors} (${year}). ${data.title}. ${data.journal}`;
    if (data.volume) apa += `, ${data.volume}`;
    if (data.issue) apa += `(${data.issue})`;
    if (data.startPage && data.lastPage) apa += `, ${data.startPage}-${data.lastPage}`;
    if (data.doi) apa += `. https://doi.org/${data.doi}`;
    return apa + '.';
  };

  const allAcademicYears = generateAcademicYears();
  const googleScholarUrl = user?.googleScholarUrl || '';
  const scopusUrl = user?.scopusUrl || '';
  const wosUrl = user?.wosUrl || '';

  const filteredPublications = publications.filter(pub => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (pub.title || '').toLowerCase().includes(s) ||
      (pub.journal || '').toLowerCase().includes(s) ||
      (Array.isArray(pub.authors) ? pub.authors : []).some(a => (a || '').toLowerCase().includes(s));
    const matchesYear = selectedAcademicYear === 'all' || parseAcademicYear(pub.academicYear) === selectedAcademicYear;
    const matchesIndexing = selectedIndexingFilter.length === 0 ||
  selectedIndexingFilter.every(f =>
    (pub.indexing || '').toLowerCase().includes(f.toLowerCase())
  );
    return matchesSearch && matchesYear && matchesIndexing;
  });

  const allSelected = filteredPublications.length > 0 && selectedIds.size === filteredPublications.length;
  const someSelected = selectedIds.size > 0;

  const handleDownloadFile = (publication: Publication) => {
    const fileData = (publication as any).fileUrl || publication.fileData;
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = publication.fileName || 'publication.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const stats = {
    total: publications.length,
    q1: publications.filter(p => p.quartile === 'Q1').length,
    q2: publications.filter(p => p.quartile === 'Q2').length,
    q3q4: publications.filter(p => p.quartile === 'Q3' || p.quartile === 'Q4').length,
    scopus: publications.filter(p => (p.indexing || '').toLowerCase().includes('scopus')).length,
    scholar: publications.filter(p => (p.indexing || '').toLowerCase().includes('google scholar')).length,
    wos: publications.filter(p => {
      const idx = (p.indexing || '').toLowerCase();
      return idx.includes('web of science') || idx.includes('wos');
    }).length,
  };

// All flags (all types) for banner + popup — show unresolved only
  const allActiveFlags = myFlags.filter(f => f.status !== 'resolved');
  const pubActiveFlags  = allActiveFlags.filter(f => f.item_type === 'publication');
  const crossTypeFlags  = allActiveFlags.filter(f => f.item_type !== 'publication');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCF7] via-[#F8F6F0] to-[#E5DDC6]/20">

      {/* ── Scholar Sync Modal ── */}
      {/* ── Scholar Sync Modal ── */}
      <ScholarSyncModal
        isOpen={isScholarModalOpen}
        onClose={() => setIsScholarModalOpen(false)}
        onImportComplete={async (report) => {
          await loadPublications();
          setLastSync(new Date());
          if (report && report.length > 0) setSimilarityWarnings(report);
        }}
      />
      <ImportCSVModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />

      {/* ── Scopus Sync Modal ── */}
      <ScopusSyncModal
        isOpen={isScopusSyncOpen}
        onClose={() => setIsScopusSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />

      {/* ── WoS Sync Modal ── */}
      <WosSyncModal
        isOpen={isWosSyncOpen}
        onClose={() => setIsWosSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />


      {/* ── Export CSV Modal ── */}
      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        facultyId={user?.facultyId || user?.faculty_id || ''}
        authToken={authToken}
      />

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
          const pub = publications.find(p => String(p.id) === String(itemId));
          if (pub) {
            const flags = getItemFlags(pub.id);
            setFlagBriefingPub(pub);
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Publication?</h3>
            <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
            <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{deleteTargetTitle}"</p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }} disabled={isDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleDeletePublication} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {selectedIds.size} Publications?</h3>
            <p className="text-gray-500 text-sm mb-4">
              You are about to permanently delete <span className="font-semibold text-red-600">{selectedIds.size}</span> selected publication{selectedIds.size !== 1 ? 's' : ''}.
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

      {/* Header */}
      <header className="bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B] rounded-b-[24px] relative z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left: Back + Logo + Title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => navigate('/publications/dashboard')}
                className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <div className="w-px h-5 bg-white/20" />
              <UniversityLogo tone="light" />
              <h1 className="text-base font-semibold text-white">Publications Management</h1>
            </div>

      {/* Right: Action buttons — scroll horizontally on small screens */}
      <div className="flex items-center gap-2 overflow-x-auto flex-shrink-0 max-w-[60%]">
        <Button onClick={() => setIsScholarModalOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scholar
        </Button>
        <Button onClick={() => setIsScopusSyncOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scopus
        </Button>
        <Button onClick={() => setIsWosSyncOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync WoS
        </Button>
        <Button onClick={() => setIsImportCSVOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Import CSV
        </Button>
        <Button onClick={() => setIsAddFormOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Publication
        </Button>
      </div>

    </div>
  </div>
</header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>

        {/* ── Flag Notification Banner — publications only ── */}
        {pubActiveFlags.length > 0 && !bannerDismissed && (
          <FlagNotificationBanner
            flags={pubActiveFlags}
            onViewDetails={() => setIsFlagPopupOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

       {/* ── Cross-type flag notice ── */}
        {crossTypeFlags.length > 0 && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm overflow-hidden">
            <div className="flex items-stretch">
              {/* Left accent bar */}
              <div className="w-1 bg-orange-400 flex-shrink-0" />
              <div className="flex items-center gap-4 px-4 py-3 flex-1">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-900">Unresolved flags in other sections</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {[
                      crossTypeFlags.some(f => f.item_type === 'conference') && `${crossTypeFlags.filter(f => f.item_type === 'conference').length} conference flag${crossTypeFlags.filter(f => f.item_type === 'conference').length > 1 ? 's' : ''}`,
                      crossTypeFlags.some(f => f.item_type === 'book') && `${crossTypeFlags.filter(f => f.item_type === 'book').length} book flag${crossTypeFlags.filter(f => f.item_type === 'book').length > 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ')} need your attention
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {crossTypeFlags.some(f => f.item_type === 'conference') && (
                    <button
                      onClick={() => navigate('/publications/conferences')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-white hover:bg-orange-50 border border-orange-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                      Conferences
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {crossTypeFlags.filter(f => f.item_type === 'conference').length}
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
          <h2 className="text-2xl font-semibold text-[#101A24] mb-2">Publications Portfolio</h2>
          <p className="text-[#101A24]">Sync from Google Scholar, Scopus or import a Scopus CSV export, or add publications manually.</p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>
          )}
        </div>

        {/* ── Similarity Warnings Card ── */}
        {similarityWarnings.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm transition-all duration-300">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-amber-200/60 bg-amber-50/95 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-1.5 text-amber-600 mt-0.5 shadow-sm border border-amber-200/50">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    Similarity Report — {similarityWarnings.length} potential duplicate{similarityWarnings.length > 1 ? 's' : ''} skipped
                  </h3>
                  <p className="mt-1 text-xs text-amber-700/80 max-w-[90%]">
                    We automatically imported the most relevant entry from each similar pair. If a skipped entry is actually a distinct paper, you can add it manually.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSimilarityWarnings([])} 
                className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 focus:ring-offset-amber-50"
                aria-label="Dismiss warnings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
          {similarityWarnings.map((flag, i) => {
                const isHighMatch = flag.similarity >= 90;
                return (
                  <div 
                    key={i} 
                    className="flex rounded-2xl border border-amber-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Accent bar */}
                    <div className="w-1.5 bg-amber-400 flex-shrink-0" />

                    <div className="flex-1 p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                            <GitMerge className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500">Possible Duplicate</span>
                        </div>
                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          isHighMatch 
                            ? 'text-red-700 bg-red-50 border-red-200' 
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {flag.similarity}% Match
                        </span>
                      </div>

                      {/* Timeline */}
                      <div className="relative pl-1">
                        <div className="absolute left-[9px] top-[18px] bottom-[18px] w-px bg-amber-200" />

                        {/* KEPT */}
                        <div className="relative flex items-start gap-3 pb-3">
                          <div className="relative z-10 mt-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">Kept</span>
                              <p className="text-sm font-semibold text-gray-900 leading-snug">{flag.imported.title}</p>
                            </div>
                            {flag.imported.link && (
                              <a 
                                href={flag.imported.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="shrink-0 rounded-lg p-1.5 text-[#101A24] hover:bg-[#E5DDC6]/30 transition-colors mt-2"
                                aria-label="Open imported entry"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="relative pb-3 pl-[27px]">
                          <span className="text-[11px] font-medium text-gray-400">
                            {flag.imported.year === flag.skipped.year && flag.imported.year 
                              ? `Both published in ${flag.imported.year}` 
                              : 'Similar metadata detected'}
                          </span>
                        </div>

                        {/* SKIPPED */}
                        <div className="relative flex items-start gap-3">
                          <div className="relative z-10 mt-0.5 w-[18px] h-[18px] rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <X className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Skipped</span>
                              <p className="text-sm text-gray-500 leading-snug">{flag.skipped.title}</p>
                            </div>
                            {flag.skipped.link && (
                              <a 
                                href={flag.skipped.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mt-2"
                                aria-label="Open skipped entry"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex flex-wrap items-center gap-3" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />

<div className="flex items-center gap-2 flex-wrap">
{['Scopus', 'Google Scholar', 'WoS'].map(idx => {
    const active = selectedIndexingFilter.includes(idx);
    return (
      <button
        key={idx}
        onClick={() =>
          setSelectedIndexingFilter(prev =>
            prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
          )
        }
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          active
            ? 'bg-[#101A24] text-white border-[#101A24] shadow-sm'
            : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50 hover:text-[#101A24]'
        }`}
      >
        {active ? '✓ ' : ''}{idx}
      </button>
    );
  })}
  {selectedIndexingFilter.length > 0 && (
    <button
      onClick={() => setSelectedIndexingFilter([])}
      className="px-2 py-1.5 rounded-full text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
    >
      Clear
    </button>
  )}
</div>
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search publications by title, journal, or author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-[#101A24]/50 focus:ring-[#101A24]/20" />
                </div>
              </div>

              <div className="flex items-center gap-3">
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
                <div className="text-xs text-gray-500">{filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''} found</div>
              </div>
            </div>

{(selectedIndexingFilter.length > 0 || selectedAcademicYear !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Active filters:</span>
                {selectedAcademicYear !== 'all' && (
                  <span className="flex items-center gap-1 text-xs bg-[#E5DDC6]/50 text-[#101A24] px-2 py-0.5 rounded-full">
                    {selectedAcademicYear}
                    <button onClick={() => setSelectedAcademicYear('all')} className="hover:text-[#101A24]"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedIndexingFilter.map(f => (
  <span key={f} className="flex items-center gap-1 text-xs bg-[#E5DDC6]/50 text-[#101A24] px-2 py-0.5 rounded-full">
    {f}
    <button onClick={() => setSelectedIndexingFilter(prev => prev.filter(x => x !== f))} className="hover:text-[#101A24]"><X className="w-3 h-3" /></button>
  </span>
))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Publications Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ marginTop: '24px', position: 'relative', zIndex: 1 }}>
          <CardHeader className="bg-gradient-to-r from-[#101A24] to-[#16222E] text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Publications Database</span>
                <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{filteredPublications.length} records</span>
              </div>
              <Button
                onClick={() => navigate('/publications/krc')}

                className="text-white border text-xs h-7 px-3 whitespace-nowrap flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                KRC View
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPublications.length === 0 ? (
              <div className="text-center py-16">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2 font-medium">No publications found</div>
                <div className="text-sm text-gray-400 mb-6">Import from an academic database or add manually</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => setIsScholarModalOpen(true)} className="bg-[#101A24] hover:bg-[#16222E] text-white text-sm h-9 px-4">
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
                      <TableHead className="w-[48px] text-center">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center w-full text-[#101A24] hover:text-[#101A24] transition-colors" title={allSelected ? 'Deselect all' : 'Select all'}>
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Journal</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Quartile</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Impact Factor</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">SJR Score</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">CiteScore</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">WOS Citations</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Scopus Citations</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Google Citations</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Indexing</TableHead>
                      <TableHead className="w-[150px] font-semibold text-gray-700">Area / Doc Type</TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">APA Format</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Author Position</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Volume</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Issue</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Pages</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Month Year</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[150px] font-semibold text-gray-700">DOI</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublications.map((publication) => {
                      const fileData = (publication as any).fileUrl || publication.fileData;
                      const isSelected = selectedIds.has(publication.id);
                      const itemFlags = getItemFlags(publication.id);
                      const isFlagged = itemFlags.length > 0;
                      const flagColor = itemFlags.some(f => f.status === 'flagged') ? 'red' : 'amber';
                      return (
                        <TableRow
                          key={publication.id}
                          className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-[#E5DDC6]/30 hover:bg-[#E5DDC6]/30' : ''} ${isFlagged ? 'bg-red-50/30' : ''}`}
                        >
                          <TableCell className="text-center">
                            <button onClick={() => toggleSelect(publication.id)} className="flex items-center justify-center w-full text-[#101A24] hover:text-[#101A24] transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-1.5">
                              {isFlagged && <div className="mt-1 flex-shrink-0"><BlinkingDot color={flagColor} /></div>}
                              <div>
                                <div className="text-sm leading-tight">{publication.title}</div>
                                <EditedBadge by={(publication as any).lastEditedBy} at={(publication as any).lastEditedAt} />
                             {isFlagged && (
  <button
    onClick={() => { setFocusedFlagItemId(publication.id); setIsFlagPopupOpen(true); }}
    className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
  >
    <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', backgroundColor: flagColor === 'red' ? '#ef4444' : '#f59e0b', animation:'pulse 1s infinite' }} />
    {itemFlags.length} flag{itemFlags.length > 1 ? 's' : ''} — view & resolve
  </button>
)}
                                {(() => {
                                  const pf = potentialFlags.find(p => String(p.publication_id) === publication.id);
                                  if (!pf) return null;
                                  const isExpanded = expandedPotential === pf.id;
                                  return (
                                    <div className="mt-1.5">
                                      <button
                                        onClick={() => setExpandedPotential(isExpanded ? null : pf.id)}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200"
                                      >
                                        <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', backgroundColor:'#f59e0b', animation:'pulse 1s infinite' }} />
                                        ⚠️ Missing: {pf.missing_fields.join(', ')} — Fix & Submit
                                      </button>
                                      {isExpanded && (() => {
                                        const hasConfirmed = pfEditConfirmed.has(pf.id);
                                        return (
                                          <div style={{ marginTop: '8px', borderRadius: '12px', border: '1px solid #fcd34d', backgroundColor: '#fffbeb', overflow: 'hidden', display: 'flex' }}>
                                            {/* Left accent bar */}
                                            <div style={{ width: '4px', flexShrink: 0, backgroundColor: '#f59e0b' }} />
                                            <div style={{ flex: 1, minWidth: 0, padding: '10px 12px' }}>

                                              {/* Missing fields badge */}
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', padding: '3px 8px', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Missing</span>
                                                <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 600 }}>{pf.missing_fields.join(', ')}</span>
                                              </div>

                                              {/* STEP 1 — Edit gate */}
                                              {!hasConfirmed && (
                                                <div>
                                                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '3px' }}>
                                                    Fill in: <strong>{pf.missing_fields.join(', ')}</strong>
                                                  </p>
                                                  <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '10px', lineHeight: 1.5 }}>
                                                    Edit the publication to add the missing fields, then click verify below.
                                                  </p>
                                                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                                                    <button
                                                      onClick={() => {
                                                        setFlagBriefingPub(publication);
                                                        setFlagBriefingFlags([pf]);
                                                        setFlagBriefingIsPotential(true);
                                                      }}
                                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', backgroundColor: '#d97706', color: 'white', fontSize: '11px', fontWeight: 600, padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%' }}
                                                    >
                                                      <Pencil style={{ width: '11px', height: '11px' }} />
                                                      Go Edit Publication
                                                    </button>
                                                    <button
                                                      onClick={() => setPfEditConfirmed(prev => new Set([...prev, pf.id]))}
                                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', backgroundColor: 'white', color: '#d97706', fontSize: '11px', fontWeight: 600, padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #d97706', cursor: 'pointer', width: '100%' }}
                                                    >
                                                      <CheckCircle style={{ width: '11px', height: '11px' }} />
                                                      I've Already Fixed It
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              {/* STEP 2 — Verify */}
                                              {hasConfirmed && (
                                                <div>
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', padding: '4px 8px', marginBottom: '10px' }}>
                                                    <CheckCircle style={{ width: '11px', height: '11px', color: '#16a34a' }} />
                                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#166534' }}>Edit confirmed — click verify to auto-check</span>
                                                  </div>
                                                  <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '10px', lineHeight: 1.5 }}>
                                                    The system will check if <strong>{pf.missing_fields.join(', ')}</strong> are now filled. If yes, the flag is removed automatically.
                                                  </p>

                                                  {potentialFlagErrors[pf.id] && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 8px', marginBottom: '8px' }}>
                                                      <AlertCircle style={{ width: '11px', height: '11px', color: '#dc2626', flexShrink: 0 }} />
                                                      <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 500 }}>{potentialFlagErrors[pf.id]}</span>
                                                    </div>
                                                  )}

                                                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
                                                    <button
                                                      onClick={() => handlePotentialFlagSubmit(pf.id)}
                                                      disabled={submittingPotential === pf.id}
                                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', backgroundColor: '#101A24', color: 'white', fontSize: '11px', fontWeight: 600, padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: submittingPotential === pf.id ? 'not-allowed' : 'pointer', opacity: submittingPotential === pf.id ? 0.7 : 1, width: '100%' }}
                                                    >
                                                      <CheckCircle style={{ width: '11px', height: '11px' }} />
                                                      {submittingPotential === pf.id ? 'Verifying...' : '✓ Verify & Resolve'}
                                                    </button>
                                                    <button
                                                      onClick={() => setPfEditConfirmed(prev => { const n = new Set(prev); n.delete(pf.id); return n; })}
                                                      style={{ fontSize: '10px', color: '#6b7280', padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontWeight: 500 }}
                                                    >
                                                      ← Back
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{publication.journal}</TableCell>
                          <TableCell>
                            {publication.quartile ? (
  <span className={`px-2 py-1 rounded-full text-xs text-white ${
    publication.quartile === 'Q1' ? 'bg-green-600' :
    publication.quartile === 'Q2' ? 'bg-[#101A24]' :
    publication.quartile === 'Q3' ? 'bg-orange-600' : 'bg-red-600'
  }`}>{publication.quartile}</span>
) : <span className="text-xs text-gray-400">N/A</span>}
                          </TableCell>
                         <TableCell>{publication.impactFactor || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
<TableCell>{(publication as any).sjrScore || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
<TableCell>{publication.citeScore || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                          <TableCell className="text-center">{publication.wosCitations}</TableCell>
                          <TableCell className="text-center">{publication.scopusCitations}</TableCell>
                          <TableCell className="text-center">{publication.googleCitations}</TableCell>
                          <TableCell><div className="text-sm">{Array.isArray(publication.authors) ? publication.authors.join(', ') : publication.authors}</div></TableCell>
                          <TableCell>{publication.indexing}</TableCell>
                          <TableCell>{publication.areaOfPaper || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                          <TableCell><div className="text-xs leading-tight">{publication.apaFormat}</div></TableCell>
                          <TableCell>{publication.positionOfAuthor || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                          <TableCell>{publication.volume || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
<TableCell>{publication.issue || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
<TableCell>{publication.startPage && publication.lastPage ? `${publication.startPage}-${publication.lastPage}` : <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                          <TableCell>{publication.monthYear}</TableCell>
                          <TableCell>{publication.academicYear}</TableCell>
                          <TableCell>
                            <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer" className="text-[#101A24] hover:underline text-xs">{publication.doi}</a>
                          </TableCell>
                          <TableCell>
                            {publication.link && <a href={publication.link} target="_blank" rel="noopener noreferrer" className="text-[#101A24] hover:underline text-xs">View</a>}
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm"
                                  onClick={() => { const w = window.open(); w?.document.write(`<html><body style="margin:0;">${publication.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }}
                                  className="text-[#101A24] hover:bg-[#E5DDC6]/30">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(publication)} className="text-[#101A24] hover:bg-[#E5DDC6]/30">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : <span className="text-xs text-gray-400">No file</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                const flags = getItemFlags(publication.id);
                                if (flags.length > 0) {
                                  setFlagBriefingPub(publication);
                                  setFlagBriefingFlags(flags);
                                } else {
                                  setEditingPublication(publication);
                                }
                              }}
                               className="text-[#101A24] hover:bg-[#E5DDC6]/30">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(publication)} className="text-red-500 hover:bg-red-50">
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

        {/* Publication Statistics */}
        {publications.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader><CardTitle style={{ color: "#101A24" }}>Publication Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { value: stats.total, label: 'Total Publications' },
                  { value: stats.q1, label: 'Q1 Papers' },
                  { value: stats.q2, label: 'Q2 Papers' },
                  { value: stats.q3q4, label: 'Q3/Q4 Papers' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                    <p className="text-2xl font-medium" style={{ color: "#101A24" }}>{item.value}</p>
                    <p className="text-sm" style={{ color: "#16222E" }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {[
                  { value: stats.scopus, label: 'Scopus Publications', sublabel: 'Indexed in Scopus' },
{ value: stats.scholar, label: 'Scholar Publications', sublabel: 'Indexed in Google Scholar' },
{ value: stats.wos, label: 'WoS Publications', sublabel: 'Indexed in Web of Science' },

                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}>
                    <p className="text-2xl font-medium" style={{ color: "#101A24" }}>{item.value}</p>
                    <p className="text-sm font-medium" style={{ color: "#16222E" }}>{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sublabel}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Database Profiles */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ position: 'relative', zIndex: 1 }}>
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
<Dialog open={!!flagBriefingPub} onOpenChange={() => { setFlagBriefingPub(null); setFlagBriefingFlags([]); setFlagBriefingIsPotential(false); }}>
          <DialogContent className="max-w-lg">
            <div className="p-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Review flag before editing</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Understand what needs to be fixed, then proceed to edit</p>
                </div>
              </div>

              {/* Publication title */}
              <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 border border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Publication</p>
                <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{flagBriefingPub?.title}</p>
              </div>

{/* Flag reasons */}
              <div className="space-y-3 mb-5">
                {flagBriefingIsPotential ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100 bg-amber-100/60">
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" style={{ animation: 'pulse 1s infinite' }} />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                        Missing Fields — Action Required
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {flagBriefingFlags[0]?.missing_fields?.join(', ') || 'Fields missing — check the publication'}
                      </p>
                    </div>
                  </div>
                ) : (
                  flagBriefingFlags.map((flag, i) => (
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
                  ))
                )}
              </div>

              {/* Instructions */}
              <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6] rounded-lg px-3 py-2.5 mb-5">
                <p className="text-xs text-[#101A24] font-medium mb-1">What to do:</p>
                <ol className="text-xs text-[#101A24] space-y-1 list-decimal list-inside">
                  <li>
                    {flagBriefingIsPotential ? 'Fill in the missing fields: ' : 'Edit and fix: '}
                    <span className="font-bold text-[#101A24]">
                      {flagBriefingIsPotential
                        ? (flagBriefingFlags[0]?.missing_fields?.join(', ') || 'see above')
                        : (flagBriefingFlags[0]?.reason || 'see flag reason above')}
                    </span>
                  </li>
                  <li>Save your changes</li>
                  <li>
                    {flagBriefingIsPotential
                      ? 'A submit box will open automatically — describe what you filled in'
                      : 'A resolve box will open automatically — type what you fixed and submit'}
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setFlagBriefingPub(null); setFlagBriefingFlags([]); setFlagBriefingIsPotential(false); }} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const pub = flagBriefingPub;
                    const briefingFlags = flagBriefingFlags;
                    const isPotential = flagBriefingIsPotential;
                    setFlagBriefingPub(null);
                    setFlagBriefingFlags([]);
                    setFlagBriefingIsPotential(false);
                    if (pub) {
                      if (isPotential) {
                        setPendingResolveAfterEditPF(briefingFlags[0]?.id ?? null);
                      } else {
                        setPendingResolveAfterEdit({ pubId: pub.id, flagIds: briefingFlags.map((f: any) => f.id) });
                      }
                      setEditingPublication(pub);
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

        {/* Add / Edit Publication Forms */}
        <AddPublicationForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddPublication} />
        {editingPublication && (
          <AddPublicationForm isOpen={!!editingPublication} onClose={() => setEditingPublication(null)} onSubmit={handleEditPublication} initialData={editingPublication} />
        )}
      </main>
    </div>
  );
}

export default PublicationsPage;