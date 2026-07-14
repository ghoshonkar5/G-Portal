export interface Achievement {
  id: string
  user_id: number
  submitted_by: number
  title: string | null
  event_name: string | null
  event_type: string | null
  level: string | null
  place_held: string | null
  result: string | null
  position: string | null
  start_date: string | null
  end_date: string | null
  duration_days: number | null
  certificate_url: string | null
  merit_url: string | null
  photo_urls: string[] | string | null
  description: string | null
  organiser_name: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // joined fields (present when admin/faculty fetches)
  student_name?: string
  roll_number?: string
  department?: string
  batch?: string
  year_of_study?: string
  faculty_name?: string
  faculty_code?: string
}

export interface AchievementUserProfile {
  id: number
  name: string
  email: string
  role: string
  department: string | null
  faculty_code: string | null
  roll_number: string | null
  year_of_study: string | null
  batch: string | null
  mentor_id: number | null
}
