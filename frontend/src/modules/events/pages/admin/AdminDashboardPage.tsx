import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, Calendar, Award,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity,
  Filter, ArrowRight, LayoutGrid, Search, Layers, Download
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { toast } from 'sonner'
import type { Event } from '../../types'
import { eventApi } from '../../api/eventApi'
import { facultyApi } from '../../api/facultyApi'
import Navbar from '../../components/Navbar'

const CHART_COLORS = ['#101A24', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1']
const ACADEMIC_YEARS = ['All', '2025-26', '2024-25', '2023-24']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getAcademicYear(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth()
  return m >= 6 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`
}

function matchesAY(dateStr: string, ay: string) {
  return ay === 'All' || getAcademicYear(dateStr) === ay
}

function matchesDept(event: Event, dept: string) {
  return dept === 'All' || event.department === dept
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900/95 text-white p-3 rounded-lg shadow-xl border border-teal-800 text-sm">
      <p className="font-semibold mb-1 text-teal-300">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-200">{entry.name || 'Count'}:</span>
          <span className="font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-medium rounded-md pl-2 pr-6 py-1.5 focus:ring-1 focus:ring-teal-500 focus:border-[#101A24] outline-none cursor-pointer hover:bg-gray-100 transition-colors"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-1.5 pointer-events-none text-gray-400">
        <Filter size={10} />
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [totalFaculty, setTotalFaculty] = useState(0)
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Independent chart filter states
  const [typeFilters, setTypeFilters] = useState({ year: 'All', dept: 'All' })
  const [levelFilters, setLevelFilters] = useState({ year: 'All', dept: 'All' })
  const [monthFilters, setMonthFilters] = useState({ year: 'All', dept: 'All' })
  const [deptFilters, setDeptFilters] = useState({ year: 'All' })

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsRes, facultyRes] = await Promise.all([
          eventApi.getAll({ limit: '10000', status: 'submitted' }),
          facultyApi.list(),
        ])
        const events: Event[] = eventsRes.data.data ?? eventsRes.data
        setAllEvents(events)
        setTotalFaculty(facultyRes.data.length)
        const depts = [...new Set(events.map((e: Event) => e.department).filter(Boolean))] as string[]
        setDepartments(depts.sort())
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const deptOptions = ['All', ...departments]

  // Global stats (no filter)
  const globalStats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth() + 1
    const thisYear = now.getFullYear()
    return {
      totalEvents: allEvents.length,
      eventsThisMonth: allEvents.filter(e => {
        const d = new Date(e.start_date)
        return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear
      }).length,
      intlEvents: allEvents.filter(e => e.level === 'International').length,
    }
  }, [allEvents])

  // Chart 1 — Events by Type
  const typeData = useMemo(() => {
    const filtered = allEvents.filter(e =>
      matchesAY(e.start_date, typeFilters.year) && matchesDept(e, typeFilters.dept)
    )
    const map: Record<string, number> = {}
    filtered.forEach(e => { map[e.event_type] = (map[e.event_type] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [allEvents, typeFilters])

  // Chart 2 — Events by Level
  const levelData = useMemo(() => {
    const filtered = allEvents.filter(e =>
      matchesAY(e.start_date, levelFilters.year) && matchesDept(e, levelFilters.dept)
    )
    const map: Record<string, number> = {}
    filtered.forEach(e => { map[e.level] = (map[e.level] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [allEvents, levelFilters])

  // Chart 3 — Submissions Timeline (by calendar month)
  const monthData = useMemo(() => {
    const filtered = allEvents.filter(e =>
      matchesAY(e.start_date, monthFilters.year) && matchesDept(e, monthFilters.dept)
    )
    const map: Record<number, number> = {}
    filtered.forEach(e => {
      const m = new Date(e.start_date).getMonth() + 1
      map[m] = (map[m] || 0) + 1
    })
    return MONTHS.map((name, idx) => ({ name, Submissions: map[idx + 1] || 0 }))
  }, [allEvents, monthFilters])

  // Chart 4 — Department Breakdown
  const deptChartData = useMemo(() => {
    const filtered = allEvents.filter(e => matchesAY(e.start_date, deptFilters.year))
    const map: Record<string, number> = {}
    filtered.forEach(e => {
      if (e.department) map[e.department] = (map[e.department] || 0) + 1
    })
    return Object.entries(map).map(([name, Events]) => ({ name, Events })).sort((a, b) => b.Events - a.Events)
  }, [allEvents, deptFilters])

  const statCards = [
    { label: 'Total Events in System', value: globalStats.totalEvents, icon: BookOpen, color: 'text-[#101A24]', bg: 'bg-[#E5DDC6]/30', trend: 'All time' },
    { label: 'Total Registered Faculty', value: totalFaculty, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Active' },
    { label: 'Events This Month', value: globalStats.eventsThisMonth, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Current' },
    { label: 'Intl. Events Total', value: globalStats.intlEvents, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Top Tier' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar isAdmin={true} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-[#101A24]">System Dashboard</h2>
          <p className="text-[#101A24]/80 font-medium mt-1">Overview of institutional event metrics and faculty engagement.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#E5DDC6]/60 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <span className="text-xs font-semibold text-[#101A24] bg-[#E5DDC6]/30 px-2 py-1 rounded-full">{stat.trend}</span>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-[#101A24] leading-none mb-1">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : stat.value}
                </h3>
                <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Explorer Promo Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5DDC6] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5DDC6]/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-80 pointer-events-none" />
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5DDC6]/30 text-[#101A24] text-[11px] font-bold uppercase tracking-wider mb-3 border border-[#E5DDC6]/60">
                <Search size={14} strokeWidth={2.5} /> Advanced Analytics Module
              </div>
              <h3 className="text-2xl font-bold text-[#101A24] mb-2">Comprehensive Events Explorer</h3>
              <p className="text-[#101A24]/90 mb-6 max-w-2xl text-sm leading-relaxed">
                Deep search and multi-dimensional grouping of all institutional events. Toggle between faculty-centric and event-centric views, apply complex filters, and export perfectly formatted reports.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Layers, label: 'Event-Centric Grouping' },
                  { icon: Filter, label: '10+ Multi-select Filters' },
                  { icon: Download, label: 'Smart Excel Export' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                    <Icon size={14} className="text-[#101A24]" /> {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              <button
               onClick={() => navigate('/events/admin/explorer')}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#101A24] hover:bg-[#16222E] text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <LayoutGrid size={20} /> Launch Explorer <ArrowRight size={20} className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Charts 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 1 — Events by Type */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDC6]/60 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-[#101A24]" size={20} />
                <h3 className="font-bold text-gray-800 text-lg">Events by Type</h3>
              </div>
              <div className="flex gap-2">
                <FilterSelect value={typeFilters.year} onChange={v => setTypeFilters(p => ({ ...p, year: v }))} options={ACADEMIC_YEARS} />
                <FilterSelect value={typeFilters.dept} onChange={v => setTypeFilters(p => ({ ...p, dept: v }))} options={deptOptions} />
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={55} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,107,100,0.05)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                      {typeData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {loading ? <span className="w-full h-full bg-gray-100 animate-pulse rounded-lg" /> : 'No data for selected filters'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 2 — Events by Level */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDC6]/60 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="text-[#101A24]" size={20} />
                <h3 className="font-bold text-gray-800 text-lg">Events by Level</h3>
              </div>
              <div className="flex gap-2">
                <FilterSelect value={levelFilters.year} onChange={v => setLevelFilters(p => ({ ...p, year: v }))} options={ACADEMIC_YEARS} />
                <FilterSelect value={levelFilters.dept} onChange={v => setLevelFilters(p => ({ ...p, dept: v }))} options={deptOptions} />
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
              {levelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={levelData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                      {levelData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"
                      formatter={value => <span className="text-gray-600 font-medium text-sm">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">{loading ? 'Loading...' : 'No data for selected filters'}</p>
              )}
            </div>
          </div>

          {/* Chart 3 — Submissions Timeline */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDC6]/60 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-[#101A24]" size={20} />
                <h3 className="font-bold text-gray-800 text-lg">Submissions Timeline</h3>
              </div>
              <div className="flex gap-2">
                <FilterSelect value={monthFilters.year} onChange={v => setMonthFilters(p => ({ ...p, year: v }))} options={ACADEMIC_YEARS} />
                <FilterSelect value={monthFilters.dept} onChange={v => setMonthFilters(p => ({ ...p, dept: v }))} options={deptOptions} />
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#101A24', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="Submissions" stroke="#101A24" strokeWidth={3}
                    dot={{ r: 4, fill: '#101A24', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#101A24', stroke: '#ccfbf1', strokeWidth: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4 — Department Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDC6]/60 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-[#101A24]" size={20} />
                <h3 className="font-bold text-gray-800 text-lg">Department Breakdown</h3>
              </div>
              <FilterSelect value={deptFilters.year} onChange={v => setDeptFilters({ year: v })} options={ACADEMIC_YEARS} />
            </div>
            <div className="flex-1 min-h-[300px] w-full">
              {deptChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,107,100,0.05)' }} />
                    <Bar dataKey="Events" radius={[4, 4, 0, 0]} barSize={40}>
                      {deptChartData.map((_, idx) => <Cell key={idx} fill={idx % 2 === 0 ? '#101A24' : '#14b8a6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {loading ? 'Loading...' : 'No data for selected year'}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}