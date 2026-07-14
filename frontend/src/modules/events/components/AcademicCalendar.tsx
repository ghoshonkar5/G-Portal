import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, X } from 'lucide-react'
import type { Event, DayMapEntry } from '../types'
import {
  buildDayMap, buildMonthMap, getDaysInMonthGrid,
  getAcademicMonths, getCurrentAcademicYear, getCalendarStats
} from '../utils/calendarHelpers'

interface AcademicCalendarProps {
  events: Event[]
}

export default function AcademicCalendar({ events }: AcademicCalendarProps) {
  const navigate = useNavigate()
  const [startYear, setStartYear] = useState(getCurrentAcademicYear())
  // AFTER
const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; date: string; data: DayMapEntry[]; below: boolean }>({
  visible: false, x: 0, y: 0, date: '', data: [], below: false
})
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDayEvents, setSelectedDayEvents] = useState<DayMapEntry[]>([])

  const academicMonths = useMemo(() => getAcademicMonths(startYear), [startYear])

  const { dayMap, monthMap } = useMemo(() => ({
    dayMap: buildDayMap(events),
    monthMap: buildMonthMap(events),
  }), [events])

  // FIX: pass startYear so stats filter to selected academic year
  const stats = useMemo(() => getCalendarStats(dayMap, monthMap, startYear), [dayMap, monthMap, startYear])

  const today = new Date().toISOString().split('T')[0]

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 text-slate-400 cursor-default'
    if (count === 1) return 'bg-teal-200/80 hover:bg-teal-300 text-[#101A24] cursor-pointer'
    if (count === 2) return 'bg-teal-400 hover:bg-[#E5DDC6]/300 text-[#101A24] cursor-pointer'
    if (count === 3) return 'bg-[#101A24] hover:bg-[#16222E] text-white cursor-pointer'
    return 'bg-[#00403c] hover:bg-[#002b28] text-teal-50 cursor-pointer'
  }

const handleDayMouseEnter = (e: React.MouseEvent, dateStr: string, dayEvents: DayMapEntry[]) => {
  if (dayEvents.length === 0) return
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const spaceAbove = rect.top
  const showBelow = spaceAbove < 180
  const tooltipWidth = 288 // w-72
  const rawX = rect.left + rect.width / 2
  const clampedX = Math.min(Math.max(rawX, tooltipWidth / 2 + 8), window.innerWidth - tooltipWidth / 2 - 8)
  setTooltip({
    visible: true,
    x: clampedX,
    y: showBelow ? rect.bottom + 10 : rect.top - 10,
    date: dateStr,
    data: dayEvents,
    below: showBelow
  })
}

  const handleDayClick = (dayEvents: DayMapEntry[]) => {
    if (dayEvents.length === 0) return
    if (dayEvents.length === 1) {
      // FIX: was /events/:id, correct route is /events/:id/edit
      navigate(`/events/${dayEvents[0].id}/edit`)
    } else {
      setSelectedDayEvents(dayEvents)
      setModalOpen(true)
    }
  }

  const academicYearOptions = useMemo(() => {
  const years = new Set<number>()
  events.forEach(e => {
    if (!e.start_date) return
    const d = new Date(e.start_date)
    if (isNaN(d.getTime())) return
    const ay = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
    years.add(ay)
  })
  years.add(getCurrentAcademicYear())
  return Array.from(years).sort((a, b) => a - b)
}, [events])

