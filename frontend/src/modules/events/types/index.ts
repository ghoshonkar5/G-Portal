export interface User {
  id: number
  faculty_id: string
  name: string
  email: string
  department: string
  designation: string
  role: 'faculty' | 'admin'
}

export interface Event {
  id: number
  faculty_id: number
  event_title: string
  event_type: EventType
  role_at_event: RoleAtEvent
  level: EventLevel
  organizer: string
  venue?: string
  mode: EventMode
  start_date: string
  end_date: string
  description?: string
  certificate_urls: string[]
  photo_urls: string[]
  status: 'draft' | 'submitted'
  created_at: string
  updated_at: string
  docs_status?: 'pending_both' | 'pending_cert' | 'pending_photo' | 'complete'
  document_deadline?: string | null
  import_batch_id?: string | null
  faculty_name?: string
  faculty_code?: string
  department?: string
  designation?: string
}

export type EventType = 'Conference' | 'Workshop' | 'Seminar' | 'FDP' | 'Webinar' | 'Guest Lecture' | 'Training' | 'Hackathon' | 'Other'
export type RoleAtEvent = 'Attendee' | 'Speaker' | 'Organizer' | 'Resource Person' | 'Chair' | 'Panelist' | 'Mentor' | 'Judge'
export type EventLevel = 'International' | 'National' | 'State' | 'Local' | 'Institutional'
export type EventMode = 'Online' | 'Offline' | 'Hybrid'
export type MemoryType = 'on_this_day' | 'monthly_recap' | 'quarterly_recap' | 'random'

export interface Memory {
  type: MemoryType
  events: Event[]
  photos: string[]
  headline: string
  subtext: string
}

export interface DayMapEntry {
  id: number
  event_title: string
  organizer: string
  level: string
  start_date: string
  end_date: string
}

export type DayMap = Record<string, DayMapEntry[]>
export type MonthMap = Record<string, number>

export const EVENT_TYPES: EventType[] = ['Conference', 'Workshop', 'Seminar', 'FDP', 'Webinar', 'Guest Lecture', 'Training', 'Hackathon', 'Other']
export const ROLES_AT_EVENT: RoleAtEvent[] = ['Attendee', 'Speaker', 'Organizer', 'Resource Person', 'Chair', 'Panelist', 'Mentor', 'Judge']
export const EVENT_LEVELS: EventLevel[] = ['International', 'National', 'State', 'Local', 'Institutional']
export const EVENT_MODES: EventMode[] = ['Online', 'Offline', 'Hybrid']