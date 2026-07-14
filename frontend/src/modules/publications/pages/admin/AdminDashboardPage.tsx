import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { UniversityLogo } from "../../components/UniversityLogo";
import { FacultyDirectory } from "../../components/FacultyDirectory";
import { FilterDropdown } from "../../components/FilterDropdown";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { AddPublicationForm } from "../../components/AddPublicationForm";
import { AddConferenceForm } from "../../components/AddConferenceForm";
import { AddBookForm } from "../../components/AddBookForm";
import { FlagModal } from "../../components/FlagModal";
import { FlagReviewModal } from "../../components/FlagReviewModal";
import {
  BookOpen, Users, Book, LogOut, BarChart3,
  Search, ChevronDown, ChevronUp, ExternalLink, Database,
  FileText, Download, Pencil, Trash2, CheckCircle, AlertTriangle,
  FileDown, X, Flag, Home
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { generateAcademicYears, parseAcademicYear } from "../../utils/academicYears";
import { api } from "../../api/publicationsApi";
import type { Publication, Conference, BookChapter } from "../../utils/mockData";

interface AdminDashboardProps {
  onLogout: () => void;
}

// ── Column definitions ────────────────────────────────────────────────────────

const PUB_EXPORT_COLUMNS = [
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
  { key: 'facultyName', label: 'Faculty Name' },
];

const CONF_EXPORT_COLUMNS = [
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
  { key: 'facultyName', label: 'Faculty Name' },
];

const BOOK_EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'authorName', label: 'Author Name' },
  { key: 'departmentAffiliation', label: 'Department' },
  { key: 'isbnIssn', label: 'ISBN/ISSN' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'monthYear', label: 'Month Year' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'type', label: 'Type' },
  { key: 'link', label: 'Link' },
  { key: 'facultyName', label: 'Faculty Name' },
];



// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Blinking dot ──────────────────────────────────────────────────────────────

function BlinkingDot({ color }: { color: 'red' | 'amber' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color === 'red' ? '#ef4444' : '#f59e0b',
        marginRight: '6px',
        flexShrink: 0,
        animation: 'pulse 1s infinite',
      }}
    />
  );
}

function DeleteModal({ open, title, itemTitle, isDeleting, onConfirm, onCancel }: {
  open: boolean; title: string; itemTitle: string;
  isDeleting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
          <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{itemTitle}"</p>
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

function SuccessModal({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reusable column picker ────────────────────────────────────────────────────

function ColumnPicker({
  columns, selected, onToggle, onSelectAll, onClearAll,
}: {
  columns: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Select Columns</p>
        <div className="flex gap-2">
          <button onClick={onSelectAll} className="text-xs text-[#101A24] hover:underline">Select All</button>
          <span className="text-gray-300">|</span>
          <button onClick={onClearAll} className="text-xs text-red-500 hover:underline">Clear All</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
        {columns.map(col => (
          <label key={col.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(col.key)}
              onChange={() => onToggle(col.key)}
              className="w-3.5 h-3.5 accent-teal-600"
            />
            <span className={`text-xs ${selected.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>
              {col.label}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">{selected.length} of {columns.length} columns selected</p>
    </div>
  );
}

// ── Year range picker ─────────────────────────────────────────────────────────

function YearRangePicker({
  fromYear, toYear, onFromYear, onToYear, years,
}: {
  fromYear: string; toYear: string;
  onFromYear: (v: string) => void; onToYear: (v: string) => void;
  years: string[];
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-gray-700 mb-2">Year Range (Academic Year Start)</p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">From Year</label>
          <select value={fromYear} onChange={e => onFromYear(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="text-gray-400 mt-5">—</span>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">To Year</label>
          <select value={toYear} onChange={e => onToYear(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Faculty picker ────────────────────────────────────────────────────────────

function FacultyPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [facultyList, setFacultyList] = useState<{ facultyId: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const base = '/api';
    fetch(`${base}/auth/faculty-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setFacultyList(json.data.map((f: any) => ({ facultyId: f.faculty_id || f.facultyId, name: f.name })));
        }
      })
      .catch(() => {
        // Fallback: derive from publications
        fetch(`${base}/publications`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(json => {
            const rows = json.data || [];
            const seen = new Map<string, string>();
            rows.forEach((p: any) => {
              if (p.facultyName && p.facultyCode && !seen.has(p.facultyCode)) {
                seen.set(p.facultyCode, p.facultyName);
              }
            });
            setFacultyList(Array.from(seen.entries()).map(([facultyId, name]) => ({ facultyId, name })));
          });
      });
  }, []);

  const toggleFaculty = (facultyId: string) => {
    onChange(
      selected.includes(facultyId)
        ? selected.filter(x => x !== facultyId)
        : [...selected, facultyId]
    );
  };

  const selectAll = () => onChange(facultyList.map(f => f.facultyId));
  const clearAll = () => onChange([]);

  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-gray-700 mb-2">Filter by Faculty</p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-sm text-gray-700">
            {selected.length === 0
              ? 'All Faculty'
              : selected.length === 1
              ? facultyList.find(f => f.facultyId === selected[0])?.name || selected[0]
              : `${selected.length} faculty selected`}
          </span>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearAll(); }}
                className="text-xs text-red-500 hover:text-red-700"
              >Clear</button>
            )}
            <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-gray-200 max-h-48 overflow-y-auto">
            <div className="flex gap-2 px-3 py-2 border-b border-gray-100 bg-white sticky top-0">
              <button onClick={selectAll} className="text-xs text-[#101A24] hover:underline">Select All</button>
              <span className="text-gray-300">|</span>
              <button onClick={clearAll} className="text-xs text-red-500 hover:underline">Clear All</button>
            </div>
            {facultyList.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">Loading faculty list...</p>
            ) : (
              facultyList.map(f => (
                <label key={f.facultyId} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.facultyId)}
                    onChange={() => toggleFaculty(f.facultyId)}
                    className="w-3.5 h-3.5 accent-teal-600"
                  />
                  <span className="text-sm text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{f.facultyId}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-[#101A24] mt-1">{selected.length} of {facultyList.length} faculty selected</p>
      )}
      {selected.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">No filter — all faculty included</p>
      )}
    </div>
  );
}

// ── Per-section export modals ─────────────────────────────────────────────────

function ExportPubModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const academicYearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const start = currentYear - i;
    return { value: `${start}-${String(start + 1).slice(2)}`, label: `${start}-${String(start + 1).slice(2)}` };
  });

  const [filterMode, setFilterMode] = useState<'range' | 'academic'>('range');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
  const [selectedIndexing, setSelectedIndexing] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedQuartiles, setSelectedQuartiles] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(PUB_EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleIndexing = (v: string) =>
    setSelectedIndexing(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleSource = (v: string) =>
    setSelectedSources(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleQuartile = (v: string) =>
    setSelectedQuartiles(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) =>
    setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const base = '/api';

      // Export per-faculty or single export
      const targets = facultyIds.length > 0 ? facultyIds : [null];
      for (const fid of targets) {
        const params = new URLSearchParams();
        if (fid) params.set('facultyId', fid);
        if (filterMode === 'range') {
          if (fromYear) params.set('fromYear', fromYear);
          if (toYear) params.set('toYear', toYear);
        } else if (selectedAcademicYear) {
          params.set('fromYear', selectedAcademicYear.split('-')[0]);
          params.set('toYear', selectedAcademicYear.split('-')[0]);
        }
        if (selectedIndexing.length > 0) params.set('indexing', selectedIndexing.join(','));
        if (selectedSources.length > 0) params.set('source', selectedSources.join(','));
        if (selectedQuartiles.length > 0) params.set('quartile', selectedQuartiles.join(','));
        params.set('columns', selectedColumns.join(','));
        const response = await fetch(`${base}/publications/export/csv?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `publications_${fid || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch { alert('Failed to export. Please try again.'); }
    finally { setIsExporting(false); }
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

          <FacultyPicker selected={facultyIds} onChange={setFacultyIds} />

          {/* Year Filter */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Year</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setFilterMode('range'); setSelectedAcademicYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'range' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>
                Year Range
              </button>
              <button onClick={() => { setFilterMode('academic'); setFromYear(''); setToYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'academic' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>
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
                <select value={selectedAcademicYear} onChange={e => setSelectedAcademicYear(e.target.value)}
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
                const activeColors: Record<string, string> = { Q1: '#16a34a', Q2: '#2563eb', Q3: '#f97316', Q4: '#ef4444' };
                const isActive = selectedQuartiles.includes(q);
                return (
                  <button key={q} onClick={() => toggleQuartile(q)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={isActive ? { backgroundColor: activeColors[q], color: 'white', borderColor: activeColors[q] } : { backgroundColor: 'white', color: '#4b5563', borderColor: '#d1d5db' }}>
                    {q}
                  </button>
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedIndexing.includes(idx) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>
                  {idx}
                </button>
              ))}
            </div>
            {selectedIndexing.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all indexing included</p>}
          </div>

          {/* Source Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Import Source</p>
            <div className="flex flex-wrap gap-2">
              {[{ value: 'google_scholar', label: 'Google Scholar' }, { value: 'scopus', label: 'Scopus' }, { value: 'web_of_science', label: 'Web of Science' }, { value: 'manual', label: 'Manually Added' }].map(src => (
                <button key={src.value} onClick={() => toggleSource(src.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedSources.includes(src.value) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>
                  {src.label}
                </button>
              ))}
            </div>
            {selectedSources.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all sources included</p>}
          </div>

          <div className="mb-6">
            <ColumnPicker columns={PUB_EXPORT_COLUMNS} selected={selectedColumns} onToggle={toggleCol}
              onSelectAll={() => setSelectedColumns(PUB_EXPORT_COLUMNS.map(c => c.key))}
              onClearAll={() => setSelectedColumns([])} />
          </div>
          {facultyIds.length > 1 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              ⚠️ {facultyIds.length} faculty selected — will download {facultyIds.length} separate CSV files.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              <FileDown className="w-4 h-4 mr-2" />{isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportConfModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const academicYearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const start = currentYear - i;
    return { value: `${start}-${String(start + 1).slice(2)}`, label: `${start}-${String(start + 1).slice(2)}` };
  });

  const [filterMode, setFilterMode] = useState<'range' | 'academic'>('range');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(CONF_EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleType = (v: string) =>
    setSelectedType(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) =>
    setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const base = '/api';
      const targets = facultyIds.length > 0 ? facultyIds : [null];
      for (const fid of targets) {
        const params = new URLSearchParams();
        if (fid) params.set('facultyId', fid);
        if (filterMode === 'range') {
          if (fromYear) params.set('fromYear', fromYear);
          if (toYear) params.set('toYear', toYear);
        } else if (selectedAcademicYear) {
          params.set('fromYear', selectedAcademicYear.split('-')[0]);
          params.set('toYear', selectedAcademicYear.split('-')[0]);
        }
        if (selectedType.length === 1) params.set('type', selectedType[0]);
        params.set('columns', selectedColumns.join(','));
        const response = await fetch(`${base}/conferences/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `conferences_${fid || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch { alert('Failed to export. Please try again.'); }
    finally { setIsExporting(false); }
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
          <FacultyPicker selected={facultyIds} onChange={setFacultyIds} />
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Year</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setFilterMode('range'); setSelectedAcademicYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'range' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>Year Range</button>
              <button onClick={() => { setFilterMode('academic'); setFromYear(''); setToYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'academic' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>Academic Year</button>
            </div>
            {filterMode === 'range' ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">From Year</label>
                  <select value={fromYear} onChange={e => setFromYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                    <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-gray-400 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">To Year</label>
                  <select value={toYear} onChange={e => setToYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                    <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <select value={selectedAcademicYear} onChange={e => setSelectedAcademicYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                <option value="">All Academic Years</option>
                {academicYearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
            )}
          </div>
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Type</p>
            <div className="flex flex-wrap gap-2">
              {['International', 'National'].map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedType.includes(t) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>{t}</button>
              ))}
            </div>
            {selectedType.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all types included</p>}
          </div>
          <div className="mb-6">
            <ColumnPicker columns={CONF_EXPORT_COLUMNS} selected={selectedColumns} onToggle={toggleCol}
              onSelectAll={() => setSelectedColumns(CONF_EXPORT_COLUMNS.map(c => c.key))}
              onClearAll={() => setSelectedColumns([])} />
          </div>
          {facultyIds.length > 1 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              ⚠️ {facultyIds.length} faculty selected — will download {facultyIds.length} separate CSV files.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              <FileDown className="w-4 h-4 mr-2" />{isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportBookModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const academicYearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const start = currentYear - i;
    return { value: `${start}-${String(start + 1).slice(2)}`, label: `${start}-${String(start + 1).slice(2)}` };
  });

  const [filterMode, setFilterMode] = useState<'range' | 'academic'>('range');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(BOOK_EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleType = (v: string) =>
    setSelectedType(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) =>
    setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const base = '/api';
      const targets = facultyIds.length > 0 ? facultyIds : [null];
      for (const fid of targets) {
        const params = new URLSearchParams();
        if (fid) params.set('facultyId', fid);
        if (filterMode === 'range') {
          if (fromYear) params.set('fromYear', fromYear);
          if (toYear) params.set('toYear', toYear);
        } else if (selectedAcademicYear) {
          params.set('fromYear', selectedAcademicYear.split('-')[0]);
          params.set('toYear', selectedAcademicYear.split('-')[0]);
        }
        if (selectedType.length === 1) params.set('type', selectedType[0]);
        params.set('columns', selectedColumns.join(','));
        const response = await fetch(`${base}/books/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `books_${fid || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch { alert('Failed to export. Please try again.'); }
    finally { setIsExporting(false); }
  };

  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-5">
            <FileDown className="w-5 h-5 text-[#101A24]" />
            <h2 className="text-lg font-semibold text-gray-900">Export Books & Chapters to CSV</h2>
          </div>
          <FacultyPicker selected={facultyIds} onChange={setFacultyIds} />
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Year</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setFilterMode('range'); setSelectedAcademicYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'range' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>Year Range</button>
              <button onClick={() => { setFilterMode('academic'); setFromYear(''); setToYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterMode === 'academic' ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>Academic Year</button>
            </div>
            {filterMode === 'range' ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">From Year</label>
                  <select value={fromYear} onChange={e => setFromYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                    <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-gray-400 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">To Year</label>
                  <select value={toYear} onChange={e => setToYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                    <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <select value={selectedAcademicYear} onChange={e => setSelectedAcademicYear(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30">
                <option value="">All Academic Years</option>
                {academicYearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
            )}
          </div>
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Type</p>
            <div className="flex flex-wrap gap-2">
              {['Book', 'Book Chapter', 'Edited Book', 'Monograph'].map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedType.includes(t) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>{t}</button>
              ))}
            </div>
            {selectedType.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all types included</p>}
          </div>
          <div className="mb-6">
            <ColumnPicker columns={BOOK_EXPORT_COLUMNS} selected={selectedColumns} onToggle={toggleCol}
              onSelectAll={() => setSelectedColumns(BOOK_EXPORT_COLUMNS.map(c => c.key))}
              onClearAll={() => setSelectedColumns([])} />
          </div>
          {facultyIds.length > 1 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              ⚠️ {facultyIds.length} faculty selected — will download {facultyIds.length} separate CSV files.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              <FileDown className="w-4 h-4 mr-2" />{isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Global Export Modal ───────────────────────────────────────────────────────

function GlobalExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [exportPubs, setExportPubs] = useState(true);
  const [exportConfs, setExportConfs] = useState(true);
  const [exportBooks, setExportBooks] = useState(true);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
  const [pubCols, setPubCols] = useState<string[]>(PUB_EXPORT_COLUMNS.map(c => c.key));
  const [confCols, setConfCols] = useState<string[]>(CONF_EXPORT_COLUMNS.map(c => c.key));
  const [bookCols, setBookCols] = useState<string[]>(BOOK_EXPORT_COLUMNS.map(c => c.key));
  const [activeTab, setActiveTab] = useState<'pub' | 'conf' | 'book'>('pub');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const togglePubCol = (k: string) => setPubCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const toggleConfCol = (k: string) => setConfCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const toggleBookCol = (k: string) => setBookCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const doExport = async (endpoint: string, colKeys: string[], filename: string) => {
    const params = new URLSearchParams();
    if (facultyIds.length > 0) params.set('facultyId', facultyIds.join(','));
    if (fromYear) params.set('fromYear', fromYear);
    if (toYear) params.set('toYear', toYear);
    params.set('columns', colKeys.join(','));
    const token = localStorage.getItem('token') || '';
    const response = await fetch(
      `${'/api'}/${endpoint}/export/csv?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(`Export failed for ${endpoint}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    if (!exportPubs && !exportConfs && !exportBooks) { alert('Please select at least one data type to export.'); return; }
    const date = new Date().toISOString().split('T')[0];
    setIsExporting(true);
    try {
      if (exportPubs && pubCols.length > 0) { setProgress('Exporting publications...'); await doExport('publications', pubCols, `publications_admin_${date}.csv`); }
      if (exportConfs && confCols.length > 0) { setProgress('Exporting conferences...'); await doExport('conferences', confCols, `conferences_admin_${date}.csv`); }
      if (exportBooks && bookCols.length > 0) { setProgress('Exporting books...'); await doExport('books', bookCols, `books_admin_${date}.csv`); }
      setProgress(''); onClose();
    } catch { alert('One or more exports failed. Please try again.'); setProgress(''); }
    finally { setIsExporting(false); }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'pub' as const, label: 'Publications', enabled: exportPubs, setEnabled: setExportPubs },
    { id: 'conf' as const, label: 'Conferences', enabled: exportConfs, setEnabled: setExportConfs },
    { id: 'book' as const, label: 'Books', enabled: exportBooks, setEnabled: setExportBooks },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-1">
            <FileDown className="w-5 h-5 text-[#101A24]" />
            <h2 className="text-lg font-semibold text-gray-900">Export All Research Data</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">Each selected type will be downloaded as a separate CSV file.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Shared Filters</p>
            <FacultyPicker selected={facultyIds} onChange={setFacultyIds} />
            <YearRangePicker fromYear={fromYear} toYear={toYear} onFromYear={setFromYear} onToYear={setToYear} years={years} />
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Data Types to Export</p>
            <div className="flex gap-2 flex-wrap">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { tab.setEnabled(!tab.enabled); if (!tab.enabled) setActiveTab(tab.id); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${tab.enabled ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-400 border-gray-200'}`}>
                  <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${tab.enabled ? 'border-white bg-white/30' : 'border-gray-300'}`}>
                    {tab.enabled && <span className="text-white text-[10px] font-bold">✓</span>}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <div className="flex gap-1 border-b border-gray-200 mb-4">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#101A24] text-[#101A24]' : 'border-transparent text-gray-500 hover:text-gray-700'} ${!tab.enabled ? 'opacity-40' : ''}`}>
                  {tab.label}{!tab.enabled && <span className="ml-1 text-xs">(skipped)</span>}
                </button>
              ))}
            </div>
            {activeTab === 'pub' && <ColumnPicker columns={PUB_EXPORT_COLUMNS} selected={pubCols} onToggle={togglePubCol} onSelectAll={() => setPubCols(PUB_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setPubCols([])} />}
            {activeTab === 'conf' && <ColumnPicker columns={CONF_EXPORT_COLUMNS} selected={confCols} onToggle={toggleConfCol} onSelectAll={() => setConfCols(CONF_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setConfCols([])} />}
            {activeTab === 'book' && <ColumnPicker columns={BOOK_EXPORT_COLUMNS} selected={bookCols} onToggle={toggleBookCol} onSelectAll={() => setBookCols(BOOK_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setBookCols([])} />}
          </div>
          {progress && (
            <div className="flex items-center gap-2 my-3 text-sm text-[#101A24] bg-[#E5DDC6]/30 rounded-lg px-3 py-2">
              <div className="animate-spin w-3.5 h-3.5 border-2 border-[#101A24] border-t-transparent rounded-full" />
              {progress}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExportAll} disabled={isExporting} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              <FileDown className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : `Export ${[exportPubs, exportConfs, exportBooks].filter(Boolean).length} CSV${[exportPubs, exportConfs, exportBooks].filter(Boolean).length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

 const activeMenuItem = location.pathname === '/publications/admin/faculty'
    ? 'faculty'
    : location.pathname === '/publications/admin/settings'
    ? 'settings'
    : 'overview';

  const [globalSearch, setGlobalSearch] = useState('');
  const [globalYear, setGlobalYear] = useState<string>('all');
  const [pubSearch, setPubSearch] = useState('');
  const [pubYear, setPubYear] = useState<string>('all');
  const [confSearch, setConfSearch] = useState('');
  const [confYear, setConfYear] = useState<string>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [bookYear, setBookYear] = useState<string>('all');

  const [publicationsOpen, setPublicationsOpen] = useState(true);
  const [conferencesOpen, setConferencesOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);

  const [allPublications, setAllPublications] = useState<Publication[]>([]);
  const [allConferences, setAllConferences] = useState<Conference[]>([]);
  const [allBooksChapters, setAllBooksChapters] = useState<BookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [editingConf, setEditingConf] = useState<Conference | null>(null);
  const [editingBook, setEditingBook] = useState<BookChapter | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: 'pub' | 'conf' | 'book' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Export modal states
  const [isGlobalExportOpen, setIsGlobalExportOpen] = useState(false);
  const [isPubExportOpen, setIsPubExportOpen] = useState(false);
  const [isConfExportOpen, setIsConfExportOpen] = useState(false);
  const [isBookExportOpen, setIsBookExportOpen] = useState(false);

  // ── Flag states ──────────────────────────────────────────────────────────
  const [allFlags, setAllFlags] = useState<any[]>([]);
  const [allPotentialFlags, setAllPotentialFlags] = useState<any[]>([]);
  const [selectedPubs, setSelectedPubs] = useState<Set<string>>(new Set());
  const [selectedConfs, setSelectedConfs] = useState<Set<string>>(new Set());
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagModalItems, setFlagModalItems] = useState<{ id: string; title: string }[]>([]);
  const [flagModalType, setFlagModalType] = useState<'publication' | 'conference' | 'book'>('publication');
  const [reviewFaculty, setReviewFaculty] = useState<{ name: string; flags: any[] } | null>(null);

  const allAcademicYears = generateAcademicYears();

  // ── Flag lookup map ──────────────────────────────────────────────────────
  const flagMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    allFlags.forEach(flag => {
const key = `${flag.item_type}_${String(flag.item_id)}`;
      if (!map[key]) map[key] = [];
      map[key].push(flag);    });
    return map;
  }, [allFlags]);

  // ── Flag helpers ─────────────────────────────────────────────────────────
  const getItemFlags = (type: string, id: string) => {
    const key = `${type}_${String(id)}`;
    const result = flagMap[key]?.filter(f => f.status !== 'resolved') || [];
    if (result.length > 0) console.log('🚩 FLAG HIT:', key, result);
    return result;
  };

  const openFlagModal = (type: 'publication' | 'conference' | 'book', items: { id: string; title: string }[]) => {
    setFlagModalType(type);
    setFlagModalItems(items);
    setIsFlagModalOpen(true);
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

  const handleApproveAll = async (flagIds: number[]) => {
    for (const id of flagIds) await handleApproveFlag(id);
  };

const handleDeleteFlag = async (flagId: number) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setAllFlags(prev => prev.filter(f => f.id !== flagId));

  };

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const [pubsRes, confsRes, booksRes, flagsRes, potentialFlagsRes] = await Promise.all([
        api.publications.getAll(),
        api.conferences.getAll(),
        api.books.getAll(),
        fetch(`/api/flags`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/potential-flags/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (pubsRes.success && pubsRes.data) setAllPublications(pubsRes.data);
      if (confsRes.success && confsRes.data) setAllConferences(confsRes.data);
      if (booksRes.success && booksRes.data) setAllBooksChapters(booksRes.data);
      const flagsJson = await flagsRes.json();
      if (flagsJson.success) setAllFlags(flagsJson.data);
      const potentialFlagsJson = await potentialFlagsRes.json();
      if (potentialFlagsJson.success) setAllPotentialFlags(potentialFlagsJson.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPubs = (pubs: Publication[], search: string, year: string) =>
    pubs.filter(p => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        (p.title || '').toLowerCase().includes(s) ||
        (p.journal || '').toLowerCase().includes(s) ||
        (Array.isArray(p.authors) ? p.authors : []).some(a => (a || '').toLowerCase().includes(s)) ||
        (p.facultyName || '').toLowerCase().includes(s);
      return matchSearch && (year === 'all' || parseAcademicYear(p.academicYear) === year);
    });

  const filterConfs = (confs: Conference[], search: string, year: string) =>
    confs.filter(c => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        (c.title || '').toLowerCase().includes(s) ||
        (c.conferenceName || '').toLowerCase().includes(s) ||
        (Array.isArray(c.authors) ? c.authors : []).some(a => (a || '').toLowerCase().includes(s)) ||
        (c.facultyName || '').toLowerCase().includes(s);
      return matchSearch && (year === 'all' || parseAcademicYear(c.academicYear) === year);
    });

  const filterBooks = (books: BookChapter[], search: string, year: string) =>
    books.filter(b => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        (b.title || '').toLowerCase().includes(s) ||
        (b.authorName || '').toLowerCase().includes(s) ||
        (b.publisher || '').toLowerCase().includes(s) ||
        (b.facultyName || '').toLowerCase().includes(s);
      return matchSearch && (year === 'all' || parseAcademicYear(b.academicYear) === year);
    });

  const basePubs = filterPubs(allPublications, globalSearch, globalYear);
  const baseConfs = filterConfs(allConferences, globalSearch, globalYear);
  const baseBooks = filterBooks(allBooksChapters, globalSearch, globalYear);
  const filteredPublications = filterPubs(basePubs, pubSearch, pubYear);
  const filteredConferences = filterConfs(baseConfs, confSearch, confYear);
  const filteredBooksChapters = filterBooks(baseBooks, bookSearch, bookYear);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let res;
      if (deleteTarget.type === 'pub') res = await api.publications.delete(deleteTarget.id);
      else if (deleteTarget.type === 'conf') res = await api.conferences.delete(deleteTarget.id);
      else res = await api.books.delete(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        await loadAllData();

        setDeleteSuccess('Deleted Successfully!');
        setTimeout(() => setDeleteSuccess(''), 2000);
      }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleEditPub = async (data: any) => {
    if (!editingPub) return;
    const res = await api.publications.update(editingPub.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingPub(null); } else throw new Error('Failed');
  };

  const handleEditConf = async (data: any) => {
    if (!editingConf) return;
    const res = await api.conferences.update(editingConf.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingConf(null); } else throw new Error('Failed');
  };

  const handleEditBook = async (data: any) => {
    if (!editingBook) return;
    const res = await api.books.update(editingBook.id, { ...data, lastEditedBy: 'Admin' });
    if (res.success) { await loadAllData(); setEditingBook(null); } else throw new Error('Failed');
  };

  const getFileData = (item: any) => (item as any).fileUrl || item.fileData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCF7] via-[#F8F6F0] to-[#E5DDC6]/20">

      {/* ── Modals ── */}
      <DeleteModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'pub' ? 'Publication' : deleteTarget?.type === 'conf' ? 'Conference' : 'Book/Chapter'}?`}
        itemTitle={deleteTarget?.title || ''} isDeleting={isDeleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
      <SuccessModal open={!!deleteSuccess} message={deleteSuccess} onClose={() => setDeleteSuccess('')} />
      {editingPub && <AddPublicationForm isOpen={!!editingPub} onClose={() => setEditingPub(null)} onSubmit={handleEditPub} initialData={editingPub} />}
      {editingConf && <AddConferenceForm isOpen={!!editingConf} onClose={() => setEditingConf(null)} onSubmit={handleEditConf} initialData={editingConf} />}
      {editingBook && <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBook} initialData={editingBook} />}

      {/* Export modals */}
      <GlobalExportModal isOpen={isGlobalExportOpen} onClose={() => setIsGlobalExportOpen(false)} />
      <ExportPubModal isOpen={isPubExportOpen} onClose={() => setIsPubExportOpen(false)} />
      <ExportConfModal isOpen={isConfExportOpen} onClose={() => setIsConfExportOpen(false)} />
      <ExportBookModal isOpen={isBookExportOpen} onClose={() => setIsBookExportOpen(false)} />

      {/* Flag modals */}
      <FlagModal
        isOpen={isFlagModalOpen}
        onClose={() => {
          setIsFlagModalOpen(false);
          setSelectedPubs(new Set());
          setSelectedConfs(new Set());
          setSelectedBooks(new Set());
        }}
        selectedItems={flagModalItems}
        itemType={flagModalType}
        onSuccess={loadAllData}
      />
      <FlagReviewModal
        isOpen={!!reviewFaculty}
        onClose={() => setReviewFaculty(null)}
        facultyName={reviewFaculty?.name || ''}
        flags={reviewFaculty?.flags || []}
        onApprove={handleApproveFlag}
        onApproveAll={handleApproveAll}
        onDelete={handleDeleteFlag}
        onRefresh={loadAllData}
      />

      <div className="flex flex-col min-h-screen">
        {/* ── Header ── */}
        <header style={{ backgroundColor: '#101A24', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }} className="shadow-md overflow-hidden flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/home')}
                  title="Back to Home"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium shrink-0"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
                <UniversityLogo className="w-9 h-9" />
                <div>
                  <p className="text-base font-semibold text-white leading-tight">Admin Dashboard</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>University Research Portal</p>
                </div>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate('/publications/admin/dashboard')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={activeMenuItem === 'overview' ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.7)' }}>
                    <BarChart3 className="w-4 h-4" />Overview
                  </button>
                  <button onClick={() => navigate('/publications/admin/faculty')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={activeMenuItem === 'faculty' ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.7)' }}>
                    <Users className="w-4 h-4" />Faculty Directory
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigate('/home')}
                  className="text-white border text-sm h-8 px-3 transition-colors flex items-center gap-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <Home className="w-3.5 h-3.5" />Home
                </Button>
                {activeMenuItem === 'overview' && (
                  <Button onClick={() => setIsGlobalExportOpen(true)}
                    className="text-white border text-sm h-8 px-3 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                    <FileDown className="w-3.5 h-3.5 mr-1.5" />Export All
                  </Button>
                )}
                <Button onClick={onLogout}
                  className="text-sm h-8 px-3 transition-colors"
                  style={{ backgroundColor: 'rgba(220,50,50,0.25)', border: '1px solid rgba(255,150,150,0.35)', color: '#ffb0b0' }}>
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto max-w-7xl mx-auto w-full">
          <PageContent
            activeMenuItem={activeMenuItem} isLoading={isLoading}
            globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
            globalYear={globalYear} setGlobalYear={setGlobalYear}
            allPublications={allPublications} allConferences={allConferences} allBooksChapters={allBooksChapters}
            filteredPublications={filteredPublications} filteredConferences={filteredConferences} filteredBooksChapters={filteredBooksChapters}
            pubSearch={pubSearch} setPubSearch={setPubSearch} pubYear={pubYear} setPubYear={setPubYear}
            confSearch={confSearch} setConfSearch={setConfSearch} confYear={confYear} setConfYear={setConfYear}
            bookSearch={bookSearch} setBookSearch={setBookSearch} bookYear={bookYear} setBookYear={setBookYear}
            publicationsOpen={publicationsOpen} setPublicationsOpen={setPublicationsOpen}
            conferencesOpen={conferencesOpen} setConferencesOpen={setConferencesOpen}
            booksOpen={booksOpen} setBooksOpen={setBooksOpen}
            allAcademicYears={allAcademicYears}
            setEditingPub={setEditingPub} setEditingConf={setEditingConf} setEditingBook={setEditingBook}
            setDeleteTarget={setDeleteTarget}
            getFileData={getFileData}
            onOpenPubExport={() => setIsPubExportOpen(true)}
            onOpenConfExport={() => setIsConfExportOpen(true)}
            onOpenBookExport={() => setIsBookExportOpen(true)}
            onOpenGlobalExport={() => setIsGlobalExportOpen(true)}
            // Flag props
            allFlags={allFlags}
            selectedPubs={selectedPubs} setSelectedPubs={setSelectedPubs}
            selectedConfs={selectedConfs} setSelectedConfs={setSelectedConfs}
            selectedBooks={selectedBooks} setSelectedBooks={setSelectedBooks}
             getItemFlags={getItemFlags}
            openFlagModal={openFlagModal}
            setReviewFaculty={setReviewFaculty}
            onDeleteFlag={handleDeleteFlag}
            allPotentialFlags={allPotentialFlags}
            onEscalatePotentialFlag={async (pfId: number, _pubId: string, _title: string) => {
              const token = localStorage.getItem('token') || '';
              await fetch(`/api/potential-flags/${pfId}/escalate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: `Missing required fields detected at import` }),
              });
              await loadAllData();
            }}

          />
        </main>
      </div>
    </div>
  );
}

