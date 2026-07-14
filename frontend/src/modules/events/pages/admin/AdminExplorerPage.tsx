import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Download, SlidersHorizontal, X, Filter,
  LayoutList, Layers, MapPin, Image as ImageIcon, FileBadge,
  ChevronLeft, ChevronRight, Loader2, Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../../types'
         import { EVENT_TYPES, ROLES_AT_EVENT, EVENT_LEVELS, EVENT_MODES } from '../../types'
import { eventApi } from '../../api/eventApi'
import Navbar from '../../components/Navbar'

const ACADEMIC_YEARS = ['All', '2025-26', '2024-25', '2023-24']
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'faculty_name', label: 'Faculty name A-Z' },
  { value: 'event_title', label: 'Event title A-Z' },
  { value: 'level', label: 'Level: International first' },
]
const LEVEL_ORDER = ['International', 'National', 'State', 'Local', 'Institutional']
const PAGE_SIZE = 20

function matchesAY(dateStr: string, ay: string): boolean {
  if (ay === 'All' || !dateStr) return true
  const startY = parseInt(ay.split('-')[0])
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth()
  return (y === startY && m >= 6) || (y === startY + 1 && m <= 5)
}

function FilterSelect({ label, value, onChange, options }: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[] | string[]
}) {
  const normalized = (options as any[]).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <div>
      {label && <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700">
        {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function AdminExplorerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'faculty' | 'event'>('faculty')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const [exporting, setExporting] = useState(false)

  // Filters — pre-fill search from URL param (from FacultyPage "View Events" link)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [year, setYear] = useState('All')
  const [month, setMonth] = useState('All')
  const [dept, setDept] = useState('All')
  const [designation, setDesignation] = useState('All')
  const [type, setType] = useState('All')
  const [level, setLevel] = useState('All')
  const [mode, setMode] = useState('All')
  const [role, setRole] = useState('All')
  const [status, setStatus] = useState('All')
  const [docsStatus, setDocsStatus] = useState('All')
  const [source, setSource] = useState('All')
  const [duration, setDuration] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [photosOnly, setPhotosOnly] = useState(false)
  const [certsOnly, setCertsOnly] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await eventApi.getAll({ limit: '10000' })
        setAllEvents(res.data.data ?? res.data)
      } catch {
        toast.error('Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const departments = useMemo(() => {
    const depts = [...new Set(allEvents.map(e => e.department).filter(Boolean))] as string[]
    return ['All', ...depts.sort()]
  }, [allEvents])

  const designations = useMemo(() => {
    const desigs = [...new Set(allEvents.map(e => e.designation).filter(Boolean))] as string[]
    return ['All', ...desigs.sort()]
  }, [allEvents])

  const MONTHS = [
    'All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const filteredData = useMemo(() => {
    let data = allEvents.filter(e => {
      // Universal search
      if (search) {
        const q = search.toLowerCase()
        if (
          !e.event_title?.toLowerCase().includes(q) &&
          !e.faculty_name?.toLowerCase().includes(q) &&
          !(e.faculty_code || '').toLowerCase().includes(q) &&
          !e.organizer?.toLowerCase().includes(q)
        ) return false
      }

      // Organizer-specific search
      if (organizerSearch && !e.organizer?.toLowerCase().includes(organizerSearch.toLowerCase())) return false

      // Academic year
      if (!matchesAY(e.start_date, year)) return false

      // Month filter
      if (month !== 'All') {
        const mIdx = MONTHS.indexOf(month) // 1-based since index 0 is 'All'
        if (new Date(e.start_date).getMonth() + 1 !== mIdx) return false
      }

      // Department & designation
      if (dept !== 'All' && e.department !== dept) return false
      if (designation !== 'All' && e.designation !== designation) return false

      // Event attribute filters
      if (type !== 'All' && e.event_type !== type) return false
      if (level !== 'All' && e.level !== level) return false
      if (mode !== 'All' && e.mode !== mode) return false
      if (role !== 'All' && e.role_at_event !== role) return false
      if (status !== 'All' && e.status !== status) return false

      // Docs status
      if (docsStatus !== 'All') {
        if (docsStatus === 'any_pending') {
          if (!e.docs_status || e.docs_status === 'complete') return false
        } else {
          if (e.docs_status !== docsStatus) return false
        }
      }

      // Source
      if (source === 'manual' && e.import_batch_id) return false
      if (source === 'imported' && !e.import_batch_id) return false

      // Date range (independent of academic year)
      if (dateFrom && new Date(e.start_date) < new Date(dateFrom)) return false
      if (dateTo && new Date(e.end_date) > new Date(dateTo)) return false

      // Attachment flags
      if (photosOnly && !(e.photo_urls?.length > 0)) return false
      if (certsOnly && !(e.certificate_urls?.length > 0)) return false

      // Duration
      if (duration === 'single' && e.start_date !== e.end_date) return false
      if (duration === 'multi' && e.start_date === e.end_date) return false

      return true
    })

    return [...data].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        case 'faculty_name': return (a.faculty_name || '').localeCompare(b.faculty_name || '')
        case 'event_title': return a.event_title.localeCompare(b.event_title)
        case 'level': return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
        default: return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      }
    })
  }, [allEvents, search, organizerSearch, year, month, dept, designation, type, level, mode,
    role, status, docsStatus, source, dateFrom, dateTo, sortBy, photosOnly, certsOnly, duration])

  useEffect(() => { setPage(1) }, [filteredData])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredData.slice(start, start + PAGE_SIZE)
  }, [filteredData, page])

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE)

  const groupedData = useMemo(() => {
    const map: Record<string, {
      event_title: string; organizer: string; start_date: string
      end_date: string; event_type: string; level: string; attendees: Event[]
    }> = {}
    filteredData.forEach(e => {
      const key = `${e.event_title}|${e.organizer}|${e.start_date}`
      if (!map[key]) map[key] = {
        event_title: e.event_title, organizer: e.organizer,
        start_date: e.start_date, end_date: e.end_date,
        event_type: e.event_type, level: e.level, attendees: []
      }
      map[key].attendees.push(e)
    })
    return Object.values(map).sort((a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    )
  }, [filteredData])

  const hasFilters = !!(
    search || organizerSearch || year !== 'All' || month !== 'All' ||
    dept !== 'All' || designation !== 'All' || type !== 'All' ||
    level !== 'All' || mode !== 'All' || role !== 'All' ||
    status !== 'All' || docsStatus !== 'All' || source !== 'All' ||
    duration !== 'All' || dateFrom || dateTo || photosOnly || certsOnly
  )

  const clearFilters = () => {
    setSearch(''); setOrganizerSearch(''); setYear('All'); setMonth('All')
    setDept('All'); setDesignation('All'); setType('All'); setLevel('All')
    setMode('All'); setRole('All'); setStatus('All'); setDocsStatus('All')
    setSource('All'); setDuration('All'); setDateFrom(''); setDateTo('')
    setSortBy('date_desc'); setPhotosOnly(false); setCertsOnly(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (organizerSearch) params.organizer_search = organizerSearch
      if (year !== 'All') params.academic_year = year
      if (month !== 'All') params.month = String(MONTHS.indexOf(month))
      if (dept !== 'All') params.department = dept
      if (designation !== 'All') params.designation = designation
      if (type !== 'All') params.event_type = type
      if (level !== 'All') params.level = level
      if (mode !== 'All') params.mode = mode
      if (role !== 'All') params.role_at_event = role
      if (status !== 'All') params.status = status
      if (docsStatus !== 'All') params.docs_status = docsStatus
      if (source !== 'All') params.source = source
      if (duration !== 'All') params.duration = duration
      if (dateFrom) params.start_date = dateFrom
      if (dateTo) params.end_date = dateTo
      if (photosOnly) params.has_photos = 'true'
      if (certsOnly) params.has_certificates = 'true'

      const res = await eventApi.adminExport(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `events-export-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${filteredData.length} record${filteredData.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const levelColor = (l: string) =>
    l === 'International' ? 'text-purple-600' : l === 'National' ? 'text-[#101A24]' : 'text-[#101A24]'

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar isAdmin={true} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/events/admin/dashboard')}
            className="text-[#101A24] text-sm font-semibold flex items-center gap-1 mb-3 hover:underline">
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#101A24] flex items-center gap-2">
                <Search className="text-[#101A24]" size={24} /> Comprehensive Explorer
              </h2>
              <p className="text-[#101A24]/80 font-medium text-sm mt-1">
                Deep search and multi-dimensional grouping of all institutional events.
              </p>
            </div>
            <button onClick={handleExport} disabled={exporting || filteredData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#101A24] hover:bg-[#16222E] text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50">
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting...' : 'Export View to Excel'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5DDC6]/60 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-[11px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Universal Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Event title, faculty name, ID, organizer..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 focus:border-[#101A24] transition-all" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Organizer Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by organizer name..."
                  value={organizerSearch} onChange={e => setOrganizerSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 focus:border-[#101A24] transition-all" />
                {organizerSearch && (
                  <button onClick={() => setOrganizerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Academic Year</label>
              <select value={year} onChange={e => setYear(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 text-gray-700">
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 text-gray-700">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 text-gray-700">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end items-end">
              <div className="bg-gray-100 p-1 rounded-lg flex items-center shadow-inner">
                <button onClick={() => setViewMode('faculty')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'faculty' ? 'bg-white text-[#101A24] shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>
                  <LayoutList size={15} /> Faculty View
                </button>
                <button onClick={() => setViewMode('event')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'event' ? 'bg-[#101A24] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Layers size={15} /> Event View
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button onClick={() => setShowAdvanced(p => !p)}
              className="text-[#101A24] text-sm font-semibold flex items-center gap-1.5 hover:underline">
              <SlidersHorizontal size={14} />
              {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Found <span className="font-bold text-[#101A24]">{filteredData.length}</span> records
                {viewMode === 'event' && <> across <span className="font-bold text-[#101A24]">{groupedData.length}</span> unique events</>}
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors">
                  <X size={12} /> Clear All
                </button>
              )}
            </div>
          </div>
          {showAdvanced && (
            <div className="pt-4 p-4 bg-[#E5DDC6]/30/50 rounded-lg border border-[#E5DDC6]/60 space-y-5">

              {/* Row 1 — event attribute selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FilterSelect label="Event Type" value={type} onChange={setType} options={['All', ...EVENT_TYPES]} />
                <FilterSelect label="Event Level" value={level} onChange={setLevel} options={['All', ...EVENT_LEVELS]} />
                <FilterSelect label="Mode" value={mode} onChange={setMode} options={['All', ...EVENT_MODES]} />
                <FilterSelect label="Role at Event" value={role} onChange={setRole} options={['All', ...ROLES_AT_EVENT]} />
                <FilterSelect label="Status" value={status} onChange={setStatus} options={['All', 'submitted', 'draft']} />
                <FilterSelect label="Designation" value={designation} onChange={setDesignation} options={designations} />
                <FilterSelect label="Sort By" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Docs Status</label>
                  <select value={docsStatus} onChange={e => setDocsStatus(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700">
                    <option value="All">All</option>
                    <option value="complete">Complete</option>
                    <option value="any_pending">Any Pending</option>
                    <option value="pending_both">Needs cert + photo</option>
                    <option value="pending_cert">Needs certificate</option>
                    <option value="pending_photo">Needs photo</option>
                  </select>
                </div>
              </div>

              {/* Row 2 — date range, source, duration, attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#E5DDC6]/60">

                {/* Date From */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Date From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700" />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Date To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700" />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Source</label>
                  <select value={source} onChange={e => setSource(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700">
                    <option value="All">All</option>
                    <option value="manual">Manually added</option>
                    <option value="imported">CSV imported</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">Duration</label>
                  <select value={duration} onChange={e => setDuration(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700">
                    <option value="All">All</option>
                    <option value="single">Single-day only</option>
                    <option value="multi">Multi-day only</option>
                  </select>
                </div>

                {/* Attachment flags */}
                <div className="md:col-span-4 flex flex-wrap gap-6">
                  <label className="block text-[10px] uppercase font-bold text-gray-500 w-full tracking-wider">Attachment Flags</label>
                  {([
                    { label: 'Has photos attached', val: photosOnly, set: setPhotosOnly },
                    { label: 'Has certificates uploaded', val: certsOnly, set: setCertsOnly },
                  ] as const).map(({ label, val, set }) => (
                    <label key={label} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                        className="rounded text-[#101A24] focus:ring-[#101A24] w-4 h-4 border-gray-300" />
                      {label}
                    </label>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-100 last:border-0 animate-pulse bg-gray-50/50" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[#E5DDC6]/60 p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Filter size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No events found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">Try adjusting or clearing your filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-[#101A24] font-semibold text-sm hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === 'faculty' ? (
          <>
            <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                      <th className="px-5 py-3.5 font-bold">Faculty Member</th>
                      <th className="px-4 py-3.5 font-bold hidden md:table-cell">Dept</th>
                      <th className="px-4 py-3.5 font-bold">Event & Organizer</th>
                      <th className="px-4 py-3.5 font-bold hidden lg:table-cell">Type</th>
                      <th className="px-4 py-3.5 font-bold hidden lg:table-cell">Level</th>
                      <th className="px-4 py-3.5 font-bold hidden sm:table-cell">Dates</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(e => (
                      <tr key={e.id} onClick={() => setDetailEvent(e)}
                        className="border-b border-gray-100 last:border-0 hover:bg-[#E5DDC6]/30/50 cursor-pointer transition-colors text-sm text-gray-700">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{e.faculty_name}</div>
                          <div className="text-xs text-gray-500">{e.faculty_code}</div>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600 hidden md:table-cell">{e.department}</td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="font-semibold text-[#101A24] truncate text-sm" title={e.event_title}>{e.event_title}</div>
                          <div className="text-xs text-gray-500 truncate" title={e.organizer}>{e.organizer}</div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6]/60">
                            {e.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className={`text-xs font-semibold ${levelColor(e.level)}`}>{e.level}</span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600 hidden sm:table-cell whitespace-nowrap">
                          {fmt(e.start_date)}
                          {e.start_date !== e.end_date && <><br /><span className="text-gray-400">to {fmt(e.end_date)}</span></>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${e.status === 'submitted' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500 font-medium">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredData.length)} of {filteredData.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let n: number
                    if (totalPages <= 7) n = i + 1
                    else if (page <= 4) n = i + 1
                    else if (page >= totalPages - 3) n = totalPages - 6 + i
                    else n = page - 3 + i
                    return (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-[#101A24] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {n}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5">
            {groupedData.map((group, idx) => (
              <div key={idx} className="bg-white border border-[#E5DDC6]/60 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-teal-50 to-white p-5 border-b border-[#E5DDC6]/60">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#101A24] text-white">{group.event_type}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">{group.level}</span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar size={11} />
                          {fmt(group.start_date)}{group.start_date !== group.end_date && ` – ${fmt(group.end_date)}`}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#101A24] leading-tight truncate">{group.event_title}</h3>
                      <p className="text-sm text-[#101A24] flex items-center gap-1 mt-1">
                        <MapPin size={13} className="flex-shrink-0" /> {group.organizer}
                      </p>
                    </div>
                    <div className="bg-white border border-[#E5DDC6]/60 px-4 py-2 rounded-lg text-center shadow-sm flex-shrink-0">
                      <div className="text-2xl font-bold text-[#101A24] leading-none">{group.attendees.length}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">Attendees</div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-bold">Faculty</th>
                        <th className="px-4 py-3 font-bold hidden md:table-cell">Department</th>
                        <th className="px-4 py-3 font-bold">Role at Event</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold text-right">Attachments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.attendees.map(att => (
                        <tr key={att.id} onClick={() => setDetailEvent(att)}
                          className="border-b border-gray-50 last:border-0 hover:bg-[#E5DDC6]/30/30 cursor-pointer text-sm transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-gray-900">{att.faculty_name}</div>
                            <div className="text-xs text-gray-500">{att.faculty_code}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{att.department}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6]/60">
                              {att.role_at_event}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${att.status === 'submitted' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-2 text-[#101A24]">
                              {att.photo_urls?.length > 0 && <span title="Has Photos"><ImageIcon size={15} /></span>}
                              {att.certificate_urls?.length > 0 && <span title="Has Certificates"><FileBadge size={15} /></span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailEvent(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 sticky top-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#101A24] bg-[#E5DDC6]/30 px-2 py-1 rounded">
                {detailEvent.event_type}
              </span>
              <button onClick={() => setDetailEvent(null)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <h3 className="text-lg font-bold text-[#101A24] leading-snug">{detailEvent.event_title}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Faculty', value: `${detailEvent.faculty_name} (${detailEvent.faculty_code})`, full: true },
                  { label: 'Department', value: detailEvent.department },
                  { label: 'Designation', value: detailEvent.designation },
                  { label: 'Role', value: detailEvent.role_at_event },
                  { label: 'Organizer', value: detailEvent.organizer, full: true },
                  { label: 'Level', value: detailEvent.level },
                  { label: 'Mode', value: detailEvent.mode },
                  { label: 'Venue', value: detailEvent.venue || '—' },
                  { label: 'Start Date', value: new Date(detailEvent.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  { label: 'End Date', value: new Date(detailEvent.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  { label: 'Status', value: detailEvent.status.charAt(0).toUpperCase() + detailEvent.status.slice(1) },
                ].map(({ label, value, full }) => (
                  <div key={label} className={full ? 'col-span-2' : ''}>
                    <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">{label}</p>
                    <p className="text-gray-800 font-medium text-sm">{value}</p>
                  </div>
                ))}
              </div>
              {detailEvent.description && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider mb-1">Description</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{detailEvent.description}</p>
                </div>
              )}
              {(detailEvent.photo_urls?.length > 0 || detailEvent.certificate_urls?.length > 0) && (
                <div className="flex gap-3 flex-wrap">
                  {detailEvent.photo_urls?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-[#101A24] font-medium bg-[#E5DDC6]/30 px-3 py-1.5 rounded-lg border border-[#E5DDC6]/60">
                      <ImageIcon size={15} /> {detailEvent.photo_urls.length} Photo{detailEvent.photo_urls.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {detailEvent.certificate_urls?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-[#101A24] font-medium bg-[#E5DDC6]/30 px-3 py-1.5 rounded-lg border border-[#E5DDC6]/60">
                      <FileBadge size={15} /> {detailEvent.certificate_urls.length} Certificate{detailEvent.certificate_urls.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}