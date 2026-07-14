import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, Award, Mic, Plus, Upload, ChevronRight, Users, Image as ImageIcon, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Event, Memory } from '../../types'
import { eventApi } from '../../api/eventApi'
import { useAuth } from '../../../../context/AuthContext'
import { selectMemory } from '../../utils/memorySelector'
import Navbar from '../../components/Navbar'
import MemoryCard from '../../components/MemoryCard'
import AcademicCalendar from '../../components/AcademicCalendar'
import CSVImportModal from '../../components/CSVImportModal'
import EventPreviewModal from '../../components/EventPreviewModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState<Memory[]>([])
  const [showImport, setShowImport] = useState(false)
  const [autoDeleted, setAutoDeleted] = useState<{ id: number; event_title: string }[]>([])
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null)
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const formatTimer = (ms: number) => {
    if (ms <= 0) return 'Expired'
    const d = Math.floor(ms / 86400000)
    const h = Math.floor((ms % 86400000) / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventApi.getMine()
setEvents(res.data.events)
// Show incomplete alert once per login session
        const allEvents: Event[] = res.data.events
        const hasDrafts = allEvents.some(e => e.status === 'draft')
        const hasPending = allEvents.some(e => e.docs_status && e.docs_status !== 'complete')
        if ((hasDrafts || hasPending) && !sessionStorage.getItem('incomplete_alert_shown')) {
          setShowIncompleteAlert(true)
          sessionStorage.setItem('incomplete_alert_shown', 'true')
        }
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
    fetchEvents()
 }, [])

  // Memory logic — new memory per login session
  useEffect(() => {
    if (events.length === 0) return
    const submitted = events.filter(e => e.status === 'submitted')
    if (submitted.length < 2) return

    const pool: Memory[] = []
    for (let i = 0; i < 20; i++) {
      const m = selectMemory(events)
      if (m) pool.push(m)
    }
    const unique = pool.filter((m, i, arr) => arr.findIndex(x => x.headline === m.headline) === i)
    setMemories(unique)
  }, [events])

  const submitted = useMemo(() => events.filter(e => e.status === 'submitted'), [events])
  const thisYear = new Date().getFullYear()
  const stats = useMemo(() => ({
    total: submitted.length,
    thisYear: submitted.filter(e => new Date(e.start_date).getFullYear() === thisYear).length,
    international: submitted.filter(e => e.level === 'International').length,
    speaking: submitted.filter(e => ['Speaker', 'Resource Person', 'Chair'].includes(e.role_at_event)).length,
  }), [submitted, thisYear])

  const recent = useMemo(() => submitted.filter(e => !e.docs_status || e.docs_status === 'complete').slice(0, 6), [submitted])
  const isPending = (e: Event) => e.docs_status && e.docs_status !== 'complete'

  const statCards = [
    { label: 'Total Events', value: stats.total, icon: BookOpen, color: 'text-[#101A24]', bg: 'bg-[#E5DDC6]/30' },
    { label: 'Events This Year', value: stats.thisYear, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'International', value: stats.international, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'As Speaker / Chair', value: stats.speaking, icon: Mic, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#101A24]">
              Welcome back, {user?.name?.split(' ').slice(-1)[0]}
            </h2>
            <p className="text-[#101A24]/80 font-medium mt-1">Here's your event portfolio overview.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowImport(true)}
  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 bg-white font-medium text-sm transition-colors"
>
  <Upload size={16} /> Import CSV
            </button>
            <button
              onClick={() => navigate('/events/new')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white font-medium text-sm transition-colors shadow-lg"
            >
              <Plus size={16} /> Add Event
            </button>
          </div>
        </div>

        {/* Incomplete/Draft nudge banner */}
        {!loading && (() => {
          const drafts = events.filter(e => e.status === 'draft')
          const pending = events.filter(e => e.docs_status && e.docs_status !== 'complete')
          if (drafts.length === 0 && pending.length === 0) return null
          return (
            <div className="flex flex-wrap items-center gap-3">
              {drafts.length > 0 && (
                <button
                  onClick={() => navigate('/events/my-events?status=draft')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {drafts.length} unsubmitted draft{drafts.length !== 1 ? 's' : ''} — action required
                  <span className="text-amber-500 font-bold">→</span>
                </button>
              )}
              {pending.length > 0 && (
                <button
                  onClick={() => navigate('/events/my-events?status=submitted')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  {pending.length} event{pending.length !== 1 ? 's' : ''} awaiting document upload
                  <span className="text-red-500 font-bold">→</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#E5DDC6]/60 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#101A24]/70 mb-0.5 uppercase tracking-wide">{stat.label}</p>
                <h3 className="text-3xl font-bold text-[#101A24] leading-none">
                  {loading ? '—' : stat.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Memory Card */}
        {memories.length > 0 && (
          <MemoryCard
            memories={memories}
            onViewEvent={id => navigate(`/events/${id}/edit`)}
          />
        )}

        {/* Activity Calendar */}
        <AcademicCalendar events={events} />

        {/* Recent Submissions */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-[#101A24] flex items-center gap-2">
              <Calendar className="text-[#101A24]" size={22} />
              Recent Submissions
            </h3>
            <button
              onClick={() => navigate('/events/my-events')}
              className="inline-flex items-center gap-1 text-sm text-[#101A24] hover:text-[#101A24] font-medium"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl h-48 animate-pulse border border-[#E5DDC6]/60" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#E5DDC6]/60">
              <BookOpen className="mx-auto text-teal-300 mb-3" size={40} />
              <p className="text-[#101A24] font-medium">No events yet</p>
              <p className="text-[#101A24]/80 text-sm mt-1">Start building your portfolio</p>
              <button
                onClick={() => navigate('/events/new')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#101A24] text-white rounded-lg text-sm font-medium hover:bg-[#16222E]"
              >
                <Plus size={16} /> Add Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recent.map(event => (
                <div
                  key={event.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group cursor-pointer ${
  isPending(event)
    ? event.docs_status === 'pending_both' ? 'border-red-300' : 'border-amber-300'
    : 'border-[#E5DDC6]/60 hover:border-[#E5DDC6]'
}`}
                  onClick={() => setPreviewEvent(event)}
                >
                  <div className={`h-1.5 w-full ${
  isPending(event)
    ? event.docs_status === 'pending_both'
      ? 'bg-gradient-to-r from-red-500 to-red-400'
      : 'bg-gradient-to-r from-amber-500 to-amber-400'
    : 'bg-gradient-to-r from-[#101A24] to-[#16222E]'
}`} />
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E5DDC6]/50 text-[#101A24]">
                        {event.event_type}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
  event.status === 'draft'
    ? 'text-amber-600 bg-amber-50'
    : isPending(event)
      ? event.docs_status === 'pending_both' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
      : 'text-emerald-600 bg-emerald-50'
}`}>
  {isPending(event)
    ? event.docs_status === 'pending_both' ? 'Docs missing' : 'Incomplete'
    : event.status}
</span>
                    </div>
                    <h4 className="font-bold text-[#101A24] text-[17px] mb-3 line-clamp-2 leading-snug group-hover:text-[#101A24] transition-colors">
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
                  <div className="bg-[#E5DDC6]/30/40 p-3.5 px-5 border-t border-[#E5DDC6]/60 flex justify-between items-center text-xs text-[#101A24]">
                    <div className="flex items-center gap-1.5 font-medium">
                      {event.photo_urls?.length > 0 ? (
                        <><ImageIcon size={14} className="text-[#101A24]" /> {event.photo_urls.length} Attachments</>
                      ) : (
                        <span className="text-[#101A24]/70">No attachments</span>
                      )}
                    </div>
                    <span className="font-bold text-[#101A24] uppercase tracking-wide text-[10px]">
                      {event.status === 'draft' ? 'Resume' : 'Details'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {showIncompleteAlert && (() => {
          const drafts = events.filter(e => e.status === 'draft')
          const pending = events.filter(e => e.docs_status && e.docs_status !== 'complete')
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">You have incomplete events</h3>
                      <p className="text-xs text-gray-500 mt-0.5">These need your attention before their deadlines.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowIncompleteAlert(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                {drafts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                      Drafts — auto-deleted after 7 days ({drafts.length})
                    </p>
                    <div className="space-y-2">
                      {drafts.map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-amber-900 line-clamp-1">{e.event_title || 'Untitled draft'}</p>
                            {e.created_at && (
                              <p className={`text-[11px] font-bold mt-0.5 ${new Date(e.created_at).getTime() + 7 * 86400000 - now < 86400000 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                                ⏱ {formatTimer(new Date(e.created_at).getTime() + 7 * 86400000 - now)} left
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => { setShowIncompleteAlert(false); navigate(`/events/${e.id}/edit`) }}
                            className="text-xs font-bold text-amber-700 hover:underline ml-3 whitespace-nowrap"
                          >
                            Complete →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pending.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                      Missing documents — will be deleted at deadline ({pending.length})
                    </p>
                    <div className="space-y-2">
                      {pending.map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-red-900 line-clamp-1">{e.event_title}</p>
                            <p className="text-[11px] text-red-500 mt-0.5">
                              {e.docs_status === 'pending_both' ? 'Needs certificate + photo' :
                               e.docs_status === 'pending_cert' ? 'Needs certificate' : 'Needs photo'}
                            </p>
                            {e.document_deadline && (
                              <p className={`text-[11px] font-bold mt-0.5 ${new Date(e.document_deadline).getTime() - now < 3600000 ? 'text-red-600 animate-pulse' : 'text-red-400'}`}>
                                ⏱ {formatTimer(new Date(e.document_deadline).getTime() - now)} left
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => { setShowIncompleteAlert(false); navigate(`/events/${e.id}/edit`) }}
                            className="text-xs font-bold text-red-700 hover:underline ml-3 whitespace-nowrap"
                          >
                            Upload →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowIncompleteAlert(false)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-bold"
                >
                  Got it
                </button>
              </div>
            </div>
          )
        })()}
        {previewEvent && (
          <EventPreviewModal
            event={previewEvent}
            onClose={() => setPreviewEvent(null)}
            onEdit={() => { setPreviewEvent(null); navigate(`/events/${previewEvent.id}/edit`) }}
          />
        )}

        {showImport && (
  <CSVImportModal
    onClose={() => setShowImport(false)}
    onImported={() => {
  eventApi.getMine().then(res => setEvents(res.data.events)).catch(() => {})
}}
  />
)}
      </main>
    </div>
  )
}