const yearOptions = academicYearOptions

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5DDC6]/60 overflow-hidden relative">
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-[#101A24] flex items-center gap-2">
            <CalendarDays size={20} className="text-[#101A24]" />
            Activity Heatmap
          </h3>
          <p className="text-sm text-gray-500 mt-1">Daily intensity of your academic engagements</p>
        </div>
        <select
  value={startYear}
  onChange={e => setStartYear(Number(e.target.value))}
  className="mt-4 sm:mt-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-[#101A24] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/30 cursor-pointer"
>
  {yearOptions.map(year => (
    <option key={year} value={year}>
      {year}–{(year + 1).toString().slice(2)}
    </option>
  ))}
</select>
</div>

      <div className="p-6 bg-gray-50/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10">
          {academicMonths.map(m => {
            const gridDays = getDaysInMonthGrid(m.year, m.index)
            const monthKey = `${m.year}-${m.index}`
            const monthCount = monthMap[monthKey] || 0
            return (
              <div key={`${m.year}-${m.index}`} className="flex flex-col">
                <div className="text-xs font-semibold text-gray-700/80 mb-2 flex items-center gap-1.5">
                  {m.name} <span className="text-[10px] text-gray-400">{m.year}</span>
                  {monthCount > 0 && (
                    <span className={`w-2 h-2 rounded-full ml-1 ${
                      monthCount >= 5 ? 'bg-[#101A24]' : monthCount === 4 ? 'bg-[#101A24]' :
                      monthCount === 3 ? 'bg-[#E5DDC6]/300' : monthCount === 2 ? 'bg-teal-400' : 'bg-teal-200'
                    }`} />
                  )}
                </div>
                <div className="flex flex-col gap-[3px]">
                  <div className="grid grid-cols-7 gap-[3px]">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <div key={i} className="text-[9px] text-gray-400 font-medium text-center h-5 flex items-center justify-center">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-[3px]">
                    {gridDays.map((cell, idx) => {
                      if (!cell) return <div key={`empty-${idx}`} className="h-5 w-5" />
                      const dayEvents = dayMap[cell.dateStr] || []
                      const isToday = cell.dateStr === today
                      return (
                        <div
                          key={cell.dateStr}
                          onMouseEnter={e => handleDayMouseEnter(e, cell.dateStr, dayEvents)}
                          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                          onClick={() => handleDayClick(dayEvents)}
                          className={`h-5 w-5 rounded-[4px] transition-all duration-150 flex items-center justify-center text-[10px] font-medium select-none
                            ${getIntensityClass(dayEvents.length)}
                            ${isToday ? 'ring-2 ring-offset-1 ring-teal-400' : ''}
                            ${dayEvents.length > 0 ? 'hover:scale-110 hover:ring-2 hover:ring-teal-300 ring-offset-1 z-10' : ''}
                          `}
                        >
                          {cell.day}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {[
            { value: stats.totalEvents, label: 'events' },
            { value: stats.activeMonths, label: 'active months' },
            { value: stats.eventDays, label: 'event days' },
          ].map(({ value, label }, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 shadow-sm px-2.5 py-1 rounded-lg">
              <span className="font-bold text-[#101A24] text-base leading-none">{value}</span>
              <span className="text-gray-500">{label}</span>
              {i < 2 && <span className="text-gray-300 ml-1">•</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
          <span className="hidden sm:inline">Less</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`w-4 h-4 rounded-[3px] flex items-center justify-center text-[9px] font-bold ${getIntensityClass(level).split(' hover:')[0].split(' cursor-')[0]}`}>
                {level === 0 ? '' : level === 4 ? '+' : level}
              </div>
            ))}
          </div>
          <span className="hidden sm:inline">More</span>
        </div>
      </div>

 
{tooltip.visible && (
  <div
    className={`fixed z-50 pointer-events-none transform -translate-x-1/2 ${tooltip.below ? 'translate-y-0' : '-translate-y-full'}`}
    style={{ top: tooltip.y, left: tooltip.x }}
  >
          <div className="bg-gray-900 text-white rounded-xl shadow-xl p-3 text-xs w-72 ring-1 ring-white/10">
            <div className="text-gray-300 font-medium border-b border-gray-700 pb-2 mb-2 flex justify-between items-center">
              <span>{new Date(tooltip.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] border border-gray-700">
                {tooltip.data.length} event{tooltip.data.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tooltip.data.map((evt, idx) => (
                <div key={evt.id} className={idx !== 0 ? 'border-t border-gray-700 pt-2' : ''}>
                  <div className="font-bold text-teal-300 mb-0.5 line-clamp-2">{evt.event_title}</div>
                  <div className="text-gray-400 text-[11px]">{evt.organizer} · {evt.level}</div>
                </div>
              ))}
            </div>
            <div className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-900 border-white/10 rotate-45 ${
  tooltip.below
    ? '-top-1 border-t border-l'
    : '-bottom-1 border-b border-r'
}`} />
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">Engagements on this day</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md text-gray-500 hover:bg-gray-200"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {selectedDayEvents.map(evt => (
                <div
                  key={evt.id}
                  // FIX: was /events/:id
                  onClick={() => { navigate(`/events/${evt.id}/edit`); setModalOpen(false) }}
                  className="border border-[#E5DDC6]/60 rounded-lg p-4 hover:border-[#E5DDC6] hover:bg-[#E5DDC6]/30 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-gray-900 mb-1">{evt.event_title}</div>
                  <div className="text-sm text-gray-500">{evt.organizer} · {evt.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}