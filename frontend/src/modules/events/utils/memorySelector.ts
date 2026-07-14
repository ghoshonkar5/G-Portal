import type { Event, Memory } from '../types'

export function selectMemory(events: Event[]): Memory | null {
  const submitted = events.filter(e => e.status === 'submitted')
  if (submitted.length < 2) return null

  const pool: Memory[] = []
  const today = new Date()

  // on_this_day
  submitted.forEach(event => {
    const d = new Date(event.start_date)
    if (
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate() &&
      d.getFullYear() < today.getFullYear()
    ) {
      const yearsAgo = today.getFullYear() - d.getFullYear()
      pool.push({
        type: 'on_this_day',
        events: [event],
        photos: event.photo_urls,
        headline: `On this day, ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`,
        subtext: `${event.role_at_event} at ${event.organizer}, ${event.level} level`
      })
    }
  })

  // monthly_recap — only first 7 days of month
  if (today.getDate() <= 7) {
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1
    const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    const prevMonthEvents = submitted.filter(e => {
      const d = new Date(e.start_date)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear
    })
    if (prevMonthEvents.length > 0) {
      const monthName = new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long' })
      pool.push({
        type: 'monthly_recap',
        events: prevMonthEvents,
        photos: prevMonthEvents.flatMap(e => e.photo_urls),
        headline: `Your ${monthName} in review`,
        subtext: `${prevMonthEvents.length} event${prevMonthEvents.length > 1 ? 's' : ''} attended`
      })
    }
  }

  // quarterly_recap
  const month = today.getMonth()
  let qStart: number, qEnd: number, qLabel: string
  if (month >= 6 && month <= 8) { qStart = 3; qEnd = 5; qLabel = 'Q4' }
  else if (month >= 9 && month <= 11) { qStart = 6; qEnd = 8; qLabel = 'Q1' }
  else if (month >= 0 && month <= 2) { qStart = 9; qEnd = 11; qLabel = 'Q2' }
  else { qStart = 0; qEnd = 2; qLabel = 'Q3' }

  const qYear = (month >= 0 && month <= 5) ? today.getFullYear() - 1 : today.getFullYear()
  const qEvents = submitted.filter(e => {
    const d = new Date(e.start_date)
    return d.getMonth() >= qStart && d.getMonth() <= qEnd && d.getFullYear() === qYear
  })
  if (qEvents.length >= 2) {
    pool.push({
      type: 'quarterly_recap',
      events: qEvents,
      photos: qEvents.flatMap(e => e.photo_urls),
      headline: `Your ${qLabel} ${qYear} recap`,
      subtext: `${qEvents.length} events across the quarter`
    })
  }

  // random — past events with photos
  submitted.forEach(event => {
    if (event.photo_urls.length > 0 && new Date(event.start_date) < today) {
      const d = new Date(event.start_date)
      pool.push({
        type: 'random',
        events: [event],
        photos: event.photo_urls,
        headline: `A memory from ${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`,
        subtext: `${event.role_at_event} at ${event.organizer}`
      })
    }
  })

  if (pool.length === 0) return null

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool[0]
}