import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download, Upload, Edit2, Trash2, X, BookOpen, Calendar, Award, Users, Image as ImageIcon, ChevronLeft, AlertCircle, Clock, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { Event, EventType, RoleAtEvent, EventLevel, EventMode } from '../../types'
         import { EVENT_TYPES, ROLES_AT_EVENT, EVENT_LEVELS, EVENT_MODES } from '../../types'
import { eventApi } from '../../api/eventApi'
import Navbar from '../../components/Navbar'
import EventPreviewModal from '../../components/EventPreviewModal'
import CSVImportModal from '../../components/CSVImportModal'


const docsLabel = (status?: string) => {
  if (status === 'pending_both') return 'Needs certificate + photo'
  if (status === 'pending_cert') return 'Needs certificate'
  if (status === 'pending_photo') return 'Needs photo'
  return null
}

const isPending = (e: Event) =>
  e.docs_status && e.docs_status !== 'complete'

function formatCountdown(deadlineOrMs: string | number, now?: number) {
  const diff = typeof deadlineOrMs === 'number'
    ? deadlineOrMs
    : new Date(deadlineOrMs).getTime() - (now ?? Date.now())
  if (diff <= 0) return { text: 'Deadline passed', urgent: true }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const urgent = diff < 86400000
  if (d > 0) return { text: `${d}d ${h}h ${m}m ${s}s left`, urgent }
  if (h > 0) return { text: `${h}h ${m}m ${s}s left`, urgent }
  if (m > 0) return { text: `${m}m ${s}s left`, urgent }
  return { text: `${s}s left`, urgent: true }
}
// ── Filter types ─────────────────────────────────────────────────────────────

type DocsStatusFilter = 'all' | 'complete' | 'any_pending' | 'pending_both' | 'pending_cert' | 'pending_photo'
type DurationFilter = 'all' | 'single' | 'multi'
type SourceFilter = 'all' | 'manual' | 'imported'
type SortOption = 'newest' | 'oldest' | 'date_asc' | 'title_az' | 'level_high'

interface EventFilters {
  titleSearch: string
  organizerSearch: string
  eventTypes: EventType[]
  roles: RoleAtEvent[]
  levels: EventLevel[]
  modes: EventMode[]
  status: 'all' | 'draft' | 'submitted'
  docsStatus: DocsStatusFilter
  dateFrom: string
  dateTo: string
  hasPhoto: boolean
  hasCertificate: boolean
  noAttachments: boolean
  duration: DurationFilter
  source: SourceFilter
  sort: SortOption
}

