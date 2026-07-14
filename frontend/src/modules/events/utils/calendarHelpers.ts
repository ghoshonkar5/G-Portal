import type { Event, DayMap, MonthMap, DayMapEntry } from '../types'

export function buildDayMap(events: Event[]): DayMap {
  const map: DayMap = {}
  events.filter(e => e.status === 'submitted' && e.docs_status === 'complete').forEach(event => {
    const start = new Date(event.start_date)
    const end = new Date(event.end_date)
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    const current = new Date(start)
    while (current <= end) {
      const key = current.toISOString().split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push({
        id: event.id,
        event_title: event.event_title,
        organizer: event.organizer,
        level: event.level,
        start_date: event.start_date,
        end_date: event.end_date,
      } as DayMapEntry)
      current.setUTCDate(current.getUTCDate() + 1)
    }
  })
  return map
}

export function buildMonthMap(events: Event[]): MonthMap {
  const map: MonthMap = {}
  events.filter(e => e.status === 'submitted' && e.docs_status === 'complete').forEach(event => {
    const d = new Date(event.start_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    map[key] = (map[key] || 0) + 1
  })
  return map
}

export function getDaysInMonthGrid(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const grid: ({ day: number; dateStr: string } | null)[] = []
  for (let i = 0; i < firstDay; i++) grid.push(null)
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    grid.push({ day: i, dateStr })
  }
  return grid
}

export function getAcademicMonths(startYear: number) {
  return [
    { name: 'Jul', index: 6, year: startYear },
    { name: 'Aug', index: 7, year: startYear },
    { name: 'Sep', index: 8, year: startYear },
    { name: 'Oct', index: 9, year: startYear },
    { name: 'Nov', index: 10, year: startYear },
    { name: 'Dec', index: 11, year: startYear },
    { name: 'Jan', index: 0, year: startYear + 1 },
    { name: 'Feb', index: 1, year: startYear + 1 },
    { name: 'Mar', index: 2, year: startYear + 1 },
    { name: 'Apr', index: 3, year: startYear + 1 },
    { name: 'May', index: 4, year: startYear + 1 },
    { name: 'Jun', index: 5, year: startYear + 1 },
  ]
}

export function getCurrentAcademicYear(): number {
  const now = new Date()
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
}

export function getCalendarStats(dayMap: DayMap, monthMap: MonthMap, startYear: number) {
  const filteredDayMap = Object.fromEntries(
    Object.entries(dayMap).filter(([dateStr]) => {
      const d = new Date(dateStr)
      const y = d.getUTCFullYear()
      const m = d.getUTCMonth()
      return (y === startYear && m >= 6) || (y === startYear + 1 && m <= 5)
    })
  )
  const filteredMonthMap = Object.fromEntries(
    Object.entries(monthMap).filter(([key]) => {
      const [y, mo] = key.split('-').map(Number)
      return (y === startYear && mo >= 6) || (y === startYear + 1 && mo <= 5)
    })
  )
  const totalEvents = new Set(Object.values(filteredDayMap).flat().map(e => e.id)).size
  const activeMonths = Object.keys(filteredMonthMap).filter(k => filteredMonthMap[k] > 0).length
  const eventDays = Object.keys(filteredDayMap).length
  return { totalEvents, activeMonths, eventDays }
}