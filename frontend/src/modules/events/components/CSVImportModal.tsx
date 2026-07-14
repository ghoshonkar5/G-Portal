import { useState, useRef } from 'react'
import { X, Upload, Download, AlertCircle, CheckCircle2, FileText, Loader2, Eye, Zap, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { eventApi } from '../api/eventApi'

interface ImportError { row: number; reason: string }
interface PreviewRow { row: number; event_title: string; event_type: string; start_date: string; end_date: string; organizer: string; level: string; mode: string; role_at_event: string; venue?: string; description?: string; reason?: string }
interface PreviewData { valid: PreviewRow[]; duplicates: PreviewRow[]; invalid: PreviewRow[] }
interface ImportResult {
  inserted: number
  batch_id: string | null
  skipped_duplicates: number
  failed: number
  duplicate_list: { row: number; event_title: string; start_date: string }[]
  errors: ImportError[]
}

interface Props { onClose: () => void; onImported: () => void }

const SAMPLE_CSV = `"event_title","event_type","role_at_event","level","organizer","venue","mode","start_date","end_date","description"
"International Conference on AI","Conference","Speaker","International","IEEE","Hyderabad","Offline","2024-08-10","2024-08-12","Presented research on transformer architectures"
"Workshop on React Patterns","Workshop","Attendee","National","Frontend Masters","Online","Online","2024-09-05","2024-09-05","Hands-on session on hooks and performance"`

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function CSVImportModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [step, setStep] = useState<'select' | 'preview' | 'result' | 'deadline'>('select')
  const [loading, setLoading] = useState<'preview' | 'import' | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showSection, setShowSection] = useState<'duplicates' | 'invalid' | null>(null)
  const [selectedHours, setSelectedHours] = useState<24 | 48 | 72 | null>(null)
  const [settingDeadline, setSettingDeadline] = useState(false)
  const [deadlineSet, setDeadlineSet] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'sample-events.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) { toast.error('Please select a .csv file'); return }
    setFile(f); setPreviewData(null); setResult(null); setStep('select')
    setSelectedHours(null); setDeadlineSet(false)
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading('preview')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await eventApi.bulkImport(fd, { preview: 'true' })
      setPreviewData(res.data)
      setSelectedRows(new Set(res.data.valid.map((r: PreviewRow) => r.row)))
      setStep('preview')
    } catch { toast.error('Could not parse CSV. Check your file format.') }
    finally { setLoading(null) }
  }

  const buildSelectedCSV = (rows: PreviewRow[]): File => {
    const headers = '"event_title","event_type","role_at_event","level","organizer","venue","mode","start_date","end_date","description"'
    const lines = rows.map(r =>
      [r.event_title, r.event_type, r.role_at_event, r.level, r.organizer, r.venue || '', r.mode, r.start_date, r.end_date, r.description || '']
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    return new File([[headers, ...lines].join('\n')], 'selected-events.csv', { type: 'text/csv' })
  }

  const doImport = async () => {
    if (!file) return
    setLoading('import')
    const fileToSend = step === 'preview' && previewData
      ? buildSelectedCSV(previewData.valid.filter(r => selectedRows.has(r.row)))
      : file
    try {
      const fd = new FormData(); fd.append('file', fileToSend)
      const res = await eventApi.bulkImport(fd)
      setResult(res.data)
      if (res.data.inserted > 0) {
        onImported()
        setStep(res.data.batch_id ? 'deadline' : 'result')
      } else {
        setStep('result')
      }
    } catch { toast.error('Import failed. Please check your file and try again.') }
    finally { setLoading(null) }
  }

  const handleSetDeadline = async () => {
    if (!selectedHours || !result?.batch_id) return
    setSettingDeadline(true)
    try {
      await eventApi.setBatchDeadline(result.batch_id, selectedHours)
      setDeadlineSet(true)
    } catch { toast.error('Failed to set deadline. You can edit events individually.') }
    finally { setSettingDeadline(false) }
  }

  const isWide = step === 'preview'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden transition-all duration-300 ${isWide ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Import Events from CSV</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'select' && 'Bulk add multiple events at once'}
              {step === 'preview' && `Reviewing ${(previewData?.valid.length ?? 0) + (previewData?.duplicates.length ?? 0) + (previewData?.invalid.length ?? 0)} rows from your file`}
              {step === 'result' && 'Import complete'}
              {step === 'deadline' && `${result?.inserted} event${result?.inserted !== 1 ? 's' : ''} imported — set your upload deadline`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── STEP: SELECT ── */}
        {step === 'select' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between bg-[#E5DDC6]/30 border border-[#E5DDC6]/60 rounded-lg p-3.5">
              <div className="flex items-start gap-2.5">
                <FileText size={17} className="text-[#101A24] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#101A24]">Download sample CSV</p>
                  <p className="text-xs text-[#101A24] mt-0.5">Use this template to format your data correctly</p>
                </div>
              </div>
              <button onClick={handleDownloadSample} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101A24] hover:underline whitespace-nowrap flex-shrink-0">
                <Download size={14} /> Download
              </button>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0] || null) }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-[#101A24]/50 bg-[#E5DDC6]/30' : 'border-[#E5DDC6] hover:border-[#101A24]/50 bg-[#E5DDC6]/30/30 hover:bg-[#E5DDC6]/30/60'
              }`}
            >
              <Upload size={24} className="mx-auto text-[#101A24]/70 mb-2" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-[#101A24]">{file.name}</p>
                  <p className="text-xs text-[#101A24]/80 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[#101A24]">Drop your CSV file here</p>
                  <p className="text-xs text-[#101A24]/70 mt-1">or click to browse · .csv files only</p>
                </div>
              )}
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
            </div>

            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
              Photos and certificates cannot be imported via CSV. After import you will be asked to set an upload deadline.
            </p>
          </div>
        )}

        {/* ── STEP: PREVIEW ── */}
        {step === 'preview' && previewData && (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <CheckCircle2 size={13} /> {previewData.valid.length} will be imported
              </span>
              {previewData.duplicates.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  <Copy size={13} /> {previewData.duplicates.length} duplicate{previewData.duplicates.length !== 1 ? 's' : ''} — will skip
                </span>
              )}
              {previewData.invalid.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  <AlertCircle size={13} /> {previewData.invalid.length} invalid — will skip
                </span>
              )}
            </div>

          {previewData.valid.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === previewData.valid.length}
                      onChange={e => setSelectedRows(e.target.checked ? new Set(previewData.valid.map(r => r.row)) : new Set())}
                      className="accent-[#101A24] w-3.5 h-3.5 cursor-pointer"
                    />
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      Ready to import ({previewData.valid.length})
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">
                    {selectedRows.size} of {previewData.valid.length} selected
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-8" />
                        <th className="text-left px-4 py-2 text-gray-500 font-semibold">#</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-semibold">Event Title</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-semibold">Type</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-semibold">Date</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-semibold">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.valid.map((row) => {
                        const checked = selectedRows.has(row.row)
                        return (
                          <tr
                            key={row.row}
                            onClick={() => setSelectedRows(prev => {
                              const next = new Set(prev)
                              checked ? next.delete(row.row) : next.add(row.row)
                              return next
                            })}
                            className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${checked ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'opacity-50 hover:opacity-70 hover:bg-gray-50'}`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}}
                                className="accent-[#101A24] w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 text-gray-400">{row.row}</td>
                            <td className="px-4 py-2 text-gray-800 font-medium max-w-[200px]">
                              <span className="line-clamp-1 block" title={row.event_title}>{row.event_title}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-500">{row.event_type}</td>
                            <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt(row.start_date)}</td>
                            <td className="px-4 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.level === 'International' ? 'bg-purple-100 text-purple-700' :
                                row.level === 'National' ? 'bg-[#E5DDC6]/50 text-[#101A24]' : 'bg-gray-100 text-gray-600'
                              }`}>{row.level}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {previewData.duplicates.length > 0 && (
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowSection(s => s === 'duplicates' ? null : 'duplicates')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <span className="flex items-center gap-2"><Copy size={13} /> {previewData.duplicates.length} duplicate{previewData.duplicates.length !== 1 ? 's' : ''} found — already in your portfolio</span>
                  <span className="text-amber-400 font-medium">{showSection === 'duplicates' ? 'Hide' : 'Show'}</span>
                </button>
                {showSection === 'duplicates' && (
                  <div className="max-h-36 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {previewData.duplicates.map((row) => (
                          <tr key={row.row} className="border-b border-amber-50 last:border-0 bg-amber-50/30">
                            <td className="px-4 py-2 text-amber-400 w-8">{row.row}</td>
                            <td className="px-4 py-2 text-amber-800 font-medium"><span className="line-clamp-1 block" title={row.event_title}>{row.event_title}</span></td>
                            <td className="px-4 py-2 text-amber-500 whitespace-nowrap">{fmt(row.start_date)}</td>
                            <td className="px-4 py-2"><span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">DUPLICATE</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {previewData.invalid.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowSection(s => s === 'invalid' ? null : 'invalid')}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <span className="flex items-center gap-2"><AlertCircle size={13} /> {previewData.invalid.length} row{previewData.invalid.length !== 1 ? 's' : ''} with validation errors</span>
                  <span className="text-red-300 font-medium">{showSection === 'invalid' ? 'Hide' : 'Show'}</span>
                </button>
                {showSection === 'invalid' && (
                  <div className="max-h-36 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {previewData.invalid.map((row) => (
                          <tr key={row.row} className="border-b border-red-50 last:border-0">
                            <td className="px-4 py-2 text-red-300 w-8">{row.row}</td>
                            <td className="px-4 py-2 text-gray-600 font-medium"><span className="line-clamp-1 block">{row.event_title || '(empty)'}</span></td>
                            <td className="px-4 py-2 text-red-500">{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {previewData.valid.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">No valid rows to import.</div>
            )}
          </div>
        )}

        {/* ── STEP: RESULT (0 inserted or all failed) ── */}
        {step === 'result' && result && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-amber-50 border-amber-200">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900">No events were imported</p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {result.skipped_duplicates > 0 && <span className="text-xs text-amber-600 font-medium">· {result.skipped_duplicates} duplicates skipped</span>}
                  {result.failed > 0 && <span className="text-xs text-red-500 font-medium">· {result.failed} failed validation</span>}
                </div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="border border-red-100 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2.5 flex items-center gap-2">
                  <AlertCircle size={13} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed</span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2 border-b border-red-50 last:border-0 text-xs">
                      <span className="text-gray-400 w-12 flex-shrink-0">Row {err.row}</span>
                      <span className="text-red-600">{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: DEADLINE ── */}
        {step === 'deadline' && result && (
          <div className="p-5 space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-emerald-50 border-emerald-200">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {result.inserted} event{result.inserted !== 1 ? 's' : ''} imported successfully
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Both certificate and photo are required for each event.
                  {result.skipped_duplicates > 0 && ` · ${result.skipped_duplicates} duplicates skipped`}
                </p>
              </div>
            </div>

            {!deadlineSet ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Choose your upload deadline</p>
                  <p className="text-xs text-gray-400 mb-3">
                    All {result.inserted} imported events will be permanently deleted if both certificate and photo are not uploaded before this deadline.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {([24, 48, 72] as const).map(h => (
                      <button
                        key={h}
                        onClick={() => setSelectedHours(h)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                          selectedHours === h
                            ? 'border-[#101A24] bg-[#E5DDC6]/30 text-[#101A24]'
                            : 'border-gray-200 hover:border-[#E5DDC6] text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl font-bold">{h}</span>
                        <span className="text-xs font-medium mt-0.5">hours</span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {h === 24 ? '1 day' : h === 48 ? '2 days' : '3 days'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedHours && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    ⚠ Events without documents uploaded within <strong>{selectedHours} hours</strong> will be permanently deleted.
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-[#E5DDC6]/30 border-[#E5DDC6]">
                <CheckCircle2 size={18} className="text-[#101A24] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#101A24]">Deadline set — {selectedHours} hours</p>
                  <p className="text-xs text-[#101A24] mt-0.5">
                    Go to Events page and upload certificates and photos for each imported event before the deadline. Events will show a countdown timer.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-between p-5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={step === 'preview' ? () => setStep('select') : onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
          >
            {step === 'result' || step === 'deadline' ? 'Close' : step === 'preview' ? '← Back' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {step === 'select' && (
              <>
                <button
                  onClick={handlePreview}
                  disabled={!file || !!loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 bg-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                  {loading === 'preview' ? 'Previewing...' : 'Preview first'}
                </button>
                <button
                  onClick={doImport}
                  disabled={!file || !!loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading === 'import' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  {loading === 'import' ? 'Importing...' : 'Import all'}
                </button>
              </>
            )}

            {step === 'preview' && previewData && previewData.valid.length > 0 && (
              <button
                onClick={doImport}
                disabled={!!loading || selectedRows.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {loading === 'import' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {loading === 'import' ? 'Importing...' : selectedRows.size === 0 ? 'Select events to import' : `Import ${selectedRows.size} event${selectedRows.size !== 1 ? 's' : ''}`}
              </button>
            )}

            {step === 'deadline' && !deadlineSet && (
              <button
                onClick={handleSetDeadline}
                disabled={!selectedHours || settingDeadline}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {settingDeadline ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {settingDeadline ? 'Setting...' : 'Confirm deadline'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}