// ── Stable module-level components ────────────────────────────────────────────

function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <TableCell>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-[#101A24] hover:text-[#101A24] hover:bg-[#E5DDC6]/30 p-1">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </TableCell>
  );
}

function SectionSearch({ search, setSearch, year, setYear, placeholder, allAcademicYears, onExport }: {
  search: string; setSearch: (v: string) => void;
  year: string; setYear: (v: string) => void;
  placeholder: string; allAcademicYears: string[];
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50 items-center" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
      <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <FilterDropdown selectedValue={year} onValueChange={setYear} options={allAcademicYears} placeholder="All Years" />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-[#101A24]/50 h-9 text-sm" />
      </div>
      <Button onClick={onExport} variant="outline" size="sm"
        className="border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 h-9 px-3 text-sm whitespace-nowrap flex-shrink-0">
        <FileDown className="w-3.5 h-3.5 mr-1.5" />Export CSV
      </Button>
    </div>
  );
}


// ── Journal Rankings Admin Panel ──────────────────────────────────────────────

function JournalRankingsAdmin() {
  const [_year, _setYear] = useState(String(new Date().getFullYear()));
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deletingYear, setDeletingYear] = useState<number | null>(null);
  const [deleteYearResult, setDeleteYearResult] = useState('');
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<{year: number; count: number} | null>(null);

  const token = () => localStorage.getItem('token') || '';
  const base = '/api';

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${base}/journal-rankings/stats`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`✅ Imported ${json.inserted.toLocaleString()} journal rankings for ${json.year}`);
        setCsvFile(null);
        await loadStats();
      } else if (json.alreadyExists) {
        setImportResult(`⚠️ Year ${json.year} already has ${json.existingCount?.toLocaleString()} entries. Delete that year first, then re-import.`);
      } else {
        setImportResult(`❌ ${json.message}`);
      }
    // AFTER
    } catch (e: any) {
      setImportResult(`❌ Import failed: ${e.message}. If file too large, check server upload limit.`);

    } finally {
      setImporting(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult('⏳ Backfill started in background — check server logs for progress.');
    try {
      const res = await fetch(`${base}/journal-rankings/backfill-quartiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setBackfillResult(json.success
        ? '✅ Backfill triggered — quartiles will be populated in the background.'
        : `❌ ${json.message}`);
    } catch (e: any) {
      setBackfillResult(`❌ ${e.message}`);
    } finally {
      setBackfilling(false);
    }
  };

  const handleConfirmDeleteYear = async () => {
    if (!confirmDeleteYear) return;
    setDeletingYear(confirmDeleteYear.year);
    setDeleteYearResult('');
    setConfirmDeleteYear(null);
    try {
      const res = await fetch(`${base}/journal-rankings/year/${confirmDeleteYear.year}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setDeleteYearResult(json.success
        ? `✅ Deleted ${json.deleted.toLocaleString()} entries for ${confirmDeleteYear.year}`
        : `❌ ${json.message}`);
      if (json.success) await loadStats();
    } catch (e: any) {
      setDeleteYearResult(`❌ ${e.message}`);
    } finally {
      setDeletingYear(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const _years = Array.from({ length: currentYear - 1998 }, (_, i) => String(currentYear - i));

  return (
    <>
    <DeleteModal
      open={!!confirmDeleteYear}
      title="Delete Journal Rankings?"
      itemTitle={`${Number(confirmDeleteYear?.count).toLocaleString()} entries for year ${confirmDeleteYear?.year}`}
      isDeleting={deletingYear === confirmDeleteYear?.year}
      onConfirm={handleConfirmDeleteYear}
      onCancel={() => setConfirmDeleteYear(null)}
    />
    <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-700 to-teal-800 text-white py-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          Journal Rankings (Scimago)
          {stats && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">
              {stats.stats?.total_rows?.toLocaleString() || 0} entries · {stats.stats?.year_count || 0} years
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Import CSV ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-[#101A24]" />
              Import Scimago CSV
            </h3>
            <p className="text-xs text-gray-500">
              Download from{' '}
              <a href="https://www.scimagojr.com/journalrank.php" target="_blank" rel="noopener noreferrer"
                className="text-[#101A24] underline hover:text-[#101A24]">scimagojr.com</a>
              {' '}→ "Download data" at the bottom. Rename the file to{' '}
              <span className="font-medium text-[#101A24]">scimagojr YYYY.csv</span>
              {' '}(e.g. "scimagojr 2023.csv") — the year is auto-detected from the filename.
            </p>
            
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium w-10 flex-shrink-0">File</label>
              <label className="flex-1 cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg px-3 py-2 text-sm transition-colors ${csvFile ? 'border-[#101A24]/50 bg-[#E5DDC6]/30 text-[#101A24]' : 'border-gray-200 text-gray-400 hover:border-[#E5DDC6]'}`}>
                  {csvFile ? `📄 ${csvFile.name}` : 'Click to select CSV file...'}
                </div>
                <input
                  type="file"
                  accept=".csv,.xls"
                  className="hidden"
                  onChange={e => { setCsvFile(e.target.files?.[0] || null); setImportResult(''); }}
                />
              </label>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || !csvFile}
              className="bg-[#101A24] hover:bg-[#16222E] text-white h-9 px-4 text-sm"
            >
              {importing
                ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-2" />Importing...</>
                : <><FileDown className="w-3.5 h-3.5 mr-2" />{csvFile ? `Import ${csvFile.name.match(/(\d{4})/)?.[1] || 'CSV'}` : 'Import CSV'}</>
              }
            </Button>
            {importResult && (
              <p className={`text-xs px-3 py-2 rounded-lg ${importResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {importResult}
              </p>
            )}
          </div>

          {/* ── Backfill + Stats ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#101A24]" />
              Backfill Existing Publications
            </h3>
            <p className="text-xs text-gray-500">
              Populates quartile, SJR score, and CiteScore for all existing publications that currently have empty quartile fields. Runs in the background.
            </p>
            <Button
              onClick={handleBackfill}
              disabled={backfilling}
              variant="outline"
              className="border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 h-9 px-4 text-sm"
            >
              {backfilling
                ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-[#101A24] border-t-transparent rounded-full mr-2" />Starting...</>
                : <><Database className="w-3.5 h-3.5 mr-2" />Backfill Quartiles</>
              }
            </Button>
            {backfillResult && (
              <p className={`text-xs px-3 py-2 rounded-lg ${backfillResult.startsWith('✅') ? 'bg-green-50 text-green-700' : backfillResult.startsWith('⏳') ? 'bg-[#E5DDC6]/30 text-[#101A24]' : 'bg-red-50 text-red-700'}`}>
                {backfillResult}
              </p>
            )}

            {/* Stats */}
            {/* ── Delete by year ── */}
            {stats?.byYear?.length > 0 && (
              <div className="border border-red-100 rounded-lg p-3 bg-red-50/50 space-y-2">
                <p className="text-xs font-semibold text-red-700">Delete a Year's Data</p>
                <div className="flex flex-wrap gap-2">
                  {stats.byYear.map((row: any) => (
                    <button
                      key={row.year}

                      onClick={() => setConfirmDeleteYear({ year: row.year, count: row.count })}


                      disabled={deletingYear === row.year}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-red-200 bg-white text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />{row.year}
                      <span className="text-red-400">({Number(row.count).toLocaleString()})</span>
                    </button>
                  ))}
                </div>
                {deleteYearResult && (
                  <p className={`text-xs px-2 py-1 rounded ${deleteYearResult.startsWith('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    {deleteYearResult}
                  </p>
                )}
              </div>
            )}
              
            {statsLoading && <p className="text-xs text-gray-400">Loading stats...</p>}
            {!statsLoading && stats?.stats?.total_rows === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ No journal rankings imported yet. Import a Scimago CSV to enable quartile auto-population.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}


// ── KRC Admin Panel───────────────────────────────────────────────────────────

function KRCAdmin() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [_deletingYear, _setDeletingYear] = useState<number | null>(null);
  const [_deleteYearResult, _setDeleteYearResult] = useState('');

  const token = () => localStorage.getItem('token') || '';
  const base = '/api';

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${base}/krc/stats`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`✅ Imported ${json.inserted.toLocaleString()} KRC journal entries`);
        setCsvFile(null);
        await loadStats();
      } else {
        setImportResult(`❌ ${json.message}`);
      }
    } catch (e: any) {
      setImportResult(`❌ Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('This will delete ALL KRC journal data. Are you sure?')) return;
    setClearing(true);
    setClearResult('');
    try {
      const res = await fetch(`${base}/krc/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.success) {
        setClearResult('✅ All KRC data cleared.');
        setStats(null);
      } else {
        setClearResult(`❌ ${json.message}`);
      }
    } catch (e: any) {
      setClearResult(`❌ ${e.message}`);
    } finally {
      setClearing(false);
    }
  };

  // Quartile label map
  const qLabel: Record<number, string> = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
  const qColor: Record<number, string> = {
    1: '#16a34a', 2: '#2563eb', 3: '#f97316', 4: '#ef4444',
  };

  return (
    <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-700 to-teal-800 text-white py-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          KRC Journal List (Scopus)
          {stats?.stats?.total_rows > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">
              {Number(stats.stats.distinct_journals).toLocaleString()} journals loaded
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Import ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-[#101A24]" />
              Import KRC CSV
            </h3>
            <p className="text-xs text-gray-500">
              Upload the Scopus KRC list provided by your institution. Upload Q1, Q2, Q3, Q4
              files one by one — each upload appends to existing data. Use{' '}
              <span className="font-medium text-red-600">Clear All</span> to reset before
              re-importing a fresh set.
            </p>

            {/* File picker */}
            <label className="cursor-pointer block">
              <div className={`border-2 border-dashed rounded-lg px-3 py-2 text-sm transition-colors ${
                csvFile
                  ? 'border-[#101A24]/50 bg-[#E5DDC6]/30 text-[#101A24]'
                  : 'border-gray-200 text-gray-400 hover:border-[#E5DDC6]'
              }`}>
                {csvFile ? `📄 ${csvFile.name}` : 'Click to select CSV or XLSX file...'}
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { setCsvFile(e.target.files?.[0] || null); setImportResult(''); }}
              />
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleImport}
                disabled={importing || !csvFile}
                className="bg-[#101A24] hover:bg-[#16222E] text-white h-9 px-4 text-sm"
              >
                {importing
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-2" />Importing...</>
                  : <><FileDown className="w-3.5 h-3.5 mr-2" />Import CSV</>
                }
              </Button>
              <Button
                onClick={handleClear}
                disabled={clearing}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 h-9 px-4 text-sm"
              >
                {clearing ? 'Clearing...' : 'Clear All KRC Data'}
              </Button>
            </div>

            {importResult && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                importResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {importResult}
              </p>
            )}
            {clearResult && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                clearResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {clearResult}
              </p>
            )}
          </div>

          {/* ── Stats ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#101A24]" />
              KRC Data Stats
            </h3>

            {statsLoading && <p className="text-xs text-gray-400">Loading stats...</p>}

            {!statsLoading && (!stats || stats.stats?.total_rows === 0) && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ No KRC data loaded yet. Import a KRC CSV to enable the KRC Publications View for faculty.
              </p>
            )}

            {stats?.stats?.total_rows > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6]/60 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-semibold text-[#101A24]">
                      {Number(stats.stats.total_rows).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#101A24]">Total rows</p>
                  </div>
                  <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6]/60 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-semibold text-[#101A24]">
                      {Number(stats.stats.distinct_journals).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#101A24]">Unique journals</p>
                  </div>
                </div>

                {/* Quartile breakdown */}
                {stats.byQuartile?.length > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                      Quartile Breakdown
                    </div>
                    <div className="flex divide-x divide-gray-100">
                      {stats.byQuartile.map((row: any) => (
                        <div key={row.quartile} className="flex-1 text-center px-2 py-2">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold mb-1"
                            style={{ backgroundColor: qColor[row.quartile] || '#6b7280' }}
                          >
                            {qLabel[row.quartile] || `Q${row.quartile}`}
                          </span>
                          <p className="text-xs font-semibold text-gray-700">
                            {Number(row.count).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.stats.last_uploaded_at && (
                  <p className="text-xs text-gray-400">
                    Last uploaded:{' '}
                    {new Date(stats.stats.last_uploaded_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                )}
              </>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}


// ── Page Content ──────────────────────────────────────────────────────────────

function PageContent({
  activeMenuItem, isLoading,
  globalSearch, setGlobalSearch, globalYear, setGlobalYear,
  allPublications, allConferences, allBooksChapters,
  filteredPublications, filteredConferences, filteredBooksChapters,
  pubSearch, setPubSearch, pubYear, setPubYear,
  confSearch, setConfSearch, confYear, setConfYear,
  bookSearch, setBookSearch, bookYear, setBookYear,
  publicationsOpen, setPublicationsOpen,
  conferencesOpen, setConferencesOpen,
  booksOpen, setBooksOpen,
  allAcademicYears,
  setEditingPub, setEditingConf, setEditingBook,
  setDeleteTarget,
  getFileData,
  onOpenPubExport, onOpenConfExport, onOpenBookExport, onOpenGlobalExport,
  // Flag props
  allFlags,
  selectedPubs, setSelectedPubs,
  selectedConfs, setSelectedConfs,
  selectedBooks, setSelectedBooks,
   getItemFlags,
  openFlagModal,
  setReviewFaculty,
  onDeleteFlag,
  allPotentialFlags,
  onEscalatePotentialFlag,
}: any) {

  const openFile = (fileData: string, _fileName: string) => {
    const w = window.open();
    w?.document.write(`<html><body style="margin:0"><iframe src="${fileData}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
  };

  const downloadFile = (fileData: string, fileName: string) => {
    const a = document.createElement('a'); a.href = fileData; a.download = fileName || 'file'; a.click();
  };

  // Build flags-per-faculty map for Faculty Directory column
  const flagsPerFaculty = useMemo(() => {
    return allFlags.reduce((acc: Record<string, any[]>, flag: any) => {
      const code = flag.faculty_code;
      if (!acc[code]) acc[code] = [];
      acc[code].push(flag);
      return acc;
    }, {});
  }, [allFlags]);

  if (activeMenuItem === 'faculty') {
    return (
      <FacultyDirectory
        flagsPerFaculty={flagsPerFaculty}
        onReviewFaculty={(name: string, flags: any[]) => setReviewFaculty({ name, flags })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl text-gray-800 mb-1 font-medium">Research Overview</h2>
        <p className="text-sm text-gray-600">Comprehensive view of all academic publications, conferences, and books across University faculty</p>
      </div>

      {/* Global Search + Export All */}
      <Card className="bg-white/95 shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 20 }}>
        <CardContent className="p-4" style={{ overflow: 'visible' }}>
          <div className="flex flex-col sm:flex-row gap-3" style={{ overflow: 'visible' }}>
            <div style={{ overflow: 'visible', position: 'relative', zIndex: 30 }}>
              <FilterDropdown selectedValue={globalYear} onValueChange={setGlobalYear} options={allAcademicYears} placeholder="All Years" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Global search: title, author, faculty, journal..." value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-[#101A24]/50 w-full" />
            </div>
            <Button onClick={onOpenGlobalExport} className="bg-[#101A24] hover:bg-[#16222E] text-white h-10 px-4 text-sm whitespace-nowrap flex-shrink-0">
              <FileDown className="w-4 h-4 mr-1.5" />Export All
            </Button>
            <div className="text-xs text-gray-500 self-center whitespace-nowrap">
              {allPublications.length + allConferences.length + allBooksChapters.length} total records
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Publications', value: allPublications.length, icon: FileText },
          { label: 'Conferences', value: allConferences.length, icon: Users },
          { label: 'Books', value: allBooksChapters.filter((b: any) => b.type === 'Book').length, icon: Book },
          { label: 'Book Chapters', value: allBooksChapters.filter((b: any) => b.type === 'Book Chapter').length, icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-white/95 shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{label}</p>
                  <p className="text-2xl sm:text-3xl text-gray-800 font-medium">{isLoading ? '...' : value}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#101A24" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

   <JournalRankingsAdmin />
   <KRCAdmin />

      {isLoading ? (
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardContent className="p-16 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#101A24] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Publications ── */}
          <Collapsible open={publicationsOpen} onOpenChange={setPublicationsOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-[#101A24] to-[#16222E] text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all py-4 flex items-center">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Publications Database</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredPublications.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {publicationsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch
                  search={pubSearch} setSearch={setPubSearch}
                  year={pubYear} setYear={setPubYear}
                  placeholder="Search publications..." allAcademicYears={allAcademicYears}
                  onExport={onOpenPubExport}
                />
                {/* Flag Selected button for publications */}
                {selectedPubs.size > 0 && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-3">
                    <Button
                      onClick={() => openFlagModal('publication',
                        filteredPublications
                          .filter((p: Publication) => selectedPubs.has(p.id))
                          .map((p: Publication) => ({ id: p.id, title: p.title }))
                      )}
                      className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1.5" />
                      Flag Selected ({selectedPubs.size})
                    </Button>
                    <button onClick={() => setSelectedPubs(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
                      Clear selection
                    </button>
                  </div>
                )}
                <CardContent className="p-0">
                  {filteredPublications.length === 0 ? (
                    <div className="text-center py-12"><Database className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No publications found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredPublications.length > 10 ? '520px' : 'none', overflowY: filteredPublications.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              {/* Select All checkbox */}
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  onChange={e => {
                                    if (e.target.checked) setSelectedPubs(new Set(filteredPublications.map((p: Publication) => p.id)));
                                    else setSelectedPubs(new Set());
                                  }}
                                  checked={filteredPublications.length > 0 && filteredPublications.every((p: Publication) => selectedPubs.has(p.id))}
                                  className="w-4 h-4 accent-teal-600"
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Journal</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Quartile</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[90px]">Impact Factor</TableHead>
<TableHead className="font-semibold text-gray-700 min-w-[90px]">SJR Score</TableHead>
<TableHead className="font-semibold text-gray-700 min-w-[90px]">CiteScore</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[160px]">Authors</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Position</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[90px]">Volume/Issue</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Pages</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Date</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">DOI</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPublications.map((pub: Publication) => {
                              const fd = getFileData(pub);
                              const itemFlags = getItemFlags('publication', pub.id);
                              return (
                                <TableRow key={pub.id} className="hover:bg-gray-50">
                                  {/* Row checkbox */}
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedPubs.has(pub.id)}
                                      onChange={e => {
                                        const next = new Set(selectedPubs);
                                        e.target.checked ? next.add(pub.id) : next.delete(pub.id);
                                        setSelectedPubs(next);
                                      }}
                                      className="w-4 h-4 accent-teal-600"
                                    />
                                  </TableCell>
                                  {/* Title with blinking dot */}
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                      {itemFlags.length > 0 && (
  <div className="flex items-center gap-1 flex-shrink-0">
    <BlinkingDot color={itemFlags.some((f: any) => f.status === 'flagged') ? 'red' : 'amber'} />
<button onClick={() => onDeleteFlag(itemFlags[0].id)} title="Remove flag"
      className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center text-[10px] leading-none flex-shrink-0">✕</button>

  </div>
)}
                                    <div>
                                        <div className="text-sm leading-tight">{pub.title}</div>
                                        <EditedBadge by={(pub as any).lastEditedBy} at={(pub as any).lastEditedAt} />
                                        {(() => {
                                          const pf = allPotentialFlags?.find((p: any) => String(p.publication_id) === String(pub.id));
                                          if (!pf) return null;
                                          return (
                                            <div className="mt-1 flex items-center gap-1.5">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                                <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', backgroundColor:'#f59e0b' }} />
                                                ⚠️ Potential — Missing: {pf.missing_fields.join(', ')}
                                              </span>
                                              <button
                                                onClick={() => onEscalatePotentialFlag(pf.id, pub.id, pub.title)}
                                                className="text-[10px] text-red-600 hover:text-red-800 underline font-medium"
                                              >
                                                Escalate to Flag
                                              </button>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><div className="text-sm">{pub.journal}</div></TableCell>
                                  <TableCell>
                                    {pub.quartile ? (
                                      <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor:
                                        pub.quartile === 'Q1' ? '#16a34a' :
                                        pub.quartile === 'Q2' ? '#2563eb' :
                                        pub.quartile === 'Q3' ? '#f97316' :
                                        pub.quartile === 'Q4' ? '#ef4444' : '#101A24'
                                      }}>{pub.quartile}</span>
                                    ) : <span className="text-xs text-gray-400">N/A</span>}
                                  </TableCell>
                                  <TableCell>{pub.impactFactor || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell>{(pub as any).sjrScore || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell>{pub.citeScore || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell><div className="text-sm">{pub.authors.join(', ')}</div></TableCell>
                                  <TableCell>{pub.positionOfAuthor || <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell>{pub.volume || pub.issue ? `${pub.volume || ''}${pub.issue ? `(${pub.issue})` : ''}` : <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell>{pub.startPage && pub.lastPage ? `${pub.startPage}-${pub.lastPage}` : <span className="text-xs text-gray-400">N/A</span>}</TableCell>
                                  <TableCell><div className="text-sm">{pub.monthYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.academicYear}</div></TableCell>
                                  <TableCell><div className="text-xs font-mono">{pub.doi}</div></TableCell>
                                  <TableCell><a href={pub.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#101A24" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{pub.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => openFile(fd, pub.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => downloadFile(fd, pub.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingPub(pub)} onDelete={() => setDeleteTarget({ id: pub.id, title: pub.title, type: 'pub' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── Conferences ── */}
          <Collapsible open={conferencesOpen} onOpenChange={setConferencesOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-[#101A24] to-[#16222E] text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all py-4 flex items-center">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Conferences Database</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredConferences.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {conferencesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch
                  search={confSearch} setSearch={setConfSearch}
                  year={confYear} setYear={setConfYear}
                  placeholder="Search conferences..." allAcademicYears={allAcademicYears}
                  onExport={onOpenConfExport}
                />
                {/* Flag Selected button for conferences */}
                {selectedConfs.size > 0 && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-3">
                    <Button
                      onClick={() => openFlagModal('conference',
                        filteredConferences
                          .filter((c: Conference) => selectedConfs.has(c.id))
                          .map((c: Conference) => ({ id: c.id, title: c.title }))
                      )}
                      className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1.5" />
                      Flag Selected ({selectedConfs.size})
                    </Button>
                    <button onClick={() => setSelectedConfs(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
                      Clear selection
                    </button>
                  </div>
                )}
                <CardContent className="p-0">
                  {filteredConferences.length === 0 ? (
                    <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No conferences found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredConferences.length > 10 ? '520px' : 'none', overflowY: filteredConferences.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              {/* Select All checkbox */}
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  onChange={e => {
                                    if (e.target.checked) setSelectedConfs(new Set(filteredConferences.map((c: Conference) => c.id)));
                                    else setSelectedConfs(new Set());
                                  }}
                                  checked={filteredConferences.length > 0 && filteredConferences.every((c: Conference) => selectedConfs.has(c.id))}
                                  className="w-4 h-4 accent-teal-600"
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[180px]">Conference Name</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Date</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[160px]">Authors</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Type</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Host</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">DOI</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredConferences.map((conf: Conference) => {
                              const fd = getFileData(conf);
                              const itemFlags = getItemFlags('conference', conf.id);
                              return (
                                <TableRow key={conf.id} className="hover:bg-gray-50">
                                  {/* Row checkbox */}
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedConfs.has(conf.id)}
                                      onChange={e => {
                                        const next = new Set(selectedConfs);
                                        e.target.checked ? next.add(conf.id) : next.delete(conf.id);
                                        setSelectedConfs(next);
                                      }}
                                      className="w-4 h-4 accent-teal-600"
                                    />
                                  </TableCell>
                                  {/* Title with blinking dot */}
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                      {itemFlags.length > 0 && (
  <div className="flex items-center gap-1 flex-shrink-0">
    <BlinkingDot color={itemFlags.some((f: any) => f.status === 'flagged') ? 'red' : 'amber'} />
<button onClick={() => onDeleteFlag(itemFlags[0].id)} title="Remove flag"
      className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center text-[10px] leading-none flex-shrink-0">✕</button>

  </div>
)}
                                      <div>
                                        <div className="text-sm leading-tight">{conf.title}</div>
                                        <EditedBadge by={(conf as any).lastEditedBy} at={(conf as any).lastEditedAt} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><div className="text-sm">{conf.conferenceName}</div></TableCell>
                                  <TableCell><div className="text-sm">{conf.date ? new Date(conf.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-xs text-gray-400">N/A</span>}
</div></TableCell>
                                  <TableCell><div className="text-sm">{conf.authors.join(', ')}</div></TableCell>
                                  <TableCell><span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: conf.type === 'International' ? '#101A24' : '#10B981' }}>{conf.type}</span></TableCell>
                                  <TableCell><div className="text-sm">{conf.academicYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{conf.host}</div></TableCell>
                                  <TableCell><div className="text-xs font-mono">{conf.doi}</div></TableCell>
                                  <TableCell><a href={conf.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#101A24" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{conf.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => openFile(fd, conf.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => downloadFile(fd, conf.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingConf(conf)} onDelete={() => setDeleteTarget({ id: conf.id, title: conf.title, type: 'conf' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── Books ── */}
          <Collapsible open={booksOpen} onOpenChange={setBooksOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-[#101A24] to-[#16222E] text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all py-4 flex items-center">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Books & Book Chapters</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredBooksChapters.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {booksOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch
                  search={bookSearch} setSearch={setBookSearch}
                  year={bookYear} setYear={setBookYear}
                  placeholder="Search books and chapters..." allAcademicYears={allAcademicYears}
                  onExport={onOpenBookExport}
                />
                {/* Flag Selected button for books */}
                {selectedBooks.size > 0 && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-3">
                    <Button
                      onClick={() => openFlagModal('book',
                        filteredBooksChapters
                          .filter((b: BookChapter) => selectedBooks.has(b.id))
                          .map((b: BookChapter) => ({ id: b.id, title: b.title }))
                      )}
                      className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1.5" />
                      Flag Selected ({selectedBooks.size})
                    </Button>
                    <button onClick={() => setSelectedBooks(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
                      Clear selection
                    </button>
                  </div>
                )}
                <CardContent className="p-0">
                  {filteredBooksChapters.length === 0 ? (
                    <div className="text-center py-12"><BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No books or chapters found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredBooksChapters.length > 10 ? '520px' : 'none', overflowY: filteredBooksChapters.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              {/* Select All checkbox */}
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  onChange={e => {
                                    if (e.target.checked) setSelectedBooks(new Set(filteredBooksChapters.map((b: BookChapter) => b.id)));
                                    else setSelectedBooks(new Set());
                                  }}
                                  checked={filteredBooksChapters.length > 0 && filteredBooksChapters.every((b: BookChapter) => selectedBooks.has(b.id))}
                                  className="w-4 h-4 accent-teal-600"
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Author</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Department</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">ISBN/ISSN</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[140px]">Publisher</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Month/Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Type</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBooksChapters.map((item: BookChapter) => {
                              const fd = getFileData(item);
                              const itemFlags = getItemFlags('book', item.id);
                              return (
                                <TableRow key={item.id} className="hover:bg-gray-50">
                                  {/* Row checkbox */}
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedBooks.has(item.id)}
                                      onChange={e => {
                                        const next = new Set(selectedBooks);
                                        e.target.checked ? next.add(item.id) : next.delete(item.id);
                                        setSelectedBooks(next);
                                      }}
                                      className="w-4 h-4 accent-teal-600"
                                    />
                                  </TableCell>
                                  {/* Title with blinking dot */}
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-1">
                                      {itemFlags.length > 0 && (
  <div className="flex items-center gap-1 flex-shrink-0">
    <BlinkingDot color={itemFlags.some((f: any) => f.status === 'flagged') ? 'red' : 'amber'} />
<button onClick={() => onDeleteFlag(itemFlags[0].id)} title="Remove flag"
      className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center text-[10px] leading-none flex-shrink-0">✕</button>

  </div>
)}
                                      <div>
                                        <div className="text-sm leading-tight">{item.title}</div>
                                        <EditedBadge by={(item as any).lastEditedBy} at={(item as any).lastEditedAt} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><div className="text-sm">{item.authorName}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.departmentAffiliation}</div></TableCell>
                                  <TableCell><div className="text-sm font-mono">{item.isbnIssn}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.publisher}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.monthYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.academicYear}</div></TableCell>
                                  <TableCell><span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: item.type === 'Book' ? '#101A24' : '#10B981' }}>{item.type}</span></TableCell>
                                  <TableCell><a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#101A24" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{item.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => openFile(fd, item.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-[#101A24] hover:bg-[#E5DDC6]/30" onClick={() => downloadFile(fd, item.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingBook(item)} onDelete={() => setDeleteTarget({ id: item.id, title: item.title, type: 'book' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;