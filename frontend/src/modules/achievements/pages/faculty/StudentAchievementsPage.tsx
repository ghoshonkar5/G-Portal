import { useState, useEffect, useRef } from 'react'
import { getStudentAchievements, exportStudentAchievements } from '../../api/achievementsApi'
import AchievementCard      from '../../components/AchievementCard'
import AchievementViewModal from '../../components/AchievementViewModal'
import Lightbox             from '../../components/Lightbox'
import { downloadBlob }     from '../../utils'
import type { Achievement } from '../../types'

const EVENT_TYPES = ['academic', 'technical', 'sports', 'cultural', 'other']
const LEVELS      = ['international', 'national', 'state', 'university', 'college']
const RESULTS     = ['winner', 'runner_up', 'participant', 'merit']

export default function StudentAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [viewing,   setViewing]   = useState<Achievement | null>(null)
  const [lightbox,  setLightbox]  = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const searchRef   = useRef<HTMLInputElement>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filters, setFilters] = useState({
    search: '', event_type: '', level: '', result: '', year: '',
  })

  const fetchData = async (f = filters) => {
    setLoading(true)
    const params: Record<string, string> = {}
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v })
    try { setAchievements(await getStudentAchievements(params)) }
    catch { setAchievements([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleFilterChange = (key: string, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    if (key === 'search') {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fetchData(next), 350)
    } else {
      fetchData(next)
    }
  }

  const clearFilters = () => {
    const cleared = { search: '', event_type: '', level: '', result: '', year: '' }
    setFilters(cleared)
    if (searchRef.current) searchRef.current.value = ''
    fetchData(cleared)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const blob = await exportStudentAchievements(params)
      downloadBlob(blob, `student_achievements_${Date.now()}.xlsx`)
    } finally { setExporting(false) }
  }

  const SELECT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Achievements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{achievements.length} record{achievements.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleExport} disabled={exporting || achievements.length === 0}
          className="px-4 py-2 bg-[#101A24] text-white text-sm font-semibold rounded-lg hover:bg-[#16222E] disabled:opacity-50 transition-colors">
          {exporting ? 'Exporting…' : '↓ Export Excel'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 space-y-3">
        <input ref={searchRef} placeholder="Search by name or roll number…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          onChange={e => handleFilterChange('search', e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className={SELECT} value={filters.event_type}
            onChange={e => handleFilterChange('event_type', e.target.value)}>
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className={SELECT} value={filters.level}
            onChange={e => handleFilterChange('level', e.target.value)}>
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
          <select className={SELECT} value={filters.result}
            onChange={e => handleFilterChange('result', e.target.value)}>
            <option value="">All Results</option>
            {RESULTS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
          <select className={SELECT} value={filters.year}
            onChange={e => handleFilterChange('year', e.target.value)}>
            <option value="">All Years</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Clear filters
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium text-gray-500">No achievements match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map(a => (
            <AchievementCard key={a.id} achievement={a} showActions={false} onView={setViewing} />
          ))}
        </div>
      )}

      {viewing && (
        <AchievementViewModal achievement={viewing} onClose={() => setViewing(null)} onLightbox={setLightbox} />
      )}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
