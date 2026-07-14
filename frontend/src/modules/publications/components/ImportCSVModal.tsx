import { useState, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import {
  Upload, CheckCircle, AlertTriangle, X,
  FileText, Loader2, Info
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API_BASE_URL = '/api';
const getToken = () => localStorage.getItem('token');

export interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onImported?: () => void;
}

export function ImportCSVModal({ isOpen, onClose, onImportComplete, onImported }: ImportCSVModalProps) {
  const { user } = useAuth();
  const facultyId = user?.facultyId || (user as any)?.faculty_id || (user as any)?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvDone, setCsvDone] = useState('');
  const [csvSelected, setCsvSelected] = useState<boolean[]>([]);

  const parseCSV = (text: string): any[] => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];
    let headerLineIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].toLowerCase().includes('title') || lines[i].toLowerCase().includes('authors')) {
        headerLineIdx = i;
        break;
      }
    }
    const headers = splitCSVLine(lines[headerLineIdx]);
    const rows: any[] = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = splitCSVLine(line);
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h.trim().replace(/^"|"$/g, '')] = (values[idx] || '').trim().replace(/^"|"$/g, '');
      });
      if (Object.values(row).some(v => v)) rows.push(row);
    }
    return rows;
  };

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a .csv file.');
      return;
    }
    setCsvFileName(file.name);
    setCsvError('');
    setCsvRows([]);
    setCsvParsed(false);
    setCsvDone('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target?.result as string);
        if (rows.length === 0) {
          setCsvError('No data rows found in the CSV file.');
          return;
        }
        setCsvRows(rows);
        setCsvSelected(new Array(rows.length).fill(true));
        setCsvParsed(true);
      } catch (err: any) {
        setCsvError('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const toggleItem = (i: number) => setCsvSelected(prev => prev.map((v, idx) => idx === i ? !v : v));
  const toggleAll = (val: boolean) => setCsvSelected(new Array(csvRows.length).fill(val));
  const selectedCount = csvSelected.filter(Boolean).length;

  const handleImport = async () => {
    if (!facultyId) {
      setCsvError('Could not identify your faculty ID. Please try logging in again.');
      return;
    }
    const selectedRows = csvRows.filter((_, i) => csvSelected[i]);
    if (selectedRows.length === 0) return;
    setCsvImporting(true);
    setCsvDone('');
    setCsvError('');
    try {
      const res = await fetch(`${API_BASE_URL}/scholar/import-csv/${facultyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ rows: selectedRows }),
      });
      const data = await res.json();
      if (data.success) {
        setCsvDone(data.message || `Successfully processed ${selectedRows.length} rows.`);
        if (onImportComplete) onImportComplete();
        if (onImported) onImported();
      } else {
        setCsvError(data.message || 'Import failed');
      }
    } catch (e: any) {
      setCsvError('Import failed: ' + e.message);
    } finally {
      setCsvImporting(false);
    }
  };

  const handleClose = () => {
    setCsvRows([]);
    setCsvParsed(false);
    setCsvError('');
    setCsvFileName('');
    setCsvDone('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-2xl shadow-2xl [&>button]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#101A24' }}>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">Import CSV (Scopus / Scholar)</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6 mt-4">
          {!csvParsed && !csvDone && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
              <div className="w-full max-w-md bg-[#E5DDC6]/30 border border-[#E5DDC6] rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#101A24] mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#101A24]">
                    <p className="font-medium mb-2">How to export from Scopus</p>
                    <ol className="list-decimal list-inside space-y-1 text-[#101A24] text-xs">
                      <li>Go to your Scopus profile → Documents tab</li>
                      <li>Select all documents</li>
                      <li>Click Export → CSV</li>
                      <li>Upload the downloaded file below</li>
                    </ol>
                    <p className="mt-2 text-[#101A24] text-xs">Also works seamlessly with Google Scholar CSV exports.</p>
                  </div>
                </div>
              </div>

              <div onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-[#101A24]/50 hover:bg-[#E5DDC6]/30 transition-all shadow-sm">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Click to upload CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Scopus or Google Scholar export · .csv format</p>
                {csvFileName && <p className="text-sm text-[#101A24] mt-3 font-medium">📄 {csvFileName}</p>}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

              {csvError && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 max-w-md text-left">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{csvError}</p>
                </div>
              )}
            </div>
          )}

          {csvDone && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-6">{csvDone}</p>
              <Button onClick={handleClose} style={{ backgroundColor: '#101A24' }} className="text-white px-8 py-2 rounded-xl shadow-md hover:opacity-90 transition-opacity">Done</Button>
            </div>
          )}

          {csvParsed && !csvDone && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">Found <span className="font-semibold">{csvRows.length}</span> rows in <span className="font-medium">{csvFileName}</span>.</p>
                <div className="flex gap-3">
                  <button onClick={() => toggleAll(true)} className="text-xs text-[#101A24] font-medium hover:underline cursor-pointer">Select all</button>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 font-medium hover:underline cursor-pointer">Deselect all</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl divide-y max-h-[50vh]">
                {csvRows.map((row, i) => {
                  const title = row.Title || row.title || row['Article Title'] || 'Untitled';
                  const journal = row['Source title'] || row['source title'] || row.Journal || '';
                  const year = row.Year || row.year || row['Publication Year'] || '';
                  const authors = row.Authors || row.authors || '';
                  const citations = row['Cited by'] || row['cited by'] || row.Citations || '';
                  return (
                    <div key={i} onClick={() => toggleItem(i)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${csvSelected[i] ? 'bg-[#E5DDC6]/30/60' : 'bg-white hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={csvSelected[i]} onChange={() => toggleItem(i)} onClick={e => e.stopPropagation()} className="mt-1 accent-teal-600 flex-shrink-0 cursor-pointer" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {journal && <span className="font-medium text-gray-700">{journal}</span>}
                          {year && <span className="ml-2 text-gray-400">· {year}</span>}
                          {citations && <span className="ml-2 text-[#101A24] font-medium">· {citations} citations</span>}
                        </p>
                        {authors && <p className="text-xs text-gray-400 mt-0.5 truncate">{authors}</p>}
                      </div>
                      <FileText className="w-3.5 h-3.5 text-gray-300 mt-1 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
              {csvError && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{csvError}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 font-medium">{selectedCount} of {csvRows.length} selected</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setCsvParsed(false); setCsvRows([]); setCsvFileName(''); }} className="border-gray-300 hover:bg-gray-100">← Upload different file</Button>
                  <Button onClick={handleImport} disabled={csvImporting || selectedCount === 0} className="text-white px-6 shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: '#101A24' }}>
                    {csvImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <>Import {selectedCount} Row{selectedCount !== 1 ? 's' : ''}</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

