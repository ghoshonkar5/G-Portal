import { useState, useEffect } from 'react'
import { getAllAchievements, exportAllAchievements } from '../../api/achievementsApi'
import AchievementCard      from '../../components/AchievementCard'
import AchievementViewModal from '../../components/AchievementViewModal'
import Lightbox             from '../../components/Lightbox'
import { downloadBlob }     from '../../utils'
import type { Achievement } from '../../types'

type RoleTab = 'student' | 'faculty'
const EVENT_TYPES = ['academic', 'technical', 'sports', 'cultural', 'other']
const LEVELS      = ['international', 'national', 'state', 'university', 'college']
const RESULTS     = ['winner', 'runner_up', 'participant', 'merit']

const emptyFilters = { event_type: '', level: '', result: '', year: '', from: '', to: '' }

export default function AdminAchievementsDashboard() {
  const [roleTab,      setRoleTab]      = useState<RoleTab>('student')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading,      setLoading]      = useState(true)
  const [viewing,      setViewing]      = useState<Achievement | null>(null)
  const [lightbox,     setLightbox]     = useState<string | null>(null)
  const [exporting,    setExporting]    = useState(false)
  const [filters,      setFilters]      = useState(emptyFilters)

  const fetchData = async (role: RoleTab, f = filters) => {
    setLoading(true)
    const params: Record<string, string> = {}
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v })
    try { setAchievements(await getAllAchievements(params)) }
    catch { setAchievements([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setFilters(emptyFilters)
    fetchData(roleTab, emptyFilters)
  }, [roleTab])

  const handleFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    fetchData(roleTab, next)
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    fetchData(roleTab, emptyFilters)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const blob = await exportAllAchievements(roleTab, params)
      downloadBlob(blob, `${roleTab}_achievements_${Date.now()}.xlsx`)
    } finally { setExporting(false) }
  }

  // Split returned achievements by role (the /all endpoint returns all non-drafts)
  const roleFiltered = achievements.filter(a => {
    // Backend already filters by status != 'draft'; we rely on user data in join
    // roll_number presence = student; faculty_code without roll_number = faculty
    if (roleTab === 'student') return !!a.roll_number
    return !a.roll_number && !!a.faculty_code
  })

  const SELECT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Achievements — Admin</h1>
        <button onClick={handleExport} disabled={exporting || roleFiltered.length === 0}
          className="px-4 py-2 bg-[#101A24] text-white text-sm font-semibold rounded-lg hover:bg-[#16222E] disabled:opacity-50 transition-colors">
          {exporting ? 'Exporting…' : '↓ Export Excel'}
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-5">
        {(['student', 'faculty'] as RoleTab[]).map(r => (
          <button key={r} onClick={() => setRoleTab(r)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              roleTab === r ? 'bg-[#101A24] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {r.charAt(0).toUpperCase() + r.slice(1)} Achievements
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className={SELECT} value={filters.event_type}
            onChange={e => handleFilter('event_type', e.target.value)}>
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className={SELECT} value={filters.level}
            onChange={e => handleFilter('level', e.target.value)}>
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
          <select className={SELECT} value={filters.result}
            onChange={e => handleFilter('result', e.target.value)}>
            <option value="">All Results</option>
            {RESULTS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
          <select className={SELECT} value={filters.year}
            onChange={e => handleFilter('year', e.target.value)}>
            <option value="">All Years</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <input type="date" className={SELECT} value={filters.from}
            onChange={e => handleFilter('from', e.target.value)} placeholder="From date" />
          <input type="date" className={SELECT} value={filters.to}
            onChange={e => handleFilter('to', e.target.value)} placeholder="To date" />
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            {roleFiltered.length} record{roleFiltered.length !== 1 ? 's' : ''}
          </p>
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Clear filters
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : roleFiltered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium text-gray-500">No achievements found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roleFiltered.map(a => (
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