const DEFAULT_FILTERS: EventFilters = {
  titleSearch: '',
  organizerSearch: '',
  eventTypes: [],
  roles: [],
  levels: [],
  modes: [],
  status: 'all',
  docsStatus: 'all',
  dateFrom: '',
  dateTo: '',
  hasPhoto: false,
  hasCertificate: false,
  noAttachments: false,
  duration: 'all',
  source: 'all',
  sort: 'newest',
}
export default function EventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [autoDeleted, setAutoDeleted] = useState<{ id: number; event_title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS)
  const setFilter = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }))
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null)
  const [successModal, setSuccessModal] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)


  // Single interval drives all countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    try {
      const res = await eventApi.getMine()
      setEvents(res.data.events)
      const fresh = res.data.auto_deleted || []
      const stored = JSON.parse(localStorage.getItem('auto_deleted_events') || '[]')
      const merged = [...stored, ...fresh].filter(
        (e, i, arr) => arr.findIndex(x => x.id === e.id) === i
      )
      if (merged.length > 0) {
        setAutoDeleted(merged)
        localStorage.setItem('auto_deleted_events', JSON.stringify(merged))
      }
    } catch {
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = useMemo(() => events.filter(isPending).length, [events])

  const filtered = useMemo(() => {
    const f = filters
    let result = events.filter(e => {
      if (f.titleSearch && !e.event_title.toLowerCase().includes(f.titleSearch.toLowerCase())) return false
      if (f.organizerSearch && !e.organizer.toLowerCase().includes(f.organizerSearch.toLowerCase())) return false
      if (f.eventTypes.length > 0 && !f.eventTypes.includes(e.event_type)) return false
      if (f.roles.length > 0 && !f.roles.includes(e.role_at_event)) return false
      if (f.levels.length > 0 && !f.levels.includes(e.level)) return false
      if (f.modes.length > 0 && !f.modes.includes(e.mode)) return false
      if (f.status !== 'all' && e.status !== f.status) return false
      if (f.docsStatus !== 'all') {
        if (f.docsStatus === 'any_pending' && (!e.docs_status || e.docs_status === 'complete')) return false
        else if (f.docsStatus !== 'any_pending' && e.docs_status !== f.docsStatus) return false
      }
      if (f.dateFrom && new Date(e.start_date) < new Date(f.dateFrom)) return false
      if (f.dateTo && new Date(e.end_date) > new Date(f.dateTo)) return false
      if (f.hasPhoto && !(e.photo_urls?.length > 0)) return false
      if (f.hasCertificate && !(e.certificate_urls?.length > 0)) return false
      if (f.noAttachments && (e.photo_urls?.length > 0 || e.certificate_urls?.length > 0)) return false
      if (f.duration === 'single' && e.start_date !== e.end_date) return false
      if (f.duration === 'multi' && e.start_date === e.end_date) return false
      if (f.source === 'manual' && e.import_batch_id) return false
      if (f.source === 'imported' && !e.import_batch_id) return false
      return true
    })

    const levelOrder: Record<string, number> = { International: 1, National: 2, State: 3, Local: 4, Institutional: 5 }
    result.sort((a, b) => {
      if (f.sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (f.sort === 'date_asc') return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      if (f.sort === 'title_az') return a.event_title.localeCompare(b.event_title)
      if (f.sort === 'level_high') return (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
    })
    return result
  }, [events, filters])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await eventApi.delete(deleteTarget.id)
      setEvents(prev => prev.filter(e => e.id !== deleteTarget.id))
      setDeleteTarget(null)
      setSuccessModal('Event deleted successfully.')
      setTimeout(() => setSuccessModal(null), 2000)
    } catch {
      toast.error('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      if (filters.titleSearch) params.title_search = filters.titleSearch
      if (filters.organizerSearch) params.organizer_search = filters.organizerSearch
      if (filters.eventTypes.length > 0) params.event_type = filters.eventTypes.join(',')
      if (filters.roles.length > 0) params.role_at_event = filters.roles.join(',')
      if (filters.levels.length > 0) params.level = filters.levels.join(',')
      if (filters.modes.length > 0) params.mode = filters.modes.join(',')
      if (filters.status !== 'all') params.status = filters.status
      if (filters.docsStatus !== 'all') params.docs_status = filters.docsStatus
      if (filters.dateFrom) params.date_from = filters.dateFrom
      if (filters.dateTo) params.date_to = filters.dateTo
      if (filters.hasPhoto) params.has_photo = 'true'
      if (filters.hasCertificate) params.has_certificate = 'true'
      if (filters.noAttachments) params.no_attachments = 'true'
      if (filters.duration !== 'all') params.duration = filters.duration
      if (filters.source !== 'all') params.source = filters.source
      params.sort = filters.sort

      const res = await eventApi.mineExport(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'my-events.xlsx'; a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${filtered.length} event${filtered.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const activeFilterCount = (
    (filters.titleSearch ? 1 : 0) +
    (filters.organizerSearch ? 1 : 0) +
    filters.eventTypes.length +
    filters.roles.length +
    filters.levels.length +
    filters.modes.length +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.docsStatus !== 'all' ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.hasPhoto ? 1 : 0) +
    (filters.hasCertificate ? 1 : 0) +
    (filters.noAttachments ? 1 : 0) +
    (filters.duration !== 'all' ? 1 : 0) +
    (filters.source !== 'all' ? 1 : 0)
  )
  const hasFilters = activeFilterCount > 0
  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  const cardBorder = (e: Event) => {
    if (e.docs_status === 'pending_both') return 'border-red-300 shadow-red-100'
    if (e.docs_status === 'pending_cert' || e.docs_status === 'pending_photo') return 'border-amber-300 shadow-amber-100'
    return 'border-[#E5DDC6]/60'
  }

  const cardTopBar = (e: Event) => {
    if (e.docs_status === 'pending_both') return 'bg-gradient-to-r from-red-500 to-red-400'
    if (e.docs_status === 'pending_cert' || e.docs_status === 'pending_photo') return 'bg-gradient-to-r from-amber-500 to-amber-400'
    return 'bg-gradient-to-r from-[#101A24] to-[#16222E]'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Auto-deleted banner */}
        {autoDeleted.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-700">
                  {autoDeleted.length} event{autoDeleted.length !== 1 ? 's' : ''} auto-deleted — document deadline passed without uploading certificate & photo
                </p>
              </div>
              <button
                onClick={() => { setAutoDeleted([]); localStorage.removeItem('auto_deleted_events') }}
                className="text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {autoDeleted.map((e, i) => (
                <span
                  key={e.id ?? i}
                  className="inline-flex items-center gap-1.5 bg-red-100 border border-red-200 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {e.event_title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pending documents warning banner */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              <strong>{pendingCount} event{pendingCount !== 1 ? 's' : ''}</strong> need documents uploaded before their deadline — events highlighted in red/amber below.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button  onClick={() => navigate('/events/dashboard')}className="text-[#101A24] text-sm font-semibold flex items-center gap-1 mb-3 hover:underline">
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
            <h2 className="text-2xl font-bold text-[#101A24]">My Events</h2>
            <p className="text-[#101A24]/80 font-medium mt-1">
              {loading ? '...' : `${events.length} event${events.length !== 1 ? 's' : ''} in your portfolio`}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowImport(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 bg-white font-medium text-sm transition-colors"
            >
              <Upload size={16} />Import CSV
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 bg-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : hasFilters ? `Export (${filtered.length})` : 'Export'}
            </button>
            <button
              onClick={() => navigate('/events/new')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white font-medium text-sm transition-colors shadow-lg"
            >
              <Plus size={16} />Add Event
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-4 space-y-4">

          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Title search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#101A24]/70" />
              <input
                type="text"
                placeholder="Search by event title..."
                value={filters.titleSearch}
                onChange={e => setFilter('titleSearch', e.target.value)}
                className="w-full pl-9 pr-8 h-10 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] placeholder-teal-400 outline-none transition-colors"
              />
              {filters.titleSearch && (
                <button onClick={() => setFilter('titleSearch', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#101A24]/70 hover:text-[#101A24]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Organizer search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#101A24]/70" />
              <input
                type="text"
                placeholder="Search by organizer..."
                value={filters.organizerSearch}
                onChange={e => setFilter('organizerSearch', e.target.value)}
                className="w-full pl-9 pr-8 h-10 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] placeholder-teal-400 outline-none transition-colors"
              />
              {filters.organizerSearch && (
                <button onClick={() => setFilter('organizerSearch', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#101A24]/70 hover:text-[#101A24]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={e => setFilter('sort', e.target.value as typeof filters.sort)}
              className="h-10 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="date_asc">Sort: Date ↑</option>
              <option value="title_az">Sort: A → Z</option>
              <option value="level_high">Sort: Level (Intl first)</option>
            </select>

            {/* Filters toggle button */}
            <button
              onClick={() => setShowFilterPanel(p => !p)}
              className={`h-10 inline-flex items-center gap-2 px-4 rounded-lg border text-sm font-medium transition-colors ${showFilterPanel || activeFilterCount > 0
                  ? 'bg-[#101A24] border-[#101A24] text-white'
                  : 'bg-[#E5DDC6]/30/80 border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/50'
                }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-[#101A24] text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {hasFilters && (
              <button onClick={clearFilters} className="h-10 px-3 text-sm text-[#101A24] hover:text-[#101A24] font-medium whitespace-nowrap">
                Clear all
              </button>
            )}
          </div>

          {/* Expandable filter panel */}
          {showFilterPanel && (
            <div className="border-t border-[#E5DDC6]/60 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Event Type */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Event Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map(t => {
                    const active = filters.eventTypes.includes(t)
                    return (
                      <button
                        key={t}
                        onClick={() => setFilter('eventTypes', active ? filters.eventTypes.filter(x => x !== t) : [...filters.eventTypes, t])}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[#101A24] border-[#101A24] text-white' : 'bg-[#E5DDC6]/30 border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/50'
                          }`}
                      >{t}</button>
                    )
                  })}
                </div>
              </div>

              {/* Role */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Role</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES_AT_EVENT.map(r => {
                    const active = filters.roles.includes(r)
                    return (
                      <button
                        key={r}
                        onClick={() => setFilter('roles', active ? filters.roles.filter(x => x !== r) : [...filters.roles, r])}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[#101A24] border-[#101A24] text-white' : 'bg-[#E5DDC6]/30 border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/50'
                          }`}
                      >{r}</button>
                    )
                  })}
                </div>
              </div>

              {/* Level */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Level</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_LEVELS.map(l => {
                    const active = filters.levels.includes(l)
                    return (
                      <button
                        key={l}
                        onClick={() => setFilter('levels', active ? filters.levels.filter(x => x !== l) : [...filters.levels, l])}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[#101A24] border-[#101A24] text-white' : 'bg-[#E5DDC6]/30 border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/50'
                          }`}
                      >{l}</button>
                    )
                  })}
                </div>
              </div>

              {/* Mode */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Mode</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_MODES.map(m => {
                    const active = filters.modes.includes(m)
                    return (
                      <button
                        key={m}
                        onClick={() => setFilter('modes', active ? filters.modes.filter(x => x !== m) : [...filters.modes, m])}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[#101A24] border-[#101A24] text-white' : 'bg-[#E5DDC6]/30 border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/50'
                          }`}
                      >{m}</button>
                    )
                  })}
                </div>
              </div>

              {/* Status & Docs Status */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Status</p>
                  <select
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value as typeof filters.status)}
                    className="w-full h-9 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] rounded-lg text-sm text-[#101A24] outline-none"
                  >
                    <option value="all">All</option>
                    <option value="submitted">Submitted</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Docs Status</p>
                  <select
                    value={filters.docsStatus}
                    onChange={e => setFilter('docsStatus', e.target.value as typeof filters.docsStatus)}
                    className="w-full h-9 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] rounded-lg text-sm text-[#101A24] outline-none"
                  >
                    <option value="all">All</option>
                    <option value="complete">Complete</option>
                    <option value="any_pending">Any Pending</option>
                    <option value="pending_both">Needs cert + photo</option>
                    <option value="pending_cert">Needs certificate</option>
                    <option value="pending_photo">Needs photo</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Date Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-[#101A24]/80 font-medium">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={e => setFilter('dateFrom', e.target.value)}
                      className="w-full h-9 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] rounded-lg text-sm text-[#101A24] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#101A24]/80 font-medium">To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={e => setFilter('dateTo', e.target.value)}
                      className="w-full h-9 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] rounded-lg text-sm text-[#101A24] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Attachments</p>
                <div className="space-y-2">
                  {([
                    ['hasPhoto', 'Has photo'],
                    ['hasCertificate', 'Has certificate'],
                    ['noAttachments', 'No attachments'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={e => setFilter(key, e.target.checked)}
                        className="accent-[#101A24] w-4 h-4"
                      />
                      <span className="text-sm text-[#101A24] font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Duration</p>
                <div className="space-y-2">
                  {([['all', 'All'], ['single', 'Single-day'], ['multi', 'Multi-day']] as const).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duration"
                        checked={filters.duration === val}
                        onChange={() => setFilter('duration', val)}
                        className="accent-[#101A24] w-4 h-4"
                      />
                      <span className="text-sm text-[#101A24] font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <p className="text-xs font-bold text-[#101A24] uppercase tracking-wider mb-2">Source</p>
                <div className="space-y-2">
                  {([['all', 'All'], ['manual', 'Manually added'], ['imported', 'CSV imported']] as const).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source"
                        checked={filters.source === val}
                        onChange={() => setFilter('source', val)}
                        className="accent-[#101A24] w-4 h-4"
                      />
                      <span className="text-sm text-[#101A24] font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {!loading && (
          <p className="text-sm text-[#101A24] font-medium">
            {hasFilters
              ? `Showing ${filtered.length} of ${events.length} events`
              : `${events.length} event${events.length !== 1 ? 's' : ''} total`
            }
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl h-52 animate-pulse border border-[#E5DDC6]/60" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E5DDC6]/60">
            <BookOpen className="mx-auto text-teal-300 mb-3" size={40} />
            {hasFilters ? (
              <>
                <p className="text-[#101A24] font-medium">No events match your filters</p>
                <button onClick={clearFilters} className="mt-3 text-sm text-[#101A24] font-semibold hover:underline">Clear filters</button>
              </>
            ) : (
              <>
                <p className="text-[#101A24] font-medium">No events yet. Start building your portfolio.</p>
                <button onClick={() => navigate('/events/new')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#101A24] text-white rounded-lg text-sm font-medium hover:bg-[#16222E]">
                  <Plus size={16} />Add Event
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(event => {
              const pending = isPending(event)
              const label = docsLabel(event.docs_status)
              const countdown = pending && event.document_deadline
                ? formatCountdown(event.document_deadline, now)
                : null
              const draftCountdown = event.status === 'draft' && event.created_at
                ? formatCountdown(new Date(event.created_at).getTime() + 7 * 86400000 - now)
                : null

              return (
                <div
                  key={event.id}
                  onClick={() => setPreviewEvent(event)}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group cursor-pointer ${cardBorder(event)}`}
                >
                  <div className={`h-1.5 w-full ${cardTopBar(event)}`} />

                  {/* Draft strip */}
                  {draftCountdown && (
                    <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold bg-amber-50 text-amber-700">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        Draft — auto-deletes in
                      </span>
                      <span className={`flex items-center gap-1 font-bold ${draftCountdown.urgent ? 'text-red-600 animate-pulse' : ''}`}>
                        <Clock size={11} />
                        {draftCountdown.text}
                      </span>
                    </div>
                  )}

                  {/* Pending strip */}
                  {pending && (
                    <div className={`px-4 py-2 flex items-center justify-between text-xs font-semibold ${event.docs_status === 'pending_both' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        {label}
                      </span>
                      {countdown && (
                        <span className={`flex items-center gap-1 font-bold ${countdown.urgent ? 'text-red-600 animate-pulse' : ''}`}>
                          <Clock size={11} />
                          {countdown.text}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E5DDC6]/50 text-[#101A24]">{event.event_type}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${event.status === 'draft'
                            ? 'text-amber-600 bg-amber-50'
                            : pending
                              ? event.docs_status === 'pending_both' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                              : 'text-emerald-600 bg-emerald-50'
                          }`}>
                          {pending ? (event.docs_status === 'pending_both' ? 'Docs missing' : 'Incomplete') : event.status}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}/edit`) }}
                          className="p-1.5 rounded-md text-[#101A24]/70 hover:text-[#101A24] hover:bg-[#E5DDC6]/30 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(event) }}
                          className="p-1.5 rounded-md text-[#101A24]/70 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h4
                      onClick={() => setPreviewEvent(event)}
                      className="font-bold text-[#101A24] text-[17px] mb-3 line-clamp-2 leading-snug group-hover:text-[#101A24] transition-colors cursor-pointer"
                    >
                      {event.event_title}
                    </h4>

                    <div className="mt-auto space-y-2 text-[13px] text-[#101A24] font-medium">
                      <div className="flex items-center gap-2.5">
                        <Users size={14} className="text-[#101A24]/80 flex-shrink-0" />
                        <span className="truncate">{event.role_at_event} · {event.organizer}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Calendar size={14} className="text-[#101A24]/80 flex-shrink-0" />
                        <span>
                          {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {event.start_date !== event.end_date && ` – ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                          {event.start_date === event.end_date && `, ${new Date(event.start_date).getFullYear()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Award size={14} className="text-[#101A24]/80 flex-shrink-0" />
                        <span>{event.level} Level</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3.5 px-5 border-t flex justify-between items-center text-xs ${pending
                      ? event.docs_status === 'pending_both' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'
                      : 'bg-[#E5DDC6]/30/40 border-[#E5DDC6]/60 text-[#101A24]'
                    }`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {event.photo_urls?.length > 0
                        ? <><ImageIcon size={14} className="text-[#101A24]" />{event.photo_urls.length} Attachment{event.photo_urls.length !== 1 ? 's' : ''}</>
                        : <span className={pending ? 'text-red-400' : 'text-[#101A24]/70'}>No attachments</span>
                      }
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}/edit`) }}
                      className={`font-bold uppercase tracking-wide text-[10px] hover:underline ${pending ? (event.docs_status === 'pending_both' ? 'text-red-600' : 'text-amber-600') : 'text-[#101A24]'
                        }`}
                    >
                      {pending ? 'Upload docs →' : event.status === 'draft' ? 'Resume' : 'Details'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onEdit={() => { setPreviewEvent(null); navigate(`/events/${previewEvent.id}/edit`) }}
        />
      )}
      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Event</h3>
            <p className="text-gray-600 text-sm mb-1">Are you sure you want to delete:</p>
            <p className="font-semibold text-[#101A24] text-sm mb-4">"{deleteTarget.event_title}"</p>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-6">
              <p className="text-red-600 text-xs">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            eventApi.getMine().then(res => setEvents(res.data.events)).catch(() => { })
          }}
        />
      )}
      {/* Delete success modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center pointer-events-auto">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Deleted</h3>
            <p className="text-sm text-gray-500">{successModal}</p>
          </div>
        </div>
      )}
    </div>
  )
}