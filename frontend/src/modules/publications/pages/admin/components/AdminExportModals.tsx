// ═══════════════════════════════════════════════════════════════════
// Shared Admin Export Components
// Extracted from old AdminDashboardPage monolith — zero logic changes
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { FileDown } from 'lucide-react';

// ── Column definitions ────────────────────────────────────────────

export const PUB_EXPORT_COLUMNS = [
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

export const CONF_EXPORT_COLUMNS = [
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

export const BOOK_EXPORT_COLUMNS = [
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

// ── Reusable column picker ────────────────────────────────────────

export function ColumnPicker({
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
            <input type="checkbox" checked={selected.includes(col.key)} onChange={() => onToggle(col.key)}
              className="w-3.5 h-3.5 accent-teal-600" />
            <span className={`text-xs ${selected.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">{selected.length} of {columns.length} columns selected</p>
    </div>
  );
}

// ── Faculty picker ────────────────────────────────────────────────

export function FacultyPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [facultyList, setFacultyList] = useState<{ facultyId: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    fetch(`/api/auth/faculty-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setFacultyList(json.data.map((f: any) => ({ facultyId: f.faculty_id || f.facultyId, name: f.name })));
        }
      })
      .catch(() => {
        fetch(`/api/publications`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(json => {
            const rows = json.data || [];
            const seen = new Map<string, string>();
            rows.forEach((p: any) => {
              if (p.facultyName && p.facultyCode && !seen.has(p.facultyCode)) seen.set(p.facultyCode, p.facultyName);
            });
            setFacultyList(Array.from(seen.entries()).map(([facultyId, name]) => ({ facultyId, name })));
          });
      });
  }, []);

  const toggleFaculty = (facultyId: string) => {
    onChange(selected.includes(facultyId) ? selected.filter(x => x !== facultyId) : [...selected, facultyId]);
  };
  const selectAll = () => onChange(facultyList.map(f => f.facultyId));
  const clearAll = () => onChange([]);

  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-gray-700 mb-2">Filter by Faculty</p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsOpen(!isOpen)}>
          <span className="text-sm text-gray-700">
            {selected.length === 0 ? 'All Faculty'
              : selected.length === 1 ? facultyList.find(f => f.facultyId === selected[0])?.name || selected[0]
              : `${selected.length} faculty selected`}
          </span>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button onClick={e => { e.stopPropagation(); clearAll(); }} className="text-xs text-red-500 hover:text-red-700">Clear</button>
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
                  <input type="checkbox" checked={selected.includes(f.facultyId)} onChange={() => toggleFaculty(f.facultyId)}
                    className="w-3.5 h-3.5 accent-teal-600" />
                  <span className="text-sm text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{f.facultyId}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && <p className="text-xs text-[#101A24] mt-1">{selected.length} of {facultyList.length} faculty selected</p>}
      {selected.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all faculty included</p>}
    </div>
  );
}

// ── Export Publications Modal ──────────────────────────────────────

export function ExportPubModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  const toggleIndexing = (v: string) => setSelectedIndexing(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleSource = (v: string) => setSelectedSources(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleQuartile = (v: string) => setSelectedQuartiles(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) => setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
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
        const response = await fetch(`/api/publications/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `publications_${fid || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
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
                    style={isActive ? { backgroundColor: activeColors[q], color: 'white', borderColor: activeColors[q] } : { backgroundColor: 'white', color: '#4b5563', borderColor: '#d1d5db' }}>{q}</button>
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedIndexing.includes(idx) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>{idx}</button>
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedSources.includes(src.value) ? 'bg-[#101A24] text-white border-[#101A24]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'}`}>{src.label}</button>
              ))}
            </div>
            {selectedSources.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all sources included</p>}
          </div>
          <div className="mb-6">
            <ColumnPicker columns={PUB_EXPORT_COLUMNS} selected={selectedColumns} onToggle={toggleCol}
              onSelectAll={() => setSelectedColumns(PUB_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setSelectedColumns([])} />
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

// ── Export Conferences Modal ──────────────────────────────────────

export function ExportConfModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  const toggleType = (v: string) => setSelectedType(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) => setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
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
        const response = await fetch(`/api/conferences/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
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
              onSelectAll={() => setSelectedColumns(CONF_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setSelectedColumns([])} />
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

// ── Export Books Modal ─────────────────────────────────────────────

export function ExportBookModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  const toggleType = (v: string) => setSelectedType(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleCol = (k: string) => setSelectedColumns(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
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
        const response = await fetch(`/api/books/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
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
              onSelectAll={() => setSelectedColumns(BOOK_EXPORT_COLUMNS.map(c => c.key))} onClearAll={() => setSelectedColumns([])} />
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

// ── Global Export Modal (all 3 types in one) ──────────────────────

export function GlobalExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [exportPubs, setExportPubs] = useState(true);
  const [exportConfs, setExportConfs] = useState(true);
  const [exportBooks, setExportBooks] = useState(true);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [facultyId, setFacultyId] = useState('');
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
    if (facultyId) params.set('facultyId', facultyId);
    if (fromYear) params.set('fromYear', fromYear);
    if (toYear) params.set('toYear', toYear);
    params.set('columns', colKeys.join(','));
    const token = localStorage.getItem('token') || '';
    const response = await fetch(`/api/${endpoint}/export/csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
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
            <FacultyPicker selected={facultyId ? [facultyId] : []} onChange={(v) => setFacultyId(v[0] || '')} />
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Year Range (Academic Year Start)</p>
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
            </div>
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
              <div className="animate-spin w-3.5 h-3.5 border-2 border-[#101A24] border-t-transparent rounded-full" />{progress}
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
